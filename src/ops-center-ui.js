import {typeInfo,EVENT_TYPES} from './treatment-policy.js';
/* UI da central COI: notificações, despachos e permissões com dados do servidor. */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não informado';
const labels={mapa:'Mapa e painel de monitoramento',rondas:'Consulta a rondas e agentes de ronda',despachos:'Despacho sob demanda',ocorrencias:'Tratamento de ocorrências',alertas:'Alertas e e-mails',relatorios:'Relatórios e exportações'};
const activeKinds=new Set([...Object.keys(EVENT_TYPES),'field_alert','notice','panic','incident','alert','gps_issue','route_deviation','patrol_incomplete','patrol_interrupted','forwarded','dispatch','inspection']);
export function createOpsCenterUI({api,flash,openNotice,onUpdate=()=>{}}){
 let notifications=[],dispatches=[],modules=[],availability=[],inspectors=[],destinations=[],current=null,seen=new Set(),lastReminder=0,initialized=false,streamController=null,attention=0,unreadTotal=0,notificationTotal=0,nextCursor=null,treatmentSummary={total:0,categories:[]},refreshing=null,generation=0;
 const manager=()=>['admin','master'].includes(current?.role);
 const reviewer=()=>['admin','master','operador','coi'].includes(current?.role);
 const allowed=key=>manager()||!!modules.find(x=>x.module===key)?.enabled;
 const unread=()=>notifications.filter(x=>!x.read_at);
 const pendingActions=()=>notifications.filter(x=>x.event_id?x.event_status!=='resolvida':x.dispatch_id?!x.dispatch_completed_at:false);
 const permissionRows=()=>modules.map(x=>'<label class="permission-switch"><span><strong>'+esc(labels[x.module]||x.module)+'</strong><small>'+esc(x.enabled?'Habilitado':'Desabilitado')+'</small></span><input type="checkbox" data-coi-toggle="'+esc(x.module)+'" '+(x.enabled?'checked':'')+' aria-label="Habilitar '+esc(labels[x.module]||x.module)+'"></label>').join('');
 function showPopup(n,reminder=false){
  const existing=document.querySelector('#ops-priority-toast');existing?.remove();
  const pop=document.createElement('button');pop.type='button';pop.id='ops-priority-toast';
  pop.className='ops-priority-toast priority-'+(n.kind==='panic'?'panic':['alert','gps_issue','route_deviation','forwarded','dispatch'].includes(n.kind)?'warning':n.kind==='review'?'ok':'info');
  pop.dataset.opsNotification=n.id;
  pop.setAttribute('role','alert');
  pop.innerHTML='<span class="ops-toast-top">'+(reminder?'PENDÊNCIA SEM TRATAMENTO · LEMBRETE':'NOVA NOTIFICAÇÃO · CENTRAL')+'<span class="ops-toast-close" aria-hidden="true">↗</span></span><strong>'+esc(n.title)+'</strong><span>'+esc(n.body)+'</span><small>'+stamp(n.created_at)+' · Toque para abrir e tratar</small>';
  document.body.append(pop);
 }
 function present(){
  if(!current||document.hidden)return;
  const unseen=unread().filter(x=>!seen.has(x.id));
  const candidate=unseen[0];
  if(candidate){
   seen.add(candidate.id);if(activeKinds.has(candidate.kind))showPopup(candidate);
   return;
  }
  const pending=pendingActions();
  if(pending.length&&Date.now()-lastReminder>=60*60000){
   lastReminder=Date.now();
   showPopup(pending[0],true);
  }
 }
 async function refresh(user,withPopup=true){
  if(refreshing&&current?.id===user.id)return refreshing;
  current=user;const epoch=++generation;
  const task=refreshData(user,withPopup,epoch);refreshing=task;
  try{return await task}finally{if(refreshing===task)refreshing=null}
 }
 async function refreshData(user,withPopup=true,epoch){
  const requests=[api('/notifications?channel=events')];
  if(reviewer()){
   requests.push(api('/coi-permissions'));
   requests.push(api('/dispatches'));
   requests.push(api('/availability'));
   requests.push(api('/inspection-destinations'));
   requests.push(api('/treatment-summary'));
  }else if(['ronda','vistoriador'].includes(user.role)){
   requests.push(Promise.resolve(null));
   requests.push(api('/dispatches'));
  }
  const results=await Promise.allSettled(requests);
  if(epoch!==generation||current?.id!==user.id)return;
  if(results[0].status==='fulfilled'){
   let incoming=results[0].value,items=incoming.notifications||[];
   const wanted=notifications.length;
   while(items.length<wanted&&incoming.nextCursor){incoming=await api('/notifications?channel=events&cursor='+encodeURIComponent(incoming.nextCursor));items.push(...incoming.notifications);}
   if(epoch!==generation||current?.id!==user.id)return;
   notifications=[...new Map(items.map(n=>[n.id,n])).values()];nextCursor=incoming.nextCursor;
   notificationTotal=results[0].value.total||0;attention=results[0].value.attention||0;unreadTotal=results[0].value.unread||0;
   // Notificações antigas não devem gerar um popup novo a cada atualização.
   if(!initialized){seen=new Set(notifications.map(item=>item.id));initialized=true;lastReminder=Date.now();}
   const bell=document.querySelector('.ops-bell-bar');
   for(const bell of document.querySelectorAll('.ops-bell-bar')){const open=bell.querySelector('details')?.open;bell.innerHTML=badge();if(open)bell.querySelector('details').open=true;}
  }
  if(reviewer()&&results[1]?.status==='fulfilled')modules=results[1].value.modules||[];
  if(results[2]?.status==='fulfilled')dispatches=results[2].value.dispatches||[];
  if(results[3]?.status==='fulfilled'){availability=results[3].value.guards||[];inspectors=results[3].value.inspectors||[];}
  if(results[4]?.status==='fulfilled')destinations=results[4].value.destinations||[];
  if(results[5]?.status==='fulfilled')treatmentSummary=results[5].value;
  onUpdate({summary:treatmentSummary,attention,remote:withPopup});
  if(withPopup)present();
 }
 function connectLive(token){
  if(streamController||!token)return;
  const ctl=new AbortController();streamController=ctl;
  void (async()=>{
   while(!ctl.signal.aborted){
    try{
     const response=await fetch('/api/notifications/stream',{headers:{Authorization:'Bearer '+token,Accept:'text/event-stream'},cache:'no-store',signal:ctl.signal});
     if(!response.ok||!response.body)break;
     const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
     while(!ctl.signal.aborted){
      const chunk=await reader.read();if(chunk.done)break;
      buffer+=decoder.decode(chunk.value,{stream:true});let idx;
      while((idx=buffer.indexOf('\n\n'))>=0){
       const packet=buffer.slice(0,idx);buffer=buffer.slice(idx+2);
       if(packet.includes('event: change')&&current)void refresh(current,true).catch(()=>{});
      }
      if(buffer.length>8192)buffer=buffer.slice(-1024);
     }
    }catch(error){if(ctl.signal.aborted)break}
    if(!ctl.signal.aborted)await new Promise(resolve=>setTimeout(resolve,3500));
   }
  })();
 }
 function stopLive(){
  generation++;current=null;refreshing=null;
  streamController?.abort();streamController=null;initialized=false;seen.clear();notifications=[];attention=0;unreadTotal=0;nextCursor=null;treatmentSummary={total:0,categories:[]};dispatches=[];availability=[];inspectors=[];destinations=[];modules=[];
  document.querySelector('#ops-priority-toast')?.remove();
 }
 async function requireLocation(){
  if(!navigator.geolocation)throw Error('Localização indisponível no navegador. Ative o GPS.');
  return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(
   position=>resolve({lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy}),
   ()=>reject(Error('Ative a localização para iniciar ou concluir o atendimento.')),
   {enableHighAccuracy:true,timeout:10000,maximumAge:0}
  ));
 }
 function assignmentBanner(){
  if(!['ronda','vistoriador'].includes(current?.role))return '';
  const active=dispatches.find(d=>!d.completed_at);
  return active?'<button type="button" class="ops-assignment-banner" data-ops-page="dispatches"><span>⌖ NOVA ATRIBUIÇÃO</span><strong>'+esc(active.address)+'</strong><small>'+(active.started_at?'Atendimento em andamento':'Toque para visualizar e iniciar')+'</small></button>':'';
 }
 function badge(){
  const latest=notifications.filter(n=>n.kind!=='message'&&n.event_kind!=='message').slice(0,5),extra=Math.max(0,unreadTotal-latest.filter(n=>!n.read_at).length);
  return '<details class="rp-header-popover"><summary class="rp-blue-button '+(unreadTotal?'has-unread':'')+'" aria-label="Eventos: '+unreadTotal+' não lidos"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span>Eventos</span>'+(unreadTotal?'<b class="rp-unread-count">'+unreadTotal+'</b>':'')+'</summary><div class="rp-popover-list"><strong>Últimos eventos</strong>'+(latest.length?cards(latest):'<p class="empty">Nenhum evento recebido.</p>')+(notificationTotal>5?'<button type="button" data-ops-page="notifications">Ver mais'+(extra?'<b class="rp-unread-count">'+extra+'</b>':'')+'</button>':'')+'</div></details>';
 }

 function cards(list){
  return list.map(n=>{
   const pending=n.event_id?n.event_status!=='resolvida':n.dispatch_id?!n.dispatch_completed_at:false;
   const state=n.event_id?(n.event_status==='resolvida'?'Tratativa concluída':n.event_status==='em_analise'?'Em análise':'Tratativa pendente'):
    n.dispatch_id?(n.dispatch_completed_at?'Despacho concluído':n.dispatch_started_at?'Em atendimento':'Despacho pendente'):n.read_at?'Visualizada':'Nova';
   const info=typeInfo(n.kind==='review'?n.event_kind:n.kind),icon=n.kind==='review'?'✓':n.kind==='dispatch'?'➜':info.icon;
   return '<button type="button" class="ops-notification-row '+(pending?'is-pending':'is-completed')+' '+(!n.read_at?'is-unread':'')+'" data-ops-notification="'+esc(n.id)+'">'+
    '<span class="rp-notice-icon" aria-hidden="true">'+esc(icon)+'</span><span><strong>'+esc(n.title)+'</strong><small>'+esc(n.body)+'</small><small>'+esc(n.origin_name||'Central operacional')+' · '+esc(n.kind==='review'?'Tratativa':info.label)+' · '+stamp(n.created_at)+'</small><small>'+esc(state)+' · '+(n.read_at?'Lida':'Não lida')+'</small></span><b aria-hidden="true">↗</b></button>';
  }).join('');
 }
 function notificationsView(){
  const list=notifications.filter(n=>n.kind!=='message'&&n.event_kind!=='message').filter(n=>n.kind==='notice'||n.kind==='field_alert'||(n.event_id?n.event_status!=='resolvida':n.dispatch_id?!n.dispatch_completed_at:!n.read_at));
  const groups=new Map(['panic','incident','alert','inspection','dispatch','gps_issue','route_deviation'].map(k=>[k,[]]));
  for(const n of list){const kind=n.kind==='review'?n.event_kind:n.kind;if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(n);}
  return '<section class="stack ops-inbox-3"><header class="toolbar"><div><div class="eyebrow">CENTRAL · EVENTOS RECEBIDOS</div><h1>Eventos</h1><p class="muted">Apenas pendências, separadas em colunas por tipo. Ler não equivale a concluir.</p></div></header><div class="rp-event-columns">'+([...groups].filter(([,items])=>items.length).sort((a,b)=>b[1].length-a[1].length).map(([kind,items])=>'<section class="rp-event-column"><header><h2>'+esc(kind==='dispatch'?'Despachos':typeInfo(kind).label)+'</h2>'+(items.some(n=>!n.read_at)?'<b class="rp-unread-count">'+items.filter(n=>!n.read_at).length+'</b>':'')+'</header>'+cards(items.slice().sort((a,b)=>b.created_at-a.created_at||b.id.localeCompare(a.id)))+'</section>').join('')||'<p class="empty">Nenhum evento recebido.</p>')+'</div>'+(nextCursor?'<button type="button" data-ops-more>Carregar eventos anteriores</button>':'')+'</section>';
 }

 function dispatchesView({users,rounds,events}){
  const guards=availability.map(w=>({...w,dispatchStatus:w.status,lastActivity:w.last_seen}));
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">COI · DESPACHO SOB DEMANDA</div><h1>Disponibilidade e direcionamento</h1><p class="muted">Selecione um agente de ronda disponível para abrir o despacho. Status exige atividade recente sincronizada, não basta cadastro ativo.</p></div>'+badge()+'</header>'+
   '<section class="surface"><h2>Agentes de ronda</h2><p class="muted">Toque no profissional para informar destino e justificativa. A administração recebe o registro automaticamente.</p>'+
   '<div class="ops-worker-list">'+guards.map(w=>
    '<button type="button" class="ops-worker-row ops-worker-select" data-ops-select-worker="'+esc(w.id)+'" '+(w.dispatchStatus!=='Disponível'?'disabled':'')+' aria-label="Despachar '+esc(w.name)+' · '+esc(w.dispatchStatus)+'">'+
    '<b>'+esc(w.name)+'</b><span class="ops-worker-status '+(w.dispatchStatus==='Disponível'?'ready':w.dispatchStatus==='Em ronda'?'busy':'off')+'">'+w.dispatchStatus+'</span>'+
    '<small>'+esc(w.site||'Posto não definido')+' · Última atividade: '+stamp(w.lastActivity)+'</small></button>').join('')+'</div></section>'+
   '<dialog id="ops-dispatch-modal" class="ops-dispatch-modal" aria-labelledby="ops-dispatch-heading"><div class="ops-dispatch-modal-header"><div><div class="eyebrow">DESPACHO OPERACIONAL</div><h2 id="ops-dispatch-heading">Direcionar agente de ronda</h2><p id="ops-dispatch-worker-label" class="muted">Selecione um agente de ronda</p></div><button type="button" data-ops-close-dispatch aria-label="Fechar">✕</button></div>'+
   '<form id="ops-dispatch-form" class="ops-dispatch-form"><input type="hidden" name="workerId" required>'+
   '<label>Endereço ou ponto específico<input name="address" required minlength="5" maxlength="350" placeholder="Rua, número, local ou referência" autocomplete="street-address"></label>'+
   '<label class="ops-reason">Motivo do despacho <span class="ops-required">Obrigatório</span><textarea name="reason" required minlength="10" maxlength="1000" placeholder="Explique o que ocorreu e o que deve ser verificado"></textarea></label>'+
   '<div class="ops-dispatch-actions"><button type="button" data-ops-close-dispatch>Cancelar</button><button class="primary" type="submit">Registrar despacho e notificar</button></div></form></dialog>'+
 '<section class="surface rp-coe-communications"><h2>Alertas e comunicados para a equipe de campo</h2><p class="muted">O aviso chega somente aos profissionais selecionados. Mensagens de conversa devem ser enviadas pelo Chat interno, não pelo sino.</p>'+
 '<form id="coi-field-notice-form" class="stack"><label>Profissional destinatário<select name="workerId" required><option value="">Selecionar profissional</option>'+
 availability.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.name)+' · Agente de ronda</option>').join('')+
 '</select></label><label>Categoria<select name="kind"><option value="notice">Comunicado operacional</option><option value="alert">Alerta de segurança</option></select></label>'+
 '<label>Assunto<input name="title" minlength="3" maxlength="100" required placeholder="Ex.: Atenção à entrada lateral"></label>'+
 '<label>Orientações<textarea name="message" minlength="8" maxlength="650" required placeholder="Descreva o que foi observado e a providência solicitada"></textarea></label>'+
 '<button class="primary" type="submit">Enviar ao profissional selecionado</button></form></section>'+
 '<section class="surface"><h2>Últimos despachos</h2>'+dispatchList()+'</section></section>';
 }
 function dispatchStops(d){
  if(d.kind!=='ronda')return '';
  let points=d.route_points||d.routePoints||[];
  if(typeof points==='string'){try{points=JSON.parse(points)}catch{points=[]}}
  if(!Array.isArray(points)||points.length<2)return '';
  return '<details class="ops-dispatch-itinerary"><summary>'+points.length+' destinos na ordem da ronda</summary><ol>'+
   points.slice(0,12).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lng))).map((p,i)=>{
    const lat=Number(p.lat),lng=Number(p.lng),url='https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=17/'+lat+'/'+lng;
    return '<li><b>'+(i+1)+'.</b><span>'+esc(p.label||'Destino '+(i+1))+'</span><a target="_blank" rel="noopener noreferrer" href="'+url+'">Abrir mapa ↗</a></li>';
   }).join('')+'</ol><small>Confira cada local antes de iniciar o percurso.</small></details>';
 }
 function dispatchList(){
  if(!dispatches.length)return '<p class="empty">Nenhum despacho registrado.</p>';
  return '<div class="ops-dispatch-list">'+dispatches.slice(0,60).map(d=>{
   const label=d.completed_at?'Concluído':d.started_at?'Em atendimento':d.acknowledged_at?'Recebido':'Aguardando confirmação';
   const actions=['ronda','vistoriador'].includes(current?.role)&&!d.completed_at?'<div class="ops-dispatch-buttons">'+
    (!d.acknowledged_at?'<button type="button" data-ops-ack="'+esc(d.id)+'">Confirmar recebimento</button>':'')+
    (!d.started_at?'<button type="button" class="ops-start-button" data-ops-start="'+esc(d.id)+'">Iniciar atendimento</button>':
     (d.kind==='vistoria'?'<button type="button" class="ops-finish-button" data-ops-page="inspections">Abrir checklist da vistoria</button>':'<button type="button" class="ops-finish-button" data-ops-finish="'+esc(d.id)+'">Concluir atendimento</button>'))+'</div>':'';
   return '<article class="ops-dispatch-line"><div><b>'+esc(d.worker||'Agente de ronda')+'</b><span class="pill '+(d.completed_at?'ok':d.started_at?'warning':'')+'">'+label+'</span></div>'+
    '<strong>'+esc(d.address)+'</strong><p>'+esc(d.reason)+'</p>'+dispatchStops(d)+'<a class="ops-destination-link" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(d.address)+'">Abrir endereço no mapa ↗</a><small>Enviado '+stamp(d.created_at)+' · Operador: '+esc(d.author||'Não informado')+'</small>'+
    (d.started_at?'<small>Iniciado '+stamp(d.started_at)+'</small>':'')+
    (d.completed_at?'<small>Concluído '+stamp(d.completed_at)+' · '+esc(d.completion_note||'')+'</small>':'')+actions+'</article>';
  }).join('')+'</div>';
 }
 function vigilanteDispatches(){
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">ATRIBUIÇÕES EM CAMPO</div><h1>Meus atendimentos</h1><p class="muted">Confira o destino, confirme a chegada da ordem e registre o início e o encerramento com GPS habilitado.</p></div>'+badge()+'</header>'+
   '<section class="surface">'+dispatchList()+'</section>'+
   '<dialog id="ops-completion-modal" class="ops-dispatch-modal" aria-labelledby="ops-completion-heading"><h2 id="ops-completion-heading">Concluir atendimento</h2>'+
   '<p class="muted">Informe o resultado da verificação. Este relatório ficará registrado permanentemente no histórico operacional.</p>'+
   '<form id="ops-completion-form" class="stack"><input type="hidden" name="dispatchId">'+
   '<label>Resultado da verificação<textarea name="note" required minlength="10" maxlength="1500" placeholder="Descreva o que foi verificado e o resultado encontrado."></textarea></label>'+
   '<div class="ops-dispatch-actions"><button type="button" data-ops-close-completion>Cancelar</button><button type="submit" class="primary">Registrar conclusão</button></div></form></dialog></section>';
 }
 function permissionsView(){
  if(!manager())return '<div class="empty">Somente administração pode alterar permissões.</div>';
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">ADMINISTRAÇÃO · CONTROLES</div><h1>Permissões do COI</h1><p class="muted">O painel COI e Monitoramento representa a mesma equipe. Cada módulo é habilitado de fábrica e pode ser alterado individualmente. O servidor também verifica a autorização.</p></div></header>'+
   '<section class="surface"><h2>Módulos de operação</h2><div class="permission-list">'+permissionRows()+'</div></section></section>';
 }

 function attachInspectorGeocoder(dialog){
  if(dialog._geocoderAttached)return;
  dialog._geocoderAttached=true;
  const address=dialog.querySelector('#ops-inspector-form [name="address"]');
  const selector=dialog.querySelector('#ops-inspector-form [name="destinationId"]');
  const host=dialog.querySelector('#ops-inspection-address-suggestions');
  if(!address||!selector||!host)return;
  let timer=null,controller=null;
  function mark(point){
   if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng))return;
   const map=dialog._inspectionMap;
   if(map){
    dialog.dataset.routeMode='destination';
    map.setView([point.lat,point.lng],16,{animate:false});
    map.fire('click',{latlng:window.L.latLng(point.lat,point.lng)});
   }
   address.value=point.address;
   host.replaceChildren();
  }
  selector.addEventListener('change',()=>{
   const saved=destinations.find(p=>p.id===selector.value);
   if(!saved)return;
   address.value=saved.address;
   if(saved.latitude!=null&&saved.longitude!=null)mark({address:saved.address,lat:Number(saved.latitude),lng:Number(saved.longitude)});
   else address.dispatchEvent(new Event('input',{bubbles:true}));
  });
  address.addEventListener('input',()=>{
   clearTimeout(timer);controller?.abort();
   const text=address.value.trim();
   host.replaceChildren();
   dialog.querySelector('[name="latitude"]').value='';
   dialog.querySelector('[name="longitude"]').value='';
   const previous=dialog._inspectorPins?.find(x=>x.kind==='destination');
   previous?.marker.remove();
   dialog._inspectorPins=(dialog._inspectorPins||[]).filter(x=>x.kind!=='destination');
   if(text.length<5)return;
   const status=dialog.querySelector('[data-ops-route-status]');
   if(status)status.textContent='Procurando endereço no mapa...';
   timer=setTimeout(async()=>{
    controller=new AbortController();
    try{
     const response=await fetch('https://photon.komoot.io/api/?lang=default&limit=6&q='+encodeURIComponent(text),{signal:controller.signal});
     if(!response.ok)throw Error('busca indisponível');
     const result=await response.json();
     if(controller.signal.aborted)return;
     const points=(result.features||[]).map(f=>{
      const p=f.properties||{},c=f.geometry?.coordinates||[];
      return {name:String(p.name||p.street||'Local'),address:[p.street,p.housenumber,p.city,p.state].filter(Boolean).join(', ')||String(p.name||text),
       lat:Number(c[1]),lng:Number(c[0])};
     }).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
     for(const point of points){
      const button=document.createElement('button');button.type='button';button.setAttribute('role','option');
      const title=document.createElement('strong');title.textContent=point.name;
      const desc=document.createElement('small');desc.textContent=point.address;
      button.append(title,desc);button.addEventListener('click',()=>mark(point));host.append(button);
     }
     if(points.length){
      dialog._inspectionMap?.setView([points[0].lat,points[0].lng],15,{animate:false});
      if(status)status.textContent='Endereço localizado. Toque no resultado correto para marcar o destino.';
     }else if(status)status.textContent='Não encontrei o endereço. Informe rua, número, bairro e cidade.';
    }catch(e){if(!controller.signal.aborted&&status)status.textContent='Busca indisponível. Você pode marcar o destino tocando no mapa.';}
   },650);
  });
 }

 async function click(target){
  if(target.hasAttribute('data-ops-more')){
   if(!nextCursor)return true;
   target.disabled=true;
   try{const result=await api('/notifications?channel=events&cursor='+encodeURIComponent(nextCursor));notifications=[...new Map([...notifications,...result.notifications].map(n=>[n.id,n])).values()];nextCursor=result.nextCursor;await openNotice({page:'notifications'});}finally{if(target.isConnected)target.disabled=false}
   return true;
  }
  if(target.dataset.opsSelectInspector){
   const dialog=document.querySelector('#ops-inspector-modal');if(!dialog)return true;
   dialog.querySelector('[name="workerId"]').value=target.dataset.opsSelectInspector;
   dialog.querySelector('#ops-inspector-name').textContent=target.querySelector('b')?.textContent||'Vistoriador';
   dialog.showModal();dialog.dataset.routeMode='destination';
   const mapHost=dialog.querySelector('#ops-inspection-plan-map');
   if(mapHost&&window.L){
    if(dialog._inspectionMap)dialog._inspectionMap.remove();
    const map=window.L.map(mapHost,{scrollWheelZoom:false}).setView([-20.1437,-44.8906],12);
    dialog._inspectionMap=map;dialog._inspectorPins=[];
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);
    map.on('click',e=>{
     const lat=Number(e.latlng.lat.toFixed(6)),lng=Number(e.latlng.lng.toFixed(6));
     const status=dialog.querySelector('[data-ops-route-status]');
     if(dialog.dataset.routeMode==='destination'){
      dialog.querySelector('[name="latitude"]').value=lat;dialog.querySelector('[name="longitude"]').value=lng;
      const old=dialog._inspectorPins.find(x=>x.kind==='destination');old?.marker.remove();
      dialog._inspectorPins=dialog._inspectorPins.filter(x=>x.kind!=='destination');
      dialog._inspectorPins.push({kind:'destination',marker:window.L.circleMarker([lat,lng],{radius:10,color:'#fff',fillColor:'#e72d4d',fillOpacity:1}).addTo(map).bindTooltip('Destino COI')});
      if(status)status.textContent='Destino marcado. Adicione passagens se necessário.';
     }else{
      const points=JSON.parse(dialog.querySelector('[name="routePoints"]').value);
      if(points.length>=12){if(status)status.textContent='Limite de 12 passagens atingido.';return;}
      points.push({lat,lng,label:'Passagem '+(points.length+1)});
      dialog.querySelector('[name="routePoints"]').value=JSON.stringify(points);
      dialog._inspectorPins.push({kind:'waypoint',marker:window.L.circleMarker([lat,lng],{radius:7,color:'#fff',fillColor:'#ce475d',fillOpacity:.8}).addTo(map).bindTooltip('Passagem '+points.length)});
      if(status)status.textContent=points.length+' passagens definidas · destino '+(dialog.querySelector('[name="latitude"]').value?'marcado':'a definir');
     }
    });setTimeout(()=>map.invalidateSize(),100);
   }
   attachInspectorGeocoder(dialog);
   dialog.querySelector('[name="destinationId"]').focus();return true;
  }
  if(target.dataset.opsMapMode){const dialog=document.querySelector('#ops-inspector-modal');if(dialog)dialog.dataset.routeMode=target.dataset.opsMapMode;return true;}
  if(target.hasAttribute('data-ops-map-clear')){const dialog=document.querySelector('#ops-inspector-modal');if(!dialog)return true;
   dialog.querySelector('[name="latitude"]').value='';dialog.querySelector('[name="longitude"]').value='';dialog.querySelector('[name="routePoints"]').value='[]';
   dialog._inspectorPins?.forEach(x=>x.marker.remove());dialog._inspectorPins=[];dialog.querySelector('[data-ops-route-status]').textContent='Rota limpa. Defina o destino no mapa.';return true;
  }
  if(target.hasAttribute('data-ops-close-inspector')){document.querySelector('#ops-inspector-modal')?.close();return true;}
  if(target.dataset.opsSelectWorker){
   const dialog=document.querySelector('#ops-dispatch-modal');
   if(!dialog)return true;
   dialog.querySelector('[name="workerId"]').value=target.dataset.opsSelectWorker;
   dialog.querySelector('#ops-dispatch-worker-label').textContent=target.querySelector('b')?.textContent||'Agente de ronda selecionado';
   dialog.showModal();
   dialog.querySelector('[name="address"]').focus();
   return true;
  }
  if(target.hasAttribute('data-ops-close-dispatch')){document.querySelector('#ops-dispatch-modal')?.close();return true;}
  if(target.hasAttribute('data-ops-close-completion')){document.querySelector('#ops-completion-modal')?.close();return true;}
  if(target.dataset.opsFinish){
   const dialog=document.querySelector('#ops-completion-modal');
   if(!dialog)return true;
   dialog.querySelector('[name="dispatchId"]').value=target.dataset.opsFinish;
   dialog.showModal();dialog.querySelector('[name="note"]').focus();return true;
  }
  if(target.dataset.opsStart){
   const position=await requireLocation();
   await api('/dispatches/'+target.dataset.opsStart+'/start',{method:'POST',data:{position}});
   flash('Atendimento iniciado com data, hora e posição GPS.');
   await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(target.dataset.opsPage){openNotice({page:target.dataset.opsPage});return true;}
  if(target.dataset.opsAck){
   await api('/dispatches/'+target.dataset.opsAck+'/ack',{method:'POST'});flash('Recebimento registrado.');await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(target.dataset.opsNotification){
   const n=notifications.find(x=>x.id===target.dataset.opsNotification);if(!n)return true;
   await openNotice(n.event_id?{eventId:n.event_id,notification:n}:{page:n.dispatch_id?'dispatches':'notifications',notification:n});
   await api('/notifications/'+n.id+'/read',{method:'POST'});
   document.querySelector('#ops-priority-toast')?.remove();await refresh(current,false);
   return true;
  }
  return false;
 }
 async function submit(form){
  if(form.id==='ops-completion-form'){
   const data=Object.fromEntries(new FormData(form));
   if(String(data.note||'').trim().length<10)throw Error('Informe o resultado da verificação (10 caracteres ou mais).');
   const position=await requireLocation();
   await api('/dispatches/'+data.dispatchId+'/complete',{method:'POST',data:{note:data.note,position}});
   document.querySelector('#ops-completion-modal')?.close();
   flash('Atendimento concluído e registrado no histórico.');
   await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(form.id==='ops-destination-form'){
   if(!manager())throw Error('Cadastro reservado à Administração.');
   const data=Object.fromEntries(new FormData(form));
   await api('/inspection-destinations',{method:'POST',data});
   flash('Cliente autorizado cadastrado.');await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(form.id==='coi-field-notice-form'){
    const data=Object.fromEntries(new FormData(form));
    if(!data.workerId||!['notice','alert'].includes(data.kind))throw Error('Escolha o profissional e a categoria.');
    const result=await api('/field-communications',{method:'POST',data});
    if(!result.ok)throw Error('Não foi possível entregar o comunicado.');
    form.reset();flash('Comunicado entregue ao profissional destinatário.');return true;
   }
   if(form.id==='ops-inspector-form'){
   const data=Object.fromEntries(new FormData(form));
   if(!data.workerId||(!data.destinationId&&!String(data.address||'').trim()))throw Error('Selecione o vistoriador e informe um local cadastrado ou endereço.');
   data.reason=(data.inspectionType==='routine'?'[ROTINA] ':'[PONTUAL] ')+String(data.reason||'').trim();
   data.routePoints=JSON.parse(data.routePoints||'[]');
   const selectedDestination=destinations.find(x=>x.id===data.destinationId);
   if(selectedDestination){if(selectedDestination.latitude!=null&&selectedDestination.longitude!=null){data.latitude=selectedDestination.latitude;data.longitude=selectedDestination.longitude;}else if(data.latitude!==''&&data.longitude!==''){data.destinationId='';data.address=selectedDestination.address;}}
   else if(data.latitude!==''&&data.longitude!==''){data.latitude=Number(data.latitude);data.longitude=Number(data.longitude);}
   else{delete data.latitude;delete data.longitude;}
   if(data.latitude==null||data.longitude==null||data.latitude===''||data.longitude==='')throw Error('Marque o destino no mapa antes de enviar a vistoria; o aplicativo precisa do ponto geográfico.');
   await api('/dispatches',{method:'POST',data});
   document.querySelector('#ops-inspector-modal')?.close();
   flash('Vistoriador despachado para o local selecionado.');await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(form.id!=='ops-dispatch-form')return false;
  const data=Object.fromEntries(new FormData(form));
  await api('/dispatches',{method:'POST',data});
  document.querySelector('#ops-dispatch-modal')?.close();
  flash('Despacho registrado. Agente de ronda e administração notificados.');
  await refresh(current,false);openNotice({page:'dispatches'});return true;
 }
 async function change(input){
  if(!input.dataset.coiToggle)return false;
  if(!manager())throw Error('Sem permissão para alterar módulos.');
  const module=input.dataset.coiToggle,enabled=input.checked;
  try{
   await api('/coi-permissions',{method:'PUT',data:{module,enabled}});
   const row=modules.find(x=>x.module===module);if(row)row.enabled=enabled?1:0;
   flash('Permissão do módulo atualizada.');
   return true;
  }catch(error){input.checked=!enabled;throw error}
 }
 return {refresh,allowed,badge,summary:()=>treatmentSummary,attention:()=>attention,assignmentBanner,present,connectLive,stopLive,notificationsView,dispatchesView,vigilanteDispatches,permissionsView,click,submit,change,unread,monitoringData:()=>({availability:[...availability,...inspectors],dispatches}),inspectionDispatches:()=>dispatches.filter(d=>d.kind==='vistoria'&&!d.completed_at),activeInspection:()=>dispatches.find(d=>d.kind==='vistoria'&&d.started_at&&!d.completed_at)||dispatches.find(d=>d.kind==='vistoria'&&!d.completed_at)||null};
}
