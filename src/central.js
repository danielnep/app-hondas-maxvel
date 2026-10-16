import {createInternalChatUI} from './internal-chat-ui.js';
import {createChatCalls} from './internal-chat-calls.js';
import {createActivityHistoryUI} from './activity-history-ui.js';
import {EVENT_TYPES,typeInfo,isPending,stateLabel} from './treatment-policy.js';
import {createXlsxReport} from './report-xlsx.js';
import {createRouteBoard} from './route-board.js';
import {openConclusionDialog} from './conclusion-dialog.js';
import {createOpsCenterUI} from './ops-center-ui.js';
import {createCoiMonitor} from './coi-monitor.js';
import {createMediaCapture,evidenceButtons} from './media-capture.js';
import {createFieldTorch} from './field-torch.js';
const root=document.querySelector('#central-root'),exit=document.querySelector('#exit'),roleTag=document.querySelector('#current-role'),notice=document.querySelector('#notice');
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'Não informado';
const id=x=>escape(x);
const friendly={message:'Mensagem à central',panic:'Pânico',gps:'Posição GPS',battery:'Bateria',incident:'Ocorrência',checkpoint:'Ponto',alert:'Alerta por e-mail',gps_issue:'Falha GPS',route_deviation:'Possível desvio',patrol_start:'Início da ronda',patrol_end:'Término',inspection:'Vistoria de qualidade',patrol_interrupted:'Ronda interrompida',patrol_incomplete:'Ronda incompleta'};
let composeKind='message';
const coi=createCoiMonitor();
let token=sessionStorage.getItem('rondaspro_api_token')||'',account=null,page='dashboard',events=[],users=[],dashboard=null,mySummary=null,rounds=[],routes=[],templates=[],selected=null,messages=[],media=[],emailJobs=[],recentMediaUrls=[],treatments=[];
let treatmentTab='incident',treatmentRows=[],treatmentMore=false,treatmentOffset=0,eventHistory=[],detailOrigin='events',claimedEvent=null,remoteSyncing=false;
const claimSession=sessionStorage.getItem('rondaspro-treatment-session')||crypto.randomUUID();
sessionStorage.setItem('rondaspro-treatment-session',claimSession);
let occurrenceFilters={status:'pending',kind:'all',worker:'all',reviewer:'all',dateFrom:'',dateTo:'',query:''};
const chat=createInternalChatUI({api,flash,getAccount:()=>account,navigate:next=>{selected=null;page=next;render();requestAnimationFrame(()=>void chat.mount())}});
const calls=createChatCalls({api,flash,chat,getAccount:()=>account});
const activity=createActivityHistoryUI({api,flash,openEvent:async id=>{await openEvent(id,'activity-history')}});
let latestActivity='';
const roles={ronda:'Vigia',operador:'Monitoramento',coi:'COI',admin:'Administrador',master:'Master',cliente:'Cliente',vistoriador:'Vistoriador'};
function flash(text){notice.textContent=text;notice.classList.add('visible');setTimeout(()=>notice.classList.remove('visible'),4800)}
const torch=createFieldTorch({notify:flash});
const inspectorCapture=createMediaCapture({notify:flash});let inspectorEvidence=[],inspectorProof={photo:null,selfie:null},pendingInspectionCommit=null,fieldMessageEvidence=[];
async function api(path,{method='GET',data,headers={},raw}={}){
 const res=await fetch('/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!raw&&data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:raw??(data===undefined?undefined:JSON.stringify(data))});
 if(!res.ok){let msg='Falha HTTP '+res.status;try{msg=(await res.json()).error||msg}catch{}const error=new Error(msg);error.status=res.status;throw error}
 return res.headers.get('content-type')?.includes('application/json')?res.json():res.blob();
}
const privileged=()=>account&&['admin','master'].includes(account.role);
const review=()=>account&&['operador','coi','admin','master'].includes(account.role);
const ops=createOpsCenterUI({api,flash,onUpdate:syncOperational,openNotice:async({page:nextPage,eventId}={})=>{
 if(eventId){await openEvent(eventId,'notifications');return;}
 if(nextPage){await releaseTreatment();selected=null;page=nextPage;render();}
}});
const routeBoard=createRouteBoard({api,getContext:()=>({users,rounds,events,routes,account}),redraw:async(loadRemote=false)=>loadRemote?await load():render(),notify:flash});
const actionGlyph={
 alert:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 9 16H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
 incident:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></svg>',
 message:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 10h8M8 13h6"/></svg>'
};
const composerActions=[['alert','Enviar alerta'],['incident','Registrar ocorrência'],['message','Enviar mensagem']];
function composeActionButtons(){
 return '<div class="central-quick-actions" role="group" aria-label="Comunicação com a central">'+
  composerActions.map(([kind,label])=>'<button type="button" class="central-quick-action '+(page==='send'&&composeKind===kind?'selected':'')+'" data-compose="'+kind+'" aria-pressed="'+(page==='send'&&composeKind===kind)+'">'+actionGlyph[kind]+'<span>'+label+'</span></button>').join('')+'</div>';
}
async function eventTelemetry(){
 const context={};
 try{if(navigator.getBattery){const reading=await navigator.getBattery();if(Number.isFinite(reading?.level))context.battery=Math.round(reading.level*100)}}catch{}
 try{
  const permission=await navigator.permissions?.query({name:'geolocation'});
  if(permission?.state==='granted'&&navigator.geolocation){
   const fix=await new Promise(resolve=>navigator.geolocation.getCurrentPosition(resolve,()=>resolve(null),{maximumAge:90000,timeout:1200,enableHighAccuracy:false}));
   if(fix&&Number.isFinite(fix.coords.latitude)&&Number.isFinite(fix.coords.longitude))
    context.position={lat:fix.coords.latitude,lng:fix.coords.longitude,accuracy:fix.coords.accuracy};
  }
 }catch{}
 return context;
}

function pendingDot(scope,count){return '<span class="rp-pending-dot" data-pending-scope="'+escape(scope)+'" '+(!count?'hidden':'')+' aria-label="Há pendências operacionais"></span>';}
function updatePendingIndicators(){
 const summary=ops.summary();
 for(const node of document.querySelectorAll('[data-pending-scope]')){
  const key=node.dataset.pendingScope;
  const count=key==='notifications'?ops.attention():key==='total'?summary.total:summary.categories.find(c=>c.kind===key)?.pending||0;
  node.hidden=!count;
 }
}
async function readTreatmentRows(more=false){
 const offset=more?treatmentOffset:0;
 const result=await api('/treatment-records?kind='+encodeURIComponent(treatmentTab)+'&offset='+offset);
 treatmentRows=more?[...new Map([...treatmentRows,...result.events].map(e=>[e.id,e])).values()]:result.events;
 treatmentMore=result.hasMore;treatmentOffset=result.nextOffset;
}
async function releaseTreatment(){
 if(!claimedEvent)return;
 const key=claimedEvent;claimedEvent=null;
 try{await api('/events/'+key+'/release',{method:'POST',data:{claimSession}})}catch(error){flash('Não foi possível liberar agora. A reserva expira automaticamente.');}
}
async function openEvent(key,origin=page){
 if(selected?.event?.id!==key)await releaseTreatment();
 if(review()){
  const result=await api('/events/'+key);selected={event:result.event};eventHistory=result.treatments;
 }else{
  const result=await api('/activity/events/'+encodeURIComponent(key));selected={event:result.event};
 }
 detailOrigin=origin;page='events';render();
 const linked=ops.unread().filter(n=>n.event_id===key);for(const n of linked)await api('/notifications/'+n.id+'/read',{method:'POST'});if(linked.length)await ops.refresh(account,false);
}
async function syncOperational({remote=false}={}){
 updatePendingIndicators();
 if(!remote||!account||remoteSyncing)return;
 remoteSyncing=true;
 try{
  if(selected?.event&&review()){
   const key=selected.event.id,result=await api('/events/'+key);
   if(selected?.event?.id!==key)return;
   selected={event:result.event};eventHistory=result.treatments;
   // Atualizar os avisos sem apagar respostas ou conclusões em edição.
   const busy=isPending(result.event)&&(document.querySelector('.conclusion-overlay')||Array.from(document.querySelectorAll('#send-message textarea')).some(el=>el.value.trim()));
   if(!busy){if(!isPending(result.event))document.querySelector('.conclusion-overlay')?.remove();render();}
   else{
    void loadMessages(key);
    const status=document.querySelector('[data-event-operational-status]');if(status)status.textContent=stateLabel(result.event);
    const feedback=document.querySelector('[data-live-treatment-state]');if(feedback)feedback.textContent=result.event.status==='resolvida'?'Este registro foi concluído em outra sessão. O texto em edição foi preservado.':result.event.treatment_owner?'Atendimento: '+result.event.treatment_owner:'';
   }
  }else if(selected?.event&&!review()){const result=await api('/activity/events/'+encodeURIComponent(selected.event.id));selected={event:result.event};if(!document.querySelector('#send-message textarea')?.value.trim()||!isPending(result.event))render();else void loadMessages(result.event.id);}
  else if(page==='history'){const result=await api('/events?limit=500');events=result.events||[];render();}
  else if(page==='treatments'&&review()){await readTreatmentRows();render();}
  else if(page==='notifications'){
   const host=document.querySelector('.ops-inbox-3');
   if(host){const holder=document.createElement('div');holder.innerHTML=ops.notificationsView();host.replaceWith(holder.firstElementChild);}
  }
 }catch(error){flash('Sincronização pendente: '+error.message)}finally{remoteSyncing=false;updatePendingIndicators();}
}
function treatmentActions(e){
 const active=claimedEvent===e.id&&e.treatment_locked&&e.treatment_owner_id===account.id;
 const absence=privileged()&&isPending(e)&&!e.coi_treated?'<p class="rp-coi-missing">Sem tratativa pelo COI</p>':'';
 const history=eventHistory.map(t=>'<li><strong>'+escape(t.concluded_by)+' · '+escape(roles[t.author_role]||t.author_role)+'</strong><small>'+fmt(t.created_at)+' · '+escape(t.to_status)+'</small><p>'+escape(t.conclusion)+'</p></li>').join('');
 const actions=!isPending(e)?'<p>Tratativa concluída. Consulte as ações e o histórico abaixo.</p>':active?
  '<div class="row treatment-actions" role="group" aria-label="Opções de tratamento"><button type="button" data-review-status="em_analise">Registrar análise</button>'+(!privileged()?'<button type="button" data-review-status="encaminhada">Encaminhar ao administrativo</button>':'')+'<button type="button" class="primary" data-review-status="resolvida">Concluir tratativa</button><button type="button" data-release-treatment>Liberar atendimento</button></div>':
  e.can_treat?'<button type="button" class="primary" data-claim-treatment>'+ (privileged()?'Realizar tratativa':'Iniciar ou continuar tratativa')+'</button>':
  '<p>'+(e.treatment_owner?'Em atendimento por '+escape(e.treatment_owner)+'.':'Acompanhe o tratamento registrado pelo COI. Registros encaminhados ficam disponíveis à Administração.')+'</p>';
 return '<section class="surface no-print" data-treatment-panel><h2>Tratativa operacional</h2><p>Responsável pela providência: <strong>'+escape(active?account.name:eventHistory[0]?.concluded_by||e.treatment_owner||'Aguardando atendimento')+'</strong></p>'+absence+'<p data-live-treatment-state role="status"></p>'+actions+'</section><section class="surface"><h2>Histórico de tratativas</h2>'+(history?'<ol class="rp-treatment-history">'+history+'</ol>':'<p>Nenhuma tratativa registrada.</p>')+'</section>';
}
function loginView(error=''){
 roleTag.textContent='';exit.hidden=true;
 root.innerHTML='<form id="central-login" class="login"><h1>Central operacional</h1><p>Área com autenticação própria para a operação real. O perfil de demonstração do site não libera acesso a estes registros.</p>'+
  (error?'<p class="flag">'+escape(error)+'</p>':'')+
  '<label>E-mail<input type="email" name="email" autocomplete="username" required></label>'+
  '<label>Senha<input type="password" name="password" autocomplete="current-password" required minlength="12"></label>'+
  '<button class="primary">Entrar com segurança</button></form>';
}
async function load(){
 if(!token){loginView();return}
 try{
  account=(await api('/me')).user;roleTag.textContent=roles[account.role]||account.role;exit.hidden=false;
  const previousRole=root.dataset.loadedRole;
  if(previousRole!==account.role){
   page=['operador','coi'].includes(account.role)?'monitor':account.role==='cliente'?'client':account.role==='vistoriador'?'inspections':'dashboard';selected=null;root.dataset.loadedRole=account.role;
   const requestedCompose=location.hash.slice(1);
   if(['admin','master'].includes(account.role)&&requestedCompose==='routes'){
    page='routes';history.replaceState(null,'',location.pathname+location.search);
   }
   if(requestedCompose==='history'&&['ronda','vistoriador'].includes(account.role)){page='history';history.replaceState(null,'',location.pathname+location.search);}
   if(requestedCompose==='chat'){page='chat';history.replaceState(null,'',location.pathname+location.search);}
   if(account.role==='ronda'&&['alert','incident','message'].includes(requestedCompose)){
    composeKind=requestedCompose;page=requestedCompose==='message'?'chat':'send';history.replaceState(null,'',location.pathname+location.search);
   }
  }
  if(['ronda','vistoriador'].includes(account.role))try{const context=await eventTelemetry();await api('/presence',{method:'POST',data:{position:context.position||null}})}catch{}
  await ops.refresh(account,false);
  await chat.refresh();
  if(page==='activity-history')await activity.refresh();
  if(['monitor','dashboard'].includes(page)&&review()&&ops.allowed('rondas'))latestActivity=await activity.latestHtml();
  const [e,r,planned]=await Promise.allSettled([review()&&!ops.allowed('ocorrencias')?Promise.resolve({events:[]}):api('/events?limit=500'),api('/rounds'),review()&&!ops.allowed('rondas')?Promise.resolve({routes:[]}):api('/routes')]);
  events=e.status==='fulfilled'?e.value.events||[]:[];rounds=r.status==='fulfilled'?r.value.rounds||[]:[];routes=planned.status==='fulfilled'?planned.value.routes||[]:[];
  if(selected?.event)selected={event:events.find(record=>record.id===selected.event.id)||selected.event};
  if(review()){
   const results=await Promise.allSettled([ops.allowed('mapa')?api('/dashboard'):Promise.resolve(null),ops.allowed('rondas')?api('/users'):Promise.resolve({users:[]}),ops.allowed('alertas')?api('/email-jobs'):Promise.resolve({jobs:[]}),api('/templates'),ops.allowed('ocorrencias')?api('/event-treatments?limit=1500'):Promise.resolve({treatments:[]})]);
   const val=i=>results[i].status==='fulfilled'?results[i].value:null;
   dashboard=val(0);users=val(1)?.users||[];emailJobs=val(2)?.jobs||[];templates=val(3)?.templates||[];treatments=val(4)?.treatments||[];mySummary=null;
  }else if(account.role==='ronda'){
   const [sum,t]=await Promise.all([api('/my-summary'),api('/templates')]);
   mySummary=sum;templates=t.templates||[];dashboard=null;users=[];emailJobs=[];
  }else{
   mySummary=null;dashboard=null;users=[];emailJobs=[];templates=[];
  }
  if(selected?.event&&review()){const detail=await api('/events/'+selected.event.id);selected={event:detail.event};eventHistory=detail.treatments;}
  if(page==='treatments'&&review())await readTreatmentRows();
  render();ops.present();ops.connectLive(token);
 }catch(err){if(err.status===401||err.status===403){sessionStorage.removeItem('rondaspro_api_token');token='';account=null;chat.reset();calls.reset();activity.reset(true);document.querySelector('[data-operational-header]')?.remove();root.dataset.loadedRole='';loginView(err.message)}else if(account){flash('Não foi possível atualizar agora: '+err.message)}else loginView('Serviço indisponível: '+err.message)}
}
const roleMenus={
 ronda:[['dashboard','Minha ronda','◉'],['dispatches','Atribuições','⌖'],['notifications','Eventos','✉'],['history','Meus alertas e ocorrências','▤'],['send','Comunicar à central','✉'],['guide','Guia completo','?']],
 operador:[['monitor','COI · Acompanhamento','◉'],['treatments','Histórico concluído','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['routes','Rotas por vigia','⌖'],['events','Eventos pendentes','!'],['team','Vigias','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 coi:[['monitor','COI · Acompanhamento','◉'],['treatments','Histórico concluído','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['routes','Rotas por vigia','⌖'],['events','Eventos pendentes','!'],['team','Vigias','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 admin:[['dashboard','Indicadores','▥'],['monitor','COI · Acompanhamento','◉'],['treatments','Histórico concluído','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['permissions','Permissões COI','⚙'],['routes','Rotas por vigia','⌖'],['events','Eventos pendentes','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 master:[['dashboard','Indicadores','▥'],['monitor','COI · Acompanhamento','◉'],['treatments','Histórico concluído','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['permissions','Permissões COI','⚙'],['routes','Rotas por vigia','⌖'],['events','Eventos pendentes','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 cliente:[['client','Meu acompanhamento','◉'],['guide','Guia completo','?']],
 vistoriador:[['history','Meus alertas e ocorrências','▤'],['inspections','Vistorias e qualidade','▤'],['dispatches','Meus despachos','⌖'],['notifications','Eventos','✉'],['send','Comunicar COI','✉'],['guide','Guia completo','?']]
};
for(const entries of Object.values(roleMenus)){entries.push(['chat','Chat interno','✉']);if(!entries.some(e=>e[0]==='activity-history'))entries.push(['activity-history','Histórico de rondas','▤']);}

const rp2Priority={
 ronda:['dashboard','dispatches','notifications','send'],
 operador:['monitor','treatments','notifications','dispatches'],
 coi:['monitor','treatments','notifications','dispatches'],
 admin:['dashboard','monitor','treatments','notifications'],
 master:['dashboard','monitor','treatments','notifications'],
 cliente:['client'],
 vistoriador:['inspections','dispatches','notifications','send']
};
const rp2GlyphPaths={
 chat:'<path d="M4 5h16v13H9l-5 4V5z"/><path d="M8 10h8M8 14h6"/>',
 dashboard:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
 monitor:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="12" width="4" height="8" rx="2"/><rect x="18" y="12" width="4" height="8" rx="2"/><path d="M20 19a5 5 0 0 1-5 3h-3"/>',
 treatments:'<rect x="5" y="3" width="14" height="19" rx="2"/><path d="M9 3V2h6v2M8 12l2.5 2.5L16 9M9 18h6"/>',
 dispatches:'<path d="m3 7 8-4 10 6-8 4zM3 7v10l10 5V13M13 22l8-5V9"/>',
 notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10M10 21h4"/>',
 history:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
 send:'<path d="M3 11 21 3l-7 18-3-8-8-2zM11 13l10-10"/>',
 guide:'<circle cx="12" cy="12" r="9"/><path d="M10 9a2.5 2.5 0 0 1 5 1c0 2-3 2-3 4M12 17h.01"/>',
 routes:'<path d="M3 6 9 3l6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15"/>',
 events:'<path d="m12 3 10 18H2zM12 9v5M12 18h.01"/>',
 team:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3zM17 7a3 3 0 0 1 0 6M18 16a4 4 0 0 1 3 4"/>',
 alerts:'<path d="M3 6h18v12H3zM3 7l9 7 9-7"/>',
 export:'<path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3"/>',
 permissions:'<circle cx="8" cy="10" r="4"/><path d="M12 10h9v3h-3v3h-3v-3h-3"/>',
 inspections:'<rect x="5" y="3" width="14" height="19" rx="2"/><path d="M9 3V2h6v2M9 10l2 2 4-4M9 17h6"/>',
 client:'<path d="M3 20V6l9-4 9 4v14H3zM9 20v-7h6v7M8 8h.01M16 8h.01"/>'
};
const rp2Glyph=key=>'<svg viewBox="0 0 24 24" class="rp2-nav-svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(rp2GlyphPaths[key]||rp2GlyphPaths.guide)+'</svg>';
function nav(){
 const role=account.role,permitted=(roleMenus[role]||[]).filter(([key])=>!review()||!({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'}[key])||ops.allowed(({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[key]));
 const priority=rp2Priority[role]||[];
 const primaries=permitted.filter(([key])=>priority.includes(key));
 const secondary=permitted.filter(([key])=>!priority.includes(key));
 const node=([key,label])=>'<button type="button" data-page="'+key+'" class="rp2-nav-item '+(page===key?'active':'')+'"'+(page===key?' aria-current="page"':'')+'>'+rp2Glyph(key)+'<span>'+escape(label)+'</span>'+(key==='treatments'?pendingDot('total',ops.summary().total):key==='notifications'?pendingDot('notifications',ops.attention()):'')+'</button>';
 const moreActive=secondary.some(([key])=>key===page);
 const wide=typeof window!=='undefined'&&window.matchMedia('(min-width:761px)').matches;
 return '<nav id="central-navigation" class="side rp2-role-nav" aria-label="Navegação do '+escape(roles[role])+'">'+
  '<span class="rp2-nav-eyebrow">TRABALHO · '+escape(roles[role])+'</span>'+
  '<div class="rp2-nav-primary">'+primaries.map(node).join('')+'</div>'+
  (secondary.length?'<details class="rp2-nav-secondary" '+(wide||moreActive?'open':'')+'><summary>Mais áreas <span aria-hidden="true">'+(moreActive?'●':'⌄')+'</span></summary><div class="rp2-nav-secondary-items">'+secondary.map(node).join('')+'</div></details>':'')+
  '</nav>';
}
function kpis(){
 const kinds=Object.fromEntries((dashboard?.metrics||[]).map(x=>[x.kind,x.count]));
 return '<div class="cards">'+[['Eventos',events.length],['Pânicos',kinds.panic||0],['Ocorrências',kinds.incident||0],['Amostras GPS',kinds.gps||0],['Alertas de e-mail',kinds.alert||0],['Baterias monitoradas',kinds.battery||0]].map(([label,num])=>'<div class="metric"><strong>'+num+'</strong><span>'+label+'</span></div>').join('')+'</div>';
}
function dashboardView(){
 const open=events.filter(e=>['panic','incident','gps_issue','route_deviation'].includes(e.kind)&&e.status!=='resolvida');
 const active=rounds.filter(r=>r.status==='em_andamento');
 const totalKm=rounds.reduce((n,r)=>n+(r.km||0),0);
 const summary=[['Rondas',rounds.length],['Em andamento',active.length],['Pendências',open.length],['Distância registrada',totalKm.toFixed(2)+' km']];
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">GESTÃO E INDICADORES</div><h1>Painel administrativo</h1><p class="muted">Locais acompanhados: '+escape([...new Set(users.map(w=>w.site).filter(Boolean))].join(', ')||'Nenhum posto cadastrado')+'. Dados reais do banco operacional.</p></div><button data-refresh>Atualizar</button></div>'+
 '<div class="cards">'+summary.map(([label,value],i)=>'<div class="metric '+(i===2&&open.length?'urgent':'')+'"><strong>'+value+'</strong><span>'+label+'</span></div>').join('')+'</div>'+
 '<section class="surface"><div class="toolbar"><h2>Ocorrências que precisam de tratamento</h2><button data-page="events">Abrir todas</button></div>'+eventList(open.slice(0,6))+'</section>'+
 '<section class="surface"><div class="toolbar"><h2>Rondas recentes</h2><button data-page="team">Analisar colaboradores</button></div>'+roundTable(rounds.slice(0,7))+'</section>'+
 '<details class="details-toggle"><summary>Comparações, telemetria e indicadores adicionais</summary><div class="surface">'+kpis()+'<h2 style="margin-top:16px">Histórico geral</h2>'+roundTable(rounds.slice(0,30))+'</div></details></section>';
}
function ownDashboard(){
 const mine=mySummary||{},all=mine.rounds||rounds,activity=events.filter(e=>e.kind!=='gps'&&e.kind!=='battery');
 const open=activity.filter(e=>['incident','panic','alert','route_deviation','gps_issue'].includes(e.kind)&&e.status!=='resolvida');
 const latest=all.find(r=>r.status==='em_andamento')||all[0];
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">ACESSO DO VIGIA</div><h1>Minha ronda</h1><p class="muted">Bem-vindo, '+escape(account.name)+'. Aqui você acompanha somente seus registros.</p></div><button data-refresh>Atualizar</button></div>'+
 composeActionButtons()+'<div class="cards">'+[['Rondas',all.length],['Distância GPS',Number(mine.totalKm||0).toFixed(2)+' km'],['Alertas e ocorrências',activity.filter(e=>['alert','incident','message','gps_issue'].includes(e.kind)).length],['Pontos confirmados',activity.filter(e=>e.kind==='checkpoint').length]].map(([n,v])=>'<div class="metric"><strong>'+v+'</strong><span>'+n+'</span></div>').join('')+'</div>'+
 '<section class="surface"><div class="toolbar"><h2>Minha execução mais recente</h2><button data-page="history">Histórico completo</button></div>'+
 (latest?'<div class="detail-grid">'+[['Início',fmt(latest.start)],['Estado',latest.status.replaceAll('_',' ')],['Percorrido',latest.km.toFixed(2)+' km'],['Tempo em trajeto',latest.minutes==null?'Sem registro':latest.minutes+' min'],['Alertas',latest.alerts],['Pânico',latest.panics],['Bateria',latest.lastBattery==null?'Não informada':latest.lastBattery+'%']].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>':'<div class="empty">Nenhuma ronda real sincronizada para sua conta.</div>')+
 '</section><section class="surface"><div class="toolbar"><h2>Minhas ocorrências e mensagens</h2><button data-compose="alert">Enviar alerta</button></div>'+eventList(open.slice(0,6))+'</section>'+
 '<section class="surface"><h2>Registros recentes</h2>'+eventList(activity.slice(0,6))+'</section></section>';
}
function ownHistory(){
 const operational=events.filter(e=>!['gps','battery'].includes(e.kind));
 const telemetry=events.filter(e=>['gps','battery'].includes(e.kind));
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">MEUS DADOS</div><h1>Meu histórico</h1><p class="muted">Rondas, trajeto, tempo, observações, evidências, alertas, acionamentos de pânico e respostas.</p></div><button data-refresh>Atualizar</button></div>'+
 '<section class="surface"><h2>Resumo por ronda</h2>'+roundTable(rounds)+'</section>'+
 '<section class="surface"><h2>Ocorrências, pontos e comunicação</h2>'+eventList(operational)+'</section>'+
 '<details class="details-toggle"><summary>Ver histórico técnico completo · '+telemetry.length+' registros de GPS e bateria</summary><div class="surface">'+eventList(telemetry)+'</div></details>'+
 '<p class="muted">Distâncias são estimativas de amostras GPS confiáveis. O histórico remoto só mostra dados efetivamente sincronizados.</p></section>';
}
let operationalMap=null,miniMaps=[];
function resetOperationalMap(){
 if(operationalMap){try{operationalMap.remove()}catch{}operationalMap=null}
 for(const m of miniMaps)try{m.remove()}catch{}
 miniMaps=[];
}
function mountAgendaMaps(){
 const L=globalThis.L;if(!L)return;
 for(const node of document.querySelectorAll('[data-agenda-map]')){
  const route=routes.find(r=>r.id===node.dataset.agendaMap);
  const pts=(route?.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  if(!pts.length){node.innerHTML='<span>Rota sem coordenadas configuradas</span>';continue;}
  node.innerHTML='';
  const map=L.map(node,{zoomControl:false,scrollWheelZoom:false,dragging:false,touchZoom:false,
   doubleClickZoom:false,boxZoom:false,keyboard:false,attributionControl:false});
  miniMaps.push(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
  L.polyline(pts.map(p=>[p.lat,p.lng]),{color:'#38bdf8',weight:3,opacity:.85,interactive:false}).addTo(map);
  pts.forEach(p=>L.circleMarker([p.lat,p.lng],{radius:3,color:'#fafafa',fillColor:'#38bdf8',fillOpacity:1,weight:1,interactive:false}).addTo(map));
  if(pts.length===1)map.setView([pts[0].lat,pts[0].lng],17,{animate:false});
  else map.fitBounds(pts.map(p=>[p.lat,p.lng]),{padding:[12,12],maxZoom:17,animate:false});
 }
}
function mountOperationalMap(){
 mountAgendaMaps();
 const node=document.querySelector('#ops-live-map'),L=globalThis.L;if(!node||!L)return;
 resetOperationalMap();node.innerHTML='';
 const active=rounds.find(r=>r.status==='em_andamento'),planned=routes.find(r=>r.id===active?.routeId)||routes[0];
 const worker=active?users.find(w=>w.id===active.userId):null;
 const pts=(planned?.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 const map=L.map(node,{zoomControl:true,scrollWheelZoom:false});
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
 let bounds=[];
 if(pts.length){
  L.polyline(pts.map(p=>[p.lat,p.lng]),{color:'#7ac8e4',weight:4,opacity:.9}).addTo(map);
  pts.forEach((p,i)=>{L.circleMarker([p.lat,p.lng],{radius:6,color:'#d5effb',fillColor:'#7ac8e4',fillOpacity:1})
   .bindTooltip(String(i+1)+' · '+escape(p.name)).addTo(map);bounds.push([p.lat,p.lng])});
 }
 const track=(active?.track||[]).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
 if(track.length>1)L.polyline(track.map(x=>[x.lat,x.lng]),{color:'#10b981',weight:3,opacity:.8,dashArray:'6 5'}).addTo(map);
 const pos=active?.lastFix;
 if(pos&&Number.isFinite(pos.lat)&&Number.isFinite(pos.lng)){
  L.circleMarker([pos.lat,pos.lng],{radius:9,color:'#fff',weight:2,fillColor:'#10b981',fillOpacity:1}).bindTooltip('Último GPS: '+escape(worker?.name||'Vigia')).addTo(map);bounds.push([pos.lat,pos.lng]);
 }
 if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:17});else map.setView([-20.145,-44.89],12);
 operationalMap=map;setTimeout(()=>{try{map.invalidateSize()}catch{}},90);
}
function monitorView(){
 return '<div class="rp-monitor-cta"><button type="button" class="primary" data-page="dispatches">+ Solicitar vistoria</button><button type="button" data-page="events">Eventos pendentes</button></div>'+coi.render({account,rounds,events,routes,users,...ops.monitoringData()});
}
function monitorRows(rows){
 if(!rows.length)return '<div class="empty">Nenhuma ronda sincronizada até o momento.</div>';
 return '<div class="list">'+rows.map(r=>{
  const worker=users.find(w=>w.id===r.userId)?.name||'Colaborador';
  const age=r.lastFixAt?Date.now()-r.lastFixAt:Infinity;
  const signal=age<60000?'GPS recente':age<180000?'GPS desatualizado':'Sem GPS recente';
  const lastEvent=events.find(e=>e.round_id===r.id&&['panic','incident','alert','checkpoint'].includes(e.kind));
  return '<details class="details-toggle"><summary>'+escape(worker)+' · '+(r.status==='em_andamento'?'Em ronda':'Última ronda')+
  ' · '+escape(r.site||'Local não informado')+' · '+escape(roundStatus(r))+' · '+escape(signal)+'</summary><div class="surface"><div class="detail-grid">'+
  [['Local',r.site||'Posto não informado'],['Status',roundStatus(r)],['Percurso',routeCheck(r)],['Última posição',fmt(r.lastFixAt)],['Distância',r.km.toFixed(2)+' km'],['Em trajeto',r.minutes==null?'—':r.minutes+' min'],['Bateria',r.lastBattery==null?'—':r.lastBattery+'%'],['Alertas',r.alerts],['Pânico',r.panics]].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>'+
  positionMap(r.lastFix)+
  (lastEvent?'<p class="row" style="margin-top:13px"><button data-event="'+escape(lastEvent.id)+'">Abrir registros e conversar</button></p>':'<p class="muted">Sem ocorrência ou ponto registrado para abrir conversa.</p>')+
  '</div></details>';
 }).join('')+'</div>';
}
function positionMap(fix){
 if(!fix||!Number.isFinite(fix.lat)||!Number.isFinite(fix.lng))return '<p class="muted">Mapa indisponível: sem coordenadas confiáveis recentes.</p>';
 const lat=fix.lat,lng=fix.lng,bbox=[lng-.007,lat-.005,lng+.007,lat+.005].join('%2C');
 const src='https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+lat+'%2C'+lng;
 return '<div class="event-map-wrap"><iframe class="event-map" loading="lazy" title="Última posição registrada no mapa" referrerpolicy="no-referrer" src="'+src+'"></iframe><a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=17/'+lat+'/'+lng+'">Abrir mapa ↗</a></div>';
}
function roundTable(rows){
 if(!rows.length)return '<div class="empty">Ainda não há rondas reais sincronizadas.</div>';
 return '<div class="list">'+rows.slice(0,30).map(r=>{
  const worker=users.find(w=>w.id===r.userId)?.name||'Colaborador';
  return '<div class="list-item"><span><b>'+escape(worker)+' · '+escape(r.id.slice(0,16))+'</b>'+
   '<small>'+escape(r.site||'Local não informado')+' · '+fmt(r.start)+' · '+escape(roundStatus(r))+'</small>'+
   '<small>'+escape(routeCheck(r))+' · GPS: '+r.gpsSamples+' amostras · '+r.rejectedGps+' descartadas</small></span>'+
   '<span style="text-align:right"><b>'+r.km.toFixed(2)+' km</b><small>'+(r.minutes??'—')+' min · '+r.checkpoints+' pontos</small>'+
   '<small>'+r.panics+' pânicos · '+r.alerts+' alertas · bateria '+(r.lastBattery??'—')+'%</small></span></div>';
 }).join('')+'</div>';
}
function eventList(rows){
 return rows.length?'<div class="list">'+rows.map(e=>'<button class="list-item" data-event="'+id(e.id)+'"><span><b>'+escape(friendly[e.kind]||e.kind)+'</b><small>'+fmt(e.occurred_at)+' · '+escape(e.description||'Sem descrição')+'</small></span><span data-event-operational-status class="pill '+(isPending(e)?'treatment-open':'treatment-resolved')+'">'+escape(e.status==='em_analise'?'Em aberto · Em análise':stateLabel(e))+'</span></button>').join('')+'</div>':'<div class="empty">Nenhum registro encontrado.</div>';
}
function treatmentsView(){
 const finished=events.filter(e=>!isPending(e)).sort((a,b)=>b.occurred_at-a.occurred_at);
 return '<section class="rp-coi-event-screen"><header class="rp-coi-section-header"><div><div class="eyebrow">CONSULTA E AUDITORIA</div><h1>Histórico de eventos concluídos</h1><p>Eventos finalizados, com responsáveis e respostas registrados. Esta tela é somente leitura.</p></div><button type="button" data-page="events">Ver pendências</button></header>'+
 '<section class="rp-coi-history"><div class="rp-history-count">'+finished.length+' evento(s) concluído(s)</div>'+
 (finished.length?finished.map(e=>'<button type="button" class="rp-finished-line" data-event="'+escape(e.id)+'"><span class="rp-finished-symbol">'+escape(typeInfo(e.kind).icon)+'</span><span><strong>'+escape(friendly[e.kind]||typeInfo(e.kind).label)+'</strong><small>'+escape(e.description||'Sem descrição')+'</small><small>'+escape(e.reporter_name||'Equipe de campo')+' · '+fmt(e.occurred_at)+'</small></span><b>Concluído</b></button>').join(''):'<p class="empty">Nenhum evento concluído neste período.</p>')+'</section></section>';
}
function eventsView(){
 const queue=events.filter(isPending).sort((a,b)=>b.occurred_at-a.occurred_at);
 const categories=[['panic','Pânicos'],['incident','Ocorrências'],['alert','Alertas'],['inspection','Vistorias'],['route_deviation','Desvios de rota'],['gps_issue','GPS']];
 const columns=categories.map(([kind,label])=>{
  const items=queue.filter(e=>e.kind===kind);
  return '<section class="rp-coi-event-column" data-column-kind="'+kind+'"><header><h2>'+label+'</h2><span>'+items.length+'</span></header><div class="rp-coi-event-list">'+(items.map(e=>'<button type="button" class="rp-coi-event-item" data-event="'+escape(e.id)+'"><span class="rp-coi-kind">'+escape(typeInfo(e.kind).icon)+'</span><strong>'+escape(e.description||label)+'</strong><small>'+escape(e.reporter_name||'Campo')+' · '+fmt(e.occurred_at)+'</small><em>'+escape(stateLabel(e))+'</em></button>').join('')||'<p class="rp-column-empty">Sem pendências</p>')+'</div></section>';
 }).join('');
 return '<section class="rp-coi-event-screen"><header class="rp-coi-section-header"><div><div class="eyebrow">COI · FILA DE ATENDIMENTO</div><h1>Eventos pendentes</h1><p>'+queue.length+' evento(s) aguardando providência. Cada tipo possui sua própria coluna.</p></div><button type="button" data-page="treatments">Histórico concluído</button></header><div class="rp-coi-event-columns">'+columns+'</div></section>';
}
function teamView(){
 return '<section class="stack"><h1>Equipe e indicadores individuais</h1><div class="surface"><div class="list">'+(dashboard?.team||[]).map(w=>'<button data-person="'+id(w.id)+'" class="list-item"><span><b>'+escape(w.name)+'</b><small>'+escape(w.description||'Descrição pendente')+'</small></span><span>'+Number(w.events||0)+' eventos · '+Number(w.panics||0)+' acionamentos</span></button>').join('')+'</div></div>'+
 (privileged()?'<form id="new-user" class="surface"><h2>Cadastrar membro da equipe</h2><p class="muted">Informe a descrição da supervisão sobre o vigia no cadastro. A descrição será armazenada no banco.</p><div class="grid"><label>Nome<input required name="name" minlength="2"></label><label>E-mail<input required type="email" name="email"></label><label>Perfil<select name="role"><option value="ronda">Vigia</option><option value="operador">Equipe interna</option><option value="coi">COI</option><option value="vistoriador">Vistoriador</option><option value="cliente">Cliente (consulta)</option><option value="admin">Administrador</option>'+(account.role==='master'?'<option value="master">Master</option>':'')+'</select></label><label>Telefone<input type="tel" name="phone" maxlength="35"></label><label>Local/posto vinculado<input name="site" maxlength="100" placeholder="Ex.: Unidade Centro"></label><label>Senha inicial (12+ caracteres)<input required name="password" minlength="12" type="password"></label></div><label>Descrição do supervisor sobre o colaborador<textarea name="description" placeholder="Resumo factual das atribuições, posto e orientações de acompanhamento" minlength="10"></textarea></label><button class="primary">Cadastrar</button></form>':'')+'</section>';
}
function personView(pid){
 const w=users.find(x=>x.id===pid),mine=events.filter(e=>e.user_id===pid);
 if(!w)return eventsView();
 return '<div class="stack"><div class="toolbar"><button data-page="team">← Voltar à equipe</button><h1>'+escape(w.name)+'</h1></div><section class="surface"><h2>Informações da supervisão</h2><p>'+escape(w.description||'Sem descrição cadastrada')+'</p><div class="cards">'+[['Eventos',mine.length],['Pânicos',mine.filter(e=>e.kind==='panic').length],['Ocorrências',mine.filter(e=>e.kind==='incident').length],['Alertas',mine.filter(e=>e.kind==='alert').length]].map(([x,y])=>'<div class="metric"><strong>'+y+'</strong><span>'+x+'</span></div>').join('')+'</div></section><section class="surface"><h2>Histórico individual (mais recente primeiro)</h2>'+eventList(mine)+'</section></div>';
}
function alertView(){
 const form=privileged()?'<form id="save-template" class="surface"><h2>Editar ou criar alerta</h2><div class="grid"><label>Identificador<input name="id" id="template-id" required pattern="[A-Za-z0-9_-]{3,70}"></label><label>Título<input name="title" id="template-title" required></label><label>Tipo<select name="trigger" id="template-trigger"><option value="manual">Manual</option><option value="automatic">Automático</option></select></label><label>Prioridade<select name="priority" id="template-priority"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label>Intervalo entre envios (min)<input name="cooldownMin" id="template-cooldown" type="number" min="0" max="10080" value="20" required></label><label>Assunto do e-mail<input name="subject" id="template-subject"></label></div><label><input name="enabled" type="checkbox" checked style="width:auto"> Modelo habilitado</label><label>Grupos de destinatários (marque um ou mais)</label><div class="row">'+[['supervisor','Supervisão'],['operations','Equipe interna'],['management','Gestão'],['master','Master']].map(([v,l])=>'<label><input type="checkbox" name="recipients" value="'+v+'" style="width:auto"> '+l+'</label>').join('')+'</div><label>Texto de acompanhamento<textarea name="message" id="template-message"></textarea></label><button class="primary">Salvar modelo</button></form><form id="recipient-form" class="surface"><h2>Destinatários de alertas</h2><div class="row"><label style="flex:1">E-mail<input type="email" name="email" required></label><label>Grupo<select name="groupName"><option value="supervisor">Supervisão</option><option value="operations">Equipe interna</option><option value="management">Gestão</option><option value="master">Master</option></select></label><button class="primary">Adicionar / ativar</button></div><p class="muted">O provedor de e-mail precisa estar configurado no servidor. Aceitação não garante leitura.</p></form>':'';
 return '<section class="stack"><h1>Alertas configuráveis</h1><section class="surface"><h2>Modelos predefinidos e personalizados</h2><div class="list">'+templates.map(t=>'<button class="list-item" data-template="'+id(t.id)+'"><span><b>'+escape(t.title)+'</b><small>'+escape(t.trigger)+' · '+escape(t.priority)+' · '+Number(t.cooldown_min)+' min</small></span><span class="pill">'+(t.enabled?'Ativo':'Desativado')+'</span></button>').join('')+'</div></section><section class="surface"><h2>Histórico de entrega de e-mails</h2><p class="muted">Aceito pelo provedor não significa que a mensagem foi lida.</p>'+emailHistory()+'</section>'+form+'</section>';
}
function emailHistory(){
 if(!emailJobs.length)return '<p class="empty">Nenhum e-mail solicitado neste banco.</p>';
 return '<div class="list">'+emailJobs.slice(0,60).map(job=>
  '<div class="list-item"><span><b>'+escape(job.description||job.kind)+'</b><small>'+fmt(job.at)+' · '+escape(job.event_id.slice(0,12))+'</small>'+
  (job.last_error?'<small class="flag">'+escape(job.last_error)+'</small>':'')+'</span><span class="row"><span class="pill">'+escape(job.status)+'</span>'+
  (privileged()&&job.status!=='accepted'?'<button data-retry-email="'+escape(job.event_id)+'">Reenviar</button>':'')+'</span></div>').join('')+'</div>';
}
function sendView(){
 const manual=templates.filter(t=>t.enabled&&t.trigger==='manual');
 const form=composeKind==='alert'
  ?'<form id="send-alert" class="surface stack"><h2>Enviar alerta à central</h2><p class="muted">Para situações que precisam de atenção. O evento é salvo no servidor; o envio de e-mail depende dos modelos e destinatários configurados.</p>'+
   (manual.length?'<label>Tipo de alerta<select name="templateId">'+manual.map(t=>'<option value="'+id(t.id)+'">'+escape(t.title)+'</option>').join('')+'</select></label>':'<p class="muted">Sem modelo de e-mail habilitado. O alerta ainda será registrado na central.</p>')+
   '<label>Descreva o alerta<input name="description" required minlength="3" maxlength="240" placeholder="O que aconteceu?"></label><button class="primary">Enviar alerta</button></form>'
  :composeKind==='incident'
   ?'<form id="register-incident" class="surface stack"><h2>Registrar ocorrência</h2><p class="muted">Documente um fato observado. Depois de registrar, você poderá adicionar evidências e acompanhar as respostas.</p><div class="field-composer-row"><label>Tipo<select name="category"><option>Segurança</option><option>Acesso</option><option>Patrimônio</option><option>Manutenção</option><option>Outros</option></select></label><label>Gravidade<select name="severity"><option>Baixa</option><option selected>Média</option><option>Alta</option></select></label></div><label>Assunto<input name="title" minlength="3" maxlength="100" required placeholder="Ex.: Acesso não autorizado"></label><label>Descrição<textarea name="description" required minlength="10" maxlength="1800" placeholder="Descreva o que aconteceu..."></textarea></label><button class="primary">Registrar ocorrência</button></form>'
   :'<form id="send-note" class="surface stack"><h2>Enviar mensagem à central</h2><p class="muted">Comunicação cotidiana, sem classificar automaticamente como emergência ou ocorrência.</p><label>Mensagem<textarea name="description" required minlength="3" maxlength="2000" placeholder="Escreva sua mensagem..."></textarea></label><div class="coi3-evidence-compose"><h3>Áudio ou registro de apoio</h3><p class="muted">Grave uma mensagem de voz, fotografe ou filme sem sair do aplicativo.</p>'+evidenceButtons()+'</div><button class="primary">Enviar mensagem e anexos</button></form>';
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">CONTATO OPERACIONAL</div><h1>Comunicar à central</h1><p class="muted">Escolha o tipo de comunicação. O botão de pânico permanece disponível para urgências.</p></div></div>'+composeActionButtons()+form+'</section>';
}
function exportView(){
 return '<div class="stack"><h1>Relatório inteligente</h1><div class="cards">'+[['Rondas',events.filter(e=>e.kind==='patrol_start').length],['Pânicos',events.filter(e=>e.kind==='panic').length],['Ocorrências',events.filter(e=>e.kind==='incident').length],['Registros GPS',events.filter(e=>e.kind==='gps').length]].map(([x,y])=>'<div class="metric"><strong>'+y+'</strong><span>'+x+'</span></div>').join('')+'</div><section class="surface"><h2>Exportar Excel completo</h2><p>O XLSX inclui uma primeira aba Dashboard formatada, seguida de abas com eventos e conversas. Os dados dependem dos registros efetivamente sincronizados.</p><div class="row"><button class="primary" id="download-xlsx">Baixar XLSX com abas</button><button id="download-json">Exportar JSON</button><button id="download-csv">Conversas CSV</button></div></section><section class="surface"><h2>Conversas em PDF</h2><p>Histórico com remetente, data e hora de cada mensagem. O navegador permite salvar como PDF.</p><button id="print-all-chats">Imprimir todas as conversas / PDF</button></section></div>';
}
function eventView(e){
 const back=account.role==='ronda'?'history':detailOrigin;
 const details=Array.isArray(e.details?.mediaIds)?e.details.mediaIds.length:0;
 return '<section class="stack" id="print-conversation">'+
 '<div class="toolbar"><div><button data-page="'+back+'" class="no-print">← Voltar</button><h1 style="margin-top:12px">'+escape(friendly[e.kind]||e.kind)+'</h1><p class="muted">'+fmt(e.occurred_at)+' · '+escape(e.id)+'</p></div><div class="row no-print"><button id="print-chat">Salvar conversa em PDF</button><button data-refresh>Atualizar</button></div></div>'+
 '<section class="surface"><div class="row" style="justify-content:space-between"><span data-event-operational-status class="pill '+(isPending(e)?'treatment-open':'treatment-resolved')+'">'+escape(e.status==='em_analise'?'Em aberto · Em análise':stateLabel(e))+'</span><small>'+escape(users.find(u=>u.id===e.user_id)?.name||account.name)+'</small></div><p style="font-size:14px;margin:14px 0">'+escape(e.description||'Sem descrição')+'</p>'+
 '<div class="detail-grid">'+[['Data e hora',fmt(e.occurred_at)],['Bateria',e.battery==null?'Não informada':e.battery+'%'],['Localização',Number.isFinite(e.lat)?'Disponível no mapa':'Indisponível'],['Status',e.status]].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>'+
 (Number.isFinite(e.lat)&&Number.isFinite(e.lng)?positionMap({lat:e.lat,lng:e.lng}):'<p class="muted">Sem geolocalização confiável anexada a este registro.</p>')+
 '</section>'+
 (e.kind==='panic'?'<section class="surface rp-panic-contact"><h2>Contato do profissional</h2><div data-panic-contact>Carregando telefone…</div></section>':'')+
 (review()?treatmentActions(e):'')+
  '<section class="surface"><h2>Anexos e evidências</h2><p class="muted">Fotos e vídeos enviados, com data, hora, localização disponível e bateria.</p><div id="evidence-list" class="photo-grid"></div>'+
 (!isPending(e)||account.role==='cliente'||review()&&!(claimedEvent===e.id&&e.treatment_locked&&e.treatment_owner_id===account.id)?'':'<form id="upload-evidence" class="row no-print"><label>Adicionar evidência<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/webm,audio/mp4,audio/ogg" name="file" required></label><button>Enviar mídia</button></form>')+'</section>'+
 '<section class="surface"><h2>Conversa e providências</h2><div id="thread" class="thread"></div>'+
 (!isPending(e)||account.role==='cliente'?'<p class="muted">Consulta do registro. Use o Chat interno para conversar com a equipe.</p>':review()&&!(claimedEvent===e.id&&e.treatment_locked&&e.treatment_owner_id===account.id)?'<p class="muted">Assuma a tratativa disponível para registrar respostas. Concluídas ficam somente para consulta.</p>':'<form id="send-message" class="stack no-print"><label>Responder<textarea name="body" required maxlength="4000" placeholder="Escreva a mensagem..."></textarea></label><div class="row">'+
 (review()?'<label>Tipo de mensagem<select name="audience"><option value="general">Resposta geral · vigia pode ler</option><option value="system">Resposta interna · somente equipe</option></select></label>':'')+
 '<button class="primary">Enviar resposta</button></div></form>')+'</section>'+
 '<details class="details-toggle"><summary>Dados técnicos completos</summary><div class="surface"><div class="detail-grid">'+
 [['Recebido no servidor',fmt(e.received_at)],['Precisão GPS',e.accuracy==null?'Não informada':e.accuracy+' m'],['Coordenadas',e.lat==null?'Indisponíveis':e.lat+', '+e.lng],['Ronda',e.round_id||'Sem vínculo'],['Arquivos associados',details]].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div></div></details></section>';
}

function routeCheck(r){
 const issue=events.filter(e=>e.round_id===r.id);
 if(issue.some(e=>e.kind==='route_deviation'))return 'Possível desvio · analisar';
 if(issue.some(e=>e.kind==='gps_issue'))return 'Falha técnica GPS';
 return r.gpsSamples?'Sem desvio registrado':'Sem GPS suficiente';
}
const roundStatus=r=>({em_andamento:'Em andamento',concluida:'Concluída',incompleta:'Incompleta',interrompida:'Interrompida',sem_inicio:'Sem início'})[r.status]||String(r.status||'Pendente').replaceAll('_',' ');
const guideByRole={
 ronda:[['Primeiro acesso','Confirme seu posto, faça a verificação do GPS e consulte os próximos pontos.'],['Execução','Siga a sequência obrigatória de pontos e registre evidências conforme solicitado.'],['Comunicação','Alertas, ocorrências e pânico ficam na área de comunicação com a central.'],['Histórico','Consulte suas rondas e os eventos sincronizados com data e hora.']],
 operador:[['Acompanhamento','Confira rondas ativas e concluídas, local, posição, GPS e bateria.'],['Ocorrências','Priorize avisos críticos e registre providências. Baixa precisão GPS não significa desvio comprovado.'],['Histórico','Abra cada vigia para consultar rondas anteriores.']],
 coi:[['Visão COI','Monitore simultaneamente rondas e vigias e abra os detalhes de cada execução.'],['Rotas por colaborador','Selecione o vigia e acompanhe cada rota em uma linha com mapa e detalhes. Crie novas rotas marcando pontos na ordem, com o posto vinculado.'],['Prioridades','Acompanhe pânicos, rondas incompletas e ocorrências em análise.'],['Histórico','Consulte últimos registros, mapa e horários disponíveis.'],['Tratamento','Registre respostas gerais e internas autorizadas na ocorrência.']],
 admin:[['Visão geral','Indicadores, prioridades, nome da unidade e operações registradas.'],['Rotas por colaborador','Selecione o vigia, consulte mapa e detalhes em linhas, veja rondas em andamento e histórico e crie rotas novas marcando os pontos no mapa.'],['Monitoramento','Abra o mapa, estado do GPS, vigias e últimas rondas.'],['Pessoas e locais','Cadastre os perfis e associe clientes, vigias e vistoriadores aos postos.'],['Tratamento','Analise ocorrências com histórico e mensagens.'],['Relatórios','Exporte XLSX, JSON e CSV, além de conversas em PDF.']],
 cliente:[['Local monitorado','O acesso mostra apenas rondas da unidade autorizada à sua conta.'],['Em andamento','Veja o status atual e última posição registrada do vigia.'],['Histórico','Consulte as últimas rondas finalizadas ou pendentes do local.'],['Limites','A atualização depende de dados recebidos. O perfil não administra equipes nem ocorrências.']],
 vistoriador:[['Posto','Confira o local atribuído à conta antes de iniciar a vistoria.'],['Critérios','Verifique acessos, estrutura, equipamentos e sinalização.'],['Qualidade','O indicador resulta dos quatro critérios atendidos e não classifica colaboradores.'],['Histórico','Revise os registros datados e as observações.']],
 master:[['Gestão','Acompanhe indicadores, rondas e ocorrências.'],['Rotas','Na Administração > Rotas por vigia, acompanhe o histórico e cadastre novas rotas no mapa.'],['Acesso','Gerencie colaboradores, perfis e vinculações por local.'],['Registros','Utilize a auditoria e os relatórios disponíveis.']]
};
function firstAccessGuide(){
 if(page==='guide'||localStorage.getItem('rondaspro-guide-seen-'+account.role)==='yes')return '';
 const items=guideByRole[account.role]||guideByRole.operador;
 return '<section class="surface onboarding-ops"><div class="toolbar"><div><div class="eyebrow">PRIMEIRO ACESSO · '+escape(roles[account.role])+'</div><h2>Como começar</h2></div><button type="button" data-guide-dismiss>Entendi</button></div><p class="muted">Sua área: '+escape(roles[account.role])+' · Local: '+escape(account.site||'não vinculado / abrangência da gestão')+'</p><ol>'+items.slice(0,3).map(x=>'<li><b>'+escape(x[0])+':</b> '+escape(x[1])+'</li>').join('')+'</ol><button type="button" data-page="guide">Ler o guia completo</button></section>';
}
function guideView(){
 const items=guideByRole[account.role]||guideByRole.operador;
 return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">GUIA ATUALIZADO · RONDAS PRO</div><h1>Guia completo · '+escape(roles[account.role])+'</h1><p class="muted">Instruções específicas para as funções que este perfil pode acessar.</p></div></header><section class="surface">'+items.map((x,i)=>'<details class="details-toggle" '+(i===0?'open':'')+'><summary>'+String(i+1).padStart(2,'0')+' · '+escape(x[0])+'</summary><p style="padding:12px 3px">'+escape(x[1])+'</p></details>').join('')+'</section><p class="muted">A operação depende de conexão com o servidor e permissões autorizadas. Atualização de monitoramento: aproximadamente 30 segundos com a página aberta. GPS impreciso é problema técnico a analisar, não prova de descumprimento.</p></section>';
}
function siteLabel(){return escape(account.site||'Local não vinculado')}
function clientDate(ts){
 if(!ts)return 'Não informado';
 const date=new Date(ts),today=new Date();
 const delta=Math.round((new Date(date.getFullYear(),date.getMonth(),date.getDate())-
  new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
 const day=delta===0?'Hoje':delta===1?'Amanhã':delta===-1?'Ontem':date.toLocaleDateString('pt-BR');
 return day+' · '+date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
const clientMediaUrls=[];
function staticClientMap(fix){
 if(!fix)return '<div class="client-static-map-empty">Posição ainda não recebida</div>';
 return '<div class="client-static-map" aria-label="Mapa estático sem navegação">'+positionMap(fix)+'</div>';
}
// Uma previsão é estimativa geométrica entre pontos cadastrados; não é caminho por ruas.
function routeEstimate(route){
 const pts=(route?.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 if(pts.length<2||!Number.isFinite(route?.plannedStart))return null;
 let distanceKm=0;
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i],toRad=Math.PI/180;
  const dLat=(b.lat-a.lat)*toRad,dLng=(b.lng-a.lng)*toRad;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*toRad)*Math.cos(b.lat*toRad)*Math.sin(dLng/2)**2;
  distanceKm+=6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
 }
 const minutes=Math.max(10,Math.ceil(distanceKm/20*60+pts.length*.5));
 return {minutes,endAt:route.plannedStart+minutes*60000,distanceKm};
}
function clientView(){
 const active=rounds.filter(r=>r.status==='em_andamento'),past=rounds.filter(r=>r.status!=='em_andamento');
 const planned=routes.filter(r=>r.site===account.site&&Number.isFinite(r.plannedStart)&&r.plannedStart>=Date.now()-60000)
   .sort((a,b)=>a.plannedStart-b.plannedStart)[0]||null;
 const estimate=routeEstimate(planned);
 const inspections=events.filter(e=>e.kind==='inspection').slice(0,12);
 const item=r=>'<details class="details-toggle rp2-timeline-entry"><summary>'+escape(roundStatus(r))+' · '+clientDate(r.start)+' · '+escape(r.site||account.site)+'</summary>'+
  '<div class="surface"><div class="detail-grid">'+[['Local',r.site||account.site],['Situação',roundStatus(r)],
  ['Hora de início',clientDate(r.start)],['Hora de término',clientDate(r.end)],['Pontos verificados',r.checkpoints],
  ['Distância estimada',Number(r.km||0).toFixed(2)+' km'],['Última posição recebida',clientDate(r.lastFixAt)]]
  .map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>'+
  staticClientMap(r.lastFix)+'<p class="muted">Mapa sem navegação. A posição depende da última atualização do GPS.</p></div></details>';
 const inspectionRow=e=>'<article class="client-inspection-row"><div class="toolbar"><div><small>'+clientDate(e.occurred_at)+'</small>'+
  '<h3>'+(e.details?.qualityPercent===100?'Tudo OK':'Vistoria registrada')+'</h3></div>'+
  '<span class="pill '+(e.details?.qualityPercent===100?'ok':'warning')+'">'+
  (Number.isFinite(e.details?.qualityPercent)?e.details.qualityPercent+'% de conformidade':'Laudo')+'</span></div>'+
  '<p>'+escape(e.description||'Sem descrição')+'</p>'+
  '<div class="client-inspection-media" data-client-inspection="'+escape(e.id)+'"><small>Carregando evidências autorizadas…</small></div></article>';
 return '<section class="stack ops-client-portal"><header class="ops-agenda-header"><div><div class="eyebrow">PATRIMÔNIO PROTEGIDO · PORTAL DO CLIENTE</div>'+
  '<h1>'+siteLabel()+'</h1><p class="muted">Acompanhamento do local autorizado à sua conta · Atualizações registradas no servidor.</p></div>'+
  '<button data-refresh>Atualizar</button></header>'+
  '<div class="cards"><div class="metric"><strong>'+active.length+'</strong><span>Rondas em andamento</span></div>'+
  '<div class="metric"><strong>'+past.filter(r=>r.status==='concluida').length+'</strong><span>Rondas concluídas</span></div>'+
  '<div class="metric"><strong>'+inspections.length+'</strong><span>Vistorias registradas</span></div></div>'+
  '<section class="surface"><h2>Próxima Ronda</h2><div class="detail-grid">'+
  '<div><small>Hora Programada de Início</small><strong>'+(planned?clientDate(planned.plannedStart):'Aguardando programação confirmada')+'</strong></div>'+
  '<div><small>Previsão de Término</small><strong>'+(estimate?clientDate(estimate.endAt):'Indisponível sem percurso programado')+'</strong></div></div>'+
  (estimate?'<p class="muted" style="margin-top:11px">Previsão ilustrativa do trajeto entre pontos cadastrados, a 20 km/h e 30 segundos por ponto, sem considerar trânsito ou caminho real por ruas.</p>':'')+'</section>'+
  '<section class="surface"><h2>Rondas atuais</h2>'+(active.length?active.map(item).join(''):'<p class="empty">Nenhuma ronda ativa neste local.</p>')+'</section>'+
  '<section class="surface"><h2>Vistorias e evidências</h2><p class="muted">Laudos e fotos, vídeos ou áudios vinculados ao seu local.</p>'+
  (inspections.length?inspections.map(inspectionRow).join(''):'<p class="empty">Nenhum laudo disponível para este local.</p>')+'</section>'+
  '<section class="surface"><h2>Linha do tempo das rondas</h2><p class="muted">Toque em um registro para ver os pontos e a última posição disponível.</p><div class="rp2-client-timeline">'+(past.length?past.slice(0,40).map(item).join(''):'<p class="empty">Sem rondas anteriores registradas.</p>')+'</div></section></section>';
}
async function loadClientInspectionMedia(){
 const nodes=[...document.querySelectorAll('[data-client-inspection]')];
 for(const node of nodes){
  if(!node.isConnected)return;
  try{
   const res=await api('/events/media?eventId='+encodeURIComponent(node.dataset.clientInspection));
   if(!node.isConnected)return;
   const items=(res.media||[]).slice(0,8);
   if(!items.length){node.innerHTML='<small>Sem mídia anexada ao laudo.</small>';continue}
   node.innerHTML='';
   for(const meta of items){
    const blob=await api('/media/'+encodeURIComponent(meta.id));
    if(!node.isConnected)return;
    const url=URL.createObjectURL(blob);clientMediaUrls.push(url);
    const figure=document.createElement('figure');
    const kind=meta.mimetype.startsWith('video/')?'video':meta.mimetype.startsWith('audio/')?'audio':'img';
    const item=document.createElement(kind);item.src=url;
    if(kind==='img')item.alt='Evidência vinculada à vistoria';else item.controls=true;
    const caption=document.createElement('figcaption');
    caption.textContent=clientDate(meta.captured_at)+' · '+(meta.battery==null?'Bateria não registrada':meta.battery+'%');
    figure.append(item,caption);node.append(figure);
   }
  }catch(error){if(node.isConnected)node.innerHTML='<small>Evidências indisponíveis neste momento.</small>'}
 }
}
function inspectionView(){
 const assignment=ops.activeInspection(),entries=events.filter(e=>e.kind==='inspection');
 const pending=assignment?'<section class="rp-inspector-assignment"><div class="rp-inspector-map rp-inspector-map-active" role="img" aria-label="Destino informado pelo COI; abra o endereço para navegação"><span class="rp-inspector-map-marker">⌖</span></div><div class="rp-inspector-destination"><span class="eyebrow">'+(assignment.inspection_type==='routine'?'VISTORIA DE ROTINA':'VISTORIA SOLICITADA PELO COI')+'</span><h2>'+escape(assignment.site||'Destino de vistoria')+'</h2><p>'+escape(assignment.address)+'</p><small>'+escape(assignment.reason||'Verifique as condições do local.')+'</small><a href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(assignment.address)+'" target="_blank" rel="noopener noreferrer">Abrir navegação até o local ↗</a></div></section>':
 '<section class="rp-inspector-empty"><div class="rp-inspector-map rp-inspector-map-blurred" aria-hidden="true"><span>⌖</span></div><div class="rp-inspector-empty-copy"><span class="eyebrow">AGUARDANDO COI</span><h2>Sem vistoria pendente</h2><p>Quando o COI solicitar uma vistoria, o destino e as instruções aparecerão aqui.</p><button type="button" data-refresh>Verificar novas solicitações</button><button type="button" data-page="dispatches">Ver vistorias de rotina e atribuições</button></div></section>';
 const checks=[['acessos','Acessos'],['estrutura','Estrutura'],['equipamentos','Equipamentos'],['sinalizacao','Sinalização']];
 const form=assignment?'<form id="inspection-form" class="rp-inspector-form"><input type="hidden" name="dispatchId" value="'+escape(assignment.id)+'"><header><span class="eyebrow">CONFERÊNCIA DO LOCAL</span><h2>Registrar vistoria</h2><p>Registre uma foto do local, uma selfie e informe o resultado.</p></header><div class="rp-inspector-photo-grid"><button type="button" data-inspection-role="photo" aria-label="Fotografar local"><span>▣</span><strong>Foto do local</strong><small data-proof-label="photo">'+(inspectorProof.photo?'Foto registrada':'Adicionar foto')+'</small></button><button type="button" data-inspection-role="selfie" aria-label="Registrar selfie"><span>◎</span><strong>Selfie</strong><small data-proof-label="selfie">'+(inspectorProof.selfie?'Selfie registrada':'Adicionar selfie')+'</small></button></div><label class="rp-inspector-ok"><input type="checkbox" name="allOk"> Tudo dentro do esperado</label><details class="rp-inspector-criteria"><summary>Verificação detalhada / irregularidades</summary><p>Use os critérios abaixo quando houver algo que exija atenção.</p>'+checks.map(([key,label])=>'<label>'+label+'<select name="'+key+'"><option value="">Avaliar</option><option value="ok">Conforme</option><option value="no">Exige atenção</option></select></label>').join('')+'</details><label>Observações<textarea name="observation" rows="2" maxlength="1000" placeholder="Descreva o que encontrou, se necessário"></textarea></label><button class="primary rp-inspector-submit" type="submit">Finalizar vistoria</button></form>':'';
 return '<section class="rp-inspector-screen"><header class="rp-inspector-top"><div class="eyebrow">VISTORIADOR · OPERAÇÃO DE CAMPO</div><h1>Minhas vistorias</h1><p>Atenda a solicitação do COI. As vistorias de rotina também aparecem nas atribuições.</p></header>'+pending+form+
 '<section class="rp-inspector-history"><h2>Últimas vistorias</h2>'+(entries.length?entries.slice(0,8).map(e=>'<div class="rp-inspector-history-row"><strong>'+escape(e.description||'Vistoria concluída')+'</strong><span>'+fmt(e.occurred_at)+'</span></div>').join(''):'<p class="empty">Nenhuma vistoria concluída.</p>')+'</section></section>';
}
function render(){
 for(const url of clientMediaUrls)URL.revokeObjectURL(url);clientMediaUrls.length=0;
 routeBoard.resetMaps();resetOperationalMap();coi.reset();
 if(!account){torch.stop();loginView();return}
 roleTag.textContent=roles[account.role]||account.role;
 const required=({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[page];
 if(review()&&required&&!ops.allowed(required)){page='notifications';selected=null;}
 activity.reset();
 let content=page==='chat'?chat.view():page==='activity-history'?activity.view():page==='guide'?guideView():page==='notifications'?ops.notificationsView():page==='dispatches'?(['ronda','vistoriador'].includes(account.role)?ops.vigilanteDispatches():ops.dispatchesView({users,rounds,events})):page==='permissions'?ops.permissionsView():page==='routes'&&review()?routeBoard.render():selected?.event?eventView(selected.event):selected?.person?personView(selected.person):page==='treatments'&&review()?treatmentsView():
   account.role==='ronda'?(page==='history'?ownHistory():page==='send'?sendView():ownDashboard()):
   account.role==='cliente'?clientView():
   account.role==='vistoriador'?(page==='history'?ownHistory():page==='send'?sendView():inspectionView()):
   page==='dashboard'?dashboardView():page==='monitor'?monitorView():page==='events'?eventsView():page==='team'?teamView():page==='alerts'?alertView():page==='export'?exportView():dashboardView();
 if(selected?.event)content='<dialog id="central-event-dialog" class="rp-record-dialog"><button type="button" data-close-event>Fechar ✕</button>'+content+'</dialog>';
 const activeLabel=(roleMenus[account.role]||[]).find(([key])=>key===page)?.[1]||'Detalhes do registro';
 root.innerHTML='<button type="button" class="rp-central-menu-button" data-central-menu aria-expanded="false" aria-controls="central-navigation">☰ Menu '+pendingDot('total',ops.summary().total)+'</button><div class="workspace rp2-workspace">'+nav()+'<article class="content"><div class="rp2-contextbar" aria-label="Contexto do acesso"><div class="rp2-context-copy"><strong>'+escape(activeLabel)+'</strong><small>'+escape(roles[account.role])+' · Acesso autenticado</small></div><button type="button" data-refresh class="rp2-context-refresh" aria-label="Atualizar dados do servidor">Atualizar ↻</button></div>'+ops.assignmentBanner()+firstAccessGuide()+content+'</article></div>'+
  (['ronda','vistoriador'].includes(account.role)?'<button type="button" id="central-panic" class="central-panic-fab" aria-label="Abrir acionamento de pânico"><span aria-hidden="true">!</span><strong>PÂNICO</strong></button>'+
  '<dialog id="central-panic-dialog" class="central-panic-dialog" aria-labelledby="panic-title"><h2 id="panic-title">Acionar pânico?</h2><p>O acionamento prioritário será registrado com sua identificação e horário. Localização e bateria serão incluídas quando disponíveis. Use o 190 para emergências que exijam atendimento policial.</p><div class="panic-buttons"><button type="button" id="panic-cancel">Cancelar</button><button type="button" id="panic-send" class="primary">Confirmar pânico</button></div><a href="tel:190">Abrir discador 190</a></dialog>':'');
 // A lanterna acompanha as ações de campo e é desligada nas áreas administrativas.
 root.dataset.torchRole=(['ronda','vistoriador'].includes(account.role)&&['dashboard','send','dispatches'].includes(page))?account.role:'';
 torch.decorate();
 const headerActions=document.querySelector('.top-actions');
 if(headerActions){headerActions.querySelector('[data-operational-header]')?.remove();const holder=document.createElement('div');holder.dataset.operationalHeader='';holder.className='rp-header-tools';holder.innerHTML='<div class="ops-bell-bar">'+ops.badge()+'</div><div data-chat-badge>'+chat.badge()+'</div>';headerActions.prepend(holder);}
 const eventDialog=document.querySelector('#central-event-dialog');if(eventDialog){eventDialog.addEventListener('cancel',async e=>{e.preventDefault();try{await releaseTreatment();selected=null;page=detailOrigin;render()}catch(error){flash(error.message)}});eventDialog.showModal();}
 updatePendingIndicators();
 if(page==='activity-history')activity.mountFilters();
 if(page==='chat')requestAnimationFrame(()=>void chat.mount());
 if(['monitor','dashboard'].includes(page)&&latestActivity&&review()){const host=document.querySelector('.coi3-stats,.cards');if(host){document.querySelector('.coi3-app > .coi3-section')?.remove();const section=document.createElement('div');section.innerHTML=latestActivity;host.after(section);requestAnimationFrame(()=>void activity.mountLatest().catch(e=>flash(e.message)));}}
 if(selected?.event?.kind==='panic'){const eid=selected.event.id;void api('/activity/phone?event='+encodeURIComponent(eid)).then(p=>{const el=document.querySelector('[data-panic-contact]');if(el&&selected?.event?.id===eid)el.innerHTML='<strong>'+escape(p.name)+'</strong> · '+(p.phone?'<a href="tel:'+escape(p.phone.replace(/[^+0-9]/g,''))+'">'+escape(p.phone)+'</a>':'Telefone não cadastrado');}).catch(e=>flash(e.message));}
 if(selected?.event){void loadMessages(selected.event.id);void loadMedia(selected.event.id);}
 if(page==='routes'&&review())requestAnimationFrame(()=>routeBoard.mount());
 if(page==='monitor')requestAnimationFrame(()=>coi.mount());
 if(account.role==='cliente'&&page==='client')void loadClientInspectionMedia();
}
async function loadMessages(eventId){
 try{messages=(await api('/events/'+eventId+'/messages')).messages||[];if(selected?.event?.id!==eventId)return;const host=document.querySelector('#thread');if(!host)return;
 host.innerHTML=messages.length?messages.map(m=>'<div class="bubble '+(m.audience==='system'?'internal':'')+'"><span class="scope">'+(m.audience==='system'?'MENSAGEM INTERNA':'MENSAGEM GERAL')+'</span><p>'+escape(m.body)+'</p><small>'+escape(m.author)+' · '+fmt(m.created_at)+'</small></div>').join(''):'<p class="empty">Nenhuma resposta registrada.</p>';
 }catch(e){flash(e.message)}
}
async function loadMedia(eventId){
 for(const url of recentMediaUrls)URL.revokeObjectURL(url);recentMediaUrls=[];
 try{
  const items=(await api('/events/media?eventId='+encodeURIComponent(eventId))).media||[];
  const host=document.querySelector('#evidence-list');if(!host)return;
  if(!items.length){host.innerHTML='<p class="muted">Nenhuma mídia enviada para o servidor.</p>';return;}
  host.innerHTML='';
  for(const media of items){
   const blob=await api('/media/'+media.id),url=URL.createObjectURL(blob);recentMediaUrls.push(url);
   const element=document.createElement('figure'),visual=document.createElement(media.mimetype.startsWith('video/')?'video':media.mimetype.startsWith('audio/')?'audio':'img');
   visual.src=url;if(['VIDEO','AUDIO'].includes(visual.tagName))visual.controls=true;else visual.alt='Evidência do evento';
   const label=document.createElement('figcaption');
   label.textContent=fmt(media.captured_at)+' · '+(media.battery==null?'Bateria não informada':media.battery+'%');
   element.append(visual,label);
   if(Number.isFinite(media.latitude)&&Number.isFinite(media.longitude)){
    const map=document.createElement('a');map.target='_blank';map.rel='noopener noreferrer';
    map.href='https://www.openstreetmap.org/?mlat='+encodeURIComponent(media.latitude)+'&mlon='+encodeURIComponent(media.longitude)+'#map=18/'+encodeURIComponent(media.latitude)+'/'+encodeURIComponent(media.longitude);
    map.textContent='Ver local da evidência no mapa ↗';element.append(map);
   }
   host.append(element);
  }
 }catch(e){flash(e.message)}
}
async function downloadXlsx(){
 const d=await api('/export');
 const report={source:'SQLite operacional',at:d.at,resumo:{rondas:d.rondas?.length||0,alertas:d.events.filter(e=>e.kind==='alert').length,panicos:d.events.filter(e=>e.kind==='panic').length},rondas:d.rondas,events:d.events,mensagens:d.messages};
 const file=createXlsxReport(report),url=URL.createObjectURL(file),anchor=document.createElement('a');
 anchor.href=url;anchor.download='rondas-pro-completo-'+new Date().toISOString().slice(0,10)+'.xlsx';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function downloadFile(blob,name){
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function toCsv(rows){
 const lines=[['evento','autor','visibilidade','mensagem','data_hora'],...rows.map(m=>[m.event_id,m.author,m.audience,m.body,new Date(m.created_at).toISOString()])];
 return '\ufeff'+lines.map(row=>row.map(x=>{
  let v=String(x??'');if(/^[=+\-@]/.test(v))v="'"+v;
  return '"'+v.replaceAll('"','""')+'"';
 }).join(';')).join('\r\n');
}
async function printAllConversations(){
 const popup=window.open('','_blank');
 if(!popup)throw new Error('Permita a nova janela de impressão no navegador.');
 const d=await api('/export'),grouped=new Map();
 for(const m of (d.messages||[]).sort((a,b)=>a.created_at-b.created_at)){const arr=grouped.get(m.event_id)||[];arr.push(m);grouped.set(m.event_id,arr);}
 const content=[...grouped].map(([eid,rows])=>'<section><h2>Ocorrência '+escape(eid)+'</h2>'+rows.map(m=>
  '<div class="bubble"><p>'+escape(m.body).replaceAll('\n','<br>')+'</p><small>'+escape(m.author)+' · '+(m.audience==='system'?'Nota interna':'Mensagem geral')+' · '+fmt(m.created_at)+'</small></div>').join('')+'</section>').join('');
 popup.document.open();popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conversas Rondas Pro</title><style>body{font:14px/1.5 system-ui;color:#233341;margin:18mm}h1{color:#146585}section{border-top:1px solid #ccd8e2;padding-top:12px;margin:20px 0}.bubble{padding:10px 12px;break-inside:avoid;border:1px solid #c9d8e2;border-radius:8px;margin:8px 0}.bubble p{margin:0 0 8px}.bubble small{display:block;font-size:10px;color:#687c8a}</style></head><body><h1>Rondas Pro | Conversas operacionais</h1><p>Gerado '+escape(fmt(Date.now()))+'. Documento restrito a pessoal autorizado.</p>'+(content||'<p>Sem mensagens.</p>')+'</body></html>');
 popup.document.close();popup.focus();popup.print();
}
document.addEventListener('click',async e=>{
 const target=e.target.closest('button');if(!target)return;
 try{
  if(target.dataset.evidenceKind&&['ronda','vistoriador'].includes(account?.role)&&['send','inspections'].includes(page)){
   const isInspection=page==='inspections',form=document.querySelector(isInspection?'#inspection-form':'#send-note');
   if(!form)return;
   try{
    const file=await inspectorCapture.request(target.dataset.evidenceKind);
    if(!form.isConnected)return;
    const store=isInspection?inspectorEvidence:fieldMessageEvidence;
    if(store.length>=8){flash('Máximo de oito anexos por registro.');return}
    store.push(file);
    const holder=form.querySelector('[data-evidence-attachments]');
    if(holder)holder.textContent=store.map(x=>x.name).join(' · ');
   }catch(error){if(!/cancelad|nenhuma evidência/i.test(error.message))flash(error.message)}
   return;
  }
  if(target.dataset.inspectionRole&&page==='inspections'){
   const kind=target.dataset.inspectionRole;
   if(!['photo','selfie'].includes(kind))return;
   try{const file=await inspectorCapture.request(kind==='selfie'?'selfie':'photo');inspectorProof[kind]=file;const label=document.querySelector('[data-proof-label="'+kind+'"]');if(label)label.textContent='✓ '+(kind==='selfie'?'Selfie registrada':'Foto registrada');target.classList.add('is-taken');}
   catch(error){if(!/cancelad|nenhuma evidência/i.test(error.message))flash(error.message)}
   return;
  }
  if(target.hasAttribute('data-close-event')){await releaseTreatment();selected=null;page=detailOrigin;render();return;}
  if(await calls.click(target))return;
  if(await chat.click(target))return;
  if(await activity.click(target))return;
  if(await ops.click(target))return;
  if(await routeBoard.click(target))return;
  if(target.dataset.compose==='message'){selected=null;page='chat';render();return;}
  if(target.dataset.compose){if(!['ronda','vistoriador'].includes(account?.role)||!['alert','incident','message'].includes(target.dataset.compose))return;composeKind=target.dataset.compose;selected=null;page=composeKind==='message'?'chat':'send';render();return;}
  if(target.id==='central-panic'){document.querySelector('#central-panic-dialog')?.showModal();return;}
  if(target.id==='panic-cancel'){document.querySelector('#central-panic-dialog')?.close();return;}
  if(target.id==='panic-send'){
   target.disabled=true;
   try{
    await api('/events',{method:'POST',data:{kind:'panic',occurredAt:Date.now(),description:'Botão de pânico acionado pelo vigia',...await eventTelemetry()}});
    document.querySelector('#central-panic-dialog')?.close();await load();flash('Pânico registrado no servidor da central.');
   }finally{if(target.isConnected)target.disabled=false}
   return;
  }
  if(target.hasAttribute('data-occ-reset')){
   occurrenceFilters={status:'pending',kind:'all',worker:'all',reviewer:'all',dateFrom:'',dateTo:'',query:''};render();return;
  }
  if(target.hasAttribute('data-central-menu')){
   const nav=document.querySelector('#central-navigation'),open=!nav.classList.contains('is-open');nav.classList.toggle('is-open',open);target.setAttribute('aria-expanded',String(open));return;
  }
  if(target.dataset.treatmentTab){treatmentTab=target.dataset.treatmentTab;await releaseTreatment();selected=null;await readTreatmentRows();render();return;}
  if(target.hasAttribute('data-treatment-more')){target.disabled=true;try{await readTreatmentRows(true);render()}finally{if(target.isConnected)target.disabled=false}return;}
  if(target.hasAttribute('data-claim-treatment')&&selected?.event){
   const result=await api('/events/'+selected.event.id+'/claim',{method:'POST',data:{claimSession,version:selected.event.version}});selected={event:result.event};claimedEvent=result.event.id;render();return;
  }
  if(target.hasAttribute('data-release-treatment')){await releaseTreatment();await load();return;}
  if(target.dataset.reviewStatus){
   if(!review()||!selected?.event||claimedEvent!==selected.event.id)return;
   const status=target.dataset.reviewStatus,titles={em_analise:'Registrar análise',encaminhada:'Encaminhar ao administrativo',resolvida:'Concluir tratativa'};
   if(!titles[status])return;
   const selectedEventId=selected.event.id,version=selected.event.version,requestId=crypto.randomUUID();
   openConclusionDialog({title:titles[status],eventLabel:(friendly[selected.event.kind]||selected.event.kind)+' · '+selected.event.description,
    action:status,responsible:account.name,requireAcknowledgement:selected.event.kind==='alert',onConfirm:async({conclusion,acknowledged})=>{
     await api('/events/'+selectedEventId+'/review',{method:'POST',data:{status,conclusion,acknowledged,claimSession,version,requestId}});
     claimedEvent=null;await load();flash('Tratativa registrada e estados sincronizados.');
    }});return;
  }
  if(target.dataset.coiTab){if(page==='monitor'&&coi.selectTab(target.dataset.coiTab))render();return;}
   if(target.dataset.page){if(!(roleMenus[account.role]||[]).some(entry=>entry[0]===target.dataset.page))return;const mod=({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[target.dataset.page];if(mod&&review()&&!ops.allowed(mod)){flash('Área desabilitada pela administração.');return;}await releaseTreatment();selected=null;page=target.dataset.page;if(page==='treatments')await readTreatmentRows();if(page==='activity-history')await activity.refresh();render();return;}
  if(target.dataset.event){if(account.role==='cliente')return;await openEvent(target.dataset.event);return;}
  if(target.dataset.person){selected={person:target.dataset.person};render();return;}
  if(target.dataset.template){
   const t=templates.find(x=>x.id===target.dataset.template);if(!privileged()||!t)return;
   document.querySelector('#template-id').value=t.id;document.querySelector('#template-title').value=t.title;
   document.querySelector('#template-trigger').value=t.trigger;document.querySelector('#template-priority').value=t.priority;
   document.querySelector('#template-cooldown').value=t.cooldown_min;document.querySelector('#template-subject').value=t.subject||'';
   document.querySelector('#template-message').value=t.message||'';
   document.querySelector('#save-template [name=enabled]').checked=!!t.enabled;
   const savedGroups=JSON.parse(t.recipients||'[]');document.querySelectorAll('#save-template [name=recipients]').forEach(input=>input.checked=savedGroups.includes(input.value));
   document.querySelector('#save-template').scrollIntoView({behavior:'smooth'});return;
  }
  if(target.hasAttribute('data-guide-dismiss')){localStorage.setItem('rondaspro-guide-seen-'+account.role,'yes');render();return;}
  if(target.hasAttribute('data-refresh')){await load();flash('Registros atualizados');return;}
  if(target.dataset.retryEmail){await api('/email-jobs/retry',{method:'POST',data:{eventId:target.dataset.retryEmail}});flash('Nova tentativa registrada.');await load();return;}
  if(target.id==='print-chat'){window.print();return;}
  if(target.id==='download-xlsx'){await downloadXlsx();flash('Exportação gerada.');return;}
  if(target.id==='download-json'){const d=await api('/export');downloadFile(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),'rondas-pro-exportacao.json');return;}
  if(target.id==='download-csv'){const d=await api('/export');downloadFile(new Blob([toCsv(d.messages||[])],{type:'text/csv;charset=utf-8'}),'rondas-pro-conversas.csv');return;}
  if(target.id==='print-all-chats'){await printAllConversations();return;}
 }catch(err){flash(err.message)}
});
document.addEventListener('submit',async e=>{
 if(e.target.matches('[data-chat-compose],[data-chat-create],[data-chat-profile-form],[data-activity-filters]')){e.preventDefault();try{if(await chat.submit(e.target))return;if(await activity.submit(e.target))return}catch(error){flash(error.message)}return;}

 const form=e.target;
 if(['ops-dispatch-form','ops-completion-form','ops-inspector-form','ops-destination-form'].includes(form.id)){e.preventDefault();try{await ops.submit(form)}catch(err){flash(err.message)}return;}
 if(form.id==='route-form'){e.preventDefault();try{await routeBoard.submit(form)}catch(err){flash(err.message)}return;}
 if(!['central-login','new-user','save-template','recipient-form','send-alert','register-incident','send-note','send-message','upload-evidence','inspection-form'].includes(form.id))return;
 e.preventDefault();const d=Object.fromEntries(new FormData(form));
 try{
  if(form.id==='central-login'){const result=await api('/login',{method:'POST',data:d});token=result.token;sessionStorage.setItem('rondaspro_api_token',token);await load();return;}
  if(form.id==='inspection-form'){
   const keys=['acessos','estrutura','equipamentos','sinalizacao'];
   if(!ops.activeInspection()||d.dispatchId!==ops.activeInspection().id)throw Error('Inicie o despacho autorizado pelo COI antes de registrar vistoria.');
   if(!inspectorProof.photo||!inspectorProof.selfie)throw Error('Registre uma foto do local e uma selfie para finalizar.');
   const allOk=d.allOk==='on';
   if(!allOk&&keys.some(k=>!['ok','no'].includes(String(d[k]))))throw Error('Marque Tudo dentro do esperado ou avalie os quatro critérios.');
   if(!allOk&&String(d.observation||'').trim().length<8)throw Error('Descreva a condição que exige atenção.');
   const criteria=Object.fromEntries(keys.map(k=>[k,allOk||d[k]==='ok']));
   // Cria o laudo uma única vez por tentativa; não encerra o despacho antes
   // de confirmar os dois uploads e registrar o encerramento no backend.
   let report=pendingInspectionCommit?.dispatchId===d.dispatchId?pendingInspectionCommit:null;
   if(!report){
    const record=await api('/events',{method:'POST',data:{kind:'inspection',occurredAt:Date.now(),description:String(d.observation||'Vistoria realizada. Tudo dentro do esperado.').trim().slice(0,1000),details:{criteria,dispatchId:d.dispatchId},...await eventTelemetry()}});
    report={dispatchId:d.dispatchId,eventId:record.id,uploaded:new Set()};pendingInspectionCommit=report;
   }
   const files=[['photo',inspectorProof.photo],['selfie',inspectorProof.selfie],...inspectorEvidence.map((file,i)=>['extra-'+i,file])];
   for(const [kind,file] of files){
    if(report.uploaded.has(kind))continue;
    await api('/media',{method:'POST',raw:file,headers:{'Content-Type':file.type,'X-Ronda-Event-Id':report.eventId,'X-Captured-At':String(file.lastModified||Date.now())}});
    report.uploaded.add(kind);
   }
   const note=String(d.observation||'Vistoria realizada. Tudo dentro do esperado.').trim();
   const context=await eventTelemetry();
   await api('/dispatches/'+d.dispatchId+'/complete',{method:'POST',data:{note,position:context.position||null}});
   inspectorProof={photo:null,selfie:null};inspectorEvidence=[];pendingInspectionCommit=null;
   flash('Vistoria e evidências registradas. Despacho concluído.');
   await load();return;
  }
  if(form.id==='new-user'){await api('/users',{method:'POST',data:d});flash('Colaborador cadastrado.');await load();return;}
  if(form.id==='save-template'){const f=new FormData(form);const recipients=f.getAll('recipients');if(!recipients.length)throw Error('Escolha ao menos um grupo destinatário.');await api('/templates',{method:'POST',data:{...d,enabled:f.has('enabled'),cooldownMin:Number(d.cooldownMin),recipients}});flash('Modelo salvo no banco.');await load();return;}
  if(form.id==='recipient-form'){await api('/recipients',{method:'POST',data:{email:d.email,groupName:d.groupName,enabled:true}});form.reset();flash('Destinatário cadastrado.');return;}
  if(form.id==='send-alert'||form.id==='register-incident'||form.id==='send-note'){
   const kind=form.id==='send-alert'?'alert':form.id==='register-incident'?'incident':'message';
   const title=String(d.title||'').trim();
   const description=kind==='incident'?title+' · '+String(d.description||'').trim():String(d.description||'').trim();
   const details=kind==='alert'&&d.templateId?{templateId:d.templateId}:kind==='incident'?{title,severity:d.severity,category:d.category}:{channel:'central',category:'routine'};
   const event=await api('/events',{method:'POST',data:{kind,occurredAt:Date.now(),description,details,...await eventTelemetry()}});
   const attachments=kind==='message'?[...fieldMessageEvidence]:[];
   if(kind==='message')fieldMessageEvidence=[];
   let uploads=0;
   for(const file of attachments)try{
    await api('/media',{method:'POST',raw:file,headers:{'Content-Type':file.type,'X-Ronda-Event-Id':event.id,'X-Captured-At':String(file.lastModified||Date.now())}});
    uploads++;
   }catch(error){console.warn('Anexo não entregue',error)}
   const attachmentFailure=attachments.length&&uploads!==attachments.length
    ?'Mensagem enviada, mas '+(attachments.length-uploads)+' anexo(s) não foram entregues.':'';
   page='history';await load();
   flash(attachmentFailure||(kind==='alert'?'Alerta registrado no servidor. Confira a entrega nas configurações da central.':kind==='incident'?'Ocorrência registrada na central.':attachments.length?'Mensagem e '+uploads+' anexo(s) enviados.':'Mensagem registrada na central.'));
   return;
  }
  if(form.id==='send-message'){await api('/events/'+selected.event.id+'/messages',{method:'POST',data:{body:d.body,audience:d.audience||'general',claimSession}});form.reset();await loadMessages(selected.event.id);return;}
  if(form.id==='upload-evidence'){
   const file=form.querySelector('[name=file]').files[0];if(!file)throw new Error('Selecione uma mídia');
   const at=file.lastModified||Date.now();
   await api('/media',{method:'POST',raw:file,headers:{'Content-Type':file.type,'X-Ronda-Event-Id':selected.event.id,'X-Captured-At':String(at),'X-Treatment-Session':claimSession}});
   form.reset();await loadMedia(selected.event.id);flash('Evidência guardada no servidor.');return;
  }
 }catch(err){flash(err.message)}
});
// A central do operador acompanha o servidor sem depender de recarregar a página.
// Em caso de perda de conexão, preserva a tela e identifica leituras antigas.
setInterval(()=>{if(account&&['operador','coi','cliente','admin','master'].includes(account.role)&&['monitor','client','routes','treatments','notifications'].includes(page)&&!document.hidden&&!selected&&!(page==='routes'&&document.querySelector('#route-form')))void load();},30000);
setInterval(()=>{if(account&&!document.hidden)void ops.refresh(account,true).catch(()=>{});},15000);
setInterval(()=>{if(claimedEvent&&account&&!document.hidden)void api('/events/'+claimedEvent+'/claim',{method:'POST',data:{claimSession}}).catch(error=>flash(error.message));},40000);
setInterval(()=>{if(['ronda','vistoriador'].includes(account?.role)&&!document.hidden)void eventTelemetry().then(ctx=>api('/presence',{method:'POST',data:{position:ctx.position||null}})).catch(()=>{});},45000);
setInterval(()=>{for(const e of document.querySelectorAll('[data-ops-live-clock]'))e.textContent=new Date().toLocaleTimeString('pt-BR');},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&['ronda','vistoriador'].includes(account?.role))void eventTelemetry().then(ctx=>api('/presence',{method:'POST',data:{position:ctx.position||null}})).catch(()=>{});});
document.addEventListener('change',e=>{
 if(e.target?.dataset?.coiToggle){void ops.change(e.target).then(()=>load()).catch(error=>flash(error.message));return;}
 const field=e.target.closest('[data-occ-filter]');
 if(field){occurrenceFilters[field.dataset.occFilter]=field.value;render();return;}
 routeBoard.change(e.target);
});
exit.addEventListener('click',async()=>{await releaseTreatment();if(['ronda','vistoriador'].includes(account?.role))try{await api('/presence/off',{method:'POST'})}catch{}ops.stopLive();chat.reset();calls.reset();activity.reset(true);document.querySelector('[data-operational-header]')?.remove();try{await api('/logout',{method:'POST'})}catch{}token='';account=null;sessionStorage.removeItem('rondaspro_api_token');root.dataset.loadedRole='';loginView()});
load();

setInterval(()=>{if(account&&!document.hidden)void chat.refresh().catch(()=>{});},4000);
setInterval(()=>{if(account&&!document.hidden)void calls.poll();},2000);
