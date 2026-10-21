import {decorateTheme} from './theme-shell.js';
import {createRoutePlanner} from './route-planner.js';
import {createDispatchWizard} from './dispatch-wizard.js';
import {createSettingsManager} from './settings-manager.js';
import {createSavedPointsManager} from './saved-points-admin.js';
import {routeCanStart} from './route-schedule.js';
import {DEMO_THREE,seedDemoThree,routeRequest} from './route-demo-mode.js';
import {liveRequest,liveSession,loginHtml} from './live-client.js';
import {isPagesTestMode,PAGES_TEST_ACCOUNTS} from './pages-test-api.js';
import {DWELL_MS,requiredDwellMs,RADIUS_METERS,DEMO_ROUTE,accurateFix,canCompletePoint,completePoint,createSession,currentCheckpoint,distanceMeters,finishSession,hasBlock,justifyDeviation,offsetRouteNear,routeLeg,progressPercent,registerIncident,acknowledge,updateLocation,checkInAtPoint} from './domain.js';
import {createInspectionRouteMap} from './inspection-route-map.js';
import {queueInspections,inspectionRoute,inspectionSignature,pointOf} from './inspection-queue.js';
import {inspectionCockpit,inspectionStops} from './inspection-cockpit.js';
import {emptyInspectionDraft,inspectionWizardHtml,updateInspectionDraft,inspectionProblems,inspectionPayload,stepCount} from './field-inspection-wizard.js';
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
 message:'<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 10h8M8 13h6"/>',
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
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
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
const operationalLink='';
const brand=()=>'<div class="brand maxvel-only-brand" aria-label="Grupo Maxvel"><span class="brand-product"><span class="ronda-pro-wordmark">Ronda <b>Pro</b></span></span><span class="brand-divider" aria-hidden="true"></span><span class="brand-partner"><span class="brand-group">GRUPO</span><img class="maxvel-real-logo" src="./assets/maxvel-logo.webp" width="585" height="183" alt="Maxvel"></span></div>';
const persisted=loadState();
let sessions=[];
let programs=[];
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
let liveUsers=[],liveRoutes=[],liveEvents=[],liveAssignments=[],syncTimer=null,selectedLiveRouteId='';
const routePlanner=createRoutePlanner({
 getData:()=>({users:liveUsers,routes:liveRoutes,role:user?.role,demo:isPagesTestMode()}),
 api:(path,options)=>routeRequest(path,options,liveRequest,user?.role),notify,
 afterSave:async reload=>{if(reload)await refreshLiveOperational();render();}
});
const dispatchWizard=createDispatchWizard({dialog:modal,showDialog,getWorkers:()=>liveUsers,request:liveRequest,refresh:refreshLiveOperational,redraw:render,notify});
const adminSettings=createSettingsManager({dialog:modal,showDialog,api:liveRequest,getUsers:()=>liveUsers,refresh:refreshLiveUsers,render,notify});
const savedPointsAdmin=createSavedPointsManager({dialog:modal,showDialog,api:liveRequest,notify});
const liveData=()=>({sessions,programs,selectedWatcherId,operationalSettings});
function persist(){
 saveState({...liveData(),activeSessionId:session?.status==='active'&&mode==='real'?session.id:null,activeUser:user});
 if(user?.id){clearTimeout(syncTimer);syncTimer=setTimeout(()=>liveRequest('/app-state',{method:'PUT',data:liveData()}).catch(()=>notify('Nao foi possivel sincronizar agora.')),700);}
}
async function refreshLiveUsers(){if(['admin','coi','operador'].includes(user?.role))liveUsers=(await liveRequest('/users')).users||[];}
async function refreshLiveOperational(){
 if(['admin','coi','operador','ronda'].includes(user?.role))liveRoutes=(await liveRequest('/routes').catch(()=>({routes:[]}))).routes||[];
 liveEvents=(await liveRequest('/events?limit=200').catch(()=>({events:[]}))).events||[];
 if(['admin','coi','vistoriador'].includes(user?.role))liveAssignments=(await liveRequest('/dispatches').catch(()=>({dispatches:[]}))).dispatches||[];
}
function runtimeRoute(raw){
 if(!raw?.points?.length)return null;
 const coords=raw.points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 if(coords.length<2)return null;
 return {id:raw.id,name:raw.name,unit:raw.site||'Grupo Maxvel',
  base:{id:'base',name:'Base da rota',lat:coords[0].lat,lng:coords[0].lng},
  points:coords.map((p,i)=>({id:'p'+(i+1),name:p.name,instruction:p.name,lat:p.lat,lng:p.lng,radius:RADIUS_METERS})),legs:[]};
}
const assignedRoute=()=>runtimeRoute(liveRoutes.find(r=>r.userId===user?.id));
const assignedSchedule=()=>liveRoutes.find(r=>r.userId===user?.id)?.schedule||null;
function scheduleDescription(schedule){
 if(!schedule)return '';
 const terms={once:'Uma vez',daily:'Todo dia',alternate:'Dia sim, dia não',weekly:'Dias específicos'};
 const suffix=schedule.recurrence==='once'||schedule.recurrence==='alternate'?schedule.startDate?' · a partir de '+new Date(schedule.startDate+'T12:00:00').toLocaleDateString('pt-BR'):'' : '';
 return (terms[schedule.recurrence]||'Agendamento')+' às '+(schedule.hour||'08:00')+suffix;
}
async function restoreLiveAccount(){
 const a=(await liveRequest('/me')).user;
 user={id:a.id,name:a.name,email:a.email,username:a.username||'',role:a.role==='master'?'admin':a.role};
 const saved=(await liveRequest('/app-state')).state;
 sessions=Array.isArray(saved?.sessions)?saved.sessions:[];
 programs=Array.isArray(saved?.programs)?saved.programs:[];
 selectedWatcherId=saved?.selectedWatcherId||selectedWatcherId;
 operationalSettings={...operationalSettings,...saved?.operationalSettings};
 screen='dashboard';presentation=false;mode=isPagesTestMode()?'simulation':'real';session=null;
 view=user.role==='ronda'?'minha-ronda':user.role==='vistoriador'?'vistoriador':'overview';
 await Promise.all([refreshLiveUsers(),refreshLiveOperational()]);
 if(['ronda','vistoriador'].includes(user.role)&&!isPagesTestMode())void liveRequest('/presence',{method:'POST',data:{position:null}}).catch(()=>{});
 render();
}
function liveLogout(){
 liveSession.token='';user=null;session=null;sessions=[];programs=[];liveUsers=[];screen='landing';presentation=false;mode='real';render();
}
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
function registerMap(id,route,sessionRef=null,position=null,compact=false,positionVerified=true,trace=[]){const el=document.getElementById(id);if(!el||!route)return;const map=new PatrolMap(el,{route,session:sessionRef,position,compact,interactive:true,standbyClean:id==='mobile-map',positionVerified,trace});liveMaps.push(map);return map;}


/** MAXVEL-06 · details in modal, fixed viewport and scroll only inside a bounded list. */
function openUX06Overlay(source,title){
 if(!source||!modal)return;
 const copy=source.cloneNode(true);
 copy.classList.add('ux06-dialog-copy');
 copy.removeAttribute('hidden');copy.removeAttribute('id');
 copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
 copy.querySelectorAll('[hidden]').forEach(el=>el.removeAttribute('hidden'));
 copy.querySelectorAll('.ux-row-pagination,.ux-report-tabs,.ux-ronda-tabs,.ux06-expand-button').forEach(el=>el.remove());
 showDialog('<section class="ux06-sheet" aria-label="'+esc(title)+'"><header class="ux06-sheet-header"><div><span class="eyebrow">RONDAS PRO · MAXVEL</span><h2>'+esc(title)+'</h2></div><button type="button" data-action="close-dialog" class="ux06-sheet-back">Voltar</button></header><div class="ux06-sheet-content"></div></section>',true);
 modal.classList.remove('ux06-fullscreen');
 modal.classList.add('ux06-compact');
 modal.querySelector('.dialog-close')?.remove();
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
   // Resumo mostra os painéis paralelos; outras abas mudam o conteúdo de fato.
   const multiple=wideDesktop.matches&&(user.role!=='admin'||selected==='resumo');
   shell.classList.toggle('v4-wide-workspace',multiple);
   shell.classList.toggle('v4-desktop-focus',wideDesktop.matches&&!multiple);
   shell.dataset.activePane=selected;
   for(const [id,node] of paneMap){
    node.hidden=!multiple&&id!==selected;
    node.id='v4-'+id;
    node.setAttribute('aria-hidden',String(node.hidden));
   }
   for(const bt of tabs){
    const active=bt.dataset.v4Tab===selected;
    bt.setAttribute('aria-selected',String(active));
    bt.tabIndex=active?0:-1;
   }
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
 
 // Eventos mantêm a cronologia independente de cada coluna.
 if(view==='ocorrencias')paginateRows(main,'.list-row','Ocorrencias',3);
 if(view==='registros')paginateRows(main,'tbody tr','Relatorio',8);
 if(view==='equipe')paginateRows(main,'.team-row','Equipe',4);
}

