/**
 * Lanterna independente da conferência do ponto (PWA/HTTPS).
 * Nunca mantém a câmera capturada quando apagada, oculta ou encerrada.
 */
export function createFieldTorch({notify=()=>{}}={}){
 let stream=null,track=null,busy=false;
 const active=()=>!!track;
 const glyph='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 2 10 10-4 4-3-3-3 3-3-3 3-3-3-3 3-5Z"/><path d="m14 18 2 2M18 15l3 1M18 20l2 2"/></svg>';
 const button=()=>document.querySelector('[data-field-torch]');
 function paint(){
  const el=button();if(!el)return;
  el.setAttribute('aria-pressed',String(active()));
  el.classList.toggle('is-lit',active());
  el.setAttribute('aria-label',active()?'Apagar lanterna e liberar câmera':'Acender lanterna');
  el.querySelector('span').textContent=active()?'Lanterna ligada':'Lanterna';
  el.disabled=busy;
 }
 function stop(){
  try{if(track)track.applyConstraints({advanced:[{torch:false}]}).catch(()=>{});}catch{}
  for(const tr of stream?.getTracks()??[])try{tr.stop()}catch{}
  stream=null;track=null;busy=false;paint();
 }
 async function toggle(){
  if(busy)return;
  if(track){stop();try{navigator.vibrate?.(12)}catch{}return;}
  if(!navigator.mediaDevices?.getUserMedia){notify('Lanterna indisponível neste navegador.');return;}
  busy=true;paint();
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
    facingMode:{ideal:'environment'},width:{ideal:320},height:{ideal:240},frameRate:{ideal:2,max:5}
   }});
   track=stream.getVideoTracks()[0];
   const capabilities=track?.getCapabilities?.();
   if(!track||!capabilities?.torch)throw new Error('hardware-not-supported');
   await track.applyConstraints({advanced:[{torch:true}]});
   if(document.hidden){stop();return;}
   try{navigator.vibrate?.(15)}catch{}
  }catch(err){
   stop();
   notify('Não foi possível acender a lanterna neste celular. O navegador precisa oferecer controle de flash.');
  }finally{busy=false;paint()}
 }
 function decorate(){
  const dash=document.querySelector('.dashboard');
  if(!dash||!['ronda','vistoriador'].includes(dash.dataset.torchRole||''))return;
  const el=document.createElement('button');
  el.type='button';el.className='field-torch-fab';el.setAttribute('data-field-torch','');
  el.innerHTML=glyph+'<span>Lanterna</span>';
  el.addEventListener('click',toggle);dash.append(el);paint();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 return {decorate,toggle,stop,isOn:active};
}
