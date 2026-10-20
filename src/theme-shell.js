/** Presentation only: reuse live controls and event delegation; never synthesize server actions. */
const $=(s,root=document)=>root.querySelector(s);
const glyph=(path)=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const arrows={left:glyph('<path d="m15 5-7 7 7 7"/>'),right:glyph('<path d="m9 5 7 7-7 7"/>'),up:glyph('<path d="m5 15 7-7 7 7"/>')};
let installed=false,scheduled=false;
function closeOtherFieldPanels(except){
 if(document.body.dataset.rpField!=='true')return;
 if(except!=='notice')document.querySelectorAll('.rp-notification-popover[open]').forEach(node=>{node.open=false});
 if(except!=='chat')document.querySelectorAll('#rp-field-chat-overlay[open],#rp-demo-chat-overlay[open]').forEach(node=>node.close());
 if(except!=='menu'){
  const side=$('#dialog[open].rp-side-drawer');side?.close();
  const nav=$('#central-navigation.is-open');nav?.classList.remove('is-open');
  $('[data-central-menu]')?.setAttribute('aria-expanded','false');
 }
}
function fieldPanelClick(e){
 if(document.body.dataset.rpField!=='true')return;
 const target=e.target;
 if(target.closest('[data-chat-open-quick],[data-chat-page],[data-field-tool-chat],[data-action="demo-chat-overlay"],[data-action="demo-chat-overlay-more"]')){
  closeOtherFieldPanels('chat');return;
 }
 if(target.closest('.rp-notification-popover>summary')){
  closeOtherFieldPanels('notice');return;
 }
 if(target.closest('[data-action="open-mobile-menu"],[data-central-menu]')){
  closeOtherFieldPanels('menu');return;
 }
 if(!target.closest('.rp-notification-popover,.rp-popover-list,.rp-drawer-handle')){
  document.querySelectorAll('.rp-notification-popover[open]').forEach(node=>{node.open=false});
 }
}

