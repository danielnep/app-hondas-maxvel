/** Regras de rondas independentes da interface. Valores e posições são ilustrativos. */
export const DWELL_MS = 30_000;
export const RADIUS_METERS = 25;
export const CORRIDOR_METERS = 30;
export const MAX_ACCURACY_METERS = 25;
export const MAX_FIX_AGE_MS = 15_000;

export const DEMO_ROUTE = Object.freeze({
  id: 'centro-exemplo', name: 'Rota Centro · Perímetro', unit: 'Unidade Centro (cenário fictício)',
  base: { id: 'base', name: 'Base operacional', lat: -20.14030, lng: -44.88400 },
  points: [
    {id:'p1',name:'Portaria principal',instruction:'Verifique o acesso principal e as condições do portão.',lat:-20.14020,lng:-44.88366,radius:RADIUS_METERS},
    {id:'p2',name:'Corredor lateral',instruction:'Observe a passagem lateral e registre qualquer irregularidade.',lat:-20.14052,lng:-44.88338,radius:RADIUS_METERS},
    {id:'p3',name:'Estacionamento',instruction:'Verifique circulação, iluminação e condições do espaço.',lat:-20.14088,lng:-44.88370,radius:RADIUS_METERS},
    {id:'p4',name:'Acesso dos fundos',instruction:'Confira o acesso posterior antes de regressar à base.',lat:-20.14067,lng:-44.88406,radius:RADIUS_METERS}
  ],
  // Cada perna conecta dois pontos obrigatórios, com vértices de corredor intermediários.
  // Percurso inteiramente fictício; estes vértices NÃO são roteamento calculado pelas ruas.
  legs: [
    [{lat:-20.14024,lng:-44.88395},{lat:-20.14023,lng:-44.88379}],
    [{lat:-20.14018,lng:-44.88355},{lat:-20.14031,lng:-44.88351},{lat:-20.14043,lng:-44.88350}],
    [{lat:-20.14061,lng:-44.88337},{lat:-20.14072,lng:-44.88347},{lat:-20.14079,lng:-44.88358}],
    [{lat:-20.14092,lng:-44.88380},{lat:-20.14086,lng:-44.88393},{lat:-20.14075,lng:-44.88397}],
    [{lat:-20.14055,lng:-44.88414},{lat:-20.14042,lng:-44.88411}]
  ]
});

const clone = x => JSON.parse(JSON.stringify(x));
export function routeLeg(route,legIndex){
 const points=[route.base,...route.points,route.base];
 if(!Number.isInteger(legIndex)||legIndex<0||legIndex>=points.length-1)return [];
 return [points[legIndex],...(route.legs?.[legIndex]??[]),points[legIndex+1]];
}
export function routeWaypoints(route){
 const all=[route.base];
 for(let i=0;i<=route.points.length;i++)all.push(...routeLeg(route,i).slice(1));
 return all;
}
export const distanceMeters=(a,b)=>{
  if(!a||!b)return Infinity;
  const r=Math.PI/180,lat1=a.lat*r,lat2=b.lat*r,dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));
};
export function distanceToSegment(p,a,b){
  const scale=111320*Math.cos((a.lat+b.lat)/2*Math.PI/180);
  const vx=(b.lng-a.lng)*scale,vy=(b.lat-a.lat)*111320;
  const wx=(p.lng-a.lng)*scale,wy=(p.lat-a.lat)*111320;
  const len=vx*vx+vy*vy;
  const t=len?Math.max(0,Math.min(1,(wx*vx+wy*vy)/len)):0;
  return Math.hypot(wx-t*vx,wy-t*vy);
}
export const corridorDistance=(fix,route)=>Math.min(...routeWaypoints(route).slice(1).map((point,i)=>distanceToSegment(fix,routeWaypoints(route)[i],point)));
export const accurateFix=(fix,now)=>!!fix&&Number.isFinite(fix.lat)&&Number.isFinite(fix.lng)&&Number.isFinite(fix.accuracy)&&fix.accuracy>=0&&fix.accuracy<=MAX_ACCURACY_METERS&&Number.isFinite(fix.at)&&fix.at<=now&&now-fix.at<=MAX_FIX_AGE_MS;
export const currentCheckpoint=session=>session?.route.points[session.index]??null;
export const hasBlock=session=>session.deviations.some(d=>!d.justification||!d.returnedAt);
export const progressPercent=session=>Math.round(session.index/session.route.points.length*100);
const id=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createSession(name='Colaborador de demonstração',route=DEMO_ROUTE,now=Date.now(),mode='simulation'){
  return {id:id(),name:name.trim().slice(0,60),route:clone(route),mode,startedAt:now,finishedAt:null,
   status:'active',index:0,insideSince:null,lastFix:null,returnConfirmed:false,
   checkpoints:route.points.map(p=>({id:p.id,completedAt:null,dwellMs:0})),
   deviations:[],incidents:[],notifications:[],timeline:[{id:id(),kind:'start',at:now,label:'Ronda iniciada'}]};
}
function note(session,kind,label,now,more={}){session.timeline.unshift({id:id(),kind,label,at:now,...more});}
function alert(session,kind,label,now,more={}){session.notifications.unshift({id:id(),kind,label,at:now,seenAt:null,sessionId:session.id,...more});}

