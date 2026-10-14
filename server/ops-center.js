/* Centro operacional: configurações COI, despachos e notificações persistidas. */
const MODULES=['mapa','despachos','rondas','ocorrencias','alertas','relatorios'];
const REVIEW_ROLES=['operador','coi','admin','master'];
const ADMIN_ROLES=['admin','master'];
const EVENT_LABELS={
 panic:'PÂNICO ACIONADO',incident:'Nova ocorrência',alert:'Alerta operacional',
 gps_issue:'Sinal GPS impreciso',route_deviation:'Possível desvio de rota',
 patrol_incomplete:'Ronda incompleta',patrol_interrupted:'Ronda interrompida',
 message:'Nova mensagem do vigia'
};
const clean=x=>String(x??'').trim();
export function createOpsCenter(db,{now,id,audit,resp,body,serialize,aggregateOperationalRounds}){
 db.exec('CREATE TABLE IF NOT EXISTS coi_permissions(module TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1,updated_by TEXT,updated_at INTEGER NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS dispatches(id TEXT PRIMARY KEY,worker_id TEXT NOT NULL,author_id TEXT NOT NULL,address TEXT NOT NULL,reason TEXT NOT NULL,latitude REAL,longitude REAL,created_at INTEGER NOT NULL,acknowledged_at INTEGER)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_dispatch_worker ON dispatches(worker_id,created_at)');
 db.exec('CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,event_id TEXT,dispatch_id TEXT,created_at INTEGER NOT NULL,read_at INTEGER)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_notification_user ON notifications(user_id,created_at)');
 db.exec('CREATE TABLE IF NOT EXISTS operational_presence(user_id TEXT PRIMARY KEY,last_seen INTEGER NOT NULL)');
 const fields=db.prepare('PRAGMA table_info(dispatches)').all().map(x=>x.name);
 if(!fields.includes('started_at'))db.exec('ALTER TABLE dispatches ADD COLUMN started_at INTEGER');
 if(!fields.includes('completed_at'))db.exec('ALTER TABLE dispatches ADD COLUMN completed_at INTEGER');
 if(!fields.includes('completion_note'))db.exec("ALTER TABLE dispatches ADD COLUMN completion_note TEXT NOT NULL DEFAULT ''");
 const clients=new Map();
 const announce=userId=>{
  for(const res of clients.get(userId)||[])try{res.write('event: change\ndata: {}\n\n')}catch{}
 };

 const seed=db.prepare('INSERT OR IGNORE INTO coi_permissions(module,enabled,updated_at) VALUES(?,1,?)');
 for(const module of MODULES)seed.run(module,now());
 const admin=u=>ADMIN_ROLES.includes(u.role);
 const review=u=>REVIEW_ROLES.includes(u.role);
 const allows=(u,module)=>admin(u)||review(u)&&!!db.prepare('SELECT enabled FROM coi_permissions WHERE module=?').get(module)?.enabled;
 const insert=db.prepare('INSERT INTO notifications(id,user_id,kind,title,body,event_id,dispatch_id,created_at) VALUES(?,?,?,?,?,?,?,?)');
 function notify(roles,kind,title,message,{eventId=null,dispatchId=null,except=[]}={}){
  if(!roles.length)return;
  const q=roles.map(()=>'?').join(',');
  const recipients=db.prepare('SELECT id FROM users WHERE active=1 AND role IN ('+q+')').all(...roles);
  for(const r of recipients)if(!except.includes(r.id)){
   insert.run(id(),r.id,kind,title,clean(message).slice(0,650),eventId,dispatchId,now());
   announce(r.id);
  }
 }
 function notifyEvent(actor,record){
  const title=EVENT_LABELS[record.kind];if(!title)return;
  notify(REVIEW_ROLES,record.kind,title,actor.name+' · '+clean(record.description).slice(0,280),{eventId:record.id,except:[actor.id]});
 }
 function notifyReview(actor,record,status,conclusion){
  if(status==='encaminhada')notify(ADMIN_ROLES,'forwarded','Ocorrência encaminhada ao administrativo',actor.name+': '+clean(conclusion).slice(0,350),{eventId:record.id,except:[actor.id]});
  if(['resolvida','em_analise'].includes(status)&&record.user_id!==actor.id){
   insert.run(id(),record.user_id,'review',status==='resolvida'?'Ocorrência tratada':'Ocorrência em análise',clean(conclusion).slice(0,350),record.id,null,now());
   announce(record.user_id);
  }
 }
 function notifyMessage(actor,record,audience,message){
  const recipients=actor.id===record.user_id?REVIEW_ROLES:
   audience==='system'?REVIEW_ROLES:REVIEW_ROLES;
  notify(recipients,'message',audience==='system'?'Nota interna da central':'Nova mensagem operacional',
   actor.name+' · '+clean(message).slice(0,200),{eventId:record.id,except:[actor.id]});
  if(actor.id!==record.user_id&&audience==='general'){
   insert.run(id(),record.user_id,'message','Resposta da central',actor.name+' · '+clean(message).slice(0,250),record.id,null,now());
   announce(record.user_id);
  }
 }
 function recentRounds(){
  const items=db.prepare('SELECT round_id,user_id,site,kind,occurred_at,lat,lng,accuracy,battery,details FROM events WHERE round_id IS NOT NULL AND occurred_at>? ORDER BY occurred_at')
   .all(now()-30*86400000);
  return aggregateOperationalRounds(items);
 }
 function availability(){
  const busy=new Set(recentRounds().filter(r=>r.status==='em_andamento').map(r=>r.userId));
  const workers=db.prepare("SELECT u.id,u.name,u.site,u.active,p.last_seen FROM users u LEFT JOIN operational_presence p ON p.user_id=u.id WHERE u.role='ronda' ORDER BY u.name").all();
  return workers.map(w=>({...w,status:!w.active?'Fora de serviço':busy.has(w.id)?'Em ronda':w.last_seen&&now()-w.last_seen<120000?'Disponível':'Fora de serviço'}));
 }
 async function handle(req,res,user,p,method){
  if(p==='/api/presence'&&method==='POST'){
   if(user.role!=='ronda'){resp(res,403,{error:'Presença reservada ao vigia'});return true;}
   db.prepare('INSERT INTO operational_presence(user_id,last_seen) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen=excluded.last_seen').run(user.id,now());
   resp(res,200,{ok:true});return true;
  }
  if(p==='/api/presence/off'&&method==='POST'){
   if(user.role!=='ronda'){resp(res,403,{error:'Presença reservada ao vigia'});return true;}
   db.prepare('DELETE FROM operational_presence WHERE user_id=?').run(user.id);
   resp(res,200,{ok:true});return true;
  }
  if(p==='/api/availability'&&method==='GET'){
   if(!review(user)||!allows(user,'rondas')){resp(res,403,{error:'Sem acesso à disponibilidade'});return true;}
   resp(res,200,{guards:availability()});return true;
  }
  if(p==='/api/notifications/stream'&&method==='GET'){
   if(!req.headers.authorization){resp(res,401,{error:'Sessão obrigatória'});return true;}
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   res.write(': conectado\n\n');
   const listeners=clients.get(user.id)||new Set();listeners.add(res);clients.set(user.id,listeners);
   const keepAlive=setInterval(()=>{try{res.write(': ativo\n\n')}catch{}},25000);
   res.on('close',()=>{clearInterval(keepAlive);listeners.delete(res);if(!listeners.size)clients.delete(user.id)});
   return true;
  }
  if(p==='/api/coi-permissions'&&method==='GET'){
   if(!review(user)){resp(res,403,{error:'Acesso restrito à central'});return true;}
   resp(res,200,{modules:db.prepare('SELECT module,enabled,updated_at FROM coi_permissions ORDER BY module').all()});return true;
  }
  if(p==='/api/coi-permissions'&&method==='PUT'){
   if(!admin(user)){resp(res,403,{error:'A configuração de permissões pertence à administração'});return true;}
   const data=serialize((await body(req)).toString())||{},module=clean(data.module);
   if(!MODULES.includes(module)||typeof data.enabled!=='boolean'){resp(res,422,{error:'Módulo ou valor inválido'});return true;}
   db.prepare('UPDATE coi_permissions SET enabled=?,updated_by=?,updated_at=? WHERE module=?').run(data.enabled?1:0,user.id,now(),module);
   audit(user,'coi.permission.'+(data.enabled?'enable':'disable'),module);
   resp(res,200,{ok:true});return true;
  }
  if(p==='/api/notifications'&&method==='GET'){
   const items=db.prepare('SELECT n.*,e.status event_status,d.started_at dispatch_started_at,d.completed_at dispatch_completed_at FROM notifications n LEFT JOIN events e ON e.id=n.event_id LEFT JOIN dispatches d ON d.id=n.dispatch_id WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 120').all(user.id);
   const count=db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL').get(user.id).n;
   resp(res,200,{notifications:items,unread:count});return true;
  }
  const seen=p.match(/^\/api\/notifications\/([a-f0-9-]{36})\/read$/i);
  if(seen&&method==='POST'){
   const change=db.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?').run(now(),seen[1],user.id);
   resp(res,change.changes?200:404,change.changes?{ok:true}:{error:'Notificação não encontrada'});return true;
  }
  if(p==='/api/dispatches'&&method==='GET'){
   if(user.role!=='ronda'&&(!review(user)||!allows(user,'despachos'))){resp(res,403,{error:'Despachos sem permissão'});return true;}
   const query='SELECT d.*,worker.name worker,operator.name author FROM dispatches d JOIN users worker ON worker.id=d.worker_id JOIN users operator ON operator.id=d.author_id ';
   const items=user.role==='ronda'?db.prepare(query+'WHERE d.worker_id=? ORDER BY d.created_at DESC LIMIT 120').all(user.id):db.prepare(query+'ORDER BY d.created_at DESC LIMIT 120').all();
   resp(res,200,{dispatches:items});return true;
  }
  if(p==='/api/dispatches'&&method==='POST'){
   if(!review(user)||!allows(user,'despachos')){resp(res,403,{error:'Despacho indisponível'});return true;}
   const data=serialize((await body(req)).toString())||{},address=clean(data.address),reason=clean(data.reason);
   const worker=db.prepare("SELECT id,name,site,active FROM users WHERE id=? AND role='ronda'").get(clean(data.workerId));
   if(!worker||!worker.active||address.length<5||address.length>350||reason.length<10||reason.length>1000){
    resp(res,422,{error:'Escolha um vigia ativo, endereço e motivo com 10 ou mais caracteres'});return true;
   }
   if(!availability().some(w=>w.id===worker.id&&w.status==='Disponível')){
    resp(res,409,{error:'O vigia não está disponível no momento. Atualize a presença.'});return true;
   }
   const latitude=data.latitude==null?null:Number(data.latitude),longitude=data.longitude==null?null:Number(data.longitude);
   if(latitude!=null&&!Number.isFinite(latitude)||longitude!=null&&!Number.isFinite(longitude)||latitude!=null&&Math.abs(latitude)>90||longitude!=null&&Math.abs(longitude)>180){
    resp(res,422,{error:'Coordenadas inválidas'});return true;
   }
   const dispatchId=id(),at=now();
   db.prepare('INSERT INTO dispatches(id,worker_id,author_id,address,reason,latitude,longitude,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(dispatchId,worker.id,user.id,address,reason,latitude,longitude,at);
   insert.run(id(),worker.id,'dispatch','Nova ronda adicionada',address+' · '+reason,null,dispatchId,at);
   announce(worker.id);
   notify(ADMIN_ROLES,'dispatch','Despacho sob demanda registrado',user.name+' → '+worker.name+' · '+address+' · '+reason,{dispatchId,except:[user.id]});
   audit(user,'dispatch.create',dispatchId);
   resp(res,201,{id:dispatchId,createdAt:at});return true;
  }
  const ack=p.match(/^\/api\/dispatches\/([a-f0-9-]{36})\/ack$/i);
  if(ack&&method==='POST'){
   const result=db.prepare('UPDATE dispatches SET acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=? AND worker_id=?').run(now(),ack[1],user.id);
   if(result.changes)audit(user,'dispatch.acknowledge',ack[1]);
   resp(res,result.changes?200:404,result.changes?{ok:true}:{error:'Atribuição não encontrada'});return true;
  }
  const task=p.match(/^\/api\/dispatches\/([a-f0-9-]{36})\/(start|complete)$/i);
  if(task&&method==='POST'){
   if(user.role!=='ronda'){resp(res,403,{error:'Somente o vigia atribuído pode executar'});return true;}
   const item=db.prepare('SELECT * FROM dispatches WHERE id=? AND worker_id=?').get(task[1],user.id);
   if(!item){resp(res,404,{error:'Atribuição não encontrada'});return true;}
   if(task[2]==='start'&&item.completed_at||task[2]==='complete'&&(!item.started_at||item.completed_at)){
    resp(res,409,{error:'Estado da atribuição incompatível com a operação'});return true;
   }
   if(task[2]==='start'&&item.started_at){resp(res,200,{ok:true,already:true});return true;}
   const data=serialize((await body(req)).toString())||{},at=now(),comment=clean(data.note);
   if(task[2]==='complete'&&(comment.length<10||comment.length>1500)){
    resp(res,422,{error:'Descreva o resultado do atendimento (mínimo 10 caracteres)'});return true;
   }
   const position=data.position;
   const validPosition=position&&Number.isFinite(position.lat)&&Number.isFinite(position.lng)&&Math.abs(position.lat)<=90&&Math.abs(position.lng)<=180;
   const kind=task[2]==='start'?'patrol_start':'patrol_end',description=task[2]==='start'?'Despacho iniciado: '+item.address:'Despacho concluído: '+comment;
   db.exec('BEGIN IMMEDIATE');
   try{
    if(task[2]==='start'){
     db.prepare('UPDATE dispatches SET started_at=?,acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=?').run(at,at,item.id);
    }else db.prepare('UPDATE dispatches SET completed_at=?,completion_note=? WHERE id=?').run(at,comment,item.id);
    db.prepare('INSERT INTO events(id,user_id,kind,round_id,occurred_at,received_at,lat,lng,accuracy,battery,description,details,site) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
     .run(id(),user.id,kind,item.id,at,at,validPosition?position.lat:null,validPosition?position.lng:null,validPosition?position.accuracy??null:null,null,description,JSON.stringify({dispatchId:item.id,address:item.address,reason:item.reason}),user.site||'');
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error}
   audit(user,'dispatch.'+task[2],item.id);
   notify(REVIEW_ROLES,'dispatch',task[2]==='start'?'Atendimento iniciado':'Atendimento concluído',user.name+' · '+item.address+' · '+(comment||item.reason),{dispatchId:item.id,except:[user.id]});
   resp(res,200,{ok:true,at,roundId:item.id});return true;
  }
  return false;
 }
 return {handle,notifyEvent,notifyReview,notifyMessage,allows,availability};
}
