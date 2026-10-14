/**
 * Cortina de checagem do ponto. Não bloqueia controles do Android ou chamadas reais;
 * somente impede a navegação dentro da experiência de ronda até registrar a visita.
 */
import {canCompletePoint,completePoint,currentCheckpoint,requiredDwellMs,hasBlock} from './domain.js';
import {evidenceButtons,createMediaCapture} from './media-capture.js';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EVIDENCE_VIEWS=[['front','Frente'],['back','Trás'],['left','Esquerda'],['right','Direita'],['selfie','Selfie']];
export function createCheckpointCurtain(api){
 let key=null,root=null,torchStream=null,torchTrack=null,saving=false,evidenceFiles=[],previewUrls=[];
 const releasePreviews=()=>{for(const url of previewUrls)URL.revokeObjectURL(url);previewUrls=[]};
 const mediaCapture=createMediaCapture({notify:api.notify});
 const closeTorch=()=>{torchStream?.getTracks().forEach(t=>t.stop());torchStream=null;torchTrack=null};
 function close(){document.body.classList.remove('checkpoint-arrived');root?.remove();root=null;key=null;saving=false;evidenceFiles=[];releasePreviews();mediaCapture.stopAll();closeTorch()}
 function paintEvidence(){
  if(!root)return;
  releasePreviews();
  for(const button of root.querySelectorAll('[data-evidence-view]')){
   const taken=evidenceFiles.some(item=>item.view===button.dataset.evidenceView);
   button.classList.toggle('has-capture',taken);
   button.setAttribute('aria-pressed',String(taken));
   const state=button.querySelector('[data-view-state]');
   if(state)state.textContent=taken?'✓':'+';
  }
  const list=root.querySelector('[data-evidence-attachments]');
  if(list)list.innerHTML=evidenceFiles.length
   ?'<div class="rp2-evidence-preview-list">'+evidenceFiles.map((item,i)=>{
    const label=EVIDENCE_VIEWS.find(([key])=>key===item.view)?.[1]||'Anexo';
    const isImage=item.file?.type?.startsWith('image/');
    const url=isImage&&typeof URL.createObjectURL==='function'?URL.createObjectURL(item.file):'';
    if(url)previewUrls.push(url);
    return '<div class="rp2-evidence-preview">'+(url?'<img loading="lazy" src="'+safe(url)+'" alt="Prévia da foto: '+safe(label)+'">':'<span class="rp2-evidence-media-icon" aria-hidden="true">▣</span>')+
     '<span class="rp2-evidence-preview-copy"><strong>'+safe(label)+'</strong><small>'+safe(item.file.name)+'</small></span>'+
     '<button type="button" data-evidence-remove="'+i+'" aria-label="Remover '+safe(label)+'" title="Remover '+safe(label)+'">×</button></div>';
   }).join('')+'</div>'
   :'<p class="rp2-evidence-empty">Nenhuma imagem ou arquivo anexado.</p>';
  const count=root.querySelector('[data-evidence-count]');
  if(count)count.textContent=evidenceFiles.filter(item=>item.view).length+' de 5 posições fotografadas';
 }
 const status=()=>{
  if(!root)return;
  const s=api.get().session,point=s&&currentCheckpoint(s);
  if(!s||s.status!=='active'||!point||key!==s.id+':'+s.index||hasBlock(s)){close();return}
  const elapsed=Math.round(s.checkpoints[s.index].dwellMs/1000),target=Math.round(requiredDwellMs(s)/1000);
  const remain=Math.max(0,target-elapsed);
  root.querySelector('[data-dwell-seconds]').textContent=String(remain).padStart(2,'0');
  root.querySelector('[data-dwell-seconds]').parentElement?.setAttribute('aria-label',remain+' segundos restantes');
  root.querySelector('[data-curtain-observation-wrap]').hidden=remain>0;
  root.querySelector('.checkpoint-curtain-panel')?.classList.toggle('is-ready',remain===0);
  root.querySelector('[data-curtain-observation-wrap]').setAttribute('aria-hidden',String(remain>0));
  root.querySelector('.checkpoint-curtain-panel')?.setAttribute('data-rp2-phase',s.insideSince==null?'paused':remain===0?'ready':'counting');
  root.querySelector('[data-dwell-message]').textContent=s.insideSince==null
    ?'GPS fora do raio ou impreciso. A validação está suspensa.'
    :elapsed<target?'Aguarde e observe o ambiente para registrar as condições deste ponto.':'Tempo concluído. Informe as condições verificadas para prosseguir.';
  const button=root.querySelector('[data-curtain-submit]');
  const concern=root.querySelector('[name="point-state"]:checked')?.value==='attention';
  const observation=root.querySelector('textarea').value.trim();
  const noteReady=concern?observation.length>=10:true;
  const required=Array.isArray(s.route?.rules?.requiredEvidenceViews)?s.route.rules.requiredEvidenceViews.filter(view=>EVIDENCE_VIEWS.some(([key])=>key===view)):[];
  const evidenceReady=required.every(view=>evidenceFiles.some(item=>item.view===view));
  button.disabled=saving||!canCompletePoint(s)||!noteReady||!evidenceReady;
  const hint=root.querySelector('[data-evidence-required-hint]');
  if(hint)hint.textContent=required.length?(evidenceReady?'Fotos obrigatórias registradas.':'Registre as fotos exigidas nesta rota: '+required.map(view=>EVIDENCE_VIEWS.find(([key])=>key===view)[1]).join(', ')+'.'):'As cinco posições de foto estão disponíveis. Nesta rota, o envio é opcional.';
  root.querySelector('textarea').required=Boolean(concern);
  root.querySelector('textarea').minLength=concern?10:0;
  root.querySelector('[data-curtain-note-hint]').textContent=concern?'Descreva o que aconteceu. Obrigatório, mínimo de 10 caracteres.':'Observações complementares (opcionais).';
 };
 function open(){
  const state=api.get(),s=state.session,p=s&&currentCheckpoint(s);
  if(s?.status==='active'&&hasBlock(s)){close();return}
  if(state.view!=='minha-ronda'||state.user?.role!=='ronda'||s?.status!=='active'||!p||s.insideSince==null){status();return}
  const next=s.id+':'+s.index;if(root&&key===next){status();return}
  close();key=next;document.body.classList.add('checkpoint-arrived');root=document.createElement('section');
  root.className='checkpoint-curtain';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Conferência obrigatória do ponto de ronda');
  root.innerHTML='<div class="checkpoint-curtain-shade"></div><div class="checkpoint-curtain-panel" tabindex="-1">'+
   '<div class="checkpoint-curtain-eyebrow">✓ CHEGADA CONFIRMADA · PONTO '+(s.index+1)+'</div>'+
   '<h2>'+safe(p.name)+'</h2><p>'+safe(p.instruction||'Verifique as condições do local.')+'</p>'+
   '<div class="checkpoint-stopwatch" aria-live="polite"><strong><span data-dwell-seconds>00</span><small> s</small></strong><small data-dwell-message>Aguarde e observe o ambiente antes de preencher a verificação.</small></div>'+
   '<div class="checkpoint-evidence-title"><span>Fotos do ponto</span><small data-evidence-count aria-live="polite">0 de 5 posições fotografadas</small></div>'+
   '<div class="checkpoint-view-grid" role="group" aria-label="Captura de fotos por direção">'+EVIDENCE_VIEWS.map(([view,label],i)=>'<button type="button" class="checkpoint-view-action" data-evidence-view="'+view+'" aria-label="Capturar ou substituir foto: '+label+'" aria-pressed="false"><span class="rp2-view-number" aria-hidden="true">'+(i+1)+'</span><span>'+label+'</span><small data-view-state>+</small></button>').join('')+'</div>'+
   '<p class="checkpoint-evidence-hint" data-evidence-required-hint></p>'+
   '<div class="checkpoint-evidence-extra-label">Outras evidências</div>'+
   '<div class="checkpoint-tools">'+evidenceButtons()+'</div>'+
   '<div class="checkpoint-utility-row" aria-label="Ferramentas do ponto"><button type="button" data-curtain-torch aria-label="Autorizar câmera e ativar lanterna"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3h8l-2 7 4 4-6 8-6-8 4-4-2-7Z"/><path d="M11 11l2 2M18 18h3M3 18h3"/></svg> <span>Lanterna</span></button>'+
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
   const button=event.target.closest('[data-evidence-view],[data-evidence-kind],[data-evidence-remove]');
   if(!button)return;
   event.preventDefault();event.stopPropagation();
   if(button.hasAttribute('data-evidence-remove')){
    const index=Number(button.dataset.evidenceRemove);
    if(Number.isInteger(index)&&index>=0&&index<evidenceFiles.length)evidenceFiles.splice(index,1);
   }else if(!saving)try{
    const view=button.dataset.evidenceView||null;
    if(!view&&evidenceFiles.filter(item=>!item.view).length>=3){api.notify('Limite de três anexos adicionais.');return}
    const file=await mediaCapture.request(view?(view==='selfie'?'selfie':'photo'):button.dataset.evidenceKind);
    if(!root?.isConnected)return;
    if(view){
     const previous=evidenceFiles.findIndex(item=>item.view===view);
     if(previous>=0)evidenceFiles.splice(previous,1);
    }
    evidenceFiles.push({file,view});
   }catch(error){if(!/cancelad|Nenhuma evidência/i.test(error.message))api.notify(error.message);}
   paintEvidence();
   status();
  });
  paintEvidence();status();root.querySelector('.checkpoint-curtain-panel').focus({preventScroll:true});
 }
 async function toggleTorch(){
  const el=root?.querySelector('[data-curtain-torch]');if(!el)return;
  if(torchTrack){try{await torchTrack.applyConstraints({advanced:[{torch:false}]})}catch{}closeTorch();el.querySelector('span').textContent='Lanterna';return}
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Indisponível');
   torchStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
   torchTrack=torchStream.getVideoTracks()[0];
   const support=torchTrack.getCapabilities?.();
   if(!support?.torch)throw Error('Sem lanterna controlável no navegador');
   await torchTrack.applyConstraints({advanced:[{torch:true}]});
   el.querySelector('span').textContent='Desligar lanterna';
  }catch(e){closeTorch();api.notify(['NotAllowedError','PermissionDeniedError','SecurityError'].includes(e?.name)?'Autorize a câmera para ligar a lanterna.':'Este navegador ou dispositivo não disponibiliza controle da lanterna.')}
 }
 async function submit(){
  const {session:s,locationFix}=api.get(),p=currentCheckpoint(s),checkpoint=s?.checkpoints[s.index];
  if(!p||!canCompletePoint(s)){status();api.notify('Aguarde a permanência com GPS confiável.');return}
  const attention=root.querySelector('[name="point-state"]:checked')?.value==='attention';
  const note=root.querySelector('textarea')?.value.trim()||'';
  if(attention&&note.length<10){api.notify('Descreva a situação que exige atenção com pelo menos 10 caracteres.');return}
  const required=Array.isArray(s.route?.rules?.requiredEvidenceViews)?s.route.rules.requiredEvidenceViews.filter(view=>EVIDENCE_VIEWS.some(([key])=>key===view)):[];
  if(required.some(view=>!evidenceFiles.some(item=>item.view===view))){api.notify('Registre as fotos exigidas para concluir este ponto.');return}
  const observation=attention?'Atenção no ponto: '+note:note?'Tudo dentro do esperado. '+note:'Tudo dentro do esperado, sem anormalidades.';
  if(saving)return;saving=true;status();
  const files=[...evidenceFiles],previousCheckpoint={...checkpoint},previousIndex=s.index,previousInsideSince=s.insideSince,previousTimeline=[...s.timeline];
  checkpoint.observation=observation;checkpoint.observedAt=Date.now();
  checkpoint.position=locationFix?{lat:locationFix.lat,lng:locationFix.lng,accuracy:locationFix.accuracy,at:locationFix.at}:null;
  try{
   if(!completePoint(s,Date.now())){throw new Error('A localização mudou antes da confirmação do ponto.')}
   checkpoint.condition=attention?'attention':'ok';
   await api.recordCheckpoint(checkpoint,files,p);
   api.save();close();api.render();
   api.notify(currentCheckpoint(s)?'Ponto registrado. Siga para o próximo ponto.':'Todos os pontos registrados. Retorne à base.');
  }catch(err){
   // Reverte a progressão local se o registro não tiver sido confirmado.
   s.index=previousIndex;s.insideSince=previousInsideSince;s.timeline=previousTimeline;
   for(const field of Object.keys(checkpoint))if(!(field in previousCheckpoint))delete checkpoint[field];
   Object.assign(checkpoint,previousCheckpoint);
   saving=false;api.save();status();
   api.notify('Ponto não concluído: falha na gravação ou mudança de localização. Tente novamente.');
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closeTorch()});
 return {open,close,status};
}