/** GPS questionável pausa a contagem sem atribuir culpa ao colaborador. */
export function updateLocation(s,fix,now=Date.now()){
  if(s.status!=='active')return {valid:false,reason:'inactive'};
  if(!accurateFix(fix,now)){
    s.insideSince=null;
    if(currentCheckpoint(s))s.checkpoints[s.index].dwellMs=0;
    return {valid:false,reason:'gps-unreliable'};
  }
  // Amostras antigas ou grandes lacunas não comprovam permanência contínua.
  if(s.lastFix?.at&&now-s.lastFix.at>MAX_FIX_AGE_MS){s.insideSince=null;const prior=currentCheckpoint(s);if(prior)s.checkpoints[s.index].dwellMs=0;}
  s.lastFix={lat:fix.lat,lng:fix.lng,accuracy:fix.accuracy,at:now};
  const point=currentCheckpoint(s),outside=corridorDistance(fix,s.route)>CORRIDOR_METERS;
  if(outside){
    s.insideSince=null;
    if(point)s.checkpoints[s.index].dwellMs=0;
    if(!hasBlock(s)&&!s.deviations.some(d=>!d.returnedAt)){
      const d={id:id(),at:now,pointId:point?.id??s.route.base.id,pointName:point?.name??s.route.base.name,
       reason:'Saída do corredor da rota',distance:Math.round(corridorDistance(fix,s.route)),position:{lat:fix.lat,lng:fix.lng},
       justification:'',justifiedAt:null,returnedAt:null};
      s.deviations.push(d);note(s,'deviation',`Desvio identificado: ${d.pointName}`,now,{deviationId:d.id});
      alert(s,'deviation','Desvio de rota: justificativa solicitada',now,{deviationId:d.id});
    }
    return {valid:true,inside:false,outside:true};
  }
  const awaiting=s.deviations.filter(d=>!d.returnedAt);
  if(awaiting.length&&point&&distanceMeters(fix,point)<=point.radius){
    for(const d of awaiting){d.returnedAt=now;note(s,'return',`Retorno ao ${point.name} registrado`,now,{deviationId:d.id});}
    s.insideSince=null;s.checkpoints[s.index].dwellMs=0;
  }
  if(!point){
    if(distanceMeters(fix,s.route.base)<=RADIUS_METERS){s.returnConfirmed=true;}
    return {valid:true,inside:s.returnConfirmed,outside:false};
  }
  const inside=distanceMeters(fix,point)<=point.radius;
  if(!inside){s.insideSince=null;s.checkpoints[s.index].dwellMs=0;return {valid:true,inside:false,outside:false};}
  if(s.insideSince===null)s.insideSince=now;
  s.checkpoints[s.index].dwellMs=Math.max(0,Math.min(DWELL_MS,now-s.insideSince));
  return {valid:true,inside:true,outside:false};
}
export function canCompletePoint(s){
  return s.status==='active'&&!!currentCheckpoint(s)&&s.insideSince!==null&&
    s.checkpoints[s.index].dwellMs>=DWELL_MS&&!hasBlock(s);
}
export function completePoint(s,now=Date.now()){
  if(!canCompletePoint(s))return false;
  const point=currentCheckpoint(s);
  s.checkpoints[s.index].completedAt=now;
  note(s,'checkpoint',`${point.name} validado`,now,{pointId:point.id});
  s.index++;s.insideSince=null;return true;
}
export function justifyDeviation(s,deviationId,reason,now=Date.now()){
  const d=s.deviations.find(x=>x.id===deviationId);
  if(!d||d.justification||typeof reason!=='string'||reason.trim().length<10||reason.trim().length>1400)return false;
  d.justification=reason.trim();d.justifiedAt=now;
  const n=s.notifications.find(n=>n.deviationId===d.id);
  if(n){n.justification=d.justification;n.justifiedAt=now;}
  note(s,'justification','Justificativa vinculada ao desvio',now,{deviationId:d.id});return true;
}
export function registerIncident(s,fields,now=Date.now()){
  const title=String(fields.title??'').trim(),description=String(fields.description??'').trim();
  if(title.length<3||title.length>100||description.length<10||description.length>1400)return false;
  const incident={id:id(),title,description,severity:['Baixa','Média','Alta'].includes(fields.severity)?fields.severity:'Média',
   pointName:currentCheckpoint(s)?.name??'Retorno à base',at:now,status:'Aberta',location:s.lastFix};
  s.incidents.push(incident);alert(s,'incident',`Ocorrência: ${title}`,now,{incidentId:incident.id});
  note(s,'incident',`Ocorrência registrada: ${title}`,now,{incidentId:incident.id});return incident;
}
export function acknowledge(s,notificationId,now=Date.now()){
  const n=s.notifications.find(n=>n.id===notificationId);if(!n)return false;
  n.seenAt=now;note(s,'ack','Supervisor registrou análise do evento',now);return true;
}
export function finishSession(s,now=Date.now()){
  if(s.status!=='active'||s.index!==s.route.points.length||!s.returnConfirmed||hasBlock(s))return false;
  s.status='completed';s.finishedAt=now;note(s,'finish','Ronda concluída e retorno registrado',now);return true;
}
export function offsetRouteNear(lat,lng){
  const route=clone(DEMO_ROUTE),dy=lat-route.base.lat,dx=lng-route.base.lng;
  route.name='Rota de teste · GPS do aparelho';route.unit='Área de teste · pontos ilustrativos';
  route.base.lat+=dy;route.base.lng+=dx;
  route.points.forEach(p=>{p.lat+=dy;p.lng+=dx;});
  route.legs?.forEach(leg=>leg.forEach(p=>{p.lat+=dy;p.lng+=dx;}));
  return route;
}