const demoCoiRouteMap=createInspectionRouteMap({onError:notify});
let demoInspectorMap=null,demoInspectorLocation=null,demoInspectorWatch=null,demoInspectorQueueSignature='';
let demoInspectionDraft=null,demoWizardAutoId=null;
function inspectorTaskQueue(){return queueInspections(liveAssignments.filter(x=>x.worker_id===user?.id).map(x=>({...x,taskKind:x.kind,kind:'vistoria'})),demoInspectorLocation,demoInspectorLocation)}
function demoInspectionQueue(){
 const items=demoInspectionRequests().map(item=>{
  // Local demonstrativo conhecido: restaurar coordenadas em dados antigos.
  const known=DEMO_CLIENTS.find(c=>c.name===item.address);
  return {...item,kind:'vistoria',latitude:item.latitude??known?.demoPoint?.lat??null,longitude:item.longitude??known?.demoPoint?.lng??null};
 });
 return queueInspections(items,demoInspectorLocation||DEMO_ROUTE.base,DEMO_ROUTE.base);
}
function refreshDemoInspectionQueue(){
 if(user?.role!=='vistoriador'||view!=='vistoriador'||!document.querySelector('#demo-inspection-map'))return;
 const queue=demoInspectionQueue(),sig=inspectionSignature(queue);
 if(sig===demoInspectorQueueSignature)return;
 demoInspectorQueueSignature=sig;
 if(document.querySelector('#demo-inspection-form')){
  const list=document.querySelector('[data-inspection-stops]');
  if(list)list.innerHTML=inspectionStops(queue);
  const label=document.querySelector('[data-inspection-queue-count]');
  if(label)label.textContent=String(queue.length);
  demoInspectorMap?.setRoute(inspectionRoute(queue,DEMO_ROUTE.base),{mode:'simulation',currentId:queue[0]?.id,checkpoints:[],deviations:[]});
  notify('Circuito atualizado com novas solicitações do COI.');
 }else render();
}
window.addEventListener('storage',e=>{
 if(e.key==='maxvel-demo-inspection-requests-v1')refreshDemoInspectionQueue();
});
setInterval(()=>{if(!document.hidden)refreshDemoInspectionQueue()},5000);
function startDemoInspectorGps(){
 if(demoInspectorWatch!=null||!navigator.geolocation)return;
 demoInspectorWatch=navigator.geolocation.watchPosition(pos=>{
  const p={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};
  if(p.accuracy>150)return;
  demoInspectorLocation=p;
  // GPS do aparelho não confirma presença no destino nem cria coordenadas fictícias.
  const state=document.querySelector('[data-inspection-gps-state]');
  if(state)state.textContent='GPS do dispositivo · '+Math.round(p.accuracy)+' m';
  if(demoInspectorMap){
   const tasks=user?.id?inspectorTaskQueue():demoInspectionQueue();
   demoInspectorMap.setRoute(inspectionRoute(tasks,p),demoInspectorMap.session);
   demoInspectorMap.update({position:p});
  }
 },()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:12000});
}
function render(){if(!user){root.innerHTML=loginHtml(brand());return;}demoCoiRouteMap.destroy();demoInspectorMap=null;if(user?.role!=='ronda'||view!=='minha-ronda'||(session&&hasBlock(session)))curtain?.close();destroyMaps();renderNumber++;if(!((isPagesTestMode())&&modal.open&&modal.classList.contains('role-picker-dialog')))modal.close?.();document.body.classList.toggle('simulation-running',presentation);
 if(false&&presentation&&!localStorage.getItem('rondas-pro-demo-history-edited')&&['admin','operador','coi','cliente','vistoriador'].includes(user?.role)){
  const seeded=withExampleRondas(sessions);
  if(seeded!==sessions){sessions=seeded;persist();}
 }
 if(screen==='landing')root.innerHTML=entryScreen();
 else if(screen==='presentation')root.innerHTML=appShell();
 else root.innerHTML=appShell();
 installViewportViews();installUX06();
 if(user?.id&&user.role==='vistoriador'&&view==='vistoriador')startDemoInspectorGps();
 const workspace=document.querySelector('.patrol-workspace');
 const routeMap=workspace?.querySelector('.patrol-map-panel'),routeAction=workspace?.querySelector('.patrol-actions');
 if(routeMap&&routeAction&&window.innerWidth<=900&&!workspace.matches('[data-inspection-cockpit]'))workspace.insertBefore(routeAction,routeMap);
 attachMaps();if(view==='rondas'&&user?.id)void routePlanner.mount();else routePlanner.dispose();ops.decorate();
 if(user?.role==='vistoriador'&&view==='vistoriador'&&demoInspectionDraft?.id&&!demoWizardAutoId&&demoPendingInspection()?.arrivedAt){demoWizardAutoId=demoInspectionDraft.id;requestAnimationFrame(()=>document.querySelector('#rp-demo-wizard-dialog')?.showModal());}
 const dash=document.querySelector('.dashboard');
 // Lanterna aparece somente na área operacional, nunca em histórico ou chat.
 if(dash)dash.dataset.torchRole=(user?.role==='ronda'&&view==='minha-ronda')||(user?.role==='vistoriador'&&view==='vistoriador')?user.role:'';
 torch.decorate();decorateTheme(user?.role);
 // Ajuda da cartografia pertence ao nível do cockpit: atrás do painel o ícone
 // fica visível mas não recebe clique, mesmo com z-index elevado no filho.
 if(window.innerWidth<=900&&workspace){
  const mapHelp=workspace.querySelector('.patrol-map-canvas .ux06-map-help');
  if(mapHelp)workspace.append(mapHelp);
 }
 installManager.decorate();uiMotion.enterView();justRendered=Date.now();
 if(user?.role==='ronda'&&view==='minha-ronda'&&screen!=='landing'&&!isPagesTestMode()&&!locationGate.isGranted())locationGate.open({demo:presentation});
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
  if(document.getElementById('real-ops-map')){
   const focus=realMapSelection();registerMap('real-ops-map',focus.route,null,focus.position||focus.route?.base,false,!!focus.position||isPagesTestMode(),focus.track);
   const rounds=liveRoundRecords(),history=rounds.length?rounds:previewRoundRecords();
   history.slice(0,4).forEach((r,i)=>{if(r.route)registerMap('real-history-map-'+i,r.route,null,r.track?.at(-1)||r.route.base,true,!!r.track?.length||!!r.simulation,r.track);});
  }
  if(document.getElementById('mobile-map')){const assigned=session?.route??assignedRoute();const mapped=assigned??{...DEMO_ROUTE,id:'sem-rota',name:'Mapa da unidade',points:[],legs:[]};registerMap('mobile-map',mapped,session,locationFix??mapped.base,true,!!(assigned||locationFix));}
  if(document.getElementById('demo-inspection-map')){
   const host=document.querySelector('#demo-inspection-map');
   if(host){
    const liveInspector=!!user?.id,base=liveInspector?(demoInspectorLocation??null):DEMO_ROUTE.base;
    const tasks=liveInspector?inspectorTaskQueue():demoInspectionQueue();
    const route=inspectionRoute(tasks,base);
    if(!liveInspector)demoInspectorQueueSignature=inspectionSignature(tasks);
    demoInspectorMap=new PatrolMap(host,{route,session:tasks.length?{mode:liveInspector?'real':'simulation',currentId:tasks[0].id,checkpoints:[],deviations:[]}:null,
      position:demoInspectorLocation||route.base,positionVerified:!!demoInspectorLocation||(!liveInspector&&!!base),standbyClean:!tasks.length,interactive:true,
      onStreetRoute:status=>{const el=document.querySelector('[data-inspection-road-state]');if(el)el.textContent=status;}});
    liveMaps.push(demoInspectorMap);
   }
  }
  if(document.getElementById('inspector-latest-round-map')){
   const last=liveAssignments.find(x=>x.worker_id===user?.id&&x.kind==='ronda'&&x.latitude!=null&&x.longitude!=null);
   if(last){const route=inspectionRoute([{...last,taskKind:'ronda'}],null);
    registerMap('inspector-latest-round-map',route,null,route.base,true,false);}
  }
  if(view==='overview'&&['operador','coi'].includes(user?.role)){
   const host=document.querySelector('#demo-coi-inspection-map'),focus=demoInspectionRequests().find(r=>!r.completedAt)||demoInspectionRequests()[0];
   if(host&&focus)demoCoiRouteMap.mount(host,focus,{demo:true});
  }
 }
}
function liveRoundRecords(){
 const groups=new Map();
 for(const event of liveEvents){const id=event.round_id||event.roundId;if(!id)continue;
  if(!groups.has(id))groups.set(id,{id,userId:event.user_id||event.userId,events:[]});
  const group=groups.get(id);group.events.push(event);
 }
 return [...groups.values()].map(r=>{
  r.events.sort((a,b)=>Number(a.occurred_at||0)-Number(b.occurred_at||0));
  r.startedAt=r.events.find(e=>e.kind==='patrol_start')?.occurred_at||r.events[0]?.occurred_at||0;
  r.lastAt=r.events.at(-1)?.occurred_at||0;r.completed=r.events.some(e=>e.kind==='patrol_end');
  r.checkpoints=r.events.filter(e=>e.kind==='checkpoint').length;
  r.alerts=r.events.filter(e=>['panic','incident','alert','route_deviation'].includes(e.kind)).length;
  r.track=r.events.map(e=>({lat:Number(e.lat),lng:Number(e.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180);
  r.worker=liveUsers.find(u=>u.id===r.userId)?.name||'Profissional';
  r.route=runtimeRoute(liveRoutes.find(x=>x.userId===r.userId));
  if(!r.route&&r.track.length){const first=r.track[0];r.route={id:r.id,name:'Trajeto GPS registrado',base:{...first,id:'base',name:'Início'},points:r.track.slice(1,26).map((p,i)=>({...p,id:'p'+i,name:'Posição '+(i+1),radius:25})),legs:[]};}
  return r;
 }).sort((a,b)=>b.lastAt-a.lastAt).slice(0,12);
}
function previewRoundRecords(){
 if(!isPagesTestMode())return [];
 return withExampleRondas([],Date.now()).map(s=>({id:s.id,worker:s.name,startedAt:s.startedAt,lastAt:s.finishedAt||s.startedAt,completed:s.status==='completed',
  checkpoints:s.checkpoints?.filter(p=>p.completedAt).length||0,alerts:(s.notifications?.length||0)+(s.incidents?.length||0),route:s.route,track:[],simulation:true}));
}
function realMapSelection(){
 const planned=liveRoutes.find(r=>r.id===selectedLiveRouteId)||liveRoutes[0]||null;
 const latest=liveRoundRecords().find(r=>r.userId===planned?.userId)||liveRoundRecords()[0];
 return {planned,latest,route:runtimeRoute(planned)||latest?.route||(isPagesTestMode()?DEMO_ROUTE:null),position:latest?.track?.at(-1)||null,track:latest?.track||[]};
}
function entryScreen(){
 return `<div class="entry-screen product-home"><header class="entry-topnav topnav">${brand()}<nav class="nav-actions">${btn('Explorar '+ic('arrow'),'login','primary small')}${operationalLink}</nav></header><main id="main" class="entry-main"><section class="entry-panel"><div class="entry-eyebrow">${ic('shield')} CENTRAL OPERACIONAL</div><h1>Rondas sob controle.<span> Da operação à supervisão.</span></h1><p>Rotas, equipes, horários e ocorrências em uma plataforma. Conheça as funções no próprio aplicativo.</p><div class="entry-actions">${btn('Explorar demonstração '+ic('arrow'),'login','primary full')}<span>${ic('checkcircle')} Demonstração sem login · na operação real, cada usuário terá senha e painel próprio</span></div><div class="entry-details"><span>Mapa e pontos</span><span>Rondas programadas</span><span>Equipe e supervisão</span><span>GPS, offline e relatórios</span></div></section><aside class="entry-aside"><div class="entry-aside-head"><span class="ops-live-dot"></span> VISÃO OPERACIONAL</div><div class="entry-aside-mark">${ic('map')}</div><div class="entry-aside-stat"><small>Trabalho em campo</small><strong>Ronda · 4 pontos</strong><span>Raio de 25 m · Permanência de 30 s</span></div><div class="entry-aside-footer">Estrutura real da plataforma · registros locais na avaliação</div></aside></main><footer class="entry-footer">Grupo Maxvel <span>·</span> Rondas Pro ${btn('Privacidade','privacy','small')}</footer></div>`;
}

function landing(){
 const examples=[['shield','Acompanhamento contínuo','Histórico de etapas e condições da ronda'],['map','Cartografia contextual','Pontos, raio e progresso sobre ruas reais'],['bell','Desvios documentados','Justificativa vinculada à supervisão'],['clipboard','Histórico consultável','Eventos e registros em ordem cronológica']];
 return `<div class="hero product-home"><div class="hero-container"><header class="topnav">${brand()}<nav class="nav-actions" aria-label="Acesso rápido">${btn(ic('help')+' Guia da plataforma','guide','','')} ${btn('Explorar '+ic('arrow'),'login','primary small')}</nav></header><main id="main"><section class="product-hero"><div class="product-hero-copy"><div class="eyebrow">${ic('shield')} GRUPO MAXVEL · OPERAÇÕES EM CAMPO</div><h1>Uma visão completa<br>de cada <span>ronda.</span></h1><p>Acompanhe o trabalho em campo e a supervisão em um só ambiente. Pontos, trajetos, permanência e ocorrências apresentados com clareza, do celular ao computador.</p><div class="hero-buttons">${btn('Experimentar o aplicativo '+ic('arrow'),'presentation-intro','primary')}${btn('Explorar sem login','login')}</div><div class="product-benefits"><span>${ic('checkcircle')} Passo a passo para o colaborador</span><span>${ic('checkcircle')} Visão da supervisão</span><span>${ic('checkcircle')} Registros com contexto</span></div><p class="product-fineprint">${ic('help')} Ambiente de avaliação: trajeto, pessoas e alertas ilustrativos. A cartografia é real quando online.</p></div><div class="product-showcase"><div class="showcase-main"><div class="showcase-toolbar"><div class="showcase-title">${ic('map')} <strong>Central de acompanhamento</strong><small>Prévia funcional do mapa</small></div><span class="showcase-status"><i></i> Visualização de rota</span></div><div id="hero-map" class="showcase-map"></div><div class="showcase-map-badge">${ic('pin')} Rota Centro · Divinópolis <span>4 pontos · raio 25 m</span></div><div class="showcase-overlay-stats"><div><small>Próxima verificação</small><strong>Portaria principal</strong></div><span>${ic('crosshair')} 25 m</span></div></div><div class="showcase-detail-grid"><div class="showcase-detail"><span class="showcase-detail-icon">${ic('clock')}</span><span><small>Permanência por ponto</small><strong>30 segundos contínuos</strong></span></div><div class="showcase-detail"><span class="showcase-detail-icon">${ic('bell')}</span><span><small>Desvios de percurso</small><strong>Justificativa e análise</strong></span></div></div><div class="showcase-disclaimer">Mapa OpenStreetMap · cenário operacional fictício</div></div></section><section class="product-capabilities"><div class="capabilities-intro"><div class="eyebrow">UMA PLATAFORMA · QUATRO FRENTES</div><h2>Feita para acompanhar a operação, não para complicá-la.</h2><p>O mesmo processo apresentado de forma específica para quem executa e para quem supervisiona.</p></div><div class="capability-grid">${examples.map(([ico,title,desc],i)=>`<article class="capability"><span class="capability-index">0${i+1}</span><span class="capability-icon">${ic(ico)}</span><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div></section><section class="product-endcap"><div><div class="eyebrow">VEJA O FLUXO COMPLETO</div><h2>Do primeiro ponto ao relatório final.</h2><p>Explore as telas reais da experiência proposta para ronda e supervisão, com cenário operacional interativo.</p></div>${btn('Experimentar o aplicativo '+ic('arrow'),'presentation-intro','primary')}</section></main><footer class="hero-foot"><span>Grupo Maxvel | Daniel N. Xavier</span><a href="#" data-action="privacy">Privacidade e requisitos técnicos</a></footer></div></div>`;
}
const coiNavigation=[['overview','COI · Acompanhamento','headset'],['rondas','Rotas e rondas','map'],['notificacoes','Eventos','bell'],['ocorrencias','Histórico de tratativas','clipboard'],['equipe','Equipe de campo','users']];
const allNav={ronda:[['minha-ronda','Minha ronda','compass'],['historico','Meu histórico','clipboard'],['meus-envios','Meus alertas e ocorrências','bell']],operador:coiNavigation,coi:coiNavigation,cliente:[['cliente','Meu acompanhamento','eye']],vistoriador:[['vistoriador','Vistorias e qualidade','clipboard'],['meus-envios','Meus alertas e ocorrências','bell']],admin:[['overview','Visão geral','chart'],['rondas','Rondas','map'],['notificacoes','Eventos','bell'],['ocorrencias','Histórico de tratativas','clipboard'],['equipe','Equipe','users'],['relatorios','Relatórios','clipboard'],['configuracoes','Configurações','settings']]};
for(const items of new Set(Object.values(allNav))){items.push(['chat-interno','Chat interno','message']);if(items.some(e=>e[0]==='overview'))items.push(['historico-operacional','Histórico de rondas','clipboard']);}

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
function fieldViewContent(){
 const content=viewContent();
 if(!['ronda','vistoriador'].includes(user?.role)||view===(user.role==='ronda'?'minha-ronda':'vistoriador'))return content;
 const back=user.role==='ronda'?'minha-ronda':'vistoriador';
 const backdrop=user.role==='ronda'?phoneContent():demoInspectorView();
 return backdrop+'<section class="rp-field-page-overlay" aria-label="Área de trabalho"><button type="button" class="rp-page-back" data-view="'+back+'">← Voltar ao mapa</button>'+content+'</section>';
}
function appShell(){const entries=allNav[user.role];let valid=entries.find(x=>x[0]===view);if(!valid){view=entries[0][0];valid=entries[0];}
 return `<div class="dashboard ${presentation?'simulation-mode':''}"><div class="app-shell"><aside class="sidebar">${brand()}<span class="side-caption">ÁREA DE TRABALHO</span><nav class="side-links" aria-label="Navegação principal">${entries.map(([key,title,ico])=>`<button data-view="${key}" class="side-link ${view===key?'active':''}" aria-current="${view===key?'page':'false'}">${ic(ico)}${title}${key==='notificacoes'&&recentNotification().filter(x=>!x.seenAt).length?`<span class="count">${recentNotification().filter(x=>!x.seenAt).length}</span>`:''}</button>`).join('')}</nav><div class="side-bottom"><span class="micro-disclaimer">Acesso individual autenticado · Grupo Maxvel</span><button class="foot-link" data-action="privacy">Privacidade e dados</button><button class="foot-link" data-action="tour-restart">Rever tutorial</button><button class="foot-link" data-action="guide">Guia completo</button><button class="foot-link" data-action="logout">Sair do perfil</button><p style="font-size:10px;margin-top:12px">Grupo Maxvel</p></div></aside><div class="shell-main"><header class="app-header"><button type="button" class="app-menu-button mobile-only" data-action="open-mobile-menu" aria-label="Abrir menu de navegação">${ic("menu")}</button>${brand()}<div class="eyebrow desktop-only">CENTRAL OPERACIONAL</div><div class="header-actions">${demoHeaderButtons()}<button class="help-toggle desktop-only" data-action="tour-restart" aria-label="Rever o tutorial da plataforma">${ic('help')}<span class="desktop-only">Ajuda</span></button><button type="button" class="user-pill user-profile-button" data-action="profile-menu" aria-label="Abrir perfil e opções"><span class="avatar">${esc(user.name.slice(0,1).toUpperCase())}</span><span><strong>${esc(user.name)}</strong><small>${roleName[user.role]}</small></span>${ic("settings")}</button><button class="button small desktop-only" data-action="logout">Sair</button></div></header>${isPagesTestMode()?'<div class="rp-demo-banner-global"><b>DEMONSTRAÇÃO</b> · Prévia de como o Ronda Pro funcionará. Dados fictícios, armazenados somente neste navegador.</div>':''}<main id="main" class="app-content ${view==='minha-ronda'?'ronda-page':''}">${fieldViewContent()}</main><footer class="footer-app">Ronda Pro · Grupo Maxvel</footer></div></div></div>`}
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
 (isPagesTestMode()?'<button type="button" class="button" data-action="demo-chat-overlay">Abrir mensagens da equipe</button>':'<a class="button" href="./central.html">Ver histórico completo e respostas da equipe</a>')+'</section>';
}
function viewContent(){switch(view){case 'minha-ronda':return pageTitle('Minhas rondas','Veja seus compromissos e execute o próximo passo.',helpButton('help','tutorial'))+phoneContent();case 'historico':return myPatrolHistory();case 'meus-envios':return mySubmissions();case 'overview':return overview();case 'cliente':return demoClientView();case 'vistoriador':return demoInspectorView();case 'rondas':return rondas();case 'chat-interno':return demoChatView();case 'historico-operacional':return demoHistoryView();case 'notificacoes':return notificationsView();case 'ocorrencias':return occurrences();case 'equipe':return team();case 'relatorios':return reports();case 'configuracoes':return settings();default:return overview();}}
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
 const assignments=demoInspectionRequests().slice().sort((a,b)=>b.createdAt-a.createdAt);
 const activeInspection=demoInspectionQueue()[0],focusInspection=activeInspection||assignments[0]||null;
 const futureInspections=demoInspectionQueue().filter(a=>a.id!==activeInspection?.id);
 const completedInspections=assignments.filter(a=>!!a.completedAt);
 const total=local.filter(x=>x.status==='active').length;
 const current=local[0],summary=[
  ['Rondas em curso',total],['Vistorias registradas',insp.length],
  ['Histórico de rondas',local.length],['Avisos do cenário',recentNotification().filter(x=>!x.seenAt).length]
 ];
 const tabs='<div class="coi-demo-tabs" role="group" aria-label="Acompanhamento por atividade"><button type="button" data-action="demo-coi-tab" data-tab="rondas" aria-pressed="'+(demoCoiTab==='rondas')+'" class="'+(demoCoiTab==='rondas'?'selected':'')+'">Rondas</button><button type="button" data-action="demo-coi-tab" data-tab="vistorias" aria-pressed="'+(demoCoiTab==='vistorias')+'" class="'+(demoCoiTab==='vistorias'?'selected':'')+'">Vistorias</button></div>';
 const coiFocusHtml='<section class="coi-demo-inspection-current"><div class="coi-demo-inspection-head"><div><span>VISTORIAS · '+(activeInspection?'EM ATENDIMENTO':'ÚLTIMA REGISTRADA')+'</span><h2>'+(focusInspection?esc(focusInspection.address):'Nenhuma vistoria solicitada')+'</h2><p>'+(focusInspection?esc(focusInspection.instructions):'Solicite uma vistoria para abrir o mapa de acompanhamento.')+'</p></div>'+(futureInspections.length?'<button type="button" data-action="demo-inspection-upcoming">Próximas · '+futureInspections.length+'</button>':'')+'</div>'+
 (focusInspection?'<div id="demo-coi-inspection-map" class="rp-coi-route-map" role="img" aria-label="Mapa da vistoria em foco"></div><small>'+(focusInspection.illustrative?'Coordenadas ilustrativas do cenário. ':'')+'Traçado pontilhado representa pontos previstos, não navegação pelas ruas. GPS depende do aparelho do profissional.</small>':'')+
 '<div class="coi-inspection-list"><strong>Vistorias concluídas · '+completedInspections.length+'</strong>'+(completedInspections.length?completedInspections.slice(0,4).map(a=>'<article><b>'+esc(a.address)+'</b><small> · '+fmt(a.completedAt)+'</small></article>').join(''):'<p class="empty">Nenhum laudo concluído.</p>')+'</div></section>';
 const roundRows=local.length?local.slice(0,10).map((record,i)=>{
  const live=record.status==='active';
  return '<article class="coi-demo-record"><header><div><span>'+esc(record.route?.name||'Ronda')+'</span><h3>'+esc(record.name||'Vigia')+'</h3></div><b>'+(live?'Em andamento':record.status==='completed'?'Concluída':'Histórico')+'</b></header><div class="coi-demo-facts"><span>Início <strong>'+fmt(record.startedAt)+'</strong></span><span>Pontos <strong>'+Number(record.checkpoints?.filter(x=>x.completedAt).length||0)+'</strong></span></div>'+
   (i===0?'<div id="ops-map" class="map-container large coi-demo-map" aria-label="Mapa ilustrativo da ronda selecionada"></div><small>Mapa e posição ilustrativos neste navegador. O COI real usa GPS enviado pelo campo.</small>':'')+
   '</article>';
 }).join(''):'<div class="empty">Nenhuma ronda registrada no cenário.</div>';
 const inspRows=insp.length?insp.slice(0,10).map((entry,i)=>'<article class="coi-demo-record"><header><div><span>Laudo de vistoria</span><h3>'+esc(DEMO_WATCHERS[0].unit)+'</h3></div><b>Enviada</b></header><div class="coi-demo-facts"><span>Data <strong>'+fmt(entry.at)+'</strong></span><span>Conformidade <strong>'+entry.score+'%</strong></span></div><p>'+esc(entry.notes)+'</p>'+(i===0?'<div id="ops-map" class="map-container large coi-demo-map" aria-label="Mapa ilustrativo do posto"></div><small>Referência ilustrativa do posto; nenhuma posição real do vistoriador foi transmitida.</small>':'')+'</article>').join(''):'<div class="empty">Sem vistorias neste navegador. Use o perfil Vistoriador para registrar um laudo demonstrativo.</div>';
 return '<section class="coi-demo-page">'+pageTitle('COI · Central de acompanhamento','Acompanhe a equipe e responda às ocorrências. Os dados abaixo são somente uma demonstração.')+
 '<div class="rp-demo-coi-command"><div><span class="eyebrow">CENTRAL DE OPERAÇÕES</span><strong>Vistorias sob demanda e de rotina</strong><small>Designe local, instruções e profissional no mesmo fluxo.</small></div><button type="button" class="button primary" data-action="demo-request-inspection">'+ic('clipboard')+' Solicitar vistoria</button></div>'+
 '<div class="coi-demo-topline"><span class="ops-live-dot"></span><strong>Atendimento e acompanhamento</strong><small>Posto demonstrativo · '+esc(DEMO_WATCHERS[0].unit)+'</small><span>Dados locais</span></div>'+
 '<div class="coi-demo-metrics">'+summary.map(([k,v])=>'<div><b>'+v+'</b><span>'+k+'</span></div>').join('')+'</div><div class="rp-coi-desktop-grid">'+coiFocusHtml+
 (current?'<section class="coi-demo-record"><h2>Última ronda</h2><h3>'+esc(current.name)+' · '+esc(current.route.name)+'</h3><p>'+fmt(current.startedAt)+'</p><div id="ops-map" class="map-container large coi-demo-map"></div><button type="button" class="rp-coi-percurso-link" data-action="session-detail" data-id="'+esc(current.id)+'">Abrir percurso e detalhes <span aria-hidden="true">↗</span></button><small>Mapa ilustrativo da demonstração.</small></section>':'<p class="empty">Nenhuma ronda registrada.</p>')+
 '<section class="coi-demo-content"><header class="toolbar"><h2>Rondas e vistorias recentes</h2><button type="button" class="rp-coi-history-link" data-view="historico-operacional">Ver histórico <span aria-hidden="true">↗</span></button></header>'+demoActivityRows().slice(0,5).map(demoActivityRow).join('')+'</section>'+
 '</div><p class="map-caption">Demonstração: os registros não representam uma operação de vigilância ao vivo. Para o COI autenticado, acesse a Central Operacional.</p></section>';
}
function realOverview(){
 const admin=user.role==='admin',reviewer=['admin','coi','operador'].includes(user.role);
 const pending=liveAssignments.filter(d=>!d.completed_at),active=liveAssignments.filter(d=>d.started_at&&!d.completed_at);
 const rows=[['Profissionais',liveUsers.filter(p=>p.active).length],['Atendimentos pendentes',pending.length],['Em execução',active.length],['Eventos',liveEvents.length]];
 const metrics='<div class="ops-metrics">'+rows.map(([label,n])=>'<article class="ops-metric"><strong>'+n+'</strong><h3>'+esc(label)+'</h3></article>').join('')+'</div>';
 const recent=liveEvents.slice(0,12).map(e=>'<div class="team-row"><div><strong>'+esc(e.description||e.kind)+'</strong><small>'+esc(e.kind)+' · '+fmt(e.occurred_at)+'</small></div><span>'+esc(e.status||'aberta')+'</span></div>').join('');
 const dispatch=reviewer?'<section class="rp-dispatch-launch" aria-label="Solicitação de ronda"><div><small>OPERAÇÃO DE CAMPO</small><strong>Solicitar início da ronda</strong><span>Vigia · destino · instruções</span></div><button type="button" data-action="dispatch-open">Solicitar ronda '+ic('arrow')+'</button></section>':'';
 const focus=realMapSelection();
 const rounds=liveRoundRecords(),history=rounds.length?rounds:previewRoundRecords();
 const options=liveRoutes.map(r=>'<option value="'+esc(r.id)+'" '+(focus.planned?.id===r.id?'selected':'')+'>'+esc(r.name)+'</option>').join('');
 const mapPanel='<section class="rp-operational-geo" aria-label="Mapa operacional">'+
  '<header><div><small>MONITORAMENTO GEOGRÁFICO</small><h2>Mapa das rondas</h2><p>'+(focus.latest?esc(focus.latest.worker)+' · '+fmt(focus.latest.lastAt):isPagesTestMode()?'Cenário fictício para avaliação':'Aguardando ronda cadastrada')+'</p></div>'+
  '<button type="button" data-action="center-maps" aria-label="Enquadrar o mapa">'+ic('crosshair')+'</button></header>'+
  (liveRoutes.length?'<label>Rota acompanhada<select id="rp-live-route-select">'+options+'</select></label>':'')+
  (focus.route?'<div id="real-ops-map" class="rp-real-monitor-map map-container large" role="region" aria-label="Pontos e percurso da ronda"></div>':'<div class="rp-geo-empty">Cadastre uma rota com endereços para exibir o mapa.</div>')+
  '<footer><span>'+(focus.position?'Último GPS registrado':isPagesTestMode()?'Mapa e posições ilustrativos':'GPS ainda não recebido')+'</span><span>'+Number(focus.route?.points?.length||0)+' pontos</span></footer></section>';
 const historic='<section class="rp-geo-history"><header><h2>Últimas rondas</h2><small>'+history.length+' registro(s)'+(!rounds.length&&isPagesTestMode()?' · cenário fictício':'')+'</small></header>'+
  (history.length?history.slice(0,4).map((r,i)=>'<article class="rp-geo-history-item"><div class="rp-geo-history-copy"><strong>'+esc(r.worker)+'</strong><small>'+fmt(r.startedAt)+' · '+(r.completed?'Concluída':'Em andamento')+'</small><span>'+r.checkpoints+' ponto(s) · '+r.alerts+' evento(s)</span></div>'+
   (r.route?'<div id="real-history-map-'+i+'" class="rp-real-history-map map-container" role="region" aria-label="Mapa histórico da ronda de '+esc(r.worker)+'"></div>':'<p>Sem coordenadas registradas.</p>')+
   '<details><summary>Eventos e histórico</summary><div class="rp-geo-event-list">'+
   ((r.events||[]).slice(-7).reverse().map(e=>'<p><b>'+esc(e.kind)+'</b> · '+fmt(e.occurred_at)+' · '+esc(e.description||'Registro')+'</p>').join('')||'<p>Cenário de demonstração, sem telemetria real.</p>')+
   '</div></details></article>').join(''):'<p class="rp-geo-empty">Nenhuma ronda registrada neste ambiente.</p>')+'</section>';
 return pageTitle(admin?'Administração':'COI · Central operacional','Rondas, equipe e eventos com visualização geográfica.')+dispatch+mapPanel+metrics+historic+
  '<section class="schedule-workspace"><div class="schedule-heading"><h2>Eventos recentes</h2><button type="button" class="button" data-action="live-refresh">Atualizar</button></div><div class="team-list">'+(recent||'<p>Nenhum evento real recebido até agora.</p>')+'</div></section>';
}
function realRondas(){
 if(!['admin','coi','operador'].includes(user?.role))return pageTitle('Rotas','Área do COI e da Administração.');
 return routePlanner.html();
}
function realInspector(){
 const assigned=liveAssignments.filter(x=>x.worker_id===user?.id),pending=inspectorTaskQueue();
 const cockpit=inspectionCockpit({queue:pending,mapId:'demo-inspection-map',mode:'live',position:demoInspectorLocation,base:demoInspectorLocation,gpsActive:!!demoInspectorLocation});
 const rounds=assigned.filter(x=>x.kind==='ronda'),inspections=assigned.filter(x=>x.kind==='vistoria'||x.kind==='inspection');
 const mappedRound=rounds.find(x=>x.latitude!=null&&x.longitude!=null);
 const row=item=>{
  const at=item.created_at||item.createdAt,done=!!(item.completed_at||item.completedAt),started=!!(item.started_at||item.startedAt);
  const coords=Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude))&&item.latitude!=null&&item.longitude!=null;
  const routePoints=typeof item.route_points==='string'?(()=>{try{return JSON.parse(item.route_points)}catch{return []}})():item.route_points||[];
  return '<details class="rp-inspector-history-item"><summary><strong>'+esc(item.address||'Local não informado')+'</strong><small>'+fmt(at)+' · '+(done?'Concluído':started?'Em execução':'Pendente')+'</small></summary>'+
   '<p>'+esc(item.reason||'Sem observações')+'</p><p>Início: '+fmt(item.started_at||item.startedAt)+' · Conclusão: '+fmt(item.completed_at||item.completedAt)+'</p>'+
   (item.completion_note?'<p>Resultado: '+esc(item.completion_note)+'</p>':'')+
   (routePoints.length?'<p>Destinos: '+routePoints.map((p,i)=>(i+1)+'. '+esc(p.label||p.name||'Ponto')).join(' · ')+'</p>':'')+
   (coords?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(item.latitude)+'&mlon='+Number(item.longitude)+'#map=17/'+Number(item.latitude)+'/'+Number(item.longitude)+'">Ver localização no mapa ↗</a>':'<p>Sem coordenadas registradas para este atendimento.</p>')+'</details>';
 };
 const recent=(title,items,maxItems=5)=>'<section class="rp-inspector-recent" aria-label="'+title+'"><header><h2>'+title+'</h2><span>'+items.length+' registro(s)</span></header>'+
  (items.length?items.slice(0,maxItems).map(row).join(''):'<p>Nenhum registro ainda.</p>')+
  (items.length>5?'<button type="button" class="button small" data-action="inspector-history-all" data-task-kind="'+(title==='Últimas rondas'?'ronda':'vistoria')+'">Ver histórico completo</button>':'')+'</section>';
 return '<section class="rp-demo-inspector rp-live-inspector">'+cockpit+
  '<section class="rp-inspector-records" aria-label="Histórico do vistoriador">'+
  (mappedRound?'<section class="rp-inspector-latest-map"><h2>Última ronda no mapa</h2><p>Pontos registrados · '+esc(mappedRound.address)+'</p><div id="inspector-latest-round-map" class="map-container mini" aria-label="Mapa dos pontos da última ronda"></div></section>':'')+
  recent('Últimas rondas',rounds)+recent('Últimas vistorias',inspections)+'</section>'+
  '<dialog class="rp-inspection-dialog" data-inspection-history-dialog aria-label="Histórico de rondas e vistorias"><header><h2>Histórico de rondas e vistorias</h2><button type="button" data-inspection-modal-close aria-label="Fechar histórico">✕</button></header><div class="rp-inspection-history-content">'+recent('Últimas rondas',rounds.slice(0,80),80)+recent('Últimas vistorias',inspections.slice(0,80),80)+'</div></dialog></section>';
}
function overview(){
 if(user?.id)return realOverview();
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
const DEMO_INSPECTION_REQUESTS='maxvel-demo-inspection-requests-v1';
function demoInspectionRequests(){try{const r=JSON.parse(localStorage.getItem(DEMO_INSPECTION_REQUESTS)||'[]');return Array.isArray(r)?r.slice(0,40):[]}catch{return []}}
function demoPendingInspection(){return demoInspectionQueue()[0]||null;}
function saveDemoInspectionRequests(rows){localStorage.setItem(DEMO_INSPECTION_REQUESTS,JSON.stringify(rows.slice(0,40)));}

function demoInspectionRecords(){try{const r=JSON.parse(localStorage.getItem(DEMO_INSPECTIONS)||'[]');return Array.isArray(r)?r.slice(0,100):[]}catch{return []}}
// Contatos totalmente sintéticos: apenas demonstração local, jamais cadastrados no servidor.
const DEMO_CLIENTS=[
 {name:'Maxvel Logística',demoPoint:{lat:-20.14135,lng:-44.88605},unit:DEMO_WATCHERS[0].unit,contact:'Responsável demonstrativo',phone:'(31) 90000-0000',email:'maxvel@exemplo.invalid'},
 {name:'Condomínio Reserva da Serra',demoPoint:{lat:-20.14245,lng:-44.88285},unit:'Posto Condomínio (fictício)',contact:'Responsável demonstrativo',phone:'(31) 90000-0000',email:'condominio@exemplo.invalid'},
 {name:'Metalúrgica Xavier',demoPoint:{lat:-20.13885,lng:-44.88135},unit:'Posto Metalúrgica (fictício)',contact:'Responsável demonstrativo',phone:'(31) 90000-0000',email:'metalurgica@exemplo.invalid'}
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
 if(user?.id)return realInspector();
 const records=demoInspectionRecords(),queue=demoInspectionQueue(),pending=queue[0]||null;
 if(pending&&demoInspectionDraft?.id!==pending.id)demoInspectionDraft=emptyInspectionDraft(pending.id);
 const map=inspectionCockpit({queue,mapId:'demo-inspection-map',mode:'demo',
  position:demoInspectorLocation||DEMO_ROUTE.base,base:DEMO_ROUTE.base,gpsActive:!!demoInspectorLocation,fullTitle:'Minhas vistorias'});
 const form=pending?.arrivedAt?'<dialog id="rp-demo-wizard-dialog" class="rp-field-wizard-dialog"><form id="demo-inspection-form" novalidate>'+
 '<div class="rp-field-wizard-head"><div><strong>Vistoria · '+esc(pending.address)+'</strong><small>Verificações por etapa · demonstração</small></div><button type="button" data-action="demo-wizard-close">✕</button></div>'+
 '<input type="hidden" name="requestId" value="'+esc(pending.id)+'">'+inspectionWizardHtml(demoInspectionDraft,{demo:true})+'</form></dialog>':'';
 return '<section class="demo-role-view rp-demo-inspector">'+map+form+
 '<dialog class="rp-inspection-dialog" data-inspection-history-dialog aria-label="Histórico de vistorias"><header><div><small>REGISTROS DO VISTORIADOR</small><h2>Histórico de vistorias</h2></div><button type="button" data-inspection-modal-close aria-label="Fechar histórico">✕</button></header><div class="rp-inspection-history-content">'+
 (records.length?records.map(r=>'<div class="rp-inspection-history-row"><span><strong>'+fmt(r.at)+'</strong><small>'+esc(r.address||DEMO_WATCHERS[0].unit)+' · '+esc(r.notes)+'</small></span><b>'+r.score+'%</b></div>').join(''):'<p class="empty">Nenhuma vistoria finalizada.</p>')+
 '<p class="rp-inspection-dialog-note">Registros locais demonstrativos. Fotos não são enviadas ao servidor.</p></div></dialog></section>';
}

function demoAdminRouteQueue(){
 const w=watcherById(selectedSupervisedWatcherId)||DEMO_WATCHERS[0],history=sessionList().filter(s=>s.name===w.name).slice(0,5),planned=programsForWatcher(programs,w.id);
 return '<section class="demo-admin-route-queue"><header class="demo-admin-route-header"><div><span class="eyebrow">MAPAS · RONDAS POR COLABORADOR</span><h2>'+esc(w.name)+'</h2><p>'+esc(w.unit)+' · '+history.length+' registros recentes · '+planned.length+' programações</p></div><a class="button primary" href="./central.html#routes">+ Criar nova rota para colaborador</a></header>'+
 '<p class="map-caption">A seleção do vigia acima filtra os mapas e o histórico. O cadastro persistente abre a central autenticada.</p>'+
 (history.length?history.map((s,i)=>'<article class="demo-admin-route-line"><div id="admin-route-mini-'+i+'" class="demo-mini-route-map"></div><div><span class="demo-route-flag">'+(s.status==='active'?'Em andamento':'Concluída')+'</span><h3>'+esc(s.route.name)+'</h3><p>'+esc(w.unit)+' · '+fmt(s.startedAt)+'</p><p>'+(s.checkpoints||[]).filter(p=>p.completedAt).length+'/'+s.route.points.length+' pontos verificados</p><button class="button small" data-action="session-detail" data-id="'+esc(s.id)+'">Ver cronologia</button></div></article>').join(''):'<p class="empty">Sem execução registrada para este vigia. Confira a agenda abaixo.</p>')+'</section>';
}

function rondas(){
 if(user?.id)return realRondas();
 const context=supervisedContext(),route=context.route,actual=context.current;
 const active=actual?.status==='active',current=active?actual.index:-1;
 const progress=actual?actual.checkpoints.filter(p=>p.completedAt).length:0;
 return pageTitle('Rondas','Programe, acompanhe e consulte a execução das rondas.',helpButton('schedules','programação de rondas'))+supervisorWatcherSelector()+demoAdminRouteQueue()+schedulePanel()+(scheduleTab==='mapa'?`<div class="map-command-page"><section class="map-command-panel"><div class="map-command-top"><div><div class="eyebrow">CARTOGRAFIA E LOCALIZAÇÃO</div><h2>${ic('map')} ${esc(route.name)}</h2><p>Ruas reais quando online · pontos ilustrativos</p></div><div class="map-command-actions">${tag(active?'Ronda em andamento':'Rota de referência',active?'green':'neutral')}${btn(ic('crosshair')+' Enquadrar rota','center-maps','small')}</div></div><div class="map-command-map"><div id="ops-map" class="map-container large"></div><div class="map-command-topbadge">${ic('pin')} ${route.points.length} pontos · raio de 25 m</div></div>${legend()}<div class="map-command-disclosure">${ic('help')} <span>O mapa mostra ruas reais, mas a linha entre os pontos é apenas ilustrativa. Não representa um caminho calculado pelas vias. A precisão do GPS pode variar.</span></div></section><aside class="map-checkpoint-panel"><div class="map-checkpoint-heading"><div class="eyebrow">SEQUÊNCIA DE VERIFICAÇÃO</div><h2>Pontos da rota</h2><p>${progress} de ${route.points.length} verificados neste cenário</p></div><div class="map-point-list">${route.points.map((p,i)=>{const done=!!actual?.checkpoints[i]?.completedAt,now=active&&current===i;return `<button type="button" class="map-point-row ${done?'is-done':now?'is-current':''}" data-action="focus-route-point" data-index="${i}" aria-label="Localizar ponto ${i+1}: ${esc(p.name)}"><span class="map-point-number">${done?ic('check'):i+1}</span><span class="map-point-info"><strong>${esc(p.name)}</strong><small>${done?'Verificado':now?'Ponto obrigatório atual':'Aguardando sequência'} · 25 m</small></span><span class="map-point-target">${ic('crosshair')}</span></button>`}).join('')}</div><div class="map-point-note">${ic('clock')} Permanência de 30 segundos contínuos dentro do raio, conforme GPS confiável.</div><div class="map-point-note">${ic('shield')} Falhas ou baixa precisão do GPS exigem verificação, não representam desvio automaticamente.</div></aside></div><section class="card map-history" style="margin-top:15px"><div class="card-title"><div><h2>Histórico de rondas</h2><p>Registros guardados somente neste navegador.</p></div>${tag(`${context.history.length} rondas`,'neutral')}</div>${tablePatrols(context.history)}</section>`:'');
}
function notificationRow(n,treatment=false){
 const incidentTreatment=treatment===true&&n.kind==='incident'&&n.incidentId;
 const kind=n.kind==='incident'?'clipboard':n.kind==='message'?'bell':n.kind==='panic'?'shield':'alert';
 const pending=!n.seenAt,label=n.kind==='incident'?'Ocorrência':n.kind==='message'?'Mensagem':n.kind==='panic'?'Pânico':'Alerta';
 return `<button type="button" data-notice-at="${Number(n.at)||0}" class="event-item rp-notice-row ${incidentTreatment?'list-row':''} ${!n.readAt?'unread':''} ${pending?'is-pending':'is-completed'}" data-action="${incidentTreatment?'incident-detail':'notification-detail'}" data-id="${esc(incidentTreatment?n.incidentId:n.id)}" data-session="${esc(n.session.id)}"><span class="event-icon ${pending?'alert':''}">${ic(kind)}</span><span class="rp-notice-copy"><small>${label} · ${time(n.at)}</small><strong>${esc(n.label)}</strong><small>${esc(n.session.name)} · ${esc(n.session.route.name)}</small><span class="rp-notice-state">${pending?'Tratativa pendente':'Tratativa concluída'} · ${n.readAt?'Lida':'Não lida'}</span></span><span class="rp-notice-open" aria-hidden="true">${ic('arrow')}</span></button>`;
}

let demoTreatmentTab='incident';
function demoEventNotifications(){
 const field=['ronda','vistoriador'].includes(user?.role);
 const own=recentNotification().filter(n=>n.kind!=='message').filter(n=>!field||n.session?.name===user.name);
 const incoming=localCommunications().filter(n=>!field||n.name===user.name).map(n=>({...n,id:'field:'+n.id,session:{id:'field',name:n.name,route:{name:n.route}}}));
 return [...own,...incoming].sort((a,b)=>b.at-a.at);
}
let demoChatScreen='list',liveChatId=null,liveContacts=[],liveConversations=[],liveMessages=[];
async function refreshRealChat(){
 if(!user?.id)return;
 const [contactData,conversationsData]=await Promise.all([liveRequest('/chat/contacts'),liveRequest('/chat/conversations')]);
 liveContacts=contactData.contacts||[];liveConversations=conversationsData.conversations||[];
 if(liveChatId){
  if(liveConversations.some(c=>c.id===liveChatId))liveMessages=(await liveRequest('/chat/conversations/'+encodeURIComponent(liveChatId)+'/messages')).messages||[];
  else{liveChatId=null;liveMessages=[];demoChatScreen='list';}
 }
 const overlay=document.querySelector('#rp-demo-chat-overlay');
 if(overlay&&overlay.open)overlay.innerHTML='<div class="rp-field-chat-overlay-head"><strong>Mensagens</strong></div>'+demoChatView();
 if(view==='chat-interno'&&!overlay){const main=document.querySelector('#main .rp-chat-native');if(main)main.outerHTML=demoChatView();}
}
function demoChatRows(){return liveMessages;}
function demoHeaderButtons(){
 const unread=liveConversations.reduce((n,c)=>n+(c.unread||0),0);
 const eventsLink=(allNav[user.role]||[]).some(([key])=>key==='notificacoes')
  ?'<button type="button" class="rp-blue-button rp-header-events" aria-label="Abrir eventos e notificações" data-view="notificacoes">'+ic('bell')+'</button>':'';
 return '<div class="rp-header-tools">'+eventsLink+'<button type="button" class="rp-blue-button" aria-label="Abrir mensagens" data-action="demo-chat-overlay">'+ic('message')+'<span>Mensagens</span>'+(unread?'<b class="rp-unread-count">'+unread+'</b>':'')+'</button></div>';
}
function openDemoChatOverlay(list=false){
 if(list)demoChatScreen='list';
 let overlay=document.querySelector('#rp-demo-chat-overlay');
 if(!overlay){overlay=document.createElement('dialog');overlay.id='rp-demo-chat-overlay';overlay.className='rp-field-chat-overlay';document.body.append(overlay);overlay.addEventListener('close',()=>overlay.remove(),{once:true});}
 overlay.innerHTML='<div class="rp-field-chat-overlay-head"><strong>Mensagens</strong></div>'+demoChatView();
 if(!overlay.open)overlay.showModal();
 void refreshRealChat().catch(e=>notify(e.message));
}
function demoChatView(){
 const back=user?.role==='ronda'?'minha-ronda':user?.role==='vistoriador'?'vistoriador':'overview';
 const header='<header class="field-chat-topbar"><button type="button" class="field-chat-back" data-view="'+back+'">'+ic('arrowleft')+'<span>Voltar</span></button><div><h1>Mensagens</h1><small>Equipe · Banco de dados</small></div></header>';
 const rows=liveConversations.map(c=>'<button type="button" class="field-chat-contact-row" data-action="demo-chat-open" data-contact="'+esc(c.id)+'"><span class="field-chat-avatar">'+esc(c.title?.slice(0,1)||'?')+'</span><span class="field-chat-contact-copy"><strong>'+esc(c.title)+'</strong><small>'+esc(c.last?.body||'Sem mensagens')+'</small></span>'+(c.unread?'<b>'+c.unread+'</b>':'')+'</button>').join('');
 const list='<section class="field-chat-list"><div class="field-chat-list-label">CONVERSAS</div>'+(rows||'<p>Nenhuma conversa iniciada.</p>')+'<button type="button" class="button primary" data-action="demo-chat-contacts">Nova conversa</button></section>';
 const contacts='<section class="field-chat-list"><div class="field-chat-list-label">CONTATOS</div>'+liveContacts.map(c=>'<button type="button" class="field-chat-contact-row" data-action="live-chat-contact" data-contact="'+esc(c.id)+'"><strong>'+esc(c.name)+'</strong><small>'+esc(roleName[c.role]||c.role)+'</small></button>').join('')+'<button class="button" type="button" data-action="demo-chat-list">Voltar</button></section>';
 const active=liveConversations.find(c=>c.id===liveChatId);
 const messages=liveMessages.map(m=>'<article class="field-chat-bubble '+(m.author_id===user.id?'is-mine':'is-other')+'"><p>'+esc(m.body)+'</p><small>'+esc(m.author||'')+' · '+time(m.created_at)+'</small></article>').join('');
 const conversation='<section class="field-chat-conversation"><header class="field-chat-threadbar"><button type="button" data-action="demo-chat-list">'+ic('arrowleft')+'</button><strong>'+esc(active?.title||'Conversa')+'</strong></header><div class="field-chat-thread" role="log">'+(messages||'<p>Escreva a primeira mensagem.</p>')+'</div><form id="demo-chat-form" class="field-chat-compose"><label class="sr-only" for="demo-chat-body">Mensagem</label><input name="body" id="demo-chat-body" required maxlength="4000" autocomplete="off" placeholder="Mensagem"><button type="submit" class="button primary">Enviar</button></form></section>';
 return '<section class="field-chat-screen rp-chat-native">'+header+'<div class="field-chat-surface">'+(demoChatScreen==='contacts'?contacts:demoChatScreen==='thread'?conversation:list)+'</div></section>';
}
setInterval(()=>{if(user?.id&&!document.hidden&&(document.querySelector('#rp-demo-chat-overlay')?.open||view==='chat-interno'))void refreshRealChat().catch(()=>{});},8000);
let demoHistoryPage=0;
function demoActivityRows(){return [...sessionList().map(r=>({id:r.id,selectionKey:'round:'+r.id,type:'round',at:r.startedAt,name:r.name,site:r.route?.name,status:r.status})),...demoInspectionRecords().map((r,i)=>({id:String(i),selectionKey:'inspection:'+i,type:'inspection',at:r.at,name:'Vistoria',site:r.address||DEMO_WATCHERS[0].unit,status:'Enviada'}))].sort((a,b)=>b.at-a.at);}
let demoHistorySelection=new Set();
function demoActivityRow(r,selectable=false){
 const item='<button type="button" class="rp-activity-row" data-action="'+(r.type==='round'?'session-detail':'demo-inspection-detail')+'" data-id="'+esc(r.id)+'"><span><strong>'+esc(r.type==='round'?'Ronda · '+r.name:'Vistoria · '+r.name)+'</strong><small>'+esc(r.site||'Local não informado')+' · '+fmt(r.at)+'</small></span><span>'+esc(r.status==='completed'?'Concluída':r.status==='active'?'Em andamento':r.status)+' ↗</span></button>';
 return selectable===true?'<div class="rp-history-entry" role="listitem"><label title="Selecionar registro"><input type="checkbox" data-action="demo-history-toggle" data-key="'+esc(r.selectionKey)+'" aria-label="Selecionar registro" '+(demoHistorySelection.has(r.selectionKey)?'checked':'')+'></label>'+item+'</div>':item;
}
function demoHistoryView(){
 const all=demoActivityRows(),maxPage=Math.max(0,Math.ceil(all.length/20)-1);
 demoHistoryPage=Math.min(demoHistoryPage,maxPage);
 const offset=demoHistoryPage*20,rows=all.slice(offset,offset+20),canManage=user?.role==='admin';
 const actions=canManage?'<div class="rp-history-toolbar"><span data-demo-selection-count>'+demoHistorySelection.size+' selecionado(s)</span><div class="rp-history-actions"><button type="button" data-action="demo-history-select-page">Selecionar página</button><button type="button" data-action="demo-history-delete-selected" '+(!demoHistorySelection.size?'disabled':'')+'>Apagar selecionados</button><details class="rp-data-danger-zone rp-history-danger"><summary>Mais opções</summary><button type="button" data-action="demo-history-delete-all" '+(!all.length?'disabled':'')+'>Apagar tudo</button></details></div></div>':'';
 return pageTitle('Histórico de rondas e vistorias','Registros locais da demonstração. O histórico permanente está na central autenticada.')+
 actions+'<section class="rp-history-list" role="list">'+(rows.map(r=>demoActivityRow(r,canManage)).join('')||'<p class="empty">Nenhum registro neste navegador.</p>')+'</section>'+
 '<div class="rp-history-pagination">'+(offset?btn('Anterior','demo-history-prev','small'):'')+'<span>'+(all.length?offset+1:0)+'–'+Math.min(offset+20,all.length)+' de '+all.length+'</span>'+(offset+20<all.length?btn('Próxima','demo-history-next','small'):'')+'</div>';
}
function realEventListing(title,events){
 const entries=events.map(e=>'<div class="team-row"><div><strong>'+esc(e.description||e.kind)+'</strong><small>'+esc(e.kind)+' · '+fmt(e.occurred_at)+'</small></div><span>'+esc(e.status||'aberta')+'</span></div>').join('');
 return pageTitle(title,'Registros operacionais do banco de dados.')+'<section class="schedule-workspace"><button type="button" class="button" data-action="live-refresh">Atualizar</button><div class="team-list">'+(entries||'<p>Nenhum registro.</p>')+'</div></section>';
}
function notificationsView(){
 if(user?.id)return realEventListing('Eventos',liveEvents);
 const all=demoEventNotifications().filter(n=>!n.seenAt),labels={panic:'Pânicos',incident:'Ocorrências',alert:'Alertas',inspection:'Vistorias',deviation:'Desvios',gps_issue:'Sinal GPS',other:'Outros'};
 const groups=new Map(['panic','incident','alert','inspection','deviation','gps_issue'].map(k=>[k,[]]));
 for(const n of all){const kind=groups.has(n.kind)?n.kind:'other';if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(n);}
 const ordered=[...groups].filter(([,rows])=>rows.length).sort((a,b)=>b[1].length-a[1].length);
 return pageTitle('Eventos','Pendências operacionais em colunas independentes. Ler não equivale a concluir.',btn('Ver histórico '+ic('arrow'),'open-incidents','small'))+
 '<div class="rp-event-columns">'+(ordered.length?ordered.map(([kind,rows])=>'<section class="rp-event-column"><header><h2>'+labels[kind]+'</h2><b class="rp-event-count">'+rows.length+'</b></header>'+(rows.length?rows.map(notificationRow).join(''):'<p class="rp-event-empty">Sem pendências</p>')+'</section>').join(''):'<p class="rp-event-empty">Nenhum evento pendente. Acompanhe o histórico de tratativas finalizadas.</p>')+'</div>';
}

function archivedResolution(n){
 const incident=n.incidentId?sessions.flatMap(s=>s.incidents||[]).find(i=>i.id===n.incidentId):null;
 const last=incident?.history?.at(-1);
 return {resolution:n.response||last?.note||n.history?.at(-1)?.note||'Conclusão registrada sem observação adicional.',owner:n.respondedBy||last?.assignee||incident?.assignee||n.history?.at(-1)?.actor||''};
}
function occurrences(){
 if(user?.id)return realEventListing('Ocorrencias',liveEvents.filter(e=>['incident','alert','panic','inspection'].includes(e.kind)));
 const records=demoEventNotifications().filter(n=>!!n.seenAt).sort((a,b)=>b.seenAt-a.seenAt);
 return pageTitle('Histórico de tratativas','Eventos finalizados. Respostas, responsáveis e registros preservados para consulta.',btn('Ver pendentes '+ic('arrow'),'nav-alerts','small'))+
 '<section class="rp-treatment-archive">'+(records.length?records.map(n=>'<article class="rp-archive-record" data-archive-id="'+esc(n.id)+'"><span>'+esc(n.kind==='panic'?'Pânico':n.kind==='incident'?'Ocorrência':n.kind==='alert'?'Alerta':'Registro')+' · '+fmt(n.at)+'</span><strong>'+esc(n.label||'Evento finalizado')+'</strong><small>'+esc(n.session?.name||'Campo')+' · '+esc(n.session?.route?.name||'Local não informado')+'</small><p>'+esc(archivedResolution(n).resolution)+'</p><span class="rp-archive-status">'+ic('checkcircle')+' Concluído'+(archivedResolution(n).owner?' por '+esc(archivedResolution(n).owner):'')+'</span></article>').join(''):'<div class="empty">Nenhum evento finalizado. As pendências ficam em Eventos.</div>')+'</section>';
}

function team(){
 if(!['admin','coi','operador'].includes(user?.role))return pageTitle('Equipe','Acesso indisponivel para este perfil.');
 return pageTitle('Equipe','Profissionais cadastrados no servidor.')+
 '<div class="team-list">'+liveUsers.map(u=>'<div class="team-row"><span class="avatar">'+esc(u.name[0])+'</span><div><strong>'+esc(u.name)+'</strong><small>'+esc(u.username||u.email)+' · '+esc(roleName[u.role]||u.role)+'</small></div><span>'+esc(u.phone||'')+'</span></div>').join('')+'</div>';
}
function reports(){
 if(user?.id)return realEventListing('Historico operacional',liveEvents);
 const all=sessionList(),notices=recentNotification(),completed=all.filter(s=>s.status==='completed').length,progress=all.reduce((sum,s)=>sum+s.checkpoints.filter(p=>p.completedAt).length,0),possible=all.reduce((sum,s)=>sum+s.route.points.length,0);
 const ratios=[{label:'Rondas concluídas',n:completed,total:all.length,color:'safe'},{label:'Pontos verificados',n:progress,total:possible,color:'blue'},{label:'Eventos analisados',n:notices.filter(n=>n.seenAt).length,total:notices.length,color:'cyan'}];
 const dates=all.map(s=>s.startedAt).filter(Number.isFinite).sort((a,b)=>a-b);
 const range=dates.length?`${new Date(dates[0]).toLocaleDateString('pt-BR')} até ${new Date(dates.at(-1)).toLocaleDateString('pt-BR')}`:'Nenhum registro neste navegador';
 return `<div class="report-page">${pageTitle('Relatório operacional','Registros e indicadores gerados exclusivamente a partir dos dados deste ambiente.',btn(ic('print')+' Imprimir / PDF','print',''))}<div class="report-context-bar"><span>${ic('clock')} ${esc(range)}</span>${tag('Dados locais, sem servidor','neutral')}</div>${kpiCards()}<div class="report-insights-grid"><section class="card report-breakdown"><div class="eyebrow">ANÁLISE DOS REGISTROS</div><h2>Visão da execução</h2><p>Percentuais calculados sobre as rondas e eventos registrados neste navegador.</p><div class="report-progress-list">${ratios.map(item=>{const pct=item.total?Math.round(item.n/item.total*100):0;return `<div class="report-progress-row"><div class="report-progress-label"><strong>${item.label}</strong><span>${item.n} de ${item.total} <b>${pct}%</b></span></div><div class="report-progress-track" role="progressbar" aria-label="${item.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i class="${item.color}" style="width:${pct}%"></i></div></div>`}).join('')}</div><div class="report-safety-note">${ic('shield')} <span>Indicadores de demonstração. Sem homologação do GPS ou sincronização com equipe real.</span></div></section><section class="card report-events"><div class="card-title"><div><div class="eyebrow">ATIVIDADE DOCUMENTADA</div><h2>Eventos recentes</h2></div>${tag(`${notices.length} avisos`,'neutral')}</div><div class="report-events-list">${notices.slice(0,5).map(notificationRow).join('')||`<div class="reports-empty">${ic('clipboard')}<strong>Nenhum evento registrado</strong><p>Desvios e ocorrências aparecerão aqui com horário e contexto.</p></div>`}</div></section></div><section class="card report-roster"><div class="card-title"><div><div class="eyebrow">HISTÓRICO</div><h2>Rondas registradas</h2></div>${tag(`${all.length} rondas`,'neutral')}</div>${tablePatrols(all)}</section><div class="report-note">${ic('help')} <span>Use “Imprimir / PDF” para salvar uma cópia local. O navegador realiza a impressão; nenhum documento é enviado automaticamente.</span></div></div>`;
}
function settings(){
 if(user?.role!=='admin')return pageTitle('Sem permissão','Configurações restritas à Administração.');
 return pageTitle('Configurações','Cadastre a equipe e defina os acessos operacionais.')+adminSettings.landing();
}
function legacySettings(){
 const options=[
  {id:'dwellSeconds',title:'Tempo de permanência',value:operationalSettings.dwellSeconds+' segundos',
   info:'Defina de 5 a 120 segundos em cada ponto.'},
  {id:'deviationJustification',title:'Justificativa de desvio',value:operationalSettings.deviationJustification?'Obrigatória':'Desativada',
   info:'Solicita explicação antes de liberar o avanço quando houver desvio.'},
  {id:'evidenceEnabled',title:'Verificação ilustrativa',value:operationalSettings.evidenceEnabled?'Ativada':'Desativada',
   info:'Exibe as etapas demonstrativas de conferência no ponto.'}
 ];
 const people='<section class="schedule-workspace"><div class="schedule-heading"><div><h2>Cadastro de profissionais</h2><p>Somente a Administracao pode criar acessos.</p></div></div>'+
 '<form id="live-create-user-form" class="live-register"><label>Perfil<select name="role" required><option value="coi">COI</option><option value="ronda">Vigia / Ronda</option><option value="vistoriador">Vistoriador</option></select></label>'+
 '<label>Nome<input name="name" required minlength="2" maxlength="100"></label>'+
 '<label>E-mail<input type="email" name="email" required maxlength="150"></label>'+
 '<label>Telefone<input type="tel" name="phone" required maxlength="35"></label>'+
 '<label>Usuario (ou use o e-mail)<input name="username" minlength="3" maxlength="40" placeholder="Opcional"></label>'+
 '<label>Senha<input type="password" name="password" required minlength="12" autocomplete="new-password"></label>'+
 '<button type="submit" class="button primary">Cadastrar</button></form>'+
 '<div class="team-list" style="margin-top:18px">'+liveUsers.map(p=>'<div class="team-row"><strong>'+esc(p.name)+'</strong><span>'+esc(p.username||p.email)+' · '+esc(roleName[p.role]||p.role)+'</span></div>').join('')+'</div></section>';
 return pageTitle('Configurações','Profissionais e regras operacionais.')+people+
  '<section class="hx05-settings-list" aria-label="Regras configuráveis">'+
  '<div class="hx05-list-heading"><strong>Regras de operação</strong><span>Gerência e Administração</span></div>'+
  options.map(o=>'<div class="hx05-setting-row"><span class="hx05-setting-copy"><strong>'+esc(o.title)+'</strong>'+
   '<small>'+esc(o.value)+'</small><span>'+esc(o.info)+'</span></span>'+
   '<button type="button" class="hx05-open-button" data-action="open-operational-setting" data-setting="'+o.id+'">Abrir</button></div>').join('')+
  '<p class="hx05-settings-note">As mudanças só serão aplicadas às rondas iniciadas depois de salvar.</p></section>'+
  '<details class="rp-data-danger-zone"><summary>Gerenciar dados locais <span>Opções de exclusão</span></summary>'+
   '<div class="settings-data"><span>Dados de demonstração armazenados neste navegador</span>'+
   btn('Apagar registros locais','clear-prompt','small danger')+'</div></details>';
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
 const count=(session?.route??assignedRoute()??routeForWatcher(selectedWatcherId)).points.length;
 return `<div class="patrol-stage-intro"><span class="patrol-stage-index">01 · PREPARAÇÃO</span><h2>Pronto para iniciar?</h2><p>${count} pontos · raio de 25 m · 30 s por ponto.</p></div><div class="patrol-mode-toggle" aria-label="Modo da ronda"><button type="button" class="${mode==='simulation'?'selected':''}" data-action="mode-simulation" aria-pressed="${mode==='simulation'}">${ic('play')} Cenário</button><button type="button" class="${mode==='real'?'selected':''}" data-action="mode-real" ${presentation?'disabled':''} aria-pressed="${mode==='real'}">${ic('crosshair')} GPS real</button></div>${btn('Iniciar ronda '+ic('arrow'),'start','primary full')}<p class="patrol-microtext">${presentation?'Você experimenta o próprio aplicativo, com mapa e alertas ilustrativos.':mode==='real'?'O aparelho solicitará permissão para localização durante a ronda.':'O mapa contém ruas reais; trajeto e posições do cenário são simulados.'}</p>`;
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
 const s=session,assigned=s?.route??assignedRoute(),noRoute=user?.role==='ronda'&&!s&&!assigned&&!isPagesTestMode(),route=assigned??routeForWatcher(selectedWatcherId),active=s?.status==='active',point=active?currentCheckpoint(s):null,progress=s?progressPercent(s):0;
 const state=active?(hasBlock(s)?'Atenção · justificativa':point?`Ponto ${s.index+1} de ${route.points.length}`:'Retorno à base'):s?.status==='completed'?'Ronda concluída':'Ronda preparada';
 return `<div class="patrol-workspace${patrolSheetCollapsed?' sheet-collapsed':''}">
  <div class="patrol-statusline">${phoneTelemetry()}</div>
  <section class="patrol-map-panel" aria-label="Mapa da ronda">
   <header class="patrol-map-heading"><div class="patrol-map-heading-copy"><strong>${esc(noRoute?'Mapa da unidade':route.name)}${window.innerWidth>900?helpButton('map','mapa e pontos'):''}</strong><small>${noRoute?'Aguardando rota atribuída · mapa disponível':esc(state)+' · '+(s?Math.floor(progress)+'%':route.points.length+' pontos previstos')+' · '+(isPagesTestMode()?'Demonstração':mode==='simulation'?'Simulação':'GPS do aparelho')+(assignedSchedule()?' · '+esc(scheduleDescription(assignedSchedule())):'')}</small></div>${patrolMapClock()}<button type="button" data-action="center-maps" title="Enquadrar rota" aria-label="Enquadrar rota e pontos">${ic('crosshair')}</button></header>
   <div class="patrol-map-canvas"><div id="mobile-map" class="map-container mini"></div>${window.innerWidth<=900?`<button type="button" class="ux06-map-help" data-action="feature-help" data-topic="map" aria-label="Ajuda sobre mapa">${ic("help")}</button>`:""}</div>
   <div class="patrol-map-footer"><span>${mode==='real'?'GPS autorizado':'Localização simulada'}</span><span data-live="coords">${locationFix?`${locationFix.lat.toFixed(5)}, ${locationFix.lng.toFixed(5)}`:'Aguardando início'}</span></div>
  </section>
  <section class="patrol-actions" aria-label="Ação principal da ronda">
    <div class="patrol-action-heading"><strong>${ic('compass')} ${esc(state)}</strong><button type="button" class="patrol-sheet-toggle" data-action="toggle-patrol-sheet" aria-controls="patrol-action-content" aria-expanded="${!patrolSheetCollapsed}">${patrolSheetCollapsed?'Mais opções':'Menos opções'}</button></div>
    <div class="patrol-action-body">
      <div class="patrol-primary-flow">${noRoute?'<div class="patrol-stage-intro"><h2>Nenhuma rota atribuída</h2><p>A Administração precisa cadastrar e atribuir uma rota antes de iniciar a ronda. O mapa permanece disponível.</p></div>':patrolActionContent()}</div>
      <div id="patrol-action-content" class="patrol-extra-flow">
       <div class="patrol-extra-label">Ferramentas e informações</div>
       ${active&&point&&mode==='simulation'&&s.evidenceEnabled!==false?`<button type="button" class="patrol-evidence-link" data-action="point-evidence">${ic('clipboard')} Verificação ilustrativa do ponto ${s.index+1}</button>`:''}
       ${noRoute?'':mySchedule()}
       ${patrolScenarioControls()}
       ${active?'<section class="patrol-verification-pane" aria-label="Comprovação do ponto"></section>':''}
       <details class="patrol-help-details"><summary>${ic('help')} Instruções e pontos</summary>${coachHtml()}<div class="patrol-point-list">${(noRoute?[]:route.points).map((p,i)=>`<button type="button" data-action="point-details" data-index="${i}" class="${s?.checkpoints[i]?.completedAt?'done':active&&s.index===i?'current':''}"><b>${s?.checkpoints[i]?.completedAt?ic('check'):i+1}</b><span>${esc(p.name)}</span></button>`).join('')}</div><button type="button" class="patrol-help-link" data-action="guide">${ic('help')} Abrir guia completo</button>${active&&mode==='simulation'&&point&&s.index<route.points.length-1?btn('Testar tentativa de pular ponto','demo-skip','small'):''}</details>
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
function showDialog(html,wide=false,dialogClass=''){modal.className=[wide?'wide':'',dialogClass].filter(Boolean).join(' ');modal.style.removeProperty('transform');modal.style.removeProperty('--rp-drag-y');modal.innerHTML=`<button type="button" class="dialog-close" aria-label="Fechar janela" data-action="close-dialog">${ic('close')}</button>${html}`;if(!modal.open)modal.showModal();requestAnimationFrame(()=>installDialogPagination(modal));}
function privacy(){showDialog(`<div class="eyebrow">PRIVACIDADE E TRANSPARÊNCIA</div><h2>Uso responsável dos dados de ronda</h2><p>Este protótipo guarda nomes informados, horários, coordenadas simuladas ou dados de teste autorizados, desvios, justificativas e ocorrências somente no navegador atual.</p><div class="rules"><li><div><strong>Cartografia</strong><p>Quando online, os mapas carregam imagens do OpenStreetMap. Os pontos de ronda são fictícios; o provedor pode receber informações técnicas da visualização da região do mapa.</p></div></li><li><div><strong>Localização</strong><p>O modo GPS pede autorização do aparelho. No navegador, só funciona enquanto a página estiver ativa; o aplicativo nativo Android pode continuar com um serviço em primeiro plano e notificação visível, conforme permissões e condições do sistema. O serviço não sobrevive a uma parada forçada. Falhas ou imprecisões não são prova de irregularidade.</p></div></li><li><div><strong>Supervisão e alertas</strong><p>O recebimento nesta versão é simulado e local. Nenhum supervisor real recebe automaticamente avisos.</p></div></li><li><div><strong>Próximas etapas</strong><p>Antes do uso operacional: autenticação, infraestrutura, controle de acesso, segurança, política de retenção e documentação LGPD.</p></div></li></div>${btn('Entendi','close-dialog','primary full')}`,true)}
function trackingIntroduction(){
 const requirements=LOCATION_REQUIREMENTS.map((r,i)=>`<div class="consent-feature"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(r.title)}</strong><p>${esc(r.description)}</p></div></div>`).join('');
 showDialog(`<div class="consent-compact"><div class="consent-compact-head"><span class="consent-symbol">${ic('pin')}</span><div><div class="eyebrow">PRIMEIRA ABERTURA · TRANSPARÊNCIA</div><h2>Localização durante a ronda</h2></div></div><p class="consent-compact-sub">Para registrar pontos e trajetos da sua ronda, o sistema precisa acessar a localização <b>durante o serviço autorizado</b>.</p><div class="consent-compact-points"><div>${ic('checkcircle')}<span>O acompanhamento pode continuar com a tela bloqueada ou usando outros apps <b>na versão Android nativa</b>.</span></div><div>${ic('checkcircle')}<span>Uma notificação visível permite identificar e parar o acompanhamento.</span></div><div>${ic('checkcircle')}<span>O navegador não acompanha sua posição depois de fechado. O sistema não ignora uma parada forçada.</span></div></div><details class="consent-details"><summary>Ver condições completas e privacidade</summary><div class="consent-features">${requirements}</div></details><div class="consent-disclosure"><b>Importante:</b> o aceite registra que você leu as condições, mas <b>não concede permissão ao GPS</b>. Essa autorização será solicitada pelo Android ou navegador ao iniciar uma ronda real. Alertas da demonstração são locais.</div><label class="check-label consent-check"><input type="checkbox" id="location-intro-check">Li e compreendi as condições de localização durante a ronda.</label><div class="consent-actions">${btn('Li e aceito · Continuar '+ic('arrow'),'accept-location-notice','primary full','disabled')}${btn('Explorar sem localização GPS','decline-location-notice','secondary full')}</div><p class="consent-small">O acompanhamento deve ocorrer somente durante rondas autorizadas; a empresa deve definir as regras de privacidade.</p></div>`,true);
 modal.classList.add('consent-dialog');
 modal.dataset.mandatoryNotice='true';
}
const canReviewDemo=()=>['admin','operador','coi'].includes(user?.role);
function incidentReviewDialog(s,i){
 const notice=s.notifications?.find(n=>n.incidentId===i.id);if(notice&&!notice.readAt){notice.readAt=Date.now();persist();render();}
 const manage=canReviewDemo();
 const log=(i.history??[]).slice().reverse().map(h=>`<div class="incident-review-row"><strong>${esc(h.status)}</strong><small>${fmt(h.at)} · ${esc(h.actor??'Supervisão')}</small>${h.note?`<p>${esc(h.note)}</p>`:''}</div>`).join('');
 const edit=manage&&i.status!=='Resolvida'?`<form id="incident-review-form" data-session="${esc(s.id)}" data-id="${esc(i.id)}"><label class="field">Situação<select name="status"><option ${i.status==='Aberta'?'selected':''}>Aberta</option><option ${i.status==='Em análise'?'selected':''}>Em análise</option><option ${i.status==='Resolvida'?'selected':''}>Resolvida</option></select></label><label class="field">Responsável pela providência<input name="assignee" maxlength="60" value="${esc(user.name)}" readonly aria-readonly="true"></label><label class="field">Providência / observação<textarea name="note" maxlength="450" placeholder="Descreva o que foi feito ou o encaminhamento"></textarea></label>${btn('Salvar tratamento','incident-review','primary full')}</form>`:'<p><strong>Responsável pela providência:</strong> '+esc(i.assignee||'Aguardando COI')+'</p><p>'+ (i.status==='Resolvida'?'Resolvida · somente consulta.':'Em aberto · aguardando tratamento.')+'</p>';
 showDialog(`<div class="incident-review-dialog"><div class="eyebrow">OCORRÊNCIA · REGISTRO LOCAL</div><h2>${esc(i.title)}</h2><div class="incident-review-tags">${tag(i.severity,'orange')}${tag(i.status==='Em análise'?'Em aberto · Em análise':i.status??'Aberta',i.status==='Resolvida'?'green':'orange')}</div><p>${esc(i.description)}</p>${ops.incidentMediaList(i)}<div class="detail-pair"><span>Vigia</span><strong>${esc(s.name)}</strong></div><div class="detail-pair"><span>Ponto</span><strong>${esc(i.pointName)}</strong></div><div class="detail-pair"><span>Registrada</span><strong>${fmt(i.at)}</strong></div>${edit}${i.status==='Resolvida'?'<h3>Solução registrada</h3><p>'+esc(i.history?.at(-1)?.note||'Consulte o histórico de tratamento.')+'</p>':''}<details class="incident-review-history"><summary>Histórico de tratamento (${(i.history??[]).length})</summary>${log||'<p>Nenhuma análise registrada.</p>'}</details><p class="map-caption">Demonstração: sem envio remoto nem identificação de usuário validada por servidor.</p></div>`,true);
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
async function activatePagesRole(role){
 if(!isPagesTestMode())return;
 const account=PAGES_TEST_ACCOUNTS.find(item=>item.role===role);
 if(!account)throw new Error('Perfil de teste indisponível.');
 liveSession.token='pages-test:'+account.username;
 await restoreLiveAccount();
}
function openDemoWorkerPicker(){
 if(!isPagesTestMode())return;
 showDialog('<section class="rp-demo-worker-picker"><span class="eyebrow">RONDA PRO · PERFIL VIGIA</span><h2>Escolha o vigia que deseja simular</h2><p>Esta é uma demonstração do funcionamento do aplicativo. Os três nomes são fictícios; não há acompanhamento real nem envio de dados a outros aparelhos.</p><div class="rp-demo-worker-list">'+DEMO_THREE.map((w,i)=>'<button type="button" data-action="choose-demo-worker" data-username="'+esc(w.username)+'"><b>'+(i+1)+'</b><span><strong>'+esc(w.name)+'</strong><small>Abrir aplicativo como este vigia · demonstração</small></span>'+ic('arrow')+'</button>').join('')+'</div></section>',true);
}
function openAreaPicker(){
  if(!presentation&&!isPagesTestMode())return;
  const roles=isPagesTestMode()
   ?[['ronda','Vigia','compass'],['coi','COI · Acompanhamento','headset'],['vistoriador','Vistoriador','clipboard'],['admin','Administração','settings']]
   :[['ronda','Vigia','compass'],['operador','COI · Acompanhamento','headset'],['cliente','Cliente','eye'],['vistoriador','Vistoriador','clipboard'],['admin','Administração','settings']];
  showDialog(`<div class="eyebrow">ÁREAS DO RONDA PRO · ${isPagesTestMode()?'TESTES':'DEMONSTRAÇÃO'}</div><h2>Escolher área</h2><div class="role-picker-list">${roles.map(([role,label,ico])=>`<button type="button" data-action="sim-role" data-role="${role}" class="${user?.role===role||(user?.role==='coi'&&role==='operador')?'selected':''}" aria-pressed="${user?.role===role||(user?.role==='coi'&&role==='operador')}">${ic(ico)}<strong>${label}</strong>${user?.role===role||(user?.role==='coi'&&role==='operador')?'<span>Atual</span>':''}</button>`).join('')}</div><p class="map-caption">${isPagesTestMode()?'Escolha livremente uma área de teste. Os dados permanecem neste navegador.':'A troca de perfil demonstra as áreas no mesmo navegador; não representa autenticação.'}</p>${(isPagesTestMode())?'':'<a class="button full" href="./central.html">Entrar na operação real ↗</a>'}`,false,'role-picker-dialog');
}
function profileDialog(){
 if(!user)return;
 showDialog('<div class="profile-modal"><h2>'+esc(user.name)+'</h2><p>'+esc(roleName[user.role]||user.role)+' · '+esc(user.username||user.email||'')+'</p><div class="profile-actions">'+btn('Guia completo','guide','full')+((presentation||isPagesTestMode())?btn('Trocar de área','sim-role-picker','full'):'')+btn('Sair deste perfil','logout','full')+'</div></div>');
}
function startDialog(){const real=mode==='real'&&!presentation;showDialog(`<div class="start-confirm"><h2>Iniciar ronda?</h2><ul><li>Siga a ordem dos pontos e finalize na base.</li><li>Valide sua presença dentro do raio de 25 metros.</li><li>Permaneça pelo tempo configurado em cada ponto, com GPS confiável.</li><li>Informe desvios e ocorrências.</li></ul><p>${real?'Autorize a localização para registrar a ronda. No navegador, mantenha o aplicativo aberto.':'Demonstração: percurso e alertas simulados; tempo de permanência real.'}</p><label class="check-label"><input type="checkbox" id="declaration-check">Li e compreendi as orientações.</label>${btn('Confirmar e iniciar','confirm-start','primary full','disabled')}</div>`);modal.classList.add('start-confirm-dialog');}
function incidentDialog(){showDialog(`<div class="field-composer"><h2>Registrar ocorrência</h2><form id="incident-form"><div class="field-composer-row"><label class="field">Tipo<select name="category"><option>Segurança</option><option>Acesso</option><option>Patrimônio</option><option>Manutenção</option><option>Outros</option></select></label><label class="field">Gravidade<select name="severity"><option>Baixa</option><option selected>Média</option><option>Alta</option></select></label></div><label class="field">Assunto<input name="title" required minlength="3" maxlength="100" placeholder="O que aconteceu?"></label><label class="field">Descrição<textarea name="description" rows="2" required minlength="10" maxlength="1400" placeholder="Descreva o fato observado."></textarea></label><details><summary>Anexar evidência</summary>${ops.mediaFields()}</details><label class="check-label"><input name="truth" type="checkbox" required>Confirmo o relato observado.</label><button type="submit" class="button primary full">Registrar ocorrência</button></form></div>`);}
function alertDialog(){showDialog('<div class="field-composer"><h2>Enviar alerta</h2><form id="field-alert-form"><label class="field">Alerta<input name="description" required minlength="3" maxlength="240" placeholder="O que aconteceu?" autocomplete="off"></label><button class="button primary full" type="submit">Enviar alerta</button></form></div>');}
function mySubmissions(){
 if(user?.id&&!isPagesTestMode())return pageTitle('Meus alertas e ocorrencias','Registros salvos no servidor.')+
 '<div class="team-list">'+liveEvents.filter(e=>['alert','incident','panic'].includes(e.kind)).map(e=>'<div class="team-row"><strong>'+esc(e.description||e.kind)+'</strong><span>'+esc(e.status||'aberta')+' · '+fmt(e.occurred_at)+'</span></div>').join('')+'</div>';
 const own=localCommunications().filter(n=>n.name===user.name);
 const items=own.map(n=>'<article class="guide-pan"><h3>'+esc(n.label)+'</h3>'+tag(n.seenAt?'Resolvida':'Em aberto',n.seenAt?'green':'orange')+'<p>'+esc(n.response||'Aguardando resposta do COI.')+'</p>'+btn('Ver registro','own-notice-detail','small',`data-id="field:${esc(n.id)}" data-session="field"`)+'</article>');
 for(const s of sessions.filter(s=>s.name===user.name))for(const i of s.incidents)items.push('<article class="guide-pan"><h3>'+esc(i.title)+'</h3>'+tag(i.status==='Em análise'?'Em aberto · Em análise':i.status,i.status==='Resolvida'?'green':'orange')+'<p>'+esc(i.history?.at(-1)?.note||'Aguardando resposta do COI.')+'</p>'+btn('Ver registro','own-notice-detail','small',`data-id="${esc(s.notifications.find(n=>n.incidentId===i.id)?.id||'')}" data-session="${esc(s.id)}"`)+'</article>');
 for(const s of sessions.filter(s=>s.name===user.name))for(const n of (s.notifications||[]).filter(n=>!n.incidentId))items.push('<article class="guide-pan"><h3>'+esc(n.label)+'</h3>'+tag(n.seenAt?'Resolvida':'Em aberto',n.seenAt?'green':'orange')+'<p>'+esc(n.response||'Aguardando resposta do COI.')+'</p>'+btn('Ver registro','own-notice-detail','small',`data-id="${esc(n.id)}" data-session="${esc(s.id)}"`)+'</article>');
 return pageTitle('Meus alertas e ocorrências','Envios e respostas da demonstração local.')+items.join('')+(items.length?'':'<p>Nenhum envio deste perfil.</p>');
}
function localCommunications(){try{return JSON.parse(localStorage.getItem('rondas-pro-field-notices')||'[]')}catch{return []}}
async function recordFieldNotice(kind,description,details={},form=null){
 const id=crypto.randomUUID(),at=Date.now(),local=mode==='simulation'||!sessionStorage.getItem('rondaspro_api_token');
 if(form){const attachment={id};await ops.attachIncidentMedia(attachment,form);details={...details,media:attachment.media,mediaIds:attachment.media.map(m=>m.id)};}
 const record={id,at,kind,label:description,details,seenAt:null,readAt:null,sessionId:session?.id||'field',name:user?.name||'Vigia',route:session?.route?.name||'Fora de ronda'};
 if(local){const rows=localCommunications();rows.unshift(record);localStorage.setItem('rondas-pro-field-notices',JSON.stringify(rows));}
 else{await ops.queueEvent({id,at,kind,status:'pending',payload:{description,...details,mode:'real',sessionId:session?.id||null,position:locationFix}});await ops.syncPending();}
 return local?'Registro salvo na demonstração.':ops.allEvents().find(e=>e.id===id)?.status==='synced'?'Enviado à central.':'Salvo no aparelho · envio pendente.';
}
function justificationDialog(){const d=latestDeviation();if(!d||d.justification)return;showDialog(`<div class="eyebrow" style="color:#b93d56">SOLICITAÇÃO DE JUSTIFICATIVA</div><h2>Informe o motivo da saída</h2><p style="font-size:12px;margin:0 0 13px">Escreva uma justificativa que enviaremos ao supervisor, pois você saiu da rota.</p><div class="detail-pair"><span>Ponto pendente</span><strong>${esc(d.pointName)}</strong></div><div class="detail-pair"><span>Horário</span><strong>${fmt(d.at)}</strong></div><form id="justification-form" style="margin-top:20px"><label class="field">Justificativa<textarea required name="reason" minlength="10" maxlength="1400" placeholder="Descreva o motivo e o que aconteceu."></textarea></label><div class="section-note">${ic('shield')}<span>O retorno ao ponto e os 30 segundos continuam obrigatórios. O recebimento pela supervisão é simulado.</span></div><button type="submit" class="button primary full" style="margin-top:14px">Enviar justificativa ${ic('arrow')}</button></form>`)}
function notificationDialog(id,sid){if(sid==='field'){const rows=localCommunications(),n=rows.find(x=>'field:'+x.id===id);if(!n)return;n.readAt=Date.now();localStorage.setItem('rondas-pro-field-notices',JSON.stringify(rows));render();showDialog('<div class="field-composer"><h2>'+esc(n.kind==='alert'?'Alerta':'Ocorrência')+'</h2><p>'+esc(n.label)+'</p><p>'+esc(n.details.category||'')+' · '+esc(n.details.severity||'')+'</p>'+ops.incidentMediaList(n.details)+'<p><strong>Resposta do COI:</strong> '+esc(n.response||'Aguardando resposta.')+'</p><p>'+esc(n.respondedBy||'')+'</p><small>Demonstração local</small>'+(canReviewDemo()&&!n.seenAt?'<p>Responsável pela providência: '+esc(user.name)+'</p>'+(n.kind==='incident'?'<label class="field">Situação<select data-field-status><option value="em_analise">Em aberto · Em análise</option><option value="resolvida">Resolvida</option></select></label>':'')+'<label class="check-label"><input type="checkbox" data-alert-check> Conferi este registro</label><label class="field">Resposta ao profissional<textarea data-alert-response required minlength="10" rows="2" maxlength="450"></textarea></label><button type="button" class="button primary full" data-action="field-notice-ack" data-id="'+esc(n.id)+'">Responder e concluir</button>':'')+'</div>');return;}const s=sessions.find(x=>x.id===sid),n=s?.notifications.find(x=>x.id===id);if(!n)return;n.readAt=n.readAt||Date.now();persist();render();const d=s.deviations.find(x=>x.id===n.deviationId),i=s.incidents.find(x=>x.id===n.incidentId);if(i){incidentReviewDialog(s,i);return;}showDialog(`<div class="eyebrow">SUPERVISÃO · EVENTO SIMULADO</div><h2>${esc(n.label)}</h2>${n.kind==='panic'?'<p>Telefone do profissional: não cadastrado neste cenário. O contato real aparece na central autenticada.</p>':''}${tag(n.seenAt?'Analisada':n.justification?'Justificativa recebida':'Pendente',n.seenAt?'green':n.justification?'neutral':'orange')}<div style="margin:17px 0">${[['Responsável',s.name],['Rota',s.route.name],['Horário',fmt(n.at)],['Ponto',d?.pointName??i?.pointName??'Não identificado'],['Posição ilustrativa',d?`${d.position.lat.toFixed(6)}, ${d.position.lng.toFixed(6)}`:'Não informada']].map(([a,b])=>`<div class="detail-pair"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div>${d?`<div class="section-note alert">${ic('alert')}<span>Desvio aproximado: ${d.distance} m do corredor de rota de demonstração. Área de validação por ponto: ${RADIUS_METERS} m.</span></div><div class="guide-pan" style="margin-top:13px"><h3>Justificativa do ronda</h3><p>${esc(d.justification||'Aguardando explicação.')}</p></div><div class="detail-pair"><span>Retorno ao ponto</span><strong>${d.returnedAt?fmt(d.returnedAt):'Pendente'}</strong></div>`:`<div class="guide-pan"><h3>Descrição da ocorrência</h3><p>${esc(i?.description)}</p></div>`}<div class="section-note">${ic('help')}<span>É um evento fictício registrado apenas nesta demonstração. Não foi encaminhado externamente.</span></div>${n.response?'<h3>Resposta do COI</h3><p>'+esc(n.response)+'</p><small>'+esc(n.respondedBy)+'</small>':''}${n.seenAt||!canReviewDemo()?btn('Fechar','close-dialog','primary full'):'<label class="check-label"><input type="checkbox" data-alert-check> Conferi este registro</label><label class="field">Resposta ao profissional<textarea data-alert-response rows="2" maxlength="450" required></textarea></label>'+btn('Responder e concluir','acknowledge','primary full',`data-id="${esc(n.id)}" data-session="${esc(s.id)}"`)}`,true)}
function detailSession(id){const s=sessions.find(x=>x.id===id);if(!s)return;showDialog(`<div class="eyebrow">DETALHES DE UMA RONDA</div><h2>${esc(s.route.name)}</h2>${tag(s.status==='completed'?'Concluída':'Em andamento',s.status==='completed'?'green':'orange')}<div style="margin:17px 0">${[['Colaborador',s.name],['Início',fmt(s.startedAt)],['Conclusão',fmt(s.finishedAt)],['Pontos',`${s.index} de ${s.route.points.length}`],['Desvios',s.deviations.length],['Ocorrências',s.incidents.length],['Verificações ilustrativas',Object.values(s.evidences??{}).filter(x=>x.confirmedAt).length]].map(([a,b])=>`<div class="detail-pair"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div><div id="patrol-detail-map" class="rp-history-map"></div><p class="map-caption">Rota e pontos ilustrativos do cenário. O percurso real é consultado no histórico da central autenticada.</p><h3>Histórico de eventos</h3><div class="timeline" style="margin-top:13px">${s.timeline.map(x=>`<div class="timeline-entry"><strong>${esc(x.label)}</strong><small>${fmt(x.at)}</small></div>`).join('')}</div>${btn('Fechar','close-dialog','primary full')}`,true);const el=document.querySelector("#patrol-detail-map");if(el){const detailMap=new PatrolMap(el,{route:s.route,session:s,position:s.position,compact:true});modal.addEventListener("close",()=>detailMap.destroy(),{once:true});}}
function pointDialog(index){const route=session?.route??DEMO_ROUTE,p=route.points[index];if(!p)return;const completed=session?.checkpoints[index]?.completedAt;showDialog(`<div class="eyebrow">PONTO ${index+1} · ROTA DEMONSTRATIVA</div><h2>${esc(p.name)}</h2><p>${esc(p.instruction)}</p>${tag(completed?'Concluído':session?.index===index?'Ponto atual':'Pendente',completed?'green':'neutral')}<div style="margin-top:16px">${[['Raio','25 metros'],['Permanência','30 segundos contínuos'],['Sequência',`${index+1} de ${route.points.length}`],['Localização', 'Ilustrativa no modo simulado']].map(([a,b])=>`<div class="detail-pair"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div>${btn('Entendi','close-dialog','primary full')}`)}
function finishDialog(){showDialog(`<div class="eyebrow">CONFIRMAR CONCLUSÃO</div><h2>Finalizar esta ronda?</h2><p style="font-size:12px">Os quatro pontos já foram concluídos e o retorno à base foi identificado. O registro ficará salvo neste navegador.</p><div class="modal-actions">${btn('Cancelar','close-dialog')}${btn('Finalizar ronda','confirm-finish','primary')}</div>`)}
async function startSession(){
 const planned=liveRoutes.find(r=>r.userId===user?.id);
 if(user?.role==='ronda'&&planned&&!routeCanStart(planned)){
  notify('Esta ronda não está programada para o dia ou horário atual. Consulte a programação do COI.');return;
 }
 if(!locationGate.isGranted()&&!isPagesTestMode()){locationGate.open({demo:presentation});notify('Ative a localização antes de iniciar a ronda.');return;}const now=Date.now();if(mode==='real'&&!presentation){
 if(!navigator.geolocation){notify('Geolocalização indisponível neste navegador.');return;}
 try{const loc=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
  const f={lat:loc.coords.latitude,lng:loc.coords.longitude,accuracy:loc.coords.accuracy,at:now};
  if(f.accuracy>25){notify(`Sinal com precisão de ${Math.round(f.accuracy)} m. Tente em uma área com melhor recepção.`);return;}
  const route=assignedRoute();if(!route){notify('Nenhuma rota real atribuida. Solicite cadastro da rota.');return;}route.rules={dwellMs:operationalSettings.dwellSeconds*1000,
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
 }else{const planned=programs.find(p=>p.id===selectedProgramId&&p.status==='scheduled')??nextProgram(programs,selectedWatcherId,sessions,now);const route=(isPagesTestMode()?assignedRoute():null)??(planned?routeForProgram(planned):routeForWatcher(selectedWatcherId));
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
/* O servidor continua sendo a fonte da operação real. Consulta curta e isolada
 * permite que o vigia veja uma rota nova sem recarregar ou interromper a ronda.
 * O modo Pages lê exclusivamente seu armazenamento local de teste. */
let routePollBusy=false;
setInterval(async()=>{
 if(routePollBusy||!user?.id||document.hidden||user.role!=='ronda'||session?.status==='active')return;
 routePollBusy=true;
 const viewer=user.id;
 try{
  const latest=(await liveRequest('/routes')).routes||[];
  if(user?.id!==viewer)return;
  const was=JSON.stringify(liveRoutes.map(r=>[r.id,r.updatedAt,r.name,r.points?.length,r.schedule]));
  const now=JSON.stringify(latest.map(r=>[r.id,r.updatedAt,r.name,r.points?.length,r.schedule]));
  if(now!==was){liveRoutes=latest;if(view==='minha-ronda')render();}
 }catch{/* Sem conexão: manter a rota já recebida e tentar novamente. */}
 finally{routePollBusy=false;}
},5000);
setInterval(()=>{if(session?.status==='active')save()},10000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.status==='active'){if(!window.AndroidTracking){session.insideSince=null;const p=currentCheckpoint(session);if(p)session.checkpoints[session.index].dwellMs=0;}movement=null;save();}else if(screen!=='landing'&&session?.status==='active'){syncNativeHistory();render()}});
window.addEventListener('focus',()=>{if(window.AndroidTracking&&session?.status==='active'&&mode==='real')syncNativeHistory()});
async function handleAction(event){const el=event.target.closest('[data-action],[data-view],[data-v4-watcher]');if(!el||el.disabled)return;if(el.dataset.action?.startsWith('rp-plan-')){await routePlanner.click(el);return;}if(el.tagName==='A')event.preventDefault();
 const nav=el.dataset.view;if(nav){if(!user||!allNav[user.role].find(x=>x[0]===nav))return;if(nav==='chat-interno'&&['ronda','vistoriador'].includes(user.role)){openDemoChatOverlay(true);return;}if(nav==='chat-interno'&&view!==nav)demoChatScreen='list';view=nav;render();window.scrollTo({top:0,behavior:'instant'});return;}
 const act=el.dataset.action;
 if(await adminSettings.click(el))return;
 if(await savedPointsAdmin.click(el))return;
 if(await dispatchWizard.click(el))return;
 if(act==='dispatch-open'){if(['admin','coi','operador'].includes(user?.role))dispatchWizard.open();return;}
 if(act==='dispatch-next'){dispatchWizard.step(Number(modal.querySelector('#live-dispatch-form')?.dataset.step||1)+1);return;}
 if(act==='dispatch-back'){dispatchWizard.step(Number(modal.querySelector('#live-dispatch-form')?.dataset.step||1)-1);return;}
 if(user?.role==='vistoriador'&&user?.id&&act==='inspector-create'){
  const kind=el.dataset.taskKind==='ronda'?'ronda':'inspection';
  showDialog('<section class="rp-inspector-create"><div class="eyebrow">VISTORIADOR · NOVO REGISTRO</div><h2>'+(kind==='ronda'?'Criar ronda':'Criar vistoria')+'</h2>'+
   '<form id="inspector-create-form" class="live-register"><input type="hidden" name="kind" value="'+kind+'">'+
   '<label>Local / endereço<input name="address" minlength="5" maxlength="350" required placeholder="Informe o destino"></label>'+
   '<label>Motivo e orientações<textarea name="reason" minlength="10" maxlength="1000" required placeholder="Descreva a atividade a executar"></textarea></label>'+
   '<label>Pontos com coordenadas (opcional)<textarea name="points" placeholder="Portaria;-20.14020;-44.88366&#10;Recepção;-20.14052;-44.88338"></textarea></label>'+
   '<button type="submit" class="button primary full">Criar '+(kind==='ronda'?'ronda':'vistoria')+'</button></form></section>');
  return;
 }
 if(user?.role==='vistoriador'&&act==='inspector-history-all'){
  document.querySelector('[data-inspection-history-dialog]')?.showModal();return;
 }
 if(user?.role==='vistoriador'&&user?.id&&act==='inspector-round-finish'){
  showDialog('<h2>Finalizar ronda</h2><form id="inspector-finish-round-form" data-id="'+esc(el.dataset.id)+'"><label class="field">Resultado da ronda<textarea required minlength="10" maxlength="1500" name="note" placeholder="Descreva o resultado e ocorrências"></textarea></label><button type="submit" class="button primary full">Concluir e registrar</button></form>');return;
 }
 if(act==='demo-wizard-open'){const d=document.querySelector('#rp-demo-wizard-dialog');if(d&&!d.open)d.showModal();return;}
 if(act==='demo-wizard-close'){document.querySelector('#rp-demo-wizard-dialog')?.close();return;}
 if(act==='demo-chat-overlay'){openDemoChatOverlay(true);return;}
 if(act==='demo-chat-overlay-more'){openDemoChatOverlay(true);return;}
 if(act==='demo-chat-overlay-close'){document.querySelector('#rp-demo-chat-overlay')?.close();return;}
 if(act==='demo-inspection-fit'){demoInspectorMap?.fit();return;}
 if(act==='demo-inspection-depart'){
  const pending=demoPendingInspection();if(!pending)return;
  saveDemoInspectionRequests(demoInspectionRequests().map(r=>r.id===pending.id?{...r,startedAt:r.startedAt||Date.now()}:r));
  startDemoInspectorGps();render();notify('Saída da base registrada no cenário. Siga para o primeiro destino.');return;
 }
 if(act==='demo-inspection-arrive'){
  const pending=demoPendingInspection();if(!pending?.startedAt)return;
  saveDemoInspectionRequests(demoInspectionRequests().map(r=>r.id===pending.id?{...r,arrivedAt:r.arrivedAt||Date.now()}:r));
  render();
  requestAnimationFrame(()=>document.querySelector('#rp-demo-wizard-dialog')?.showModal());
  notify('Chegada registrada na simulação. Preencha a vistoria.');return;
 }
 if(act==='demo-chat-contacts'){demoChatScreen='contacts';if(document.querySelector('#rp-demo-chat-overlay'))openDemoChatOverlay(false);else render();return;}
 if(act==='live-chat-contact'){
  try{const r=await liveRequest('/chat/conversations',{method:'POST',data:{members:[el.dataset.contact]}});liveChatId=r.id;demoChatScreen='thread';await refreshRealChat();if(document.querySelector('#rp-demo-chat-overlay'))openDemoChatOverlay(false);else render();}
  catch(error){notify(error.message);}return;
 }
 if(act==='demo-chat-open'){liveChatId=el.dataset.contact;demoChatScreen='thread';await refreshRealChat();if(document.querySelector('#rp-demo-chat-overlay'))openDemoChatOverlay(false);else render();return;}
 if(act==='demo-chat-list'){liveChatId=null;liveMessages=[];demoChatScreen='list';if(document.querySelector('#rp-demo-chat-overlay'))openDemoChatOverlay(false);else render();return;}
 if(act==='field-notice-ack'){if(!canReviewDemo())return;const rows=localCommunications(),n=rows.find(x=>x.id===el.dataset.id);if(n&&!n.seenAt){const response=modal.querySelector('[data-alert-response]')?.value.trim();if(!modal.querySelector('[data-alert-check]')?.checked||!response||response.length<10){notify('Marque a conferência e escreva a resposta ao profissional (mínimo 10 caracteres).');return;}n.response=response;n.respondedBy=user.name;n.status=n.kind==='incident'?modal.querySelector('[data-field-status]')?.value||'em_analise':'resolvida';n.seenAt=n.status==='resolvida'?Date.now():null;n.history??=[];n.history.push({at:Date.now(),status:n.status,actor:user.name,note:response});localStorage.setItem('rondas-pro-field-notices',JSON.stringify(rows));modal.close();render();}return;}
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
 if(act==='sim-role-picker'){openAreaPicker();return;}
 if(act==='choose-demo-worker'){
  if(!isPagesTestMode())return;
  const entry=DEMO_THREE.find(w=>w.username===el.dataset.username);if(!entry)return;
  modal.close();liveSession.token='pages-test:'+entry.username;
  selectedWatcherId=DEMO_WATCHERS.find(w=>w.name===entry.name)?.id||'v01';
  await restoreLiveAccount();return;
 }

if(act==='sim-role'){
  if(isPagesTestMode()){
    modal.close();
    if(el.dataset.role==='ronda'){openDemoWorkerPicker();return;}
    await activatePagesRole(el.dataset.role);return;
   }
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
if(act==='profile-menu'){if(user?.role==='admin')void refreshLiveUsers().catch(()=>{});profileDialog();return;}
 if(act==='live-refresh'){try{await Promise.all([refreshLiveUsers(),refreshLiveOperational()]);render();notify('Dados atualizados.');}catch(error){notify(error.message)}return;}
 if(act==='live-inspection-start'||act==='live-inspection-arrive'){
  const id=el.dataset.id,verb=act==='live-inspection-start'?'start':'arrive';
  try{
   let data={};if(verb==='arrive'){
    if(!navigator.geolocation)throw new Error('GPS indisponivel');
    const fix=await new Promise((ok,bad)=>navigator.geolocation.getCurrentPosition(ok,bad,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
    data={position:{lat:fix.coords.latitude,lng:fix.coords.longitude,accuracy:fix.coords.accuracy}};
   }
   await liveRequest('/dispatches/'+encodeURIComponent(id)+'/'+verb,{method:'POST',data});
   await refreshLiveOperational();render();notify('Etapa registrada no servidor.');
  }catch(error){notify(error.message)}return;
 }
 if(act==='live-inspection-report'){
  const assignment=liveAssignments.find(d=>d.id===el.dataset.id&&d.worker_id===user?.id&&d.started_at&&!d.completed_at);
  if(!assignment){notify('Vistoria indisponivel.');return;}
  showDialog('<h2>Concluir vistoria · '+esc(assignment.address)+'</h2><form id="live-inspection-form" data-dispatch="'+esc(assignment.id)+'"><p>Marque os itens em conformidade.</p>'+
  ['acessos','estrutura','equipamentos','sinalizacao'].map(key=>'<label class="field">'+esc(key)+'<select name="'+key+'" required><option value="true">Conforme</option><option value="false">Nao conforme</option></select></label>').join('')+
  '<label class="field">Relato<textarea name="note" required minlength="10" maxlength="1500"></textarea></label>'+
  '<label class="field">Selfie<input type="file" name="selfie" accept="image/jpeg,image/png,image/webp" capture="user" required></label>'+
  '<label class="field">Foto do local<input type="file" name="local" accept="image/jpeg,image/png,image/webp" capture="environment" required></label>'+
  '<button type="submit" class="button primary full">Enviar laudo e concluir</button></form>');
  return;
 }
 if(act==='login'){beginSimulation(watcherById(selectedWatcherId)?.name||'Vigia demonstrativo',false,'ronda');return;}
 if(act==='logout'){if(isPagesTestMode()){openAreaPicker();return;}stopLocation();locationGate.reset();void liveRequest('/logout',{method:'POST'}).catch(()=>{});liveLogout();return;}
 if(act==='privacy'){privacy();return;}
 if(act==='start'){if(!locationGate.isGranted()&&!isPagesTestMode()){locationGate.open({demo:presentation});return;}startDialog();return;}
 if(act==='confirm-start'){if(mode==='real'&&!presentation&&!isPagesTestMode()&&!getConsent()){trackingIntroduction();return;}await startSession();return;}
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
 if(act==='own-notice-detail'){
  const own=el.dataset.session==='field'?localCommunications().some(n=>'field:'+n.id===el.dataset.id&&n.name===user.name):sessions.some(s=>s.id===el.dataset.session&&s.name===user.name);
  if(own)notificationDialog(el.dataset.id,el.dataset.session);return;
 }
 if(act==='notification-detail'){notificationDialog(el.dataset.id,el.dataset.session);return;}
 if(act==='acknowledge'){if(!canReviewDemo())return;const s=sessions.find(x=>x.id===el.dataset.session);const n=s?.notifications.find(n=>n.id===el.dataset.id),response=modal.querySelector('[data-alert-response]')?.value.trim();if(!n||n.seenAt)return;if(!modal.querySelector('[data-alert-check]')?.checked||!response||response.length<10){notify('Marque a conferência e informe a resposta ao profissional (mínimo 10 caracteres).');return;}if(s&&acknowledge(s,el.dataset.id)){n.response=response;n.respondedBy=user.name;persist();modal.close();render();notify('Análise registrada no cenário demonstrativo.')}return;}
 if(act==='incident-detail'){
  if(!canReviewDemo())return;
  const s=sessions.find(x=>x.id===el.dataset.session),incident=s?.incidents.find(x=>x.id===el.dataset.id);
  if(incident)incidentReviewDialog(s,incident);
  return;
 }
 if(act==='incident-review'){
  if(!canReviewDemo())return;
  const form=modal.querySelector('#incident-review-form');if(!form)return;
  const s=sessions.find(x=>x.id===form.dataset.session),incident=s?.incidents.find(x=>x.id===form.dataset.id);
  if(!incident||incident.status==='Resolvida')return;
  const status=form.querySelector('[name=status]')?.value;
  if(!['Aberta','Em análise','Resolvida'].includes(status)){notify('Escolha uma situação válida.');return;}
  const assignee=user.name;
  const note=String(form.querySelector('[name=note]')?.value??'').trim().slice(0,450);
  if(status==='Resolvida'&&note.length<10){notify('Descreva a providência adotada antes de resolver.');return;}
  if(incident.status!==status||incident.assignee!==assignee||note){
   incident.status=status;incident.assignee=assignee;incident.reviewedAt=Date.now();
   for(const n of s.notifications??[])if(n.incidentId===incident.id)n.seenAt=status==='Resolvida'?incident.reviewedAt:null;
   incident.history??=[];incident.history.push({at:incident.reviewedAt,status,assignee,note,actor:user.name,mode:'local-demo'});
   s.timeline.unshift({id:'incident-'+incident.reviewedAt,kind:'incident-review',at:incident.reviewedAt,label:'Ocorrência atualizada na supervisão demonstrativa: '+status,incidentId:incident.id});
   persist();
  }
  modal.close();render();notify('Tratamento de ocorrência salvo neste navegador.');return;
 }
 if(act==='demo-inspection-upcoming'){
  const waiting=demoInspectionRequests().filter(r=>!r.completedAt),focus=waiting[0];
  const upcoming=waiting.filter(r=>r.id!==focus?.id);
  showDialog('<h2>Próximas vistorias</h2><p>Solicitações aguardando atendimento.</p>'+
   (upcoming.length?'<div class="coi-inspection-list">'+upcoming.map(r=>'<article><strong>'+esc(r.address)+'</strong><p>'+esc(r.instructions)+'</p><small>'+fmt(r.createdAt)+'</small></article>').join('')+'</div>':'<p class="empty">Sem próximas vistorias.</p>')+
   '<div class="modal-actions"><button type="button" class="button" data-action="close-dialog">Fechar</button></div>',true);
  return;
 }
 if(act==='demo-history-toggle'){
  if(user?.role!=='admin')return;
  const key=el.dataset.key;if(!key)return;
  if(el.checked)demoHistorySelection.add(key);else demoHistorySelection.delete(key);
  const count=document.querySelector('[data-demo-selection-count]');
  if(count)count.textContent=demoHistorySelection.size+' selecionado(s)';
  const remove=document.querySelector('[data-action="demo-history-delete-selected"]');
  if(remove)remove.disabled=demoHistorySelection.size===0;
  return;
 }
 if(act==='demo-history-select-page'){
  if(user?.role!=='admin')return;
  const pageRows=demoActivityRows().slice(demoHistoryPage*20,demoHistoryPage*20+20);
  const allSelected=pageRows.length>0&&pageRows.every(r=>demoHistorySelection.has(r.selectionKey));
  pageRows.forEach(r=>allSelected?demoHistorySelection.delete(r.selectionKey):demoHistorySelection.add(r.selectionKey));
  render();return;
 }
 if(act==='demo-history-delete-selected'||act==='demo-history-delete-all'){
  if(user?.role!=='admin')return;
  const keys=act==='demo-history-delete-all'?demoActivityRows().map(r=>r.selectionKey):[...demoHistorySelection];
  if(!keys.length)return;
  if(!window.confirm('Apagar '+keys.length+' registro(s) da demonstração deste aparelho? A ação não pode ser desfeita. O histórico autenticado não será alterado.'))return;
  const roundsToDelete=new Set(keys.filter(k=>k.startsWith('round:')).map(k=>k.slice(6)));
  const inspectionsToDelete=new Set(keys.filter(k=>k.startsWith('inspection:')).map(k=>Number(k.slice(11))));
  if(session&&roundsToDelete.has(session.id)){stopLocation();session=null;movement=null;locationFix=null;}
  sessions=sessions.filter(r=>!roundsToDelete.has(r.id));
  const savedInspections=demoInspectionRecords();
  const removedRequests=new Set(savedInspections.filter((_,i)=>inspectionsToDelete.has(i)).map(r=>r.requestId).filter(Boolean));
  try{
   localStorage.setItem(DEMO_INSPECTIONS,JSON.stringify(savedInspections.filter((_,i)=>!inspectionsToDelete.has(i))));
   if(removedRequests.size)saveDemoInspectionRequests(demoInspectionRequests().filter(r=>!removedRequests.has(r.id)));
   localStorage.setItem('rondas-pro-demo-history-edited','1');
  }catch{notify('Não foi possível gravar todas as exclusões locais. Verifique o armazenamento.');return;}
  demoHistorySelection.clear();persist();demoHistoryPage=0;render();
  notify(keys.length+' registro(s) locais excluído(s).');return;
 }
 if(act==='demo-history-prev'){demoHistoryPage=Math.max(0,demoHistoryPage-1);render();return;}
 if(act==='demo-history-next'){demoHistoryPage++;render();return;}
 if(act==='demo-request-inspection'){
  if(!['operador','coi','admin'].includes(user?.role))return;
  const clients=DEMO_CLIENTS.map(c=>c.name);
  showDialog('<div class="eyebrow">COI · NOVO CHAMADO</div><h2>Solicitar vistoria</h2><p>Escolha um local já cadastrado ou informe outro endereço. Esta solicitação é demonstrativa e só aparece neste navegador.</p><form id="demo-inspection-request" class="rp-inspection-request">'+
   '<div class="rp-request-fields"><label>Tipo de vistoria<select name="kind"><option value="demand">Solicitação específica</option><option value="routine">Vistoria de rotina</option></select></label>'+
   '<label>Vistoriador<select name="worker"><option value="Vistoriador demonstrativo">Vistoriador demonstrativo</option></select></label>'+
   '<label>Local cadastrado<select name="known"><option value="">Outro endereço</option>'+clients.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('')+'</select></label>'+
   '<label>Ou informe endereço<input type="text" name="address" maxlength="350" placeholder="Rua, número, bairro e cidade"></label>'+
   '<label>Coordenadas do destino (necessárias para o mapa quando o local não está cadastrado)<input name="coords" placeholder="-20.1450, -44.8880"></label>'+
   '<label>Rota do COI · pontos de passagem (opcional)<textarea name="routePoints" rows="3" placeholder="Um ponto por linha: latitude, longitude"></textarea></label>'+
   '<label>Instruções para a vistoria<textarea name="instructions" required minlength="10" maxlength="1000" placeholder="Informe a finalidade e o que deve ser verificado"></textarea></label></div>'+
   '<div class="modal-actions"><button class="button primary" type="submit">Enviar solicitação</button></div></form>',false);
  return;
 }
 if(act==='demo-inspection-detail'){const r=demoInspectionRecords()[Number(el.dataset.id)];if(r)showDialog('<h2>Vistoria · '+fmt(r.at)+'</h2><p>'+esc(r.notes)+'</p><p>Conformidade: '+r.score+'%</p><p>Local demonstrativo: '+esc(DEMO_WATCHERS[0].unit)+'</p>'+btn('Fechar','close-dialog','primary'),true);return;}
 if(act==='session-detail'){if(!canReviewDemo()&&user?.role!=='ronda')return;detailSession(el.dataset.id);return;}
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
 if(act==='demo-treatment-tab'){if(!canReviewDemo())return;demoTreatmentTab=el.dataset.kind;render();return;}

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
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-wizard-next],[data-wizard-back]');if(!target||!document.querySelector('#rp-demo-wizard-dialog[open]'))return;
 const form=document.querySelector('#demo-inspection-form');if(!form||!demoInspectionDraft)return;
 const updated=updateInspectionDraft(demoInspectionDraft,form),errors=inspectionProblems(updated);
 if(target.hasAttribute('data-wizard-next')&&errors.length){const el=form.querySelector('[data-wizard-error]');el.hidden=false;el.textContent=errors[0];return;}
 updated.step=Math.max(0,Math.min(stepCount()-1,updated.step+(target.hasAttribute('data-wizard-back')?-1:1)));
 demoInspectionDraft=updated;form.querySelector('.rp-field-wizard').outerHTML=inspectionWizardHtml(demoInspectionDraft,{demo:true});
});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-field-tool-torch],[data-field-tool-panic],[data-field-tool-chat],[data-field-tool-alert],[data-field-tool-incident]');
 if(!button||!presentation||user?.role!=='vistoriador')return;
 try{
  if(button.hasAttribute('data-field-tool-torch'))await torch.toggle();
  else if(button.hasAttribute('data-field-tool-chat'))openDemoChatOverlay(true);
  else if(button.hasAttribute('data-field-tool-incident'))incidentDialog();
  else if(button.hasAttribute('data-field-tool-alert'))alertDialog();
  else if(button.hasAttribute('data-field-tool-panic'))showDialog('<h2>Pânico · demonstração</h2><p>O acionamento real fica na Central autenticada. Esta tela não envia alarmes.</p><a class="button primary" href="./central.html">Abrir operação real</a>');
 }catch{notify('Ferramenta indisponível neste aparelho.')}
});
document.addEventListener('click',e=>{handleAction(e).catch(err=>{console.error(err);notify('Não foi possível concluir. Tente novamente.');})});
document.addEventListener('change',e=>{
  if(routePlanner.change(e.target))return;
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
document.addEventListener('input',e=>{routePlanner.input(e.target)});
document.addEventListener('change',e=>{adminSettings.change(e.target);if(e.target.id==='rp-dispatch-saved')dispatchWizard.click(e.target);});
document.addEventListener('change',e=>{if(e.target.id==='rp-live-route-select'){selectedLiveRouteId=e.target.value;render();}});
document.addEventListener('input',e=>{savedPointsAdmin.changed(e.target)});
document.addEventListener('input',e=>{dispatchWizard.changed(e.target)});
modal.addEventListener('change',e=>{if(e.target.id==='declaration-check'){const el=modal.querySelector('[data-action="confirm-start"]');if(el)el.disabled=!e.target.checked}if(e.target.id==='location-intro-check'){const b=modal.querySelector('[data-action="accept-location-notice"]');if(b)b.disabled=!e.target.checked}});

document.addEventListener('submit',async e=>{
 if(['live-create-user-form','role-permissions-form'].includes(e.target.id)){e.preventDefault();await adminSettings.submit(e.target);return;}
 if(e.target.id==='rp-saved-point-form'){e.preventDefault();await savedPointsAdmin.submit(e.target);return;}
  if(e.target.id==='rp-plan-form'){e.preventDefault();await routePlanner.submit(e.target);return;}
 if(e.target.id==='live-login-form'){
  e.preventDefault();const f=new FormData(e.target);e.target.querySelector('button').disabled=true;
  try{const r=await liveRequest('/login',{method:'POST',data:{email:String(f.get('identifier')||'').trim(),password:String(f.get('password')||'').trim()}});
   liveSession.token=r.token;await restoreLiveAccount();
  }catch(error){liveSession.token='';root.innerHTML=loginHtml(brand(),error.message);}
  return;
 }
 if(e.target.id==='inspector-create-form'){
  e.preventDefault();if(user?.role!=='vistoriador'||!user.id)return;
  const button=e.target.querySelector('button[type=submit]'),data=new FormData(e.target);
  const kind=data.get('kind')==='ronda'?'ronda':'inspection';
  const source=String(data.get('points')||'').trim(),routePoints=source?source.split(/\r?\n/).filter(Boolean).map(row=>{
   const [label,lat,lng]=row.split(';').map(x=>x.trim());
   return {label,lat:Number(lat),lng:Number(lng)};
  }):[];
  if(routePoints.length>12||routePoints.some(p=>!p.label||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180)){notify('Informe até 12 pontos válidos: nome;latitude;longitude.');return;}
  button.disabled=true;
  try{
   await liveRequest('/dispatches',{method:'POST',data:{workerId:user.id,kind,address:String(data.get('address')||'').trim(),reason:String(data.get('reason')||'').trim(),routePoints,
    ...(routePoints.length?{latitude:routePoints[0].lat,longitude:routePoints[0].lng}:{})}});
   await refreshLiveOperational();modal.close();render();notify(kind==='ronda'?'Ronda criada. Confira o mapa e inicie.':'Vistoria criada. Confira o mapa e inicie.');
  }catch(error){button.disabled=false;notify(error.message)}return;
 }
 if(e.target.id==='inspector-finish-round-form'){
  e.preventDefault();if(user?.role!=='vistoriador'||!user.id)return;
  const button=e.target.querySelector('button[type=submit]'),id=e.target.dataset.id,note=String(new FormData(e.target).get('note')||'').trim();
  button.disabled=true;try{
   await liveRequest('/dispatches/'+encodeURIComponent(id)+'/complete',{method:'POST',data:{note,position:demoInspectorLocation||null}});
   await refreshLiveOperational();modal.close();render();notify('Ronda concluída e registrada no histórico.');
  }catch(error){button.disabled=false;notify(error.message)}return;
 }
 if(e.target.id==='live-route-form'){
  e.preventDefault();const data=new FormData(e.target);
  try{
   const points=String(data.get('points')||'').trim().split(/\\r?\\n/).filter(Boolean).map(line=>{const [name,lat,lng]=line.split(';').map(x=>x.trim());return {name,lat:Number(lat),lng:Number(lng)};});
   await liveRequest('/routes',{method:'POST',data:{userId:data.get('userId'),name:data.get('name'),points}});
   await refreshLiveOperational();render();notify('Rota salva e atribuida.');
  }catch(error){notify(error.message)}return;
 }
 if(e.target.id==='live-dispatch-form'){e.preventDefault();await dispatchWizard.submit(e.target);return;}
 if(e.target.id==='live-inspection-form'){
  e.preventDefault();const data=new FormData(e.target),dispatchId=e.target.dataset.dispatch,button=e.target.querySelector('button');button.disabled=true;
  try{
   const note=String(data.get('note')||'').trim();if(note.length<10)throw new Error('Relato curto');
   const criteria=Object.fromEntries(['acessos','estrutura','equipamentos','sinalizacao'].map(k=>[k,data.get(k)==='true']));
   const event=await liveRequest('/events',{method:'POST',data:{kind:'inspection',occurredAt:Date.now(),roundId:dispatchId,description:note,details:{criteria,dispatchId}}});
   for(const [name,view] of [['selfie','selfie'],['local','front']]){
    const file=data.get(name);if(!(file instanceof File)||!file.size)throw new Error('Foto obrigatoria ausente');
    if(!isPagesTestMode()){
     const upload=await fetch('/api/media',{method:'POST',headers:{Authorization:'Bearer '+liveSession.token,'Content-Type':file.type,'X-Ronda-Event-Id':event.id,'X-Media-View':view},body:file});
     if(!upload.ok){const response=await upload.json().catch(()=>({}));throw new Error(response.error||'Erro no envio da foto');}
    }
   }
   await liveRequest('/dispatches/'+encodeURIComponent(dispatchId)+'/complete',{method:'POST',data:{note}});
   modal.close();await refreshLiveOperational();render();notify(isPagesTestMode()?'Vistoria de teste salva somente neste navegador.':'Vistoria concluida e fotos registradas.');
  }catch(error){button.disabled=false;notify(error.message)}return;
 }
 if(e.target.id==='live-create-user-form'){
  e.preventDefault();if(user?.role!=='admin')return;
  try{await liveRequest('/users',{method:'POST',data:Object.fromEntries(new FormData(e.target))});await refreshLiveUsers();modal.close();render();notify('Profissional cadastrado no banco de dados.');}
  catch(error){notify(error.message);}
  return;
 }
 if(e.target.id==='demo-chat-form'){e.preventDefault();const message=String(new FormData(e.target).get('body')||'').trim();if(!liveChatId||!message)return;const button=e.target.querySelector('button');button.disabled=true;try{await liveRequest('/chat/conversations/'+encodeURIComponent(liveChatId)+'/messages',{method:'POST',data:{body:message,id:crypto.randomUUID()}});await refreshRealChat();if(document.querySelector('#rp-demo-chat-overlay'))openDemoChatOverlay(false);else render();}catch(error){button.disabled=false;notify(error.message)}return;}

 if(e.target.id==='demo-inspection-form'){
  e.preventDefault();if(user?.role!=='vistoriador')return;
  const f=new FormData(e.target),pending=demoPendingInspection();
  if(!pending||!pending.arrivedAt||pending.id!==f.get('requestId')){notify('Solicitação indisponível.');return;}
  demoInspectionDraft=updateInspectionDraft(demoInspectionDraft,e.target);
  if(demoInspectionDraft.step!==stepCount()-1){notify('Avance até a última etapa.');return;}
  const problems=inspectionProblems(demoInspectionDraft,{final:true});if(problems.length){notify(problems[0]);return;}
  if(!f.get('confirmation')||!f.get('selfie')?.size||!f.getAll('localPhoto').some(file=>file?.size)){notify('Confirme a vistoria, selfie e fotos do local.');return;}
  const result=inspectionPayload(demoInspectionDraft),verified=Object.values(result.verified),
   checked=verified.filter(x=>x.checked.length),normal=checked.filter(x=>!x.anomaly);
  const score=checked.length?Math.round(normal.length/checked.length*100):null,at=Date.now();
  try{
   localStorage.setItem(DEMO_INSPECTIONS,JSON.stringify([{at,notes:result.observation,score,address:pending.address,requestId:pending.id,verified:result.verified},...demoInspectionRecords()].slice(0,100)));
   saveDemoInspectionRequests(demoInspectionRequests().map(r=>r.id===pending.id?{...r,completedAt:at}:r));
  }catch{notify('Não foi possível salvar a vistoria.');return;}
  demoInspectionDraft=null;demoWizardAutoId=null;render();notify('Vistoria concluída na demonstração. Fotos não enviadas ao servidor.');return;
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
 if(e.target.id==='demo-inspection-request'){
  if(!['operador','coi','admin'].includes(user?.role))return;
  const known=String(f.get('known')||'').trim(),address=String(f.get('address')||'').trim()||known,instructions=String(f.get('instructions')||'').trim();
  if(address.length<5||instructions.length<10){notify('Informe um destino e instruções suficientes.');return;}
  try{
   const parsePoint=value=>{const p=String(value||'').trim().split(/[,;\s]+/).map(Number);return p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180?{lat:p[0],lng:p[1]}:null;};
   const coords=String(f.get('coords')||'').trim(),lines=String(f.get('routePoints')||'').trim();
   const demoSite=!String(f.get('address')||'').trim()&&known?DEMO_CLIENTS.find(c=>c.name===known):null;
   const destination=coords?parsePoint(coords):demoSite?.demoPoint??null,routePoints=lines?lines.split(/\r?\n/).filter(Boolean).map(parsePoint):[];
   if((coords&&!destination)||routePoints.length>12||routePoints.some(p=>!p)){notify('Confira as coordenadas. Informe até 12 pontos no formato latitude, longitude.');return;}
   if(!destination){notify('Para desenhar o trajeto, selecione um local conhecido ou informe as coordenadas do destino.');return;}
   saveDemoInspectionRequests([{id:crypto.randomUUID(),address,instructions,routine:f.get('kind')==='routine',worker:String(f.get('worker')),latitude:destination?.lat??null,longitude:destination?.lng??null,routePoints,illustrative:!!demoSite&&!coords,createdAt:Date.now(),completedAt:null},...demoInspectionRequests()]);
  }catch{notify('Não foi possível salvar a solicitação.');return;}
  modal.close();render();notify('Solicitação salva. Abra o perfil Vistoriador para recebê-la.');return;
 }

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
 if(e.target.id==='field-alert-form'){const submit=e.target.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;try{const status=await recordFieldNotice('alert',String(f.get('description')).trim());modal.close();render();notify(status);}catch{submit.disabled=false;notify('Não foi possível salvar o alerta. Tente novamente.');}return;}
 if(e.target.id==='incident-form'){if(!session||session.status!=='active'){const status=await recordFieldNotice('incident',f.get('title')+' · '+f.get('description'),{category:f.get('category'),severity:f.get('severity')},e.target);modal.close();render();notify(status);return;}const i=registerIncident(session,{title:f.get('title'),description:f.get('description'),severity:f.get('severity')});if(!i){notify('Preencha título e descrição com detalhes suficientes.');return;}i.category=f.get('category');await ops.attachIncidentMedia(i,e.target);await ops.recordIncident(i);save();modal.close();render();notify('Ocorrência registrada e exibida na supervisão · simulação local.');return;}
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
 render,save,persist,notify,showDialog,incidentDialog,alertDialog,
 openChat:()=>{openDemoChatOverlay(true);},
 closeDialog:()=>modal.close(),
 showClient:()=>{notify('O acompanhamento do cliente está disponível para análise na Administração.');}
});
const torch=createFieldTorch({notify});
const curtain=createCheckpointCurtain({get:()=>({user,view,session,locationFix}),recordCheckpoint:(checkpoint,files,point)=>ops.recordCheckpoint(checkpoint,files,point),save,render,notify,torch});
const locationGate=createLocationEntryGate({onGranted:fix=>{
 if(!presentation)locationFix=fix;
 const map=liveMaps.find(x=>x?.container?.id==='mobile-map');
 if(map?.instance){map.instance.flyTo([fix.lat,fix.lng],17,{animate:true,duration:.8});setTimeout(()=>map.fit(),1800)}
 notify('Localização autorizada. Confira sua posição no mapa e toque em Iniciar ronda.');
 // O guia permanece disponível após a autorização, sem encobrir a cortina de localização.
}});
(async()=>{try{seedDemoThree();if(isPagesTestMode()){await activatePagesRole('admin');openAreaPicker();}else if(liveSession.token)await restoreLiveAccount();else render();}catch{liveLogout();notify('Entre novamente para acessar seus dados.');}})();
if(window.AndroidTracking&&session?.status==='active')setTimeout(syncNativeHistory,300);