export function decorateTheme(role,name=''){
 document.body.classList.add('rp-theme');
 const field=['ronda','vistoriador'].includes(role),workspace=$('.patrol-workspace');
 document.body.dataset.rpField=String(field&&!!workspace);
 document.body.dataset.rpRole=role||'';
 if(field&&workspace){
  const centralHeader=$('header.top'),trigger=$('#central-root [data-central-menu]')||$('[data-central-menu]');
  const previous=centralHeader&&$('[data-central-menu]',centralHeader);if(previous&&previous!==trigger)previous.remove();
  if(centralHeader&&trigger){centralHeader.append(trigger);trigger.innerHTML=glyph('<path d="M4 6h16M4 12h16M4 18h16"/>');trigger.setAttribute('aria-label','Abrir menu de navegação');
   if(!$('.rp-field-profile',centralHeader)){const profile=document.createElement('button');profile.className='rp-field-profile';profile.type='button';profile.textContent=(name||'U').slice(0,1).toUpperCase();profile.setAttribute('aria-label','Abrir perfil e navegação');profile.addEventListener('click',()=>openLeft());centralHeader.append(profile)}
   const nav=$('#central-navigation');if(nav&&!$('[data-rp-exit-proxy]',nav)){const logout=document.createElement('button');logout.type='button';logout.dataset.rpExitProxy='';logout.textContent='Sair';logout.addEventListener('click',()=>$('#exit')?.click());nav.append(logout)}
  }
  const header=$('.app-header');const profile=$('.user-profile-button',header||document);
  if(header&&profile&&profile.parentElement!==header)header.append(profile);
  for(const selector of ['.ops-panic','.rp-inspection-panic','.rp-inspection-help','.ux06-map-help','.rp-inspection-torch']){const tool=$(selector,workspace);if(tool&&tool.parentElement!==workspace)workspace.append(tool)}

  let controls=$('.rp-field-controls',workspace);
  const commands=$('.patrol-actions',workspace);
  if(commands&&!controls){controls=document.createElement('section');controls.className='rp-field-controls';controls.setAttribute('aria-label',role==='ronda'?'Controles da ronda':'Controles da vistoria');commands.before(controls);controls.append(commands);}
  const communication=$('.patrol-communication-bar')||$('.rp-inspection-map-actions',workspace)||$('.rp-field-quicktools',workspace);
  if(controls&&communication&&communication.parentElement!==controls)controls.append(communication);
  if(controls){
   const owner=workspace.parentElement;
   if(owner?.matches('.rp-guard-workspace,.rp-inspector-workspace')){
    const extras=[...owner.children].filter(n=>n!==workspace&&n.tagName!=='DIALOG');
    if(extras.length){const disclosure=document.createElement('details');disclosure.className='rp-field-records';const label=document.createElement('summary');label.textContent='Meus registros e informações';disclosure.append(label,...extras);controls.append(disclosure);}
   }
   const stage=$('.patrol-stage-index',controls),heading=$('.patrol-action-heading',controls);
   if(stage&&heading&&!heading.contains(stage))heading.insertBefore(stage,$('button',heading));
   const hud=$('.rp-inspection-map-hud',workspace);if(hud&&!controls.contains(hud))controls.prepend(hud);
   const upcoming=$('.rp-inspection-upcoming',controls);
   if(upcoming&&!$('[data-rp-guard-options]',controls)){upcoming.hidden=true;const heading=$('.patrol-action-heading',controls);if(heading){const option=document.createElement('button');option.type='button';option.dataset.rpGuardOptions='';option.textContent='⋯';option.setAttribute('aria-label','Ver pontos da ronda');option.addEventListener('click',()=>{upcoming.hidden=!upcoming.hidden;upcoming.open=!upcoming.hidden});heading.append(option)}}
   const quick=$('.rp-field-quicktools',controls);
   if(quick)for(const [attr,path,label]of [['data-field-tool-alert','<path d="m12 3 9 16H3zM12 9v5m0 3h.01"/>','Enviar alerta'],['data-field-tool-incident','<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>','Registrar ocorrência'],['data-field-tool-chat','<path d="M4 3h16v14H9l-5 4zM8 7h8M8 11h6"/>','Enviar mensagem']]){const button=$('['+attr+']',quick);if(button)button.innerHTML=glyph(path)+'<span>'+label+'</span>'}

   if(quick){for(const [attr,cls,path,label] of [['data-field-tool-torch','rp-inspection-torch','<path d="M8 7h8l-2 6v8h-4v-8zM8 3v1m4-3v3m4-1v1"/>','Lanterna'],['data-field-tool-panic','rp-inspection-panic','<circle cx="12" cy="12" r="9"/><path d="M12 6v7m0 4h.01"/>','PÂNICO']]){const button=$('['+attr+']',quick);if(button){if(attr==='data-field-tool-torch'){$('.field-torch-fab')?.remove();button.setAttribute('data-field-torch','');}button.classList.add(cls);button.innerHTML=glyph(path)+'<span>'+label+'</span>';workspace.append(button)}}}
  }
  if(!$('.rp-gesture-edge'))for(const side of ['left','right']){const edge=document.createElement('div');edge.className='rp-gesture-edge '+side;edge.setAttribute('aria-hidden','true');document.body.append(edge);}
 }else{document.querySelectorAll('.rp-gesture-edge').forEach(n=>n.remove());document.querySelectorAll('header.top>.rp-field-profile,header.top>[data-central-menu]').forEach(n=>n.remove());}
 if(!installed){installed=true;document.addEventListener('click',fieldPanelClick,true);document.addEventListener('pointerdown',pointerDown);document.addEventListener('pointermove',pointerMove,{passive:false});document.addEventListener('pointerup',e=>finish(e));document.addEventListener('pointercancel',e=>finish(e,true));document.addEventListener('click',e=>{if(Date.now()<suppress){e.preventDefault();e.stopImmediatePropagation()}},true);new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorateOverlays()})}}).observe(document.body,{childList:true,subtree:true});}
 decorateOverlays();
}
function decorateOverlays(){
 for(const overlay of document.querySelectorAll('.rp-field-chat-overlay'))if(!$('.rp-chat-grip',overlay)){const grip=document.createElement('button');grip.type='button';grip.className='rp-chat-grip';grip.setAttribute('aria-label','Recolher mensagens');grip.innerHTML=arrows.up;grip.addEventListener('click',()=>overlay.close());overlay.append(grip);}
 const dialog=$('#dialog'),menu=$('.ux-access-menu',dialog||document);
 if(dialog){dialog.classList.toggle('rp-side-drawer',!!menu);if(menu&&!$('.rp-drawer-handle',menu)){const active=$('.side-link.active')?.dataset.view;menu.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('rp-menu-selected',n.dataset.view===active));const button=document.createElement('button');button.type='button';button.className='rp-drawer-handle';button.setAttribute('aria-label','Recolher menu');button.innerHTML=arrows.left;button.addEventListener('click',()=>dialog.close());menu.prepend(button);}}
 if(document.body.dataset.rpField==='true'){
  for(const popover of document.querySelectorAll('.rp-header-popover')){const summary=$('summary',popover);if(!summary||!/Eventos|Notificações/.test(summary.getAttribute('aria-label')||summary.textContent))continue;popover.classList.add('rp-notification-popover');const list=$('.rp-popover-list',popover);
   // Keep the right drawer in normal DOM stacking. A popover top layer misplaces
   // the panel on Android and can place it over the map rather than at the edge.
   if(list?.hasAttribute('popover'))list.removeAttribute('popover');
   if(list&&!$('.rp-drawer-handle',popover)){const close=document.createElement('button');close.type='button';close.className='rp-drawer-handle';close.setAttribute('aria-label','Recolher notificações');close.innerHTML=arrows.right;close.addEventListener('click',()=>{popover.open=false;summary.focus()});popover.append(close)}}
 }
}
function openLeft(){closeOtherFieldPanels('menu');const trigger=$('[data-action="open-mobile-menu"]')||$('[data-central-menu]');trigger?.click();decorateOverlays();return $('#dialog[open].rp-side-drawer')||$('#central-navigation.is-open')}
function openRight(){closeOtherFieldPanels('notice');const details=$('.rp-notification-popover');if(details){details.open=true;return $('.rp-popover-list',details)}return null}
function closeDrawer(node){const d=node.closest('dialog');if(d)d.close();else if(node.closest('details'))node.closest('details').open=false;else{node.classList.remove('is-open');$('[data-central-menu]')?.setAttribute('aria-expanded','false')}}
let drag=null,suppress=0;
function pointerDown(e){
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const chat=e.target.closest('.rp-field-chat-overlay');
 if(chat){if(e.target.closest('.rp-chat-grip,.rp-field-chat-overlay-head,.field-chat-topbar'))drag={id:e.pointerId,x:e.clientX,y:e.clientY,node:chat,kind:'up',active:false};return;}
 if(e.target.closest('input,textarea,select'))return;
 const edge=e.target.closest('.rp-gesture-edge'),drawer=e.target.closest('.rp-side-drawer,.rp-notification-popover .rp-popover-list,#central-navigation.is-open');
 if(edge){e.preventDefault();document.documentElement.classList.add('rp-drag-active');drag={id:e.pointerId,x:e.clientX,y:e.clientY,kind:edge.classList.contains('left')?'left':'right',opening:true,active:false};return;}
 if(drawer){const side=drawer.matches('.rp-side-drawer,#central-navigation')?'left':'right';drag={id:e.pointerId,x:e.clientX,y:e.clientY,node:drawer,kind:side,opening:false,active:false};}
}
function pointerMove(e){
 const g=drag;if(!g||e.pointerId!==g.id)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;
 if(!g.active){if(g.kind==='up'?Math.abs(dx)>Math.abs(dy)+10:Math.abs(dy)>Math.abs(dx)+10){drag=null;return}if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;
  if(g.opening){if((g.kind==='left'?dx:-dx)<0){drag=null;return}g.node=g.kind==='left'?openLeft():openRight();if(!g.node){drag=null;return}}
  g.active=true;document.documentElement.classList.add('rp-drag-active');globalThis.getSelection?.()?.removeAllRanges();g.node.style.setProperty('transition','none','important');try{g.node.setPointerCapture(e.pointerId)}catch{}
 }
 e.preventDefault();globalThis.getSelection?.()?.removeAllRanges();if(g.kind==='up')g.node.style.setProperty('transform','translateY('+Math.min(0,dy)+'px)','important');else{const width=g.node.getBoundingClientRect().width;const offset=g.opening?(g.kind==='left'?-1:1)*Math.max(0,width-Math.abs(dx)):(g.kind==='left'?Math.min(0,dx):Math.max(0,dx));g.node.style.setProperty('transform','translateX('+offset+'px)','important')}
}
function finish(e,cancel=false){document.documentElement.classList.remove('rp-drag-active');const g=drag;if(!g||g.id!==e.pointerId)return;drag=null;if(!g.active)return;suppress=Date.now()+350;const distance=g.kind==='up'?g.y-e.clientY:g.kind==='left'?(g.opening?e.clientX-g.x:g.x-e.clientX):(g.opening?g.x-e.clientX:e.clientX-g.x);g.node.style.removeProperty('transition');g.node.style.removeProperty('transform');if(cancel?g.opening:g.opening?distance<65:distance>65)closeDrawer(g.node);try{g.node.releasePointerCapture(e.pointerId)}catch{}}
