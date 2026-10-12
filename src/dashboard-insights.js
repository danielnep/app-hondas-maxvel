/** MAXVEL-04 — análise local, determinística e sem avaliações individuais de desempenho.
 * Fonte de verdade nesta demonstração: registros presentes neste navegador.
 */
import {scheduleStatus} from './scheduling.js';

const numeric=n=>Number.isFinite(n)?n:0;
export function dashboardSnapshot({sessions=[],programs=[],watchers=[],now=Date.now()}={}){
 const validSessions=sessions.filter(s=>s&&Array.isArray(s.checkpoints));
 const active=validSessions.filter(s=>s.status==='active'),completed=validSessions.filter(s=>s.status==='completed');
 const deviations=validSessions.flatMap(s=>(s.deviations??[]).map(d=>({...d,sessionId:s.id,watcherId:s.watcherId})));
 const incidents=validSessions.flatMap(s=>(s.incidents??[]).map(i=>({...i,sessionId:s.id,watcherId:s.watcherId})));
 const notifications=validSessions.flatMap(s=>(s.notifications??[]).map(n=>({...n,sessionId:s.id})));
 const pending=notifications.filter(n=>!n.seenAt);
 const late=programs.filter(p=>scheduleStatus(p,validSessions,now)==='atrasada');
 const scheduled=programs.filter(p=>scheduleStatus(p,validSessions,now)==='programada');
 const unresolved=deviations.filter(d=>!d.justification||!d.returnedAt);
 const openIncidents=incidents.filter(i=>i.status!=='Resolvida');
 const completionRatio=validSessions.length?Math.round(completed.length/validSessions.length*100):null;
 const roster=watchers.map(w=>{
  const theirs=validSessions.filter(s=>s.watcherId===w.id||(!s.watcherId&&s.name===w.name));
  return {id:w.id,name:w.name,unit:w.unit,total:theirs.length,
   active:theirs.filter(s=>s.status==='active').length,
   completed:theirs.filter(s=>s.status==='completed').length,
   deviations:theirs.reduce((n,s)=>n+(s.deviations?.length??0),0),
   incidents:theirs.reduce((n,s)=>n+(s.incidents?.length??0),0)};
 });
 return {total:validSessions.length,active:active.length,completed:completed.length,
  deviations:deviations.length,incidents:incidents.length,pending:pending.length,
  overdue:late.length,scheduled:scheduled.length,unresolved:unresolved.length,
  openIncidents:openIncidents.length,completionRatio,roster,
  insights:[
   {id:'alerts',type:pending.length?'attention':'ok',label:'Alertas para avaliação',
    value:pending.length,detail:pending.length?`${pending.length} aviso(s) ainda não analisado(s).`:'Nenhum aviso pendente neste navegador.',
    target:'notificacoes'},
   {id:'overdue',type:late.length?'attention':'ok',label:'Rondas fora do horário',
    value:late.length,detail:late.length?`${late.length} programação(ões) ultrapassaram o término sem conclusão registrada.`:'Nenhuma programação atrasada nos dados disponíveis.',
    target:'rondas'},
   {id:'returns',type:unresolved.length?'attention':'ok',label:'Desvios pendentes de retorno',
    value:unresolved.length,detail:unresolved.length?`${unresolved.length} desvio(s) ainda requer(em) justificativa ou retorno.`:'Nenhum desvio pendente de retorno nos registros.',
    target:'notificacoes'},
   {id:'completion',type:'neutral',label:'Execuções concluídas',
    value:completionRatio===null?'—':completionRatio+'%',
    detail:completionRatio===null?'Ainda não há execuções para calcular a proporção.':`${completed.length} de ${validSessions.length} execução(ões) registradas foram concluídas.`,
    target:'relatorios'},
   {id:'incidents',type:openIncidents.length?'attention':'ok',label:'Ocorrências em aberto',
    value:openIncidents.length,detail:openIncidents.length?`${openIncidents.length} ocorrência(s) ainda não estão marcadas como resolvidas.`:'Nenhuma ocorrência em aberto nos registros.',
    target:'ocorrencias'}
  ]
 };
}
