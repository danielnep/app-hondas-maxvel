/** MAXVEL-04 | Paginação de diálogos altos sem rolagem ou perda de controles.
 * Reorganiza apenas apresentação DOM, preservando campos e handlers.
 */
export function installDialogPagination(dialog){
 if(!dialog?.open||window.innerWidth>900||dialog.querySelector('.round-wizard'))return;
 const maxOuter=Math.max(230,window.innerHeight-46);
 const roots=[...dialog.children].filter(el=>!el.classList.contains('dialog-close'));
 const root=roots.length===1?roots[0]:dialog;
 if(root.scrollHeight<maxOuter-14&&dialog.scrollHeight<maxOuter)return;
 // Cabeçalhos permanecem visíveis; o conteúdo vira páginas de leitura/ação.
 const paginate=(host,maxHeight)=>{
  let children=[...host.children].filter(el=>!el.classList.contains('dialog-close')&&!el.matches('.ux-dialog-pagination'));
  if(children.length<3)return false;
  const heading=children.filter((el,i)=>i<2&&(
   el.matches('h1,h2,.eyebrow,.profile-heading,.consent-compact-head')||
   el.matches('.incident-review-tags')&&!host.querySelector('h2')));
  const body=children.filter(el=>!heading.includes(el));
  const headerHeight=heading.reduce((n,el)=>n+Math.max(0,el.getBoundingClientRect().height),0);
  const space=Math.max(120,maxHeight-headerHeight-57);
  // Forms stay intact; any long form receives its own controls inside the same form.
  for(const el of body){
   if(el.tagName==='FORM'&&el.scrollHeight>space&&el.children.length>3)paginate(el,space+18);
  }
  let chunks=[],current=[],used=0;
  for(const el of body){
   const h=Math.max(24,Math.ceil(el.getBoundingClientRect().height)||24)+6;
   if(current.length&&used+h>space){chunks.push(current);current=[];used=0;}
   current.push(el);used+=h;
  }
  if(current.length)chunks.push(current);
  if(chunks.length<2)return false;
  host.classList.add('ux-dialog-paging-root');
  dialog.classList.add('ux-dialog-paging');
  const navigation=document.createElement('nav');
  navigation.className='ux-dialog-pagination';
  navigation.setAttribute('aria-label','Páginas desta janela');
  let page=0;
  const paint=()=>{
   const visible=new Set(chunks[page]);
   for(const el of body)el.hidden=!visible.has(el);
   navigation.innerHTML='<button type="button" data-dialog-page="back" '+(page===0?'disabled':'')+
    ' aria-label="Página anterior">‹ Voltar</button><span>'+ (page+1)+' de '+chunks.length+
    '</span><button type="button" data-dialog-page="next" '+(page>=chunks.length-1?'disabled':'')+
    ' aria-label="Próxima página">Avançar ›</button>';
  };
  navigation.addEventListener('click',event=>{
   const bt=event.target.closest('[data-dialog-page]');if(!bt)return;
   page=Math.max(0,Math.min(chunks.length-1,page+(bt.dataset.dialogPage==='next'?1:-1)));
   paint();
  });
  host.append(navigation);
  // Campo obrigatório de página anterior: revele sua página e permita correção.
  host.addEventListener('invalid',event=>{
   const idx=chunks.findIndex(group=>group.some(el=>el===event.target||el.contains(event.target)));
   if(idx>=0&&idx!==page){event.preventDefault();page=idx;paint();requestAnimationFrame(()=>event.target.focus());}
  },true);
  paint();return true;
 };
 paginate(root,maxOuter-12);
}
