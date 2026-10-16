/**
 * Planejador de vistorias do campo.
 * Ordenação gulosa por proximidade geográfica, NÃO roteamento por vias públicas.
 * Despachos iniciados não mudam de destino quando chegam novas solicitações.
 * Coordenadas ausentes nunca são inventadas nem usadas para calcular distâncias.
 */
export function pointOf(item) {
 if (!item||item.lat==null&&item.latitude==null||item.lng==null&&item.longitude==null) return null;
 const lat=Number(item.lat??item.latitude),lng=Number(item.lng??item.longitude);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
}
export function metersBetween(a,b) {
 const p=pointOf(a),q=pointOf(b);
 if(!p||!q)return Infinity;
 const rad=Math.PI/180,lat=(q.lat-p.lat)*rad,lng=(q.lng-p.lng)*rad;
 const value=Math.sin(lat/2)**2+Math.cos(p.lat*rad)*Math.cos(q.lat*rad)*Math.sin(lng/2)**2;
 return 12742000*Math.atan2(Math.sqrt(value),Math.sqrt(Math.max(0,1-value)));
}
export function queueInspections(items=[],currentPosition=null,basePosition=null){
 const pending=(Array.isArray(items)?items:[]).filter(x=>(x.kind==='vistoria'||x.kind==='inspection'||x.type==='inspection'||x.type==='vistoria'||!x.kind)&&!x.completed_at&&!x.completedAt);
 const byAge=(a,b)=>Number(a.started_at||a.startedAt||a.created_at||a.createdAt||0)-Number(b.started_at||b.startedAt||b.created_at||b.createdAt||0)||String(a.id).localeCompare(String(b.id));
 const active=pending.filter(x=>x.started_at||x.startedAt).sort(byAge);
 const unstarted=pending.filter(x=>!x.started_at&&!x.startedAt).sort(byAge);
 const result=[...active];
 let origin=active.length?pointOf(active.at(-1))||pointOf(currentPosition)||pointOf(basePosition):pointOf(currentPosition)||pointOf(basePosition);
 while(unstarted.length){
  let best=0,closest=Infinity;
  for(let i=0;i<unstarted.length;i++){
   const d=metersBetween(origin,unstarted[i]);
   if(d<closest){closest=d;best=i;}
  }
  const [next]=unstarted.splice(best,1);result.push(next);
  origin=pointOf(next)||origin;
 }
 return result;
}
export function inspectionRoute(ordered=[],base=null){
 const origin=pointOf(base)||pointOf(ordered[0])||{lat:-20.14030,lng:-44.88400};
 const points=ordered.flatMap(item=>{
  const p=pointOf(item);if(!p)return [];
  let waypoints=item.routePoints??item.route_points??[];
  if(typeof waypoints==='string')try{waypoints=JSON.parse(waypoints)}catch{waypoints=[]}
  const intermediate=(Array.isArray(waypoints)?waypoints:[]).map(pointOf).filter(Boolean).slice(0,12);
  return [...intermediate.map((x,i)=>({...x,id:'via:'+item.id+':'+i,name:'Passagem · '+(item.address||item.site||'Vistoria'),instruction:'Passagem indicada pelo COI',radius:0,inspectionVia:true})),
   {...p,id:item.id,name:item.address||item.site||'Vistoria',instruction:item.reason||item.instructions||'Verificar o local',radius:0,inspection:true,
    completedAt:item.completed_at||item.completedAt||null,startedAt:item.started_at||item.startedAt||null}];
 });
 return {id:'inspection-circuit',name:'Circuito de vistorias · COI',unit:'Atendimento de campo',inspectionMode:true,
  base:{...origin,id:'base',name:'Base de partida'},points};
}
export function inspectionSignature(items=[]){
 return items.map(i=>[i.id,i.started_at||i.startedAt||0,i.arrived_at||i.arrivedAt||0,i.completed_at||i.completedAt||0,i.latitude??'',i.longitude??''].join(':')).join('|');
}
