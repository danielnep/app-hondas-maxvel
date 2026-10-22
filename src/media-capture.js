/**
 * Ronda Pro · câmera, vídeo e gravação de voz sem selecionar arquivo manualmente.
 * Nenhum envio é feito antes de o usuário anexar a evidência ao registro.
 */
const glyph={
 photo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h5l2-3h4l2 3h5v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
 video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>',
 audio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-5 0h10"/></svg>'
};
export const evidenceButtons=({kinds=['photo','video','audio'],includeList=true}={})=>'<div class="evidence-direct" role="group" aria-label="Capturar evidências">'+
 [['photo','Foto'],['video','Vídeo'],['audio','Áudio']].filter(([key])=>kinds.includes(key)).map(([key,label])=>
 '<button type="button" class="evidence-direct-btn" data-evidence-kind="'+key+'" aria-label="'+label+'">'+glyph[key]+'<span>'+label+'</span></button>').join('')+
 '</div>'+(includeList?'<div class="evidence-attachment-list" data-evidence-attachments aria-live="polite">Nenhuma evidência anexada.</div>':'');
export function createMediaCapture({notify=()=>{}}={}){
 let pending=null,overlay=null,stream=null,recorder=null,chunks=[],recorded=null,startAt=0,clock=null;
 const cleanup=()=>{
  if(clock){clearInterval(clock);clock=null}
  if(recorder?.state==='recording')try{recorder.stop()}catch{}
  recorder=null;
  stream?.getTracks().forEach(x=>x.stop());stream=null;
  overlay?.remove();overlay=null;chunks=[];recorded=null;
 };
 function fail(reason){if(pending){pending.reject(new Error(reason));pending=null}cleanup()}
 function fulfill(file){
  if(!file||file.size<=0||file.size>25*1024*1024){fail('Evidência vazia ou maior que 25 MB.');return}
  const p=pending;pending=null;cleanup();p?.resolve(file);
 }
 function nativeCamera(kind){
  // Video preserva o capturador do sistema; fotos usam câmera ao vivo,
  // impedindo que o seletor de galeria seja a ação primária.
  if(kind==='video')return new Promise((resolve,reject)=>{
   const input=document.createElement('input');
   input.type='file';input.accept='video/*';input.setAttribute('capture','environment');
   input.style.cssText='position:fixed;opacity:0;width:1px;height:1px;pointer-events:none';
   document.body.append(input);
   input.addEventListener('change',()=>{const file=input.files?.[0];input.remove();file?resolve(file):reject(new Error('Nenhum vídeo capturado.'));},{once:true});
   try{input.click()}catch(error){input.remove();reject(error)}
  });
  if(!navigator.mediaDevices?.getUserMedia)return Promise.reject(new Error('Câmera indisponível. Permita câmera e use HTTPS.'));
  return new Promise(async(resolve,reject)=>{
   const dialog=document.createElement('dialog');dialog.className='rp-capture-dialog';
   dialog.setAttribute('aria-label',kind==='selfie'?'Captura de selfie':'Captura de foto');
   dialog.innerHTML='<div class="rp-capture-head"><strong>'+(kind==='selfie'?'Selfie':'Foto do local')+'</strong><button type="button" data-close aria-label="Fechar câmera">✕</button></div>'+
    '<div class="rp-capture-viewport"><video playsinline autoplay muted aria-label="Prévia da câmera"></video></div>'+
    '<p>Capture uma imagem agora. A galeria não é usada nesta etapa.</p>'+
    '<div class="rp-capture-footer"><button type="button" data-close>Cancelar</button><button type="button" data-shutter disabled>Fotografar</button></div>';
   let cameraStream=null,settled=false;
   const video=dialog.querySelector('video'),shutter=dialog.querySelector('[data-shutter]');
   const finish=(error,file)=>{
    if(settled)return;settled=true;
    cameraStream?.getTracks().forEach(track=>track.stop());
    video.srcObject=null;
    if(dialog.open)dialog.close();
    dialog.remove();
    if(file)resolve(file);else reject(error instanceof Error?error:new Error('Captura cancelada.'));
   };
   dialog.addEventListener('close',()=>finish(new Error('Captura cancelada.')),{once:true});
   dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>finish(new Error('Captura cancelada.'))));
   shutter.addEventListener('click',async()=>{
    if(!cameraStream||!video.videoWidth||!video.videoHeight)return;
    shutter.disabled=true;
    try{
     const canvas=document.createElement('canvas'),ratio=Math.min(1,1920/Math.max(video.videoWidth,video.videoHeight));
     canvas.width=Math.round(video.videoWidth*ratio);canvas.height=Math.round(video.videoHeight*ratio);
     canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
     if(!blob?.size)throw Error('Não foi possível fotografar.');
     if(blob.size>25*1024*1024)throw Error('Foto maior que 25 MB.');
     finish(null,new File([blob],kind+'-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()}));
    }catch(error){shutter.disabled=false;finish(error)}
   });
   document.body.append(dialog);
   try{
    dialog.showModal();
    cameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:kind==='selfie'?'user':'environment'}}});
    if(settled){cameraStream.getTracks().forEach(track=>track.stop());return;}
    video.srcObject=cameraStream;await video.play();
    shutter.disabled=false;
   }catch(error){
    finish(new Error(error?.name==='NotAllowedError'?'Acesso à câmera negado. Libere a permissão no navegador.':'Câmera indisponível ou não iniciada.'));
   }
  });
 }
 function microphone(){
  if(pending)return Promise.reject(new Error('Finalize a captura anterior.'));
  return new Promise((resolve,reject)=>{
   pending={resolve,reject};
   overlay=document.createElement('section');overlay.className='evidence-voice-overlay';
   overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Gravador de áudio');
   overlay.innerHTML='<div class="evidence-voice-frost"></div><div class="evidence-voice-layout">'+
    '<span class="evidence-voice-symbol">'+glyph.audio+'</span>'+
    '<span class="evidence-voice-eyebrow">EVIDÊNCIA CONTEXTUAL · GRAVADOR</span>'+
    '<h2>Gravar áudio</h2><p>Registre somente o necessário para descrever a situação. A gravação será anexada quando você confirmar.</p>'+
    '<div class="evidence-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'+
    '<output id="voice-counter">00:00</output><span class="evidence-voice-state" role="status">Microfone aguardando início.</span>'+
    '<div class="evidence-voice-buttons"><button type="button" data-voice-start class="voice-primary">Iniciar gravação</button>'+
    '<button type="button" data-voice-stop hidden>Parar gravação</button>'+
    '<button type="button" data-voice-use hidden>Adicionar áudio</button>'+
    '<button type="button" data-voice-cancel>Cancelar</button></div></div>';
   document.body.append(overlay);
   overlay.querySelector('[data-voice-start]').addEventListener('click',start);
   overlay.querySelector('[data-voice-stop]').addEventListener('click',stop);
   overlay.querySelector('[data-voice-use]').addEventListener('click',()=>{
    if(recorded)fulfill(recorded);else notify('Conclua a gravação primeiro.');
   });
   overlay.querySelector('[data-voice-cancel]').addEventListener('click',()=>fail('Gravação cancelada.'));
  });
 }
 async function start(){
  if(!pending||recorder)return;
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Gravação de áudio indisponível neste navegador.');
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   if(!pending){stream.getTracks().forEach(t=>t.stop());return}
   const supported=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   recorder=new MediaRecorder(stream,supported?{mimeType:supported}:undefined);
   const mime=recorder.mimeType||supported||'audio/webm';
   chunks=[];recorder.addEventListener('dataavailable',e=>{if(e.data.size)chunks.push(e.data)});
   recorder.addEventListener('stop',()=>{
    const blob=new Blob(chunks,{type:mime.split(';')[0]});
    recorded=new File([blob],'evidencia-audio-'+Date.now()+(/mp4/.test(mime)?'.m4a':'.webm'),{type:blob.type,lastModified:Date.now()});
    stream?.getTracks().forEach(t=>t.stop());stream=null;
    if(!overlay)return;
    overlay.querySelector('.evidence-voice-state').textContent='Áudio pronto para anexar. Duração '+overlay.querySelector('#voice-counter').textContent+'.';
    overlay.querySelector('[data-voice-use]').hidden=false;
    overlay.querySelector('[data-voice-stop]').hidden=true;
   });
   recorder.start(250);startAt=Date.now();
   overlay.querySelector('.evidence-voice-state').textContent='Gravando… Toque em Parar quando terminar.';
   overlay.querySelector('[data-voice-start]').hidden=true;
   overlay.querySelector('[data-voice-stop]').hidden=false;
   overlay.classList.add('is-recording');
   clock=setInterval(()=>{
    const secs=Math.floor((Date.now()-startAt)/1000);
    if(overlay)overlay.querySelector('#voice-counter').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
    if(secs>=120||chunks.reduce((n,b)=>n+b.size,0)>24*1024*1024)stop();
   },500);
  }catch(e){fail(e.message||'Microfone não autorizado.')}
 }
 function stop(){
  if(recorder?.state==='recording'){clearInterval(clock);clock=null;recorder.stop();overlay?.classList.remove('is-recording')}
 }
 function request(kind){
  if(kind==='photo'||kind==='selfie'||kind==='video')return nativeCamera(kind);
  if(kind==='audio')return microphone();
  return Promise.reject(new Error('Captura desconhecida.'));
 }
 function stopAll(){fail('Captura encerrada.')}
 return {request,stopAll};
}
