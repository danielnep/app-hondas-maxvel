import {DWELL_MS,requiredDwellMs,RADIUS_METERS,DEMO_ROUTE,accurateFix,canCompletePoint,completePoint,createSession,currentCheckpoint,distanceMeters,finishSession,hasBlock,justifyDeviation,offsetRouteNear,routeLeg,progressPercent,registerIncident,acknowledge,updateLocation,checkInAtPoint} from './domain.js';
import {PatrolMap} from './map.js';
import {createRoundWizard} from './wizard.js';
import {withExampleRondas} from './demo-scenarios.js';
import {dashboardSnapshot} from './dashboard-insights.js';
import {installDialogPagination} from './dialog-pagination.js';
import {EVIDENCE_DIRECTIONS,getPointEvidence,evidenceProgress,simulateCapture,simulateRotation,confirmDemoEvidence} from './evidence.js';
import {travel,interpolated,travelDuration} from './simulation.js';
import {loadState,saveState,clearState} from './storage.js';
import {getConsent,saveConsent,LOCATION_REQUIREMENTS} from './consent.js';
import {createSpotlightTour} from './tutorial.js';
import {createUiMotion} from './ui-motion.js?v=2';
import {createOperationsUpgrade} from './operations-upgrade.js';
import {createInstallManager} from './install.js';
import {createCheckpointCurtain} from './checkpoint-curtain.js';
import {createLocationEntryGate} from './location-entry-gate.js';
import {createFieldTorch} from './field-torch.js';
import {mobileGuideFor} from './mobile-role-guides.js';
import {summarizePatrol} from './field-intelligence.js';
import {DEMO_WATCHERS,DEMO_ROUTES,demoSchedule,watcherById,routeById,routeForProgram,routeForWatcher,scheduleStatus,nextProgram,programsForWatcher,createPrograms,cancelProgram,scheduleTotals,filterPrograms,pagePrograms,rescheduleProgram} from './scheduling.js';

const installManager=createInstallManager();
const root=document.getElementById('app'),modal=document.getElementById('dialog'),toast=document.getElementById('toast');
const uiMotion=createUiMotion({root,modal});
const ICONS={
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16.2 7.8-2.4 6-6 2.4 2.4-6z"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>',
 pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 shield:'<path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path d="m8.5 12 2.5 2.5 5-5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 checkcircle:'<circle cx="12" cy="12" r="9"/><path d="m7.8 12 2.8 2.8 5.6-5.6"/>',
 alert:'<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10ZM10 21h4"/>',
 clipboard:'<rect x="4" y="4" width="16" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 11h8M8 15h8"/>',
 users:'<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"/>',
 chart:'<path d="M3 3v18h18"/><path d="m6 16 4-4 3 2 6-7"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m10 2-.6 2.4-2 1-2.3-1-2 3.4 1.8 1.7v2.5l-1.8 1.7 2 3.4 2.3-1 2 1 .6 2.4h4l.6-2.4 2-1 2.3 1 2-3.4-1.8-1.7v-2.5l1.8-1.7-2-3.4-2.3 1-2-1L14 2z"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.3-2.5 4M12 17h.01"/>',
 headset:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="12" width="4" height="8" rx="2"/><rect x="18" y="12" width="4" height="8" rx="2"/><path d="M20 19a5 5 0 0 1-5 3h-3"/>',
 arrow:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
 arrowleft:'<path d="M20 12H4m7 7-7-7 7-7"/>',
 play:'<path d="m8 5 11 7-11 7z"/>',
 pause:'<path d="M9 5v14M15 5v14"/>',
 logout:'<path d="M9 3H4v18h5M12 12h10m-4-4 4 4-4 4"/>',
 refresh:'<path d="M20 6v5h-5M4 18v-5h5"/><path d="M5.5 9A7.5 7.5 0 0 1 18 6l2 5M4 13l2 5a7.5 7.5 0 0 0 12.5-3"/>',
 flag:'<path d="M5 22V3m0 1c6-3 9 3 15 0v12c-6 3-9-3-15 0"/>',
 folder:'<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 crosshair:'<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 eye:'<path d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 download:'<path d="M12 2v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 print:'<path d="M7 8V3h10v5M6 18H4V9h16v9h-2M7 15h10v7H7z"/>',
 wifi:'<path d="M2 9a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 15a5 5 0 0 1 8 0M12 19h.01"/>'
};
const ic=(key)=>`<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]??ICONS.help}</svg>`;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const time=t=>t?new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
const tag=(t,type='neutral')=>`<span class="tag ${type}">${esc(t)}</span>`;
const btn=(label,action,type='',attrs='')=>`<button type="button" class="button ${type}" data-action="${action}" ${attrs}>${label}</button>`;
const helpButton=(topic,label)=>`<button type="button" class="context-help" data-action="feature-help" data-topic="${topic}" aria-label="O que é ${label}?" title="Entenda: ${label}">?</button>`;
const operationalLink='<a class="button small" href="/central.html">Central autenticada</a>';
const brand=()=>'<div class="brand maxvel-only-brand" aria-label="Grupo Maxvel"><span class="brand-product"><span class="ronda-pro-wordmark">Rondas <b>Pro</b></span></span><span class="brand-divider" aria-hidden="true"></span><span class="brand-partner"><span class="brand-group">GRUPO</span><img class="maxvel-real-logo" src="./assets/maxvel-logo.webp" width="585" height="183" alt="Maxvel"></span></div>';
const persisted=loadState();
let sessions=Array.isArray(persisted?.sessions)?persisted.sessions:[];
let programs=Array.isArray(persisted?.programs)?persisted.programs:demoSchedule();
let operationalSettings={
 verificationMode:['gps','qr','gps+qr'].includes(persisted?.operationalSettings?.verificationMode)?persisted.operationalSettings.verificationMode:'gps',
 dwellSeconds:Math.max(5,Math.min(120,Number(persisted?.operationalSettings?.dwellSeconds)||30)),
 deviationJustification:persisted?.operationalSettings?.deviationJustification!==false,
 evidenceEnabled:persisted?.operationalSettings?.evidenceEnabled!==false
};
let selectedWatcherId=persisted?.selectedWatcherId||'v01',selectedSupervisedWatcherId='v01',selectedProgramId=null,scheduleTab='agenda',scheduleFiltersOpen=false,scheduleFilter='all',scheduleWatcher='all',scheduleUnit='all',scheduleQuery='',schedulePage=0,pendingProgram=null,pendingEdit=null;
let user=null,screen='landing',view='overview',presentation=false,guideStage=0,presentationName='Lucas Ferreira',mode='simulation',session=null;
let priorSimulation=null;
let wizardController=null;
let patrolSheetCollapsed=true;
let nativeTracking=false,locationFix=null,deviceWatch=null,movement=null,liveMaps=[],toastTimer=null,renderNumber=0,justRendered=0,tabFilter='all',contextWarning='';
const sessionList=()=>[...sessions].sort((a,b)=>b.startedAt-a.startedAt);
const current=()=>session;
const recentNotification=()=>sessionList().flatMap(s=>(s.notifications??[]).map(n=>({...n,session:s}))).sort((a,b)=>b.at-a.at);
const recentIncidents=()=>sessionList().flatMap(s=>(s.incidents??[]).map(i=>({...i,session:s}))).sort((a,b)=>b.at-a.at);
function persist(){const ok=saveState({sessions,programs,selectedWatcherId,operationalSettings,activeSessionId:session?.status==='active'&&mode==='real'?session.id:null,activeUser:session?.status==='active'&&mode==='real'?user:null});if(!ok)notify('Não foi possível gravar no navegador. Confira o espaço disponível.');}
function save(){if(session){const idx=sessions.findIndex(s=>s.id===session.id);if(idx>=0)sessions[idx]=session;else sessions.unshift(session);}persist();void ops.autoReport()}
function notify(message){toast.textContent=message;toast.classList.add('toast-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('toast-visible'),4900)}
const ux06RoleTips={
 ronda:'Operação de Ronda: sequência, permanência, justificativas, ocorrências e histórico próprio.',
 operador:'COI · Monitoramento: rotas em execução, posicionamento, alertas e contato com o vigia.',
 coi:'COI · Monitoramento: rotas em execução, posicionamento, alertas e contato com o vigia.',
 cliente:'Cliente: acompanhamento das rondas do seu local, sem recursos administrativos.',
 vistoriador:'Vistoriador: checklist, identificação do local e indicador de qualidade.',
 admin:'Administração: supervisão, equipe, programação, alertas, relatórios e configurações.'
};
function notifyRoleView(role){notify('Visão de demonstração: '+ux06RoleTips[role]);}
function destroyMaps(){for(const m of liveMaps)m?.destroy();liveMaps=[]}
function registerMap(id,route,sessionRef=null,position=null,compact=false){const el=document.getElementById(id);if(!el)return;liveMaps.push(new PatrolMap(el,{route,session:sessionRef,position,compact,interactive:true,standbyClean:id==='mobile-map'}))}


/** MAXVEL-06 · details in modal, fixed viewport and scroll only inside a bounded list. */
function openUX06Overlay(source,title){
 if(!source||!modal)return;
 const copy=source.cloneNode(true);
 copy.classList.add('ux06-dialog-copy');
 copy.removeAttribute('hidden');copy.removeAttribute('id');
 copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
 copy.querySelectorAll('[hidden]').forEach(el=>el.removeAttribute('hidden'));
 copy.querySelectorAll('.ux-row-pagination,.ux-report-tabs,.ux-ronda-tabs,.ux06-expand-button').forEach(el=>el.remove());
 showDialog('<section class="ux06-sheet" aria-label="'+esc(title)+'"><header class="ux06-sheet-header"><div><span class="eyebrow">RONDAS PRO · MAXVEL</span><h2>'+esc(title)+'</h2></div><button type="button" data-action="close-dialog" class="ux06-sheet-back">Voltar</button></header><div class="ux06-sheet-content"></div><footer class="ux06-sheet-footer">Registros ilustrativos deste navegador.</footer></section>',true);
 modal.classList.add('ux06-fullscreen');
 modal.querySelector('.ux06-sheet-content')?.append(copy);
 modal.querySelector('.ux06-sheet-back')?.focus();
}
function installUX06(){
 if(window.innerWidth>900||screen==='landing')return;
 const content=document.querySelector('.dashboard .app-content');
 if(!content)return;
 const sections=[
  ['.v4-insights-pane','Análise e insights'],['.v4-alerts-pane','Alertas da operação'],
  ['.v4-history-pane','Histórico de rondas'],['.v4-team-pane','Equipe e registros'],
  ['.ux-report-stage [data-ux-report="analise"]','Análise operacional'],
  ['.ux-report-stage [data-ux-report="eventos"]','Eventos registrados'],
  ['.ux-report-stage [data-ux-report="historico"]','Histórico de rondas'],
  ['.ux-ronda-stage [data-ux-subpage="pontos"]','Pontos de verificação'],
  ['.ux-ronda-stage [data-ux-subpage="historico"]','Histórico do vigia']
 ];
 for(const [selector,title] of sections){
  const el=content.querySelector(selector);if(!el)continue;
  const head=el.querySelector('.v4-pane-head,.card-title,.map-checkpoint-heading');
  const button=document.createElement('button');
  button.type='button';button.className='ux06-expand-button';
  button.setAttribute('aria-label','Ampliar '+title);
  button.textContent='Ampliar';
  if(head)head.append(button);else el.prepend(button);
  button.addEventListener('click',event=>{event.stopPropagation();openUX06Overlay(el,title);});
 }
}

/** UX viewport: no document scroll, panels and list page controls remain reachable. */
let uxOverviewPanel='mapa', uxDialogPage=0,uxReportPage='resumo',uxRondaPane='mapa';
const uxDashboardPane={admin:'resumo'};
let cleanupLayoutBreakpoint=()=>{};
const uxListSizes=()=>8; // Listas roláveis: não fragmentar três itens em páginas artificiais.
function paginateRows(container,selector,groupKey,pageSize=uxListSizes()){
 if(!container)return;
 const rows=[...container.querySelectorAll(selector)].filter(e=>e.matches(selector));
 if(rows.length<=pageSize)return;
 // Paginação acompanha a lista, não fica solta ao fim do conteúdo cortado.
 const parent=rows[0].parentElement;
 const host=parent?.tagName==='TBODY'?parent.closest('table')?.parentElement:parent;
 if(!host)return;
 const dataKey='uxPage'+groupKey;
 let page=Math.max(0,Math.min(Math.ceil(rows.length/pageSize)-1,Number(container.dataset[dataKey]||0)));
 const bar=document.createElement('nav');bar.className='ux-row-pagination';
 bar.setAttribute('aria-label','Páginas de '+groupKey);
 host.classList.add('ux-paged-list');
 const paint=()=>{
  rows.forEach((row,i)=>row.hidden=i<page*pageSize||i>=(page+1)*pageSize);
  bar.innerHTML='<button type="button" data-ux-page="prev" aria-label="Página anterior" '+(page===0?'disabled':'')+'>‹</button><span>Página '+(page+1)+' de '+Math.ceil(rows.length/pageSize)+'</span><button type="button" data-ux-page="next" aria-label="Próxima página" '+(page===Math.ceil(rows.length/pageSize)-1?'disabled':'')+'>›</button>';
 };
 bar.addEventListener('click',e=>{
  const bt=e.target.closest('[data-ux-page]');if(!bt)return;
  page=Math.max(0,Math.min(Math.ceil(rows.length/pageSize)-1,page+(bt.dataset.uxPage==='next'?1:-1)));
  container.dataset[dataKey]=String(page);paint();
 });
 host.append(bar);paint();
}
function installViewportViews(){
 cleanupLayoutBreakpoint();cleanupLayoutBreakpoint=()=>{};
 if(screen==='landing')return; // A página de entrada mantém a estrutura própria.
 const main=document.querySelector('.dashboard .app-content');
 if(!main)return;
 if(view==='overview'&&main.querySelector('.dashboard-v4')){
  const shell=main.querySelector('.dashboard-v4'),tabs=[...shell.querySelectorAll('[data-v4-tab]')];
  const paneMap=new Map([...shell.querySelectorAll('[data-v4-pane]')].map(p=>[p.dataset.v4Pane,p]));
  const wideDesktop=window.matchMedia('(min-width:1280px)');
  const show=key=>{
   const selected=paneMap.has(key)?key:tabs[0]?.dataset.v4Tab;
   uxDashboardPane[user.role]=selected;
   const multiple=wideDesktop.matches;
   shell.classList.toggle('v4-wide-workspace',multiple);
   for(const [id,node] of paneMap){node.hidden=!multiple&&id!==selected;node.id='v4-'+id;}
   for(const bt of tabs){const active=bt.dataset.v4Tab===selected;bt.setAttribute('aria-selected',String(active));bt.tabIndex=multiple||active?0:-1;}
   if(multiple||selected==='mapa')requestAnimationFrame(()=>liveMaps.forEach(m=>m?.invalidate()));
  };
  shell.querySelector('.v4-dashboard-tabs')?.addEventListener('click',event=>{
   const bt=event.target.closest('[data-v4-tab]');if(bt)show(bt.dataset.v4Tab);
  });
  shell.querySelector('.v4-dashboard-tabs')?.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
   event.preventDefault();
   const current=tabs.findIndex(t=>t.getAttribute('aria-selected')==='true');
   const next=(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   tabs[next]?.focus();show(tabs[next].dataset.v4Tab);
  });
  paginateRows(shell.querySelector('.v4-team-list'),'.v4-team-row','V4Team',uxListSizes());
  // Resumo em rolagem natural; paginação de painel foi removida por redundância.
  paginateRows(shell.querySelector('.v4-alerts-list'),'.event-item','V4Alerts',uxListSizes());
  paginateRows(shell.querySelector('.v4-history-list'),'.v4-history-row','V4History',uxListSizes());
  paginateRows(shell.querySelector('.v4-insights-list'),'.v4-insight-row','V4Insights',uxListSizes());
  const onDesktopChange=()=>show(uxDashboardPane[user.role]);
  wideDesktop.addEventListener('change',onDesktopChange);
  cleanupLayoutBreakpoint=()=>wideDesktop.removeEventListener('change',onDesktopChange);
  show(uxDashboardPane[user.role]);
  return;
 }
 if(view==='overview'){
  const root=main.querySelector('.operations-page');
  if(root){
   const tabs=[['mapa','Mapa'],['alertas','Alertas'],['historico','Histórico'],['indicadores','Resumo']];
   const nav=document.createElement('nav');nav.className='ux-operations-tabs';
   nav.setAttribute('aria-label','Áreas da operação');
   const nodes={mapa:root.querySelector('.ops-map-card'),alertas:root.querySelector('.ops-activity'),
    historico:root.querySelector('.ops-recent'),indicadores:root.querySelector('.ops-metrics')};
   const surface=document.createElement('div');surface.className='ux-operations-surface';
   for(const [key] of tabs){if(nodes[key]){nodes[key].dataset.uxPane=key;surface.append(nodes[key]);}}
   const wideDesktop=window.matchMedia('(min-width:1280px)');
   const selected=()=>tabs.some(x=>x[0]===uxOverviewPanel)?uxOverviewPanel:'mapa';
   const paint=()=>{
    const multiple=wideDesktop.matches;
    root.classList.toggle('ux-wide-workspace',multiple);
    for(const [key] of tabs){if(nodes[key])nodes[key].hidden=!multiple&&selected()!==key;}
    [...nav.querySelectorAll('button')].forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.uxTab===selected()));});
    if(multiple||selected()==='mapa')requestAnimationFrame(()=>liveMaps.forEach(m=>m?.invalidate()));
   };
   nav.innerHTML=tabs.map(([k,label])=>'<button type="button" role="tab" data-ux-tab="'+k+'">'+label+'</button>').join('');
   nav.addEventListener('click',e=>{const b=e.target.closest('[data-ux-tab]');if(b){uxOverviewPanel=b.dataset.uxTab;paint();}});
   const selector=root.querySelector('.supervision-context');
   if(selector)selector.after(nav,surface);else root.prepend(nav,surface);
   paginateRows(nodes.alertas,'.event-item','Alerts',3);
   paginateRows(nodes.historico,'tbody tr','Patrols',wideDesktop.matches?8:3);
   const onDesktopChange=()=>paint();
   wideDesktop.addEventListener('change',onDesktopChange);
   cleanupLayoutBreakpoint=()=>wideDesktop.removeEventListener('change',onDesktopChange);
   paint();
  }
 }


 if(view==='minha-ronda'&&!patrolSheetCollapsed){
  const extra=main.querySelector('.patrol-extra-flow');
  if(extra){
   const nav=document.createElement('nav');nav.className='ux-patrol-tabs';
   nav.setAttribute('aria-label','Ferramentas da ronda');
   const groups={
    sim:extra.querySelector('.patrol-scenario-tools'),
    verificacao:extra.querySelector('.patrol-verification-pane'),
    agenda:extra.querySelector('.my-schedule'),
    instrucoes:extra.querySelector('.patrol-help-details')
   };
   const stage=document.createElement('div');stage.className='ux-patrol-stage';
   const options=[['sim','Simulação'],['verificacao','Ponto'],['agenda','Agenda'],['instrucoes','Instruções']];
   for(const [key] of options){if(groups[key]){groups[key].dataset.uxToolsPane=key;stage.append(groups[key]);}}
   const visible=options.filter(([k])=>!!groups[k]);
   let current=visible.length?visible[0][0]:'agenda';
   const paint=()=>{
    visible.forEach(([k])=>groups[k].hidden=k!==current);
    [...nav.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-selected',String(b.dataset.uxToolsTab===current)));
   };
   nav.innerHTML=visible.map(([key,label])=>'<button type="button" data-ux-tools-tab="'+key+'">'+label+'</button>').join('');
   nav.addEventListener('click',e=>{const b=e.target.closest('[data-ux-tools-tab]');if(b){current=b.dataset.uxToolsTab;paint();}});
   extra.prepend(nav,stage);
   paginateRows(groups.agenda,'.my-schedule-list button','MyPrograms',3);
   paginateRows(groups.instrucoes,'.patrol-point-list button','HelpPoints',3);
   paint();
  }
 }
 if(view==='rondas'){
  const workspace=main.querySelector('.schedule-workspace');
  const switcher=workspace?.querySelector('.schedule-switch');
  if(switcher&&workspace)workspace.before(switcher);
  const mapPage=main.querySelector('.map-command-page');
  const history=main.querySelector('.map-history');
  if(mapPage){
   const nodes={mapa:mapPage.querySelector('.map-command-panel'),pontos:mapPage.querySelector('.map-checkpoint-panel'),historico:history};
   const nav=document.createElement('nav');
   nav.className='ux-ronda-tabs hx05-ronda-tabs';
   nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Mapa e registros da ronda');
   const stage=document.createElement('div');stage.className='ux-ronda-stage hx05-ronda-stage';
   const parts=[['mapa','Mapa'],['pontos','Pontos'],['historico','Histórico']];
   for(const [key] of parts){
    if(!nodes[key])continue;
    nodes[key].dataset.uxSubpage=key;
    nodes[key].id='rondas-painel-'+key;
    nodes[key].setAttribute('role','tabpanel');
    stage.append(nodes[key]);
   }
   // Previsão curta e detalhamento por janela, sem amontoar painéis.
   const points=nodes.pontos?.querySelectorAll('.map-point-row')??[];
   for(const button of points){
    const item=document.createElement('div');item.className='hx05-list-row hx05-point-row';
    const summary=document.createElement('span');summary.className='hx05-list-preview';
    const number=button.querySelector('.map-point-number');
    const detail=button.querySelector('.map-point-info');
    if(number)summary.append(number);
    if(detail)summary.append(detail);
    const open=document.createElement('button');open.type='button';open.className='hx05-open-button';
    open.textContent='Abrir';open.dataset.action='open-route-point';open.dataset.index=button.dataset.index;
    open.setAttribute('aria-label',button.getAttribute('aria-label')||'Abrir detalhes do ponto');
    item.append(summary,open);button.replaceWith(item);
   }
   nav.innerHTML=parts.filter(([key])=>!!nodes[key]).map(([key,label])=>
    '<button type="button" role="tab" aria-controls="rondas-painel-'+key+'" data-ux-ronda-tab="'+key+'">'+label+'</button>').join('');
   const paint=()=>{
    if(!nodes[uxRondaPane])uxRondaPane='mapa';
    for(const [key] of parts){if(nodes[key])nodes[key].hidden=key!==uxRondaPane;}
    nav.querySelectorAll('button').forEach(button=>{
     const active=button.dataset.uxRondaTab===uxRondaPane;
     button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
    });
    if(uxRondaPane==='mapa')requestAnimationFrame(()=>liveMaps.forEach(m=>m.invalidate()));
   };
   nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-ux-ronda-tab]');if(!button)return;
    uxRondaPane=button.dataset.uxRondaTab;paint();
   });
   mapPage.replaceChildren(nav,stage);
   paginateRows(nodes.pontos,'.hx05-list-row','Pontos',uxListSizes());
   paginateRows(nodes.historico,'tbody tr','Historico',uxListSizes());
   paint();
  }
  if(scheduleFiltersOpen)main.querySelector('.schedule-refine')?.classList.add('ux-filters-open');
 }

 if(view==='relatorios'){
  const report=main.querySelector('.report-page');
  const summaryBody=report?.querySelector('.grid-kpis');
  let summaryBodyPanel=null;
  if(report&&summaryBody){
   summaryBodyPanel=document.createElement('section');
   summaryBodyPanel.className='ux-report-summary';
   const meta=report.querySelector('.report-context-bar'),help=report.querySelector('.report-note');
   if(meta)summaryBodyPanel.append(meta);
   summaryBodyPanel.append(summaryBody);
   if(help)summaryBodyPanel.append(help);
  }
  const elements={resumo:summaryBodyPanel,analise:report?.querySelector('.report-breakdown'),
   eventos:report?.querySelector('.report-events'),historico:report?.querySelector('.report-roster')};
  if(report&&elements.resumo){
   const tabs=[['resumo','Resumo'],['analise','Análise'],['eventos','Eventos'],['historico','Histórico']];
   const nav=document.createElement('nav');nav.className='ux-report-tabs';nav.setAttribute('aria-label','Seções do relatório');
   nav.innerHTML=tabs.map(([id,title])=>'<button data-ux-report-tab="'+id+'" type="button">'+title+'</button>').join('');
   const stage=document.createElement('div');stage.className='ux-report-stage';
   for(const [id] of tabs){if(elements[id]){stage.append(elements[id]);elements[id].dataset.uxReport=id;}}
   const renderTab=id=>{
    for(const [key] of tabs){if(elements[key])elements[key].hidden=key!==id;}
    nav.querySelectorAll('button').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.uxReportTab===id)));
   };
   nav.addEventListener('click',e=>{const bt=e.target.closest('[data-ux-report-tab]');if(bt){uxReportPage=bt.dataset.uxReportTab;renderTab(uxReportPage);}});
   const title=report.querySelector('.page-title');
   if(title)title.after(nav,stage);else report.prepend(nav,stage);
   paginateRows(elements.eventos,'.event-item','ReportEvents',uxListSizes());
   paginateRows(elements.historico,'tbody tr','ReportHistory',uxListSizes());
   renderTab(uxReportPage);
  }
 }
 
 if(view==='notificacoes')paginateRows(main,'.event-item','Notificacoes',3);
 if(view==='ocorrencias')paginateRows(main,'.list-row','Ocorrencias',3);
 if(view==='registros')paginateRows(main,'tbody tr','Relatorio',8);
 if(view==='equipe')paginateRows(main,'.team-row','Equipe',4);
}

