let mainMeasure=null;
let dialogMeasure=null;
function installPager(container,track){
 const bar=document.createElement('nav');
 bar.className='rev3-pager';
 const previous=document.createElement('button');
 previous.type='button';previous.textContent='‹ Voltar';previous.setAttribute('aria-label','Página anterior');
 const count=document.createElement('span');count.setAttribute('aria-live','polite');
 const next=document.createElement('button');next.type='button';
 next.textContent='Próxima ›';next.setAttribute('aria-label','Próxima página');
 bar.append(previous,count,next);container.append(bar);
 let page=0;
 const update=()=>{
  const width=track.clientWidth||1;
  const total=Math.max(1,Math.ceil((track.scrollWidth-1)/width));
  page=Math.max(0,Math.min(page,total-1));
  track.scrollLeft=page*width;
  count.textContent=(page+1)+' / '+total;
  previous.disabled=page===0;next.disabled=page===total-1;
 };
 previous.addEventListener('click',e=>{e.stopPropagation();page--;update()});
 next.addEventListener('click',e=>{e.stopPropagation();page++;update()});
 requestAnimationFrame(()=>{update();requestAnimationFrame(update)});
 return update;
}
export function mountViewportPaging(root){
 if(!matchMedia('(max-width:900px)').matches)return;
 const main=root.querySelector('.dashboard .app-content');
 if(!main)return;
 const track=document.createElement('div');track.className='rev3-page-track';
 while(main.firstChild)track.append(main.firstChild);
 main.append(track);mainMeasure=installPager(main,track);
}
export function paginateDialog(dialog){
 if(!matchMedia('(max-width:900px)').matches||!dialog.open)return;
 if(dialog.querySelector('.rev3-wizard,.rev3-dialog-track'))return;
 const track=document.createElement('div');track.className='rev3-dialog-track';
 const close=dialog.querySelector(':scope > .dialog-close');
 for(const node of [...dialog.childNodes])if(node!==close)track.append(node);
 dialog.append(track);dialogMeasure=installPager(dialog,track);
}
window.addEventListener('resize',()=>{mainMeasure?.();dialogMeasure?.()});
