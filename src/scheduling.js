/** Agenda de avaliação: dados fictícios persistidos somente neste navegador. */
import {DEMO_ROUTE} from './domain.js';

export const DEMO_WATCHERS=Object.freeze([
 {id:'v01',name:'Lucas Ferreira',unit:'Unidade Centro'},
 {id:'v02',name:'Ana Beatriz',unit:'Unidade Centro'},
 {id:'v03',name:'Rafael Costa',unit:'Unidade Centro'},
 {id:'v04',name:'Mariana Alves',unit:'Unidade Centro'},
 {id:'v05',name:'Paulo Henrique',unit:'Unidade Norte'},
 {id:'v06',name:'Camila Rocha',unit:'Unidade Norte'},
 {id:'v07',name:'André Martins',unit:'Unidade Norte'},
 {id:'v08',name:'Fernanda Lima',unit:'Unidade Norte'},
 {id:'v09',name:'Bruno Souza',unit:'Unidade Industrial'},
 {id:'v10',name:'Patrícia Gomes',unit:'Unidade Industrial'},
 {id:'v11',name:'Diego Oliveira',unit:'Unidade Industrial'},
 {id:'v12',name:'Letícia Santos',unit:'Unidade Industrial'}
]);
export const DEMO_ROUTES=Object.freeze([
 {id:'centro',name:'Rota Centro · Perímetro',unit:'Unidade Centro'},
 {id:'norte',name:'Rota Norte · Verificação',unit:'Unidade Norte'},
 {id:'industrial',name:'Rota Industrial · Setores',unit:'Unidade Industrial'}
]);
export function routeForProgram(program){
 const reference=DEMO_ROUTES.find(r=>r.id===program?.routeId)??DEMO_ROUTES[0];
 return {...structuredClone(DEMO_ROUTE),id:reference.id,name:reference.name,unit:reference.unit+' · cenário fictício'};
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
    status:'scheduled',createdAt:now};
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
