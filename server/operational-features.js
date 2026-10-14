/**
 * COI/Monitoramento: permissões por colaborador, disponibilidade, despachos,
 * notificações persistentes. Todas as consultas exigem sessão autenticada.
 */
import {randomUUID} from 'node:crypto';
const uid=()=>randomUUID(),ts=()=>Date.now(),clean=x=>String(x??'').trim();
const reply=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));};
const modules=['monitor','routes','dispatches','occurrences','alerts','reports','team'];
const operational=u=>['operador','coi'].includes(u.role);
const admin=u=>['master','admin'].includes(u.role);
async function json(req){
 let total=0;const parts=[];
 for await(const chunk of req){total+=chunk.length;if(total>50000)throw Object.assign(Error('Dados excedem o limite'),{status:413});parts.push(chunk);}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw Object.assign(Error('JSON inválido'),{status:400})}
}
export function createOperationalFeatures({db,audit,aggregateOperationalRounds}){
 if(!db)return null;
 db.exec('CREATE TABLE IF NOT EXISTS coi_permissions(user_id TEXT NOT NULL,module TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated_by TEXT,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,module))');
 db.exec('CREATE TABLE IF NOT EXISTS operational_presence(user_id TEXT PRIMARY KEY,last_seen INTEGER NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS dispatches(id TEXT PRIMARY KEY,worker_id TEXT NOT NULL,created_by TEXT NOT NULL,address TEXT NOT NULL,reason TEXT NOT NULL,latitude REAL,longitude REAL,status TEXT NOT NULL DEFAULT "pending",created_at INTEGER NOT NULL,accepted_at INTEGER)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_dispatch_worker ON dispatches(worker_id,created_at)');
 db.exec('CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,event_id TEXT,dispatch_id TEXT,created_at INTEGER NOT NULL,read_at INTEGER)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(user_id,read_at,created_at)');
 const can=(u,module)=>{
  if(admin(u))return true;
  if(!operational(u)||!modules.includes(module))return false;
  const record=db.prepare('SELECT enabled FROM coi_permissions WHERE user_id=? AND module=?').get(u.id,module);
  return record===undefined?true:Boolean(record.enabled);
 };
 function presence(user){
  if(user.role!=='ronda')return;
  db.prepare('INSERT INTO operational_presence(user_id,last_seen) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen=excluded.last_seen').run(user.id,ts());
 }
 function recentRounds(){
  return aggregateOperationalRounds(db.prepare('SELECT round_id,user_id,site,kind,occurred_at,lat,lng,accuracy,battery,details FROM events WHERE round_id IS NOT NULL AND occurred_at>? ORDER BY occurred_at').all(ts()-7*86400000));
 }
 function availability(){
  const activeRounds=new Set(recentRounds().filter(r=>r.status==='em_andamento').map(r=>r.userId));
  const persons=db.prepare("SELECT u.id,u.name,u.site,u.active,p.last_seen lastSeen FROM users u LEFT JOIN operational_presence p ON p.user_id=u.id WHERE u.role='ronda' ORDER BY u.name").all();
  return persons.map(u=>({...u,status:!u.active?'Fora de serviço':activeRounds.has(u.id)?'Em ronda':u.lastSeen&&ts()-u.lastSeen<120000?'Disponível':'Fora de serviço'}));
 }
 const note=db.prepare('INSERT INTO notifications(id,user_id,kind,title,body,event_id,dispatch_id,created_at) VALUES(?,?,?,?,?,?,?,?)');
 function notifyUser(userId,kind,title,message,{eventId=null,dispatchId=null}={}){
  note.run(uid(),userId,kind,clean(title).slice(0,120),clean(message).slice(0,1200),eventId,dispatchId,ts());
 }
 function notifyRoles(roleNames,kind,title,message,opts={}){
  const ids=db.prepare('SELECT id FROM users WHERE active=1 AND role IN ('+roleNames.map(()=>'?').join(',')+')').all(...roleNames);
  for(const item of ids)if(item.id!==opts.exclude)notifyUser(item.id,kind,title,message,opts);
 }
 function notifyEvent(user,record){
  const title={panic:'PÂNICO ACIONADO',incident:'Nova ocorrência',alert:'Novo alerta',gps_issue:'Falha na localização',route_deviation:'Possível desvio',patrol_incomplete:'Ronda incompleta',patrol_interrupted:'Ronda interrompida'}[record.kind];
  if(!title)return;
  notifyRoles(['coi','operador','admin','master'],record.kind,title,(user.name||'Vigia')+' · '+(record.description||title).slice(0,400),{eventId:record.id,exclude:user.id});
 }
 function notifyForward(user,event,conclusion){
  notifyRoles(['admin','master'],'forwarded','Ocorrência encaminhada à administração',(user.name||'Monitor')+' encaminhou '+event.kind+': '+String(conclusion).slice(0,240),{eventId:event.id,exclude:user.id});
 }
 async function handle(req,res,user){
  const url=new URL(req.url,'http://local'),p=url.pathname,m=req.method;
  if(p==='/api/coi-permissions'&&m==='GET'){
   if(!operational(user)&&!admin(user)){reply(res,403,{error:'Acesso restrito'});return true;}
   const rows=db.prepare('SELECT user_id,module,enabled,updated_at FROM coi_permissions').all();
   reply(res,200,{modules,permissions:rows,enabled:Object.fromEntries(modules.map(x=>[x,can(user,x)]))});return true;
  }
  if(p==='/api/coi-permissions'&&m==='PUT'){
   if(!admin(user)){reply(res,403,{error:'Somente a administração altera permissões'});return true;}
   const data=await json(req),module=clean(data.module),member=clean(data.userId);
   if(!modules.includes(module)||typeof data.enabled!=='boolean'||!db.prepare("SELECT id FROM users WHERE id=? AND role IN ('operador','coi')").get(member)){
    reply(res,422,{error:'Selecione usuário do COI, módulo e estado válidos'});return true;
   }
   db.prepare('INSERT INTO coi_permissions(user_id,module,enabled,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,module) DO UPDATE SET enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=excluded.updated_at')
     .run(member,module,data.enabled?1:0,user.id,ts());
   audit(user,'coi.permission.change',member+':'+module);
   reply(res,200,{ok:true});return true;
  }
  if(p==='/api/notifications'&&m==='GET'){
   const rows=db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 150').all(user.id);
   const unread=db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND read_at IS NULL').get(user.id).total;
   reply(res,200,{notifications:rows,unread});return true;
  }
  const read=p.match(/^\/api\/notifications\/([0-9a-f-]{36})\/read$/i);
  if(read&&m==='POST'){
   const result=db.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?').run(ts(),read[1],user.id);
   reply(res,result.changes?200:404,result.changes?{ok:true}:{error:'Notificação não encontrada'});return true;
  }
  if(p==='/api/availability'&&m==='GET'){
   if(!can(user,'team')){reply(res,403,{error:'Sem acesso à disponibilidade'});return true;}
   reply(res,200,{guards:availability()});return true;
  }
  if(p==='/api/dispatches'&&m==='GET'){
   if(user.role!=='ronda'&&!can(user,'dispatches')){reply(res,403,{error:'Sem acesso aos despachos'});return true;}
   const base='SELECT d.*,w.name worker,c.name author FROM dispatches d JOIN users w ON w.id=d.worker_id JOIN users c ON c.id=d.created_by ';
   const rows=user.role==='ronda'?
    db.prepare(base+'WHERE d.worker_id=? ORDER BY d.created_at DESC LIMIT 100').all(user.id):
    db.prepare(base+'ORDER BY d.created_at DESC LIMIT 200').all();
   reply(res,200,{dispatches:rows});return true;
  }
  if(p==='/api/dispatches'&&m==='POST'){
   if(!can(user,'dispatches')){reply(res,403,{error:'Sem permissão para despachar'});return true;}
   const data=await json(req),address=clean(data.address),reason=clean(data.reason);
   const worker=availability().find(x=>x.id===clean(data.workerId));
   const lat=data.lat==null?null:Number(data.lat),lng=data.lng==null?null:Number(data.lng);
   if(!worker||worker.status!=='Disponível'||address.length<5||address.length>350||reason.length<10||reason.length>1000||
    lat!=null&&(!Number.isFinite(lat)||Math.abs(lat)>90)||lng!=null&&(!Number.isFinite(lng)||Math.abs(lng)>180)){
    reply(res,422,{error:'Escolha um vigia disponível e informe endereço e motivo (mínimo 10 caracteres).'});return true;
   }
   const did=uid(),at=ts();
   db.exec('BEGIN IMMEDIATE');
   try{
    db.prepare('INSERT INTO dispatches(id,worker_id,created_by,address,reason,latitude,longitude,created_at) VALUES(?,?,?,?,?,?,?,?)')
     .run(did,worker.id,user.id,address,reason,lat,lng,at);
    notifyUser(worker.id,'dispatch','Nova ronda adicionada',address+' · '+reason,{dispatchId:did});
    notifyRoles(['admin','master'],'dispatch','Despacho sob demanda registrado',user.name+' direcionou '+worker.name+' para '+address+'. Motivo: '+reason,{dispatchId:did});
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   audit(user,'dispatch.create',did);reply(res,201,{id:did,createdAt:at});return true;
  }
  const ack=p.match(/^\/api\/dispatches\/([0-9a-f-]{36})\/accept$/i);
  if(ack&&m==='POST'){
   if(user.role!=='ronda'){reply(res,403,{error:'Somente o vigia atribuído aceita despacho'});return true;}
   const x=db.prepare('UPDATE dispatches SET status="accepted",accepted_at=COALESCE(accepted_at,?) WHERE id=? AND worker_id=? AND status="pending"').run(ts(),ack[1],user.id);
   if(!x.changes){reply(res,409,{error:'Despacho já aceito ou não encontrado'});return true;}
   audit(user,'dispatch.accept',ack[1]);
   notifyRoles(['admin','master','coi','operador'],'dispatch','Despacho recebido pelo vigia',user.name+' confirmou recebimento da atribuição.',{dispatchId:ack[1],exclude:user.id});
   reply(res,200,{ok:true});return true;
  }
  return false;
 }
 return {can,presence,availability,notifyEvent,notifyForward,handle,modules};
}
