import {EVENT_TYPES,primaryRole} from '../src/treatment-policy.js';
/* Centro operacional: configurações COI, despachos e notificações persistidas. */
const MODULES=['mapa','despachos','rondas','ocorrencias','alertas','relatorios'];
const REVIEW_ROLES=['operador','coi','admin','master'];
const ADMIN_ROLES=['admin','master'];
const FIRST_RESPONSE_ROLES=['coi','operador'];
const EVENT_LABELS={
 panic:'PÂNICO ACIONADO',incident:'Nova ocorrência',alert:'Alerta operacional',
 gps_issue:'Sinal GPS impreciso',route_deviation:'Possível desvio de rota',
 patrol_incomplete:'Ronda incompleta',patrol_interrupted:'Ronda interrompida',
 message:'Nova mensagem do campo',inspection:'Novo laudo de vistoria',patrol_end:'Ronda ou atendimento concluído',patrol_start:'Início de atendimento'
};
const clean=x=>String(x??'').trim();
export function createOpsCenter(db,{now,id,audit,resp,body,serialize,aggregateOperationalRounds}){
 db.exec('CREATE TABLE IF NOT EXISTS coi_permissions(module TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1,updated_by TEXT,updated_at INTEGER NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS dispatches(id TEXT PRIMARY KEY,worker_id TEXT NOT NULL,author_id TEXT NOT NULL,address TEXT NOT NULL,reason TEXT NOT NULL,latitude REAL,longitude REAL,created_at INTEGER NOT NULL,acknowledged_at INTEGER)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_dispatch_worker ON dispatches(worker_id,created_at)');
 db.exec('CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,event_id TEXT,dispatch_id TEXT,created_at INTEGER NOT NULL,read_at INTEGER)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_notification_user ON notifications(user_id,created_at)');
 db.exec('CREATE TABLE IF NOT EXISTS operational_presence(user_id TEXT PRIMARY KEY,last_seen INTEGER NOT NULL)');
 // Migração aditiva: preserva todas as presenças e os registros existentes.
 const presenceCols=new Set(db.prepare('PRAGMA table_info(operational_presence)').all().map(c=>c.name));
 for(const [field,type] of [['lat','REAL'],['lng','REAL'],['accuracy','REAL'],['fix_at','INTEGER']])if(!presenceCols.has(field))db.exec(`ALTER TABLE operational_presence ADD COLUMN ${field} ${type}`);
 db.exec('CREATE TABLE IF NOT EXISTS inspection_destinations(id TEXT PRIMARY KEY,client_name TEXT NOT NULL,contact_name TEXT NOT NULL DEFAULT "",phone TEXT NOT NULL DEFAULT "",email TEXT NOT NULL DEFAULT "",address TEXT NOT NULL,latitude REAL,longitude REAL,active INTEGER NOT NULL DEFAULT 1,created_by TEXT NOT NULL,created_at INTEGER NOT NULL)');
 const dispatchCols=db.prepare('PRAGMA table_info(dispatches)').all().map(x=>x.name);
 if(!dispatchCols.includes('kind'))db.exec("ALTER TABLE dispatches ADD COLUMN kind TEXT NOT NULL DEFAULT 'ronda'");
 if(!dispatchCols.includes('destination_id'))db.exec('ALTER TABLE dispatches ADD COLUMN destination_id TEXT');
 if(!dispatchCols.includes('site'))db.exec("ALTER TABLE dispatches ADD COLUMN site TEXT NOT NULL DEFAULT ''");
 const fields=db.prepare('PRAGMA table_info(dispatches)').all().map(x=>x.name);
 if(!fields.includes('started_at'))db.exec('ALTER TABLE dispatches ADD COLUMN started_at INTEGER');
 if(!fields.includes('completed_at'))db.exec('ALTER TABLE dispatches ADD COLUMN completed_at INTEGER');
 if(!fields.includes('completion_note'))db.exec("ALTER TABLE dispatches ADD COLUMN completion_note TEXT NOT NULL DEFAULT ''");
 if(!fields.includes('route_points'))db.exec("ALTER TABLE dispatches ADD COLUMN route_points TEXT NOT NULL DEFAULT '[]'");
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
  const title=EVENT_LABELS[record.kind]||EVENT_TYPES[record.kind]?.label||'Registro operacional';
  notify(REVIEW_ROLES,record.kind,title,actor.name+' · '+clean(record.description).slice(0,280),{eventId:record.id,except:[actor.id]});
 }
 function notifyReview(actor,record,status,conclusion){
  if(['aberta','em_analise','encaminhada','resolvida'].includes(status))notify(primaryRole(actor.role)?ADMIN_ROLES:REVIEW_ROLES,'review',primaryRole(actor.role)?'Tratativa do COI registrada':'Tratativa administrativa registrada',actor.name+' · '+status.replaceAll('_',' ')+' · '+clean(conclusion).slice(0,350),{eventId:record.id,except:[actor.id]});
  if(['resolvida','em_analise','encaminhada','aberta'].includes(status)&&record.user_id!==actor.id){
   insert.run(id(),record.user_id,'review',status==='resolvida'?'Registro resolvido':'Registro em aberto · '+status.replaceAll('_',' '),clean(conclusion).slice(0,350),record.id,null,now());
   announce(record.user_id);
  }
 }
 function notifyMessage(actor,record,audience,message){
  const recipients=REVIEW_ROLES;
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
  const workers=db.prepare("SELECT u.id,u.name,u.role,u.site,u.active,p.last_seen,p.lat,p.lng,p.accuracy,p.fix_at FROM users u LEFT JOIN operational_presence p ON p.user_id=u.id WHERE u.role IN ('ronda','vistoriador') ORDER BY u.name").all();
  return workers.map(w=>({...w,status:!w.active?'Fora de serviço':busy.has(w.id)?'Em ronda':w.last_seen&&now()-w.last_seen<120000?'Disponível':'Fora de serviço',
   position:w.fix_at&&now()-w.fix_at<120000&&Number.isFinite(w.lat)&&Number.isFinite(w.lng)?{lat:w.lat,lng:w.lng,accuracy:w.accuracy,at:w.fix_at}:null}));
 }
 async function handle(req,res,user,p,method){
  if(p==='/api/presence'&&method==='POST'){
   if(!['ronda','vistoriador'].includes(user.role)){resp(res,403,{error:'Presença reservada à equipe de campo'});return true;}
   const payload=serialize((await body(req,2000)).toString())||{},position=payload.position;
   const valid=position&&Number.isFinite(position.lat)&&Number.isFinite(position.lng)&&Math.abs(position.lat)<=90&&Math.abs(position.lng)<=180&&
    (position.accuracy==null||Number.isFinite(position.accuracy)&&position.accuracy>=0&&position.accuracy<=5000);
   const at=now();
   db.prepare('INSERT INTO operational_presence(user_id,last_seen,lat,lng,accuracy,fix_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen=excluded.last_seen,lat=COALESCE(excluded.lat,operational_presence.lat),lng=COALESCE(excluded.lng,operational_presence.lng),accuracy=COALESCE(excluded.accuracy,operational_presence.accuracy),fix_at=COALESCE(excluded.fix_at,operational_presence.fix_at)')
    .run(user.id,at,valid?position.lat:null,valid?position.lng:null,valid?position.accuracy??null:null,valid?at:null);
   resp(res,200,{ok:true,positionRecorded:!!valid});return true;
  }
  if(p==='/api/presence/off'&&method==='POST'){
   if(!['ronda','vistoriador'].includes(user.role)){resp(res,403,{error:'Presença reservada à equipe de campo'});return true;}
   db.prepare('DELETE FROM operational_presence WHERE user_id=?').run(user.id);
   resp(res,200,{ok:true});return true;
  }
  if(p==='/api/availability'&&method==='GET'){
   if(!review(user)||!allows(user,'rondas')){resp(res,403,{error:'Sem acesso à disponibilidade'});return true;}
   const rows=availability();resp(res,200,{guards:rows.filter(w=>w.role==='ronda'),inspectors:rows.filter(w=>w.role==='vistoriador')});return true;
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
   const url=new URL(req.url,'http://local'),limit=Math.min(120,Math.max(1,Number(url.searchParams.get('limit'))||120));
   const cursor=url.searchParams.get('cursor'),parts=cursor?.split(':');
   if(cursor&&(!parts||parts.length!==2||!/^\d+$/.test(parts[0])||!/[a-f0-9-]{36}/i.test(parts[1]))){resp(res,422,{error:'Cursor inválido'});return true;}
   const eventChannel=url.searchParams.get('channel')==='events',channelFilter=eventChannel?" AND n.kind<>'message' AND COALESCE(e.kind,'')<>'message' ":' ';
   const query="SELECT n.*,e.kind event_kind,e.status event_status,reporter.name origin_name,reporter.role origin_role,d.started_at dispatch_started_at,d.completed_at dispatch_completed_at FROM notifications n LEFT JOIN events e ON e.id=n.event_id LEFT JOIN users reporter ON reporter.id=e.user_id LEFT JOIN dispatches d ON d.id=n.dispatch_id WHERE n.user_id=? "+channelFilter;
   const rows=cursor?db.prepare(query+'AND (n.created_at<? OR (n.created_at=? AND n.id<?)) ORDER BY n.created_at DESC,n.id DESC LIMIT ?').all(user.id,Number(parts[0]),Number(parts[0]),parts[1],limit+1):db.prepare(query+'ORDER BY n.created_at DESC,n.id DESC LIMIT ?').all(user.id,limit+1);
   const items=rows.slice(0,limit),last=items.at(-1);
   const count=db.prepare("SELECT COUNT(*) n FROM notifications n LEFT JOIN events e ON e.id=n.event_id WHERE n.user_id=? AND n.read_at IS NULL"+channelFilter).get(user.id).n;
   const total=db.prepare("SELECT COUNT(*) n FROM notifications n LEFT JOIN events e ON e.id=n.event_id WHERE n.user_id=?"+channelFilter).get(user.id).n;
   const attention=db.prepare("SELECT COUNT(DISTINCT CASE WHEN e.id IS NOT NULL AND e.status<>'resolvida' THEN 'e:'||e.id WHEN d.id IS NOT NULL AND d.completed_at IS NULL THEN 'd:'||d.id END) n FROM notifications n LEFT JOIN events e ON e.id=n.event_id LEFT JOIN dispatches d ON d.id=n.dispatch_id WHERE n.user_id=?").get(user.id).n;
   resp(res,200,{notifications:items,total,unread:count,attention,hasMore:rows.length>limit,nextCursor:rows.length>limit&&last?last.created_at+':'+last.id:null});return true;
  }
  const seen=p.match(/^\/api\/notifications\/([a-f0-9-]{36})\/read$/i);
  if(seen&&method==='POST'){
   const change=db.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?').run(now(),seen[1],user.id);
   if(change.changes)announce(user.id);
   resp(res,change.changes?200:404,change.changes?{ok:true}:{error:'Notificação não encontrada'});return true;
  }
  if(p==='/api/inspection-destinations'&&method==='GET'){
   if(!review(user)){resp(res,403,{error:'Sem acesso aos clientes de vistoria'});return true;}
   resp(res,200,{destinations:db.prepare('SELECT id,client_name,contact_name,phone,email,address,latitude,longitude,active FROM inspection_destinations ORDER BY client_name').all()});return true;
  }
  if(p==='/api/inspection-destinations'&&method==='POST'){
   if(!admin(user)){resp(res,403,{error:'Só Administração cadastra destinos'});return true;}
   const data=serialize((await body(req)).toString())||{};
   const name=clean(data.clientName),address=clean(data.address),contact=clean(data.contactName),
    phone=clean(data.phone),email=clean(data.email);
   const lat=data.latitude==null?null:Number(data.latitude),lng=data.longitude==null?null:Number(data.longitude);
   if(name.length<2||name.length>130||address.length<5||address.length>350||contact.length>100||
    phone.length>35||email.length>160||(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))||
    lat!=null&&(!Number.isFinite(lat)||Math.abs(lat)>90)||lng!=null&&(!Number.isFinite(lng)||Math.abs(lng)>180)){
    resp(res,422,{error:'Dados de destino inválidos'});return true;
   }
   const destId=id();
   db.prepare('INSERT INTO inspection_destinations(id,client_name,contact_name,phone,email,address,latitude,longitude,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(destId,name,contact,phone,email,address,lat,lng,user.id,now());
   audit(user,'inspection.destination.create',destId);
   resp(res,201,{id:destId});return true;
  }
  if(p==='/api/dispatches'&&method==='GET'){
   if(!['ronda','vistoriador'].includes(user.role)&&(!review(user)||!allows(user,'despachos'))){resp(res,403,{error:'Despachos sem permissão'});return true;}
   const query='SELECT d.*,worker.name worker,operator.name author FROM dispatches d JOIN users worker ON worker.id=d.worker_id JOIN users operator ON operator.id=d.author_id ';
   const items=['ronda','vistoriador'].includes(user.role)?db.prepare(query+'WHERE d.worker_id=? ORDER BY d.created_at DESC LIMIT 120').all(user.id):db.prepare(query+'ORDER BY d.created_at DESC LIMIT 120').all();
   resp(res,200,{dispatches:items});return true;
  }
  if(p==='/api/dispatches'&&method==='POST'){
   if(!review(user)||!allows(user,'despachos')){resp(res,403,{error:'Despacho indisponível'});return true;}
   const data=serialize((await body(req)).toString())||{},reason=clean(data.reason),
    kind=data.kind==='inspection'?'vistoria':'ronda';
   const role=kind==='vistoria'?'vistoriador':'ronda';
   const worker=db.prepare('SELECT id,name,site,role,active FROM users WHERE id=? AND role=?').get(clean(data.workerId),role);
   const hasDestination=kind==='vistoria'&&Boolean(clean(data.destinationId));
   const dest=hasDestination?db.prepare('SELECT * FROM inspection_destinations WHERE id=? AND active=1').get(clean(data.destinationId)):null;
   const address=dest?.address||clean(data.address),site=dest?.client_name||worker?.site||'';
   if(!worker||!worker.active||hasDestination&&!dest||address.length<5||address.length>350||reason.length<10||reason.length>1000){
    resp(res,422,{error:'Escolha um colaborador disponível, destino autorizado e justificativa com 10 ou mais caracteres'});return true;
   }
   if(!availability().some(w=>w.id===worker.id&&w.status==='Disponível')){
    resp(res,409,{error:'Profissional indisponível. Atualize a presença.'});return true;
   }
   const latitude=dest?dest.latitude:data.latitude==null?null:Number(data.latitude),
    longitude=dest?dest.longitude:data.longitude==null?null:Number(data.longitude);
   if(latitude!=null&&(!Number.isFinite(latitude)||Math.abs(latitude)>90)||
    longitude!=null&&(!Number.isFinite(longitude)||Math.abs(longitude)>180)){
    resp(res,422,{error:'Coordenadas inválidas'});return true;
   }
   const rawRoute=Array.isArray(data.routePoints)?data.routePoints:[];
   if(rawRoute.length>12||rawRoute.some(point=>!point||!Number.isFinite(Number(point.lat))||!Number.isFinite(Number(point.lng))||Math.abs(Number(point.lat))>90||Math.abs(Number(point.lng))>180)){
    resp(res,422,{error:'Rota inválida. Informe até 12 pontos válidos em latitude e longitude.'});return true;
   }
   const routePoints=kind==='vistoria'?rawRoute.map(p=>({lat:Number(p.lat),lng:Number(p.lng),label:clean(p.label).slice(0,70)})):[];
   const dispatchId=id(),at=now();
   db.prepare('INSERT INTO dispatches(id,worker_id,author_id,address,reason,latitude,longitude,created_at,kind,destination_id,site,route_points) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(dispatchId,worker.id,user.id,address,reason,latitude,longitude,at,kind,dest?.id||null,site,JSON.stringify(routePoints));
   insert.run(id(),worker.id,'dispatch',kind==='vistoria'?'Nova vistoria atribuída':'Nova ronda adicionada',
    address+' · '+reason,null,dispatchId,at);
   announce(worker.id);
   notify(ADMIN_ROLES,'dispatch','Despacho sob demanda registrado',user.name+' → '+worker.name+' · '+address+' · '+reason,{dispatchId,except:[user.id]});
   audit(user,'dispatch.'+kind+'.create',dispatchId);
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
   if(!['ronda','vistoriador'].includes(user.role)){resp(res,403,{error:'Somente o profissional atribuído pode executar'});return true;}
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
   if(task[2]==='complete'&&item.kind==='vistoria'){
    const laudo=db.prepare("SELECT id FROM events WHERE user_id=? AND kind='inspection' AND json_extract(details,'$.dispatchId')=? ORDER BY received_at DESC LIMIT 1").get(user.id,item.id);
    const evidence=laudo?db.prepare("SELECT evidence_view,mimetype FROM media WHERE event_id=?").all(laudo.id):[];
    const selfie=evidence.some(m=>m.evidence_view==='selfie'&&m.mimetype.startsWith('image/'));
    const localPhoto=evidence.some(m=>['front','back','left','right'].includes(m.evidence_view)&&m.mimetype.startsWith('image/'));
    if(!selfie||!localPhoto){resp(res,422,{error:'Para concluir vistoria, envie primeiro o laudo, uma selfie e uma foto do local.'});return true;}
   }
   const position=data.position;
   const validPosition=position&&Number.isFinite(position.lat)&&Number.isFinite(position.lng)&&Math.abs(position.lat)<=90&&Math.abs(position.lng)<=180;
   const eventId=id(),kind=task[2]==='start'?'patrol_start':'patrol_end',description=task[2]==='start'?'Despacho iniciado: '+item.address:'Despacho concluído: '+comment;
   db.exec('BEGIN IMMEDIATE');
   try{
    if(task[2]==='start'){
     db.prepare('UPDATE dispatches SET started_at=?,acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=?').run(at,at,item.id);
    }else db.prepare('UPDATE dispatches SET completed_at=?,completion_note=? WHERE id=?').run(at,comment,item.id);
    db.prepare('INSERT INTO events(id,user_id,kind,round_id,occurred_at,received_at,lat,lng,accuracy,battery,description,details,site) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
     .run(eventId,user.id,kind,item.id,at,at,validPosition?position.lat:null,validPosition?position.lng:null,validPosition?position.accuracy??null:null,null,description,JSON.stringify({dispatchId:item.id,address:item.address,reason:item.reason,destinationId:item.destination_id}),item.site||user.site||'');
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error}
   audit(user,'dispatch.'+task[2],item.id);
   notify(REVIEW_ROLES,'dispatch',task[2]==='start'?'Atendimento iniciado':'Atendimento concluído',user.name+' · '+item.address+' · '+(comment||item.reason),{eventId,dispatchId:item.id,except:[user.id]});
   resp(res,200,{ok:true,at,roundId:item.id});return true;
  }
  return false;
 }
 function broadcast(){for(const key of clients.keys())announce(key);}
 return {handle,notifyEvent,notifyReview,notifyMessage,allows,availability,broadcast};
}
