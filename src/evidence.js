/** Demonstração local da etapa R4. Não captura imagens nem lê sensores reais. */
export const EVIDENCE_DIRECTIONS=Object.freeze([
 {id:'front',label:'Frente'}, {id:'right',label:'Direita'},
 {id:'back',label:'Trás'}, {id:'left',label:'Esquerda'},
 {id:'selfie',label:'Selfie'}
]);
export function getPointEvidence(session,index){
 const id=session?.checkpoints?.[index]?.id;
 return id?session.evidences?.[id]??null:null;
}
export function evidenceProgress(record){
 const captured=EVIDENCE_DIRECTIONS.filter(x=>record?.captures?.[x.id]?.mode==='simulated').length;
 return {captured,total:EVIDENCE_DIRECTIONS.length,rotated:record?.motion?.mode==='simulated',confirmed:!!record?.confirmedAt};
}
function recordFor(session,index){
 if(!session||session.mode!=='simulation'||session.status!=='active'||session.index!==index)return null;
 const point=session.checkpoints?.[index];if(!point)return null;
 session.evidences??={};
 return session.evidences[point.id]??=( {
  checkpointId:point.id,mode:'simulated',captures:{},motion:null,createdAt:Date.now(),confirmedAt:null
 });
}
export function simulateCapture(session,index,direction,now=Date.now()){
 if(!EVIDENCE_DIRECTIONS.some(x=>x.id===direction))return false;
 const evidence=recordFor(session,index);
 if(!evidence||evidence.confirmedAt)return false;
 evidence.captures[direction]={mode:'simulated',at:now,mediaRef:null};
 return true;
}
export function simulateRotation(session,index,now=Date.now()){
 const evidence=recordFor(session,index);
 if(!evidence||evidence.confirmedAt)return false;
 evidence.motion={mode:'simulated',at:now,sensorReading:false,angleDegrees:null};
 return true;
}
export function confirmDemoEvidence(session,index,now=Date.now()){
 const evidence=recordFor(session,index);
 if(!evidence||evidence.confirmedAt)return false;
 const status=evidenceProgress(evidence);
 if(status.captured!==status.total||!status.rotated)return false;
 evidence.confirmedAt=now;
 session.timeline??=[];
 session.timeline.unshift({id:'evidence-demo-'+evidence.checkpointId+'-'+now,kind:'evidence-demo',at:now,
  label:'Verificação demonstrativa registrada (sem fotos nem sensor real)',pointId:evidence.checkpointId});
 return true;
}