function render(){if(user?.role!=='ronda'||view!=='minha-ronda'||(session&&hasBlock(session)))curtain?.close();destroyMaps();renderNumber++;modal.close?.();document.body.classList.toggle('simulation-running',presentation);
 if(presentation&&['admin','operador','coi','cliente','vistoriador'].includes(user?.role)){
  const seeded=withExampleRondas(sessions);
  if(seeded!==sessions){sessions=seeded;persist();}
 }
 if(screen==='landing')root.innerHTML=entryScreen();
 else if(screen==='presentation')root.innerHTML=appShell();
 else root.innerHTML=appShell();
 installViewportViews();installUX06();
 const workspace=document.querySelector('.patrol-workspace');
 const routeMap=workspace?.querySelector('.patrol-map-panel'),routeAction=workspace?.querySelector('.patrol-actions');
 if(routeMap&&routeAction&&window.innerWidth<=900)workspace.insertBefore(routeAction,routeMap);
 attachMaps();ops.decorate();
 const dash=document.querySelector('.dashboard');
 if(dash)dash.dataset.torchRole=user?.role||'';
 torch.decorate();
 // Ajuda da cartografia pertence ao nível do cockpit: atrás do painel o ícone
 // fica visível mas não recebe clique, mesmo com z-index elevado no filho.
 if(window.innerWidth<=900&&workspace){
  const mapHelp=workspace.querySelector('.patrol-map-canvas .ux06-map-help');
  if(mapHelp)workspace.append(mapHelp);
 }
 installManager.decorate();uiMotion.enterView();justRendered=Date.now();
 if(user?.role==='ronda'&&view==='minha-ronda'&&screen!=='landing'&&!locationGate.isGranted())locationGate.open({demo:presentation});
 else if(user?.role!=='ronda'||view!=='minha-ronda')locationGate.close();
}
/** O contexto da supervisão nunca altera o vigia conectado nem sua sessão. */
function watchesSession(s,watcher){
 if(!s||!watcher)return false;
 if(s.watcherId)return s.watcherId===watcher.id;
 if(s.programId){
  const p=programs.find(x=>x.id===s.programId);
  if(p)return p.watcherId===watcher.id;
 }
 return s.name===watcher.name;
}
function supervisedContext(){
 const watcher=watcherById(selectedSupervisedWatcherId)??DEMO_WATCHERS[0];
 const history=sessionList().filter(s=>watchesSession(s,watcher));
 const current=history.find(s=>s.status==='active')??history[0]??null;
 const program=nextProgram(programs,watcher.id,sessions)
  ??programsForWatcher(programs,watcher.id)[0]??null;
 const route=current?.route??(program?routeForProgram(program):routeForWatcher(watcher.id));
 const pointCount=route.points.length;
 return {watcher,history,current,program,route,pointCount};
}
function supervisorWatcherSelector(){
 const info=supervisedContext(),status=info.current?.status==='active'?'Em ronda':
  info.current?.status==='completed'?'Última ronda concluída':'Aguardando execução';
 return `<div class="supervision-context" aria-label="Ronda por colaborador">
  <label for="supervisor-watcher">${ic('users')} Vigia acompanhado</label>
  <select id="supervisor-watcher" data-supervisor-watcher aria-label="Selecionar vigia para acompanhar mapa, rota e histórico">
   ${DEMO_WATCHERS.map(w=>`<option value="${esc(w.id)}" ${w.id===info.watcher.id?'selected':''}>${esc(w.name)} · ${esc(w.unit)}</option>`).join('')}
  </select>
  <div class="supervision-context-meta"><strong>${esc(info.route.name)}</strong><span>${status} · ${info.history.length} registro(s) neste navegador · cenário ilustrativo</span></div>
 </div>`;
}
function attachMaps(){
 if(screen==='landing')registerMap('hero-map',DEMO_ROUTE,null,DEMO_ROUTE.base,true);
 if(screen==='presentation'||screen==='dashboard'){
  if(view==='overview'||view==='rondas'||view==='cliente'){
    const context=supervisedContext();
    const location=context.current?.lastFix??context.route.base;
    registerMap('ops-map',context.route,context.current,location,false);
   }
  if(view==='rondas'&&user?.role==='admin'){
    const w=watcherById(selectedSupervisedWatcherId)||DEMO_WATCHERS[0];
    const history=sessionList().filter(x=>x.name===w.name).slice(0,5);
    history.forEach((item,index)=>registerMap('admin-route-mini-'+index,item.route,item,item.lastFix??item.route.base,true));
   }
  if(view==='minha-ronda'){const selectedRoute=session?.route??routeForWatcher(selectedWatcherId);registerMap('mobile-map',selectedRoute,session,locationFix??selectedRoute.base,true);}
 }
}
function entryScreen(){
 return `<div class="entry-screen product-home"><header class="entry-topnav topnav">${brand()}<nav class="nav-actions">${btn('Explorar '+ic('arrow'),'login','primary small')}${operationalLink}</nav></header><main id="main" class="entry-main"><section class="entry-panel"><div class="entry-eyebrow">${ic('shield')} CENTRAL OPERACIONAL</div><h1>Rondas sob controle.<span> Da operação à supervisão.</span></h1><p>Rotas, equipes, horários e ocorrências em uma plataforma. Conheça as funções no próprio aplicativo.</p><div class="entry-actions">${btn('Explorar demonstração '+ic('arrow'),'login','primary full')}<span>${ic('checkcircle')} Demonstração sem login · na operação real, cada usuário terá senha e painel próprio</span></div><div class="entry-details"><span>Mapa e pontos</span><span>Rondas programadas</span><span>Equipe e supervisão</span><span>GPS, offline e relatórios</span></div></section><aside class="entry-aside"><div class="entry-aside-head"><span class="ops-live-dot"></span> VISÃO OPERACIONAL</div><div class="entry-aside-mark">${ic('map')}</div><div class="entry-aside-stat"><small>Trabalho em campo</small><strong>Ronda · 4 pontos</strong><span>Raio de 25 m · Permanência de 30 s</span></div><div class="entry-aside-footer">Estrutura real da plataforma · registros locais na avaliação</div></aside></main><footer class="entry-footer">Grupo Maxvel <span>·</span> Rondas Pro ${btn('Privacidade','privacy','small')}</footer></div>`;
}

