/** Agenda de avaliação: dados fictícios persistidos somente neste navegador. */
import {DEMO_ROUTE} from './domain.js';

export const DEMO_WATCHERS=Object.freeze([
 {id:'v01',name:'Lucas Ferreira',unit:'Unidade Centro'},
 {id:'v02',name:'Ana Beatriz',unit:'Unidade Centro'},
 {id:'v03',name:'Rafael Costa',unit:'Unidade Centro'},
 {id:'v04',name:'Mariana Alves',unit:'Unidade Centro'}
]);
export const DEMO_ROUTES=Object.freeze([
 {id:'centro',name:'Rota Centro · Perímetro',unit:'Unidade Centro'},
 {id:'norte',name:'Rota Norte · Verificação',unit:'Unidade Norte'},
 {id:'industrial',name:'Rota Industrial · Setores',unit:'Unidade Industrial'}
]);
/** Rotas por colaborador no cenário. Geometrias distintas, base e corredores consistentes.
 * Nunca altera sessions.route de execuções já persistidas. Não são locais reais da Maxvel. */
export function routeForWatcher(watcherId,routeId){
 const watcher=watcherById(watcherId)??DEMO_WATCHERS[0];
 const idx=DEMO_WATCHERS.findIndex(w=>w.id===watcher.id);
 const reference=DEMO_ROUTES.find(r=>r.id===routeId&&r.unit===watcher.unit)
   ??DEMO_ROUTES.find(r=>r.unit===watcher.unit)??DEMO_ROUTES[0];
 const group=reference.id==='centro'?0:reference.id==='norte'?1:2;
 const anchor=[
  {lat:-20.14030,lng:-44.88400},
  {lat:-20.13630,lng:-44.88750},
  {lat:-20.14860,lng:-44.87190}
 ][group];
 const variant=idx%4;
 const base=structuredClone(DEMO_ROUTE);
 const angle=(variant*33+group*17)*Math.PI/180;
 const scale=27+(idx%3)*7; // cerca de quilômetros entre pontos; cenário fictício de deslocamento operacional
 const cos=Math.cos(angle),sin=Math.sin(angle);
 const latitudeScale=Math.cos(base.base.lat*Math.PI/180);
 const spread=variant*0.00064,shift=group*0.00014;
 const center={lat:anchor.lat+spread+shift,lng:anchor.lng+(variant%2)*0.00081+shift};
 const transform=p=>{
  const y=(p.lat-DEMO_ROUTE.base.lat)*111320;
  const x=(p.lng-DEMO_ROUTE.base.lng)*111320*latitudeScale;
  return {...p,lat:center.lat+(y*cos-x*sin)*scale/111320,
   lng:center.lng+(x*cos+y*sin)*scale/(111320*latitudeScale)};
 };
 return {...base,id:reference.id+'-'+watcher.id,
  name:reference.name+' · '+watcher.name,
  unit:watcher.unit+' · cenário fictício',watcherId:watcher.id,
  base:transform(base.base),
  points:base.points.map(transform),
  legs:base.legs.map(leg=>leg.map(transform))};
}
export function routeForProgram(program){
 const generated=routeForWatcher(program?.watcherId,program?.routeId);
 const custom=program?.customRoute;
 if(!custom||!Array.isArray(custom.points)||!custom.points.length)return generated;
 const valid=custom.points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
 Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180).slice(0,8);
 if(!valid.length)return generated;
 const pts=valid.map((p,i)=>({id:'custom-'+(i+1),name:String(p.name||'Ponto '+(i+1)).slice(0,70),
  instruction:'Permanecer no local durante a verificação.',lat:p.lat,lng:p.lng,radius:25}));
 const base={...generated.base,lat:pts[0].lat-.00025,lng:pts[0].lng-.00025};
 const nodes=[base,...pts,base];
 const legs=nodes.slice(0,-1).map((p,i)=>[{lat:(p.lat+nodes[i+1].lat)/2,lng:(p.lng+nodes[i+1].lng)/2}]);
 return {...generated,id:'personalizada-'+(program.id||program.watcherId),name:'Ronda personalizada · '+(watcherById(program.watcherId)?.name||'Vigia'),
  base,points:pts,legs,rules:{...(custom.rules||{})}};
}
export function demoSchedule(now=Date.now()){
 const today=new Date(now);today.setHours(0,0,0,0);
 const list=[];
 for(let offset=-1;offset<3;offset++){
  DEMO_WATCHERS.forEach((w,i)=>{
   const date=new Date(today);date.setDate(date.getDate()+offset);
   date.setHours([6,9,13,18][i%4],i%3*10,0,0);
   const routeId=DEMO_ROUTES.find(r=>r.unit===w.unit).id;
   list.push({id:'seed-'+offset+'-'+w.id,watcherId:w.id,routeId,
    startAt:date.getTime(),endAt:date.getTime()+45*60000,
    notes:'Escala ilustrativa; sem despacho remoto.',status:'scheduled',createdAt:today.getTime()});
  });
 }
 return list;
}
export const watcherById=id=>DEMO_WATCHERS.find(w=>w.id===id);
export const routeById=id=>DEMO_ROUTES.find(r=>r.id===id);
export function scheduleStatus(program,sessions=[],now=Date.now()){
 if(program.status==='cancelled')return 'cancelada';
 const actual=sessions.find(s=>s.programId===program.id);
 if(actual?.status==='completed')return 'concluída';
 if(actual?.status==='active')return 'em andamento';
 if(now>program.endAt)return 'atrasada';
 return 'programada';
}
export function programsForWatcher(programs,watcherId){
 return programs.filter(p=>p.watcherId===watcherId && p.status!=='cancelled').sort((a,b)=>a.startAt-b.startAt);
}
export function nextProgram(programs,watcherId,sessions=[],now=Date.now()){
 return programsForWatcher(programs,watcherId).find(p=>!sessions.some(s=>s.programId===p.id)&&p.endAt>=now)??null;
}
export function validateProgram(candidate,programs,now=Date.now()){
 const {watcherId,routeId}=candidate;
 const startAt=Number(candidate.startAt),endAt=Number(candidate.endAt);
 if(!watcherById(watcherId))return 'Selecione um vigia válido.';
 if(!routeById(routeId))return 'Selecione uma rota válida.';
 if(watcherById(watcherId).unit!==routeById(routeId).unit)return 'Escolha uma rota pertencente à unidade do vigia.';
 if(!Number.isFinite(startAt)||!Number.isFinite(endAt)||endAt<=startAt||endAt-startAt>12*3600000)return 'Informe início e término válidos (até 12 horas).';
 if(startAt<now-60000)return 'Escolha um horário atual ou futuro.';
 if(programs.some(p=>p.status!=='cancelled'&&p.watcherId===watcherId&&startAt<p.endAt&&endAt>p.startAt))
  return 'Este vigia já tem outra ronda programada nesse intervalo.';
 return null;
}
export function createPrograms(candidate,existing,now=Date.now()){
 const days=candidate.repeat==='daily7'?7:1,list=[...existing],created=[];
 for(let i=0;i<days;i++){
  const start=new Date(Number(candidate.startAt)),end=new Date(Number(candidate.endAt));
  start.setDate(start.getDate()+i);end.setDate(end.getDate()+i);
  const row={id:'program-'+now+'-'+i+'-'+Math.random().toString(36).slice(2,8),
    watcherId:candidate.watcherId,routeId:candidate.routeId,
    startAt:start.getTime(),endAt:end.getTime(),notes:String(candidate.notes??'').slice(0,240),
    status:'scheduled',createdAt:now,customRoute:candidate.customRoute
      ?JSON.parse(JSON.stringify(candidate.customRoute)):undefined};
  const error=validateProgram(row,list,now);
  if(error)return {ok:false,error,items:[]};
  list.push(row);created.push(row);
 }
 return {ok:true,items:created,error:null};
}
export function cancelProgram(programs,id){
 return programs.map(p=>p.id===id&&p.status==='scheduled'?{...p,status:'cancelled',cancelledAt:Date.now()}:p);
}
export function scheduleTotals(programs,sessions=[],now=Date.now()){
 return ['programada','em andamento','atrasada','concluída','cancelada'].reduce((a,s)=>(a[s]=programs.filter(p=>scheduleStatus(p,sessions,now)===s).length,a),{});
}


