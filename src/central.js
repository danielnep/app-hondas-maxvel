import {createXlsxReport} from './report-xlsx.js';
import {createRouteBoard} from './route-board.js';
import {openConclusionDialog} from './conclusion-dialog.js';
import {createOpsCenterUI} from './ops-center-ui.js';
const root=document.querySelector('#central-root'),exit=document.querySelector('#exit'),roleTag=document.querySelector('#current-role'),notice=document.querySelector('#notice');
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'Não informado';
const id=x=>escape(x);
const friendly={message:'Mensagem à central',panic:'Pânico',gps:'Posição GPS',battery:'Bateria',incident:'Ocorrência',checkpoint:'Ponto',alert:'Alerta por e-mail',gps_issue:'Falha GPS',route_deviation:'Possível desvio',patrol_start:'Início da ronda',patrol_end:'Término',inspection:'Vistoria de qualidade',patrol_interrupted:'Ronda interrompida',patrol_incomplete:'Ronda incompleta'};
let composeKind='message';
let token=sessionStorage.getItem('rondaspro_api_token')||'',account=null,page='dashboard',events=[],users=[],dashboard=null,mySummary=null,rounds=[],routes=[],templates=[],selected=null,messages=[],media=[],emailJobs=[],recentMediaUrls=[],treatments=[];
let occurrenceFilters={status:'pending',kind:'all',worker:'all',reviewer:'all',dateFrom:'',dateTo:'',query:''};
const roles={ronda:'Vigia',operador:'Monitoramento',coi:'COI',admin:'Administrador',master:'Master',cliente:'Cliente',vistoriador:'Vistoriador'};
function flash(text){notice.textContent=text;notice.classList.add('visible');setTimeout(()=>notice.classList.remove('visible'),4800)}
async function api(path,{method='GET',data,headers={},raw}={}){
 const res=await fetch('/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!raw&&data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:raw??(data===undefined?undefined:JSON.stringify(data))});
 if(!res.ok){let msg='Falha HTTP '+res.status;try{msg=(await res.json()).error||msg}catch{}const error=new Error(msg);error.status=res.status;throw error}
 return res.headers.get('content-type')?.includes('application/json')?res.json():res.blob();
}
const privileged=()=>account&&['admin','master'].includes(account.role);
const review=()=>account&&['operador','coi','admin','master'].includes(account.role);
const ops=createOpsCenterUI({api,flash,openNotice:({page:nextPage,eventId}={})=>{if(eventId){const evt=events.find(x=>x.id===eventId);if(evt){selected={event:evt};page=review()?'events':'history';render();return;}}if(nextPage){selected=null;page=nextPage;render();}}});
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
   if(account.role==='ronda'&&['alert','incident','message'].includes(requestedCompose)){
    composeKind=requestedCompose;page='send';history.replaceState(null,'',location.pathname+location.search);
   }
  }
  if(account.role==='ronda')try{await api('/presence',{method:'POST'});}catch{}
  await ops.refresh(account,false);
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
  render();ops.present();ops.connectLive(token);
 }catch(err){if(err.status===401||err.status===403){sessionStorage.removeItem('rondaspro_api_token');token='';account=null;root.dataset.loadedRole='';loginView(err.message)}else if(account){flash('Não foi possível atualizar agora: '+err.message)}else loginView('Serviço indisponível: '+err.message)}
}
const roleMenus={
 ronda:[['dashboard','Minha ronda','◉'],['dispatches','Atribuições','⌖'],['notifications','Notificações','✉'],['history','Meu histórico','▤'],['send','Comunicar à central','✉'],['guide','Guia completo','?']],
 operador:[['monitor','COI · Monitoramento','◉'],['dispatches','Despachos','⌖'],['notifications','Notificações','✉'],['routes','Rotas por vigia','⌖'],['events','Ocorrências','!'],['team','Vigias','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 coi:[['monitor','COI · Monitoramento','◉'],['dispatches','Despachos','⌖'],['notifications','Notificações','✉'],['routes','Rotas por vigia','⌖'],['events','Ocorrências','!'],['team','Vigias','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 admin:[['dashboard','Indicadores','▥'],['monitor','COI · Monitoramento','◉'],['dispatches','Despachos','⌖'],['notifications','Notificações','✉'],['permissions','Permissões COI','⚙'],['routes','Rotas por vigia','⌖'],['events','Ocorrências','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 master:[['dashboard','Indicadores','▥'],['monitor','COI · Monitoramento','◉'],['dispatches','Despachos','⌖'],['notifications','Notificações','✉'],['permissions','Permissões COI','⚙'],['routes','Rotas por vigia','⌖'],['events','Ocorrências','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 cliente:[['client','Meu acompanhamento','◉'],['guide','Guia completo','?']],
 vistoriador:[['inspections','Vistorias e qualidade','▤'],['guide','Guia completo','?']]
};
const nav=()=>'<nav class="side" aria-label="Navegação do '+escape(roles[account.role])+'">'+
 (roleMenus[account.role]||[]).filter(([key])=>!review()||!({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'}[key])||ops.allowed(({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[key])).map(([key,label,icon])=>'<button type="button" data-page="'+key+'" class="'+(page===key?'active':'')+'"'+(page===key?' aria-current="page"':'')+'><span class="nav-symbol" aria-hidden="true">'+icon+'</span>'+escape(label)+'</button>').join('')+'</nav>';
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
let operationalMap=null;
function resetOperationalMap(){if(operationalMap){try{operationalMap.remove()}catch{}operationalMap=null}}
function mountOperationalMap(){
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
 const active=rounds.filter(r=>r.status==='em_andamento'),open=events.filter(e=>['panic','incident','alert','gps_issue','route_deviation','patrol_incomplete','patrol_interrupted','message'].includes(e.kind)&&e.status!=='resolvida');
 const urgent=open.filter(e=>e.kind==='panic');
 const current=active[0],def=routes.find(r=>r.id===current?.routeId)||routes[0],worker=users.find(w=>w.id===current?.userId);
 const future=routes.filter(r=>r.id!==def?.id).slice(0,8);
 const list=active.length?active:rounds.slice(0,6);
 const info=current?escape(worker?.name||'Vigia')+' · '+escape(current.site||'Posto não informado')+' · '+fmt(current.start):def?escape(def.workerName||'Vigia')+' · '+escape(def.site||'Posto')+' · Horário a definir':'Nenhuma ronda programada';
 return '<section class="stack ops-monitor"><div class="toolbar"><div><div class="eyebrow">COI · MONITORAMENTO INTEGRADO</div><h1>Centro operacional</h1><p class="muted">Acompanhamento das equipes, prioridades e registros sincronizados. GPS sem sinal recente não é tratado como desvio comprovado.</p></div><button data-refresh>Atualizar</button></div>'+
 '<div class="ops-monitor-kpis">'+[['Em ronda',active.length],['Pendentes',open.length],['Pânicos',urgent.length],['Vigias',users.filter(w=>w.role==='ronda').length]].map(([label,num],i)=>'<div class="ops-monitor-kpi'+(i===2&&num?' critical':'')+'"><strong>'+num+'</strong><span>'+label+'</span></div>').join('')+'</div>'+
 '<div class="ops-monitor-columns"><section class="surface ops-monitor-main"><div class="toolbar"><div><div class="eyebrow">MAPA DINÂMICO</div><h2>'+(current?'Ronda em andamento':def?'Próxima rota cadastrada':'Nenhuma rota ativa')+'</h2><p class="muted">'+info+'</p></div><button data-page="routes">Ver percursos</button></div><div id="ops-live-map" class="ops-live-map" aria-label="Mapa da ronda atual com trajeto planejado e última posição GPS"></div><p class="muted">Azul celeste: trajeto previsto · Verde: percurso GPS recebido · A localização só é considerada atual quando houver leitura recente.</p></section>'+
 '<aside class="surface ops-monitor-sequence"><div class="toolbar"><h2>Sequência de rondas</h2><button data-page="dispatches">Novo despacho</button></div>'+
 '<div class="ops-sequence-list">'+(current?'<div class="ops-sequence-row is-live"><b>Em andamento</b><strong>'+escape(worker?.name||'Vigia')+'</strong><small>'+fmt(current.start)+' · '+escape(current.site||'Posto')+'</small></div>':'')+
 (def&&!current?'<div class="ops-sequence-row"><b>Próxima rota cadastrada</b><strong>'+escape(def.name)+'</strong><small>'+escape(def.workerName||'Vigia')+' · Horário ainda não programado</small></div>':'')+
 future.map((route,i)=>'<div class="ops-sequence-row"><b>Subsequente '+(i+1)+'</b><strong>'+escape(route.name)+'</strong><small>'+escape(route.workerName||'Vigia')+' · Horário ainda não programado</small></div>').join('')+
 '<h3>Histórico recente</h3>'+rounds.filter(r=>r.status!=='em_andamento').slice(0,5).map(r=>'<div class="ops-sequence-row"><b>'+escape(roundStatus(r))+'</b><strong>'+escape(users.find(w=>w.id===r.userId)?.name||'Vigia')+'</strong><small>'+fmt(r.start)+'</small></div>').join('')+'</div></aside></div>'+
 '<section class="surface"><div class="toolbar"><h2>Vigias e localização</h2><button data-page="team">Consultar equipe</button></div>'+monitorRows(list)+'</section>'+
 '<section class="ops-monitor-footer"><div class="toolbar"><div><h2>Alertas e ocorrências</h2><p class="muted">'+open.length+' registro(s) aguardando acompanhamento</p></div><button data-page="events">Abrir e tratar</button></div>'+eventList(open.slice(0,5))+'</section></section>';
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
 return rows.length?'<div class="list">'+rows.map(e=>'<button class="list-item" data-event="'+id(e.id)+'"><span><b>'+escape(friendly[e.kind]||e.kind)+'</b><small>'+fmt(e.occurred_at)+' · '+escape(e.description||'Sem descrição')+'</small></span><span class="pill '+(e.kind==='panic'?'flag':'')+'">'+escape(e.status)+'</span></button>').join('')+'</div>':'<div class="empty">Nenhum registro encontrado.</div>';
}
function eventsView(){
 const priority=events.filter(e=>['incident','panic','alert','route_deviation','gps_issue'].includes(e.kind));
 const routineMessages=events.filter(e=>e.kind==='message');
 const lastTreatment=e=>treatments.find(t=>t.event_id===e.id);
 const option=(v,key)=>occurrenceFilters[key]===v?'selected':'';
 const workerOptions=users.filter(u=>u.role==='ronda').map(u=>'<option value="'+id(u.id)+'" '+option(u.id,'worker')+'>'+escape(u.name)+'</option>').join('');
 const reviewerOptions=users.filter(u=>['operador','coi','admin','master'].includes(u.role)).map(u=>'<option value="'+id(u.id)+'" '+option(u.id,'reviewer')+'>'+escape(u.name)+'</option>').join('');
 const passed=priority.filter(e=>{
  const t=lastTreatment(e),f=occurrenceFilters;
  if(f.status==='pending'&&e.status==='resolvida')return false;
  if(f.status==='resolved'&&e.status!=='resolvida')return false;
  if(f.status==='forwarded'&&e.status!=='encaminhada')return false;
  if(f.kind!=='all'&&e.kind!==f.kind)return false;
  if(f.worker!=='all'&&e.user_id!==f.worker)return false;
  if(f.reviewer!=='all'&&t?.author_id!==f.reviewer)return false;
  if(f.dateFrom&&e.occurred_at<new Date(f.dateFrom+'T00:00:00').getTime())return false;
  if(f.dateTo&&e.occurred_at>new Date(f.dateTo+'T23:59:59').getTime())return false;
  if(f.query&&!String([e.description,e.id,t?.conclusion,t?.concluded_by,t?.reporter_name].join(' ')).toLocaleLowerCase('pt-BR').includes(f.query.toLocaleLowerCase('pt-BR')))return false;
  return true;
 });
 const rows=passed.length?passed.map(e=>{
  const t=lastTreatment(e),who=users.find(u=>u.id===e.user_id)?.name||'Colaborador';
  return '<button type="button" class="list-item occurrence-row" data-event="'+id(e.id)+'"><span><b>'+escape(friendly[e.kind]||e.kind)+'</b>'+
   '<small>'+fmt(e.occurred_at)+' · '+escape(who)+' · '+escape(e.description||'Sem descrição')+'</small>'+
   (t?'<small>Último tratamento: '+escape(t.concluded_by)+' · '+fmt(t.created_at)+' · '+escape(t.conclusion.slice(0,150))+'</small>':'<small>Aguardando tratamento e conclusão</small>')+'</span>'+
   '<span class="pill '+(e.status==='resolvida'?'':'flag')+'">'+escape(e.status.replaceAll('_',' '))+'</span></button>';
 }).join(''):'<div class="empty">Nenhuma ocorrência corresponde aos filtros.</div>';
 return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">HISTÓRICO AUDITÁVEL</div><h1>Ocorrências</h1>'+
 '<p class="muted">Pendentes, encaminhadas e tratadas, com responsável, conclusão e linha do tempo.</p></div><button data-refresh>Atualizar</button></header>'+
 '<div class="cards"><div class="metric"><strong>'+priority.filter(e=>e.status!=='resolvida').length+'</strong><span>Pendentes</span></div>'+
 '<div class="metric"><strong>'+priority.filter(e=>e.status==='resolvida').length+'</strong><span>Tratadas</span></div>'+
 '<div class="metric"><strong>'+priority.filter(e=>e.status==='encaminhada').length+'</strong><span>Encaminhadas</span></div></div>'+
 '<section class="surface"><div class="toolbar"><h2>Histórico de ocorrências</h2><button type="button" data-occ-reset>Limpar filtros</button></div>'+
 '<div class="occurrence-filters">'+
 '<label>Situação<select data-occ-filter="status"><option value="pending" '+option('pending','status')+'>Pendentes</option><option value="resolved" '+option('resolved','status')+'>Tratadas</option><option value="forwarded" '+option('forwarded','status')+'>Encaminhadas</option><option value="all" '+option('all','status')+'>Todas</option></select></label>'+
 '<label>Tipo<select data-occ-filter="kind"><option value="all">Todos</option>'+['incident','panic','alert','route_deviation','gps_issue'].map(k=>'<option value="'+k+'" '+option(k,'kind')+'>'+escape(friendly[k])+'</option>').join('')+'</select></label>'+
 '<label>Quem registrou<select data-occ-filter="worker"><option value="all">Todos os vigias</option>'+workerOptions+'</select></label>'+
 '<label>Quem concluiu<select data-occ-filter="reviewer"><option value="all">Toda a equipe</option>'+reviewerOptions+'</select></label>'+
 '<label>De<input type="date" data-occ-filter="dateFrom" value="'+escape(occurrenceFilters.dateFrom)+'"></label>'+
 '<label>Até<input type="date" data-occ-filter="dateTo" value="'+escape(occurrenceFilters.dateTo)+'"></label>'+
 '<label class="occurrence-search">Busca / tratamento<input type="search" data-occ-filter="query" value="'+escape(occurrenceFilters.query)+'" placeholder="Descrição, conclusão, responsável"></label></div>'+
 '<div class="list">'+rows+'</div><p class="muted">Exibindo '+passed.length+' de '+priority.length+' ocorrências encontradas. A conclusão fica preservada no histórico de tratamento do servidor.</p></section>'+
 '<details class="details-toggle"><summary>Mensagens à central · '+routineMessages.length+'</summary><section class="surface">'+eventList(routineMessages)+'</section></details></section>';
}
function teamView(){
 return '<section class="stack"><h1>Equipe e indicadores individuais</h1><div class="surface"><div class="list">'+(dashboard?.team||[]).map(w=>'<button data-person="'+id(w.id)+'" class="list-item"><span><b>'+escape(w.name)+'</b><small>'+escape(w.description||'Descrição pendente')+'</small></span><span>'+Number(w.events||0)+' eventos · '+Number(w.panics||0)+' acionamentos</span></button>').join('')+'</div></div>'+
 (privileged()?'<form id="new-user" class="surface"><h2>Cadastrar membro da equipe</h2><p class="muted">Informe a descrição da supervisão sobre o vigia no cadastro. A descrição será armazenada no banco.</p><div class="grid"><label>Nome<input required name="name" minlength="2"></label><label>E-mail<input required type="email" name="email"></label><label>Perfil<select name="role"><option value="ronda">Vigia</option><option value="operador">Equipe interna</option><option value="coi">COI</option><option value="vistoriador">Vistoriador</option><option value="cliente">Cliente (consulta)</option><option value="admin">Administrador</option>'+(account.role==='master'?'<option value="master">Master</option>':'')+'</select></label><label>Local/posto vinculado<input name="site" maxlength="100" placeholder="Ex.: Unidade Centro"></label><label>Senha inicial (12+ caracteres)<input required name="password" minlength="12" type="password"></label></div><label>Descrição do supervisor sobre o colaborador<textarea name="description" placeholder="Resumo factual das atribuições, posto e orientações de acompanhamento" minlength="10"></textarea></label><button class="primary">Cadastrar</button></form>':'')+'</section>';
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
   '<label>Descreva o alerta<textarea name="description" required minlength="10" maxlength="2000" placeholder="O que a central precisa saber?"></textarea></label><button class="primary">Enviar alerta</button></form>'
  :composeKind==='incident'
   ?'<form id="register-incident" class="surface stack"><h2>Registrar ocorrência</h2><p class="muted">Documente um fato observado. Depois de registrar, você poderá adicionar evidências e acompanhar as respostas.</p><label>Assunto<input name="title" minlength="3" maxlength="100" required placeholder="Ex.: Acesso não autorizado"></label><label>Descrição<textarea name="description" required minlength="10" maxlength="1800" placeholder="Descreva o que aconteceu..."></textarea></label><button class="primary">Registrar ocorrência</button></form>'
   :'<form id="send-note" class="surface stack"><h2>Enviar mensagem à central</h2><p class="muted">Comunicação cotidiana, sem classificar automaticamente como emergência ou ocorrência.</p><label>Mensagem<textarea name="description" required minlength="3" maxlength="2000" placeholder="Escreva sua mensagem..."></textarea></label><button class="primary">Enviar mensagem</button></form>';
 return '<section class="stack"><div class="toolbar"><div><div class="eyebrow">CONTATO OPERACIONAL</div><h1>Comunicar à central</h1><p class="muted">Escolha o tipo de comunicação. O botão de pânico permanece disponível para urgências.</p></div></div>'+composeActionButtons()+form+'</section>';
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
 (review()?'<section class="surface no-print"><h2>Tratamento pela equipe</h2><p class="muted">Cada decisão exige uma conclusão descritiva, com responsável, horário e histórico auditável.</p>'+
 '<div class="row treatment-actions" role="group" aria-label="Opções de tratamento">'+
 '<button type="button" data-review-status="em_analise">Registrar análise</button>'+
 '<button type="button" data-review-status="encaminhada">Encaminhar ao administrativo</button>'+
 '<button type="button" class="primary" data-review-status="resolvida">Marcar como analisada</button></div></section>':'')+
  '<section class="surface"><h2>Anexos e evidências</h2><p class="muted">Fotos e vídeos enviados, com data, hora, localização disponível e bateria.</p><div id="evidence-list" class="photo-grid"></div>'+
 '<form id="upload-evidence" class="row no-print"><label>Adicionar evidência<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/webm,audio/mp4,audio/ogg" name="file" required></label><button>Enviar mídia</button></form></section>'+
 '<section class="surface"><h2>Conversa e providências</h2><div id="thread" class="thread"></div>'+
 '<form id="send-message" class="stack no-print"><label>Responder<textarea name="body" required maxlength="4000" placeholder="Escreva a mensagem..."></textarea></label><div class="row">'+
 (review()?'<label>Tipo de mensagem<select name="audience"><option value="general">Resposta geral · vigia pode ler</option><option value="system">Resposta interna · somente equipe</option></select></label>':'')+
 '<button class="primary">Enviar resposta</button></div></form></section>'+
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
function clientView(){
 const active=rounds.filter(r=>r.status==='em_andamento'),past=rounds.filter(r=>r.status!=='em_andamento');
 const item=r=>'<details class="details-toggle"><summary>'+escape(roundStatus(r))+' · Ronda '+escape(String(r.id).slice(0,9))+' · '+fmt(r.start)+'</summary><div class="surface"><div class="detail-grid">'+[['Local',r.site||account.site],['Situação',roundStatus(r)],['Início',fmt(r.start)],['Término',fmt(r.end)],['Última leitura GPS',fmt(r.lastFixAt)],['Pontos registrados',r.checkpoints],['Distância estimada',Number(r.km||0).toFixed(2)+' km']].map(([k,v])=>'<div><small>'+escape(k)+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div>'+positionMap(r.lastFix)+'<p class="muted">A posição é a última recebida. Sem GPS recente não significa desvio comprovado.</p></div></details>';
 return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">VISÃO CLIENTE · SOMENTE CONSULTA</div><h1>'+siteLabel()+'</h1><p class="muted">Status e histórico das rondas do seu local autorizado.</p></div><button data-refresh>Atualizar</button></header><div class="cards"><div class="metric"><strong>'+active.length+'</strong><span>Em andamento</span></div><div class="metric"><strong>'+past.filter(r=>r.status==='concluida').length+'</strong><span>Concluídas</span></div><div class="metric"><strong>'+past.filter(r=>['interrompida','incompleta'].includes(r.status)).length+'</strong><span>Incompletas / interrompidas</span></div></div><section class="surface"><h2>Rondas em andamento</h2><p class="muted">Atualização automática a cada 30 segundos enquanto o painel estiver aberto.</p>'+(active.length?active.map(item).join(''):'<div class="empty">Nenhuma ronda ativa neste local.</div>')+'</section><section class="surface"><h2>Últimas rondas</h2>'+(past.length?past.slice(0,40).map(item).join(''):'<div class="empty">Nenhuma ronda anterior registrada para este local.</div>')+'</section></section>';
}
function inspectionView(){
 const entries=events.filter(e=>e.kind==='inspection'),scored=entries.filter(e=>Number.isFinite(e.details?.qualityPercent));
 const avg=scored.length?Math.round(scored.reduce((n,e)=>n+e.details.qualityPercent,0)/scored.length):null;
 const criteria=[['acessos','Acessos verificados'],['estrutura','Estrutura em conformidade'],['equipamentos','Equipamentos verificados'],['sinalizacao','Sinalização em conformidade']];
 return '<section class="stack"><header class="toolbar"><div><div class="eyebrow">VISTORIADOR · QUALIDADE</div><h1>'+siteLabel()+'</h1><p class="muted">Registre uma vistoria com critérios observáveis e histórico auditável.</p></div><button data-refresh>Atualizar</button></header><div class="cards"><div class="metric"><strong>'+(avg===null?'—':avg+'%')+'</strong><span>Qualidade média registrada</span></div><div class="metric"><strong>'+entries.length+'</strong><span>Vistorias</span></div></div><form id="inspection-form" class="surface stack"><h2>Nova vistoria</h2><p class="muted">Informe o resultado de cada critério verificado. Nenhum item é considerado irregular por falta de resposta.</p>'+criteria.map(([key,label])=>'<label class="inspection-check"><span>'+escape(label)+'</span><select name="'+key+'" required><option value="">Selecione o resultado</option><option value="ok">Conforme</option><option value="no">Não conforme</option></select></label>').join('')+'<label>Observações<textarea name="observation" required minlength="8" maxlength="1000" placeholder="Descreva objetivamente o que foi verificado"></textarea></label><button class="primary">Registrar vistoria</button></form><section class="surface"><h2>Histórico</h2>'+(entries.length?entries.map(e=>'<div class="list-item"><span><b>'+fmt(e.occurred_at)+'</b><small>'+escape(e.description)+'</small></span><strong>'+(Number.isFinite(e.details?.qualityPercent)?e.details.qualityPercent+'%':'—')+'</strong></div>').join(''):'<div class="empty">Nenhuma vistoria registrada.</div>')+'</section><p class="muted">Este indicador mede quatro condições de vistoria do local, não pessoas. Registros sincronizados com o servidor.</p></section>';
}

function render(){
 routeBoard.resetMaps();resetOperationalMap();
 if(!account){loginView();return}
 roleTag.textContent=roles[account.role]||account.role;
 const required=({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[page];
 if(review()&&required&&!ops.allowed(required)){page='notifications';selected=null;}
 const content=page==='guide'?guideView():page==='notifications'?ops.notificationsView():page==='dispatches'?(account.role==='ronda'?ops.vigilanteDispatches():ops.dispatchesView({users,rounds,events})):page==='permissions'?ops.permissionsView():page==='routes'&&review()?routeBoard.render():selected?.event?eventView(selected.event):selected?.person?personView(selected.person):
   account.role==='ronda'?(page==='history'?ownHistory():page==='send'?sendView():ownDashboard()):
   account.role==='cliente'?clientView():
   account.role==='vistoriador'?inspectionView():
   page==='dashboard'?dashboardView():page==='monitor'?monitorView():page==='events'?eventsView():page==='team'?teamView():page==='alerts'?alertView():page==='export'?exportView():dashboardView();
 root.innerHTML='<div class="workspace">'+nav()+'<article class="content"><div class="ops-bell-bar">'+ops.badge()+'</div>'+ops.assignmentBanner()+firstAccessGuide()+content+'</article></div>'+ 
  (account.role==='ronda'?'<button type="button" id="central-panic" class="central-panic-fab" aria-label="Abrir acionamento de pânico"><span aria-hidden="true">!</span><strong>PÂNICO</strong></button>'+
  '<dialog id="central-panic-dialog" class="central-panic-dialog" aria-labelledby="panic-title"><h2 id="panic-title">Acionar pânico?</h2><p>O acionamento prioritário será registrado com sua identificação e horário. Localização e bateria serão incluídas quando disponíveis. Use o 190 para emergências que exijam atendimento policial.</p><div class="panic-buttons"><button type="button" id="panic-cancel">Cancelar</button><button type="button" id="panic-send" class="primary">Confirmar pânico</button></div><a href="tel:190">Abrir discador 190</a></dialog>':'');
 if(selected?.event){void loadMessages(selected.event.id);void loadMedia(selected.event.id);}
 if(page==='routes'&&review())requestAnimationFrame(()=>routeBoard.mount());
 if(page==='monitor')requestAnimationFrame(mountOperationalMap);
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
  if(await ops.click(target))return;
  if(await routeBoard.click(target))return;
  if(target.dataset.compose){if(account?.role!=='ronda'||!['alert','incident','message'].includes(target.dataset.compose))return;composeKind=target.dataset.compose;selected=null;page='send';render();return;}
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
  if(target.dataset.reviewStatus){
   if(!review()||!selected?.event)return;
   const status=target.dataset.reviewStatus;
   const titles={em_analise:'Registrar análise',encaminhada:'Encaminhar ao administrativo',resolvida:'Marcar como analisada'};
   if(!titles[status])return;
   const selectedEventId=selected.event.id;
   openConclusionDialog({title:titles[status],eventLabel:(friendly[selected.event.kind]||selected.event.kind)+' · '+selected.event.description,
    action:status,onConfirm:async({conclusion})=>{
     await api('/events/'+selectedEventId+'/review',{method:'POST',data:{status,conclusion}});
     await load();flash('Conclusão registrada com data, hora e responsável.');
    }});
   return;
  }
  if(target.dataset.page){if(!(roleMenus[account.role]||[]).some(entry=>entry[0]===target.dataset.page))return;const mod=({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[target.dataset.page];if(mod&&review()&&!ops.allowed(mod)){flash('Área desabilitada pela administração.');return;}selected=null;page=target.dataset.page;render();return;}
  if(target.dataset.event){if(['cliente','vistoriador'].includes(account.role))return;const chosen=events.find(x=>x.id===target.dataset.event);if(!chosen)return;selected={event:chosen};render();return;}
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
 const form=e.target;
 if(form.id==='ops-dispatch-form'||form.id==='ops-completion-form'){e.preventDefault();try{await ops.submit(form)}catch(err){flash(err.message)}return;}
 if(form.id==='route-form'){e.preventDefault();try{await routeBoard.submit(form)}catch(err){flash(err.message)}return;}
 if(!['central-login','new-user','save-template','recipient-form','send-alert','register-incident','send-note','send-message','upload-evidence','inspection-form'].includes(form.id))return;
 e.preventDefault();const d=Object.fromEntries(new FormData(form));
 try{
  if(form.id==='central-login'){const result=await api('/login',{method:'POST',data:d});token=result.token;sessionStorage.setItem('rondaspro_api_token',token);await load();return;}
  if(form.id==='inspection-form'){
   const keys=['acessos','estrutura','equipamentos','sinalizacao'];
   if(keys.some(k=>!['ok','no'].includes(String(d[k]))))throw Error('Avalie todos os quatro critérios da vistoria.');
   const criteria=Object.fromEntries(keys.map(k=>[k,d[k]==='ok']));
   await api('/events',{method:'POST',data:{kind:'inspection',occurredAt:Date.now(),description:String(d.observation||'Vistoria registrada').trim().slice(0,1000),details:{criteria},...await eventTelemetry()}});
   flash('Vistoria salva no servidor.');await load();return;
  }
  if(form.id==='new-user'){await api('/users',{method:'POST',data:d});flash('Colaborador cadastrado.');await load();return;}
  if(form.id==='save-template'){const f=new FormData(form);const recipients=f.getAll('recipients');if(!recipients.length)throw Error('Escolha ao menos um grupo destinatário.');await api('/templates',{method:'POST',data:{...d,enabled:f.has('enabled'),cooldownMin:Number(d.cooldownMin),recipients}});flash('Modelo salvo no banco.');await load();return;}
  if(form.id==='recipient-form'){await api('/recipients',{method:'POST',data:{email:d.email,groupName:d.groupName,enabled:true}});form.reset();flash('Destinatário cadastrado.');return;}
  if(form.id==='send-alert'||form.id==='register-incident'||form.id==='send-note'){
   const kind=form.id==='send-alert'?'alert':form.id==='register-incident'?'incident':'message';
   const title=String(d.title||'').trim();
   const description=kind==='incident'?title+' · '+String(d.description||'').trim():String(d.description||'').trim();
   const details=kind==='alert'&&d.templateId?{templateId:d.templateId}:kind==='incident'?{title}:{channel:'central',category:'routine'};
   await api('/events',{method:'POST',data:{kind,occurredAt:Date.now(),description,details,...await eventTelemetry()}});
   page='history';await load();
   flash(kind==='alert'?'Alerta registrado no servidor. Confira a entrega nas configurações da central.':kind==='incident'?'Ocorrência registrada na central.':'Mensagem registrada na central.');
   return;
  }
  if(form.id==='send-message'){await api('/events/'+selected.event.id+'/messages',{method:'POST',data:{body:d.body,audience:d.audience||'general'}});form.reset();await loadMessages(selected.event.id);return;}
  if(form.id==='upload-evidence'){
   const file=form.querySelector('[name=file]').files[0];if(!file)throw new Error('Selecione uma mídia');
   const at=file.lastModified||Date.now();
   await api('/media',{method:'POST',raw:file,headers:{'Content-Type':file.type,'X-Ronda-Event-Id':selected.event.id,'X-Captured-At':String(at)}});
   form.reset();await loadMedia(selected.event.id);flash('Evidência guardada no servidor.');return;
  }
 }catch(err){flash(err.message)}
});
// A central do operador acompanha o servidor sem depender de recarregar a página.
// Em caso de perda de conexão, preserva a tela e identifica leituras antigas.
setInterval(()=>{if(account&&['operador','coi','cliente','admin','master'].includes(account.role)&&['monitor','client','routes'].includes(page)&&!document.hidden&&!selected&&!(page==='routes'&&document.querySelector('#route-form')))void load();},30000);
setInterval(()=>{if(account&&!document.hidden)void ops.refresh(account,true).catch(()=>{});},15000);
setInterval(()=>{if(account?.role==='ronda'&&!document.hidden)void api('/presence',{method:'POST'}).catch(()=>{});},45000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&account?.role==='ronda')void api('/presence',{method:'POST'}).catch(()=>{});});
document.addEventListener('change',e=>{
 if(e.target?.dataset?.coiToggle){void ops.change(e.target).then(()=>load()).catch(error=>flash(error.message));return;}
 const field=e.target.closest('[data-occ-filter]');
 if(field){occurrenceFilters[field.dataset.occFilter]=field.value;render();return;}
 routeBoard.change(e.target);
});
exit.addEventListener('click',async()=>{if(account?.role==='ronda')try{await api('/presence/off',{method:'POST'})}catch{}ops.stopLive();try{await api('/logout',{method:'POST'})}catch{}token='';account=null;sessionStorage.removeItem('rondaspro_api_token');root.dataset.loadedRole='';loginView()});
load();
