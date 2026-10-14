/**
 * Cortina de checagem do ponto. Não bloqueia controles do Android ou chamadas reais;
 * somente impede a navegação dentro da experiência de ronda até registrar a visita.
 */
import {canCompletePoint,completePoint,currentCheckpoint,requiredDwellMs} from './domain.js';
import {evidenceButtons,createMediaCapture} from './media-capture.js';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCheckpointCurtain(api){
 let key=null,root=null,torchStream=null,torchTrack=null,saving=false,evidenceFiles=[];
 const mediaCapture=createMediaCapture({notify:api.notify});
 const closeTorch=()=>{torchStream?.getTracks().forEach(t=>t.stop());torchStream=null;torchTrack=null};
 function close(){document.body.classList.remove('checkpoint-arrived');root?.remove();root=null;key=null;saving=false;evidenceFiles=[];mediaCapture.stopAll();closeTorch()}
 const status=()=>{
  if(!root)return;
  const s=api.get().session,point=s&&currentCheckpoint(s);
  if(!s||s.status!=='active'||!point||key!==s.id+':'+s.index){close();return}
  const elapsed=Math.round(s.checkpoints[s.index].dwellMs/1000),target=Math.round(requiredDwellMs(s)/1000);
  const remain=Math.max(0,target-elapsed);
  root.querySelector('[data-dwell-seconds]').textContent=String(remain).padStart(2,'0');
  root.querySelector('[data-dwell-seconds]').parentElement?.setAttribute('aria-label',remain+' segundos restantes');
  root.querySelector('[data-curtain-observation-wrap]').hidden=remain>0;
  root.querySelector('[data-curtain-observation-wrap]').setAttribute('aria-hidden',String(remain>0));
  root.querySelector('[data-dwell-message]').textContent=s.insideSince==null
    ?'GPS fora do raio ou impreciso. A validação está suspensa.'
    :elapsed<target?'Aguarde e observe o ambiente para registrar as condições deste ponto.':'Tempo concluído. Informe as condições verificadas para prosseguir.';
  const button=root.querySelector('[data-curtain-submit]');
  const concern=root.querySelector('[name="point-state"]:checked')?.value==='attention';
  const observation=root.querySelector('textarea').value.trim();
  const noteReady=concern?observation.length>=10:true;
  button.disabled=saving||!canCompletePoint(s)||!noteReady;
  root.querySelector('textarea').required=Boolean(concern);
  root.querySelector('textarea').minLength=concern?10:0;
  root.querySelector('[data-curtain-note-hint]').textContent=concern?'Descreva o que aconteceu. Obrigatório, mínimo de 10 caracteres.':'Observações complementares (opcionais).';
 };
 function open(){
  const state=api.get(),s=state.session,p=s&&currentCheckpoint(s);
  if(state.view!=='minha-ronda'||state.user?.role!=='ronda'||s?.status!=='active'||!p||s.insideSince==null){status();return}
  const next=s.id+':'+s.index;if(root&&key===next){status();return}
  close();key=next;document.body.classList.add('checkpoint-arrived');root=document.createElement('section');
  root.className='checkpoint-curtain';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Conferência obrigatória do ponto de ronda');
  root.innerHTML='<div class="checkpoint-curtain-shade"></div><div class="checkpoint-curtain-panel">'+
   '<div class="checkpoint-curtain-eyebrow">✓ CHEGADA CONFIRMADA · PONTO '+(s.index+1)+'</div>'+
   '<h2>'+safe(p.name)+'</h2><p>'+safe(p.instruction||'Verifique as condições do local.')+'</p>'+
   '<div class="checkpoint-stopwatch" aria-live="polite"><strong><span data-dwell-seconds>00</span><small> s</small></strong><small data-dwell-message>Aguarde e observe o ambiente antes de preencher a verificação.</small></div>'+
   '<div class="checkpoint-tools">'+evidenceButtons()+
   '<button type="button" data-curtain-torch>🔦 Lanterna</button>'+
   '<button type="button" class="checkpoint-panic" data-ops="panic-confirm">⚠ PÂNICO</button></div>'+
   '<fieldset class="checkpoint-condition" data-curtain-observation-wrap hidden><legend>Condições encontradas neste ponto</legend>'+
   '<label><input type="radio" name="point-state" value="ok" checked> Tudo dentro do esperado</label>'+
   '<label><input type="radio" name="point-state" value="attention"> Situação que exige atenção</label>'+
   '<label class="checkpoint-note"><span data-curtain-note-hint>Observações complementares (opcionais).</span><textarea maxlength="1400" placeholder="Descreva as condições do ponto e, se necessário, informe o que encontrou." data-checkpoint-observation></textarea></label></fieldset>'+
   '<button class="checkpoint-submit" data-curtain-submit disabled>Finalizar ponto e seguir para o próximo</button>'+
   '<small class="checkpoint-footnote">As observações, evidências e horário são registrados no dispositivo. A entrega remota exige sessão operacional autenticada.</small>'+
   '</div>';
  document.body.append(root);root.querySelector('textarea').addEventListener('input',status);root.querySelectorAll('[name="point-state"]').forEach(input=>input.addEventListener('change',status));
  root.querySelector('[data-curtain-torch]').addEventListener('click',toggleTorch);
  root.querySelector('[data-curtain-submit]').addEventListener('click',submit);
  root.addEventListener('click',async event=>{
   const button=event.target.closest('[data-evidence-kind],[data-evidence-remove]');
   if(!button)return;
   event.preventDefault();event.stopPropagation();
   if(button.hasAttribute('data-evidence-remove')){
    const index=Number(button.dataset.evidenceRemove);
    if(Number.isInteger(index))evidenceFiles.splice(index,1);
   }else try{
    const file=await mediaCapture.request(button.dataset.evidenceKind);
    if(!root?.isConnected)return;
    if(evidenceFiles.length>=3){api.notify('Limite de três evidências por ponto.');return}
    evidenceFiles.push(file);
   }catch(error){if(!/cancelad|Nenhuma evidência/i.test(error.message))api.notify(error.message);}
   const list=root?.querySelector('[data-evidence-attachments]');
   if(list)list.innerHTML=evidenceFiles.length
    ?evidenceFiles.map((file,i)=>'<span class="attached-file">'+safe(file.name)+' <button type="button" data-evidence-remove="'+i+'" aria-label="Remover evidência">×</button></span>').join('')
    :'Nenhuma evidência anexada.';
  });
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
  const attention=root.querySelector('[name="point-state"]:checked')?.value==='attention';
  const note=root.querySelector('textarea')?.value.trim()||'';
  if(attention&&note.length<10){api.notify('Descreva a situação que exige atenção com pelo menos 10 caracteres.');return}
  const observation=attention?'Atenção no ponto: '+note:note?'Tudo dentro do esperado. '+note:'Tudo dentro do esperado, sem anormalidades.';
  if(saving)return;saving=true;status();
  const files=[...evidenceFiles];
  checkpoint.observation=observation;checkpoint.observedAt=Date.now();
  checkpoint.position=locationFix?{lat:locationFix.lat,lng:locationFix.lng,accuracy:locationFix.accuracy,at:locationFix.at}:null;
  try{
   if(!completePoint(s,Date.now())){saving=false;api.notify('A localização mudou. Não foi possível concluir o ponto.');status();return}
   checkpoint.condition=attention?'attention':'ok';
   await api.recordCheckpoint(checkpoint,files,p);
   api.save();close();api.render();
   api.notify(currentCheckpoint(s)?'Ponto registrado. Siga para o próximo ponto.':'Todos os pontos registrados. Retorne à base.');
  }catch(err){
   saving=false;api.save();status();
   api.notify('Falha ao armazenar a verificação. Confira o histórico antes de prosseguir.');
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closeTorch()});
 return {open,close,status};
}
