/**
 * Lanterna de campo: CameraManager no APK Android e MediaStream no PWA.
 * Só acende mediante toque, confirma o resultado da API e libera recursos
 * ao sair do perfil, trocar de página ou ocultar o aplicativo.
 */
export function createFieldTorch({
 notify=()=>{},
 mediaDevices=globalThis.navigator?.mediaDevices,
 nativeBridge=globalThis.AndroidTracking,
 doc=globalThis.document,
 win=globalThis.window
}={}){
 let stream=null,track=null,video=null,mode=null,busy=false,revision=0,requestNumber=0;
 const glyph='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 2 10 10-4 4-3-3-3 3-3-3 3-5Z"/><path d="m14 18 2 2M18 15l3 1M18 20l2 2"/></svg>';
 const active=()=>mode!==null;
 const button=()=>doc?.querySelector?.('[data-field-torch]');
 const isNative=()=>typeof nativeBridge?.setTorchEnabled==='function';
 function paint(){
  const el=button();if(!el)return;
  el.setAttribute('aria-pressed',String(active()));
  el.classList.toggle('is-lit',active());
  el.setAttribute('aria-label',active()?'Apagar lanterna':'Acender lanterna');
  const title=el.querySelector('span');if(title)title.textContent=busy?'Ativando…':active()?'Lanterna ligada':'Lanterna';
  el.disabled=busy;
 }
 function cleanupMedia(){
  const oldTrack=track,oldStream=stream;
  track=null;stream=null;
  try{if(oldTrack?.readyState==='live')void oldTrack.applyConstraints({advanced:[{torch:false}]}).catch(()=>{});}catch{}
  for(const tr of oldStream?.getTracks?.()||[])try{tr.stop()}catch{}
  if(video){video.srcObject=null;video.remove();video=null;}
 }
 function nativeRequest(enabled){
  const id='torch-'+(++requestNumber);
  return new Promise((resolve,reject)=>{
   if(!isNative()){reject(new Error('native-unavailable'));return;}
   let done=false;
   const finish=(detail,error)=>{
    if(done)return;done=true;
    win?.removeEventListener?.('rondas-native-torch-result',listener);
    clearTimeout(timeout);
    if(error)reject(new Error(error));else resolve(detail);
   };
   const listener=event=>{
    if(event.detail?.requestId!==id)return;
    const detail=event.detail;
    finish(detail,detail.error||(!enabled&&detail.enabled?'torch-unavailable':null));
   };
   win?.addEventListener?.('rondas-native-torch-result',listener);
   const timeout=setTimeout(()=>finish(null,'torch-timeout'),12000);
   try{nativeBridge.setTorchEnabled(enabled,id);}catch(e){finish(null,e?.message||'native-error');}
  });
 }
 function stop(){
  revision++;
  if(isNative())void nativeRequest(false).catch(()=>{});
  cleanupMedia();
  mode=null;busy=false;paint();
 }
 async function webOn(token){
  if(!mediaDevices?.getUserMedia)throw new Error('browser-unavailable');
  let result;
  try{
   result=await mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'environment'}}});
  }catch(e){
   if(e?.name!=='OverconstrainedError'&&e?.name!=='NotFoundError')throw e;
   result=await mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  }
  if(revision!==token){result.getTracks().forEach(t=>t.stop());return;}
  stream=result;track=result.getVideoTracks()[0];
  if(!track)throw new Error('camera-unavailable');
  if(track.getSettings?.().facingMode==='user')throw new Error('rear-camera-unavailable');
  const caps=track.getCapabilities?.()||{};
  if(caps.torch===false)throw new Error('torch-unavailable');
  // Alguns navegadores só mantêm a luz ativa com uma trilha de vídeo em reprodução.
  if(doc?.createElement&&doc?.body){
   video=doc.createElement('video');
   video.muted=true;video.autoplay=true;video.playsInline=true;
   video.setAttribute('aria-hidden','true');
   video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
   video.srcObject=stream;doc.body.append(video);
   try{await video.play?.();}catch{}
  }
  if(revision!==token)return;
  if(!track.applyConstraints)throw new Error('torch-unavailable');
  await track.applyConstraints({advanced:[{torch:true}]});
  if(revision!==token)return;
  const actual=track.getSettings?.().torch;
  if(actual===false)throw new Error('torch-unavailable');
  if(caps.torch!==true&&actual!==true)throw new Error('torch-unavailable');
  mode='web';
 }
 function message(e){
  if(['NotAllowedError','PermissionDeniedError','SecurityError','camera-permission'].includes(e?.name||e?.message))
   return 'Autorize a câmera para usar a lanterna.';
  if(e?.message==='camera-busy')return 'Câmera ocupada. Feche a câmera de outro aplicativo e tente novamente.';
  if(e?.message==='torch-timeout')return 'O Android não respondeu à solicitação da lanterna. Tente novamente.';
  if(e?.message==='rear-camera-unavailable')return 'Não foi possível acessar a câmera traseira.';
  return 'Este navegador ou aparelho não liberou o flash. No Android, use o APK com lanterna nativa.';
 }
 async function toggle(){
  if(busy)return;
  if(active()){stop();try{globalThis.navigator?.vibrate?.(12);}catch{}return;}
  busy=true;const token=++revision;paint();
  try{
   if(isNative()){
    const result=await nativeRequest(true);
    if(revision!==token){void nativeRequest(false).catch(()=>{});return;}
    if(!result.enabled)throw new Error('torch-unavailable');
    mode='native';
   }else await webOn(token);
   if(revision!==token||doc?.hidden){stop();return;}
   try{globalThis.navigator?.vibrate?.(15);}catch{}
  }catch(e){
   if(revision===token){cleanupMedia();mode=null;notify(message(e));}
  }finally{if(revision===token){busy=false;paint();}}
 }
 function decorate(){
  const dash=doc?.querySelector?.('.dashboard')||doc?.querySelector?.('#central-root[data-torch-role]');
  const allowed=dash&&['ronda','vistoriador'].includes(dash.dataset.torchRole||'');
  if(!allowed){if(active()||busy)stop();return;}
  if(!dash.querySelector('[data-field-torch]')){
   const el=doc.createElement('button');el.type='button';el.className='field-torch-fab';
   el.setAttribute('data-field-torch','');el.innerHTML=glyph+'<span>Lanterna</span>';
   el.addEventListener('click',toggle);dash.append(el);
  }
  paint();
 }
 doc?.addEventListener?.('visibilitychange',()=>{if(doc.hidden)stop();});
 win?.addEventListener?.('pagehide',stop);
 win?.addEventListener?.('rondas-native-torch-result',event=>{
  // O Android pode apagar o flash quando o app perde foco.
  if(event.detail?.requestId===''&&!event.detail.enabled&&mode==='native'){
   mode=null;busy=false;paint();
  }
 });
 return {decorate,toggle,stop,isOn:active};
}
