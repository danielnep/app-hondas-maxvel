/* UI da central COI: notificações, despachos e permissões com dados do servidor. */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não informado';
const labels={mapa:'Mapa e painel de monitoramento',rondas:'Consulta a rondas e vigias',despachos:'Despacho sob demanda',ocorrencias:'Tratamento de ocorrências',alertas:'Alertas e e-mails',relatorios:'Relatórios e exportações'};
const activeKinds=new Set(['panic','incident','alert','gps_issue','route_deviation','patrol_incomplete','patrol_interrupted','forwarded','dispatch','message']);
export function createOpsCenterUI({api,flash,openNotice}){
 let notifications=[],dispatches=[],modules=[],current=null,seen=new Set(),lastReminder=0;
 const manager=()=>['admin','master'].includes(current?.role);
 const reviewer=()=>['admin','master','operador','coi'].includes(current?.role);
 const allowed=key=>manager()||!!modules.find(x=>x.module===key)?.enabled;
 const unread=()=>notifications.filter(x=>!x.read_at);
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
  const pending=unread().filter(x=>activeKinds.has(x.kind));
  if(pending.length&&Date.now()-lastReminder>=60*60000){
   lastReminder=Date.now();
   showPopup(pending[0],true);
  }
 }
 async function refresh(user,withPopup=true){
  current=user;
  const requests=[api('/notifications')];
  if(reviewer()){
   requests.push(api('/coi-permissions'));
   requests.push(api('/dispatches'));
  }else if(user.role==='ronda'){
   requests.push(Promise.resolve(null));
   requests.push(api('/dispatches'));
  }
  const results=await Promise.allSettled(requests);
  if(results[0].status==='fulfilled')notifications=results[0].value.notifications||[];
  if(reviewer()&&results[1]?.status==='fulfilled')modules=results[1].value.modules||[];
  if(results[2]?.status==='fulfilled')dispatches=results[2].value.dispatches||[];
  if(withPopup)present();
 }
 function badge(){
  const count=unread().length;
  return '<button type="button" data-ops-page="notifications" class="ops-notification-bell" aria-label="Abrir notificações, '+count+' não lidas">🔔 <span>Notificações</span>'+(count?'<b class="ops-notification-count">'+count+'</b>':'')+'</button>';
 }
 function cards(){
  return notifications.slice(0,100).map(n=>'<button type="button" class="ops-notification-row '+(!n.read_at?'is-unread':'')+'" data-ops-notification="'+esc(n.id)+'"><span class="ops-notice-dot '+esc(n.kind)+'"></span><span><strong>'+esc(n.title)+'</strong><small>'+esc(n.body)+'</small><small>'+stamp(n.created_at)+(n.read_at?' · Visualizada':' · NOVA')+'</small></span><b aria-hidden="true">↗</b></button>').join('');
 }
 function notificationsView(){
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">ALERTAS OPERACIONAIS</div><h1>Notificações</h1><p class="muted">Avisos registrados, com destinatário, horário e estado de leitura.</p></div>'+badge()+'</header>'+
   '<section class="surface ops-notifications"><div class="toolbar"><h2>Caixa de entrada</h2><span class="pill warning">'+unread().length+' pendentes</span></div>'+
   (notifications.length?cards():'<p class="empty">Nenhuma notificação registrada.</p>')+'</section></section>';
 }
 function dispatchesView({users,rounds,events}){
  const active=new Set(rounds.filter(x=>x.status==='em_andamento').map(x=>x.userId));
  const vigias=users.filter(x=>x.role==='ronda').map(w=>{
   const latest=events.find(e=>e.user_id===w.id);
   const fresh=latest&&Date.now()-latest.occurred_at<=15*60000;
   const status=!w.active?'Fora de serviço':active.has(w.id)?'Em ronda':fresh?'Disponível':'Fora de serviço';
   return {...w,dispatchStatus:status,lastActivity:latest?.occurred_at};
  });
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">COI · MOVIMENTAÇÃO OPERACIONAL</div><h1>Despacho de vigias</h1><p class="muted">A disponibilidade utiliza atividade recente do dispositivo e a execução das rondas. Ausência de sinal não confirma presença.</p></div>'+badge()+'</header>'+
   '<section class="surface"><h2>Direcionar vigia disponível</h2><p class="muted">O despacho gera atribuição, notificação ao vigia, registro de auditoria e aviso à administração.</p>'+
   '<form id="ops-dispatch-form" class="ops-dispatch-form"><label>Vigia disponível<select name="workerId" required><option value="">Selecione um colaborador</option>'+
   vigias.map(w=>'<option value="'+esc(w.id)+'" '+(w.dispatchStatus!=='Disponível'?'disabled':'')+'>'+esc(w.name)+' · '+esc(w.dispatchStatus)+' · '+esc(w.site||'Sem posto')+'</option>').join('')+
   '</select></label><label>Destino / endereço<input name="address" required minlength="5" maxlength="350" placeholder="Endereço ou ponto de referência"></label>'+
   '<label class="ops-reason">Motivo obrigatório do despacho<textarea name="reason" required minlength="10" maxlength="1000" placeholder="Descreva a necessidade operacional e o que deverá ser verificado"></textarea></label>'+
   '<button class="primary" '+(!vigias.some(w=>w.dispatchStatus==='Disponível')?'disabled':'')+'>Confirmar e notificar o vigia</button></form></section>'+
   '<section class="surface"><h2>Estado dos vigias</h2><div class="ops-worker-list">'+vigias.map(w=>'<div class="ops-worker-row"><b>'+esc(w.name)+'</b><span class="ops-worker-status '+(w.dispatchStatus==='Disponível'?'ready':w.dispatchStatus==='Em ronda'?'busy':'off')+'">'+w.dispatchStatus+'</span><small>'+esc(w.site||'Posto não definido')+' · Última atividade: '+stamp(w.lastActivity)+'</small></div>').join('')+'</div></section>'+
   '<section class="surface"><h2>Despachos recentes</h2>'+dispatchList()+'</section></section>';
 }
 function dispatchList(){
  if(!dispatches.length)return '<p class="empty">Nenhum despacho registrado.</p>';
  return '<div class="ops-dispatch-list">'+dispatches.slice(0,60).map(d=>
   '<article class="ops-dispatch-line"><div><b>'+esc(d.worker||'Vigia')+'</b><span class="pill '+(d.acknowledged_at?'ok':'warning')+'">'+(d.acknowledged_at?'Recebido':'Aguardando confirmação')+'</span></div><strong>'+esc(d.address)+'</strong><p>'+esc(d.reason)+'</p><small>'+stamp(d.created_at)+' · Operador: '+esc(d.author||'Não informado')+'</small>'+
   (current?.role==='ronda'&&!d.acknowledged_at?'<button type="button" data-ops-ack="'+esc(d.id)+'">Confirmar recebimento</button>':'')+'</article>').join('')+'</div>';
 }
 function vigilanteDispatches(){
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">NOVAS ATRIBUIÇÕES</div><h1>Minhas rondas adicionais</h1><p class="muted">Confira os endereços encaminhados pela central antes de iniciar a tarefa.</p></div>'+badge()+'</header><section class="surface">'+dispatchList()+'</section></section>';
 }
 function permissionsView(){
  if(!manager())return '<div class="empty">Somente administração pode alterar permissões.</div>';
  return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">ADMINISTRAÇÃO · CONTROLES</div><h1>Permissões do COI</h1><p class="muted">O painel COI e Monitoramento representa a mesma equipe. Cada módulo é habilitado de fábrica e pode ser alterado individualmente. O servidor também verifica a autorização.</p></div></header>'+
   '<section class="surface"><h2>Módulos de operação</h2><div class="permission-list">'+permissionRows()+'</div></section></section>';
 }
 async function click(target){
  if(target.dataset.opsPage){openNotice({page:target.dataset.opsPage});return true;}
  if(target.dataset.opsAck){
   await api('/dispatches/'+target.dataset.opsAck+'/ack',{method:'POST'});flash('Recebimento registrado.');await refresh(current,false);openNotice({page:'dispatches'});return true;
  }
  if(target.dataset.opsNotification){
   const n=notifications.find(x=>x.id===target.dataset.opsNotification);if(!n)return true;
   await api('/notifications/'+n.id+'/read',{method:'POST'});
   n.read_at=Date.now();document.querySelector('#ops-priority-toast')?.remove();
   openNotice(n.event_id?{eventId:n.event_id}:{page:n.dispatch_id?'dispatches':'notifications'});
   return true;
  }
  return false;
 }
 async function submit(form){
  if(form.id!=='ops-dispatch-form')return false;
  const data=Object.fromEntries(new FormData(form));
  await api('/dispatches',{method:'POST',data});
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
 return {refresh,allowed,badge,present,notificationsView,dispatchesView,vigilanteDispatches,permissionsView,click,submit,change,unread};
}
