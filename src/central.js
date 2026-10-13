import {createXlsxReport} from './report-xlsx.js';
const root=document.querySelector('#central-root'),exit=document.querySelector('#exit'),roleTag=document.querySelector('#current-role'),notice=document.querySelector('#notice');
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'Não informado';
const id=x=>escape(x);
const friendly={panic:'Pânico',gps:'Posição GPS',battery:'Bateria',incident:'Ocorrência',checkpoint:'Ponto',alert:'Alerta por e-mail',gps_issue:'Falha GPS',route_deviation:'Possível desvio',patrol_start:'Início da ronda',patrol_end:'Término'};
let token=sessionStorage.getItem('rondaspro_api_token')||'',account=null,page='dashboard',events=[],users=[],dashboard=null,mySummary=null,rounds=[],templates=[],selected=null,messages=[],media=[],emailJobs=[],recentMediaUrls=[];
const roles={ronda:'Vigia',operador:'Equipe interna',admin:'Administrador',master:'Master'};
function flash(text){notice.textContent=text;notice.classList.add('visible');setTimeout(()=>notice.classList.remove('visible'),4800)}
async function api(path,{method='GET',data,headers={},raw}={}){
 const res=await fetch('/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!raw&&data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:raw??(data===undefined?undefined:JSON.stringify(data))});
 if(!res.ok){let msg='Falha HTTP '+res.status;try{msg=(await res.json()).error||msg}catch{}throw new Error(msg)}
 return res.headers.get('content-type')?.includes('application/json')?res.json():res.blob();
}
const privileged=()=>account&&['admin','master'].includes(account.role);
const review=()=>account&&['operador','admin','master'].includes(account.role);
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
  if(previousRole!==account.role){page=account.role==='operador'?'monitor':'dashboard';selected=null;root.dataset.loadedRole=account.role;}
  const requested=[api('/events?limit=500'),api('/templates'),api('/rounds')];
  if(review())requested.push(api('/dashboard'),api('/users'),api('/email-jobs'));
  else requested.push(api('/my-summary'));
  const responses=await Promise.all(requested);
  events=responses[0].events||[];templates=responses[1].templates||[];rounds=responses[2].rounds||[];
  if(review()){dashboard=responses[3];users=responses[4].users||[];emailJobs=responses[5].jobs||[];mySummary=null;}
  else {mySummary=responses[3];dashboard=null;users=[];emailJobs=[];}
  render();
 }catch(err){sessionStorage.removeItem('rondaspro_api_token');token='';loginView(err.message)}
}
const roleMenus={
 ronda:[['dashboard','Minha ronda','◉'],['history','Meu histórico','▤'],['send','Avisar equipe','✉']],
 operador:[['monitor','Monitoramento','◉'],['events','Alertas e ocorrências','!'],['team','Vigias','♙']],
 admin:[['dashboard','Indicadores','▥'],['events','Ocorrências','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩']],
 master:[['dashboard','Indicadores','▥'],['events','Ocorrências','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩']]
};
const nav=()=>'<nav class="side" aria-label="Navegação do '+escape(roles[account.role])+'">'+
 (roleMenus[account.role]||[]).map(([key,label,icon])=>'<button type="button" data-page="'+key+'" class="'+(page===key?'active':'')+'"'+(page===key?' aria-current="page"':'')+'><span class="nav-symbol" aria-hidden="true">'+icon+'</span>'+escape(label)+'</button>').join('')+'</nav>';
