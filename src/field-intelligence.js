/**
 * Ronda Pro · regras determinísticas de qualidade GPS, métricas e alertas.
 * Nunca classificar falta de evidência como infração do colaborador.
 */
export const ALERT_PRESETS = Object.freeze([
 {id:'incident',title:'Ocorrência operacional',trigger:'manual',priority:'high',enabled:true,recipients:['supervisor'],cooldownMin:0},
 {id:'irregularity',title:'Irregularidade no posto',trigger:'manual',priority:'medium',enabled:true,recipients:['supervisor'],cooldownMin:0},
 {id:'support',title:'Solicitação de apoio',trigger:'manual',priority:'high',enabled:true,recipients:['supervisor','operations'],cooldownMin:0},
 {id:'gps_unreliable',title:'Localização sem precisão suficiente',trigger:'automatic',priority:'medium',enabled:true,recipients:['operations'],cooldownMin:30,thresholdMin:3},
 {id:'gps_disabled',title:'GPS desativado ou acesso revogado',trigger:'automatic',priority:'high',enabled:true,recipients:['operations'],cooldownMin:20},
 {id:'patrol_interrupted',title:'Ronda interrompida',trigger:'automatic',priority:'high',enabled:true,recipients:['supervisor'],cooldownMin:10,thresholdMin:10},
 {id:'patrol_late',title:'Ronda em atraso',trigger:'automatic',priority:'medium',enabled:true,recipients:['supervisor'],cooldownMin:30,thresholdMin:10},
 {id:'checkpoint_pending',title:'Ponto de ronda pendente',trigger:'automatic',priority:'medium',enabled:true,recipients:['supervisor'],cooldownMin:30},
 {id:'patrol_completed',title:'Ronda concluída',trigger:'automatic',priority:'low',enabled:false,recipients:['supervisor'],cooldownMin:0}
]);
const finite = Number.isFinite;
export const metersBetween=(a,b)=>{
 if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(finite))return 0;
 const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lng-a.lng)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
};
/** Resultado explicável: sem sinal confiável não se cria desvio disciplinar. */
export function assessGps(fix,{now=Date.now(),maxAgeMs=15000,maxAccuracyM=25,corridorDistanceM=null,corridorWidthM=30}={}){
 if(!fix||![fix.lat,fix.lng,fix.at,fix.accuracy].every(finite)||Math.abs(fix.lat)>90||Math.abs(fix.lng)>180||fix.accuracy<0)
  return {quality:'invalid',deviation:'unknown',reason:'amostra inválida'};
 if(fix.at>now+2000||now-fix.at>maxAgeMs)return {quality:'stale',deviation:'unknown',reason:'amostra antiga'};
 if(fix.accuracy>maxAccuracyM)return {quality:'low',deviation:'unknown',reason:'precisão insuficiente'};
 if(!finite(corridorDistanceM))return {quality:'good',deviation:'unknown',reason:'corredor não verificado'};
 const lowerBound=Math.max(0,corridorDistanceM-fix.accuracy);
 return {quality:'good',deviation:lowerBound>corridorWidthM?'suspected': 'not-confirmed',
  reason:lowerBound>corridorWidthM?'fora do corredor mesmo considerando erro GPS':'posição dentro da margem de incerteza',
  marginM:Math.round(lowerBound)};
}
export function addTrackSample(track=[],fix,{maxSpeedKmh=30,maxGapMs=120000,minMoveM=3}={}){
 if(!fix||![fix.lat,fix.lng,fix.at,fix.accuracy].every(finite))return {track,distanceM:0,accepted:false,reason:'invalid'};
 const next=[...track],prev=next.at(-1);
 if(prev&&fix.at<=prev.at)return {track,distanceM:0,accepted:false,reason:'out-of-order'};
 if(fix.accuracy>25)return {track,distanceM:0,accepted:false,reason:'low-accuracy'};
 const delta=prev?fix.at-prev.at:0,dist=prev?metersBetween(prev,fix):0;
 if(prev&&delta>maxGapMs)return {track:[...next,{...fix,segmentStart:true}],distanceM:0,accepted:true,reason:'gap'};
 if(prev&&dist>minMoveM&&delta>0&&dist/(delta/1000)*3.6>maxSpeedKmh)
  return {track,distanceM:0,accepted:false,reason:'speed-outlier'};
 next.push({lat:fix.lat,lng:fix.lng,at:fix.at,accuracy:fix.accuracy});
 return {track:next,distanceM:prev&&dist>=minMoveM?dist:0,accepted:true,reason:'ok'};
}
export function summarizePatrol(s,events=[]){
 const timeline=(s.timeline??[]),track=events.filter(e=>e.kind==='gps'&&e.payload?.sessionId===s.id)
   .map(e=>({...e.payload.position,at:e.at})).sort((a,b)=>a.at-b.at);
 let accepted=[],meters=0,discarded=0;
 for(const fix of track){const r=addTrackSample(accepted,fix);accepted=r.track;meters+=r.distanceM;if(!r.accepted)discarded++;}
 const total=s.route?.points?.length??0;
 return {id:s.id,worker:s.name,route:s.route?.name??'',start:s.startedAt,end:s.finishedAt??null,
  status:s.status,km:Math.round(meters/10)/100,
  minutes:Math.max(0,Math.round(((s.finishedAt??Date.now())-s.startedAt)/60000)),
  points:total,completed:s.checkpoints?.filter(p=>p.completedAt).length??0,
  incidents:s.incidents?.length??0,alerts:s.notifications?.length??0,
  panic:events.filter(e=>e.kind==='panic'&&e.payload?.sessionId===s.id).length,
  gpsSamples:track.length,gpsIgnored:discarded,accuracyDisclaimer:track.length?'Somente amostras válidas deste dispositivo':'Trajeto sem evidências de GPS'};
}
export function comparePatrols(sessions=[],events=[]){
 const rows=sessions.map(s=>summarizePatrol(s,events)),completed=rows.filter(r=>r.status==='completed');
 const totalKm=Math.round(rows.reduce((n,r)=>n+r.km,0)*100)/100;
 const totalMinutes=rows.reduce((n,r)=>n+r.minutes,0);
 const ratio=rows.length?Math.round(100*completed.length/rows.length):null;
 const insights=[
  {kind:'coverage',title:'Conclusão das rondas',value:ratio===null?'Sem dados':ratio+'%',detail:completed.length+'/'+rows.length+' concluídas'},
  {kind:'distance',title:'Distância registrada',value:totalKm+' km',detail:'GPS confiável, sem saltos ou períodos sem amostragem'},
  {kind:'attention',title:'Ocorrências a tratar',value:sessions.flatMap(s=>s.incidents??[]).filter(i=>i.status!=='Resolvida').length,detail:'Não pressupõe culpa ou desempenho individual'},
  {kind:'panic',title:'Acionamentos de pânico',value:events.filter(e=>e.kind==='panic').length,detail:'Contagem factual de registros, não indicador de produtividade'}
 ];
 return {rows,insights,totalKm,totalMinutes,ratio};
}
export function validateAlertTemplate(template){
 if(!template||typeof template!=='object')return false;
 if(!['manual','automatic'].includes(template.trigger)||!['low','medium','high'].includes(template.priority))return false;
 if(typeof template.title!=='string'||template.title.trim().length<3||template.title.length>120)return false;
 if(!Array.isArray(template.recipients)||!template.recipients.every(s=>typeof s==='string'&&s.length<120))return false;
 return Number.isFinite(template.cooldownMin)&&template.cooldownMin>=0&&template.cooldownMin<=10080;
}
