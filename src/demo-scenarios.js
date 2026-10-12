/** Quatro exemplos exclusivamente fictícios para apresentação de supervisão. */
import {createSession} from './domain.js';
import {DEMO_WATCHERS,routeForWatcher} from './scheduling.js';

const prefix='rev3-fixture-';
export function withExampleRondas(existing,now=Date.now()){
 if(!Array.isArray(existing)||existing.some(s=>String(s?.id).startsWith(prefix)))return existing;
 const scenarios=[];
 for(let i=0;i<DEMO_WATCHERS.length;i++){
  const w=DEMO_WATCHERS[i],route=routeForWatcher(w.id);
  const s=createSession(w.name,route,now-(i+1)*400000,'simulation');
  s.id=prefix+w.id;
  s.watcherId=w.id;
  s.timeline=[{id:prefix+'start-'+w.id,kind:'start',at:s.startedAt,label:'Ronda fictícia iniciada'}];
  if(i===0){
   s.index=1;s.checkpoints[0].completedAt=s.startedAt+60000;s.checkpoints[0].dwellMs=30000;
   s.lastFix={lat:route.points[1].lat,lng:route.points[1].lng,accuracy:5,at:now-40000};
   s.timeline.unshift({id:prefix+'checkpoint-v01',kind:'checkpoint',at:now-55000,label:'Primeiro ponto validado'});
  }else if(i===1){
   s.index=route.points.length;s.status='completed';s.returnConfirmed=true;s.finishedAt=now-90000;
   s.checkpoints.forEach((point,index)=>{point.completedAt=s.startedAt+(index+1)*60000;point.dwellMs=30000});
   s.timeline.unshift({id:prefix+'finish-v02',kind:'finish',at:s.finishedAt,label:'Ronda fictícia concluída'});
  }else if(i===2){
   const point=route.points[0],at=now-65000;
   s.deviations=[{id:prefix+'deviation',at,pointId:point.id,pointName:point.name,
    reason:'Desvio ilustrativo de rota',distance:64,
    position:{lat:point.lat+.00052,lng:point.lng+.00071},
    justification:'Desvio de demonstração para vistoria de iluminação.',
    justifiedAt:at+4000,returnedAt:null}];
   s.notifications=[{id:prefix+'notice-v03',kind:'deviation',at,label:'Desvio: justificativa para análise',
    seenAt:null,sessionId:s.id,deviationId:s.deviations[0].id,
    justification:s.deviations[0].justification}];
   s.timeline.unshift({id:prefix+'timeline-v03',kind:'deviation',at,label:'Desvio fictício registrado'});
  }else{
   const point=route.points[1],at=now-25000;
   s.index=1;s.checkpoints[0].completedAt=s.startedAt+60000;s.checkpoints[0].dwellMs=30000;
   s.incidents=[{id:prefix+'incident',title:'Iluminação do acesso apagada',
    description:'Exemplo fictício: foi observada uma falha na iluminação da passagem e solicitada conferência.',
    pointName:point.name,severity:'Média',status:'Aberta',at,location:{lat:point.lat,lng:point.lng}}];
   s.notifications=[{id:prefix+'notice-v04',kind:'incident',label:'Ocorrência: iluminação',
    seenAt:null,at,sessionId:s.id,incidentId:s.incidents[0].id}];
   s.timeline.unshift({id:prefix+'timeline-v04',kind:'incident',at,label:'Ocorrência fictícia registrada'});
  }
  scenarios.push(s);
 }
 return [...scenarios,...existing];
}