function kpis(){
 const kinds=Object.fromEntries((dashboard?.metrics||[]).map(x=>[x.kind,x.count]));
 return '<div class="cards">'+[['Eventos',events.length],['Pânicos',kinds.panic||0],['Ocorrências',kinds.incident||0],['Amostras GPS',kinds.gps||0],['Alertas de e-mail',kinds.alert||0],['Baterias monitoradas',kinds.battery||0]].map(([label,num])=>'<div class="metric"><strong>'+num+'</strong><span>'+label+'</span></div>').join('')+'</div>';
}
function dashboardView(){
 const open=events.filter(e=>['panic','incident','gps_issue','route_deviation'].includes(e.kind)&&e.status!=='resolvida');
 const active=rounds.filter(r=>r.status==='em_andamento');
 const totalKm=rounds.reduce((n,r)=>n+(r.km||0),0);
 const summary=[['Rondas',rounds.length],['Em andamento',active.length],['Pendências',open.length],['Distância registrada',totalKm.toFixed(2)+' km']];
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">GESTÃO E INDICADORES</div><h1>Painel administrativo</h1><p class="muted">Dados do banco operacional, com análises e histórico para tomada de decisão.</p></div><button data-refresh>Atualizar</button></div>'+
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
 '<div class="cards">'+[['Rondas',all.length],['Distância GPS',Number(mine.totalKm||0).toFixed(2)+' km'],['Alertas e ocorrências',activity.filter(e=>['alert','incident','gps_issue'].includes(e.kind)).length],['Pontos confirmados',activity.filter(e=>e.kind==='checkpoint').length]].map(([n,v])=>'<div class="metric"><strong>'+v+'</strong><span>'+n+'</span></div>').join('')+'</div>'+
 '<section class="surface"><div class="toolbar"><h2>Minha execução mais recente</h2><button data-page="history">Histórico completo</button></div>'+
 (latest?'<div class="detail-grid">'+[['Início',fmt(latest.start)],['Estado',latest.status.replaceAll('_',' ')],['Percorrido',latest.km.toFixed(2)+' km'],['Tempo em trajeto',latest.minutes==null?'Sem registro':latest.minutes+' min'],['Alertas',latest.alerts],['Pânico',latest.panics],['Bateria',latest.lastBattery==null?'Não informada':latest.lastBattery+'%']].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>':'<div class="empty">Nenhuma ronda real sincronizada para sua conta.</div>')+
 '</section><section class="surface"><div class="toolbar"><h2>Minhas ocorrências e mensagens</h2><button data-page="send">Enviar alerta</button></div>'+eventList(open.slice(0,6))+'</section>'+
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
function monitorView(){
 const active=rounds.filter(r=>r.status==='em_andamento'),open=events.filter(e=>['panic','incident','gps_issue','route_deviation'].includes(e.kind)&&e.status!=='resolvida');
 const urgent=open.filter(e=>e.kind==='panic');
 const list=active.length?active:rounds.slice(0,5);
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">CENTRAL DE MONITORAMENTO</div><h1>Acompanhamento de rondas</h1><p class="muted">Localização, estado do sinal, comunicação e ocorrências de cada vigia.</p></div><button data-refresh>Atualizar agora</button></div>'+
 '<div class="cards">'+[['Rondas ativas',active.length],['Pânicos em aberto',urgent.length],['Pendências',open.length],['Vigias cadastrados',users.filter(w=>w.role==='ronda').length]].map(([n,v],i)=>'<div class="metric '+(i===1&&v?'urgent':'')+'"><strong>'+v+'</strong><span>'+n+'</span></div>').join('')+'</div>'+
 '<section class="surface"><div class="toolbar"><h2>Prioridade da operação</h2><button data-page="events">Tratar ocorrências</button></div>'+eventList(open.slice(0,8))+'</section>'+
 '<section class="surface"><h2>'+ (active.length?'Rondas em acompanhamento':'Últimas rondas registradas')+'</h2><p class="muted">Posições com horário da última atualização. Ausência de GPS não comprova desvio.</p>'+monitorRows(list)+'</section>'+
 '<details class="details-toggle"><summary>Consultar histórico operacional completo</summary><div class="surface">'+roundTable(rounds.slice(0,50))+'</div></details></section>';
}
function monitorRows(rows){
 if(!rows.length)return '<div class="empty">Nenhuma ronda sincronizada até o momento.</div>';
 return '<div class="list">'+rows.map(r=>{
  const worker=users.find(w=>w.id===r.userId)?.name||'Colaborador';
  const age=r.lastFixAt?Date.now()-r.lastFixAt:Infinity;
  const signal=age<60000?'GPS recente':age<180000?'GPS desatualizado':'Sem GPS recente';
  const lastEvent=events.find(e=>e.round_id===r.id&&['panic','incident','alert','checkpoint'].includes(e.kind));
  return '<details class="details-toggle"><summary>'+escape(worker)+' · '+(r.status==='em_andamento'?'Em ronda':'Última ronda')+
  ' · '+escape(signal)+'</summary><div class="surface"><div class="detail-grid">'+
  [['Última posição',fmt(r.lastFixAt)],['Distância',r.km.toFixed(2)+' km'],['Em trajeto',r.minutes==null?'—':r.minutes+' min'],['Bateria',r.lastBattery==null?'—':r.lastBattery+'%'],['Alertas',r.alerts],['Pânico',r.panics]].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>'+
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
   '<small>'+fmt(r.start)+' · '+escape(r.status.replaceAll('_',' '))+'</small>'+
   '<small>GPS: '+r.gpsSamples+' amostras · '+r.rejectedGps+' descartadas</small></span>'+
   '<span style="text-align:right"><b>'+r.km.toFixed(2)+' km</b><small>'+(r.minutes??'—')+' min · '+r.checkpoints+' pontos</small>'+
   '<small>'+r.panics+' pânicos · '+r.alerts+' alertas · bateria '+(r.lastBattery??'—')+'%</small></span></div>';
 }).join('')+'</div>';
}
function eventList(rows){
 return rows.length?'<div class="list">'+rows.map(e=>'<button class="list-item" data-event="'+id(e.id)+'"><span><b>'+escape(friendly[e.kind]||e.kind)+'</b><small>'+fmt(e.occurred_at)+' · '+escape(e.description||'Sem descrição')+'</small></span><span class="pill '+(e.kind==='panic'?'flag':'')+'">'+escape(e.status)+'</span></button>').join('')+'</div>':'<div class="empty">Nenhum registro encontrado.</div>';
}
function eventsView(){
 const priority=events.filter(e=>['incident','panic','alert','route_deviation','gps_issue'].includes(e.kind));
 const ordinary=events.filter(e=>!priority.includes(e));
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">TRATAMENTO E REGISTROS</div><h1>Ocorrências</h1><p class="muted">Prioridades, respostas da equipe, evidências e histórico.</p></div><button data-refresh>Atualizar</button></div>'+
 '<section class="surface"><h2>Exigem atenção</h2>'+eventList(priority.filter(e=>e.status!=='resolvida'))+'</section>'+
 '<details class="details-toggle"><summary>Ocorrências tratadas · '+priority.filter(e=>e.status==='resolvida').length+'</summary><div class="surface">'+eventList(priority.filter(e=>e.status==='resolvida'))+'</div></details>'+
 '<details class="details-toggle"><summary>Histórico técnico · '+ordinary.length+' eventos</summary><div class="surface">'+eventList(ordinary)+'</div></details></section>';
}
function teamView(){
 return '<section class="stack"><h1>Equipe e indicadores individuais</h1><div class="surface"><div class="list">'+(dashboard?.team||[]).map(w=>'<button data-person="'+id(w.id)+'" class="list-item"><span><b>'+escape(w.name)+'</b><small>'+escape(w.description||'Descrição pendente')+'</small></span><span>'+Number(w.events||0)+' eventos · '+Number(w.panics||0)+' acionamentos</span></button>').join('')+'</div></div>'+
 (privileged()?'<form id="new-user" class="surface"><h2>Cadastrar membro da equipe</h2><p class="muted">Informe a descrição da supervisão sobre o vigia no cadastro. A descrição será armazenada no banco.</p><div class="grid"><label>Nome<input required name="name" minlength="2"></label><label>E-mail<input required type="email" name="email"></label><label>Perfil<select name="role"><option value="ronda">Vigia</option><option value="operador">Equipe interna</option><option value="admin">Administrador</option>'+(account.role==='master'?'<option value="master">Master</option>':'')+'</select></label><label>Senha inicial (12+ caracteres)<input required name="password" minlength="12" type="password"></label></div><label>Descrição do supervisor sobre o colaborador<textarea name="description" placeholder="Resumo factual das atribuições, posto e orientações de acompanhamento" minlength="10"></textarea></label><button class="primary">Cadastrar</button></form>':'')+'</section>';
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
 return '<section class="stack"><h1>Alerta por e-mail</h1><form id="send-alert" class="surface"><p class="muted">Função separada do botão de pânico. O registro é salvo antes de tentar a notificação.</p><label>Modelo<select name="templateId">'+templates.filter(t=>t.enabled&&t.trigger==='manual').map(t=>'<option value="'+id(t.id)+'">'+escape(t.title)+'</option>').join('')+'</select></label><label>Descrição<textarea name="description" required minlength="10" maxlength="2000"></textarea></label><button class="primary">Registrar alerta</button></form></section>';
}
function exportView(){
 return '<div class="stack"><h1>Relatório inteligente</h1><div class="cards">'+[['Rondas',events.filter(e=>e.kind==='patrol_start').length],['Pânicos',events.filter(e=>e.kind==='panic').length],['Ocorrências',events.filter(e=>e.kind==='incident').length],['Registros GPS',events.filter(e=>e.kind==='gps').length]].map(([x,y])=>'<div class="metric"><strong>'+y+'</strong><span>'+x+'</span></div>').join('')+'</div><section class="surface"><h2>Exportar Excel completo</h2><p>O XLSX inclui uma primeira aba Dashboard formatada, seguida de abas com eventos e conversas. Os dados dependem dos registros efetivamente sincronizados.</p><div class="row"><button class="primary" id="download-xlsx">Baixar XLSX com abas</button><button id="download-json">Exportar JSON</button><button id="download-csv">Conversas CSV</button></div></section><section class="surface"><h2>Conversas em PDF</h2><p>Histórico com remetente, data e hora de cada mensagem. O navegador permite salvar como PDF.</p><button id="print-all-chats">Imprimir todas as conversas / PDF</button></section></div>';
}
function eventView(e){
 const back=account.role==='ronda'?'history':'events';
 const details=Array.isArray(e.details?.mediaIds)?e.details.mediaIds.length:0;
 return '<section class="stack" id="print-conversation">'+
 '<div class="toolbar"><div><button data-page="'+back+'" class="no-print">← Voltar</button><h1 style="margin-top:12px">'+escape(friendly[e.kind]||e.kind)+'</h1><p class="muted">'+fmt(e.occurred_at)+' · '+escape(e.id)+'</p></div><div class="row no-print"><button id="print-chat">Salvar conversa em PDF</button><button data-refresh>Atualizar</button></div></div>'+
 '<section class="surface"><div class="row" style="justify-content:space-between"><span class="pill '+(e.kind==='panic'?'flag':'')+'">'+escape(e.status)+'</span><small>'+escape(users.find(u=>u.id===e.user_id)?.name||account.name)+'</small></div><p style="font-size:14px;margin:14px 0">'+escape(e.description||'Sem descrição')+'</p>'+
 '<div class="detail-grid">'+[['Data e hora',fmt(e.occurred_at)],['Bateria',e.battery==null?'Não informada':e.battery+'%'],['Localização',Number.isFinite(e.lat)?'Disponível no mapa':'Indisponível'],['Status',e.status]].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>'+
 (Number.isFinite(e.lat)&&Number.isFinite(e.lng)?positionMap({lat:e.lat,lng:e.lng}):'<p class="muted">Sem geolocalização confiável anexada a este registro.</p>')+
 '</section>'+
 (review()?'<section class="surface no-print"><h2>Tratamento pela equipe</h2><form id="review-event" class="stack"><div class="row"><label style="max-width:230px;flex:1">Situação<select name="status"><option value="aberta" '+(e.status==='aberta'?'selected':'')+'>Aberta</option><option value="em_analise" '+(e.status==='em_analise'?'selected':'')+'>Em análise</option><option value="resolvida" '+(e.status==='resolvida'?'selected':'')+'>Resolvida</option></select></label><button class="primary" type="submit">Salvar tratamento</button></div><label>Providência / descrição interna<textarea name="note" placeholder="O que foi verificado e qual providência foi tomada?"></textarea></label></form></section>':'')+
 '<section class="surface"><h2>Evidências da ocorrência</h2><p class="muted">Fotos e vídeos enviados, com data, hora, localização disponível e bateria.</p><div id="evidence-list" class="photo-grid"></div>'+
 '<form id="upload-evidence" class="row no-print"><label>Adicionar evidência<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" name="file" required></label><button>Enviar mídia</button></form></section>'+
 '<section class="surface"><h2>Conversa e providências</h2><div id="thread" class="thread"></div>'+
 '<form id="send-message" class="stack no-print"><label>Responder<textarea name="body" required maxlength="4000" placeholder="Escreva a mensagem..."></textarea></label><div class="row">'+
 (review()?'<label>Tipo de mensagem<select name="audience"><option value="general">Resposta geral · vigia pode ler</option><option value="system">Resposta interna · somente equipe</option></select></label>':'')+
 '<button class="primary">Enviar resposta</button></div></form></section>'+
 '<details class="details-toggle"><summary>Dados técnicos completos</summary><div class="surface"><div class="detail-grid">'+
 [['Recebido no servidor',fmt(e.received_at)],['Precisão GPS',e.accuracy==null?'Não informada':e.accuracy+' m'],['Coordenadas',e.lat==null?'Indisponíveis':e.lat+', '+e.lng],['Ronda',e.round_id||'Sem vínculo'],['Arquivos associados',details]].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div></div></details></section>';
}
function render(){
 if(!account){loginView();return}
 roleTag.textContent=roles[account.role]||account.role;
 const content=selected?.event?eventView(selected.event):selected?.person?personView(selected.person):
   account.role==='ronda'?(page==='history'?ownHistory():page==='send'?sendView():ownDashboard()):
   account.role==='operador'?(page==='events'?eventsView():page==='team'?teamView():monitorView()):
   page==='dashboard'?dashboardView():page==='events'?eventsView():page==='team'?teamView():page==='alerts'?alertView():page==='export'?exportView():dashboardView();
 root.innerHTML='<div class="workspace">'+nav()+'<article class="content">'+content+'</article></div>';
 if(selected?.event){void loadMessages(selected.event.id);void loadMedia(selected.event.id);}
}
async function loadMessages(eventId){
 try{messages=(await api('/events/'+eventId+'/messages')).messages||[];const host=document.querySelector('#thread');if(!host)return;
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
   const element=document.createElement('figure'),visual=document.createElement(media.mimetype.startsWith('video/')?'video':'img');
   visual.src=url;if(visual.tagName==='VIDEO')visual.controls=true;visual.alt='Evidência do evento';
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
  if(target.dataset.page){if(!(roleMenus[account.role]||[]).some(entry=>entry[0]===target.dataset.page))return;selected=null;page=target.dataset.page;render();return;}
  if(target.dataset.event){const chosen=events.find(x=>x.id===target.dataset.event);if(!chosen)return;selected={event:chosen};render();return;}
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
 const form=e.target;
 if(!['central-login','new-user','save-template','recipient-form','send-alert','review-event','send-message','upload-evidence'].includes(form.id))return;
 e.preventDefault();const d=Object.fromEntries(new FormData(form));
 try{
  if(form.id==='central-login'){const result=await api('/login',{method:'POST',data:d});token=result.token;sessionStorage.setItem('rondaspro_api_token',token);await load();return;}
  if(form.id==='new-user'){await api('/users',{method:'POST',data:d});flash('Colaborador cadastrado.');await load();return;}
  if(form.id==='save-template'){const f=new FormData(form);const recipients=f.getAll('recipients');if(!recipients.length)throw Error('Escolha ao menos um grupo destinatário.');await api('/templates',{method:'POST',data:{...d,enabled:f.has('enabled'),cooldownMin:Number(d.cooldownMin),recipients}});flash('Modelo salvo no banco.');await load();return;}
  if(form.id==='recipient-form'){await api('/recipients',{method:'POST',data:{email:d.email,groupName:d.groupName,enabled:true}});form.reset();flash('Destinatário cadastrado.');return;}
  if(form.id==='send-alert'){
   await api('/events',{method:'POST',data:{kind:'alert',occurredAt:Date.now(),description:d.description,details:{templateId:d.templateId}}});
   flash('Alerta registrado. Consulte o status do envio no servidor.');page='events';await load();return;
  }
  if(form.id==='review-event'){await api('/events/'+selected.event.id+'/review',{method:'POST',data:d});flash('Tratamento registrado.');await load();return;}
  if(form.id==='send-message'){await api('/events/'+selected.event.id+'/messages',{method:'POST',data:{body:d.body,audience:d.audience||'general'}});form.reset();await loadMessages(selected.event.id);return;}
  if(form.id==='upload-evidence'){
   const file=form.querySelector('[name=file]').files[0];if(!file)throw new Error('Selecione uma mídia');
   const at=file.lastModified||Date.now();
   await api('/media',{method:'POST',raw:file,headers:{'Content-Type':file.type,'X-Ronda-Event-Id':selected.event.id,'X-Captured-At':String(at)}});
   form.reset();await loadMedia(selected.event.id);flash('Evidência guardada no servidor.');return;
  }
 }catch(err){flash(err.message)}
});
exit.addEventListener('click',async()=>{try{await api('/logout',{method:'POST'})}catch{}token='';account=null;sessionStorage.removeItem('rondaspro_api_token');loginView()});
load();
