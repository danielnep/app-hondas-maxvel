import {createXlsxReport} from './report-xlsx.js';
const root=document.querySelector('#central-root'),exit=document.querySelector('#exit'),roleTag=document.querySelector('#current-role'),notice=document.querySelector('#notice');
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'Não informado';
const id=x=>escape(x);
const friendly={panic:'Pânico',gps:'Posição GPS',battery:'Bateria',incident:'Ocorrência',checkpoint:'Ponto',alert:'Alerta por e-mail',gps_issue:'Falha GPS',route_deviation:'Possível desvio',patrol_start:'Início da ronda',patrol_end:'Término'};
let token=sessionStorage.getItem('rondaspro_api_token')||'',account=null,page='dashboard',events=[],users=[],dashboard=null,templates=[],selected=null,messages=[],media=[],recentMediaUrls=[];
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
  const requested=[api('/events?limit=500'),api('/templates')];
  if(review()){requested.push(api('/dashboard'),api('/users'));}
  const responses=await Promise.all(requested);
  events=responses[0].events||[];templates=responses[1].templates||[];
  if(review()){dashboard=responses[2];users=responses[3].users||[];}
  render();
 }catch(err){sessionStorage.removeItem('rondaspro_api_token');token='';loginView(err.message)}
}
const nav=()=>{
 const menus=review()?[['dashboard','Resumo'],['events','Ocorrências e registros'],['team','Equipe e análises'],['alerts','Alertas e e-mails']]:[['events','Meus registros'],['send','Registrar alerta']];
 if(account.role==='ronda')menus.push(['send','Novo alerta']);
 if(privileged())menus.push(['export','Exportar XLSX']);
 return '<nav class="side" aria-label="Áreas da central">'+menus.filter((x,i,a)=>a.findIndex(y=>y[0]===x[0])===i).map(([k,v])=>'<button data-page="'+k+'" class="'+(page===k?'active':'')+'">'+escape(v)+'</button>').join('')+'</nav>';
};
function kpis(){
 const kinds=Object.fromEntries((dashboard?.metrics||[]).map(x=>[x.kind,x.count]));
 return '<div class="cards">'+[['Eventos',events.length],['Pânicos',kinds.panic||0],['Ocorrências',kinds.incident||0],['Amostras GPS',kinds.gps||0],['Alertas de e-mail',kinds.alert||0],['Baterias monitoradas',kinds.battery||0]].map(([label,num])=>'<div class="metric"><strong>'+num+'</strong><span>'+label+'</span></div>').join('')+'</div>';
}
function dashboardView(){
 return '<section class="stack"><div class="toolbar"><div><h1>Visão geral</h1><p class="muted">Indicadores originados do banco operacional autenticado, sem misturar simulações.</p></div><button data-refresh>Atualizar</button></div>'+
 kpis()+'<section class="surface"><h2>Colaboradores e evidências</h2>'+
 (dashboard?.team?.length?'<div class="list">'+dashboard.team.map(w=>'<button class="list-item" data-person="'+id(w.id)+'"><span><b>'+escape(w.name)+'</b><small>'+escape(w.description||'Sem descrição')+'</small></span><span>'+Number(w.events||0)+' eventos · '+Number(w.panics||0)+' pânicos</span></button>').join('')+'</div>':'<p class="empty">Nenhum colaborador com registros no banco.</p>')+
 '</section><section class="surface"><h2>Últimos acontecimentos</h2>'+eventList(events.slice(0,12))+'</section></section>';
}
function eventList(rows){
 return rows.length?'<div class="list">'+rows.map(e=>'<button class="list-item" data-event="'+id(e.id)+'"><span><b>'+escape(friendly[e.kind]||e.kind)+'</b><small>'+fmt(e.occurred_at)+' · '+escape(e.description||'Sem descrição')+'</small></span><span class="pill '+(e.kind==='panic'?'flag':'')+'">'+escape(e.status)+'</span></button>').join('')+'</div>':'<div class="empty">Nenhum registro encontrado.</div>';
}
function eventsView(){
 const incident=events.filter(e=>['incident','panic','alert','route_deviation','gps_issue'].includes(e.kind)),rest=events.filter(e=>!incident.includes(e));
 return '<section class="stack"><div class="toolbar"><div><h1>Registros operacionais</h1><p class="muted">Ocorrências, pânico, alertas e telemetria com data, hora e autoria.</p></div><button data-refresh>Atualizar</button></div><section class="surface"><h2>Ocorrências prioritárias</h2>'+eventList(incident)+'</section><section class="surface"><h2>Demais eventos</h2>'+eventList(rest)+'</section></section>';
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
 return '<section class="stack"><h1>Alertas configuráveis</h1><section class="surface"><h2>Modelos predefinidos e personalizados</h2><div class="list">'+templates.map(t=>'<button class="list-item" data-template="'+id(t.id)+'"><span><b>'+escape(t.title)+'</b><small>'+escape(t.trigger)+' · '+escape(t.priority)+' · '+Number(t.cooldown_min)+' min</small></span><span class="pill">'+(t.enabled?'Ativo':'Desativado')+'</span></button>').join('')+'</div></section>'+form+'</section>';
}
function sendView(){
 return '<section class="stack"><h1>Alerta por e-mail</h1><form id="send-alert" class="surface"><p class="muted">Função separada do botão de pânico. O registro é salvo antes de tentar a notificação.</p><label>Modelo<select name="templateId">'+templates.filter(t=>t.enabled&&t.trigger==='manual').map(t=>'<option value="'+id(t.id)+'">'+escape(t.title)+'</option>').join('')+'</select></label><label>Descrição<textarea name="description" required minlength="10" maxlength="2000"></textarea></label><button class="primary">Registrar alerta</button></form></section>';
}
function exportView(){
 return '<div class="stack"><h1>Relatório inteligente</h1><div class="cards">'+[['Rondas',events.filter(e=>e.kind==='patrol_start').length],['Pânicos',events.filter(e=>e.kind==='panic').length],['Ocorrências',events.filter(e=>e.kind==='incident').length],['Registros GPS',events.filter(e=>e.kind==='gps').length]].map(([x,y])=>'<div class="metric"><strong>'+y+'</strong><span>'+x+'</span></div>').join('')+'</div><section class="surface"><h2>Exportar Excel completo</h2><p>O XLSX inclui uma primeira aba Dashboard formatada, seguida de abas com eventos e conversas. Os dados dependem dos registros efetivamente sincronizados.</p><button class="primary" id="download-xlsx">Baixar XLSX com abas</button></section><section class="surface"><h2>Impressão e PDF</h2><p>Abra uma ocorrência e escolha Imprimir conversa / PDF para exportar a cronologia com horário de cada mensagem.</p></section></div>';
}
function eventView(e){
 const coordinates=Number.isFinite(e.lat)&&Number.isFinite(e.lng),coords=coordinates?e.lat.toFixed(6)+', '+e.lng.toFixed(6):'Localização indisponível';
 const maps=coordinates?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+encodeURIComponent(e.lat)+'&mlon='+encodeURIComponent(e.lng)+'#map=17/'+encodeURIComponent(e.lat)+'/'+encodeURIComponent(e.lng)+'">Abrir localização no mapa ↗</a>':'<span>GPS não disponível</span>';
 return '<section class="stack" id="print-conversation"><div class="toolbar"><button class="no-print" data-page="events">← Voltar</button><div class="row"><button id="print-chat" class="no-print">Imprimir conversa / PDF</button><button data-refresh class="no-print">Atualizar</button></div></div>'+
 '<section class="surface"><p class="muted">REGISTRO OPERACIONAL · '+escape(e.id)+'</p><h1>'+escape(friendly[e.kind]||e.kind)+'</h1><p>'+escape(e.description||'Sem descrição')+'</p><div class="detail-grid">'+
 [['Data e hora',fmt(e.occurred_at)],['Recebido pelo servidor',fmt(e.received_at)],['Responsável',users.find(u=>u.id===e.user_id)?.name||account.name],['Status',e.status],['Bateria',e.battery==null?'Não informada':e.battery+'%'],['Localização',coords],['Precisão GPS',e.accuracy==null?'Não informada':e.accuracy+' m'],['Ronda',e.round_id||'Sem vínculo']].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div><p>'+maps+'</p>'+
 (review()?'<form id="review-event" class="no-print"><h2>Tratar ocorrência</h2><div class="row"><select name="status" style="max-width:230px"><option value="aberta">Aberta</option><option value="em_analise">Em análise</option><option value="resolvida">Resolvida</option></select><button class="primary">Salvar tratamento</button></div><label>Providência / descrição interna<textarea name="note" placeholder="Ao concluir, descreva a providência tomada"></textarea></label></form>':'')+
 '</section><section class="surface"><h2>Evidências (foto ou vídeo)</h2><p class="muted">Cada arquivo exibe horário de captura, posição e bateria informados no evento. A mídia só abre para usuários autorizados.</p><div id="evidence-list" class="photo-grid"></div><form id="upload-evidence" class="row no-print"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" name="file" required style="max-width:400px"><button>Adicionar evidência</button></form></section>'+
 '<section class="surface"><h2>Conversa e providências</h2><div id="thread" class="thread"></div><form id="send-message" class="no-print"><label>Nova mensagem<textarea name="body" required maxlength="4000"></textarea></label><div class="row">'+(review()?'<label>Visibilidade<select name="audience"><option value="general">Geral · visível ao vigia</option><option value="system">Somente equipe e sistema</option></select></label>':'')+'<button class="primary">Enviar resposta</button></div></form></section></section>';
}
function render(){
 if(!account){loginView();return}
 roleTag.textContent=roles[account.role]||account.role;
 const content=selected?.event?eventView(selected.event):selected?.person?personView(selected.person):
   page==='dashboard'?dashboardView():page==='events'?eventsView():page==='team'?teamView():page==='alerts'?alertView():page==='send'?sendView():exportView();
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
   element.append(visual,label);host.append(element);
  }
 }catch(e){flash(e.message)}
}
async function downloadXlsx(){
 const d=await api('/export');
 const report={source:'SQLite operacional',at:d.at,events:d.events,mensagens:d.messages};
 const file=createXlsxReport(report),url=URL.createObjectURL(file),anchor=document.createElement('a');
 anchor.href=url;anchor.download='rondas-pro-completo-'+new Date().toISOString().slice(0,10)+'.xlsx';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
document.addEventListener('click',async e=>{
 const target=e.target.closest('button');if(!target)return;
 try{
  if(target.dataset.page){selected=null;page=target.dataset.page;render();return;}
  if(target.dataset.event){selected={event:events.find(x=>x.id===target.dataset.event)};render();return;}
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
  if(target.id==='print-chat'){window.print();return;}
  if(target.id==='download-xlsx'){await downloadXlsx();flash('Exportação gerada.');return;}
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
