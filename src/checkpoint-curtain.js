/**
 * Cortina de checagem do ponto. Não bloqueia controles do Android ou chamadas reais;
 * somente impede a navegação dentro da experiência de ronda até registrar a visita.
 */
import {canCompletePoint,completePoint,currentCheckpoint,requiredDwellMs} from './domain.js';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCheckpointCurtain(api){
 let key=null,root=null,torchStream=null,torchTrack=null;
 const closeTorch=()=>{torchStream?.getTracks().forEach(t=>t.stop());torchStream=null;torchTrack=null};
 function close(){root?.remove();root=null;key=null;closeTorch()}
 const status=()=>{
  if(!root)return;
  const s=api.get().session,point=s&&currentCheckpoint(s);
  if(!s||s.status!=='active'||!point||key!==s.id+':'+s.index){close();return}
  const elapsed=Math.round(s.checkpoints[s.index].dwellMs/1000),target=Math.round(requiredDwellMs(s)/1000);
  root.querySelector('[data-dwell-seconds]').textContent=String(Math.min(target,elapsed)).padStart(2,'0');
  root.querySelector('[data-dwell-message]').textContent=s.insideSince==null
    ?'GPS fora do raio ou impreciso. A validação está suspensa.'
    :elapsed<target?'Permaneça no ponto. O tempo depende de GPS confiável.':'Tempo cumprido. Descreva o ponto e registre.';
  const button=root.querySelector('[data-curtain-submit]');
  button.disabled=!canCompletePoint(s)||root.querySelector('textarea').value.trim().length<10;
 };
 function open(){
  const state=api.get(),s=state.session,p=s&&currentCheckpoint(s);
  if(state.view!=='minha-ronda'||state.user?.role!=='ronda'||s?.status!=='active'||s.mode!=='real'||!p||s.insideSince==null){status();return}
  const next=s.id+':'+s.index;if(root&&key===next){status();return}
  close();key=next;root=document.createElement('section');
  root.className='checkpoint-curtain';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Conferência obrigatória do ponto de ronda');
  root.innerHTML='<div class="checkpoint-curtain-shade"></div><div class="checkpoint-curtain-panel">'+
   '<div class="checkpoint-curtain-eyebrow">✓ CHEGADA CONFIRMADA · PONTO '+(s.index+1)+'</div>'+
   '<h2>'+safe(p.name)+'</h2><p>'+safe(p.instruction||'Verifique as condições do local.')+'</p>'+
   '<div class="checkpoint-stopwatch"><strong><span data-dwell-seconds>00</span> s</strong><small data-dwell-message>Verificando permanência…</small></div>'+
   '<div class="checkpoint-tools"><label>📷 Foto<input type="file" accept="image/*" capture="environment" data-point-photo></label>'+
   '<label>🎥 Vídeo<input type="file" accept="video/*" capture="environment" data-point-video></label>'+
   '<button type="button" data-curtain-torch>🔦 Lanterna</button>'+
   '<button type="button" class="checkpoint-panic" data-ops="panic-confirm">⚠ PÂNICO</button></div>'+
   '<label class="checkpoint-note">Observações obrigatórias<textarea required maxlength="1400" minlength="10" placeholder="Como está este ponto? Descreva as condições e eventuais problemas." data-checkpoint-observation></textarea></label>'+
   '<button class="checkpoint-submit" data-curtain-submit disabled>Enviar registro e continuar a ronda</button>'+
   '<small class="checkpoint-footnote">As observações, evidências e horário são registrados no dispositivo. A entrega remota exige sessão operacional autenticada.</small>'+
   '</div>';
  document.body.append(root);root.querySelector('textarea').addEventListener('input',status);
  root.querySelector('[data-curtain-torch]').addEventListener('click',toggleTorch);
  root.querySelector('[data-curtain-submit]').addEventListener('click',submit);
  status();root.querySelector('textarea').focus({preventScroll:true});
 }
 async function toggleTorch(){
  const el=root?.querySelector('[data-curtain-torch]');if(!el)return;
  if(torchTrack){try{await torchTrack.applyConstraints({advanced:[{torch:false}]})}catch{}closeTorch();el.textContent='🔦 Lanterna';return}
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Indisponível');
   torchStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
   torchTrack=torchStream.getVideoTracks()[0];
   const support=torchTrack.getCapabilities?.();
   if(!support?.torch)throw Error('Sem lanterna controlável no navegador');
   await torchTrack.applyConstraints({advanced:[{torch:true}]});
   el.textContent='🔦 Desligar lanterna';
  }catch(e){closeTorch();api.notify('Lanterna indisponível neste aparelho ou navegador.')}
 }
 async function submit(){
  const {session:s,locationFix}=api.get(),p=currentCheckpoint(s),checkpoint=s?.checkpoints[s.index];
  if(!p||!canCompletePoint(s)){status();api.notify('Aguarde a permanência com GPS confiável.');return}
  const observation=root.querySelector('textarea')?.value.trim()||'';
  if(observation.length<10){api.notify('Descreva o estado do ponto com pelo menos 10 caracteres.');return}
  const files=[root.querySelector('[data-point-photo]')?.files?.[0],root.querySelector('[data-point-video]')?.files?.[0]].filter(Boolean);
  checkpoint.observation=observation;checkpoint.observedAt=Date.now();
  checkpoint.position=locationFix?{lat:locationFix.lat,lng:locationFix.lng,accuracy:locationFix.accuracy,at:locationFix.at}:null;
  await api.recordCheckpoint(checkpoint,files,p);
  if(!completePoint(s,Date.now())){api.notify('A localização mudou. Não foi possível concluir o ponto.');status();return}
  api.save();close();api.render();api.notify('Ponto e observações registrados.');
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closeTorch()});
 return {open,close,status};
}
