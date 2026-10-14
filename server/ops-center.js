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
  }
 }
 async function handle(req,res,user,p,method){
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
   const items=db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 120').all(user.id);
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
   const recent=db.prepare('SELECT round_id,user_id,site,kind,occurred_at,lat,lng,accuracy,battery,details FROM events WHERE round_id IS NOT NULL AND occurred_at>? ORDER BY occurred_at').all(now()-30*86400000);
   if(aggregateOperationalRounds(recent).some(r=>r.userId===worker.id&&r.status==='em_andamento')){
    resp(res,409,{error:'O vigia já está em ronda. Selecione outro profissional.'});return true;
   }
   const recentPresence=db.prepare('SELECT occurred_at FROM events WHERE user_id=? ORDER BY occurred_at DESC LIMIT 1').get(worker.id);
   if(!recentPresence||now()-recentPresence.occurred_at>15*60000){
    resp(res,409,{error:'Vigia sem atividade recente. Confirme disponibilidade antes de despachar.'});return true;
   }
   const latitude=data.latitude==null?null:Number(data.latitude),longitude=data.longitude==null?null:Number(data.longitude);
   if(latitude!=null&&!Number.isFinite(latitude)||longitude!=null&&!Number.isFinite(longitude)||latitude!=null&&Math.abs(latitude)>90||longitude!=null&&Math.abs(longitude)>180){
    resp(res,422,{error:'Coordenadas inválidas'});return true;
   }
   const dispatchId=id(),at=now();
   db.prepare('INSERT INTO dispatches(id,worker_id,author_id,address,reason,latitude,longitude,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(dispatchId,worker.id,user.id,address,reason,latitude,longitude,at);
   insert.run(id(),worker.id,'dispatch','Nova ronda adicionada',address+' · '+reason,null,dispatchId,at);
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
  return false;
 }
 return {handle,notifyEvent,notifyReview,allows};
}