function landing(){
 const examples=[['shield','Acompanhamento contínuo','Histórico de etapas e condições da ronda'],['map','Cartografia contextual','Pontos, raio e progresso sobre ruas reais'],['bell','Desvios documentados','Justificativa vinculada à supervisão'],['clipboard','Histórico consultável','Eventos e registros em ordem cronológica']];
 return `<div class="hero product-home"><div class="hero-container"><header class="topnav">${brand()}<nav class="nav-actions" aria-label="Acesso rápido">${btn(ic('help')+' Guia da plataforma','guide','','')} ${btn('Explorar '+ic('arrow'),'login','primary small')}</nav></header><main id="main"><section class="product-hero"><div class="product-hero-copy"><div class="eyebrow">${ic('shield')} HONDAS MAXVEL · OPERAÇÕES EM CAMPO</div><h1>Uma visão completa<br>de cada <span>ronda.</span></h1><p>Acompanhe o trabalho em campo e a supervisão em um só ambiente. Pontos, trajetos, permanência e ocorrências apresentados com clareza, do celular ao computador.</p><div class="hero-buttons">${btn('Experimentar o aplicativo '+ic('arrow'),'presentation-intro','primary')}${btn('Explorar sem login','login')}</div><div class="product-benefits"><span>${ic('checkcircle')} Passo a passo para o colaborador</span><span>${ic('checkcircle')} Visão da supervisão</span><span>${ic('checkcircle')} Registros com contexto</span></div><p class="product-fineprint">${ic('help')} Ambiente de avaliação: trajeto, pessoas e alertas ilustrativos. A cartografia é real quando online.</p></div><div class="product-showcase"><div class="showcase-main"><div class="showcase-toolbar"><div class="showcase-title">${ic('map')} <strong>Central de acompanhamento</strong><small>Prévia funcional do mapa</small></div><span class="showcase-status"><i></i> Visualização de rota</span></div><div id="hero-map" class="showcase-map"></div><div class="showcase-map-badge">${ic('pin')} Rota Centro · Divinópolis <span>4 pontos · raio 25 m</span></div><div class="showcase-overlay-stats"><div><small>Próxima verificação</small><strong>Portaria principal</strong></div><span>${ic('crosshair')} 25 m</span></div></div><div class="showcase-detail-grid"><div class="showcase-detail"><span class="showcase-detail-icon">${ic('clock')}</span><span><small>Permanência por ponto</small><strong>30 segundos contínuos</strong></span></div><div class="showcase-detail"><span class="showcase-detail-icon">${ic('bell')}</span><span><small>Desvios de percurso</small><strong>Justificativa e análise</strong></span></div></div><div class="showcase-disclaimer">Mapa OpenStreetMap · cenário operacional fictício</div></div></section><section class="product-capabilities"><div class="capabilities-intro"><div class="eyebrow">UMA PLATAFORMA · QUATRO FRENTES</div><h2>Feita para acompanhar a operação, não para complicá-la.</h2><p>O mesmo processo apresentado de forma específica para quem executa e para quem supervisiona.</p></div><div class="capability-grid">${examples.map(([ico,title,desc],i)=>`<article class="capability"><span class="capability-index">0${i+1}</span><span class="capability-icon">${ic(ico)}</span><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div></section><section class="product-endcap"><div><div class="eyebrow">VEJA O FLUXO COMPLETO</div><h2>Do primeiro ponto ao relatório final.</h2><p>Explore as telas reais da experiência proposta para ronda e supervisão, com cenário operacional interativo.</p></div>${btn('Experimentar o aplicativo '+ic('arrow'),'presentation-intro','primary')}</section></main><footer class="hero-foot"><span>Grupo Maxvel | Daniel N. Xavier</span><a href="#" data-action="privacy">Privacidade e requisitos técnicos</a></footer></div></div>`;
}
const coiNavigation=[['overview','COI · Acompanhamento','headset'],['notificacoes','Notificações','bell'],['ocorrencias','Tratativas','alert'],['equipe','Equipe de campo','users']];
const allNav={ronda:[['minha-ronda','Minha ronda','compass'],['historico','Meu histórico','clipboard']],operador:coiNavigation,coi:coiNavigation,cliente:[['cliente','Meu acompanhamento','eye']],vistoriador:[['vistoriador','Vistorias e qualidade','clipboard']],admin:[['overview','Visão geral','chart'],['rondas','Rondas','map'],['notificacoes','Notificações','bell'],['ocorrencias','Ocorrências','alert'],['equipe','Equipe','users'],['relatorios','Relatórios','clipboard'],['configuracoes','Configurações','settings']]};
const roleName={ronda:'Operação de Ronda',operador:'COI · Acompanhamento',coi:'COI · Acompanhamento',cliente:'Visão Cliente',vistoriador:'Vistoriador',admin:'Administração'};
function simRoleBar(){
 if(!presentation)return '';
 const roles=[['ronda','Vigia','compass','Vigia'],['operador','COI · Acompanhamento','headset','COI'],['cliente','Cliente','eye','Cliente'],['vistoriador','Vistoriador','clipboard','Vistoria'],['admin','Administração','settings','Admin']];
 const currentRole=user?.role??'ronda',point=session?.status==='active'?session.index+1:0,total=session?.route?.points.length??4;
 return `<div class="simulation-rolebar" aria-label="Ambiente interativo do aplicativo"><div class="simulation-caption"><span class="simulation-signal"></span><strong>Rondas Pro</strong><small>Demonstração sem login · cada usuário terá acesso e senha individuais cadastrados pelo administrador na implantação</small></div><nav class="simulation-roles" aria-label="Alternar perfis do aplicativo">${roles.map(([role,label,icon,short])=>`<button type="button" data-action="sim-role" data-role="${role}" aria-label="${label}" aria-pressed="${currentRole===role||(currentRole==='coi'&&role==='operador')}" class="${currentRole===role||(currentRole==='coi'&&role==='operador')?'selected':''}">${ic(icon)}<span class="role-long">${label}</span><span class="role-short" aria-hidden="true">${short}</span></button>`).join('')}</nav><div class="simulation-actions">${helpButton('profiles','perfil de acesso')}<span class="simulation-progress">${session?`Ponto ${Math.min(point,total)} / ${total}`:'Pronto para iniciar'}</span><button type="button" data-action="end-presentation" aria-label="Sair da simulação" title="Sair da simulação">${ic('close')}<span> Sair</span></button></div></div>`;
}
function beginSimulation(name,autoStart=false,startRole='ronda'){
 if(!presentation)priorSimulation={user:user?{...user}:null,view,session,mode};
 if(session?.status==='active'&&mode==='real'){notify('Finalize a ronda com GPS antes de explorar a simulação.');return;}
 stopLocation();toast.classList.remove('toast-visible');clearTimeout(toastTimer);presentation=true;screen='dashboard';mode='simulation';
 presentationName=(name||presentationName).slice(0,60);
 user={name:presentationName,role:startRole};
 view=startRole==='ronda'?'minha-ronda':startRole==='cliente'?'cliente':startRole==='vistoriador'?'vistoriador':'overview';
 session=autoStart?createSession(presentationName,DEMO_ROUTE,Date.now(),'simulation'):null;
 if(session){session.requiresManualCheckin=true;session.fastDemoClock=true;}
 if(startRole==='ronda')selectedWatcherId=DEMO_WATCHERS.find(w=>w.name===presentationName)?.id??'v01';
 locationFix={...DEMO_ROUTE.base,accuracy:5,at:Date.now()};
 movement=null;
 if(session)save();
 render();window.scrollTo({top:0,behavior:'instant'});
 if(startRole!=='ronda'&&!tour.hasSeen())setTimeout(()=>tour.open(),350);
 notifyRoleView(startRole);
}
function endSimulation(){
 if(!presentation)return;
 stopLocation();movement=null;
 const prev=priorSimulation;
 presentation=false;priorSimulation=null;
 screen=prev?.user?'dashboard':'landing';user=prev?.user??null;
 view=prev?.view??'overview';session=prev?.session??null;mode=prev?.mode??'simulation';
 locationFix=null;render();window.scrollTo({top:0,behavior:'instant'});
}
function simulationIntro(){
 showDialog(`<div class="sim-onboarding">${brand()}<div class="eyebrow">AMBIENTE DE AVALIAÇÃO</div><h2>Experimente o aplicativo real</h2><p>Você usará as próprias telas do sistema, com o mapa e os registros funcionando em um cenário fictício.</p><div class="sim-intro-steps"><div>${ic('compass')}<span><strong>Execute a ronda</strong>Inicie, desloque-se e valide os pontos.</span></div><div>${ic('alert')}<span><strong>Teste uma saída da rota</strong>Justifique e veja o bloqueio da etapa.</span></div><div>${ic('eye')}<span><strong>Alterne para Administração</strong>Confira alertas, mapa e registros na área administrativa.</span></div></div><label class="field">Nome de exemplo<input id="presentation-name" maxlength="60" value="${esc(presentationName)}"></label><div class="sim-onboarding-actions">${btn('Entrar no aplicativo '+ic('arrow'),'launch-presentation','primary full')}${btn('Ler instruções detalhadas','guide','full')}</div><p class="map-caption">Sem GPS real e sem envio remoto. As regras de raio e permanência continuam valendo no cenário.</p></div>`);
}

const TOUR_STEPS=[
 {target:'[data-action="profile-menu"]',title:'Perfil e áreas',description:'Abra o perfil para consultar ou alternar entre Ronda, COI, Cliente, Vistoriador e Administração. A troca de áreas nesta demonstração é ilustrativa.'},
 {target:'#mobile-map, #ops-map',title:'Mapa e pontos',description:'Cada ponto tem raio de 25 metros. O mapa traz ruas reais quando online, mas a posição e o percurso de avaliação são fictícios.'},
 {target:'.patrol-actions, .v4-dashboard-tabs, .ux-ronda-tabs',title:'Ações e detalhes',description:'Cada perfil apresenta apenas as funções relevantes: execução, monitoramento, consulta do cliente, vistoria ou administração.'},
 {target:'[data-action="profile-menu"]',title:'Ajuda sempre disponível',description:'Feche a introdução quando quiser. O guia completo foi refeito por perfil e pode ser reaberto pelo menu Ajuda ou Perfil.'}
];
const tour=createSpotlightTour({app:root,steps:TOUR_STEPS});
const HELP_TOPICS={
 profiles:['Perfis e acesso','Ronda executa pontos; COI monitora; Cliente acompanha o local; Vistoriador verifica qualidade; Administração organiza rotas, equipe, alertas e relatórios. Os acessos desta demonstração não autenticam usuários reais.'],
 map:['Mapa e áreas de verificação','Cada ponto exige posicionamento dentro de 25 metros e permanência contínua de 30 segundos. O mapa usa cartografia real quando online, mas as rotas e movimentos de exemplo são ilustrativos.'],
 action:['Próxima ação','O aplicativo indica qual passo executar agora: iniciar, deslocar, validar, registrar ocorrência ou justificar um desvio. A sequência de pontos não pode ser pulada.'],
 timer:['Tempo e geocerca','O cronômetro só conta dentro do raio de 25 metros com sinal confiável. A perda de precisão reinicia a permanência, mas não comprova desvio.'],
 alerts:['Alertas e justificativas','A Administração consulta avisos de desvio e justificativas neste navegador. Não existem notificações remotas nesta versão; elas dependem de backend seguro.'],
 schedules:['Rondas programadas','Uma programação combina vigia, rota, data e horário. A Administração organiza a escala; o vigia vê suas rondas. Dados fictícios, armazenados localmente.'],
 reports:['Indicadores e relatórios','Os indicadores mostram valores derivados dos registros locais. Não confunda rondas apenas programadas com rondas realmente executadas.'],
 team:['Equipe','O cenário tem vários vigias fictícios. Para implantação real, permissões por papel, autenticação e isolamento entre unidades são obrigatórios.'],
 help:['Ajuda e tutorial','Clique em ? perto de qualquer função para entender detalhes. O tutorial pode ser fechado e reaberto por Ajuda ou Rever tutorial no menu lateral.'],
 privacy:['Privacidade','Nesta avaliação, dados e horários ficam apenas no navegador. GPS real exige autorização explícita e monitoramento remoto depende de servidor e controles adequados.']
};
function featureHelp(topic){
 const [title,detail]=HELP_TOPICS[topic]??HELP_TOPICS.help;
 showDialog(`<div class="help-detail"><div class="eyebrow">COMO FUNCIONA</div><h2>${esc(title)}</h2><p>${esc(detail)}</p>${btn('Entendi','close-dialog','primary full')}</div>`);
}

function pageTitle(title,sub,extra=''){return `<div class="page-title"><div><div class="eyebrow">RONDAS PRO · ${esc(roleName[user.role])}</div><h1>${title}</h1><p>${sub}</p></div>${extra}</div>`}
function appShell(){const entries=allNav[user.role];let valid=entries.find(x=>x[0]===view);if(!valid){view=entries[0][0];valid=entries[0];}
 return `<div class="dashboard ${presentation?'simulation-mode':''}"><div class="app-shell"><aside class="sidebar">${brand()}<span class="side-caption">ÁREA DE TRABALHO</span><nav class="side-links" aria-label="Navegação principal">${entries.map(([key,title,ico])=>`<button data-view="${key}" class="side-link ${view===key?'active':''}" aria-current="${view===key?'page':'false'}">${ic(ico)}${title}${key==='notificacoes'&&recentNotification().filter(x=>!x.seenAt).length?`<span class="count">${recentNotification().filter(x=>!x.seenAt).length}</span>`:''}</button>`).join('')}</nav><div class="side-bottom"><span class="micro-disclaimer">Demo sem login. Na implantação, o administrador cadastra os profissionais e seus logins/senhas individuais.</span><p style="font-size:11px;margin-top:12px">Alertas deste navegador, sem servidor conectado.</p><a class="foot-link" href="/central.html">Central operacional segura</a><button class="foot-link" data-action="privacy">Privacidade e dados</button><button class="foot-link" data-action="tour-restart">Rever tutorial</button><button class="foot-link" data-action="guide">Guia completo</button><button class="foot-link" data-action="logout">Sair do perfil</button><p style="font-size:10px;margin-top:12px">Grupo Maxvel</p></div></aside><div class="shell-main"><header class="app-header"><button type="button" class="app-menu-button mobile-only" data-action="open-mobile-menu" aria-label="Abrir menu de navegação">${ic("list")}</button>${brand()}<div class="eyebrow desktop-only">CENTRAL OPERACIONAL</div><div class="header-actions">${presentation?btn(ic("users")+" Áreas","sim-role-picker","small compact-role-picker desktop-only"):""}<button class="help-toggle desktop-only" data-action="tour-restart" aria-label="Rever o tutorial da plataforma">${ic('help')}<span class="desktop-only">Ajuda</span></button><button type="button" class="user-pill user-profile-button" data-action="profile-menu" aria-label="Abrir perfil e opções"><span class="avatar">${esc(user.name.slice(0,1).toUpperCase())}</span><span><strong>${esc(user.name)}</strong><small>${roleName[user.role]}</small></span>${ic("settings")}</button><button class="button small desktop-only" data-action="logout">Sair</button></div></header><main id="main" class="app-content ${view==='minha-ronda'?'ronda-page':''}">${viewContent()}</main><footer class="footer-app">Ambiente de avaliação · dados locais · Grupo Maxvel</footer></div></div></div>`}
function myPatrolHistory(){
 const name=user?.name||'',mine=sessionList().filter(x=>x.name===name),events=ops.allEvents();
 const item=x=>{
  const stat=summarizePatrol(x,events),records=events.filter(e=>e.payload?.sessionId===x.id),
   observations=(x.checkpoints||[]).filter(p=>p.observation),
   incidents=(x.incidents||[]),panic=records.filter(e=>e.kind==='panic').length;
  return '<details class="ops-added-section" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:700;padding:12px 0">'+
   esc(x.route?.name||'Ronda')+' · '+new Date(x.startedAt).toLocaleString('pt-BR')+
   ' · '+(x.status==='completed'?'Concluída':'Em andamento')+'</summary>'+
   '<div class="team-list" style="padding:10px 0">'+
   [['Distância GPS estimada',stat.km.toFixed(2)+' km'],['Tempo em trajeto',stat.minutes+' min'],
   ['Pontos concluídos',(x.checkpoints||[]).filter(p=>p.completedAt).length+'/'+(x.route?.points?.length||0)],
   ['Ocorrências',incidents.length],['Alertas e notificações',(x.notifications||[]).length],['Pânico',panic],
   ['Leituras GPS',stat.gpsSamples+' ('+stat.gpsIgnored+' descartadas)']].map(([k,v])=>
   '<div class="team-row"><strong>'+esc(k)+'</strong><span>'+esc(String(v))+'</span></div>').join('')+'</div>'+
   (observations.length?'<h3>Observações nos pontos</h3><div class="team-list">'+observations.map(p=>'<div class="team-row"><div><strong>'+esc(p.pointName||p.name||'Ponto registrado')+'</strong><p>'+esc(p.observation)+'</p><small>'+new Date(p.observedAt||p.completedAt).toLocaleString('pt-BR')+'</small></div></div>').join('')+'</div>':'')+
   (incidents.length?'<h3>Ocorrências e fotos</h3><div class="team-list">'+incidents.map(i=>
   '<div class="team-row"><div><strong>'+esc(i.title||'Ocorrência')+'</strong><p>'+esc(i.description||'')+'</p><small>'+new Date(i.at).toLocaleString('pt-BR')+'</small>'+
   (i.media||[]).map(m=>'<button type="button" class="ops-mini-action" data-ops="open-media" data-media-id="'+esc(m.id)+'">📷 '+esc(m.name||'Evidência')+' · '+new Date(m.takenAt||m.at).toLocaleString('pt-BR')+'</button>').join('')+'</div></div>').join('')+'</div>':'')+
   '<h3>Cronologia detalhada</h3><div class="team-list">'+(x.timeline||[]).slice(0,120).map(e=>
   '<div class="team-row"><div><strong>'+esc(e.label||e.kind||'Registro')+'</strong><small>'+new Date(e.at).toLocaleString('pt-BR')+'</small></div></div>').join('')+'</div></details>';
 };
 return pageTitle('Meu histórico','Consulte apenas suas rondas, quilômetros, horários, observações, fotos, alertas e pânico.')+
 '<section class="schedule-workspace"><div class="schedule-heading"><div><div class="eyebrow">HISTÓRICO INDIVIDUAL</div><h2>'+mine.length+' ronda(s) registradas</h2><p>Resumo primeiro; abra uma execução para ver todos os registros.</p></div></div>'+
 (mine.length?mine.slice(0,50).map(item).join(''):'<p>Nenhuma ronda registrada neste aparelho.</p>')+
 '<p class="map-caption">Dados deste dispositivo. Para mensagens da equipe e histórico central sincronizado, utilize seu acesso autenticado.</p>'+
 '<a class="button" href="/central.html">Ver histórico completo e respostas da equipe</a></section>';
}
function viewContent(){switch(view){case 'minha-ronda':return pageTitle('Minhas rondas','Veja seus compromissos e execute o próximo passo.',helpButton('help','tutorial'))+phoneContent();case 'historico':return myPatrolHistory();case 'overview':return overview();case 'cliente':return demoClientView();case 'vistoriador':return demoInspectorView();case 'rondas':return rondas();case 'notificacoes':return notificationsView();case 'ocorrencias':return occurrences();case 'equipe':return team();case 'relatorios':return reports();case 'configuracoes':return settings();default:return overview();}}
function kpiCards(){const all=sessionList(),alerts=recentNotification(),inc=recentIncidents();const rows=[['Rondas registradas',all.length,'Sessões criadas no navegador'],['Concluídas',all.filter(s=>s.status==='completed').length,'Retorno à base confirmado'],['Desvios',all.reduce((n,s)=>n+s.deviations.length,0),'Eventos com justificativa'],['Ocorrências',inc.length,'Solicitações de análise']];return `<div class="grid-kpis">${rows.map(([label,n,detail])=>`<div class="card kpi"><small>${label}</small><strong>${String(n).padStart(2,'0')}</strong><em>${detail}</em></div>`).join('')}</div>`;}
/** E7/E8: panes estáveis, sem recontar indicadores quando muda apenas a aba. */
function dashboardV4(){
 const manager=user.role==='admin';
 const context=supervisedContext(),all=sessionList(),alerts=recentNotification();
 const data=dashboardSnapshot({sessions:all,programs,watchers:DEMO_WATCHERS});
 const notice='<span class="v4-local-notice">'+ic('shield')+' Dados deste navegador · Cenário fictício</span>';
 const insights=manager?data.insights:data.insights.filter(i=>['alerts','overdue','returns'].includes(i.id));
 const insightRows='<div class="v4-insights-list">'+insights.map((item,i)=>
  '<div class="v4-insight-row '+(item.type==='attention'?'is-attention':'')+'">'+
   '<div class="v4-insight-numeric"><b>'+esc(item.value)+'</b><small>'+String(i+1).padStart(2,'0')+'</small></div>'+
   '<div class="v4-insight-copy"><strong>'+esc(item.label)+'</strong><p>'+esc(item.detail)+'</p></div>'+
   '<button type="button" data-view="'+esc(item.target)+'" aria-label="Ver registros: '+esc(item.label)+'">'+ic('arrow')+'</button></div>').join('')+'</div>';
 const metric=[['Rondas',data.total,'Registradas'],['Em curso',data.active,'Execuções ativas'],
  ['Concluídas',data.completed,'Execuções terminadas'],['Atrasadas',data.overdue,'Programações'],
  ['Alertas',data.pending,'Aguardam análise'],['Ocorrências',data.openIncidents,'Não resolvidas']];
 const metricNodes='<div class="v4-summary-metrics">'+metric.map(([name,value,description])=>
  '<div class="v4-summary-metric"><strong>'+esc(value)+'</strong><span>'+esc(name)+'</span><small>'+esc(description)+'</small></div>').join('')+'</div>';
 const mapPane='<section class="v4-pane v4-map-pane" data-v4-pane="mapa">'+supervisorWatcherSelector()+
  '<div class="ops-map-card"><div class="ops-panel-heading"><div><h2>'+ic('map')+' '+esc(context.watcher.name)+'</h2><p>'+esc(context.route.name)+'</p></div>'+
  '<button type="button" class="ux06-map-fit" data-action="center-maps" aria-label="Enquadrar rota" title="Enquadrar rota">'+ic('crosshair')+'</button></div>'+
  '<div class="ops-map-stage"><div id="ops-map" class="map-container large"></div></div>'+
  '<div class="v4-map-foot"><span>'+context.pointCount+' pontos previstos</span><span>Trajeto ilustrativo · precisão variável</span></div></div></section>';
 const alertsPane='<section class="v4-pane v4-alerts-pane" data-v4-pane="alertas"><div class="v4-pane-head"><h2>Alertas e justificativas</h2><span>'+data.pending+' pendente(s)</span></div>'+
  '<div class="v4-alerts-list">'+(alerts.length?alerts.map(notificationRow).join(''):'<div class="v4-empty">Sem avisos registrados neste navegador.</div>')+'</div>'+
  '<div class="v4-pane-foot">'+btn('Abrir central de alertas '+ic('arrow'),'nav-alerts','small')+'</div></section>';
 const history=context.history;
 const historyPane='<section class="v4-pane v4-history-pane" data-v4-pane="historico"><div class="v4-pane-head"><h2>Histórico · '+esc(context.watcher.name)+'</h2><span>'+history.length+' registro(s)</span></div>'+
  '<div class="v4-history-list">'+(history.length?history.map(s=>
   '<button type="button" class="v4-history-row" data-action="session-detail" data-id="'+esc(s.id)+'">'+
   '<span><strong>'+esc(s.route.name)+'</strong><small>'+fmt(s.startedAt)+' · '+esc(s.status==='completed'?'Concluída':'Em andamento')+'</small></span>'+
   '<b>'+s.index+'/'+s.route.points.length+'</b>'+ic('arrow')+'</button>').join(''):
   '<p class="v4-empty">Este vigia ainda não possui registros neste navegador.</p>')+'</div>'+
  '<div class="v4-pane-foot">'+btn('Ver relatório '+ic('arrow'),'nav-reports','small')+'</div></section>';
 const insightPane='<section class="v4-pane v4-insights-pane" data-v4-pane="insights"><div class="v4-pane-head"><h2>'+ (manager?'Insights da operação':'Pontos de atenção')+'</h2>'+
   '<span>Baseados nos registros</span></div>'+insightRows+
   '<p class="v4-ethics-note">Indicadores ilustrativos. Um alerta pede verificação, não representa prova de falha individual.</p></section>';
 const rosterPane=manager?'<section class="v4-pane v4-team-pane" data-v4-pane="equipe"><div class="v4-pane-head"><h2>Quatro vigias · cenários distintos</h2><span>Selecione para ver rota</span></div>'+
  '<div class="v4-team-list">'+data.roster.map(w=>
   '<button type="button" class="v4-team-row" data-v4-watcher="'+esc(w.id)+'">'+
   '<span class="v4-team-avatar">'+esc(w.name[0])+'</span><span class="v4-team-copy"><strong>'+esc(w.name)+'</strong>'+
   '<small>'+w.total+' ronda(s) · '+w.completed+' concluída(s)</small></span>'+
   '<span class="v4-team-status">'+(w.deviations+w.incidents)+' evento(s)</span>'+ic('arrow')+'</button>').join('')+'</div>'+
   '<p class="v4-ethics-note">Nomes, rotas e ocorrências fictícios. Não é um ranking de desempenho.</p></section>':'';
 const summaryPane=manager?'<section class="v4-pane v4-summary-pane" data-v4-pane="resumo"><div class="v4-pane-head"><h2>Indicadores da operação</h2><span>'+data.roster.length+' vigias demonstrativos</span></div>'+
  metricNodes+'<div class="v4-summary-callout"><div><span>Execuções concluídas</span><strong>'+(data.completionRatio===null?'—':data.completionRatio+'%')+'</strong></div>'+
   '<p>'+esc(data.insights.find(x=>x.id==='completion').detail)+'</p></div>'+
   '<div class="v4-summary-quick">'+btn('Programar ronda '+ic('arrow'),'program-round','small primary')+
   btn('Analisar eventos '+ic('arrow'),'nav-alerts','small')+'</div></section>':'';
 const tabs=(manager?[['resumo','Resumo'],['mapa','Mapa'],['equipe','Equipe'],['insights','Insights'],['alertas','Alertas']]:
  [['mapa','Mapa'],['alertas','Alertas'],['insights','Insights'],['historico','Histórico']]);
 const tabHtml='<nav class="v4-dashboard-tabs" role="tablist" aria-label="Seções do painel">'+tabs.map(([key,label])=>
  '<button type="button" role="tab" data-v4-tab="'+key+'" aria-controls="v4-'+key+'">'+label+'</button>').join('')+'</nav>';
 return '<div class="operations-page dashboard-v4 '+(manager?'v4-management':'v4-supervision')+'">'+
  '<header class="v4-dashboard-heading"><div><span class="v4-eyebrow">RONDAS PRO · '+(manager?'GESTÃO':'SUPERVISÃO')+'</span>'+
  '<h1>'+(manager?'Dashboard gerencial':'Operação supervisionada')+'</h1><p class="v4-site-context">Posto em foco · '+esc(context.watcher.unit||'Local demonstrativo')+'</p></div>'+notice+'</header>'+
  tabHtml+'<div class="v4-stage">'+summaryPane+mapPane+rosterPane+alertsPane+insightPane+historyPane+'</div></div>';
}

let demoCoiTab='rondas';
function demoCoiView(){
 const local=sessionList().slice().sort((a,b)=>(b.startedAt||0)-(a.startedAt||0));
 const insp=demoInspectionRecords();
 const total=local.filter(x=>x.status==='active').length;
 const current=local[0],summary=[
  ['Rondas em curso',total],['Vistorias registradas',insp.length],
  ['Histórico de rondas',local.length],['Avisos do cenário',recentNotification().filter(x=>!x.seenAt).length]
 ];
 const tabs='<div class="coi-demo-tabs" role="group" aria-label="Acompanhamento por atividade"><button type="button" data-action="demo-coi-tab" data-tab="rondas" aria-pressed="'+(demoCoiTab==='rondas')+'" class="'+(demoCoiTab==='rondas'?'selected':'')+'">Rondas</button><button type="button" data-action="demo-coi-tab" data-tab="vistorias" aria-pressed="'+(demoCoiTab==='vistorias')+'" class="'+(demoCoiTab==='vistorias'?'selected':'')+'">Vistorias</button></div>';
 const roundRows=local.length?local.slice(0,10).map((record,i)=>{
  const live=record.status==='active';
  return '<article class="coi-demo-record"><header><div><span>'+esc(record.route?.name||'Ronda')+'</span><h3>'+esc(record.name||'Vigia')+'</h3></div><b>'+(live?'Em andamento':record.status==='completed'?'Concluída':'Histórico')+'</b></header><div class="coi-demo-facts"><span>Início <strong>'+fmt(record.startedAt)+'</strong></span><span>Pontos <strong>'+Number(record.checkpoints?.filter(x=>x.completedAt).length||0)+'</strong></span></div>'+
   (i===0?'<div id="ops-map" class="map-container large coi-demo-map" aria-label="Mapa ilustrativo da ronda selecionada"></div><small>Mapa e posição ilustrativos neste navegador. O COI real usa GPS enviado pelo campo.</small>':'')+
   '</article>';
 }).join(''):'<div class="empty">Nenhuma ronda registrada no cenário.</div>';
 const inspRows=insp.length?insp.slice(0,10).map((entry,i)=>'<article class="coi-demo-record"><header><div><span>Laudo de vistoria</span><h3>'+esc(DEMO_WATCHERS[0].unit)+'</h3></div><b>Enviada</b></header><div class="coi-demo-facts"><span>Data <strong>'+fmt(entry.at)+'</strong></span><span>Conformidade <strong>'+entry.score+'%</strong></span></div><p>'+esc(entry.notes)+'</p>'+(i===0?'<div id="ops-map" class="map-container large coi-demo-map" aria-label="Mapa ilustrativo do posto"></div><small>Referência ilustrativa do posto; nenhuma posição real do vistoriador foi transmitida.</small>':'')+'</article>').join(''):'<div class="empty">Sem vistorias neste navegador. Use o perfil Vistoriador para registrar um laudo demonstrativo.</div>';
 return '<section class="coi-demo-page">'+pageTitle('COI · Central de acompanhamento','Acompanhe a equipe e responda às ocorrências. Os dados abaixo são somente uma demonstração.')+
 '<div class="coi-demo-topline"><span class="ops-live-dot"></span><strong>Atendimento e acompanhamento</strong><small>Posto demonstrativo · '+esc(DEMO_WATCHERS[0].unit)+'</small><span>Dados locais</span></div>'+
 '<div class="coi-demo-metrics">'+summary.map(([k,v])=>'<div><b>'+v+'</b><span>'+k+'</span></div>').join('')+'</div>'+
 '<div class="coi-demo-shortcuts"><button type="button" data-view="notificacoes">'+ic('bell')+' Notificações</button><button type="button" data-view="ocorrencias">'+ic('clipboard')+' Tratativas</button></div>'+
 '<section class="coi-demo-content"><h2>Rondas e vistorias</h2><p>Selecione a atividade. O mapa, quando disponível, aparece no registro correspondente.</p>'+tabs+
 '<div class="coi-demo-list">'+(demoCoiTab==='rondas'?roundRows:inspRows)+'</div></section>'+
 '<p class="map-caption">Demonstração: os registros não representam uma operação de vigilância ao vivo. Para o COI autenticado, acesse a Central Operacional.</p></section>';
}
function overview(){
 if(user?.role==='admin')return dashboardV4();
 if(['operador','coi'].includes(user?.role))return demoCoiView();
 const all=sessionList(),alerts=recentNotification(),open=alerts.filter(x=>!x.seenAt),inc=recentIncidents(),finished=all.filter(s=>s.status==='completed'),active=all.filter(s=>s.status==='active');
 const schedule= scheduleTotals(programs,sessions),pending=schedule.programada+schedule.atrasada;
 const metricRows=[
  {icon:'clock',name:'Rondas previstas',value:pending,detail:`${schedule.atrasada} fora do horário previsto`,tone:'blue'},
  {icon:'compass',name:'Em andamento',value:active.length,detail:'Execuções deste navegador',tone:'blue'},
  {icon:'checkcircle',name:'Rondas finalizadas',value:finished.length,detail:'Com retorno à base registrado',tone:'green'},
  {icon:'alert',name:'Alertas para análise',value:open.length,detail:`${inc.length} ocorrências no histórico`,tone:open.length?'red':'neutral'}
 ];
 const context=supervisedContext(),activeSession=context.current,trail=activeSession?.timeline??[];
 return `<div class="operations-page">${pageTitle('Central de operações','Acompanhe rotas, pontos, justificativas e ocorrências no mesmo painel.',btn(ic('print')+' Imprimir relatório','print','small'))}<div class="ops-topline"><div><span class="ops-live-dot"></span><strong>Visão da operação</strong><span class="ops-site-context">Posto em foco · ${esc(context.watcher.unit||'Local demonstrativo')}</span><span>Dados deste ambiente de avaliação</span></div><div class="ops-topline-right">${ic('clock')} <span>${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</span> ${tag('Cenário local','neutral')}</div></div>${supervisorWatcherSelector()}${all.length===0?`<div class="ops-empty-state"><span>${ic('clock')} Ainda não há execução registrada neste dispositivo. As rondas já estão na agenda.</span>${btn('Consultar agenda '+ic('arrow'),'nav-rondas','small')}</div>`:''}<div class="ops-metrics">${metricRows.map(m=>`<article class="ops-metric tone-${m.tone}"><div class="ops-metric-top"><span class="ops-metric-icon">${ic(m.icon)}</span></div><strong>${String(m.value).padStart(2,'0')}</strong><h3>${m.name}</h3><p>${m.detail}</p></article>`).join('')}</div><div class="ops-workspace"><section class="ops-map-card"><div class="ops-panel-heading"><div><div class="eyebrow">ACOMPANHAMENTO GEOGRÁFICO</div><h2>${ic('map')} Mapa · ${esc(context.watcher.name)}</h2><p>Traçado ilustrativo sobre cartografia real, quando online</p></div><div class="ops-map-actions">${tag(context.pointCount+' pontos previstos','neutral')}${btn(ic('crosshair')+' Enquadrar','center-maps','small')}</div></div><div class="ops-map-stage"><div id="ops-map" class="map-container large"></div><div class="ops-map-corner"><strong>${ic('shield')} ${esc(context.route.name)}</strong><span>Área de verificação · 25 m</span></div></div><div class="ops-map-legend">${legend()}<span class="ops-map-note">Pontos e trajeto de demonstração</span></div></section><aside class="ops-activity"><div class="ops-panel-heading"><div><div class="eyebrow">FILA DE ATENÇÃO</div><h2>${ic('bell')} Alertas e justificativas</h2><p>Eventos registrados neste navegador</p></div>${tag(`${open.length} pendente(s)`,open.length?'red':'green')}</div><div class="ops-alert-list">${alerts.slice(0,6).map(notificationRow).join('')||`<div class="ops-empty"><span>${ic('shield')}</span><strong>Operação sem alertas pendentes</strong><p>Ao identificar um desvio, ele aparecerá aqui junto com o contexto para análise.</p></div>`}</div><div class="ops-help">${ic('help')} <span>Falhas de GPS não devem ser tratadas automaticamente como irregularidades.</span></div></aside></div><div class="ops-bottom-grid"><section class="card ops-recent"><div class="card-title"><div><div class="eyebrow">REGISTROS RECENTES</div><h2>Histórico de rondas</h2></div>${btn('Ver todas '+ic('arrow'),'nav-rondas','small')}</div>${tablePatrols(context.history.slice(0,5))}</section><aside class="card ops-progress"><div class="eyebrow">LINHA DO TEMPO</div><h2>Última atividade</h2><p>${activeSession?`Referente a ${esc(activeSession.name)} · ${esc(activeSession.route.name)}`:'Inicie uma ronda para acompanhar os registros.'}</p><div class="ops-timeline">${trail.slice(0,5).map(t=>`<div class="ops-timeline-item"><i></i><div><strong>${esc(t.label)}</strong><small>${time(t.at)}</small></div></div>`).join('')||'<div class="empty">Aguardando início da primeira ronda.</div>'}</div></aside></div><div class="ops-footer-note">${ic('help')} Protótipo operacional: os registros são locais e não chegam a um supervisor real. A implantação requer servidor e autenticação.</div></div>`;
}
function tablePatrols(rows){return rows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Responsável</th><th>Rota</th><th>Progresso</th><th>Situação</th><th>Início</th><th>Detalhes</th></tr></thead><tbody>${rows.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.route.name)}</td><td>${s.index} / ${s.route.points.length} pontos</td><td>${tag(s.status==='completed'?'Concluída':'Em andamento',s.status==='completed'?'green':'orange')}</td><td>${fmt(s.startedAt)}</td><td><button data-action="session-detail" data-id="${esc(s.id)}">Abrir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma ronda registrada. Experimente a apresentação guiada.</div>'}

function formatShortDate(timestamp){
 return new Date(timestamp).toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function mySchedule(){
 const mine=programsForWatcher(programs,selectedWatcherId);
 const upcoming=mine.filter(p=>scheduleStatus(p,sessions)!=='concluída').slice(0,9);
 const selected=programs.find(p=>p.id===selectedProgramId)??nextProgram(programs,selectedWatcherId,sessions);
 return `<details class="my-schedule"><summary><span class="my-schedule-label">${ic('clock')} <b>Minhas rondas</b> <small>${mine.length} programadas</small></span><span class="my-schedule-current">${selected?formatShortDate(selected.startAt):'Sem próxima programação'}</span></summary><div class="my-schedule-inner"><div class="my-schedule-top"><strong>${esc(watcherById(selectedWatcherId)?.name??'Vigia')}</strong>${helpButton('schedules','rondas programadas')}</div><div class="my-schedule-list">${upcoming.length?upcoming.map(p=>{
 const current=selected?.id===p.id;return `<button type="button" class="${current?'chosen':''}" data-action="select-program" data-id="${esc(p.id)}"><span><strong>${formatShortDate(p.startAt)}</strong><small>${esc(routeById(p.routeId)?.name||'Rota')} · ${esc(scheduleStatus(p,sessions))}</small></span>${current?ic('checkcircle'):ic('arrow')}</button>`;
 }).join(''):'<div class="empty">Nenhuma ronda futura para este vigia.</div>'}</div><p class="map-caption">Os horários e colaboradores são fictícios. Escolha uma ronda para vinculá-la à execução.</p></div></details>`;
}
const schedulePageSize=()=>window.innerWidth<=900?Math.max(1,Math.min(3,Math.floor((window.innerHeight-360)/65))):16;
function schedulePanel(){
 const totals=scheduleTotals(programs,sessions);
 const active=filterPrograms(programs,{status:scheduleFilter,watcherId:scheduleWatcher,unit:scheduleUnit,query:scheduleQuery,sessions});
 const paged=pagePrograms(active,schedulePage,schedulePageSize()),rows=paged.items;
 return `<section class="schedule-workspace"><header class="schedule-heading"><div><div class="eyebrow">PLANEJAMENTO DE RONDAS ${helpButton('schedules','agendamento')}</div><h2>Escalas e programação</h2><p>${programs.length} rondas de ${DEMO_WATCHERS.length} vigias · somente neste navegador</p></div>${btn(ic('clock')+' Programar ronda','program-round','primary')}</header>
 ${window.innerWidth<=900?btn('Filtros','schedule-show-filters','small'):''}<div class="schedule-stats">${[['programada','Programadas'],['em andamento','Em andamento'],['atrasada','Atrasadas'],['concluída','Concluídas']].map(([key,label])=>`<div><strong>${totals[key]||0}</strong><span>${label}</span></div>`).join('')}</div>
 <div class="schedule-switch"><button type="button" data-action="schedule-tab" data-tab="agenda" aria-pressed="${scheduleTab==='agenda'}" class="${scheduleTab==='agenda'?'active':''}">${ic('list')} Agenda de rondas</button><button type="button" data-action="schedule-tab" data-tab="mapa" aria-pressed="${scheduleTab==='mapa'}" class="${scheduleTab==='mapa'?'active':''}">${ic('map')} Mapa da operação</button></div>
 ${scheduleTab==='agenda'?`<div class="schedule-toolbar"><span>${ic('list')} Escalas registradas</span><label>Filtrar <select data-schedule-filter aria-label="Filtrar rondas programadas">${[['all','Todas'],['programada','Programadas'],['em andamento','Em andamento'],['atrasada','Atrasadas'],['concluída','Concluídas'],['cancelada','Canceladas']].map(([k,label])=>`<option value="${k}" ${scheduleFilter===k?'selected':''}>${label}</option>`).join('')}</select></label></div><div class="schedule-refine"><label>Buscar ronda<input type="search" data-schedule-query aria-label="Buscar vigia, rota ou unidade" placeholder="Vigia, rota ou unidade" value="${esc(scheduleQuery)}"></label><label>Unidade<select data-schedule-unit aria-label="Filtrar por unidade"><option value="all">Todas as unidades</option>${[...new Set(DEMO_WATCHERS.map(w=>w.unit))].map(unit=>`<option value="${esc(unit)}" ${scheduleUnit===unit?'selected':''}>${esc(unit)}</option>`).join('')}</select></label><label>Vigia<select data-schedule-watcher aria-label="Filtrar por vigia"><option value="all">Todos os vigias</option>${DEMO_WATCHERS.filter(w=>scheduleUnit==='all'||w.unit===scheduleUnit).map(w=>`<option value="${w.id}" ${scheduleWatcher===w.id?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label></div><div class="schedule-list-count" role="status" aria-live="polite">${paged.total===0?'Nenhum resultado':`Mostrando ${paged.from}–${paged.to} de ${paged.total} rondas`}</div><div class="schedule-list" role="region" aria-label="Lista de rondas programadas" tabindex="0">${rows.map(p=>{
 const w=watcherById(p.watcherId),route=routeById(p.routeId),state=scheduleStatus(p,sessions);
 return `<article class="schedule-row"><div class="schedule-row-time"><strong>${formatShortDate(p.startAt)}</strong><small>Até ${new Date(p.endAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div><div class="schedule-row-person"><strong>${esc(w?.name??'Vigia')}</strong><small>${esc(route?.name??'Rota')} · ${esc(w?.unit??'')}</small></div><span class="schedule-state" data-status="${state}">${esc(state)}</span><div class="schedule-row-tools">${btn('Detalhes','program-detail','small',`data-id="${esc(p.id)}"`)}${state==='programada'||state==='atrasada'?`${btn('Reprogramar','program-edit','small',`data-id="${esc(p.id)}"`)}${btn('Cancelar','program-cancel','small',`data-id="${esc(p.id)}"`)}`:''}</div></article>`;
 }).join('')||'<div class="empty">Não há rondas com este filtro.</div>'}</div><nav class="schedule-pagination" aria-label="Páginas da agenda">${btn('Anterior','schedule-prev','small',paged.page===0?'disabled':'')}<span>Página ${paged.page+1} de ${paged.pages}</span>${btn('Próxima','schedule-next','small',paged.page>=paged.pages-1?'disabled':'')}</nav>`:'<p class="schedule-map-intro">O mapa mostra um cenário de rota ilustrativo, enquanto a lista mantém as programações por vigia.</p>'}</section>`;
}
function programRoundDialog(){
 if(user?.role!=='admin')return;
 wizardController?.destroy?.();
 wizardController=createRoundWizard({
  dialog:modal,showDialog,settings:operationalSettings,notify,
  onMap:(element,route,pick)=>new PatrolMap(element,{route,position:route.base,compact:true,interactive:true,onMapClick:pick}),
  onSave:candidate=>{
   const result=createPrograms(candidate,programs,Date.now());
   if(!result.ok)return result;
   programs=[...programs,...result.items];
   selectedSupervisedWatcherId=candidate.watcherId;persist();
   scheduleTab='agenda';view='rondas';modal.close();render();
   notify(result.items.length+' ronda(s) programada(s) neste navegador.');
   return {ok:true};
  }
 });
}
function editProgramDialog(program){
 if(!program||program.status!=='scheduled'||sessions.some(s=>s.programId===program.id))return;
 const local=ms=>{const d=new Date(ms);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
 showDialog(`<div class="program-dialog"><div class="eyebrow">AGENDA · ALTERAÇÃO LOCAL</div><h2>Reprogramar ronda</h2><p>Atualize o responsável ou o horário. O histórico da alteração será preservado neste navegador.</p><form id="program-edit-form" data-id="${esc(program.id)}"><label>Vigia<select name="watcherId" required>${DEMO_WATCHERS.map(w=>`<option value="${w.id}" ${w.id===program.watcherId?'selected':''}>${esc(w.name)} · ${esc(w.unit)}</option>`).join('')}</select></label><label>Rota<select name="routeId" required>${DEMO_ROUTES.map(r=>`<option value="${r.id}" ${r.id===program.routeId?'selected':''} ${watcherById(program.watcherId)?.unit!==r.unit?'disabled':''}>${esc(r.name)} · ${esc(r.unit)}</option>`).join('')}</select></label><div class="program-date-grid"><label>Início previsto<input type="datetime-local" name="startAt" value="${local(program.startAt)}" required></label><label>Término previsto<input type="datetime-local" name="endAt" value="${local(program.endAt)}" required></label></div><label>Observações<textarea name="notes" maxlength="240" rows="2">${esc(program.notes??'')}</textarea></label><p class="program-error" role="alert" aria-live="polite"></p><button type="submit" class="button primary full">Revisar alteração ${ic('arrow')}</button></form><p class="map-caption">A programação pode ser alterada antes de iniciar a execução; não há envio remoto.</p></div>`,true);
}

function watcherChooser(){
 showDialog(`<div class="eyebrow">PERFIL DO VIGIA · AVALIAÇÃO</div><h2>Selecionar colaborador</h2><p>Explore as rondas de diferentes vigias fictícios. Uma implantação real exige login individual e permissões.</p><div class="watcher-grid">${DEMO_WATCHERS.map(w=>`<button type="button" data-action="choose-watcher" data-id="${w.id}" class="${selectedWatcherId===w.id?'active':''}"><span class="avatar">${esc(w.name.slice(0,1))}</span><span><strong>${esc(w.name)}</strong><small>${esc(w.unit)} · ${programsForWatcher(programs,w.id).length} escalas</small></span></button>`).join('')}</div>`,true);
}


const DEMO_INSPECTIONS='maxvel-demo-inspections-v1';
function demoInspectionRecords(){try{const r=JSON.parse(localStorage.getItem(DEMO_INSPECTIONS)||'[]');return Array.isArray(r)?r.slice(0,100):[]}catch{return []}}
// Contatos totalmente sintéticos: apenas demonstração local, jamais cadastrados no servidor.
const DEMO_CLIENTS=[
 {name:'Maxvel Logística',unit:DEMO_WATCHERS[0].unit,contact:'Responsável demonstrativo',phone:'(31) 90000-0000',email:'maxvel@exemplo.invalid'},
 {name:'Condomínio Reserva da Serra',unit:'Posto Condomínio (fictício)',contact:'Responsável demonstrativo',phone:'(31) 90000-0000',email:'condominio@exemplo.invalid'},
 {name:'Metalúrgica Xavier',unit:'Posto Metalúrgica (fictício)',contact:'Responsável demonstrativo',phone:'(31) 90000-0000',email:'metalurgica@exemplo.invalid'}
];
let selectedDemoClientIndex=0;
function demoClientView(){
 const client=DEMO_CLIENTS[selectedDemoClientIndex]||DEMO_CLIENTS[0];
 const unit=client.unit,workers=DEMO_WATCHERS.filter(w=>w.unit===unit);
 const mine=sessionList().filter(s=>workers.some(w=>w.name===s.name)),active=mine.filter(s=>s.status==='active'),past=mine.filter(s=>s.status!=='active');
 const rows=a=>a.length?a.map(s=>'<button class="demo-ops-row" data-action="session-detail" data-id="'+esc(s.id)+'"><span><strong>'+esc(s.name)+'</strong><small>'+esc(s.route.name)+' · '+fmt(s.startedAt)+'</small></span><b>'+esc(s.status==='completed'?'Concluída':'Em andamento')+'</b></button>').join(''):'<p class="empty">Nenhum registro nesta categoria.</p>';
 return '<section class="demo-role-view">'+pageTitle('Visão do cliente','Rondas do local autorizado. Esta área usa dados ilustrativos.')+
 '<header class="demo-role-site"><span>CLIENTE DE DEMONSTRAÇÃO · DADOS FICTÍCIOS</span><h2>'+esc(client.name)+'</h2><p>Posto: '+esc(unit)+' · '+esc(client.contact)+'</p><p>'+esc(client.phone)+' · '+esc(client.email)+'</p></header>'+
 '<label class="demo-client-selector">Alternar cliente demonstrativo <select data-demo-client>'+DEMO_CLIENTS.map((x,i)=>'<option value="'+i+'" '+(i===selectedDemoClientIndex?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>'+
 '<div class="demo-role-metrics"><div><strong>'+active.length+'</strong><small>Em andamento</small></div><div><strong>'+past.length+'</strong><small>Últimas rondas</small></div></div>'+
 '<div class="demo-role-columns"><section><h3>Mapa da unidade</h3>'+(mine.length?'<div id="ops-map" class="map-container large"></div><p class="map-caption">Trajeto e GPS ilustrativos. Localização real depende de envio efetivo ao servidor.</p>':'<p class="empty">Nenhum trajeto cadastrado para este cliente fictício.</p>')+'</section>'+
 '<section><h3>Em andamento</h3>'+rows(active)+'<h3>Histórico recente</h3>'+rows(past.slice(0,12))+'</section></div></section>';
}
function demoInspectorView(){
 const records=demoInspectionRecords(),mean=records.length?Math.round(records.reduce((n,x)=>n+x.score,0)/records.length):null;
 const checks=[['acessos','Acessos em condições adequadas'],['estrutura','Estrutura verificada'],['equipamentos','Equipamentos verificados'],['sinalizacao','Sinalização adequada']];
 return '<section class="demo-role-view">'+pageTitle('Visão do vistoriador','Avaliações do local com indicador de qualidade e histórico cronológico.')+
 '<header class="demo-role-site"><span>POSTO DE VISTORIA</span><h2>'+esc(DEMO_WATCHERS[0].unit)+'</h2><p>Registro de demonstração salvo neste navegador.</p></header>'+
 '<div class="demo-role-metrics"><div><strong>'+(mean==null?'—':mean+'%')+'</strong><small>Média dos critérios atendidos</small></div><div><strong>'+records.length+'</strong><small>Vistorias realizadas</small></div></div>'+
 '<div class="demo-role-columns"><form id="demo-inspection-form" class="demo-inspection-form"><h3>Nova vistoria</h3>'+
 checks.map(([k,label])=>'<label><input type="checkbox" name="'+k+'"><span>'+esc(label)+'</span></label>').join('')+
 '<label>Observações<textarea name="notes" required minlength="8" placeholder="Descreva o que verificou"></textarea></label><button class="button primary">Registrar vistoria</button></form>'+
 '<section><h3>Histórico</h3>'+(records.length?records.map(r=>'<div class="demo-ops-row"><span><strong>'+fmt(r.at)+'</strong><small>'+esc(r.notes)+'</small></span><b>'+r.score+'%</b></div>').join(''):'<p class="empty">Nenhuma vistoria registrada.</p>')+
 '<p class="map-caption">O indicador mede quatro critérios de conformidade do local e não avalia pessoas.</p></section></div></section>';
}
function demoAdminRouteQueue(){
 const w=watcherById(selectedSupervisedWatcherId)||DEMO_WATCHERS[0],history=sessionList().filter(s=>s.name===w.name).slice(0,5),planned=programsForWatcher(programs,w.id);
 return '<section class="demo-admin-route-queue"><header class="demo-admin-route-header"><div><span class="eyebrow">MAPAS · RONDAS POR COLABORADOR</span><h2>'+esc(w.name)+'</h2><p>'+esc(w.unit)+' · '+history.length+' registros recentes · '+planned.length+' programações</p></div><a class="button primary" href="/central.html#routes">+ Criar nova rota para colaborador</a></header>'+
 '<p class="map-caption">A seleção do vigia acima filtra os mapas e o histórico. O cadastro persistente abre a central autenticada.</p>'+
 (history.length?history.map((s,i)=>'<article class="demo-admin-route-line"><div id="admin-route-mini-'+i+'" class="demo-mini-route-map"></div><div><span class="demo-route-flag">'+(s.status==='active'?'Em andamento':'Concluída')+'</span><h3>'+esc(s.route.name)+'</h3><p>'+esc(w.unit)+' · '+fmt(s.startedAt)+'</p><p>'+(s.checkpoints||[]).filter(p=>p.completedAt).length+'/'+s.route.points.length+' pontos verificados</p><button class="button small" data-action="session-detail" data-id="'+esc(s.id)+'">Ver cronologia</button></div></article>').join(''):'<p class="empty">Sem execução registrada para este vigia. Confira a agenda abaixo.</p>')+'</section>';
}

function rondas(){
 const context=supervisedContext(),route=context.route,actual=context.current;
 const active=actual?.status==='active',current=active?actual.index:-1;
 const progress=actual?actual.checkpoints.filter(p=>p.completedAt).length:0;
 return pageTitle('Rondas','Programe, acompanhe e consulte a execução das rondas.',helpButton('schedules','programação de rondas'))+supervisorWatcherSelector()+demoAdminRouteQueue()+schedulePanel()+(scheduleTab==='mapa'?`<div class="map-command-page"><section class="map-command-panel"><div class="map-command-top"><div><div class="eyebrow">CARTOGRAFIA E LOCALIZAÇÃO</div><h2>${ic('map')} ${esc(route.name)}</h2><p>Ruas reais quando online · pontos ilustrativos</p></div><div class="map-command-actions">${tag(active?'Ronda em andamento':'Rota de referência',active?'green':'neutral')}${btn(ic('crosshair')+' Enquadrar rota','center-maps','small')}</div></div><div class="map-command-map"><div id="ops-map" class="map-container large"></div><div class="map-command-topbadge">${ic('pin')} ${route.points.length} pontos · raio de 25 m</div></div>${legend()}<div class="map-command-disclosure">${ic('help')} <span>O mapa mostra ruas reais, mas a linha entre os pontos é apenas ilustrativa. Não representa um caminho calculado pelas vias. A precisão do GPS pode variar.</span></div></section><aside class="map-checkpoint-panel"><div class="map-checkpoint-heading"><div class="eyebrow">SEQUÊNCIA DE VERIFICAÇÃO</div><h2>Pontos da rota</h2><p>${progress} de ${route.points.length} verificados neste cenário</p></div><div class="map-point-list">${route.points.map((p,i)=>{const done=!!actual?.checkpoints[i]?.completedAt,now=active&&current===i;return `<button type="button" class="map-point-row ${done?'is-done':now?'is-current':''}" data-action="focus-route-point" data-index="${i}" aria-label="Localizar ponto ${i+1}: ${esc(p.name)}"><span class="map-point-number">${done?ic('check'):i+1}</span><span class="map-point-info"><strong>${esc(p.name)}</strong><small>${done?'Verificado':now?'Ponto obrigatório atual':'Aguardando sequência'} · 25 m</small></span><span class="map-point-target">${ic('crosshair')}</span></button>`}).join('')}</div><div class="map-point-note">${ic('clock')} Permanência de 30 segundos contínuos dentro do raio, conforme GPS confiável.</div><div class="map-point-note">${ic('shield')} Falhas ou baixa precisão do GPS exigem verificação, não representam desvio automaticamente.</div></aside></div><section class="card map-history" style="margin-top:15px"><div class="card-title"><div><h2>Histórico de rondas</h2><p>Registros guardados somente neste navegador.</p></div>${tag(`${context.history.length} rondas`,'neutral')}</div>${tablePatrols(context.history)}</section>`:'');
}
function notificationRow(n){const isAlert=n.kind==='deviation'||n.kind==='panic';return `<button class="event-item ${!n.seenAt?'unread':''}" data-action="notification-detail" data-id="${esc(n.id)}" data-session="${esc(n.session.id)}"><span class="event-icon ${isAlert?'alert':''}">${ic(isAlert?'alert':'clipboard')}</span><span style="flex:1"><strong>${esc(n.label)}</strong><small>${esc(n.session.name)} · ${esc(n.session.route.name)}</small><p>${n.kind==='panic'?'Solicitação de atendimento prioritário registrada no dispositivo.':n.kind==='deviation'?n.justification?'Justificativa registrada, consultar o evento.':'Aguardando justificativa do colaborador.':'Ocorrência vinculada à ronda.'}</p></span><time>${time(n.at)}</time></button>`}
let alertFilter='pending';
function notificationsView(){
 const all=recentNotification(),pending=all.filter(n=>!n.seenAt),shown=alertFilter==='pending'?pending:all;
 return pageTitle('Central de alertas','Desvios e ocorrências com justificativas e histórico de avaliação.',helpButton('alerts','avisos e justificativas'))+`<div class="alerts-command-page"><div class="alert-local-banner">${ic('shield')} <span><strong>Ambiente de avaliação</strong> Os avisos desta plataforma são registrados somente no navegador. Não há envio para supervisores remotos.</span></div><div class="alerts-queue-card"><div class="alerts-queue-head"><div><div class="eyebrow">FILA DE ATENÇÃO</div><h2>${pending.length} alerta(s) aguardando análise</h2><p>Selecione um evento para consultar a justificativa e registrar sua avaliação.</p></div>${btn('Ver ocorrências '+ic('arrow'),'open-incidents','small')}</div><div class="alert-filter-tabs" aria-label="Filtrar alertas"><button type="button" data-action="filter-alerts" data-filter="pending" class="${alertFilter==='pending'?'selected':''}" aria-pressed="${alertFilter==='pending'}">Pendentes (${pending.length})</button><button type="button" data-action="filter-alerts" data-filter="all" class="${alertFilter==='all'?'selected':''}" aria-pressed="${alertFilter==='all'}">Todos (${all.length})</button></div><div class="alerts-queue-list">${shown.map(notificationRow).join('')||`<div class="alerts-empty">${ic('checkcircle')}<strong>${alertFilter==='pending'?'Nenhum alerta pendente':'Nenhum evento registrado'}</strong><p>${alertFilter==='pending'&&all.length?'Abra “Todos” para rever os registros já avaliados.':'Ao ocorrer um desvio ou ser registrada uma ocorrência, ela aparecerá aqui com o contexto da ronda.'}</p></div>`}</div><div class="alerts-footer">${ic('help')} <span>Um alerta é uma indicação para avaliação, não prova automática de irregularidade.</span></div></div></div>`;
}
function occurrences(){const rows=recentIncidents();return pageTitle('Ocorrências','Registros que devem ser avaliados conforme prioridade e contexto.',user?.role==='ronda'?helpButton('alerts','ocorrências'):btn('Voltar aos alertas','nav-alerts','small'))+`<div class="card"><div class="card-title"><h2>Registros de ocorrência</h2>${tag(`${rows.length} eventos`,'neutral')}</div>${rows.map(i=>`<button class="list-row" data-action="incident-detail" data-id="${esc(i.id)}" data-session="${esc(i.session.id)}"><span class="row-icon">${ic('alert')}</span><div><strong>${esc(i.title)}</strong><small>${esc(i.session.name)} · ${esc(i.pointName)} · ${fmt(i.at)}</small><p>${esc(i.description)}</p></div><span class="row-right">${tag(i.severity,i.severity==='Alta'?'red':'orange')}${tag(i.status??'Aberta','neutral')}</span></button>`).join('')||'<div class="empty">Nenhuma ocorrência. O ronda pode registrar observações durante a operação.</div>'}</div>`}
function team(){return pageTitle('Equipe','Vigias e escalas fictícios neste navegador.',helpButton('team','equipes e permissões'))+`<section class="schedule-workspace"><header class="schedule-heading"><div><div class="eyebrow">EFETIVO OPERACIONAL</div><h2>${DEMO_WATCHERS.length} vigias cadastrados</h2><p>Colaboradores fictícios para apresentar operações com múltiplas rondas.</p></div></header><div class="team-list">${DEMO_WATCHERS.map(w=>`<div class="team-row"><span class="avatar">${esc(w.name[0])}</span><div><strong>${esc(w.name)}</strong><small>${esc(w.unit)}</small></div><span>${programsForWatcher(programs,w.id).length} rondas</span></div>`).join('')}</div></section>`}
function reports(){
 const all=sessionList(),notices=recentNotification(),completed=all.filter(s=>s.status==='completed').length,progress=all.reduce((sum,s)=>sum+s.checkpoints.filter(p=>p.completedAt).length,0),possible=all.reduce((sum,s)=>sum+s.route.points.length,0);
 const ratios=[{label:'Rondas concluídas',n:completed,total:all.length,color:'safe'},{label:'Pontos verificados',n:progress,total:possible,color:'blue'},{label:'Eventos analisados',n:notices.filter(n=>n.seenAt).length,total:notices.length,color:'cyan'}];
 const dates=all.map(s=>s.startedAt).filter(Number.isFinite).sort((a,b)=>a-b);
 const range=dates.length?`${new Date(dates[0]).toLocaleDateString('pt-BR')} até ${new Date(dates.at(-1)).toLocaleDateString('pt-BR')}`:'Nenhum registro neste navegador';
 return `<div class="report-page">${pageTitle('Relatório operacional','Registros e indicadores gerados exclusivamente a partir dos dados deste ambiente.',btn(ic('print')+' Imprimir / PDF','print',''))}<div class="report-context-bar"><span>${ic('clock')} ${esc(range)}</span>${tag('Dados locais, sem servidor','neutral')}</div>${kpiCards()}<div class="report-insights-grid"><section class="card report-breakdown"><div class="eyebrow">ANÁLISE DOS REGISTROS</div><h2>Visão da execução</h2><p>Percentuais calculados sobre as rondas e eventos registrados neste navegador.</p><div class="report-progress-list">${ratios.map(item=>{const pct=item.total?Math.round(item.n/item.total*100):0;return `<div class="report-progress-row"><div class="report-progress-label"><strong>${item.label}</strong><span>${item.n} de ${item.total} <b>${pct}%</b></span></div><div class="report-progress-track" role="progressbar" aria-label="${item.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i class="${item.color}" style="width:${pct}%"></i></div></div>`}).join('')}</div><div class="report-safety-note">${ic('shield')} <span>Indicadores de demonstração. Sem homologação do GPS ou sincronização com equipe real.</span></div></section><section class="card report-events"><div class="card-title"><div><div class="eyebrow">ATIVIDADE DOCUMENTADA</div><h2>Eventos recentes</h2></div>${tag(`${notices.length} avisos`,'neutral')}</div><div class="report-events-list">${notices.slice(0,5).map(notificationRow).join('')||`<div class="reports-empty">${ic('clipboard')}<strong>Nenhum evento registrado</strong><p>Desvios e ocorrências aparecerão aqui com horário e contexto.</p></div>`}</div></section></div><section class="card report-roster"><div class="card-title"><div><div class="eyebrow">HISTÓRICO</div><h2>Rondas registradas</h2></div>${tag(`${all.length} rondas`,'neutral')}</div>${tablePatrols(all)}</section><div class="report-note">${ic('help')} <span>Use “Imprimir / PDF” para salvar uma cópia local. O navegador realiza a impressão; nenhum documento é enviado automaticamente.</span></div></div>`;
}
function settings(){
 if(user?.role!=='admin')return pageTitle('Sem permissão','Regras disponíveis somente para Gerência e Administração.');
 const options=[
  {id:'dwellSeconds',title:'Tempo de permanência',value:operationalSettings.dwellSeconds+' segundos',
   info:'Defina de 5 a 120 segundos em cada ponto.'},
  {id:'deviationJustification',title:'Justificativa de desvio',value:operationalSettings.deviationJustification?'Obrigatória':'Desativada',
   info:'Solicita explicação antes de liberar o avanço quando houver desvio.'},
  {id:'evidenceEnabled',title:'Verificação ilustrativa',value:operationalSettings.evidenceEnabled?'Ativada':'Desativada',
   info:'Exibe as etapas demonstrativas de conferência no ponto.'}
 ];
 return pageTitle('Configurações','Regras para novas rondas.',helpButton('privacy','configurações e privacidade'))+
  '<section class="hx05-settings-list" aria-label="Regras configuráveis">'+
  '<div class="hx05-list-heading"><strong>Regras de operação</strong><span>Gerência e Administração</span></div>'+
  options.map(o=>'<div class="hx05-setting-row"><span class="hx05-setting-copy"><strong>'+esc(o.title)+'</strong>'+
   '<small>'+esc(o.value)+'</small><span>'+esc(o.info)+'</span></span>'+
   '<button type="button" class="hx05-open-button" data-action="open-operational-setting" data-setting="'+o.id+'">Abrir</button></div>').join('')+
  '<p class="hx05-settings-note">As mudanças só serão aplicadas às rondas iniciadas depois de salvar.</p></section>'+
  '<div class="settings-data"><span>Dados de demonstração armazenados neste navegador</span>'+
   btn('Apagar registros locais','clear-prompt','small danger')+'</div>';
}
function personalRecords(){const mine=sessionList().filter(s=>s.name===user.name);return pageTitle('Meus registros','Consulte suas rondas, horários e justificativas.',helpButton('reports','histórico'))+`<div class="card">${tablePatrols(mine)}</div>`}
function legend(){return `<div class="map-legend maxvel-map-legend" aria-label="Legenda operacional do mapa"><span><i class="legend-dot base"></i>Base</span><span><i class="legend-dot"></i>Ponto planejado</span><span><i class="legend-dot done"></i>Concluído</span><span><i class="legend-dot radius"></i>Raio de 25 m</span><span><i class="legend-line planned"></i>Traçado ilustrativo</span><span><i class="legend-line traced"></i>Posição percorrida</span></div>`}
const latestDeviation=()=>session?.deviations.at(-1)??null;
function coach(){if(!session)return {n:1,title:'Inicie a ronda',detail:'Clique em “Iniciar ronda”. Antes de começar, leia e aceite as orientações.',benefit:'Processo iniciado com regras explícitas.'};if(session.status==='completed')return {n:7,title:'Ronda concluída',detail:'Abra o histórico para consultar horários e eventos registrados.',benefit:'Sequência e retorno documentados.'};if(movement)return {n:2,title:'Acompanhe o deslocamento',detail:'O marcador percorre posições intermediárias sobre o mapa real. Aguarde chegar ao destino.',benefit:'Acompanhamento visual da rota fictícia.'};const d=latestDeviation();if(d&&!d.justification)return {n:4,title:'Justificativa pendente',detail:'No celular, clique em “Escrever justificativa”. O avanço continua bloqueado.',benefit:'A supervisão consulta o desvio e a explicação.'};if(d&&!d.returnedAt)return {n:5,title:'Retorne ao ponto obrigatório',detail:'Justificar não conclui o ponto. Use “Deslocar até o ponto” para retornar e cumprir a permanência.',benefit:'A sequência de verificações permanece obrigatória.'};const p=currentCheckpoint(session);if(!p)return {n:6,title:'Retorne à base',detail:'Use “Retornar à base” e depois finalize a ronda.',benefit:'A operação se encerra na base prevista.'};if(session.insideSince===null)return {n:2,title:`Desloque-se até o ponto ${session.index+1}`,detail:'Use Deslocar, chegue ao destino e toque em Estou Aqui. Aproximação não inicia o cronômetro.',benefit:'Confirmação presencial obrigatória.'};if(!canCompletePoint(session))return {n:3,title:'Permaneça no raio',detail:`Aguarde ${Math.max(0,Math.ceil((requiredDwellMs(session)-session.checkpoints[session.index].dwellMs)/1000))} s. Se sair, a contagem reinicia.`,benefit:'A permanência tem duração verificável.'};return {n:3,title:'Confirme este ponto',detail:'Toque em “Concluir ponto e seguir”. Somente então o próximo ponto ficará disponível.',benefit:'Progressão condicionada à validação.'};}
function coachHtml(){const c=coach();return `<aside class="guide-inline" aria-label="Ajuda da etapa atual"><span class="stepnum">${String(c.n).padStart(2,'0')}</span><div style="flex:1"><strong data-live="coach-title">${esc(c.title)}</strong><p data-live="coach-detail">${esc(c.detail)}</p></div><button data-action="guide">Ajuda</button></aside>`}
function phoneTelemetry(){
 const s=session,point=s?.status==='active'?currentCheckpoint(s):null;
 const pct=s?progressPercent(s):0;
 const fix=locationFix;
 const state=s?.status==='completed'?'Concluída':s?.status==='active'?hasBlock(s)?'Atenção necessária':movement?'Em deslocamento':point?'Ronda ativa':'Retorno à base':'Pronta para iniciar';
 const stateClass=s?.status==='completed'?'finished':hasBlock(s??{deviations:[]})?'warning':'active';
 return `<div class="mobile-operational-strip"><div class="mobile-location-status"><span class="ops-live-dot"></span><div><strong>${esc(state)}</strong><small>${mode==='simulation'?'Cenário ilustrativo · sem GPS real':'GPS do dispositivo · sujeito à precisão'}</small></div></div><div class="mobile-progress-chip">${s?`${s.index}/${s.route.points.length}`:'0/4'} <span>pontos</span></div></div><div class="mobile-tracking-meta"><div>${ic('map')} <strong>${point?esc(point.name):s?.status==='completed'?'Ronda finalizada':'Rota Centro · Perímetro'}</strong></div><div class="mobile-mini-meter" role="progressbar" aria-label="Progresso da ronda" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div><small>${point?'Próximo ponto obrigatório':'Verifique a sequência no mapa'} · ${mode==='real'&&fix?`Precisão ${Math.round(fix.accuracy??0)} m`:'25 m de raio por ponto'}</small></div>`;
}
function readyStartPanel(){
 return `<div class="patrol-stage-intro"><span class="patrol-stage-index">01 · PREPARAÇÃO</span><h2>Pronto para iniciar?</h2><p>Ronda em quatro pontos. Raio de 25 metros e 30 segundos de permanência por ponto.</p></div><div class="patrol-mode-toggle" aria-label="Modo da ronda"><button type="button" class="${mode==='simulation'?'selected':''}" data-action="mode-simulation" aria-pressed="${mode==='simulation'}">${ic('play')} Cenário</button><button type="button" class="${mode==='real'?'selected':''}" data-action="mode-real" ${presentation?'disabled':''} aria-pressed="${mode==='real'}">${ic('crosshair')} GPS real</button></div>${btn('Iniciar ronda '+ic('arrow'),'start','primary full')}<p class="patrol-microtext">${presentation?'Você experimenta o próprio aplicativo, com mapa e alertas ilustrativos.':mode==='real'?'O aparelho solicitará permissão para localização durante a ronda.':'O mapa contém ruas reais; trajeto e posições do cenário são simulados.'}</p>`;
}
function navigationShortcuts(point){
 if(!point)return '';
 const lat=Number(point.lat),lng=Number(point.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return '';
 const coord=encodeURIComponent(lat+','+lng);
 const maps='https://www.google.com/maps/dir/?api=1&destination='+coord;
 const waze='https://waze.com/ul?ll='+coord+'&navigate=yes';
 return '<div class="rondas-directions" aria-label="Navegação externa ao destino">'+
  '<span>Próximo destino · '+esc(point.name)+'</span><div class="rondas-directions-links">'+
  '<a href="'+esc(maps)+'" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>'+
  '<a href="'+esc(waze)+'" target="_blank" rel="noopener noreferrer">Waze ↗</a></div>'+
  (mode==='simulation'?'<small>Coordenadas fictícias nesta demonstração. Não utilize para um atendimento real.</small>':'<small>O aplicativo de trânsito receberá as coordenadas do ponto.</small>')+'</div>';
}
function patrolActionContent(){
 const s=session,active=s?.status==='active',complete=s?.status==='completed',route=s?.route??DEMO_ROUTE;
 const p=active?currentCheckpoint(s):null,dev=active?latestDeviation():null,blocked=active&&hasBlock(s);
 if(!s)return readyStartPanel();
 if(complete)return '<div class="patrol-stage-intro"><span class="patrol-stage-index">RONDA FINALIZADA</span><h2>'+ic('checkcircle')+' Todos os pontos concluídos</h2><p>Etapas e retorno à base registrados para acompanhamento.</p></div>'+btn('Nova ronda','new-session','primary full');
 if(blocked&&dev&&!dev.justification)return '<div class="patrol-stage-intro is-alert"><span class="patrol-stage-index">'+ic('alert')+' ATENÇÃO · AVANÇO BLOQUEADO</span><h2>Justificativa necessária</h2><p>Descreva a saída do trajeto antes de continuar.</p></div>'+btn('Escrever justificativa','justify','primary full');
 if(blocked&&dev&&!dev.returnedAt)return '<div class="patrol-stage-intro is-alert"><span class="patrol-stage-index">'+ic('alert')+' DESVIO REGISTRADO</span><h2>Retorne ao ponto</h2><p>É necessário retornar ao local e confirmar sua presença novamente.</p></div>'+(mode==='simulation'?btn('Retornar ao ponto','demo-arrive','primary full',movement?'disabled':''):'<p class="section-note">Aguarde um GPS confiável no ponto.</p>');
 if(p){
  const current=s.checkpoints[s.index],checkedIn=!!current.checkedInAt&&s.insideSince!==null;
  const reached=mode==='simulation'&&!movement&&!!locationFix&&distanceMeters(locationFix,p)<=p.radius;
  let action;
  if(movement)action=btn('Deslocamento em andamento…','demo-arrive','primary full','disabled');
  else if(checkedIn)action=btn('Ver cronômetro de verificação','show-checkpoint','primary full');
  else if(mode==='simulation'&&!reached)action=btn('Deslocar até o ponto '+(s.index+1)+' '+ic('arrow'),'demo-arrive','primary full');
  else action=btn('📍 Estou Aqui','checkin-now','primary full');
  return '<div class="patrol-stage-intro"><span class="patrol-stage-index">PONTO '+(s.index+1)+' / '+route.points.length+'</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.instruction||'Verifique o local.')+'</p></div>'+
   '<div class="rondas-main-action">'+action+'</div>'+(!checkedIn&&!movement?navigationShortcuts(p):'');
 }
 return '<div class="patrol-stage-intro"><span class="patrol-stage-index">CIRCUITO · RETORNO</span><h2>Voltar à Base Maxvel</h2><p>Rua Mato Grosso, 1546 · Centro, Divinópolis / MG. A ronda só se encerra após o retorno à base.</p></div>'+
   (mode==='simulation'&&!s.returnConfirmed?btn(movement?'Retornando à base…':'Deslocar até a base','demo-arrive','primary full',movement?'disabled':''):btn('Finalizar ronda '+ic('check'),'finish','primary full',s.returnConfirmed&&!hasBlock(s)?'':'disabled'))+
   '<div class="rondas-directions"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('Rua Mato Grosso, 1546, Centro, Divinópolis, MG')+'">Abrir Base Maxvel no Google Maps ↗</a></div>';
}
function patrolScenarioControls(){
 if(!session||session.status!=='active'||mode!=='simulation')return '';
 const p=currentCheckpoint(session),busy=!!movement;
 return `<div class="patrol-scenario-tools"><div class="patrol-tools-heading"><span>${ic('play')} Testes do cenário</span><small>Ações opcionais de demonstração</small></div><div class="patrol-quick-actions">${btn('Testar desvio','demo-leave','',busy?'disabled':'')}${btn('Ocorrência','incident-form','')}</div></div>`;
}
function patrolMapClock(){
 if(!session||session.status!=='active'||!currentCheckpoint(session))return '';
 const seconds=Math.floor(session.checkpoints[session.index].dwellMs/1000),required=Math.round(requiredDwellMs(session)/1000);
 const started=session.insideSince!==null,ready=canCompletePoint(session);
 const label=ready?'Tempo concluído':started?'Verificação iniciada':'Aguardando Estou Aqui';
 return `<div class="patrol-map-clock ${ready?'clock-done':started?'clock-running':'clock-waiting'}" role="timer" aria-live="off">
  <span class="patrol-clock-label">${ic('clock')} <span data-live="clock-state">${label}</span></span>
  <strong><span data-live="seconds">${seconds}</span><small> / ${required} s</small></strong></div>`;
}
/** Verificação e comunicação pertencem à aba Ponto; nunca devem deslocar Iniciar ronda. */
function phoneContent(){
 const s=session,route=s?.route??routeForWatcher(selectedWatcherId),active=s?.status==='active',point=active?currentCheckpoint(s):null,progress=s?progressPercent(s):0;
 const state=active?(hasBlock(s)?'Atenção · justificativa':point?`Ponto ${s.index+1} de ${route.points.length}`:'Retorno à base'):s?.status==='completed'?'Ronda concluída':'Ronda preparada';
 return `<div class="patrol-workspace${patrolSheetCollapsed?' sheet-collapsed':''}">
  <div class="patrol-statusline">${phoneTelemetry()}</div>
  <section class="patrol-map-panel" aria-label="Mapa da ronda">
   <header class="patrol-map-heading"><div class="patrol-map-heading-copy"><strong>${esc(route.name)}${window.innerWidth>900?helpButton('map','mapa e pontos'):''}</strong><small>${esc(state)} · ${s?Math.floor(progress)+'%':'4 pontos previstos'} · ${mode==='simulation'?'Demonstração':'GPS do aparelho'}</small></div>${patrolMapClock()}<button type="button" data-action="center-maps" title="Enquadrar rota" aria-label="Enquadrar rota e pontos">${ic('crosshair')}</button></header>
   <div class="patrol-map-canvas"><div id="mobile-map" class="map-container mini"></div>${window.innerWidth<=900?`<button type="button" class="ux06-map-help" data-action="feature-help" data-topic="map" aria-label="Ajuda sobre mapa">${ic("help")}</button>`:""}</div>
   <div class="patrol-map-footer"><span>${mode==='real'?'GPS autorizado':'Localização simulada'}</span><span data-live="coords">${locationFix?`${locationFix.lat.toFixed(5)}, ${locationFix.lng.toFixed(5)}`:'Aguardando início'}</span></div>
  </section>
  <section class="patrol-actions" aria-label="Ação principal da ronda">
    <div class="patrol-action-heading"><strong>${ic('compass')} ${esc(state)}</strong><button type="button" class="patrol-sheet-toggle" data-action="toggle-patrol-sheet" aria-controls="patrol-action-content" aria-expanded="${!patrolSheetCollapsed}">${patrolSheetCollapsed?'Mais opções':'Menos opções'}</button></div>
    <div class="patrol-action-body">
      <div class="patrol-primary-flow">${patrolActionContent()}</div>
      <div id="patrol-action-content" class="patrol-extra-flow">
       <div class="patrol-extra-label">Ferramentas e informações</div>
       ${active&&point&&mode==='simulation'&&s.evidenceEnabled!==false?`<button type="button" class="patrol-evidence-link" data-action="point-evidence">${ic('clipboard')} Verificação ilustrativa do ponto ${s.index+1}</button>`:''}
       ${mySchedule()}
       ${patrolScenarioControls()}
       ${active?'<section class="patrol-verification-pane" aria-label="Comprovação do ponto"></section>':''}
       <details class="patrol-help-details"><summary>${ic('help')} Instruções e pontos</summary>${coachHtml()}<div class="patrol-point-list">${route.points.map((p,i)=>`<button type="button" data-action="point-details" data-index="${i}" class="${s?.checkpoints[i]?.completedAt?'done':active&&s.index===i?'current':''}"><b>${s?.checkpoints[i]?.completedAt?ic('check'):i+1}</b><span>${esc(p.name)}</span></button>`).join('')}</div><button type="button" class="patrol-help-link" data-action="guide">${ic('help')} Abrir guia completo</button>${active&&mode==='simulation'&&point&&s.index<route.points.length-1?btn('Testar tentativa de pular ponto','demo-skip','small'):''}</details>
      </div>
    </div>
  </section>
  </div>`;
}
/* A demonstração não cria uma segunda interface: usa appShell + phoneContent + viewContent. */
const lessonNames=['O que você verá','Início e percurso','Desvios e justificativa','Supervisão e resultado','Limites e implantação'];
function lesson(i){const stages=[`<p>Você acompanhará a mesma ronda dentro do aplicativo. Use o seletor de áreas para alternar entre Operação de Ronda e Administração, sem perder o progresso nem os alertas locais.</p><ol><li>Inicie a ronda e veja a localização no mapa.</li><li>Percorra os pontos na ordem e aguarde os 30 segundos.</li><li>Simule um desvio ou registre uma ocorrência.</li><li>Consulte a notificação e a justificativa no painel.</li></ol>`,`<p>O deslocamento usa posições intermediárias sobre a cartografia real, mas o trajeto de exemplo não é uma rota de trânsito oficial.</p><ol><li>Clique em <strong>Iniciar ronda</strong> e aceite as regras.</li><li>No painel da ronda, use <strong>Ir ao próximo ponto</strong> nos comandos do cenário.</li><li>Aguarde a chegada dentro do raio de 25 m.</li><li>Espere 30 segundos reais e confirme a conclusão para liberar o próximo.</li></ol>`,`<p>A progressão para quando a posição sai do corredor da rota simulada ou tenta avançar fora da sequência.</p><ol><li>Use <strong>Sair da rota</strong> nos comandos do cenário.</li><li>O ronda verá a solicitação de justificativa.</li><li>Escreva o motivo e confirme o envio local simulado.</li><li>Use <strong>Ir ao próximo ponto</strong> para voltar ao ponto pendente e cumpra 30 segundos novamente: justificar não substitui a visita.</li></ol>`,`<p>Alterne para <strong>Administração</strong> na barra superior do próprio aplicativo. Os avisos reúnem nome, rota, ponto, horário, posição ilustrativa e explicação. O administrador pode abrir o aviso e marcá-lo como analisado.</p><p style="margin-top:12px"><strong>Benefício proposto:</strong> facilitar conferências, histórico e tratamento de exceções. A eficiência só pode ser medida numa operação piloto.</p>`,`<p><strong>Protótipo, não produção.</strong> As notificações são locais, os usuários não possuem autenticação real e os registros ficam neste navegador. O mapa usa ruas reais, mas as rotas da Maxvel foram substituídas por pontos fictícios.</p><ol><li>No piloto: validar precisão GPS, rede, bateria, duração e acessibilidade.</li><li>Na implantação: servidor, autenticação, auditoria, permissões, mapas e notificações reais.</li><li>Na privacidade: documentar finalidade, acesso, retenção e tratamento conforme a LGPD.</li></ol>`];return stages[i]||stages[0]}
function showGuide(forPresentation=false,step=0){
 const changingStep=modal.open&&modal.classList.contains('guide-dialog');
 const isLaunching=forPresentation||screen==='landing';
 const mobileGuide=!isLaunching?mobileGuideFor(user?.role):null;
 const names=mobileGuide?mobileGuide.stages.map(item=>item.title):lessonNames;
 guideStage=Math.max(0,Math.min(names.length-1,Number(step)||0));
 const steps=names.map((title,i)=>
  '<button type="button" data-action="guide-stage" data-stage="'+i+'"'+
  ' aria-current="'+(i===guideStage?'step':'false')+'" class="'+(i===guideStage?'active':'')+'">'+
  '<span class="guide-step-number">'+(i+1)+'</span><span>'+esc(title)+'</span></button>').join('');
 const last=guideStage===names.length-1;
 const actions=[
  guideStage>0?btn(ic('arrowleft')+' Anterior','guide-back','guide-prev'):'',
  !last?btn('Próxima etapa '+ic('arrow'),'guide-forward','primary guide-next'):
   isLaunching?btn('Abrir apresentação guiada '+ic('arrow'),'launch-presentation','primary guide-next'):
   btn('Voltar ao aplicativo','close-dialog','primary guide-next')
 ].join('');
 showDialog('<div class="guide-shell">'+
  '<header class="guide-header"><div class="eyebrow">GUIA INTERATIVO · GRUPO MAXVEL</div>'+
  '<h2 id="guide-title">'+esc(mobileGuide?.title||'Conheça o sistema sem decorar instruções.')+'</h2>'+ 
  '<div class="guide-stage-progress"><span>Etapa '+(guideStage+1)+' de '+names.length+'</span>'+ 
  '<div class="guide-progress-track" role="progressbar" aria-label="Progresso no guia"'+
  ' aria-valuemin="0" aria-valuemax="'+names.length+'" aria-valuenow="'+(guideStage+1)+'">'+ 
  '<span style="width:'+((guideStage+1)/names.length*100)+'%"></span></div></div></header>'+ 
  '<div class="guide-scroll" id="guide-scroll" aria-labelledby="guide-current-heading" tabindex="0">'+
  '<p class="guide-description">'+esc(mobileGuide?.subtitle||'Cada tema explica o que fazer, o que observar e o valor para a empresa. A ajuda continuará acessível durante a operação.')+'</p>'+ 
  '<details class="guide-step-picker"><summary>Escolher etapa <span>'+esc(names[guideStage])+'</span></summary>'+
  '<nav class="guide-tabs" aria-label="Etapas do guia">'+steps+'</nav></details>'+
  '<section class="guide-pan" aria-labelledby="guide-current-heading"><h3 id="guide-current-heading" tabindex="-1">'+
  esc(names[guideStage])+'</h3>'+(mobileGuide?mobileGuide.stages[guideStage].body:lesson(guideStage))+'</section>'+ 
  (mobileGuide?'':ops.guideSection())+
  (isLaunching&&last?'<section class="guide-pan guide-launch"><h3>Pronto para testar?</h3>'+
  '<label class="field">Nome do ronda na apresentação'+
  '<input id="presentation-name" maxlength="60" minlength="2" value="'+esc(presentationName)+'"></label></section>':'')+
  '</div><footer class="guide-footer"><span class="guide-footer-step">'+
  (guideStage+1)+' / '+names.length+'</span><div class="guide-footer-actions">'+actions+
  '</div></footer></div>',true);
 modal.classList.add('guide-dialog');
 modal.dataset.guideRole=mobileGuide?user.role:(user?.role||'ronda');
 modal.dataset.guideLaunch=isLaunching?'true':'false';
 // A rolagem fica exclusivamente no conteúdo. Ao mudar de etapa,
 // reiniciamos a leitura e oferecemos foco correto para teclado/leitor de tela.
 if(changingStep)requestAnimationFrame(()=>{
  modal.querySelector('#guide-scroll')?.scrollTo(0,0);
  modal.querySelector('#guide-current-heading')?.focus({preventScroll:true});
 });
}
function showDialog(html,wide=false){modal.className=wide?'wide':'';modal.innerHTML=`<button type="button" class="dialog-close" aria-label="Fechar janela" data-action="close-dialog">${ic('close')}</button>${html}`;if(!modal.open)modal.showModal();requestAnimationFrame(()=>installDialogPagination(modal));}
function privacy(){showDialog(`<div class="eyebrow">PRIVACIDADE E TRANSPARÊNCIA</div><h2>Uso responsável dos dados de ronda</h2><p>Este protótipo guarda nomes informados, horários, coordenadas simuladas ou dados de teste autorizados, desvios, justificativas e ocorrências somente no navegador atual.</p><div class="rules"><li><div><strong>Cartografia</strong><p>Quando online, os mapas carregam imagens do OpenStreetMap. Os pontos de ronda são fictícios; o provedor pode receber informações técnicas da visualização da região do mapa.</p></div></li><li><div><strong>Localização</strong><p>O modo GPS pede autorização do aparelho. No navegador, só funciona enquanto a página estiver ativa; o aplicativo nativo Android pode continuar com um serviço em primeiro plano e notificação visível, conforme permissões e condições do sistema. O serviço não sobrevive a uma parada forçada. Falhas ou imprecisões não são prova de irregularidade.</p></div></li><li><div><strong>Supervisão e alertas</strong><p>O recebimento nesta versão é simulado e local. Nenhum supervisor real recebe automaticamente avisos.</p></div></li><li><div><strong>Próximas etapas</strong><p>Antes do uso operacional: autenticação, infraestrutura, controle de acesso, segurança, política de retenção e documentação LGPD.</p></div></li></div>${btn('Entendi','close-dialog','primary full')}`,true)}
function trackingIntroduction(){
 const requirements=LOCATION_REQUIREMENTS.map((r,i)=>`<div class="consent-feature"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(r.title)}</strong><p>${esc(r.description)}</p></div></div>`).join('');
 showDialog(`<div class="consent-compact"><div class="consent-compact-head"><span class="consent-symbol">${ic('pin')}</span><div><div class="eyebrow">PRIMEIRA ABERTURA · TRANSPARÊNCIA</div><h2>Localização durante a ronda</h2></div></div><p class="consent-compact-sub">Para registrar pontos e trajetos da sua ronda, o sistema precisa acessar a localização <b>durante o serviço autorizado</b>.</p><div class="consent-compact-points"><div>${ic('checkcircle')}<span>O acompanhamento pode continuar com a tela bloqueada ou usando outros apps <b>na versão Android nativa</b>.</span></div><div>${ic('checkcircle')}<span>Uma notificação visível permite identificar e parar o acompanhamento.</span></div><div>${ic('checkcircle')}<span>O navegador não acompanha sua posição depois de fechado. O sistema não ignora uma parada forçada.</span></div></div><details class="consent-details"><summary>Ver condições completas e privacidade</summary><div class="consent-features">${requirements}</div></details><div class="consent-disclosure"><b>Importante:</b> o aceite registra que você leu as condições, mas <b>não concede permissão ao GPS</b>. Essa autorização será solicitada pelo Android ou navegador ao iniciar uma ronda real. Alertas da demonstração são locais.</div><label class="check-label consent-check"><input type="checkbox" id="location-intro-check">Li e compreendi as condições de localização durante a ronda.</label><div class="consent-actions">${btn('Li e aceito · Continuar '+ic('arrow'),'accept-location-notice','primary full','disabled')}${btn('Explorar sem localização GPS','decline-location-notice','secondary full')}</div><p class="consent-small">O acompanhamento deve ocorrer somente durante rondas autorizadas; a empresa deve definir as regras de privacidade.</p></div>`,true);
 modal.classList.add('consent-dialog');
 modal.dataset.mandatoryNotice='true';
}
function incidentReviewDialog(s,i){
 const manage=user?.role==='admin';
 const log=(i.history??[]).slice().reverse().map(h=>`<div class="incident-review-row"><strong>${esc(h.status)}</strong><small>${fmt(h.at)} · ${esc(h.actor??'Supervisão')}</small>${h.note?`<p>${esc(h.note)}</p>`:''}</div>`).join('');
 const edit=manage?`<form id="incident-review-form" data-session="${esc(s.id)}" data-id="${esc(i.id)}"><label class="field">Situação<select name="status"><option ${i.status==='Aberta'?'selected':''}>Aberta</option><option ${i.status==='Em análise'?'selected':''}>Em análise</option><option ${i.status==='Resolvida'?'selected':''}>Resolvida</option></select></label><label class="field">Responsável pela providência<input name="assignee" maxlength="60" value="${esc(i.assignee??'')}" placeholder="Nome ou equipe"></label><label class="field">Providência / observação<textarea name="note" maxlength="450" placeholder="Descreva o que foi feito ou o encaminhamento"></textarea></label>${btn('Salvar tratamento','incident-review','primary full')}</form>`:'<p>Somente perfis de supervisão podem registrar a análise nesta demonstração.</p>';
 showDialog(`<div class="incident-review-dialog"><div class="eyebrow">OCORRÊNCIA · REGISTRO LOCAL</div><h2>${esc(i.title)}</h2><div class="incident-review-tags">${tag(i.severity,'orange')}${tag(i.status??'Aberta','neutral')}</div><p>${esc(i.description)}</p>${ops.incidentMediaList(i)}<div class="detail-pair"><span>Vigia</span><strong>${esc(s.name)}</strong></div><div class="detail-pair"><span>Ponto</span><strong>${esc(i.pointName)}</strong></div><div class="detail-pair"><span>Registrada</span><strong>${fmt(i.at)}</strong></div>${edit}<details class="incident-review-history"><summary>Histórico de tratamento (${(i.history??[]).length})</summary>${log||'<p>Nenhuma análise registrada.</p>'}</details><p class="map-caption">Demonstração: sem envio remoto nem identificação de usuário validada por servidor.</p></div>`,true);
}
function evidenceDialog(){
 if(!session||session.status!=='active'||mode!=='simulation'||!currentCheckpoint(session)){notify('Verificação de exemplo disponível apenas durante a ronda simulada.');return;}
 const index=session.index,record=getPointEvidence(session,index),stat=evidenceProgress(record);
 const items=EVIDENCE_DIRECTIONS.map(d=>{
  const done=record?.captures?.[d.id]?.mode==='simulated';
  return `<div class="evidence-demo-row"><span><strong>${esc(d.label)}</strong><small>${done?'Simulado · nenhuma imagem capturada':'Etapa pendente'}</small></span>${btn(done?'Repetir':'Simular','demo-capture','small',`data-direction="${d.id}"`)}</div>`;
 }).join('');
 showDialog(`<div class="evidence-demo-dialog"><div class="eyebrow">DEMONSTRAÇÃO · SEM FOTOS REAIS</div><h2>Verificação do ponto ${index+1}</h2><p>Conheça a sequência de quatro direções e giro. Esta simulação não ativa a câmera, não utiliza o giroscópio e não constitui prova de inspeção.</p><div class="evidence-demo-count">${stat.captured} de 4 etapas</div><div class="evidence-demo-list">${items}</div><div class="evidence-demo-motion"><span><strong>Giro do aparelho</strong><small>${stat.rotated?'Etapa simulada, sem leitura de sensor':'Leitura física ainda depende de piloto'}</small></span>${btn(stat.rotated?'Simulado':'Simular giro','demo-rotation','small')}</div><div class="evidence-demo-note">Para uso real, as evidências precisarão de captura segura, permissão e validação em dispositivos.</div>${btn(stat.confirmed?'Exemplo registrado':'Registrar demonstração','demo-evidence-confirm','primary full',stat.captured!==stat.total||!stat.rotated||stat.confirmed?'disabled':'')}${btn('Voltar ao mapa','close-dialog','full')}</div>`,true);
}
function profileDialog(){
 if(!user)return;
 showDialog(`<div class="profile-modal"><div class="profile-heading"><span class="avatar">${esc(user.name.charAt(0).toUpperCase())}</span><div><div class="eyebrow">ACESSO ATUAL</div><div class="profile-name">${esc(user.name)}</div><div class="profile-meta">${esc(roleName[user.role])} · Ambiente de avaliação</div></div></div><div class="profile-actions">${presentation?btn(ic("users")+" Trocar área","sim-role-picker","full"):""}${btn(ic('help')+' Rever tutorial','tour-restart','full')}${btn('Guia completo','guide','full')}${btn(ic('shield')+' Privacidade e dados','privacy','full')}${btn(ic('logout')+' Sair deste perfil','logout','full')}</div><a class="button full" href="/central.html">${ic('shield')} Entrar na operação real</a><p class="map-caption">Demonstração com registros locais. A operação real exige autenticação e salva informações no servidor.</p></div>`,false);
}
function startDialog(){const real=mode==='real'&&!presentation;showDialog(`<div class="eyebrow">ORIENTAÇÕES OBRIGATÓRIAS</div><h2>Antes de iniciar a ronda</h2><ol class="rules"><li><div><strong>Siga a ordem dos pontos</strong><p>O próximo ponto é liberado somente depois do anterior.</p></div></li><li><div><strong>Entre na área delimitada</strong><p>A validação exige localização dentro do raio de 25 metros, com precisão suficiente.</p></div></li><li><div><strong>Permaneça 30 segundos contínuos</strong><p>Se sair ou perder o sinal confiável, a contagem reinicia para garantir o registro.</p></div></li><li><div><strong>Informe desvios e ocorrências</strong><p>Uma saída da rota bloqueia o avanço e pede justificativa. O supervisor recebe o contexto somente nesta simulação.</p></div></li><li><div><strong>Finalize na base</strong><p>Após os pontos, volte à base. Falhas técnicas devem ser analisadas por pessoas.</p></div></li></ol><div class="section-note">${ic('help')}<span>${real?'O aparelho pedirá permissão de localização; a versão nativa Android pode manter um serviço visível em segundo plano durante a ronda. No navegador, o GPS para ao fechar a página.':'O marcador se deslocará sobre um mapa de ruas reais; trajetos e alertas serão simulados. Os 30 segundos serão reais.'}</span></div><label class="check-label"><input type="checkbox" id="declaration-check">Li as orientações e compreendi o funcionamento da ronda.</label>${btn('Confirmar e iniciar '+ic('arrow'),'confirm-start','primary full','disabled')}`,true)}
function incidentDialog(){if(!session||session.status!=='active'){notify('Inicie uma ronda antes de registrar ocorrência.');return;}showDialog(`<div class="eyebrow">REGISTRO VINCULADO À RONDA</div><h2>Registrar ocorrência</h2><p style="font-size:12px;margin-bottom:15px">Descreva o que foi observado. A notificação será mostrada localmente na supervisão.</p><form id="incident-form"><label class="field">Título<input name="title" required minlength="3" maxlength="100" placeholder="O que aconteceu?"></label><label class="field">Descrição<textarea name="description" required minlength="10" maxlength="1400" placeholder="Informe o que você observou e o contexto."></textarea></label><label class="field">Prioridade<select name="severity"><option>Baixa</option><option selected>Média</option><option>Alta</option></select></label>${ops.mediaFields()}<label class="check-label"><input name="truth" type="checkbox" required>Confirmo que o relato corresponde ao que observei nesta simulação.</label><button type="submit" class="button primary full">Registrar ocorrência ${ic('arrow')}</button></form>`)}
function justificationDialog(){const d=latestDeviation();if(!d||d.justification)return;showDialog(`<div class="eyebrow" style="color:#b93d56">SOLICITAÇÃO DE JUSTIFICATIVA</div><h2>Informe o motivo da saída</h2><p style="font-size:12px;margin:0 0 13px">Escreva uma justificativa que enviaremos ao supervisor, pois você saiu da rota.</p><div class="detail-pair"><span>Ponto pendente</span><strong>${esc(d.pointName)}</strong></div><div class="detail-pair"><span>Horário</span><strong>${fmt(d.at)}</strong></div><form id="justification-form" style="margin-top:20px"><label class="field">Justificativa<textarea required name="reason" minlength="10" maxlength="1400" placeholder="Descreva o motivo e o que aconteceu."></textarea></label><div class="section-note">${ic('shield')}<span>O retorno ao ponto e os 30 segundos continuam obrigatórios. O recebimento pela supervisão é simulado.</span></div><button type="submit" class="button primary full" style="margin-top:14px">Enviar justificativa ${ic('arrow')}</button></form>`)}
function notificationDialog(id,sid){const s=sessions.find(x=>x.id===sid),n=s?.notifications.find(x=>x.id===id);if(!n)return;const d=s.deviations.find(x=>x.id===n.deviationId),i=s.incidents.find(x=>x.id===n.incidentId);showDialog(`<div class="eyebrow">SUPERVISÃO · EVENTO SIMULADO</div><h2>${esc(n.label)}</h2>${tag(n.seenAt?'Analisada':n.justification?'Justificativa recebida':'Pendente',n.seenAt?'green':n.justification?'neutral':'orange')}<div style="margin:17px 0">${[['Responsável',s.name],['Rota',s.route.name],['Horário',fmt(n.at)],['Ponto',d?.pointName??i?.pointName??'Não identificado'],['Posição ilustrativa',d?`${d.position.lat.toFixed(6)}, ${d.position.lng.toFixed(6)}`:'Não informada']].map(([a,b])=>`<div class="detail-pair"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div>${d?`<div class="section-note alert">${ic('alert')}<span>Desvio aproximado: ${d.distance} m do corredor de rota de demonstração. Área de validação por ponto: ${RADIUS_METERS} m.</span></div><div class="guide-pan" style="margin-top:13px"><h3>Justificativa do ronda</h3><p>${esc(d.justification||'Aguardando explicação.')}</p></div><div class="detail-pair"><span>Retorno ao ponto</span><strong>${d.returnedAt?fmt(d.returnedAt):'Pendente'}</strong></div>`:`<div class="guide-pan"><h3>Descrição da ocorrência</h3><p>${esc(i?.description)}</p></div>`}<div class="section-note">${ic('help')}<span>É um evento fictício registrado apenas nesta demonstração. Não foi encaminhado externamente.</span></div>${n.seenAt?btn('Fechar','close-dialog','primary full'):btn('Marcar como analisada','acknowledge','primary full',`data-id="${esc(n.id)}" data-session="${esc(s.id)}"`)}`,true)}
function detailSession(id){const s=sessions.find(x=>x.id===id);if(!s)return;showDialog(`<div class="eyebrow">DETALHES DE UMA RONDA</div><h2>${esc(s.route.name)}</h2>${tag(s.status==='completed'?'Concluída':'Em andamento',s.status==='completed'?'green':'orange')}<div style="margin:17px 0">${[['Colaborador',s.name],['Início',fmt(s.startedAt)],['Conclusão',fmt(s.finishedAt)],['Pontos',`${s.index} de ${s.route.points.length}`],['Desvios',s.deviations.length],['Ocorrências',s.incidents.length],['Verificações ilustrativas',Object.values(s.evidences??{}).filter(x=>x.confirmedAt).length]].map(([a,b])=>`<div class="detail-pair"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div><h3>Histórico de eventos</h3><div class="timeline" style="margin-top:13px">${s.timeline.map(x=>`<div class="timeline-entry"><strong>${esc(x.label)}</strong><small>${fmt(x.at)}</small></div>`).join('')}</div>${btn('Fechar','close-dialog','primary full')}`,true)}
function pointDialog(index){const route=session?.route??DEMO_ROUTE,p=route.points[index];if(!p)return;const completed=session?.checkpoints[index]?.completedAt;showDialog(`<div class="eyebrow">PONTO ${index+1} · ROTA DEMONSTRATIVA</div><h2>${esc(p.name)}</h2><p>${esc(p.instruction)}</p>${tag(completed?'Concluído':session?.index===index?'Ponto atual':'Pendente',completed?'green':'neutral')}<div style="margin-top:16px">${[['Raio','25 metros'],['Permanência','30 segundos contínuos'],['Sequência',`${index+1} de ${route.points.length}`],['Localização', 'Ilustrativa no modo simulado']].map(([a,b])=>`<div class="detail-pair"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div>${btn('Entendi','close-dialog','primary full')}`)}
function finishDialog(){showDialog(`<div class="eyebrow">CONFIRMAR CONCLUSÃO</div><h2>Finalizar esta ronda?</h2><p style="font-size:12px">Os quatro pontos já foram concluídos e o retorno à base foi identificado. O registro ficará salvo neste navegador.</p><div class="modal-actions">${btn('Cancelar','close-dialog')}${btn('Finalizar ronda','confirm-finish','primary')}</div>`)}
async function startSession(){if(!locationGate.isGranted()){locationGate.open({demo:presentation});notify('Ative a localização antes de iniciar a ronda.');return;}const now=Date.now();if(mode==='real'&&!presentation){
 if(!navigator.geolocation){notify('Geolocalização indisponível neste navegador.');return;}
 try{const loc=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
  const f={lat:loc.coords.latitude,lng:loc.coords.longitude,accuracy:loc.coords.accuracy,at:now};
  if(f.accuracy>25){notify(`Sinal com precisão de ${Math.round(f.accuracy)} m. Tente em uma área com melhor recepção.`);return;}
  const route=offsetRouteNear(f.lat,f.lng);route.rules={dwellMs:operationalSettings.dwellSeconds*1000,
  blockOnDeviation:operationalSettings.deviationJustification,logDeviations:true,verificationMode:operationalSettings.verificationMode};
 session=createSession(user?.name??presentationName,route,now,'real');session.requiresManualCheckin=true;session.evidenceEnabled=operationalSettings.evidenceEnabled;locationFix=f;
  try{window.AndroidTracking?.startTracking()}catch{notify('Não foi possível iniciar o serviço nativo. GPS seguirá somente com app aberto.');}
  deviceWatch=navigator.geolocation.watchPosition(pos=>{
   const f={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:Date.now()};
   locationFix=f;
   if(session?.gpsLossNotified){
    session.gpsLossNotified=false;
    session.timeline.unshift({id:'gps-restored-'+Date.now(),kind:'gps-restored',at:Date.now(),label:'Sinal de localização retomado'});
    save();
   }
   processPosition();
  },err=>{
   contextWarning='Sinal GPS indisponível. A validação da ronda fica suspensa até recuperar localização confiável.';
   if(session?.status==='active'&&!session.gpsLossNotified){
    session.gpsLossNotified=true;
    const at=Date.now();
    session.notifications.unshift({id:'gps-lost-'+at,kind:'gps-lost',at,seenAt:null,sessionId:session.id,
     label:'Localização indisponível: ronda aguardando GPS'});
    session.timeline.unshift({id:'gps-unavailable-'+at,kind:'gps-unavailable',at,label:'GPS indisponível durante a ronda'});
    save();
   }
   void ops.recordGpsIssue('GPS indisponível durante ronda real',locationFix,{immediate:true});
   notify(contextWarning);
  },{enableHighAccuracy:true,maximumAge:2000,timeout:15000});
 }catch{notify('Permita o uso do GPS ou volte à simulação.');return;}
 }else{const planned=programs.find(p=>p.id===selectedProgramId&&p.status==='scheduled')??nextProgram(programs,selectedWatcherId,sessions,now);const route=planned?routeForProgram(planned):routeForWatcher(selectedWatcherId);
 route.rules={dwellMs:operationalSettings.dwellSeconds*1000,
  blockOnDeviation:operationalSettings.deviationJustification,logDeviations:true,verificationMode:operationalSettings.verificationMode,
  ...(planned?.customRoute?.rules||{})};
 session=createSession(user?.name??presentationName,route,now,'simulation');session.requiresManualCheckin=true;session.fastDemoClock=true;session.evidenceEnabled=operationalSettings.evidenceEnabled;if(planned){session.programId=planned.id;session.watcherId=planned.watcherId;selectedProgramId=planned.id;}locationFix={...session.route.base,accuracy:5,at:now};}
 movement=null;contextWarning='';save();void ops.recordLifecycle('patrol_start',session);modal.close();render();window.scrollTo({top:0,behavior:'instant'});notify('Ronda iniciada. Siga as orientações do primeiro ponto.');
}
function stopLocation(){if(deviceWatch!=null&&navigator.geolocation){navigator.geolocation.clearWatch(deviceWatch);deviceWatch=null;}try{window.AndroidTracking?.stopTracking()}catch{}}
function travelTo(target,label,legIndex=null){if(!session||session.status!=='active'||movement||mode!=='simulation')return;const from=locationFix??session.route.base;const leg=legIndex===null?[]:routeLeg(session.route,legIndex);const via=leg.length>2&&distanceMeters(from,leg[0])<=25?leg.slice(1,-1):[];movement=travel(from,target,travelDuration(from,target,via),Date.now(),via);session.timeline.unshift({id:`move-${Date.now()}`,kind:'movement',at:Date.now(),label});save();render();notify(`${label} · posição simulada`)}
function startMove(kind){const p=currentCheckpoint(session);if(kind==='demo-arrive')travelTo(p??session.route.base,p?`Deslocamento até ${p.name}`:'Retorno à base iniciado',p?session.index:session.route.points.length);
 else if(kind==='demo-leave'){const place=p??session.route.base;travelTo({lat:place.lat+.00064,lng:place.lng+.00074},'Afastamento do corredor simulado');}
 else if(kind==='demo-skip'){const next=session?.route.points[session.index+1];if(next)travelTo(next,'Tentativa de pular ponto');}}
function processPosition(){if(!session||session.status!=='active'||screen==='landing')return;
 const now=Date.now(),priorDeviations=session.deviations.length,priorReturns=session.deviations.map(d=>d.returnedAt),priorValid=session.returnConfirmed;
 const result=updateLocation(session,locationFix,now);
 if(mode==='real'){
  void ops.recordFix(locationFix);
  if(result.reason==='gps-unreliable')void ops.recordGpsIssue('Precisão GPS insuficiente ou leitura desatualizada',locationFix);
  else ops.gpsQualityRecovered();
 }
 if(session.deviations.length>priorDeviations){patrolSheetCollapsed=true;save();render();window.scrollTo({top:0,behavior:'instant'});notify('Desvio detectado. Justificativa solicitada e aviso exibido na supervisão · simulação.');return;}
 if(priorReturns.some((r,i)=>!r&&session.deviations[i]?.returnedAt)){save();render();notify('Retorno registrado. A permanência de 30 segundos recomeçou.');return;}
 if(!priorValid&&session.returnConfirmed){save();render();notify('Retorno à base confirmado. Você pode concluir a ronda.');return;}
 for(const map of liveMaps)map?.update({session,position:locationFix??session.route.base});
 updateLive(result);
}
function updateLive(result){if(!session||session.status!=='active')return;
 if(user?.role==='ronda'&&view==='minha-ronda'&&session.checkpoints[session.index]?.checkedInAt)curtain.open();const p=currentCheckpoint(session),elapsed=p?Math.floor(session.checkpoints[session.index].dwellMs/1000):0,c=coach();
 for(const el of document.querySelectorAll('[data-live="seconds"]'))el.textContent=elapsed;
 for(const el of document.querySelectorAll('[data-live="ring"]'))el.style.setProperty('--deg',`${Math.min(360,elapsed/(requiredDwellMs(session)/1000)*360)}deg`);
 for(const el of document.querySelectorAll('[data-live="coords"]'))el.textContent=locationFix?`${locationFix.lat.toFixed(5)}, ${locationFix.lng.toFixed(5)} · precisão ${Math.round(locationFix.accuracy??5)} m`:'Sem leitura válida';
 for(const el of document.querySelectorAll('[data-live="status"]'))el.innerHTML=result?.reason==='gps-unreliable'?`${ic('crosshair')} Aguardando posição GPS confiável. O tempo foi reiniciado.`:hasBlock(session)?`${ic('alert')} Avanço bloqueado. Justifique e retorne ao ponto.`:session.insideSince!==null?elapsed>=requiredDwellMs(session)/1000?`${ic('checkcircle')} Tempo cumprido. Confirme a conclusão do ponto.`:`${ic('clock')} Permaneça no raio por mais ${Math.max(0,Math.round(requiredDwellMs(session)/1000)-elapsed)} segundos.`:`${ic('pin')} Vá ao ponto ${session.index+1}: ${esc(p?.name??'base')}.`;
 for(const el of document.querySelectorAll('[data-live="req-time"]'))el.classList.toggle('ok',elapsed>=requiredDwellMs(session)/1000);
 for(const el of document.querySelectorAll('[data-live="req-radius"]'))el.classList.toggle('ok',session.insideSince!==null);
 for(const el of document.querySelectorAll('[data-live="clock-state"]'))el.textContent=canCompletePoint(session)?'Tempo concluído':session.insideSince!==null?'Dentro de 25 m · presença confirmada':'Aguardando Estou Aqui';
 for(const el of document.querySelectorAll('.patrol-map-clock'))el.classList.toggle('clock-done',canCompletePoint(session));
 for(const el of document.querySelectorAll('[data-action="complete-point"]')){
  const seconds=Math.round(requiredDwellMs(session)/1000);
  el.disabled=!canCompletePoint(session);
  el.textContent=canCompletePoint(session)?'Tempo concluído · Confirmar ponto e seguir':session.insideSince!==null?'Aguarde '+Math.max(0,seconds-elapsed)+' s no local':'Aguardando chegada ao ponto';
 }
 for(const el of document.querySelectorAll('[data-action="finish"]'))el.disabled=!session.returnConfirmed||hasBlock(session);
 const replacements={'guide-title':c.title,'guide-desc':c.detail,'coach-title':c.title,'coach-detail':c.detail,'sup-point':p?`${session.index+1} de ${session.route.points.length}`:'Retorno','sup-dwell':p?`${elapsed} / ${Math.round(requiredDwellMs(session)/1000)} s`:'Pontos concluídos','sup-status':hasBlock(session)?'Bloqueado':movement?'Em trânsito':session.insideSince!==null?'No ponto':'Em percurso'};
 for(const [key,value]of Object.entries(replacements))for(const el of document.querySelectorAll(`[data-live="${key}"]`))el.textContent=value;
 for(const el of document.querySelectorAll('[data-live="guide-benefit"]'))el.innerHTML=`<b>O que isso demonstra:</b> ${esc(c.benefit)}`;
}
function syncNativeHistory(){
 if(!window.AndroidTracking||!session||mode!=='real'||session.status!=='active')return;
 try{
  const last=session.lastNativeSyncAt??session.startedAt;
  const rows=JSON.parse(window.AndroidTracking.getLocationsSince(last)||'[]');
  if(!Array.isArray(rows)||!rows.length)return;
  for(const row of rows){const at=Number(row.at),lat=Number(row.lat),lng=Number(row.lng),accuracy=Number(row.accuracy);
   if(!Number.isFinite(at)||at<=last||!Number.isFinite(lat)||!Number.isFinite(lng))continue;
   const sample={lat,lng,accuracy,at};updateLocation(session,sample,at);
   session.lastNativeSyncAt=at;locationFix=sample;
  }
  void ops.recordNativeFixes(rows,session.id).catch(console.warn);
  save();render();notify('Posições registradas no Android foram recuperadas para a ronda.');
 }catch(err){console.warn('Histórico nativo indisponível',err)}
}
function realtimeTick(){if(!session||session.status!=='active'||document.hidden)return;
 if(mode==='simulation'){if(movement){const f=interpolated(movement);locationFix={lat:f.lat,lng:f.lng,accuracy:5,at:Date.now()};if(f.finished){movement=null;save();render();}}else if(locationFix)locationFix.at=Date.now();}
 processPosition();}
setInterval(realtimeTick,180);
setInterval(()=>{if(session?.status==='active')save()},10000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.status==='active'){if(!window.AndroidTracking){session.insideSince=null;const p=currentCheckpoint(session);if(p)session.checkpoints[session.index].dwellMs=0;}movement=null;save();}else if(screen!=='landing'&&session?.status==='active'){syncNativeHistory();render()}});
window.addEventListener('focus',()=>{if(window.AndroidTracking&&session?.status==='active'&&mode==='real')syncNativeHistory()});
async function handleAction(event){const el=event.target.closest('[data-action],[data-view],[data-v4-watcher]');if(!el||el.disabled)return;if(el.tagName==='A')event.preventDefault();
 const nav=el.dataset.view;if(nav){if(!user||!allNav[user.role].find(x=>x[0]===nav))return;view=nav;render();window.scrollTo({top:0,behavior:'instant'});return;}
 const act=el.dataset.action;
 if(act==='demo-coi-tab'){if(['rondas','vistorias'].includes(el.dataset.tab)){demoCoiTab=el.dataset.tab;render();}return;}
 if(act==='close-dialog'){if(modal.dataset.mandatoryNotice==='true')return;modal.close();return;}
 if(act==='accept-location-notice'){if(!modal.querySelector('#location-intro-check')?.checked)return;try{saveConsent()}catch{notify('Não foi possível registrar a ciência neste navegador.');return;}modal.dataset.mandatoryNotice='false';modal.close();notify('Orientações registradas. O GPS será solicitado apenas ao iniciar uma ronda real.');return;}
 if(act==='decline-location-notice'){modal.dataset.mandatoryNotice='false';modal.close();notify('Você pode explorar a simulação sem conceder localização.');return;}
 if(act==='tracking-info'){trackingIntroduction();return;}
 if(act==='tour-restart'){modal.close?.();tour.open();return;}
 if(act==='feature-help'){featureHelp(el.dataset.topic);return;}
 if(act==='no-op'){notify('Você está na tela de ronda.');return;}
 if(act==='presentation-intro'){beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');return;}
 if(act==='guide'){showGuide(false);return;}
 if(act==='guide-stage'){const input=modal.querySelector('#presentation-name');if(input?.value?.trim())presentationName=input.value.trim().slice(0,60);showGuide(modal.dataset.guideLaunch==='true',Number(el.dataset.stage));return;}
 if(act==='guide-back'||act==='guide-forward'){const input=modal.querySelector('#presentation-name');if(input?.value?.trim())presentationName=input.value.trim().slice(0,60);showGuide(modal.dataset.guideLaunch==='true',Math.max(0,Math.min(lessonNames.length-1,guideStage+(act==='guide-forward'?1:-1))));return;}
 if(act==='launch-presentation'){
  const name=modal.querySelector('#presentation-name')?.value?.trim()||presentationName;
  if(name.length<2){notify('Informe um nome com pelo menos duas letras.');return;}
  beginSimulation(name,false,'ronda');return;
 }
 if(act==='end-presentation'){locationGate.reset();beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');return;}
 if(act==='launch-scenario'){
  beginSimulation('Administrador',true,'admin');
  notify('Cenário ativo. Alterne para Ronda para mover o marcador e gerar eventos.');return;
 }
 if(act==='open-incidents'){if(user?.role==='ronda')return;view='ocorrencias';render();return;}
 if(act==='nav-alerts'){if(user?.role==='ronda')return;view='notificacoes';render();return;}
 if(act==='point-evidence'){evidenceDialog();return;}
 if(act==='demo-capture'){if(!session||!simulateCapture(session,session.index,el.dataset.direction)){notify('Etapa indisponível.');return;}save();evidenceDialog();return;}
 if(act==='demo-rotation'){if(!session||!simulateRotation(session,session.index)){notify('Etapa indisponível.');return;}save();evidenceDialog();return;}
 if(act==='demo-evidence-confirm'){if(!session||!confirmDemoEvidence(session,session.index)){notify('Complete quatro etapas e giro.');return;}save();modal.close();notify('Exemplo registrado sem câmera e sem sensor.');return;}
 if(act==='sim-role-picker'){
  if(!presentation)return;
  const roles=[['ronda','Vigia','compass'],['operador','COI · Acompanhamento','headset'],['cliente','Cliente','eye'],['vistoriador','Vistoriador','clipboard'],['admin','Administração','settings']];
  showDialog(`<div class="eyebrow">ÁREAS DO RONDAS PRO · DEMONSTRAÇÃO</div><h2>Escolher área</h2><div class="role-picker-list">${roles.map(([role,label,ico])=>`<button type="button" data-action="sim-role" data-role="${role}" class="${user?.role===role||(user?.role==='coi'&&role==='operador')?'selected':''}" aria-pressed="${user?.role===role||(user?.role==='coi'&&role==='operador')}">${ic(ico)}<strong>${label}</strong>${user?.role===role||(user?.role==='coi'&&role==='operador')?'<span>Atual</span>':''}</button>`).join('')}</div><p class="map-caption">A troca de perfil demonstra as áreas no mesmo navegador; não representa autenticação.</p><a class="button full" href="/central.html">Entrar na operação real ↗</a>`);
  modal.classList.add('role-picker-dialog');
  return;
 }
if(act==='sim-role'){
  if(!presentation||!['ronda','operador','coi','cliente','vistoriador','admin'].includes(el.dataset.role))return;
  const name=el.dataset.role==='ronda'?(watcherById(selectedWatcherId)?.name??'Lucas Ferreira'):el.dataset.role==='operador'?'Operador COI · Monitoramento':el.dataset.role==='coi'?'Operador COI':el.dataset.role==='cliente'?'Cliente de exemplo':el.dataset.role==='vistoriador'?'Vistoriador de exemplo':'Administrador';
  user={name,role:el.dataset.role};
  view=user.role==='ronda'?'minha-ronda':user.role==='cliente'?'cliente':user.role==='vistoriador'?'vistoriador':'overview';
  render();notifyRoleView(user.role);window.scrollTo({top:0,behavior:'instant'});return;
 }
if(act==='schedule-tab'){if(!['agenda','mapa'].includes(el.dataset.tab))return;scheduleTab=el.dataset.tab;render();return;}
 if(act==='schedule-prev'||act==='schedule-next'){
  const active=filterPrograms(programs,{status:scheduleFilter,watcherId:scheduleWatcher,unit:scheduleUnit,query:scheduleQuery,sessions});
  const info=pagePrograms(active,schedulePage,schedulePageSize());
  schedulePage=Math.max(0,Math.min(info.pages-1,info.page+(act==='schedule-next'?1:-1)));
  render();return;
 }
 if(act==='nav-reports'){if(user?.role!=='admin')return;view='relatorios';render();return;}
 if(act==='nav-alerts'){if(user?.role!=='admin')return;view='notificacoes';render();return;}
 if(el.hasAttribute('data-v4-watcher')){
  if(user?.role!=='admin')return;
  const watcher=watcherById(el.dataset.v4Watcher);
  if(!watcher)return;
  selectedSupervisedWatcherId=watcher.id;
  uxDashboardPane[user.role]='mapa';render();return;
 }
 if(act==='open-mobile-menu'){
  const options=allNav[user?.role]??[];
  showDialog('<div class="ux-access-menu"><div class="eyebrow">NAVEGAÇÃO</div><h2>Escolha a área</h2>'+
    options.map(([key,label,ico])=>'<button type="button" data-view="'+esc(key)+'">'+ic(ico)+' '+esc(label)+'</button>').join('')+
    '<button type="button" data-action="guide">Guia completo</button><button type="button" data-action="tour-restart">Rever tutorial</button></div>');
  return;
 }
 if(act==='program-round'){if(user?.role!=='admin')return;programRoundDialog();return;}
 if(act==='schedule-show-filters'){const ref=document.querySelector('.schedule-refine');scheduleFiltersOpen=!scheduleFiltersOpen;if(ref){ref.classList.toggle('ux-filters-open',scheduleFiltersOpen);el.setAttribute('aria-expanded',String(scheduleFiltersOpen));}return;}
 if(act==='watcher-chooser'){if(user?.role==='ronda')watcherChooser();return;}
 if(act==='choose-watcher'){
  if(user?.role!=='ronda'||session?.status==='active'){notify('Finalize a ronda ativa antes de trocar de vigia.');return;}
  const w=watcherById(el.dataset.id);if(!w)return;
  selectedWatcherId=w.id;selectedProgramId=null;session=null;user.name=w.name;presentationName=w.name;
  persist();modal.close();render();return;
 }
 if(act==='select-program'){
  const p=programs.find(p=>p.id===el.dataset.id&&p.watcherId===selectedWatcherId&&p.status!=='cancelled');
  if(!p||session?.status==='active'){notify('Finalize a ronda em andamento antes de mudar de programação.');return;}
  selectedProgramId=p.id;session=null;persist();render();return;
 }
 if(act==='program-edit'){
  if(user?.role!=='admin')return;
  const program=programs.find(p=>p.id===el.dataset.id);
  if(!program||sessions.some(s=>s.programId===program.id))return;
  editProgramDialog(program);return;
 }
 if(act==='program-edit-confirm'){
  if(user?.role!=='admin'||!pendingEdit)return;
  if(sessions.some(s=>s.programId===pendingEdit.id)){pendingEdit=null;notify('Esta ronda já foi iniciada e não pode ser reprogramada.');return;}
  const result=rescheduleProgram(programs,pendingEdit.id,pendingEdit.changes,Date.now());
  if(!result.ok){notify(result.error);return;}
  programs=result.items;pendingEdit=null;persist();render();notify('Ronda reprogramada neste navegador, com histórico da alteração.');return;
 }
 if(act==='program-detail'){
  const p=programs.find(p=>p.id===el.dataset.id);if(!p)return;
  const w=watcherById(p.watcherId),route=routeById(p.routeId);
  showDialog(`<div class="eyebrow">RONDA PROGRAMADA</div><h2>${esc(route?.name??'Rota')}</h2><div class="detail-pair"><span>Vigia</span><strong>${esc(w?.name??'')}</strong></div><div class="detail-pair"><span>Unidade</span><strong>${esc(w?.unit??'')}</strong></div><div class="detail-pair"><span>Início previsto</span><strong>${esc(formatShortDate(p.startAt))}</strong></div><div class="detail-pair"><span>Situação</span><strong>${esc(scheduleStatus(p,sessions))}</strong></div><p>${esc(p.notes||'Sem observações.')}</p>${btn('Fechar','close-dialog','primary full')}`);return;
 }
 if(act==='program-cancel'){
  if(user?.role!=='admin')return;
  const p=programs.find(p=>p.id===el.dataset.id);if(!p||sessions.some(s=>s.programId===p.id))return;
  showDialog(`<h2>Cancelar programação?</h2><p>A ronda de ${esc(watcherById(p.watcherId)?.name||'vigia')} prevista para ${esc(formatShortDate(p.startAt))} será marcada como cancelada.</p><div class="modal-actions">${btn('Manter ronda','close-dialog')}${btn('Confirmar cancelamento','program-cancel-confirm','danger',`data-id="${esc(p.id)}"`)}</div>`);return;
 }
 if(act==='program-cancel-confirm'){
  if(user?.role!=='admin')return;
  const p=programs.find(p=>p.id===el.dataset.id);if(!p||sessions.some(s=>s.programId===p.id))return;
  programs=cancelProgram(programs,p.id);persist();render();notify('Programação cancelada neste navegador.');return;
 }
 if(act==='program-confirm'){
  if(user?.role!=='admin'||!pendingProgram)return;
  const result=createPrograms(pendingProgram,programs,Date.now());
  if(!result.ok){notify(result.error);programRoundDialog();return;}
  programs=[...programs,...result.items];pendingProgram=null;persist();render();
  notify(result.items.length+' ronda(s) programada(s) neste navegador.');return;
 }
if(act==='profile-menu'){profileDialog();return;}
 if(act==='login'){beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');return;}
 if(act==='logout'&&presentation){tour.close();locationGate.reset();beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');return;}
 if(act==='logout'){stopLocation();locationGate.reset();beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');return;}
 if(act==='privacy'){privacy();return;}
 if(act==='start'){if(!locationGate.isGranted()){locationGate.open({demo:presentation});return;}startDialog();return;}
 if(act==='confirm-start'){if(mode==='real'&&!presentation&&!getConsent()){trackingIntroduction();return;}await startSession();return;}
 if(act==='mode-real'||act==='mode-simulation'){if(presentation&&act==='mode-real'){notify('Neste cenário você não precisa ativar GPS.');return;}if(session?.status==='active')return;mode=act==='mode-real'?'real':'simulation';render();return;}
 if(act==='checkin-now'){
  if(!session||session.status!=='active'||movement)return;
  const confirm=fix=>{
   const result=checkInAtPoint(session,fix,Date.now());
   if(!result.ok){notify(result.reason);return;}
   save();render();curtain.open();
   try{navigator.vibrate?.(14)}catch{}
   notify('Estou Aqui confirmado. Cronômetro iniciado.');
  };
  if(mode==='simulation'){confirm({...locationFix,at:Date.now(),accuracy:5});return;}
  if(!navigator.geolocation){notify('GPS indisponível neste dispositivo.');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
   locationFix={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:pos.timestamp||Date.now()};
   confirm(locationFix);
  },()=>notify('Não foi possível confirmar a posição. Verifique a permissão e o sinal GPS.'),
   {enableHighAccuracy:true,timeout:15000,maximumAge:0});
  return;
 }
 if(act==='show-checkpoint'){curtain.open();return;}
 if(act==='demo-arrive'||act==='demo-leave'||act==='demo-skip'){startMove(act);return;}
 if(act==='justify'){justificationDialog();return;}
 if(act==='incident-form'){incidentDialog();return;}
 if(act==='complete-point'){if(!session)return;curtain.open();return;}
 if(act==='finish'){if(!session)return;finishDialog();return;}
 if(act==='confirm-finish'){if(finishSession(session)){void ops.recordLifecycle('patrol_end',session);stopLocation();movement=null;save();render();notify('Ronda finalizada, registro salvo neste navegador.')}else notify('Conclua os pontos e retorne à base.');return;}
 if(act==='new-session'){session=null;movement=null;locationFix=null;render();return;}
 if(act==='point-details'){pointDialog(Number(el.dataset.index));return;}
 if(act==='notification-detail'){if(user?.role!=='admin')return;notificationDialog(el.dataset.id,el.dataset.session);return;}
 if(act==='acknowledge'){if(user?.role!=='admin')return;const s=sessions.find(x=>x.id===el.dataset.session);if(s&&acknowledge(s,el.dataset.id)){persist();modal.close();render();notify('Análise registrada no cenário demonstrativo.')}return;}
 if(act==='incident-detail'){
  if(user?.role!=='admin')return;
  const s=sessions.find(x=>x.id===el.dataset.session),incident=s?.incidents.find(x=>x.id===el.dataset.id);
  if(incident)incidentReviewDialog(s,incident);
  return;
 }
 if(act==='incident-review'){
  if(user?.role!=='admin')return;
  const form=modal.querySelector('#incident-review-form');if(!form)return;
  const s=sessions.find(x=>x.id===form.dataset.session),incident=s?.incidents.find(x=>x.id===form.dataset.id);
  if(!incident)return;
  const status=form.querySelector('[name=status]')?.value;
  if(!['Aberta','Em análise','Resolvida'].includes(status)){notify('Escolha uma situação válida.');return;}
  const assignee=String(form.querySelector('[name=assignee]')?.value??'').trim().slice(0,60);
  const note=String(form.querySelector('[name=note]')?.value??'').trim().slice(0,450);
  if(status==='Resolvida'&&note.length<10){notify('Descreva a providência adotada antes de resolver.');return;}
  if(incident.status!==status||incident.assignee!==assignee||note){
   incident.status=status;incident.assignee=assignee;incident.reviewedAt=Date.now();
   incident.history??=[];incident.history.push({at:incident.reviewedAt,status,assignee,note,actor:user.name,mode:'local-demo'});
   s.timeline.unshift({id:'incident-'+incident.reviewedAt,kind:'incident-review',at:incident.reviewedAt,label:'Ocorrência atualizada na supervisão demonstrativa: '+status,incidentId:incident.id});
   persist();
  }
  modal.close();render();notify('Tratamento de ocorrência salvo neste navegador.');return;
 }
 if(act==='session-detail'){if(user?.role!=='admin')return;detailSession(el.dataset.id);return;}
 if(act==='nav-rondas'){if(user?.role!=='admin')return;view='rondas';render();return;}
 if(act==='my-records'||act==='records'){if(user?.role!=='admin')return;view='relatorios';render();return;}
 if(act==='map-help'){showDialog(`<div class="eyebrow">COMO LER O MAPA</div><h2>Localização e pontos de ronda</h2><div class="map-help-list"><p><strong>Mapa de ruas:</strong> base cartográfica OpenStreetMap, com alternativa esquemática se ficar offline.</p><p><strong>Linha tracejada:</strong> ligação ilustrativa entre pontos. Não é uma rota calculada pelas ruas.</p><p><strong>Linha contínua ciano:</strong> posições observadas enquanto a tela está ativa na simulação.</p><p><strong>Círculo ao redor do ponto:</strong> área de validação de 25 m. É necessário permanecer 30 s seguidos, com localização confiável.</p><p><strong>Marcador vermelho:</strong> ponto de evento de desvio registrado para análise. GPS impreciso, por si só, não implica irregularidade.</p></div>${btn('Entendi','close-dialog','primary full')}`);return;}
 if(act==='open-operational-setting'){
  if(user?.role!=='admin')return;
  const key=el.dataset.setting;
  const specs={
   dwellSeconds:['Tempo de permanência','Defina o tempo necessário para validar cada ponto.','Permanência por ponto'],
   deviationJustification:['Justificativa de desvio','Exigir uma explicação antes de liberar o avanço após um desvio.','Exigir justificativa'],
   evidenceEnabled:['Verificação ilustrativa','Mostrar as etapas ilustrativas de evidência durante a simulação.','Habilitar verificação']
  };
  const info=specs[key];if(!info)return;
  const field=key==='dwellSeconds'
   ?'<label for="hx05-settings-value">Segundos (5–120)</label><input id="hx05-settings-value" name="value" type="number" min="5" max="120" step="1" required value="'+operationalSettings.dwellSeconds+'">'
   :'<label class="hx05-checkbox-row"><input type="checkbox" name="value" '+(operationalSettings[key]?'checked':'')+'><span>'+esc(info[2])+'</span></label>';
  showDialog('<form id="hx05-settings-form" class="hx05-settings-modal" data-setting="'+key+'">'+
   '<span class="eyebrow">CONFIGURAÇÃO · GERÊNCIA</span><h2>'+esc(info[0])+'</h2>'+
   '<p>'+esc(info[1])+'</p>'+field+
   '<div class="hx05-modal-footer"><button type="button" class="button small" data-action="close-dialog">Fechar</button>'+
   '<button type="submit" class="button primary small">Salvar</button></div></form>');
  return;
 }
 if(act==='open-route-point'){
  const idx=Number(el.dataset.index),context=supervisedContext(),point=context.route.points[idx];
  if(!Number.isInteger(idx)||!point)return;
  const state=context.current?.checkpoints[idx]?.completedAt?'Verificado':context.current?.status==='active'&&context.current.index===idx?'Em execução':'Programado';
  showDialog('<div class="hx05-point-detail"><span class="eyebrow">RONDA · PONTO '+(idx+1)+'</span>'+
   '<h2>'+esc(point.name)+'</h2><p class="hx05-point-meta">'+esc(state)+' · Raio '+(Number(point.radius)||25)+' m</p>'+
   '<p>'+esc(point.instruction||'Realizar a verificação prevista para este ponto.')+'</p>'+
   '<div class="hx05-modal-footer"><button type="button" class="button small" data-action="close-dialog">Fechar</button>'+
   '<button type="button" class="button primary small" data-action="focus-route-point" data-index="'+idx+'">'+ic('map')+' Ver no mapa</button></div></div>',true);
  return;
 }
 if(act==='focus-route-point'){
  const idx=Number(el.dataset.index);
  if(!Number.isInteger(idx)||idx<0||idx>=supervisedContext().route.points.length)return;
  // A aba correta precisa aparecer ANTES de enquadrar ou abrir o marcador.
  if(modal.open)modal.close();
  if(view==='rondas'&&scheduleTab!=='mapa')scheduleTab='mapa';
  uxRondaPane='mapa';
  if(view!=='rondas')view='rondas';
  render();
  requestAnimationFrame(()=>{
   const currentMap=liveMaps.find(m=>m.container?.id==='ops-map');
   if(!currentMap?.focusPoint(idx))notify('O mapa está indisponível. Tente novamente com conexão.');
  });
  return;
 }
 if(act==='filter-alerts'){const filter=el.dataset.filter;if(filter!=='pending'&&filter!=='all')return;alertFilter=filter;render();return;}
 if(act==='toggle-patrol-sheet'){
  if(window.innerWidth<=900){
   const tools=document.querySelector('.patrol-extra-flow');
   if(tools){openUX06Overlay(tools,'Ferramentas e instruções da ronda');return;}
  }
  patrolSheetCollapsed=!patrolSheetCollapsed;render();return;
 }
 if(act==='center-maps'){liveMaps.forEach(m=>m.fit());return;}
 if(act==='print'){window.print();return;}
 if(act==='clear-prompt'){showDialog(`<h2>Apagar os dados deste navegador?</h2><p>As rondas, justificativas, ocorrências e notificações locais da demonstração serão apagadas.</p><div class="modal-actions">${btn('Cancelar','close-dialog')}${btn('Apagar dados','confirm-clear','danger')}</div>`);return;}
 if(act==='confirm-clear'){clearState();sessions=[];programs=demoSchedule();selectedWatcherId='v01';selectedProgramId=null;session=null;stopLocation();movement=null;locationFix=null;render();notify('Dados locais apagados.');return;}
}
document.addEventListener('click',e=>{handleAction(e).catch(err=>{console.error(err);notify('Não foi possível concluir. Tente novamente.');})});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-demo-client]')){selectedDemoClientIndex=Math.max(0,Math.min(DEMO_CLIENTS.length-1,Number(e.target.value)||0));render();return;}
 if(e.target.matches('[data-supervisor-watcher]')){const choice=watcherById(e.target.value);if(!choice)return;selectedSupervisedWatcherId=choice.id;render();return;}
  if(e.target.matches('[data-schedule-filter]')){scheduleFilter=e.target.value;schedulePage=0;render();}
 if(e.target.matches('[data-schedule-unit]')){scheduleUnit=e.target.value;scheduleWatcher='all';schedulePage=0;render();}
 if(e.target.matches('[data-schedule-watcher]')){scheduleWatcher=e.target.value;schedulePage=0;render();}
 if(e.target.matches('[data-schedule-query]')){scheduleQuery=e.target.value.trim().slice(0,80);schedulePage=0;render();}
 if(e.target.matches('#program-form [name="watcherId"], #program-edit-form [name="watcherId"]')){
  const chosen=watcherById(e.target.value),route=modal.querySelector('#program-form [name="routeId"], #program-edit-form [name="routeId"]');
  const matching=DEMO_ROUTES.find(r=>r.unit===chosen?.unit);if(route&&matching)route.value=matching.id;
  for(const opt of route?.options??[])opt.disabled=!!chosen&&routeById(opt.value)?.unit!==chosen.unit;
 }
});
modal.addEventListener('change',e=>{if(e.target.id==='declaration-check'){const el=modal.querySelector('[data-action="confirm-start"]');if(el)el.disabled=!e.target.checked}if(e.target.id==='location-intro-check'){const b=modal.querySelector('[data-action="accept-location-notice"]');if(b)b.disabled=!e.target.checked}});

document.addEventListener('submit',e=>{
 if(e.target.id==='demo-inspection-form'){
  e.preventDefault();
  if(user?.role!=='vistoriador')return;
  const f=new FormData(e.target),notes=String(f.get('notes')||'').trim();
  if(notes.length<8){notify('Descreva o que foi verificado.');return;}
  const score=['acessos','estrutura','equipamentos','sinalizacao'].filter(k=>f.has(k)).length*25;
  try{localStorage.setItem(DEMO_INSPECTIONS,JSON.stringify([{at:Date.now(),notes,score},...demoInspectionRecords()].slice(0,100)))}catch{notify('Não foi possível salvar a vistoria.');return;}
  render();notify('Vistoria registrada neste navegador.');return;
 }
 if(e.target.id!=='operational-settings')return;
 e.preventDefault();
 if(user?.role!=='admin')return;
 const fields=new FormData(e.target),seconds=Number(fields.get('dwellSeconds'));
 if(!Number.isInteger(seconds)||seconds<5||seconds>120){notify('Escolha de 5 a 120 segundos.');return;}
 operationalSettings={...operationalSettings,dwellSeconds:seconds,deviationJustification:fields.has('deviationJustification'),
  evidenceEnabled:fields.has('evidenceEnabled')};
 persist();render();notify('Regras salvas para as próximas rondas.');
});

modal.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);
 if(e.target.id==='hx05-settings-form'){
  if(user?.role!=='admin')return;
  const key=e.target.dataset.setting;
  if(!['dwellSeconds','deviationJustification','evidenceEnabled'].includes(key))return;
  const raw=key==='dwellSeconds'?Number(f.get('value')):f.has('value');
  if(key==='dwellSeconds'&&(!Number.isInteger(raw)||raw<5||raw>120)){
   notify('Escolha um tempo entre 5 e 120 segundos.');return;
  }
  operationalSettings={...operationalSettings,[key]:raw};
  persist();modal.close();render();
  notify('Configuração salva para as próximas rondas.');return;
 }


 if(e.target.id==='program-edit-form'){
  if(user?.role!=='admin')return;
  const id=e.target.dataset.id,changes={watcherId:String(f.get('watcherId')||''),routeId:String(f.get('routeId')||''),startAt:new Date(String(f.get('startAt')||'')).getTime(),endAt:new Date(String(f.get('endAt')||'')).getTime(),notes:String(f.get('notes')||'')};
  const result=rescheduleProgram(programs,id,changes,Date.now());
  if(!result.ok){const error=modal.querySelector('.program-error');if(error)error.textContent=result.error;return;}
  pendingEdit={id,changes};
  const watcher=watcherById(changes.watcherId),route=routeById(changes.routeId);
  showDialog(`<div class="eyebrow">CONFIRMAÇÃO</div><h2>Salvar nova programação?</h2><p><b>${esc(watcher?.name??'')}</b> · ${esc(route?.name??'')}</p><div class="detail-pair"><span>Início</span><strong>${esc(formatShortDate(changes.startAt))}</strong></div><div class="detail-pair"><span>Término</span><strong>${esc(formatShortDate(changes.endAt))}</strong></div><p>Os dados anteriores ficarão no histórico local desta programação.</p><div class="modal-actions">${btn('Voltar','close-dialog')}${btn('Confirmar alteração','program-edit-confirm','primary')}</div>`);
  return;
 }
 if(e.target.id==='program-form'){
  if(user?.role!=='admin')return;
  const candidate={watcherId:String(f.get('watcherId')||''),routeId:String(f.get('routeId')||''),
   startAt:new Date(String(f.get('startAt')||'')).getTime(),endAt:new Date(String(f.get('endAt')||'')).getTime(),
   repeat:String(f.get('repeat')||'once'),notes:String(f.get('notes')||'')};
  const result=createPrograms(candidate,programs,Date.now());
  if(!result.ok){const error=modal.querySelector('.program-error');if(error)error.textContent=result.error;return;}
  pendingProgram=candidate;
  const w=watcherById(candidate.watcherId),r=routeById(candidate.routeId);
  showDialog(`<div class="eyebrow">REVISAR AGENDAMENTO</div><h2>Confirmar programação</h2><p>Confira os dados antes de salvar.</p><div class="detail-pair"><span>Responsável</span><strong>${esc(w?.name)}</strong></div><div class="detail-pair"><span>Rota</span><strong>${esc(r?.name)}</strong></div><div class="detail-pair"><span>Início</span><strong>${esc(formatShortDate(candidate.startAt))}</strong></div><div class="detail-pair"><span>Término</span><strong>${esc(formatShortDate(candidate.endAt))}</strong></div><div class="detail-pair"><span>Repetições</span><strong>${result.items.length}</strong></div><div class="modal-actions">${btn('Voltar','program-round')}${btn('Confirmar e salvar','program-confirm','primary')}</div>`);
  return;
 }
 if(e.target.id==='justification-form'){if(!session)return;const d=latestDeviation();if(!justifyDeviation(session,d?.id,String(f.get('reason')||''))){notify('Informe ao menos 10 caracteres na justificativa.');return;}save();modal.close();render();notify('Justificativa recebida pela supervisão · simulação local.');return;}
 if(e.target.id==='incident-form'){if(!session)return;const i=registerIncident(session,{title:f.get('title'),description:f.get('description'),severity:f.get('severity')});if(!i){notify('Preencha título e descrição com detalhes suficientes.');return;}await ops.attachIncidentMedia(i,e.target);await ops.recordIncident(i);save();modal.close();render();notify('Ocorrência registrada e exibida na supervisão · simulação local.');return;}
});
window.addEventListener('online',()=>{if(screen!=='landing'&&!modal.open)notify('Conexão restabelecida. O mapa pode voltar a carregar.');});
window.addEventListener('offline',()=>notify('Sem internet: o esquema alternativo mantém a rota visível.'));
modal.addEventListener('cancel',e=>{if(modal.dataset.mandatoryNotice==='true')e.preventDefault()});
// Recuperação local: somente da ronda real ainda ativa; dados de demonstração não implicam login seguro.
if(persisted?.activeSessionId&&persisted.activeUser){
 const recovered=sessions.find(x=>x.id===persisted.activeSessionId&&x.status==='active'&&x.mode==='real');
 if(recovered){session=recovered;user={...persisted.activeUser,role:'ronda'};mode='real';screen='dashboard';view='minha-ronda';contextWarning='Verificando histórico de localização após retomar.';}
}
const ops=createOperationsUpgrade({
 get:()=>({user,view,session,sessions,programs,operationalSettings,mode,locationFix,
  selectedRoute:session?.route??routeForWatcher(selectedWatcherId)}),
 render,save,persist,notify,showDialog,incidentDialog,
 closeDialog:()=>modal.close(),
 showClient:()=>{notify('O acompanhamento do cliente está disponível para análise na Administração.');}
});
const curtain=createCheckpointCurtain({get:()=>({user,view,session,locationFix}),recordCheckpoint:(checkpoint,files,point)=>ops.recordCheckpoint(checkpoint,files,point),save,render,notify});
const torch=createFieldTorch({notify});
const locationGate=createLocationEntryGate({onGranted:fix=>{
 if(!presentation)locationFix=fix;
 const map=liveMaps.find(x=>x?.container?.id==='mobile-map');
 if(map?.instance){map.instance.flyTo([fix.lat,fix.lng],17,{animate:true,duration:.8});setTimeout(()=>map.fit(),1800)}
 notify('Localização autorizada. Confira sua posição no mapa e toque em Iniciar ronda.');
 // O guia permanece disponível após a autorização, sem encobrir a cortina de localização.
}});
beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');
if(window.AndroidTracking&&session?.status==='active')setTimeout(syncNativeHistory,300);
