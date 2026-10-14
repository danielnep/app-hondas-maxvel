/* Destinos e chamados de vistoria auditáveis. Isolado dos despachos de ronda. */
const safe=x=>String(x??'').trim();
const man=u=>['admin','master'].includes(u.role);
const rev=u=>['admin','master','operador','coi'].includes(u.role);
const UUID=/^[a-f0-9-]{36}$/i;
export function createInspections(db,{now,id,audit,resp,body,serialize}){
 db.exec('CREATE TABLE IF NOT EXISTS inspection_destinations(id TEXT PRIMARY KEY,site TEXT NOT NULL,name TEXT NOT NULL,latitude REAL NOT NULL,longitude REAL NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_by TEXT NOT NULL,updated_at INTEGER NOT NULL)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_inspection_dest_site ON inspection_destinations(site,active)');
 db.exec('CREATE TABLE IF NOT EXISTS inspection_assignments(id TEXT PRIMARY KEY,worker_id TEXT NOT NULL,destination_id TEXT NOT NULL,site TEXT NOT NULL,author_id TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,acknowledged_at INTEGER,completed_at INTEGER,completion_event_id TEXT,FOREIGN KEY(worker_id) REFERENCES users(id),FOREIGN KEY(destination_id) REFERENCES inspection_destinations(id))');
 db.exec('CREATE INDEX IF NOT EXISTS idx_inspection_assignee ON inspection_assignments(worker_id,created_at)');
 const query='SELECT a.*,d.name destination,d.latitude,d.longitude,w.name worker,s.name author FROM inspection_assignments a JOIN inspection_destinations d ON d.id=a.destination_id JOIN users w ON w.id=a.worker_id JOIN users s ON s.id=a.author_id';
 const listing=u=>(u.role==='vistoriador'?db.prepare(query+' WHERE a.worker_id=? ORDER BY a.created_at DESC LIMIT 150').all(u.id):rev(u)?db.prepare(query+' ORDER BY a.created_at DESC LIMIT 300').all():[]);
 function validateAssignment(u,assignmentId){
  if(!UUID.test(assignmentId||''))return {ok:false,error:'Identificador da vistoria atribuída inválido'};
  const item=db.prepare("SELECT a.*,d.name destination,d.latitude,d.longitude FROM inspection_assignments a JOIN inspection_destinations d ON d.id=a.destination_id WHERE a.id=? AND a.worker_id=? AND a.site=?").get(assignmentId,u.id,u.site);
  if(!item||item.completed_at)return {ok:false,error:'Chamado inexistente, concluído ou atribuído a outro vistoriador'};
  return {ok:true,item};
 }
 function completeAssignment(u,assignmentId,eventId){
  const result=db.prepare('UPDATE inspection_assignments SET acknowledged_at=COALESCE(acknowledged_at,?),completed_at=?,completion_event_id=? WHERE id=? AND worker_id=? AND completed_at IS NULL').run(now(),now(),eventId,assignmentId,u.id);
  if(!result.changes)throw new Error('Chamado já concluído');
  audit(u,'inspection.complete',assignmentId);
 }
 async function handle(req,res,user,path,method){
  if(path==='/api/inspection-destinations'&&method==='GET'){
   if(!rev(user)&&user.role!=='vistoriador'){resp(res,403,{error:'Sem acesso aos destinos'});return true;}
   const rows=rev(user)?db.prepare('SELECT * FROM inspection_destinations ORDER BY site,name').all():
    db.prepare('SELECT id,site,name,latitude,longitude,active,updated_at FROM inspection_destinations WHERE site=? AND active=1 ORDER BY name').all(user.site);
   resp(res,200,{destinations:rows});return true;
  }
  const destId=path.match(/^\/api\/inspection-destinations\/([a-f0-9-]{36})$/i);
  if((path==='/api/inspection-destinations'&&method==='POST')||(destId&&method==='PUT')){
   if(!man(user)){resp(res,403,{error:'Só a administração configura destinos'});return true;}
   const d=serialize((await body(req)).toString())||{},site=safe(d.site).slice(0,100),name=safe(d.name).slice(0,120);
   const lat=Number(d.latitude),lng=Number(d.longitude);
   if(site.length<2||name.length<3||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){
    resp(res,422,{error:'Informe posto, nome e coordenadas válidas'});return true;
   }
   if(destId){
    const row=db.prepare('SELECT id FROM inspection_destinations WHERE id=?').get(destId[1]);
    if(!row){resp(res,404,{error:'Destino não encontrado'});return true;}
    db.prepare('UPDATE inspection_destinations SET site=?,name=?,latitude=?,longitude=?,active=?,updated_at=? WHERE id=?')
     .run(site,name,lat,lng,d.active===false?0:1,now(),row.id);
    audit(user,'inspection.destination.update',row.id);
    resp(res,200,{id:row.id});return true;
   }
   const did=id();db.prepare('INSERT INTO inspection_destinations(id,site,name,latitude,longitude,active,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(did,site,name,lat,lng,d.active===false?0:1,user.id,now());
   audit(user,'inspection.destination.create',did);
   resp(res,201,{id:did});return true;
  }
  if(path==='/api/inspection-assignments'&&method==='GET'){
   if(!rev(user)&&user.role!=='vistoriador'){resp(res,403,{error:'Sem acesso a chamados de vistoria'});return true;}
   resp(res,200,{assignments:listing(user)});return true;
  }
  if(path==='/api/inspection-assignments'&&method==='POST'){
   if(!rev(user)){resp(res,403,{error:'Somente central e administração despacham vistorias'});return true;}
   const d=serialize((await body(req)).toString())||{},reason=safe(d.reason).slice(0,1500);
   const worker=db.prepare("SELECT id,site,active FROM users WHERE id=? AND role='vistoriador'").get(safe(d.workerId));
   const dest=db.prepare('SELECT id,site,name FROM inspection_destinations WHERE id=? AND active=1').get(safe(d.destinationId));
   if(!worker||!worker.active||!worker.site||!dest||dest.site!==worker.site||reason.length<10){
    resp(res,422,{error:'Selecione um vistoriador, destino ativo do mesmo posto e motivo com pelo menos 10 caracteres'});return true;
   }
   const last=db.prepare('SELECT last_seen FROM operational_presence WHERE user_id=?').get(worker.id)?.last_seen;
   if(!last||now()-last>=120000){resp(res,409,{error:'O vistoriador não está disponível. Aguarde presença autenticada.'});return true;}
   if(db.prepare('SELECT id FROM inspection_assignments WHERE worker_id=? AND completed_at IS NULL LIMIT 1').get(worker.id)){
    resp(res,409,{error:'O vistoriador já tem uma vistoria pendente'});return true;
   }
   const aid=id(),at=now();db.prepare('INSERT INTO inspection_assignments(id,worker_id,destination_id,site,author_id,reason,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(aid,worker.id,dest.id,worker.site,user.id,reason,at);
   db.prepare('INSERT INTO notifications(id,user_id,kind,title,body,created_at) VALUES(?,?,?,?,?,?)')
    .run(id(),worker.id,'inspection','Nova vistoria atribuída',dest.name+' · '+reason,at);
   audit(user,'inspection.assign',aid);
   resp(res,201,{id:aid,createdAt:at});return true;
  }
  const ack=path.match(/^\/api\/inspection-assignments\/([a-f0-9-]{36})\/ack$/i);
  if(ack&&method==='POST'){
   if(user.role!=='vistoriador'){resp(res,403,{error:'Apenas o vistoriador atribuído confirma'});return true;}
   const assignment=validateAssignment(user,ack[1]);
   if(!assignment.ok){resp(res,404,{error:assignment.error});return true;}
   db.prepare('UPDATE inspection_assignments SET acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=?').run(now(),ack[1]);
   audit(user,'inspection.ack',ack[1]);resp(res,200,{ok:true});return true;
  }
  return false;
 }
 return {handle,validateAssignment,completeAssignment};
}
