export function createActivityHistory(db,{resp,serialize,aggregateOperationalRounds,visible,operations}){
 db.exec('CREATE INDEX IF NOT EXISTS idx_event_round_history ON events(round_id,user_id,occurred_at)');
 const deny=(res)=>{resp(res,403,{error:'Histórico não autorizado'});return true};
 const allowed=u=>!['operador','coi'].includes(u.role)||operations.allows(u,'rondas');
 const parse=e=>({...e,details:serialize(e.details)||{}});
 const scope=u=>['ronda','vistoriador'].includes(u.role)?{where:'e.user_id=?',args:[u.id]}:u.role==='cliente'?{where:"e.site=? AND e.kind IN ('patrol_start','patrol_end','checkpoint','inspection')",args:[u.site||'']}: {where:'1=1',args:[]};
 return {async handle(req,res,u,p,m){
  if(!p.startsWith('/api/activity/')||m!=='GET')return false;
  if(p!=='/api/activity/phone'&&!p.startsWith('/api/activity/events/')&&!allowed(u))return deny(res);
  const url=new URL(req.url,'http://local'),s=scope(u);
  const eventMatch=p.match(/^\/api\/activity\/events\/([^/]+)$/);
  if(eventMatch){const event=db.prepare('SELECT * FROM events WHERE id=?').get(decodeURIComponent(eventMatch[1]));if(!event||!visible(u,event)||(['operador','coi'].includes(u.role)&&!operations.allows(u,'ocorrencias'))){resp(res,404,{error:'Evento não encontrado'});return true}resp(res,200,{event:parse(event)});return true;}
  const detail=p.match(/^\/api\/activity\/rounds\/([^/]+)$/);
  if(detail){
   const roundId=decodeURIComponent(detail[1]);
   const rows=db.prepare('SELECT e.*,w.name worker_name,w.phone worker_phone FROM events e JOIN users w ON w.id=e.user_id WHERE '+s.where+' AND e.round_id=? ORDER BY e.occurred_at,e.received_at,e.id').all(...s.args,roundId);
   if(!rows.length){resp(res,404,{error:'Ronda não encontrada'});return true}
   const round=aggregateOperationalRounds(rows)[0];
   const start=rows.find(e=>e.kind==='patrol_start'),routeId=serialize(start?.details)?.routeId;
   const route=routeId?db.prepare('SELECT * FROM planned_routes WHERE id=?').get(routeId):null;
   const markers=rows.filter(e=>e.lat!==null&&e.lng!==null&&e.kind!=='gps').map(e=>({id:e.id,kind:e.kind,lat:e.lat,lng:e.lng,at:e.occurred_at,description:e.description}));
   // The raw samples remain intact; GPS gaps are surfaced to the map renderer.
   resp(res,200,{round:{...round,worker:rows[0].worker_name,phone:rows[0].worker_phone},route:route?{...route,points:serialize(route.points)}:null,events:rows.map(parse),markers,track:rows.filter(e=>e.kind==='gps'&&e.lat!==null&&e.lng!==null).map(e=>({lat:e.lat,lng:e.lng,accuracy:e.accuracy,at:e.occurred_at}))});return true;
  }
  if(p==='/api/activity/history'){
   const offset=Math.max(0,Math.floor(Number(url.searchParams.get('offset'))||0)),limit=Math.min(50,Math.max(1,Math.floor(Number(url.searchParams.get('limit'))||20)));
   const base=`SELECT e.round_id id,'round' type,e.user_id userId,w.name worker,MAX(e.site) site,
    COALESCE(MIN(CASE WHEN e.kind='patrol_start' THEN e.occurred_at END),MIN(e.occurred_at)) at,
    CASE WHEN SUM(e.kind='patrol_incomplete')>0 THEN 'incompleta' WHEN SUM(e.kind='patrol_interrupted')>0 THEN 'interrompida' WHEN SUM(e.kind='patrol_end')>0 THEN 'concluida' WHEN SUM(e.kind='patrol_start')>0 THEN 'em_andamento' ELSE 'sem_inicio' END status,'' description,NULL details
    FROM events e JOIN users w ON w.id=e.user_id WHERE ${s.where} AND e.round_id IS NOT NULL GROUP BY e.round_id,e.user_id
    UNION ALL SELECT e.id,'inspection',e.user_id,w.name,e.site,e.occurred_at,'concluida',e.description,e.details FROM events e JOIN users w ON w.id=e.user_id WHERE ${s.where} AND e.kind='inspection'`;
   const kind=url.searchParams.get('type')||'',worker=url.searchParams.get('worker')||'',status=url.searchParams.get('status')||'',from=Number(url.searchParams.get('from'))||0,to=Number(url.searchParams.get('to'))||Number.MAX_SAFE_INTEGER,q=(url.searchParams.get('q')||'').slice(0,200);
   const where=" WHERE (?='' OR type=?) AND (?='' OR userId=?) AND (?='' OR status=?) AND at>=? AND at<=? AND (?='' OR instr(lower(worker||' '||site||' '||description||' '||id),lower(?))>0)";
   const args=[...s.args,...s.args,kind,kind,worker,worker,status,status,from,to,q,q];
   const total=db.prepare('SELECT COUNT(*) n FROM ('+base+')'+where).get(...args).n;
   const page=db.prepare('SELECT * FROM ('+base+')'+where+' ORDER BY at DESC,id DESC LIMIT ? OFFSET ?').all(...args,limit,offset);
   const records=page.map(r=>{
    if(r.type==='inspection')return {...r,details:serialize(r.details)};
    const samples=db.prepare('SELECT * FROM events WHERE round_id=? AND user_id=? ORDER BY occurred_at,received_at,id').all(r.id,r.userId);
    return {...aggregateOperationalRounds(samples)[0],...r};
   });
   resp(res,200,{records,total,hasMore:offset+limit<total,nextOffset:offset+limit});return true;
  }
  if(p==='/api/activity/phone'){
   const event=db.prepare('SELECT * FROM events WHERE id=?').get(url.searchParams.get('event'));
   if(!event||!visible(u,event)||(['operador','coi'].includes(u.role)&&!operations.allows(u,'ocorrencias'))){resp(res,404,{error:'Evento não encontrado'});return true}
   const w=db.prepare('SELECT name,phone FROM users WHERE id=?').get(event.user_id);
   resp(res,200,{name:w?.name||'',phone:w?.phone||''});return true;
  }
  return false;
 }};
}
