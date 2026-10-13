/* Spotlight explicativo com foco acessível, sem substituir as telas do aplicativo.
   É uma ajuda opcional; não concede GPS nem interfere na segurança da ronda. */
export const TOUR_STORAGE_KEY='horizon-maxvel-tour-v2';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createSpotlightTour({app,steps,onClose=()=>{},storage=localStorage}){
 let index=0,overlay=null,lastFocus=null,live=false;
 const finish=()=>{
  if(!live)return;
  live=false;window.removeEventListener('resize',place);document.removeEventListener('keydown',keys,true);
  overlay?.remove();overlay=null;app.inert=false;
  try{storage.setItem(TOUR_STORAGE_KEY,'seen')}catch{}
  if(lastFocus?.isConnected&&typeof lastFocus.focus==='function')lastFocus.focus();
  onClose();
 };
 function place(){
  if(!live||!overlay)return;
  const step=steps[index];
  const visible=element=>{const r=element.getBoundingClientRect();return r.width>0&&r.height>0;};
  const target=[...document.querySelectorAll(step.target)].find(visible)||[...document.querySelectorAll('.schedule-workspace, .ops-workspace, .app-content')].find(visible);
  const cut=overlay.querySelector('.tour-cutout'),panel=overlay.querySelector('.tour-panel');
  const vpW=window.innerWidth,vpH=window.innerHeight;
  if(target){
   const r=target.getBoundingClientRect(),pad=5;
   const x=Math.max(7,r.left-pad),y=Math.max(7,r.top-pad);
   const right=Math.min(vpW-7,r.right+pad),bottom=Math.min(vpH-7,r.bottom+pad);
   Object.assign(cut.style,{display:'block',left:x+'px',top:y+'px',width:Math.max(0,right-x)+'px',height:Math.max(0,bottom-y)+'px'});
   const preferred=bottom+14;
   const est=panel.offsetHeight||260;
   const top=preferred+est<=vpH-12?preferred:Math.max(12,y-est-16);
   panel.style.top=Math.max(12,Math.min(vpH-est-12,top))+'px';
  }else{
   cut.style.display='none';panel.style.top='max(16px,env(safe-area-inset-top))';
  }
  panel.style.left='50%';panel.style.transform='translateX(-50%)';
 }
 function paint(){
  const step=steps[index];
  if(!overlay){
   overlay=document.createElement('div');overlay.id='horizon-tour';overlay.className='horizon-tour';
   overlay.innerHTML='<div class="tour-cutout" aria-hidden="true"></div><section class="tour-panel" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description"></section>';
   document.body.append(overlay);
  }
  const panel=overlay.querySelector('.tour-panel');
  panel.innerHTML='<div class="tour-kicker">TOUR DO APLICATIVO · '+(index+1)+'/'+steps.length+'</div>'+
   '<h2 id="tour-title">'+esc(step.title)+'</h2><p id="tour-description">'+esc(step.description)+'</p>'+
   '<p class="tour-hint">Você pode fechar o tutorial agora e reabri-lo em Ajuda ou no menu lateral.</p>'+
   '<div class="tour-buttons"><button type="button" data-tour="close">Fechar tutorial</button>'+
   (index?'<button type="button" data-tour="back">Anterior</button>':'')+
   '<button type="button" class="tour-next" data-tour="next">'+(index===steps.length-1?'Concluir':'Entendi · continuar')+'</button></div>';
  place();panel.querySelector('[data-tour="next"]').focus();
 }
 function keys(e){
  if(!live)return;
  if(e.key==='Escape'){e.preventDefault();finish();return;}
  if(e.key==='Tab'){
   const controls=[...overlay.querySelectorAll('button:not([disabled])')],first=controls[0],last=controls.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 }
 function open(start=0){
  if(live)finish();
  if(!Array.isArray(steps)||!steps.length)return;
  index=Math.min(Math.max(0,start),steps.length-1);
  lastFocus=document.activeElement;live=true;app.inert=true;
  window.addEventListener('resize',place);document.addEventListener('keydown',keys,true);
  paint();
 }
 document.addEventListener('click',e=>{
  if(!live||!overlay?.contains(e.target))return;
  const action=e.target.closest('[data-tour]')?.dataset.tour;
  if(action==='close')finish();
  if(action==='next'){if(index>=steps.length-1)finish();else{index++;paint()}}
  if(action==='back'){index=Math.max(0,index-1);paint()}
 });
 return {open,close:finish,isOpen:()=>live,hasSeen:()=>{try{return storage.getItem(TOUR_STORAGE_KEY)==='seen'}catch{return false}}};
}
