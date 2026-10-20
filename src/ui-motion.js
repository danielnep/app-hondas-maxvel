/** Motion belongs to the interface, independent of patrol, GPS and storage. */
const INTERACTIVE_SURFACE='button,a,input,textarea,select,summary,[role="button"],[role="link"],[contenteditable],[data-action],[data-view],.leaflet-container';
export function canDragDialogSurface(target,modal,styleFor=node=>window.getComputedStyle(node)){
 if(!target||target===modal||!modal.contains(target)||target.closest(INTERACTIVE_SURFACE))return false;
 // A surface may be dragged, but scrolling within forms, lists and message threads wins.
 for(let node=target;node&&node!==modal;node=node.parentElement){
  if(node.scrollHeight>node.clientHeight+2&&/^(auto|scroll)$/.test(styleFor(node).overflowY))return false;
 }
 return true;
}
export function createUiMotion({root,modal}) {
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 let drag=null;
 function enterView() {
  if(reduce.matches)return;
  const nodes=root.querySelectorAll('.entry-panel,.entry-aside,.page-title,.v4-dashboard-heading,.v4-dashboard-tabs,.supervision-context,.ops-panel-heading,.schedule-row,.v4-history-row,.v4-team-row,.v4-insight-row,.patrol-statusline,.patrol-actions');
  [...nodes].slice(0,28).forEach((node,index)=>{
   node.style.setProperty('--rp-stagger',`${Math.min(index,7)*35}ms`);
   node.classList.add('rp-enter');
  });
 }
 function restore() {
  modal.classList.remove('rp-sheet-dragging');
  modal.style.removeProperty('--rp-drag-y');
  drag=null;
 }
 modal.addEventListener('pointerdown',event=>{
  if(modal.classList.contains('guide-dialog')||event.button!==0||!event.isPrimary||window.innerWidth>900)return;
  if(!canDragDialogSurface(event.target,modal))return;
  drag={id:event.pointerId,startY:event.clientY,amount:0};
  modal.setPointerCapture?.(event.pointerId);
 });
 modal.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  drag.amount=Math.max(0,event.clientY-drag.startY);
  if(drag.amount<8)return;
  event.preventDefault();
  modal.classList.add('rp-sheet-dragging');
  modal.style.setProperty('--rp-drag-y',`${Math.min(140,drag.amount*.65)}px`);
 });
 modal.addEventListener('pointerup',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const dismiss=drag.amount>110;
  if(modal.hasPointerCapture?.(event.pointerId))modal.releasePointerCapture(event.pointerId);
  restore();
  if(dismiss)modal.close();
 });
 modal.addEventListener('pointercancel',restore);
 modal.addEventListener('lostpointercapture',restore);
 modal.addEventListener('close',restore);
 reduce.addEventListener?.('change',()=>{if(reduce.matches)restore();});
 return {enterView};
}
