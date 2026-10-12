import {createSession} from './domain.js';
import {DEMO_WATCHERS,routeForWatcher} from './scheduling.js';

/** Apenas quatro cenas fictícias. Não são localização, monitoramento ou eventos reais. */
export function seedDemoSessions(existing=[]){
 if(existing.some(x=>x.demoScenario==='rev3-v01'))return existing;
 const t=Date.now(),scenes=[];
 for(const [i,w] of DEMO_WATCHERS.entries()){
  const s=createSession(w.name,routeForWatcher(w.id),t-(i+1)*1100000,'simulation');
  s.demoScenario='rev3-'+w.id;s.watcherId=w.id;
  if(i===0){
   s.index=1;s.checkpoints[0].completedAt=t-330000;
   s.timeline.unshift({id:'scenario-progress',at:t-60000,label:'Próximo ponto de verificação · demonstração'});
  }else if(i===1){
   s.status='completed';s.index=s.route.points.length;s.returnConfirmed=true;s.finishedAt=t-400000;
   s.checkpoints.forEach((p,j)=>p.completedAt=t-700000+j*45000);
   s.timeline.unshift({id:'scenario-finished',at:s.finishedAt,label:'Ronda concluída · demonstração'});
  }else if(i===2){
   s.index=2;s.checkpoints[0].completedAt=t-600000;s.checkpoints[1].completedAt=t-400000;
   s.deviations.push({id:'scenario-deviation',at:t-180000,pointId:s.route.points[2].id,
    pointName:s.route.points[2].name,distance:43,reason:'Saída ilustrativa do trajeto',
    justification:'Verificação complementar no acesso, exemplo fictício.',justifiedAt:t-90000,returnedAt:null});
   s.notifications.push({id:'scenario-alert',kind:'deviation',label:'Desvio com justificativa',
    at:t-180000,seenAt:null,sessionId:s.id,deviationId:'scenario-deviation',
    justification:s.deviations[0].justification});
  }else{
   s.incidents.push({id:'scenario-incident',title:'Iluminação irregular',
    description:'Luminária oscilando em um acesso, ocorrência inteiramente fictícia.',
    pointName:s.route.points[0].name,severity:'Média',at:t-210000,status:'Aberta'});
   s.notifications.push({id:'scenario-notification',kind:'incident',label:'Ocorrência: iluminação',
    at:t-210000,seenAt:null,sessionId:s.id,incidentId:'scenario-incident'});
  }
  scenes.push(s);
 }
 return [...scenes,...existing];
}
