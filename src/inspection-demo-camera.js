/**
 * Captura demonstrativa de evidências: câmera real, nunca seletor de arquivos.
 * A demonstração mantém os arquivos SOMENTE na memória do formulário,
 * sem upload/sincronização entre aparelhos.
 */
const captures=new WeakMap();
const LIMIT=12;
function state(form){
 if(!captures.has(form))captures.set(form,{selfie:null,photos:[],urls:[]});
 return captures.get(form);
}
function publish(form){
 if(!form.isConnected)return;
 const data=state(form);
 for(const [kind,files] of [['selfie',data.selfie?[data.selfie]:[]],['photo',data.photos]]){
  const input=form.querySelector('[data-demo-captured="'+kind+'"]');
  if(!input)continue;
  if(typeof DataTransfer==='undefined'){showError(form,'Este navegador não permite anexar capturas ao formulário.');return;}
  const dt=new DataTransfer();
  for(const file of files)dt.items.add(file);
  input.files=dt.files;
 }
 const area=form.querySelector('[data-demo-capture-preview]');
 if(!area)return;
 for(const url of data.urls)URL.revokeObjectURL(url);
 data.urls=[];
 area.replaceChildren();
 const files=[...(data.selfie?[['Selfie',data.selfie]]:[]),...data.photos.map((file,i)=>['Local '+(i+1),file])];
 if(!files.length){area.textContent='Nenhuma foto capturada.';return;}
 const caption=document.createElement('small');
 caption.textContent=(data.selfie?'Selfie registrada · ':'')+data.photos.length+' foto(s) do local · capturadas nesta sessão';
 area.append(caption);
 const strip=document.createElement('div');strip.className='rp-capture-thumbnails';
 for(const [label,file] of files.slice(0,6)){
  const item=document.createElement('div');item.className='rp-capture-thumb';
  const img=document.createElement('img');const url=URL.createObjectURL(file);data.urls.push(url);
  img.src=url;img.alt=label;img.width=72;img.height=72;
  const tag=document.createElement('small');tag.textContent=label;
  item.append(img,tag);strip.append(item);
 }
 area.append(strip);
}
function showError(form,message){
 const target=form.querySelector('[data-wizard-error]');
 if(target){target.hidden=false;target.textContent=message;}
 else console.warn(message);
}
async function capture(form,kind,origin){
 if(!navigator.mediaDevices?.getUserMedia){
  showError(form,'Câmera indisponível. Abra em HTTPS e autorize o acesso à câmera.');return;
 }
 const data=state(form);
 if(kind==='photo'&&data.photos.length>=LIMIT){showError(form,'Limite de 12 fotos atingido.');return;}
 const dialog=document.createElement('dialog');
 dialog.className='rp-capture-dialog';
 dialog.setAttribute('aria-label',kind==='selfie'?'Capturar selfie':'Fotografar local');
 dialog.innerHTML='<div class="rp-capture-head"><strong>'+(kind==='selfie'?'Selfie da chegada':'Foto do local')+'</strong><button type="button" data-close aria-label="Fechar câmera">✕</button></div>'+
  '<div class="rp-capture-viewport"><video playsinline autoplay muted aria-label="Prévia da câmera"></video></div>'+
  '<p>Imagem capturada agora. Não é possível selecionar uma foto da galeria.</p>'+
  '<div class="rp-capture-footer"><button type="button" data-close>Cancelar</button><button type="button" data-shutter disabled>Fotografar</button></div>';
 document.body.append(dialog);
 let stream=null,finished=false;
 const video=dialog.querySelector('video'),shutter=dialog.querySelector('[data-shutter]');
 const stop=()=>{
  if(finished)return;finished=true;
  stream?.getTracks().forEach(track=>track.stop());
  video.srcObject=null;
  if(dialog.open)dialog.close();
  dialog.remove();
  if(origin.isConnected)origin.focus();
 };
 dialog.addEventListener('close',stop,{once:true});
 dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',stop));
 shutter.addEventListener('click',async()=>{
  if(!stream||!video.videoWidth||!video.videoHeight)return;
  shutter.disabled=true;
  try{
   const canvas=document.createElement('canvas');
   const ratio=Math.min(1,1920/Math.max(video.videoWidth,video.videoHeight));
   canvas.width=Math.round(video.videoWidth*ratio);canvas.height=Math.round(video.videoHeight*ratio);
   canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
   if(!blob?.size)throw Error('A câmera não produziu imagem.');
   if(blob.size>25*1024*1024)throw Error('Foto maior que 25 MB.');
   const file=new File([blob],kind+'-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()});
   if(kind==='selfie')data.selfie=file;else data.photos.push(file);
   publish(form);
   stop();
  }catch(error){showError(form,error.message||'Falha ao capturar imagem.');shutter.disabled=false;}
 });
 dialog.showModal();
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:kind==='selfie'?'user':'environment'}}});
  if(finished){stream.getTracks().forEach(track=>track.stop());return;}
  video.srcObject=stream;await video.play();shutter.disabled=false;
 }catch(error){
  showError(form,error?.name==='NotAllowedError'?'Acesso à câmera negado. Autorize a câmera nas permissões do navegador.':'Não foi possível abrir a câmera deste aparelho.');
  stop();
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-demo-capture]');
 if(button){
  const form=button.closest('#demo-inspection-form');
  if(form)void capture(form,button.dataset.demoCapture,button);
  return;
 }
 if(event.target.closest('[data-wizard-next],[data-wizard-back]')){
  const form=document.querySelector('#demo-inspection-form');
  if(form&&captures.has(form))queueMicrotask(()=>publish(form));
 }
});