/** Consulta de agenda: filtros combináveis, sem depender do DOM e sem modificar os dados. */
const normalizeSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function filterPrograms(programs,{status='all',watcherId='all',unit='all',query='',sessions=[],now=Date.now()}={}){
 const needle=normalizeSearch(query);
 return programs.filter(p=>{
  const watcher=watcherById(p.watcherId),route=routeById(p.routeId);
  if(status!=='all'&&scheduleStatus(p,sessions,now)!==status)return false;
  if(watcherId!=='all'&&p.watcherId!==watcherId)return false;
  if(unit!=='all'&&watcher?.unit!==unit)return false;
  if(!needle)return true;
  return normalizeSearch([watcher?.name,watcher?.unit,route?.name,p.notes,p.id].join(' ')).includes(needle);
 }).sort((a,b)=>a.startAt-b.startAt||a.id.localeCompare(b.id));
}
/** Paginação estável da UI. O total nunca é truncado silenciosamente. */
export function pagePrograms(programs,page=0,pageSize=16){
 const size=Math.min(100,Math.max(1,Math.trunc(Number(pageSize))||16)),total=programs.length;
 const pages=Math.max(1,Math.ceil(total/size));
 const current=Math.min(pages-1,Math.max(0,Math.trunc(Number(page))||0));
 const start=current*size;
 return {items:programs.slice(start,start+size),page:current,pages,total,from:total?start+1:0,to:Math.min(total,start+size)};
}


/** Reprogramação local auditável. Não altera o histórico de uma execução existente. */
export function rescheduleProgram(programs,id,patch,now=Date.now()){
 const original=programs.find(p=>p.id===id);
 if(!original||original.status!=='scheduled')return {ok:false,error:'Esta programação não pode ser alterada.',items:programs};
 const candidate={...original,...patch,id:original.id,status:original.status,createdAt:original.createdAt};
 const error=validateProgram(candidate,programs.filter(p=>p.id!==id),now);
 if(error)return {ok:false,error,items:programs};
 const changes=[...(original.changes??[]),{at:now,previous:{watcherId:original.watcherId,routeId:original.routeId,startAt:original.startAt,endAt:original.endAt,notes:original.notes??''}}];
 const updated={...candidate,notes:String(candidate.notes??'').slice(0,240),changes,updatedAt:now};
 return {ok:true,error:null,updated,items:programs.map(p=>p.id===id?updated:p)};
}
