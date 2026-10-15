import {typeInfo,EVENT_TYPES} from './treatment-policy.js';
/* UI da central COI: notificações, despachos e permissões com dados do servidor. */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não informado';
const labels={mapa:'Mapa e painel de monitoramento',rondas:'Consulta a rondas e vigias',despachos:'Despacho sob demanda',ocorrencias:'Tratamento de ocorrências',alertas:'Alertas e e-mails',relatorios:'Relatórios e exportações'};
const activeKinds=new Set([...Object.keys(EVENT_TYPES),'panic','incident','alert','gps_issue','route_deviation','patrol_incomplete','patrol_interrupted','forwarded','dispatch','message','inspection']);
export function createOpsCenterUI({api,flash,openNotice,onUpdate=()=>{}}){
 let notifications=[],dispatches=[],modules=[],availability=[],inspectors=[],destinations=[],current=null,seen=new Set(),lastReminder=0,initialized=false,streamController=null,attention=0,unreadTotal=0,nextCursor=null,treatmentSummary={total:0,categories:[]},refreshing=null;
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
  if(refreshing)return refreshing;
  refreshing=refreshData(user,withPopup);
  try{return await refreshing}finally{refreshing=null}
 }
 async function refreshData(user,withPopup=true){
  current=user;
  const requests=[api('/notifications')];
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
  if(results[0].status==='fulfilled'){
   let incoming=results[0].value,items=incoming.notifications||[];
   const wanted=notifications.length;
   while(items.length<wanted&&incoming.nextCursor){incoming=await api('/notifications?cursor='+encodeURIComponent(incoming.nextCursor));items.push(...incoming.notifications);}
   notifications=[...new Map(items.map(n=>[n.id,n])).values()];nextCursor=incoming.nextCursor;
   attention=results[0].value.attention||0;unreadTotal=results[0].value.unread||0;
   // Notificações antigas não devem gerar um popup novo a cada atualização.
   if(!initialized){seen=new Set(notifications.map(item=>item.id));initialized=true;lastReminder=Date.now();}
   const bell=document.querySelector('.ops-bell-bar');
   if(bell)bell.innerHTML=badge();
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
  return '<button type="button" data-ops-page="notifications" class="ops-notification-bell" aria-label="Abrir notificações, '+attention+' pendências operacionais">🔔 <span>Notificações</span><span class="rp-pending-dot" data-pending-scope="notifications" '+(!attention?'hidden':'')+' aria-label="Há pendências operacionais"></span>'+(unreadTotal?'<b class="ops-notification-count">'+unreadTotal+'</b>':'')+'</button>';
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
  return '<section class="stack ops-inbox-3"><header class="toolbar"><div><div class="eyebrow">CENTRAL · COMUNICAÇÕES RECEBIDAS</div><h1>Notificações</h1><p class="muted">Todas as comunicações, da mais recente para a mais antiga. Abra o registro para consultar ou realizar a tratativa.</p></div></header>'+
   '<section class="surface ops-notifications" aria-label="Feed de notificações">'+(notifications.length?cards(notifications):'<p class="empty">Nenhuma notificação recebida.</p>')+'</section>'+
   (nextCursor?'<button type="button" data-ops-more>Carregar notificações anteriores</button>':'')+
   '<p class="coi3-footnote">Ler uma notificação não conclui a tratativa. Notificações e Tratativas abrem o mesmo registro e histórico.</p></section>';
 }

 function dispatchesView({users,rounds,events}){
  const guards=availability.map(w=>({...w,dispatchStatus:w.status,lastActivity:w.last_seen}));
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">COI · DESPACHO SOB DEMANDA</div><h1>Disponibilidade e direcionamento</h1><p class="muted">Selecione um vigia disponível para abrir o despacho. Status exige atividade recente sincronizada, não basta cadastro ativo.</p></div>'+badge()+'</header>'+
   '<section class="surface"><h2>Vigias</h2><p class="muted">Toque no profissional para informar destino e justificativa. A administração recebe o registro automaticamente.</p>'+
   '<div class="ops-worker-list">'+guards.map(w=>
    '<button type="button" class="ops-worker-row ops-worker-select" data-ops-select-worker="'+esc(w.id)+'" '+(w.dispatchStatus!=='Disponível'?'disabled':'')+' aria-label="Despachar '+esc(w.name)+' · '+esc(w.dispatchStatus)+'">'+
    '<b>'+esc(w.name)+'</b><span class="ops-worker-status '+(w.dispatchStatus==='Disponível'?'ready':w.dispatchStatus==='Em ronda'?'busy':'off')+'">'+w.dispatchStatus+'</span>'+
    '<small>'+esc(w.site||'Posto não definido')+' · Última atividade: '+stamp(w.lastActivity)+'</small></button>').join('')+'</div></section>'+
   '<dialog id="ops-dispatch-modal" class="ops-dispatch-modal" aria-labelledby="ops-dispatch-heading"><div class="ops-dispatch-modal-header"><div><div class="eyebrow">DESPACHO OPERACIONAL</div><h2 id="ops-dispatch-heading">Direcionar vigia</h2><p id="ops-dispatch-worker-label" class="muted">Selecione um vigia</p></div><button type="button" data-ops-close-dispatch aria-label="Fechar">✕</button></div>'+
   '<form id="ops-dispatch-form" class="ops-dispatch-form"><input type="hidden" name="workerId" required>'+
   '<label>Endereço ou ponto específico<input name="address" required minlength="5" maxlength="350" placeholder="Rua, número, local ou referência" autocomplete="street-address"></label>'+
   '<label class="ops-reason">Motivo do despacho <span class="ops-required">Obrigatório</span><textarea name="reason" required minlength="10" maxlength="1000" placeholder="Explique o que ocorreu e o que deve ser verificado"></textarea></label>'+
   '<div class="ops-dispatch-actions"><button type="button" data-ops-close-dispatch>Cancelar</button><button class="primary" type="submit">Registrar despacho e notificar</button></div></form></dialog>'+
   '<section class="surface ops-inspector-section"><h2>Solicitar Vistoriador</h2><p class="muted">Destinos selecionáveis são cadastrados pela Administração. O profissional não escolhe o cliente.</p>'+
 '<div class="ops-worker-list">'+(inspectors.length?inspectors.map(w=>'<button type="button" class="ops-worker-row ops-worker-select" data-ops-select-inspector="'+esc(w.id)+'" '+
 (w.status!=='Disponível'||!destinations.length?'disabled':'')+'><b>'+esc(w.name)+'</b><span class="ops-worker-status '+(w.status==='Disponível'?'ready':'off')+'">'+esc(w.status)+'</span><small>Última atividade: '+stamp(w.last_seen)+'</small></button>').join(''):'<p class="empty">Nenhum vistoriador cadastrado.</p>')+'</div>'+
 '<dialog id="ops-inspector-modal" class="ops-dispatch-modal"><div class="ops-dispatch-modal-header"><div><div class="eyebrow">DESTINO AUTORIZADO</div><h2>Solicitar Vistoriador</h2><p id="ops-inspector-name" class="muted"></p></div><button type="button" data-ops-close-inspector aria-label="Fechar">✕</button></div>'+
 '<form id="ops-inspector-form" class="ops-dispatch-form"><input type="hidden" name="workerId"><input type="hidden" name="kind" value="inspection">'+
 '<label>Cliente / local cadastrado<select name="destinationId" required><option value="">Selecione</option>'+
 destinations.filter(d=>d.active).map(d=>'<option value="'+esc(d.id)+'">'+esc(d.client_name+' · '+d.address)+'</option>').join('')+
 '</select></label><label>Justificativa do despacho<textarea name="reason" minlength="10" maxlength="1000" required placeholder="Descreva a inspeção solicitada"></textarea></label>'+
 '<div class="ops-dispatch-actions"><button type="button" data-ops-close-inspector>Cancelar</button><button class="primary" type="submit">Enviar vistoriador</button></div></form></dialog></section>'+
 (manager()?'<section class="surface"><h2>Clientes autorizados para vistoria</h2>'+
 '<form id="ops-destination-form" class="stack"><div class="grid">'+
 '<label>Nome da empresa<input name="clientName" required minlength="2" maxlength="130"></label>'+
 '<label>Nome do responsável<input name="contactName" maxlength="100"></label>'+
 '<label>Telefone<input name="phone" maxlength="35" type="tel"></label>'+
 '<label>E-mail<input name="email" maxlength="160" type="email"></label>'+
 '<label>Endereço completo<input name="address" required minlength="5" maxlength="350"></label></div>'+
 '<button type="submit" class="primary">Cadastrar cliente / posto</button></form>'+
 '<p class="muted">'+destinations.length+' local(is) cadastrado(s) para despacho</p></section>':'')+
 '<section class="surface"><h2>Últimos despachos</h2>'+dispatchList()+'</section></section>';
 }
 function dispatchList(){
  if(!dispatches.length)return '<p class="empty">Nenhum despacho registrado.</p>';
  return '<div class="ops-dispatch-list">'+dispatches.slice(0,60).map(d=>{
   const label=d.completed_at?'Concluído':d.started_at?'Em atendimento':d.acknowledged_at?'Recebido':'Aguardando confirmação';
   const actions=['ronda','vistoriador'].includes(current?.role)&&!d.completed_at?'<div class="ops-dispatch-buttons">'+
    (!d.acknowledged_at?'<button type="button" data-ops-ack="'+esc(d.id)+'">Confirmar recebimento</button>':'')+
    (!d.started_at?'<button type="button" class="ops-start-button" data-ops-start="'+esc(d.id)+'">Iniciar atendimento</button>':
     '<button type="button" class="ops-finish-button" data-ops-finish="'+esc(d.id)+'">Concluir atendimento</button>')+'</div>':'';
   return '<article class="ops-dispatch-line"><div><b>'+esc(d.worker||'Vigia')+'</b><span class="pill '+(d.completed_at?'ok':d.started_at?'warning':'')+'">'+label+'</span></div>'+
    '<strong>'+esc(d.address)+'</strong><p>'+esc(d.reason)+'</p><a class="ops-destination-link" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(d.address)+'">Abrir endereço no mapa ↗</a><small>Enviado '+stamp(d.created_at)+' · Operador: '+esc(d.author||'Não informado')+'</small>'+
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
 async function click(target){
  if(target.hasAttribute('data-ops-more')){
   if(!nextCursor)return true;
   target.disabled=true;
   try{const result=await api('/notifications?cursor='+encodeURIComponent(nextCursor));notifications=[...new Map([...notifications,...result.notifications].map(n=>[n.id,n])).values()];nextCursor=result.nextCursor;await openNotice({page:'notifications'});}finally{if(target.isConnected)target.disabled=false}
   return true;
  }
  if(target.dataset.opsSelectInspector){
   const dialog=document.querySelector('#ops-inspector-modal');if(!dialog)return true;
   dialog.querySelector('[name="workerId"]').value=target.dataset.opsSelectInspector;
   dialog.querySelector('#ops-inspector-name').textContent=target.querySelector('b')?.textContent||'Vistoriador';
   dialog.showModal();dialog.querySelector('[name="destinationId"]').focus();return true;
  }
  if(target.hasAttribute('data-ops-close-inspector')){document.querySelector('#ops-inspector-modal')?.close();return true;}
  if(target.dataset.opsSelectWorker){
   const dialog=document.querySelector('#ops-dispatch-modal');
   if(!dialog)return true;
   dialog.querySelector('[name="workerId"]').value=target.dataset.opsSelectWorker;
   dialog.querySelector('#ops-dispatch-worker-label').textContent=target.querySelector('b')?.textContent||'Vigia selecionado';
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
   await api('/notifications/'+n.id+'/read',{method:'POST'});
   n.read_at=Date.now();unreadTotal=Math.max(0,unreadTotal-1);document.querySelector('#ops-priority-toast')?.remove();
   await openNotice(n.event_id?{eventId:n.event_id}:{page:n.dispatch_id?'dispatches':'notifications'});
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
  if(form.id==='ops-inspector-form'){
   const data=Object.fromEntries(new FormData(form));
   if(!data.workerId||!data.destinationId)throw Error('Selecione profissional e destino autorizado.');
   await api('/dispatches',{method:'POST',data});
   document.querySelector('#ops-inspector-modal')?.close();
   flash('Vistoriador despachado para o local selecionado.');await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(form.id!=='ops-dispatch-form')return false;
  const data=Object.fromEntries(new FormData(form));
  await api('/dispatches',{method:'POST',data});
  document.querySelector('#ops-dispatch-modal')?.close();
  flash('Despacho registrado. Vigia e administração notificados.');
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
 return {refresh,allowed,badge,summary:()=>treatmentSummary,attention:()=>attention,assignmentBanner,present,connectLive,stopLive,notificationsView,dispatchesView,vigilanteDispatches,permissionsView,click,submit,change,unread,monitoringData:()=>({availability:[...availability,...inspectors],dispatches}),activeInspection:()=>dispatches.find(d=>d.kind==='vistoria'&&d.started_at&&!d.completed_at)||null};
}
