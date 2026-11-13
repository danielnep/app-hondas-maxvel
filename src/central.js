import './location-disclosure.js';
import {createSectorPanel} from './sector-management-ui.js';
import {createSpotlightTour} from './tutorial.js';
import {decorateTheme} from './theme-shell.js';
import {verificationSettingsHtml,saveVerificationSettings,renderQrLabels} from './verification-settings-ui.js';
let centralVerificationSettings={verificationMode:'gps',dwellSeconds:30};
import {isPagesTestMode} from './pages-test-api.js';
import {createInternalChatUI} from './internal-chat-ui.js';
import {createChatCalls} from './internal-chat-calls.js';
import {createActivityHistoryUI} from './activity-history-ui.js';
import {EVENT_TYPES,typeInfo,isPending,stateLabel} from './treatment-policy.js';
import {createXlsxReport} from './report-xlsx.js';
import {createRouteBoard} from './route-board.js';
import {nextRouteStart} from './route-schedule.js';
import {openConclusionDialog} from './conclusion-dialog.js';
import {createOpsCenterUI} from './ops-center-ui.js';
import {createCoiMonitor} from './coi-monitor.js';
import {createMediaCapture,evidenceButtons} from './media-capture.js';
import {PatrolMap} from './map.js';
import {queueInspections,inspectionRoute,inspectionSignature,pointOf,metersBetween} from './inspection-queue.js';
import {inspectionCockpit,inspectionStops} from './inspection-cockpit.js';
import {emptyInspectionDraft,inspectionWizardHtml,updateInspectionDraft,inspectionProblems,inspectionPayload,stepCount} from './field-inspection-wizard.js';
import {buildGuardRoute,buildGuardStandbyRoute,nextGuardState,markGuardPoint,initialGuardState,guardCockpit,mountGuardQuickPanel,GUARD_RADIUS_METERS,GUARD_DWELL_MS} from './field-guard-circuit.js';
import {searchPlaces,searchFocus,distanceLabel,getLearnedPlaces,recordLearnedPlace,searchPlacesWithLearned} from './place-search.js';
import {createFieldTorch} from './field-torch.js';
window.__centralJsReady=true;if(window.__centralTimer)clearTimeout(window.__centralTimer);
const root=document.querySelector('#central-root'),exit=document.querySelector('#exit'),roleTag=document.querySelector('#current-role'),notice=document.querySelector('#notice');
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'Não informado';
const id=x=>escape(x);
const friendly={message:'Mensagem à central',panic:'Pânico',gps:'Posição GPS',battery:'Bateria',incident:'Ocorrência',checkpoint:'Ponto',alert:'Alerta por e-mail',gps_issue:'Falha GPS',route_deviation:'Possível desvio',patrol_start:'Início da ronda',patrol_end:'Término',inspection:'Inspeção operacional',patrol_interrupted:'Ronda interrompida',patrol_incomplete:'Ronda incompleta'};
let composeKind='message';
const eventResponseDrafts=new Map();
function retainEventDraft(){const form=document.querySelector('#send-message[data-event-id]');if(form)eventResponseDrafts.set(form.dataset.eventId,{body:form.querySelector('textarea')?.value||'',audience:form.querySelector('[name=audience]')?.value});}
document.addEventListener('input',event=>{if(event.target.closest('#send-message'))retainEventDraft();});
const coi=createCoiMonitor({api:(p,opt)=>api(p,opt),notify:flash});
let token=sessionStorage.getItem('rondaspro_api_token')||(typeof localStorage!=='undefined'?localStorage.getItem('rondaspro_android_token'):'')||'',account=null,page='dashboard',events=[],users=[],dashboard=null,mySummary=null,rounds=[],routes=[],templates=[],selected=null,messages=[],media=[],emailJobs=[],recentMediaUrls=[],treatments=[];
if(token.startsWith('local-offline:')&&!isPagesTestMode()){token='';sessionStorage.removeItem('rondaspro_api_token');}
let inspectorPosition=null,inspectorWatch=null,inspectorSignature='',inspectorBase=null,inspectorPresenceAt=0,guardSosActive=false,guardTorchActive=false;
try{const saved=JSON.parse(sessionStorage.getItem('rondaspro-inspector-base')||'null');inspectorBase=pointOf(saved)}catch{}
function inspectionQueueNow(){return queueInspections(ops.inspectionDispatches(),inspectorPosition,inspectorBase)}
function inspectionPosition(){return pointOf(inspectorPosition)||pointOf(inspectorBase)}
function updateInspectorGps(fix){
 inspectorPosition=fix;
 if(inspectionMap){
  if(!inspectionMap.route.baseKnown){
   const queue=inspectionQueueNow();
   inspectionMap.setRoute(inspectionRoute(queue,fix),queue.length?{mode:'real',currentId:queue[0].id,checkpoints:[],deviations:[]}:null);
  }
  inspectionMap.update({position:fix});
 }
 if(account?.role==='vistoriador'&&Date.now()-inspectorPresenceAt>12000){
  inspectorPresenceAt=Date.now();
  void api('/presence',{method:'POST',data:{position:fix}}).catch(()=>{});
 }
 const status=document.querySelector('[data-inspection-gps-state]');
 if(status)status.textContent='GPS ativo · precisão '+Math.round(fix.accuracy||0)+' m';
 const next=inspectionQueueNow()[0],target=pointOf(next),distance=target?metersBetween(fix,target):Infinity;
 const label=document.querySelector('[data-inspection-distance]');
 if(label)label.textContent=Number.isFinite(distance)?'Distância em linha reta · '+(distance>=1000?(distance/1000).toFixed(1)+' km':Math.round(distance)+' m'):'Destino sem coordenadas';
}
function stopInspectorGps(){if(inspectorWatch!=null){navigator.geolocation?.clearWatch(inspectorWatch);inspectorWatch=null;}}
function startInspectorGps(){
 if(inspectorWatch!=null)return true;
 if(!navigator.geolocation){flash('GPS não disponível neste aparelho.');return false;}
 inspectorWatch=navigator.geolocation.watchPosition(pos=>{
  if(pos.coords.accuracy>150){const el=document.querySelector('[data-inspection-gps-state]');if(el)el.textContent='Precisão GPS baixa · '+Math.round(pos.coords.accuracy)+' m';return;}
  updateInspectorGps({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:pos.timestamp||Date.now()});
  // As amostras de campo ficam sincronizadas enquanto a página permanece ativa.
 },error=>{const el=document.querySelector('[data-inspection-gps-state]');if(el)el.textContent='GPS indisponível · '+error.message;},
  {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
 return true;
}
async function getInspectorFix(){
 if(!navigator.geolocation)throw Error('Ative a localização para sair da base.');
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>{
  const fix={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at:p.timestamp};
  if(!Number.isFinite(fix.lat)||!Number.isFinite(fix.lng)||fix.accuracy>150)reject(Error('Aguarde uma posição GPS confiável (precisão até 150 m).'));
  else{updateInspectorGps(fix);resolve(fix);}
 },()=>reject(Error('Permita o acesso ao GPS para iniciar o deslocamento.')),{enableHighAccuracy:true,timeout:15000,maximumAge:5000}));
}
function refreshInspectorStops(){
 if(account?.role!=='vistoriador'||page!=='inspections')return;
 const queue=inspectionQueueNow(),sig=inspectionSignature(queue);
 if(sig===inspectorSignature)return;
 inspectorSignature=sig;
 const list=document.querySelector('[data-inspection-stops]');
 if(list)list.innerHTML=inspectionStops(queue);
 const count=document.querySelector('[data-inspection-queue-count]');
 if(count)count.textContent=String(queue.length);
 if(inspectionMap){
  const route=inspectionRoute(queue,inspectionPosition());
  inspectionMap.setRoute(route,queue.length?{mode:'real',currentId:queue[0]?.id,checkpoints:[],deviations:[]}:null);
 }
 // Não descartar o formulário em edição ao receber uma solicitação nova.
 const editing=document.querySelector('#inspection-form');
 if(!editing)render();
 else flash('Nova vistoria recebida: circuito atualizado no mapa.');
}
let guardRound=null,guardMap=null,guardFix=null,guardWatch=null,guardSampleAt=0,guardPresenceSampleAt=0,guardCurrentUserId='',lastNotifiedDispatchId='',guardLastSampleFix=null,guardLastSampleAt=0;
const guardStorageKey=()=>account?'rondas-pro-real-guard-'+account.id:null;
function guardLoadState(){
 if(account?.role!=='ronda'){guardRound=null;guardCurrentUserId='';lastNotifiedDispatchId='';return;}
 if(guardCurrentUserId===account.id)return;
 guardCurrentUserId=account.id;
 try{lastNotifiedDispatchId=guardDispatch()?.id||'';}catch{}
 try{
  guardRound=JSON.parse(localStorage.getItem(guardStorageKey())||'null');
  if(!guardRound||guardRound.completedAt||!Array.isArray(guardRound.points)||!guardRound.startedAt||guardRound.routeId==='centro-sul'){
   guardRound=null;
   localStorage.removeItem(guardStorageKey());
  }
 }catch{guardRound=null;}
}
function guardSave(){
 const key=guardStorageKey();if(!key)return;
 if(guardRound)localStorage.setItem(key,JSON.stringify(guardRound));else localStorage.removeItem(key);
}
// O COI pode enviar uma ronda diretamente como despacho, além das rotas programadas.
function guardDispatch(){
 const all=ops.monitoringData().dispatches||[];
 if(guardRound?.dispatchId)return all.find(d=>d.id===guardRound.dispatchId)||null;
 if(guardRound)return null;
 return all.filter(d=>!d.completed_at).sort((a,b)=>Number(b.created_at||0)-Number(a.created_at||0))[0]||null;
}
function guardDispatchRoute(d){
 if(!d)return null;
 let points=d.route_points||d.routePoints||[];
 if(typeof points==='string'){try{points=JSON.parse(points)}catch{points=[]}}
 if(!Array.isArray(points))points=[];
 points=points.map((p,i)=>({lat:Number(p.lat),lng:Number(p.lng),name:p.name||p.label||'Destino '+(i+1)}))
   .filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180);
 if(!points.length&&d.latitude!=null&&d.longitude!=null){
  const lat=Number(d.latitude),lng=Number(d.longitude);
  if(Number.isFinite(lat)&&Number.isFinite(lng))points=[{lat,lng,name:d.address||'Destino'}];
 }
 return {id:d.id,dispatchId:d.id,name:d.address||'Ronda solicitada pelo COI',site:d.site||account.site,points};
}
const DEFAULT_OPERATIONAL_ROUTE = Object.freeze({
 id:'centro-sul',name:'Ronda Operacional Urbana · Circuito Centro-Sul',site:'Grupo Maxvel',
 points:[
  {name:'Posto 01 · Portaria & Complexo Praça da Liberdade',lat:-20.14020,lng:-44.88366},
  {name:'Posto 02 · Estacionamento e Perímetro Sul',lat:-20.14052,lng:-44.88338},
  {name:'Posto 03 · Acesso Técnico e Subestação',lat:-20.14088,lng:-44.88370},
  {name:'Posto 04 · Guarita dos Fundos e Almoxarifado',lat:-20.14067,lng:-44.88406}
 ],
 base:{id:'base',name:'Base Operacional',lat:-20.14030,lng:-44.88400}
});
let customGuardDestination=null;
let guardSearchActiveAbort=null;
let guardSearchDebounce=null;
let activePinnedLocation=null;
let manualPinModeActive=false;

function guardPlannedRoute(){
 if(customGuardDestination){
  const activeBase=guardRound?.base||guardFix||DEFAULT_OPERATIONAL_ROUTE.base;
  return {
   id:'custom-pinned-destination',
   name:'Destino: '+customGuardDestination.name,
   site:account?.site||'Grupo Maxvel',
   roadRouting:true,
   base:activeBase,
   points:[
    {
     id:'pinned-point-1',
     name:customGuardDestination.name,
     instruction:customGuardDestination.address||'Verificar chegada e perímetro do local marcado.',
     lat:customGuardDestination.lat,
     lng:customGuardDestination.lng,
     radius:35
    }
   ]
  };
 }
 if(guardRound?.dispatchId){
  const d=guardDispatch();return guardDispatchRoute(d)||{id:guardRound.dispatchId,dispatchId:guardRound.dispatchId,name:guardRound.routeName,site:account?.site||'Grupo Maxvel',points:guardRound.points};
 }
 if(guardRound)return routes.find(r=>r.id===guardRound.routeId)||{id:guardRound.routeId,name:guardRound.routeName,site:account?.site||'Grupo Maxvel',points:guardRound.points};
 const dispatch=guardDispatch();
 return dispatch?guardDispatchRoute(dispatch):(routes[0]||null);
}
function guardStopGps(){if(guardWatch!=null){navigator.geolocation?.clearWatch(guardWatch);guardWatch=null;}}
function guardUpdateFix(fix){
 if(!pointOf(fix))return;
 const isFirstFix=!guardFix;
 guardFix=fix;
 try{localStorage.setItem('rp_guard_last_fix',JSON.stringify(fix));}catch{}
 if(guardMap){
  // Primeiro GPS real define a base visual antes mesmo de iniciar a ronda.
  if(!guardRound&&!guardMap.route.baseKnown){
   const planned=guardPlannedRoute();
   if(planned){
    const revised=buildGuardRoute(planned,fix);
    if(revised){guardMap.standbyClean=false;guardMap.setRoute(revised,null);}
   }else{
    guardMap.route.baseKnown=true;
    guardMap.route.base={...fix,id:'base',name:'Minha posição atual'};
    guardMap.standbyClean=true;
   }
  }
  guardMap.update({position:fix});
  if((isFirstFix||(guardMap.autoFollow&&!guardMap.manualUnlock))&&Number.isFinite(fix.lat)&&Number.isFinite(fix.lng)){
   guardMap.recenterGPS();
  }
 }
 const info=(guardRound&&Number.isFinite(fix.accuracy)&&fix.accuracy<=GUARD_RADIUS_METERS)?nextGuardState(guardRound,guardFix):null;
 if(info&&guardRound.insideSince!=null&&!info.inside){guardRound=info.state;guardSave();render();}
 const gps=document.querySelector('[data-guard-gps]');if(gps)gps.textContent='GPS ativo · precisão '+(Number.isFinite(fix.accuracy)?Math.round(fix.accuracy)+' m':'ok');
 const distance=document.querySelector('[data-guard-distance]');if(distance&&info)distance.textContent=Math.round(info.distance)+' m do próximo ponto';
 // Telemetria de presença enviada ao COI mesmo em standby para que a ronda seja vista no mapa tático
 if(Date.now()-guardPresenceSampleAt>30000){
  guardPresenceSampleAt=Date.now();
  void api('/presence',{method:'POST',data:{position:fix}}).catch(()=>{});
 }
 if(guardRound&&Number.isFinite(fix.accuracy)&&fix.accuracy<=60){
  const nowMs=(fix.at&&fix.at>1000000000000)?fix.at:Date.now();
  if(!guardLastSampleFix||!guardLastSampleAt){
   guardLastSampleFix=fix;guardLastSampleAt=nowMs;
   void api('/events',{method:'POST',data:{kind:'gps',roundId:guardRound.id,occurredAt:nowMs,description:'GPS em ronda',position:fix,gap:false}}).catch(()=>{});
  }else{
   const dt=nowMs-guardLastSampleAt;
   if(dt>0){
    const dist=metersBetween(guardLastSampleFix,fix);
    const speedKmh=(dist/(dt/1000))*3.6;
    if(!(speedKmh>120&&dist>30)){
     const isGap=dt>=180000;
     const curSpd=Number.isFinite(fix.speed)?fix.speed:(dist/(dt/1000));
     if(isGap||curSpd>=0.6||dist>=5){
      let curveChanged=false;
      if(Number.isFinite(fix.heading)&&Number.isFinite(guardLastSampleFix.heading)&&dist>=8){
       let diff=Math.abs(fix.heading-guardLastSampleFix.heading);
       if(diff>180)diff=360-diff;
       if(diff>=25)curveChanged=true;
      }
      const shouldSample=isGap||dist>=15||curveChanged||(dt>=20000&&dist>=10);
      if(shouldSample){
       guardLastSampleFix=fix;guardLastSampleAt=nowMs;
       void api('/events',{method:'POST',data:{kind:'gps',roundId:guardRound.id,occurredAt:nowMs,description:'GPS em ronda',position:fix,gap:isGap}}).catch(()=>{});
      }
     }
    }
   }
  }
 }
}
function guardStartGps(){
 if(account?.role!=='ronda')return;
 if(!window._nativeLocationAttached){
  window._nativeLocationAttached=true;
  window.addEventListener('rondapro:native-location',e=>{
   if(e.detail)guardUpdateFix(e.detail);
  });
 }
 if(window.__rondaNativeFix&&pointOf(window.__rondaNativeFix)){
  guardUpdateFix(window.__rondaNativeFix);
 }else{
  try{
   const saved=JSON.parse(localStorage.getItem('rp_guard_last_fix')||'null');
   if(saved&&pointOf(saved)&&(Date.now()-(saved.at||0)<60000))guardUpdateFix(saved);
  }catch{}
 }
 if(guardWatch!=null||!navigator.geolocation)return;
 navigator.geolocation.getCurrentPosition(p=>{
  const at=(p.timestamp&&p.timestamp>1000000000000)?p.timestamp:Date.now();
  guardUpdateFix({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,heading:p.coords.heading,speed:p.coords.speed,at});
 },()=>{},{enableHighAccuracy:true,timeout:8000,maximumAge:0});
 guardWatch=navigator.geolocation.watchPosition(p=>{
  const at=(p.timestamp&&p.timestamp>1000000000000)?p.timestamp:Date.now();
  guardUpdateFix({
   lat:p.coords.latitude,
   lng:p.coords.longitude,
   accuracy:p.coords.accuracy,
   heading:p.coords.heading,
   speed:p.coords.speed,
   at
  });
 },e=>{
  const el=document.querySelector('[data-guard-gps]');if(el)el.textContent='GPS indisponível · '+e.message;
 },{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
}
function guardRequireGps(){return new Promise((resolve,reject)=>{
 const now=Date.now();
 if(guardFix&&Number.isFinite(guardFix.lat)&&(now-(guardFix.at||0)<15000)){
  if(Number.isFinite(guardFix.accuracy)&&guardFix.accuracy>GUARD_RADIUS_METERS){
   reject(Error('GPS impreciso: '+Math.round(guardFix.accuracy)+' m. Aguarde até '+GUARD_RADIUS_METERS+' m.'));
   return;
  }
  resolve(guardFix);
  return;
 }
 if(window.__rondaNativeFix&&Number.isFinite(window.__rondaNativeFix.lat)){
  resolve(window.__rondaNativeFix);return;
 }
 if(!navigator.geolocation){
  const simFix={lat:-20.14030,lng:-44.88400,accuracy:10,at:Date.now()};
  guardUpdateFix(simFix);resolve(simFix);return;
 }
 const timeoutId=setTimeout(()=>{
  const fallbackFix=guardFix||{lat:-20.14030,lng:-44.88400,accuracy:12,at:Date.now()};
  guardUpdateFix(fallbackFix);resolve(fallbackFix);
 },5000);
 navigator.geolocation.getCurrentPosition(p=>{
  clearTimeout(timeoutId);
  const at=(p.timestamp&&p.timestamp>1000000000000)?p.timestamp:Date.now();
  const fix={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at};
  guardUpdateFix(fix);resolve(fix);
 },()=>{
  clearTimeout(timeoutId);
  const fallbackFix=guardFix||{lat:-20.14030,lng:-44.88400,accuracy:12,at:Date.now()};
  guardUpdateFix(fallbackFix);resolve(fallbackFix);
 },{enableHighAccuracy:true,maximumAge:5000,timeout:6000});
});}
function guardEvent(kind,description,details={},position=guardFix){
 return api('/events',{method:'POST',data:{kind,roundId:guardRound.id,occurredAt:Date.now(),description,details,position}});
}
function guardTick(){
 if(account?.role!=='ronda'||page!=='dashboard'||!guardRound||!guardRound.insideSince)return;
 const checked=nextGuardState(guardRound,guardFix);
 if(!checked.inside){guardRound=checked.state;guardSave();const el=document.querySelector('[data-guard-timer]');if(el)el.textContent='Você saiu do raio: cronômetro reiniciado.';return;}
 const remaining=Math.max(0,Math.ceil((GUARD_DWELL_MS-checked.elapsed)/1000));
 const el=document.querySelector('[data-guard-timer]');if(el)el.textContent=remaining?'Permanência GPS: '+remaining+' s restantes':'Permanência concluída. Confirme o ponto.';
 const button=document.querySelector('[data-guard-checkpoint]');if(button)button.disabled=remaining>0;
}
let inspectorDraft=null,inspectorWizardAutoId=null;
let treatmentTab='incident',treatmentRows=[],treatmentMore=false,treatmentOffset=0,eventHistory=[],detailOrigin='events',claimedEvent=null,remoteSyncing=false,inspectionMap=null,inspectorSelfie=null;
const claimSession=sessionStorage.getItem('rondaspro-treatment-session')||crypto.randomUUID();
sessionStorage.setItem('rondaspro-treatment-session',claimSession);
let occurrenceFilters={status:'pending',kind:'all',worker:'all',reviewer:'all',dateFrom:'',dateTo:'',query:''};
let previousPageBeforeChat='dashboard';
const chat=createInternalChatUI({api,flash,getAccount:()=>account,getPreviousPage:()=>previousPageBeforeChat,navigate:next=>{selected=null;if(next==='chat'&&page!=='chat')previousPageBeforeChat=page;page=next;render();requestAnimationFrame(()=>void chat.mount())}});
const calls=createChatCalls({api,flash,chat,getAccount:()=>account});
const activity=createActivityHistoryUI({api,flash,openEvent:async id=>{await openEvent(id,'activity-history')}});
let latestActivity='';
const roles={ronda:'Agente de Ronda',operador:'Monitoramento',coi:'COI',admin:'Administrador',master:'Master',cliente:'Cliente',vistoriador:'Agente de Ronda Técnico'};
function flash(text){notice.textContent=text;notice.classList.add('visible');setTimeout(()=>notice.classList.remove('visible'),4800)}
const torch=createFieldTorch({notify:flash});
const inspectorCapture=createMediaCapture({notify:flash});let inspectorEvidence=[],fieldMessageEvidence=[],inspectorSubmission=null;
function queueOfflineMutation(path,method,data){
 if(!path||method==='GET'||data===undefined)return;
 try{
  const queue=JSON.parse(localStorage.getItem('ronda_offline_sync_queue')||'[]');
  if(path==='/presence'){
   const idx=queue.findIndex(item=>item.path==='/presence');
   if(idx!==-1)queue.splice(idx,1);
  }
  queue.push({path,method,data,at:Date.now()});
  localStorage.setItem('ronda_offline_sync_queue',JSON.stringify(queue));
  updateOfflineSyncBadge();
 }catch{}
}
function updateOfflineSyncBadge(){
 try{
  const queue=JSON.parse(localStorage.getItem('ronda_offline_sync_queue')||'[]');
  const chipStatus=document.querySelector('#guard-chip-map-status');
  const isOnline=typeof navigator==='undefined'||navigator.onLine!==false;
  if(chipStatus){
   if(!isOnline){
    chipStatus.textContent=queue.length?`📡 Offline · ${queue.length} pendente(s)`:'📡 Divinópolis Offline';
   }else{
    chipStatus.textContent=queue.length?`🔄 Sincronizando (${queue.length})`:'🌐 Mapa Online · Divinópolis';
   }
  }
 }catch{}
}
async function drainOfflineSyncQueue(){
 if((typeof navigator!=='undefined'&&navigator.onLine===false)||!token||token.startsWith('local-offline:'))return;
 let queue;
 try{queue=JSON.parse(localStorage.getItem('ronda_offline_sync_queue')||'[]');}catch{queue=[];}
 if(!queue.length)return;
 const remaining=[];
 let syncedCount=0;
 for(const item of queue){
  try{
   const res=await fetch('/api'+item.path,{
    method:item.method||'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(item.data)
   });
   if(res.ok){syncedCount++;}
   else if(res.status>=500){remaining.push(item);}
  }catch{
   remaining.push(item);
   break;
  }
 }
 try{localStorage.setItem('ronda_offline_sync_queue',JSON.stringify(remaining));}catch{}
 updateOfflineSyncBadge();
 if(syncedCount>0&&typeof notice!=='undefined'){
  flash(`✓ Dados transmitidos: ${syncedCount} registro(s) sincronizado(s) com o COI.`);
 }
}
if(typeof window!=='undefined'){
 window.addEventListener('online',()=>{updateOfflineSyncBadge();void drainOfflineSyncQueue();});
 window.addEventListener('offline',()=>{updateOfflineSyncBadge();});
 setInterval(()=>{if(typeof navigator==='undefined'||navigator.onLine!==false)void drainOfflineSyncQueue();},6000);
}
async function api(path,{method='GET',data,headers={},raw,timeout=12000}={}){
 if(isPagesTestMode()&&(token?.startsWith('local-offline:')||(!navigator.onLine&&account))){
  const p=path.split('?')[0];
  if(method!=='GET'&&['/events','/presence','/chat','/dispatches'].some(pref=>p.startsWith(pref))){
   queueOfflineMutation(path,method,data);
  }
  if(p==='/me')return {user:account};
  if(p==='/routes'&&method==='POST'){
   try{
    const saved=JSON.parse(localStorage.getItem('rp_offline_routes')||'[]');
    const item={...data,id:'rt-'+Date.now(),site:account?.site||'Grupo Maxvel',createdAt:Date.now(),updatedAt:Date.now()};
    saved.unshift(item);
    localStorage.setItem('rp_offline_routes',JSON.stringify(saved));
    return {id:item.id,created:true};
   }catch{return {id:'rt-'+Date.now(),created:true};}
  }
  if(p==='/routes'){
   try{return {routes:JSON.parse(localStorage.getItem('rp_offline_routes')||'[]')};}catch{return {routes:[]};}
  }
  if(p==='/users')return {users:[{id:'local-ronda',name:'Agente de Ronda',username:'ronda',email:'ronda@rondapro.local',role:'ronda',site:'Grupo Maxvel',active:1},{id:'local-vistoriador',name:'Vistoriador',username:'vistoriador',email:'vistoriador@rondapro.local',role:'vistoriador',site:'Grupo Maxvel',active:1}]};
  if(p==='/rounds')return {rounds:[]};
  if(p==='/dashboard')return {metrics:[],team:[]};
  if(p==='/event-treatments')return {treatments:[]};
  if(p==='/treatment-records')return {events:[],hasMore:false,nextOffset:0};
  if(p==='/email-jobs')return {jobs:[]};
  if(p==='/operational-settings')return {settings:{}};
  if(p==='/my-summary')return {metrics:[{kind:'patrol',count:1}],rounds:[]};
  if(p==='/templates')return {templates:[]};
  if(p==='/events')return {id:'evt-'+Date.now(),ok:true};
  if(p.startsWith('/dispatches'))return {ok:true,dispatches:[]};
  if(p==='/presence')return {ok:true};
  if(p.startsWith('/chat/'))return {ok:true,messages:[]};
  if(p==='/notifications')return {notifications:[]};
  if(p==='/export')return {messages:[]};
 }
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error('Tempo limite de rede excedido')),timeout);
  const res=await fetch('/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!raw&&data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:raw??(data===undefined?undefined:JSON.stringify(data)),signal:controller.signal}).finally(()=>clearTimeout(timer));
  if(!res.ok){let msg='Falha HTTP '+res.status;try{msg=(await res.json()).error||msg}catch{}const error=new Error(msg);error.status=res.status;throw error}
  return res.headers.get('content-type')?.includes('application/json')?res.json():res.blob();
 }catch(error){
  if(isPagesTestMode()&&account&&!error.status){
   const p=path.split('?')[0];
   if(method!=='GET'&&['/events','/presence','/chat','/dispatches'].some(pref=>p.startsWith(pref))){
    queueOfflineMutation(path,method,data);
   }
   if(p==='/me')return {user:account};
   if(p==='/routes'){
    try{return {routes:JSON.parse(localStorage.getItem('rp_offline_routes')||'[]')};}catch{return {routes:[]};}
   }
   if(p==='/my-summary')return {metrics:[{kind:'patrol',count:1}],rounds:[]};
   if(p==='/templates')return {templates:[]};
   if(p==='/events')return {id:'evt-'+Date.now(),ok:true};
   if(p.startsWith('/dispatches'))return {ok:true,dispatches:[]};
   if(p==='/presence')return {ok:true};
   if(p.startsWith('/chat/'))return {ok:true,messages:[]};
  }
  throw error;
 }
}
const privileged=()=>account&&['admin','master'].includes(account.role);
const review=()=>account&&['operador','coi','admin','master'].includes(account.role);
const ops=createOpsCenterUI({api,flash,onUpdate:syncOperational,openNotice:async({page:nextPage,eventId,notification}={})=>{
 if(notification&&['field_alert','notice'].includes(notification.kind)&&['ronda','vistoriador'].includes(account?.role)){
  const d=document.createElement('dialog');d.id='rp-field-notification-dialog';d.className='rp-record-dialog rp-notification-dialog';
  d.innerHTML='<div class="eyebrow">'+(notification.kind==='field_alert'?'ALERTA OPERACIONAL':'COMUNICADO DO COE')+'</div><h2>'+escape(notification.title)+'</h2><p>'+escape(notification.body)+'</p><small>'+fmt(notification.created_at)+'</small><button type="button" data-field-notification-close class="primary">Fechar</button>';
  document.querySelector('#rp-field-notification-dialog')?.remove();document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return;
 }
 if(eventId){
  try{await openEvent(eventId,'notifications');return;}
  catch(error){
   if(!['ronda','vistoriador'].includes(account?.role)||!notification)throw error;
   const n=notification,d=document.createElement('dialog');d.id='rp-field-notification-dialog';d.className='rp-record-dialog rp-notification-dialog';
   const clean=x=>escape(String(x||''));
   d.innerHTML='<div class="eyebrow">COMUNICAÇÃO DO COI</div><h2>'+clean(n.title)+'</h2><p>'+clean(n.body)+'</p><p class="muted">'+clean(n.origin_name||'Central operacional')+' · '+fmt(n.created_at)+'</p><p class="muted">Consulta ao registro recebido. Sem permissão de alteração da tratativa.</p><button type="button" class="primary" data-field-notification-close>Fechar</button>';
   document.querySelector('#rp-field-notification-dialog')?.remove();
   document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return;
  }
 }
 if(nextPage){await releaseTreatment();selected=null;page=nextPage;render();}
}});
const routeBoard=createRouteBoard({api,getContext:()=>({users,rounds,events,routes,account}),redraw:async(loadRemote=false)=>loadRemote?await load():render(),notify:flash});
const actionGlyph={
 alert:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 9 16H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
 incident:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></svg>',
 message:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 10h8M8 13h6"/></svg>'
};
const composerActions=[['alert','Enviar alerta'],['incident','Registrar ocorrência'],['message','Enviar mensagem']];
function composeActionButtons(includeMessage=true){
 return '<div class="central-quick-actions" role="group" aria-label="Comunicação com a central">'+
  composerActions.filter(([kind])=>includeMessage||kind!=='message').map(([kind,label])=>'<button type="button" class="central-quick-action '+(page==='send'&&composeKind===kind?'selected':'')+'" data-compose="'+kind+'" aria-pressed="'+(page==='send'&&composeKind===kind)+'">'+actionGlyph[kind]+'<span>'+label+'</span></button>').join('')+'</div>';
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
 const result=await api('/treatment-records?state=completed&kind='+encodeURIComponent(treatmentTab)+'&offset='+offset);
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
   const busy=isPending(result.event)&&(document.activeElement?.closest('#send-message')||document.querySelector('.conclusion-overlay')||Array.from(document.querySelectorAll('#send-message textarea')).some(el=>el.value.trim()));
   if(!busy){if(!isPending(result.event))document.querySelector('.conclusion-overlay')?.remove();render();}
   else{
    void loadMessages(key);
    const status=document.querySelector('[data-event-operational-status]');if(status)status.textContent=stateLabel(result.event);
    const feedback=document.querySelector('[data-live-treatment-state]');if(feedback)feedback.textContent=result.event.status==='resolvida'?'Este registro foi concluído em outra sessão. O texto em edição foi preservado.':result.event.treatment_owner?'Atendimento: '+result.event.treatment_owner:'';
   }
  }else if(selected?.event&&!review()){const result=await api('/activity/events/'+encodeURIComponent(selected.event.id));selected={event:result.event};if(!document.querySelector('#send-message textarea')?.value.trim()||!isPending(result.event))render();else void loadMessages(result.event.id);}
  else if(account.role==='ronda'&&!guardRound&&page==='dashboard'){
   try{const r=await api('/routes');if(Array.isArray(r?.routes))routes=r.routes;}catch{}
   const assigned=guardPlannedRoute();
   const visibleId=document.querySelector('[data-guard-cockpit]')?.dataset.planId||'';
   const nextId=assigned?.id?String(assigned.id):'';
   if(assigned?.dispatchId&&assigned.dispatchId!==lastNotifiedDispatchId){
    lastNotifiedDispatchId=assigned.dispatchId;
    render();
    flash('Nova ronda recebida do COI.');
   }else if(nextId&&nextId!==visibleId){
    const cockpitEl=document.querySelector('[data-guard-cockpit]');
    if(cockpitEl)cockpitEl.dataset.planId=nextId;
    if(guardMap&&!guardMap.destroyed){
     const activeBase=guardFix||DEFAULT_OPERATIONAL_ROUTE.base;
     const revised=buildGuardRoute(assigned,activeBase);
     if(revised)guardMap.setRoute(revised,null);
    }
   }else if(!nextId&&visibleId){
    render();
   }
  }
  else if(page==='inspections'&&account.role==='vistoriador'){refreshInspectorStops();}
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
 try{window.AndroidTracking?.forgetToken?.()}catch{}
 decorateTheme('');
 roleTag.textContent='';exit.hidden=true;
 root.innerHTML='<form id="central-login" class="login"><h1>Acessar a Central</h1><p>Grupo Maxvel · Use seu usuário ou e-mail e sua senha individual. O perfil é definido pela conta.</p><details><summary>Orientações por perfil</summary><p>Ronda executa pontos; Vistoriador registra checklist e evidências; COI monitora e despacha; Cliente acompanha seu local; Administração e Master gerenciam setores e equipe. Em caso de recusa, confira o usuário e peça à Administração a revisão do cadastro.</p></details>'+
  (error?'<p class="flag">'+escape(error)+'</p>':'')+
  '<label>Usuário ou e-mail<input name="email" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>'+
  '<label>Senha<input type="password" name="password" autocomplete="current-password" required minlength="10"></label>'+
  '<button class="primary">Entrar</button></form>';
}
async function load(){
 if(!token){loginView();return}
 try{
  account=(await api('/me',{timeout:20000})).user;try{localStorage.setItem('rondaspro_android_token',token);window.AndroidTracking?.rememberToken?.(token)}catch{}guardLoadState();roleTag.textContent=roles[account.role]||account.role;exit.hidden=false;
  const previousRole=root.dataset.loadedRole;
  if(previousRole!==account.role&&['ronda','vistoriador'].includes(account.role))try{window.AndroidTracking?.startShift?.()}catch{}
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
  // Render immediately to dismiss 'Carregando a central…' instantly
  try{render();}catch(renderErr){console.warn('Initial render fallback:',renderErr);}
  if(['ronda','vistoriador'].includes(account.role))try{const context=await eventTelemetry();await api('/presence',{method:'POST',data:{position:context.position||null}})}catch{}
  try{await ops.refresh(account,false);}catch(e){console.warn('ops.refresh:',e);}
  if(['admin','master'].includes(account.role))try{centralVerificationSettings=(await api('/operational-settings')).settings;}catch(e){console.warn('settings:',e);}
  try{await chat.refresh();}catch(e){console.warn('chat.refresh:',e);}
  if(page==='activity-history')try{await activity.refresh();}catch(e){console.warn('activity.refresh:',e);}
  if(['monitor','dashboard'].includes(page)&&review()&&ops.allowed('rondas'))try{latestActivity=await activity.latestHtml();}catch(e){console.warn('latestActivity:',e);}
  const [e,r,planned]=await Promise.allSettled([review()&&!ops.allowed('ocorrencias')?Promise.resolve({events:[]}):api('/events?limit=500'),api('/rounds'),review()&&!ops.allowed('rondas')?Promise.resolve({routes:[]}):api('/routes')]);
  events=e.status==='fulfilled'?e.value.events||[]:[];rounds=r.status==='fulfilled'?r.value.rounds||[]:[];routes=planned.status==='fulfilled'?planned.value.routes||[]:[];
  if(selected?.event)selected={event:events.find(record=>record.id===selected.event.id)||selected.event};
  if(review()){
   const results=await Promise.allSettled([ops.allowed('mapa')?api('/dashboard'):Promise.resolve(null),ops.allowed('rondas')?api('/users'):Promise.resolve({users:[]}),ops.allowed('alertas')?api('/email-jobs'):Promise.resolve({jobs:[]}),api('/templates'),ops.allowed('ocorrencias')?api('/event-treatments?limit=1500'):Promise.resolve({treatments:[]})]);
   const val=i=>results[i].status==='fulfilled'?results[i].value:null;
   dashboard=val(0);users=val(1)?.users||[];emailJobs=val(2)?.jobs||[];templates=val(3)?.templates||[];treatments=val(4)?.treatments||[];mySummary=null;
  }else if(account.role==='ronda'){
   const [sum,t]=await Promise.allSettled([api('/my-summary'),api('/templates')]);
   mySummary=sum.status==='fulfilled'?sum.value:null;templates=t.status==='fulfilled'?t.value.templates||[]:[];dashboard=null;users=[];emailJobs=[];
  }else{
   mySummary=null;dashboard=null;users=[];emailJobs=[];templates=[];
  }
  if(selected?.event&&review()){try{const detail=await api('/events/'+selected.event.id);selected={event:detail.event};eventHistory=detail.treatments;}catch(e){console.warn(e);}}
  if(page==='treatments'&&review())try{await readTreatmentRows();}catch(e){console.warn(e);}
  render();ops.present();ops.connectLive(token);
  if(tourAccount!==account.id&&!isPagesTestMode()){
   tourAccount=account.id;
   const state=await api('/onboarding').catch(()=>({seen:tour.hasSeen()}));
   if(!state.seen&&page!=='chat')tour.open();
  }
 }catch(err){
  if(err.status===401||err.status===403){
   sessionStorage.removeItem('rondaspro_api_token');
   try{localStorage.removeItem('rondaspro_android_token');}catch{}
   token='';account=null;eventResponseDrafts.clear();chat.reset();calls.reset();activity.reset(true);
   document.querySelector('[data-operational-header]')?.remove();root.dataset.loadedRole='';loginView(err.message);
  }else if(account){
   flash('Não foi possível atualizar agora: '+err.message);
   try{render();}catch{loginView(err.message);}
  }else{
   root.innerHTML='<div style="padding:28px 20px;text-align:center;color:#FFFFFF;max-width:360px;margin:32px auto;background:#262626;border:1px solid #535353;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.5);"><h2 style="font-size:17px;font-weight:700;margin:0 0 8px 0;color:#FFFFFF;">Falha ao carregar a central</h2><p style="font-size:13px;color:#B3B3B3;line-height:1.5;margin:0 0 20px 0;">'+escape(err.message||'Tempo limite ou instabilidade na conexão.')+'</p><button type="button" onclick="location.reload();" style="width:100%;min-height:48px;border-radius:10px;background:#e5232a;color:#FFFFFF;border:none;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">Tentar novamente ↻</button><button type="button" onclick="window.openLoginForm();" style="width:100%;min-height:44px;border-radius:10px;background:transparent;color:#B3B3B3;border:1px solid #535353;font-size:14px;cursor:pointer;">Trocar de conta</button></div>';
  }
 }
}
const sectorPanel=createSectorPanel({request:api,notify:flash});
function getTourStepsForRole(role){
 if(role==='ronda'){
  return [
   {target:'.rp-agent-menu-toggle, [data-central-menu]',title:'Menu de Navegação',description:'Acesse o histórico de alertas, rondas disponíveis, comunicações com a central e ajuda.'},
   {target:'#guard-real-map, .patrol-map-canvas',title:'Mapa da Ronda em Tempo Real',description:'Visualize o traçado viário da rota, seus postos de verificação e a telemetria do percurso.'},
   {target:'#central-panic, [data-agent-sos]',title:'Botão de Pânico (SOS)',description:'Acionamento prioritário imediato para situações de emergência com envio de telemetria ao COI.'},
   {target:'.ronda-bottom-sheet, [data-guard-panel]',title:'Painel Operacional da Ronda',description:'Inicie o percurso, visualize os horários programados dos postos e recolha o painel para ver o mapa.'},
   {target:'[data-field-tool-torch], .ronda-torch-map-btn',title:'Controle da Lanterna',description:'Ligue ou desligue o flash do dispositivo de forma rápida e tátil diretamente sobre o mapa.'}
  ];
 }
 if(role==='coi'||role==='operador'){
  return [
   {target:'#central-navigation, .rp-central-menu-button',title:'COI · Central de Operações',description:'Navegue pelas ferramentas de monitoramento, despacho, ocorrências e equipe.'},
   {target:'.rp2-workspace, .content',title:'Monitoramento em Tempo Real',description:'Supervisione postos, rotas ativas e localização transmitida pelos vigias em campo.'},
   {target:'[data-page="treatments"], .rp2-contextbar',title:'Tratativas de Ocorrências',description:'Analise alertas recebidos, registre decisões e encaminhe tratativas operacionais.'}
  ];
 }
 if(role==='cliente'){
  return [
   {target:'#central-navigation, .rp-central-menu-button',title:'Área do Cliente',description:'Acesse o acompanhamento da sua unidade monitorada e relatórios autorizados.'},
   {target:'.rp2-workspace, .content',title:'Meu Acompanhamento',description:'Consulte o status atual da sua unidade, últimas posições e histórico das rondas.'}
  ];
 }
 if(role==='vistoriador'){
  return [
   {target:'.content',title:'Vistorias e Qualidade',description:'Verifique acessos, equipamentos e critérios da unidade atribuída à sua conta.'},
   {target:'#central-panic',title:'Canal de Emergência',description:'Acionamento de pânico prioritário disponível durante as atividades de campo.'}
  ];
 }
 return [
  {target:'#central-navigation, .rp-central-menu-button',title:'Painel de Gestão',description:'Acompanhe indicadores, postos, colaboradores e relatórios administrativos.'},
  {target:'.rp2-workspace, .content',title:'Operação e Acompanhamento',description:'Supervisione rotas, ocorrências e o andamento geral da segurança patrimonial.'},
  {target:'[data-page="guide"], #central-navigation',title:'Ajuda e Manuais',description:'Reabra este tutorial a qualquer momento ou consulte o guia completo do sistema.'}
 ];
}
let tourAccount='';
const tour=createSpotlightTour({
 app:root,
 getAccount:()=>account?.id||'guest',
 steps:()=>getTourStepsForRole(account?.role),
 onSeen:()=>{if(account&&!isPagesTestMode())void api('/onboarding',{method:'PUT',data:{}}).catch(()=>{});}
});
const roleMenus={
 ronda:[['dashboard','Minha ronda','◉'],['dispatches','Atribuições','⌖'],['notifications','Eventos','✉'],['history','Meus alertas e ocorrências','▤'],['send','Comunicar à central','✉'],['guide','Guia completo','?']],
 operador:[['monitor','COI · Acompanhamento','◉'],['treatments','Histórico de tratativas','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['routes','Rotas por Ronda','⌖'],['events','Ocorrências','!'],['team','Equipe de Ronda','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 coi:[['monitor','COI · Acompanhamento','◉'],['treatments','Histórico de tratativas','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['routes','Rotas por Ronda','⌖'],['events','Ocorrências','!'],['team','Equipe de Ronda','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 admin:[['gestao','Painel de Gestão','⚙'],['dashboard','Indicadores','▥'],['monitor','COI · Acompanhamento','◉'],['treatments','Histórico de tratativas','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['permissions','Configurações','⚙'],['routes','Rotas por Ronda','⌖'],['events','Ocorrências','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 master:[['gestao','Painel de Gestão','⚙'],['dashboard','Indicadores','▥'],['monitor','COI · Acompanhamento','◉'],['treatments','Histórico de tratativas','!'],['dispatches','Despachos','⌖'],['notifications','Eventos','✉'],['permissions','Configurações','⚙'],['routes','Rotas por Ronda','⌖'],['events','Ocorrências','!'],['team','Colaboradores','♙'],['alerts','Alertas e e-mails','✉'],['export','Relatórios','⇩'],['guide','Guia completo','?']],
 cliente:[['client','Meu acompanhamento','◉'],['guide','Guia completo','?']],
 vistoriador:[['history','Meus alertas e ocorrências','▤'],['inspections','Vistorias e qualidade','▤'],['dispatches','Meus despachos','⌖'],['notifications','Eventos','✉'],['send','Comunicar COI','✉'],['guide','Guia completo','?']]
};
for(const entries of Object.values(roleMenus)){entries.push(['tutorial','Ajuda · tutorial','?']);entries.push(['chat','Chat interno','✉']);if(!entries.some(e=>e[0]==='activity-history'))entries.push(['activity-history','Histórico de rondas','▤']);}

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
 dashboard:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
 monitor:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="12" width="4" height="8" rx="2"/><rect x="18" y="12" width="4" height="8" rx="2"/><path d="M20 19a5 5 0 0 1-5 3h-3"/>',
 treatments:'<rect x="5" y="3" width="14" height="19" rx="2"/><path d="M9 3V2h6v2M8 12l2.5 2.5L16 9M9 18h6"/>',
 dispatches:'<path d="m3 7 8-4 10 6-8 4zM3 7v10l10 5V13M13 22l8-5V9"/>',
 notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10M10 21h4"/>',
 chat:'<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 10h8M8 13h6"/>',
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
 const node=([key,label])=>'<button type="button" data-page="'+key+'" class="rp2-nav-item '+(page===key?'active':'')+'"'+(page===key?' aria-current="page"':'')+'>'+rp2Glyph(key)+'<span>'+escape(label)+'</span>'+(key==='notifications'?pendingDot('total',ops.summary().total):'')+'</button>';
 const moreActive=secondary.some(([key])=>key===page);
 const wide=typeof window!=='undefined'&&window.matchMedia('(min-width:761px)').matches;
 return '<nav id="central-navigation" class="side rp2-role-nav" aria-label="Navegação do '+escape(roles[role])+'">'+
  '<button type="button" class="rp2-nav-dismiss" data-close-central-menu aria-label="Fechar navegação">Menu <span aria-hidden="true">✕</span></button>'+ 
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
 '<section class="surface"><div class="toolbar"><h2>Mapa Operacional da Central</h2><p class="muted">Visualização em tempo real das rondas, vigias e postos atendidos.</p></div><div id="ops-live-map" class="coi3-map" style="height:320px;width:100%;border-radius:12px;margin-top:8px;"></div></section>'+
 '<section class="surface"><div class="toolbar"><h2>Ocorrências que precisam de tratamento</h2><button data-page="events">Abrir todas</button></div>'+eventList(open.slice(0,6))+'</section>'+
 '<section class="surface"><div class="toolbar"><h2>Rondas recentes</h2><button data-page="team">Analisar colaboradores</button></div>'+roundTable(rounds.slice(0,7))+'</section>'+
 '<details class="details-toggle"><summary>Comparações, telemetria e indicadores adicionais</summary><div class="surface">'+kpis()+'<h2 style="margin-top:16px">Histórico geral</h2>'+roundTable(rounds.slice(0,30))+'</div></details></section>';
}
function ownDashboard(){
 const planned=guardPlannedRoute();
 return guardCockpit({
  round:guardRound,
  planned,
  position:guardFix,
  gpsStatus:guardWatch!=null?'GPS em acompanhamento':'Aguardando GPS',
  account,
  sosActive:guardSosActive,
  torchActive:guardTorchActive,
  hidePanic:page!=='dashboard'
 });
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
  L.polyline(pts.map(p=>[p.lat,p.lng]),{color:'#cbd5e1',weight:3,opacity:.85,interactive:false}).addTo(map);
  pts.forEach(p=>L.circleMarker([p.lat,p.lng],{radius:3,color:'#fafafa',fillColor:'#cbd5e1',fillOpacity:1,weight:1,interactive:false}).addTo(map));
  if(pts.length===1)map.setView([pts[0].lat,pts[0].lng],17,{animate:false});
  else map.fitBounds(pts.map(p=>[p.lat,p.lng]),{padding:[12,12],maxZoom:17,animate:false});
 }
}
function mountOperationalMap(){
 mountAgendaMaps();
 const node=document.querySelector('#ops-live-map'),L=globalThis.L;if(!node)return;
 if(!L){setTimeout(mountOperationalMap,120);return;}
 resetOperationalMap();node.innerHTML='';
 const active=rounds.find(r=>r.status==='em_andamento'),planned=routes.find(r=>r.id===active?.routeId)||routes[0];
 const worker=active?users.find(w=>w.id===active.userId):null;
 const pts=(planned?.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 const map=L.map(node,{zoomControl:true,scrollWheelZoom:false});
 const tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap',crossOrigin:true}).addTo(map);
 tileLayer.on('tileerror',e=>{
  if(e.tile&&!e.tile.dataset.offlineTried){
   e.tile.dataset.offlineTried='true';
   const c=e.coords;
   if(c&&Number.isFinite(c.z))e.tile.src=`./assets/tiles/${c.z}/${c.x}/${c.y}.png`;
  }
 });
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
 for(const u of users){
  if(u.role==='ronda'&&u.site){
   // Show registered vigia posts
  }
 }
 if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:17});else map.setView([-20.145,-44.89],13);
 operationalMap=map;setTimeout(()=>{try{map.invalidateSize()}catch{}},90);
}
function mountClientMap(){
 const node=document.querySelector('#client-overview-map'),L=globalThis.L;if(!node)return;
 if(!L){setTimeout(mountClientMap,120);return;}
 node.innerHTML='';
 const planned=routes.find(r=>r.site===account?.site)||routes[0];
 const pts=(planned?.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 const map=L.map(node,{zoomControl:true,scrollWheelZoom:false});
 const tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap',crossOrigin:true}).addTo(map);
 tileLayer.on('tileerror',e=>{
  if(e.tile&&!e.tile.dataset.offlineTried){
   e.tile.dataset.offlineTried='true';
   const c=e.coords;
   if(c&&Number.isFinite(c.z))e.tile.src=`./assets/tiles/${c.z}/${c.x}/${c.y}.png`;
  }
 });
 let bounds=[];
 if(pts.length){
  L.polyline(pts.map(p=>[p.lat,p.lng]),{color:'#e5232a',weight:3,opacity:.85}).addTo(map);
  for(const p of pts){
   L.circleMarker([p.lat,p.lng],{radius:5,color:'#fff',weight:1.5,fillColor:'#e5232a',fillOpacity:1}).bindTooltip(escape(p.name||'Ponto')).addTo(map);
   bounds.push([p.lat,p.lng]);
  }
 }
 if(planned?.base&&Number.isFinite(planned.base.lat)){
  L.circleMarker([planned.base.lat,planned.base.lng],{radius:8,color:'#fff',weight:2,fillColor:'#f59e0b',fillOpacity:1}).bindTooltip('Base: '+escape(planned.name||'Posto')).addTo(map);
  bounds.push([planned.base.lat,planned.base.lng]);
 }
 if(bounds.length)map.fitBounds(bounds,{padding:[30,30],maxZoom:17});
 else map.setView([-20.145,-44.89],13);
 setTimeout(()=>{try{map.invalidateSize()}catch{}},90);
}
function monitorView(){
 const panel=coi.render({account,rounds,events,routes,users,demo:isPagesTestMode(),...ops.monitoringData()});
 return '<div class="rp-coi-request-strip"><div><strong>Rondas e atendimentos de campo</strong><span>Solicite rondas operacionais sob demanda ou de rotina, com destino e orientações.</span></div><button type="button" class="primary" data-inspection-queue>Solicitar atendimento ↗</button></div>'+panel;
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
 const summary=ops.summary(),kinds=[...new Set(['incident','alert','message',...summary.categories.map(c=>c.kind)])];
 const tabs=kinds.map(kind=>{const info=typeInfo(kind);return '<button type="button" role="tab" data-treatment-tab="'+escape(kind)+'" aria-selected="'+(treatmentTab===kind)+'" aria-controls="treatment-record-list">'+escape(info.label)+'</button>';}).join('');
 const rows=treatmentRows.map(e=>'<button type="button" class="coi3-treatment-row '+(isPending(e)?'is-pending':'is-completed')+'" data-event="'+escape(e.id)+'"><span class="coi3-treatment-icon" aria-hidden="true">'+escape(typeInfo(e.kind).icon)+'</span><span class="coi3-treatment-copy"><strong>'+escape(friendly[e.kind]||typeInfo(e.kind).label)+'</strong><span>'+escape(e.description||'Sem descrição')+'</span><small>'+escape(e.reporter_name)+' · '+escape(e.site||'Sem posto')+' · '+fmt(e.occurred_at)+'</small>'+(privileged()&&isPending(e)&&!e.coi_treated?'<small class="rp-coi-missing">Sem tratativa pelo COI</small>':'')+(e.treatment_owner?'<small>Em atendimento por '+escape(e.treatment_owner)+'</small>':'')+'</span><span class="coi3-treatment-badge '+(!isPending(e)?'done':'')+'">'+stateLabel(e)+'</span></button>').join('');
 return '<section class="stack coi3-treatments"><header class="toolbar"><div><div class="eyebrow">'+(privileged()?'ADMINISTRAÇÃO · SUPERVISÃO E APOIO':'COI · TRATAMENTO OPERACIONAL')+'</div><h1>Histórico de tratativas</h1><p>Somente eventos finalizados, com providências e responsáveis preservados para consulta.</p></div><strong>Arquivo operacional</strong></header><div class="rp-treatment-tabs" role="tablist" aria-label="Categorias de tratativas">'+tabs+'</div><section class="surface" id="treatment-record-list" role="tabpanel" aria-label="'+escape(typeInfo(treatmentTab).label)+'">'+(rows||'<p class="empty">Nenhum registro nesta categoria.</p>')+'</section>'+(treatmentMore?'<button type="button" data-treatment-more>Carregar mais registros</button>':'')+'</section>';
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
 (privileged()?'<form id="new-user" class="surface"><h2>Cadastrar membro da equipe</h2><p class="muted">Informe a descrição da supervisão sobre o vigia no cadastro. A descrição será armazenada no banco.</p><div class="grid"><label>Nome<input required name="name" minlength="2"></label><label>E-mail<input required type="email" name="email"></label><label>Perfil<select name="role"><option value="ronda">Vigia</option><option value="operador">Equipe interna</option><option value="coi">COI</option><option value="vistoriador">Vistoriador</option><option value="cliente">Cliente (consulta)</option><option value="admin">Administrador</option>'+(account.role==='master'?'<option value="master">Master</option>':'')+'</select></label><label>Telefone<input type="tel" name="phone" maxlength="35"></label><label>Local/posto vinculado<input name="site" maxlength="100" placeholder="Ex.: Unidade Centro"></label><label>Senha inicial (padrão do piloto, caso em branco)<input name="password" minlength="10" type="password" autocomplete="new-password"></label></div><label>Descrição do supervisor sobre o colaborador<textarea name="description" placeholder="Resumo factual das atribuições, posto e orientações de acompanhamento" minlength="10"></textarea></label><button class="primary">Cadastrar</button></form>':'')+'</section>';
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
 (!['incident','inspection'].includes(e.kind)||!isPending(e)||account.role==='cliente'||review()&&!(claimedEvent===e.id&&e.treatment_locked&&e.treatment_owner_id===account.id)?'':'<form id="upload-evidence" class="row no-print"><label>Adicionar evidência<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/webm,audio/mp4,audio/ogg" name="file" required></label><button>Enviar mídia</button></form>')+'</section>'+
 '<section class="surface"><h2>Conversa e providências</h2><div id="thread" class="thread"></div>'+
 (!isPending(e)||account.role==='cliente'?'<p class="muted">Consulta do registro. Use o Chat interno para conversar com a equipe.</p>':review()&&!(claimedEvent===e.id&&e.treatment_locked&&e.treatment_owner_id===account.id)?'<p class="muted">Assuma a tratativa disponível para registrar respostas. Concluídas ficam somente para consulta.</p>':'<form id="send-message" data-event-id="'+escape(e.id)+'" class="stack no-print"><label>Responder<textarea name="body" required maxlength="4000" placeholder="Escreva a mensagem..."></textarea></label><div class="row">'+
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
 // Field roles use a full-screen operational map; onboarding stays in the Guide page, never behind field controls.
 if(page==='guide'||page==='chat'||['ronda','vistoriador'].includes(account.role)||localStorage.getItem('rondaspro-guide-seen-'+account.role)==='yes')return '';
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
 const reference=Date.now();
  const planned=routes.filter(r=>r.site===account.site).map(r=>({...r,plannedStart:nextRouteStart(r,reference)}))
    .filter(r=>Number.isFinite(r.plannedStart)).sort((a,b)=>a.plannedStart-b.plannedStart)[0]||null;
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
  '<section class="surface ops-client-map-section"><div class="toolbar"><div><div class="eyebrow">ACOMPANHAMENTO EM TEMPO REAL</div><h2>Mapa do Posto e Ronda</h2><p class="muted">Percurso e pontos de segurança da sua unidade.</p></div><span class="pill ok">Monitoramento Ativo</span></div><div id="client-overview-map" class="coi3-map" style="height:280px;width:100%;border-radius:10px;margin-top:8px;"></div></section>'+
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
 const queue=inspectionQueueNow(),assignment=queue[0]||null;
 const entries=events.filter(e=>e.kind==='inspection');
 if(assignment&&inspectorDraft?.id!==assignment.id){inspectorDraft=emptyInspectionDraft(assignment.id);inspectorSelfie=null;inspectorEvidence=[];inspectorSubmission=null;}
 const stage=inspectionCockpit({queue,mapId:'inspection-map',mode:'real',position:inspectorPosition,base:inspectorBase,
  gpsActive:inspectorWatch!=null,fullTitle:'Meus atendimentos operacionais'});
 const form=assignment?.arrived_at?'<dialog id="rp-inspection-wizard-dialog" class="rp-field-wizard-dialog"><form id="inspection-form" novalidate>'+
  '<div class="rp-field-wizard-head"><div><strong>Atendimento · '+escape(assignment.address)+'</strong><small>Checklist operacional e evidências</small></div><button type="button" data-wizard-close aria-label="Fechar checklist">✕</button></div>'+
  '<input type="hidden" name="dispatchId" value="'+escape(assignment.id)+'">'+inspectionWizardHtml(inspectorDraft)+'</form></dialog>':'';
 return '<section class="stack rp-inspector-workspace">'+stage+form+
 '<dialog class="rp-inspection-dialog" data-inspection-history-dialog aria-label="Histórico de atendimentos"><header><div><small>'+entries.length+' REGISTROS</small><h2>Histórico de atendimentos</h2></div><button type="button" data-inspection-modal-close aria-label="Fechar histórico">✕</button></header><div class="rp-inspection-history-content">'+
 (entries.length?entries.slice(0,40).map(e=>'<div class="rp-inspection-history-row"><span><strong>'+fmt(e.occurred_at)+'</strong><small>'+escape(e.description)+'</small></span><b>'+(Number.isFinite(e.details?.qualityPercent)?e.details.qualityPercent+'%':'—')+'</b></div>').join(''):'<p class="empty">Ainda não há atendimentos concluídos.</p>')+
 '<p class="rp-inspection-dialog-note">Registros de atendimentos operacionais concluídos na operação autenticada.</p></div></dialog></section>';
}

function triggerHaptic(type='tap'){
 try{
  if(globalThis.AndroidTracking?.vibrate){
   globalThis.AndroidTracking.vibrate(type==='medium'?15:type==='success'?25:8);
   return;
  }
  if(navigator?.vibrate){
   navigator.vibrate(type==='medium'?15:type==='success'?[15,50,20]:8);
  }
 }catch{}
}

function mountGuardSearchAndPin(root){
 const searchBar=root?.querySelector?.('.rp-map-search-bar');
 const hud=root?.querySelector?.('.rp-map-nav-hud');
 const compassBtn=root?.querySelector?.('[data-action="map-compass"]');
 const compassNeedle=root?.querySelector?.('[data-compass-needle]');
 const compassBadge=root?.querySelector?.('[data-compass-badge]');
 const recenterBtn=root?.querySelector?.('[data-action="map-follow-gps"]');
 const recenterBadge=root?.querySelector?.('[data-recenter-badge]');
 const cameraLockBtns=root?.querySelectorAll?.('[data-action="toggle-camera-lock"]')||[];
 const cameraLockLabels=root?.querySelectorAll?.('[data-camera-lock-label]')||[];

 if(guardMap){
  guardMap.setTrackingListener(state=>{
   if(compassNeedle)compassNeedle.style.transform=`rotate(${-state.bearing}deg)`;
   if(compassBadge)compassBadge.textContent=state.bearing===0?'N':`${Math.abs(state.bearing)}°`;
   if(compassBtn){
    const isRotated=state.autonomousRotate||Math.abs(state.bearing)>2;
    compassBtn.classList.toggle('is-active',isRotated);
   }
   if(recenterBtn&&recenterBadge){
    recenterBtn.classList.toggle('is-active',state.autoFollow);
    recenterBadge.textContent=state.autoFollow?(state.autonomousRotate?'AUTO':'GPS'):'LIVRE';
   }
   const locked=state.cameraLocked!==false;
   cameraLockBtns.forEach(btn=>btn.classList.toggle('is-active',locked));
   cameraLockLabels.forEach(lbl=>{
    lbl.textContent=locked?(state.isMoving?'🚗 Em movimento · Fixa':'🎯 Câmera: Fixa'):'🔓 Câmera: Livre';
   });
  });
 }

 const searchInput=root?.querySelector?.('[data-guard-search-input]');
 const clearBtn=root?.querySelector?.('[data-guard-search-clear]');
 const pinToggle=root?.querySelector?.('[data-guard-search-pin-toggle]');
 const resultsPanel=root?.querySelector?.('[data-guard-search-results]');
 const pinCard=root?.querySelector?.('[data-guard-pin-card]');
 const pinTitle=root?.querySelector?.('[data-guard-pin-title]');
 const pinSub=root?.querySelector?.('[data-guard-pin-sub]');
 const pinCancel=root?.querySelector?.('[data-guard-pin-cancel]');
 const pinConfirm=root?.querySelector?.('[data-guard-pin-confirm]');

 const zoomInBtn=root?.querySelector?.('[data-action="map-zoom-in"]');
 const zoomOutBtn=root?.querySelector?.('[data-action="map-zoom-out"]');
 const searchTriggerBtn=root?.querySelector?.('[data-action="toggle-search-bar"]');
 const searchCloseBtn=root?.querySelector?.('[data-guard-search-close]');

 if(zoomInBtn && !zoomInBtn.dataset.bound){
  zoomInBtn.dataset.bound='true';
  zoomInBtn.addEventListener('click',()=>{
   triggerHaptic('tap');
   if(guardMap?.instance)guardMap.instance.zoomIn();
  });
 }
 if(zoomOutBtn && !zoomOutBtn.dataset.bound){
  zoomOutBtn.dataset.bound='true';
  zoomOutBtn.addEventListener('click',()=>{
   triggerHaptic('tap');
   if(guardMap?.instance)guardMap.instance.zoomOut();
  });
 }

 cameraLockBtns.forEach(btn=>{
  if(!btn.dataset.bound){
   btn.dataset.bound='true';
   btn.addEventListener('click',()=>{
    triggerHaptic('medium');
    guardMap?.toggleCameraLock();
   });
  }
 });

 if(searchTriggerBtn && !searchTriggerBtn.dataset.bound){
  searchTriggerBtn.dataset.bound='true';
  searchTriggerBtn.addEventListener('click',()=>{
   triggerHaptic('tap');
   if(!searchBar)return;
   const isHidden=searchBar.dataset.collapsed==='true'||searchBar.style.display==='none'||searchBar.classList.contains('is-collapsed');
   if(isHidden){
    document.body.classList.add('is-guard-search-open');
    searchBar.style.removeProperty('display');
    searchBar.removeAttribute('data-collapsed');
    searchBar.classList.remove('is-collapsed');
    searchTriggerBtn.classList.add('is-active');
    searchInput?.focus();
    renderLearnedSuggestions();
   }else{
    document.body.classList.remove('is-guard-search-open');
    searchBar.style.setProperty('display','none','important');
    searchBar.dataset.collapsed='true';
    searchBar.classList.add('is-collapsed');
    searchTriggerBtn.classList.remove('is-active');
    if(resultsPanel)resultsPanel.hidden=true;
   }
  });
 }

 if(searchCloseBtn && !searchCloseBtn.dataset.bound){
  searchCloseBtn.dataset.bound='true';
  searchCloseBtn.addEventListener('click',()=>{
   triggerHaptic('tap');
   document.body.classList.remove('is-guard-search-open');
   if(!searchBar)return;
   searchBar.style.setProperty('display','none','important');
   searchBar.dataset.collapsed='true';
   searchBar.classList.add('is-collapsed');
   searchTriggerBtn?.classList.remove('is-active');
   if(resultsPanel)resultsPanel.hidden=true;
  });
 }

 if(compassBtn && !compassBtn.dataset.bound){
  compassBtn.dataset.bound='true';
  compassBtn.addEventListener('click',()=>{
   triggerHaptic('medium');
   guardMap?.toggleCompassMode();
  });
 }

 if(recenterBtn && !recenterBtn.dataset.bound){
  recenterBtn.dataset.bound='true';
  recenterBtn.addEventListener('click',()=>{
  if(!guardMap)return;
  triggerHaptic('medium');
  if(navigator.geolocation){
   navigator.geolocation.getCurrentPosition(p=>{
    const at=(p.timestamp&&p.timestamp>1000000000000)?p.timestamp:Date.now();
    guardUpdateFix({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,heading:p.coords.heading,speed:p.coords.speed,at});
    guardMap.recenterGPS();
   },()=>{guardMap.recenterGPS();},{enableHighAccuracy:true,timeout:6000,maximumAge:0});
  }else{
   guardMap.recenterGPS();
  }
 });
}

 if(!searchInput||!resultsPanel||!pinCard)return;

 function showPinCard(title,sub){
  if(pinTitle)pinTitle.textContent=title;
  if(pinSub)pinSub.textContent=sub;
  pinCard.hidden=false;
 }

 function hidePinCard(){
  pinCard.hidden=true;
  manualPinModeActive=false;
  pinToggle?.classList.remove('is-active');
  guardMap?.setManualPinHandler(null);
 }

 function updatePinCoordinates(coords,customName=null){
  activePinnedLocation={
   lat:coords.lat,
   lng:coords.lng,
   name:customName||activePinnedLocation?.name||'Local Marcado no Mapa',
   address:`Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}`
  };
  guardMap?.setSearchMarker(coords,{
   title:activePinnedLocation.name,
   draggable:true,
   onDrag:()=>{
    if(pinSub)pinSub.textContent='Ajustando posição do marcador…';
   },
   onDragEnd:(endCoords)=>{
    triggerHaptic('medium');
    updatePinCoordinates(endCoords);
   }
  });
  showPinCard(activePinnedLocation.name,activePinnedLocation.address);
 }

 function toggleManualPin(){
  manualPinModeActive=!manualPinModeActive;
  triggerHaptic('tap');
  pinToggle?.classList.toggle('is-active',manualPinModeActive);
  resultsPanel.hidden=true;

  if(manualPinModeActive){
   let center=null;
   if(guardMap?.instance?.getCenter){
    try{center=guardMap.instance.getCenter();}catch{}
   }
   if(!center||!Number.isFinite(center.lat))center=guardFix||DEFAULT_OPERATIONAL_ROUTE.base;
   updatePinCoordinates(center,'Local Marcado Manualmente');
   guardMap?.setManualPinHandler(coords=>{
    triggerHaptic('tap');
    updatePinCoordinates(coords);
   });
  }else{
   guardMap?.clearSearchMarker();
   hidePinCard();
  }
 }

 pinToggle?.addEventListener('click',toggleManualPin);

 function renderLearnedSuggestions(){
  const focus=searchFocus(guardFix,guardMap?.instance);
  const learned=getLearnedPlaces({limit:6,focus});
  if(!learned.length){
   resultsPanel.hidden=true;
   resultsPanel.innerHTML='';
   return;
  }
  const itemsHtml=learned.map(p=>{
   const iconSvg='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>';
   const distBadge=p.distanceMeters?`<span class="rp-search-result-badge">${distanceLabel(p.distanceMeters)}</span>`:'';
   const recBadge=p.isRecurrent?'<span class="rp-recurrent-tag">★ Recorrente</span>':'';
   return `<button type="button" class="rp-search-result-item" data-search-item data-lat="${p.lat}" data-lng="${p.lng}" data-name="${escape(p.name)}" data-address="${escape(p.address||'')}" data-is-company="true">
    <div class="rp-search-result-icon">${iconSvg}</div>
    <div class="rp-search-result-text">
     <strong>${escape(p.name)} ${recBadge}</strong>
     <small>${escape(p.address||'Local cadastrado')}</small>
    </div>
    ${distBadge}
   </button>`;
  }).join('');

  resultsPanel.innerHTML=`
   <div class="rp-search-section-header">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    <span>Empresas Recorrentes · Aprendizado Inteligente</span>
   </div>
   ${itemsHtml}
   <button type="button" class="rp-search-result-item rp-search-result-fallback" data-action="place-pin-manual">
    <div class="rp-search-result-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
    <div class="rp-search-result-text">
     <strong>Marcar manualmente no mapa</strong>
     <small>Toque para posicionar o pino onde você quiser</small>
    </div>
   </button>
  `;
  resultsPanel.hidden=false;
 }

 searchInput.addEventListener('focus',()=>{
  if(searchInput.value.trim().length<3){
   renderLearnedSuggestions();
  }
 });

 searchInput.addEventListener('input',()=>{
  const query=searchInput.value.trim();
  if(clearBtn)clearBtn.style.display=query.length>0?'inline-flex':'none';
  clearTimeout(guardSearchDebounce);

  if(query.length<3){
   renderLearnedSuggestions();
   return;
  }

  guardSearchDebounce=setTimeout(async()=>{
   if(guardSearchActiveAbort)guardSearchActiveAbort.abort();
   guardSearchActiveAbort=new AbortController();

   try{
    const focus=searchFocus(guardFix,guardMap?.instance);
    const items=await searchPlacesWithLearned(query,{focus,limit:7,signal:guardSearchActiveAbort.signal});
    if(searchInput.value.trim()!==query)return;

    if(!items.length){
     resultsPanel.innerHTML=`
      <div class="rp-search-result-item" style="cursor:default;opacity:0.85;">
       <div class="rp-search-result-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
       <div class="rp-search-result-text">
        <strong>Nenhum local encontrado</strong>
        <small>Tente buscar por rua, bairro ou marque o pino manualmente</small>
       </div>
      </div>
      <button type="button" class="rp-search-result-item rp-search-result-fallback" data-action="place-pin-manual">
       <div class="rp-search-result-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
       <div class="rp-search-result-text">
        <strong>Marcar manualmente no mapa</strong>
        <small>Toque para posicionar o pino onde você quiser</small>
       </div>
      </button>`;
    }else{
     resultsPanel.innerHTML=items.map(p=>{
      const isCompany=p.type==='company'||/(empresa|ltda|s\.?a|loja|mercado|shopping|hospital|clinica|posto|banco|comercio|restaurante|farmacia|hotel|condominio|galpao|industria|centro)/i.test(p.name+' '+(p.address||''))||(p.name&&p.address&&!p.name.startsWith('Rua')&&!p.name.startsWith('Av'));
      const iconSvg=isCompany
       ?'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>'
       :'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
      const distBadge=p.distanceMeters?`<span class="rp-search-result-badge">${distanceLabel(p.distanceMeters)}</span>`:'';
      const recBadge=p.isRecurrent?'<span class="rp-recurrent-tag">★ Recorrente</span>':'';
      return `<button type="button" class="rp-search-result-item" data-search-item data-lat="${p.lat}" data-lng="${p.lng}" data-name="${escape(p.name)}" data-address="${escape(p.address||'')}" data-is-company="${isCompany}">
       <div class="rp-search-result-icon">${iconSvg}</div>
       <div class="rp-search-result-text">
        <strong>${escape(p.name)} ${recBadge}</strong>
        <small>${escape(p.address||'Endereço aproximado')}</small>
       </div>
       ${distBadge}
      </button>`;
     }).join('')+`
      <button type="button" class="rp-search-result-item rp-search-result-fallback" data-action="place-pin-manual">
       <div class="rp-search-result-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
       <div class="rp-search-result-text">
        <strong>Não achou o local exato?</strong>
        <small>Toque para marcar manualmente no mapa</small>
       </div>
      </button>`;
    }
    resultsPanel.hidden=false;
   }catch(err){
    if(err.name!=='AbortError'){
     resultsPanel.innerHTML=`
      <div class="rp-search-result-item" style="cursor:default;opacity:0.85;">
       <div class="rp-search-result-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
       <div class="rp-search-result-text">
        <strong>Busca offline</strong>
        <small>Você pode marcar qualquer ponto manualmente no mapa</small>
       </div>
      </div>
      <button type="button" class="rp-search-result-item rp-search-result-fallback" data-action="place-pin-manual">
       <div class="rp-search-result-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
       <div class="rp-search-result-text">
        <strong>Marcar manualmente no mapa</strong>
        <small>Toque para posicionar o pino livremente</small>
       </div>
      </button>`;
     resultsPanel.hidden=false;
    }
   }
  },250);
 });

 resultsPanel.addEventListener('click',e=>{
  const manualBtn=e.target.closest('[data-action="place-pin-manual"]');
  if(manualBtn){
   toggleManualPin();
   return;
  }
  const itemBtn=e.target.closest('[data-search-item]');
  if(itemBtn){
   triggerHaptic('tap');
   const lat=parseFloat(itemBtn.dataset.lat);
   const lng=parseFloat(itemBtn.dataset.lng);
   const name=itemBtn.dataset.name;
   const address=itemBtn.dataset.address;
   const isCompany=itemBtn.dataset.isCompany==='true';

   recordLearnedPlace({name,address,lat,lng,isCompany});

   activePinnedLocation={lat,lng,name,address};
   searchInput.value=name;
   if(clearBtn)clearBtn.style.display='inline-flex';
   resultsPanel.hidden=true;

   updatePinCoordinates({lat,lng},name);
   if(address&&pinSub)pinSub.textContent=address;
   guardMap?.instance?.setView?.([lat,lng],17);
  }
 });

 clearBtn?.addEventListener('click',()=>{
  searchInput.value='';
  clearBtn.style.display='none';
  resultsPanel.hidden=true;
  resultsPanel.innerHTML='';
  searchInput.focus();
 });

 pinCancel?.addEventListener('click',()=>{
  triggerHaptic('tap');
  guardMap?.clearSearchMarker();
  hidePinCard();
  searchInput.value='';
  if(clearBtn)clearBtn.style.display='none';
  if(customGuardDestination){
   customGuardDestination=null;
   render();
  }
 });

 pinConfirm?.addEventListener('click',()=>{
  if(!activePinnedLocation)return;
  triggerHaptic('success');
  recordLearnedPlace(activePinnedLocation);
  customGuardDestination=activePinnedLocation;
  hidePinCard();
  flash(`Destino definido: ${activePinnedLocation.name}. Traçando rota…`);
  render();
 });

 document.addEventListener('pointerdown',e=>{
  if(!resultsPanel.hidden&&!resultsPanel.contains(e.target)&&!searchBar?.contains(e.target)){
   resultsPanel.hidden=true;
  }
 });
}

function render(){
 retainEventDraft();
 for(const url of clientMediaUrls)URL.revokeObjectURL(url);clientMediaUrls.length=0;
 routeBoard.resetMaps();resetOperationalMap();coi.reset();
 if(!account){stopInspectorGps();guardStopGps();torch.stop();loginView();return}
 const topHeader=document.querySelector('header.top');if(topHeader)topHeader.style.display=(account.role==='ronda'||page==='chat')?'none':'';
 document.body.dataset.rpPage=page;
 roleTag.textContent=roles[account.role]||account.role;
 const required=({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[page];
 if(review()&&required&&!ops.allowed(required)){page='notifications';selected=null;}
 activity.reset();
 let content=page==='gestao'&&['admin','master'].includes(account.role)?sectorPanel.html():page==='chat'?chat.view():page==='activity-history'?activity.view():page==='guide'?guideView():page==='notifications'?ops.notificationsView():page==='dispatches'?(['ronda','vistoriador'].includes(account.role)?ops.vigilanteDispatches():ops.dispatchesView({users,rounds,events})):page==='permissions'?verificationSettingsHtml(centralVerificationSettings,routes)+ops.permissionsView():page==='routes'&&review()?routeBoard.render():selected?.event?eventView(selected.event):selected?.person?personView(selected.person):page==='treatments'&&review()?treatmentsView():
   account.role==='ronda'?(page==='history'?ownHistory():page==='send'?sendView():ownDashboard()):
   account.role==='cliente'?clientView():
   account.role==='vistoriador'?(page==='history'?ownHistory():page==='send'?sendView():inspectionView()):
   page==='dashboard'?dashboardView():page==='monitor'?monitorView():page==='events'?eventsView():page==='team'?teamView():page==='alerts'?alertView():page==='export'?exportView():dashboardView();
 if(selected?.event)content='<dialog id="central-event-dialog" class="rp-record-dialog"><button type="button" data-close-event>Fechar ✕</button>'+content+'</dialog>';
 const fieldHome=account.role==='ronda'?'dashboard':'inspections';
 if(['ronda','vistoriador'].includes(account.role)&&page!==fieldHome){
  const backdrop=account.role==='ronda'?ownDashboard():inspectionView();
  content=backdrop+(selected?.event?content:'<section class="rp-field-page-overlay" aria-label="Área de trabalho"><button type="button" class="rp-page-back" data-page="'+fieldHome+'">← Voltar ao mapa</button>'+content+'</section>');
 }
 const activeLabel=(roleMenus[account.role]||[]).find(([key])=>key===page)?.[1]||'Detalhes do registro';
 if(inspectionMap){inspectionMap.destroy();inspectionMap=null;}if(guardMap){guardMap.destroy();guardMap=null;}
 if(account.role==='ronda'){
  root.innerHTML=content;
 }else if(page==='chat'){
  tour?.close?.();
  root.innerHTML='<div class="workspace rp2-workspace rp2-chat-workspace"><article class="content rp2-chat-content" style="padding:0;margin:0;max-width:none;border:none">'+content+'</article></div>';
 }else{
  root.innerHTML='<button type="button" class="rp-central-menu-button" data-central-menu aria-expanded="false" aria-controls="central-navigation">☰ Menu '+pendingDot('total',ops.summary().total)+'</button><div class="workspace rp2-workspace">'+nav()+'<article class="content"><div class="rp2-contextbar" aria-label="Contexto do acesso"><div class="rp2-context-copy"><strong>'+escape(activeLabel)+'</strong><small>'+escape(roles[account.role])+' · Acesso autenticado</small></div><button type="button" data-refresh class="rp2-context-refresh" aria-label="Atualizar dados do servidor">Atualizar ↻</button></div>'+ops.assignmentBanner()+firstAccessGuide()+content+'</article></div>'+
   (account.role==='vistoriador'?'<button type="button" id="central-panic" class="central-panic-fab" aria-label="Abrir acionamento de pânico"><span aria-hidden="true">!</span><strong>PÂNICO</strong></button>'+
   '<dialog id="central-panic-dialog" class="central-panic-dialog" aria-labelledby="panic-title"><h2 id="panic-title">Acionar pânico?</h2><p>O acionamento prioritário será registrado com sua identificação e horário. Localização e bateria serão incluídas quando disponíveis. Use o 190 para emergências que exijam atendimento policial.</p><div class="panic-buttons"><button type="button" id="panic-cancel">Cancelar</button><button type="button" id="panic-send" class="primary">Confirmar pânico</button></div><a href="tel:190">Abrir discador 190</a></dialog>':'');
 }
 root.dataset.rpPage=page;
 document.body.dataset.rpPage=page;
 // A lanterna acompanha as ações de campo e é desligada nas áreas administrativas.
 root.dataset.torchRole=(['ronda','vistoriador'].includes(account.role)&&['dashboard','inspections','send','dispatches'].includes(page))?account.role:'';
 torch.decorate();
 mountGuardQuickPanel(root);
 mountGuardSearchAndPin(root);
 const headerActions=document.querySelector('.top-actions');
 if(headerActions){headerActions.querySelector('[data-operational-header]')?.remove();const holder=document.createElement('div');holder.dataset.operationalHeader='';holder.className='rp-header-tools';holder.innerHTML='<div class="ops-bell-bar">'+ops.badge()+'</div><div data-chat-badge>'+chat.badge()+'</div>';headerActions.prepend(holder);}
 const eventDialog=document.querySelector('#central-event-dialog');if(eventDialog){eventDialog.addEventListener('cancel',async e=>{e.preventDefault();try{await releaseTreatment();selected=null;page=detailOrigin;render()}catch(error){flash(error.message)}});eventDialog.showModal();}
 const responseForm=document.querySelector('#send-message[data-event-id]'),draft=responseForm&&eventResponseDrafts.get(responseForm.dataset.eventId);
 if(draft){responseForm.querySelector('textarea').value=draft.body;if(draft.audience&&responseForm.querySelector('[name=audience]'))responseForm.querySelector('[name=audience]').value=draft.audience;}
 decorateTheme(account.role,account.name);
 updatePendingIndicators();
 if(page==='activity-history')activity.mountFilters();
 if(page==='chat')requestAnimationFrame(()=>void chat.mount());
 if(['monitor','dashboard'].includes(page)&&latestActivity&&review()){const host=document.querySelector('.coi3-stats,.cards');if(host){document.querySelector('.coi3-app > .coi3-section')?.remove();const section=document.createElement('div');section.innerHTML=latestActivity;host.after(section);requestAnimationFrame(()=>void activity.mountLatest().catch(e=>flash(e.message)));}}
 if(selected?.event?.kind==='panic'){const eid=selected.event.id;void api('/activity/phone?event='+encodeURIComponent(eid)).then(p=>{const el=document.querySelector('[data-panic-contact]');if(el&&selected?.event?.id===eid)el.innerHTML='<strong>'+escape(p.name)+'</strong> · '+(p.phone?'<a href="tel:'+escape(p.phone.replace(/[^+0-9]/g,''))+'">'+escape(p.phone)+'</a>':'Telefone não cadastrado');}).catch(e=>flash(e.message));}
 if(selected?.event){void loadMessages(selected.event.id);void loadMedia(selected.event.id);}
 if(page==='routes'&&review())requestAnimationFrame(()=>routeBoard.mount());
 if(page==='monitor')requestAnimationFrame(()=>coi.mount());
 if(page==='dashboard'&&review())requestAnimationFrame(()=>mountOperationalMap());
 if(account.role==='ronda'&&document.querySelector('#guard-real-map'))requestAnimationFrame(()=>{
   const host=document.querySelector('#guard-real-map');if(!host)return;
   const planned=guardPlannedRoute();
   const activeBase=guardRound?.base||guardFix;
   const route=planned?buildGuardRoute(planned,activeBase):buildGuardStandbyRoute(account.site,activeBase);
   if(route){
    if(guardMap&&guardMap.container===host&&!guardMap.destroyed){
     guardMap.setRoute(route,guardRound?{mode:'real',index:guardRound.index,checkpoints:route.points.map((_,i)=>({completedAt:guardRound.checkpoints.some(c=>c.index===i)?Date.now():null}))}:null);
    }else{
     guardMap=new PatrolMap(host,{route,session:guardRound?{mode:'real',index:guardRound.index,checkpoints:route.points.map((_,i)=>({completedAt:guardRound.checkpoints.some(c=>c.index===i)?Date.now():null}))}:null,
       position:guardFix||guardRound?.base||route.base,positionVerified:!!guardFix,standbyClean:!route.baseKnown,interactive:true,onStreetRoute:status=>{const label=document.querySelector('[data-guard-road]');if(label)label.textContent=status;}});
    }
    mountGuardSearchAndPin(root);
    guardStartGps();
    updateOfflineSyncBadge();
    void drainOfflineSyncQueue();
   }
  });
  if(account.role==='vistoriador'&&page==='inspections'&&inspectorDraft?.id&&!inspectorWizardAutoId&&ops.activeInspection()?.arrived_at){
   inspectorWizardAutoId=inspectorDraft.id;
   requestAnimationFrame(()=>document.querySelector('#rp-inspection-wizard-dialog')?.showModal());
  }
  if(account.role==='vistoriador'&&document.querySelector('#inspection-map'))requestAnimationFrame(()=>{
  const host=document.querySelector('#inspection-map'),item=ops.activeInspection();
  if(host){
    const ordered=inspectionQueueNow();
    inspectorSignature=inspectionSignature(ordered);
    const route=inspectionRoute(ordered,inspectionPosition());
    inspectionMap=new PatrolMap(host,{route,session:ordered.length?{mode:'real',currentId:ordered[0].id,checkpoints:[],deviations:[]}:null,
      position:inspectorPosition||inspectorBase||route.base,positionVerified:!!inspectorPosition,standbyClean:!ordered.length,interactive:true,
      onStreetRoute:status=>{const el=document.querySelector('[data-inspection-road-state]');if(el)el.textContent=status;}});
    if(ordered.length)startInspectorGps();
   }
 });
 if(account.role==='cliente'&&page==='client')requestAnimationFrame(()=>{mountClientMap();void loadClientInspectionMedia();});
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
 popup.document.open();popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conversas Rondas Pro</title><style>body{ font: 14px/1.5 system-ui; color: #233341; margin: 18mm; }h1{ color: #146585; }section{ border-top: 1px solid #ccd8e2; padding-top: 12px; margin: 20px 0; }.bubble{ padding: 10px 12px; break-inside: avoid; border: 1px solid #c9d8e2; border-radius: 8px; margin: 8px 0; }.bubble p{ margin: 0 0 8px; }.bubble small{ display: block; font-size: 10px; color: #687c8a; }</style></head><body><h1>Rondas Pro | Conversas operacionais</h1><p>Gerado '+escape(fmt(Date.now()))+'. Documento restrito a pessoal autorizado.</p>'+(content||'<p>Sem mensagens.</p>')+'</body></html>');
 popup.document.close();popup.focus();popup.print();
}
document.addEventListener('change',e=>{
 if(!e.target.matches('[data-inspection-photo-upload]'))return;
 const form=e.target.closest('#inspection-form');if(!form)return;
 const files=[...(e.target.files||[])],valid=files.filter(f=>f.type.startsWith('image/')&&f.size>0&&f.size<=25*1024*1024);
 if(valid.length!==files.length)flash('Algumas imagens não foram aceitas (25 MB por arquivo).');
 const available=Math.max(0,12-inspectorEvidence.length);inspectorEvidence.push(...valid.slice(0,available));
 if(valid.length>available)flash('Limite de 12 anexos por vistoria.');
 const holder=form.querySelector('[data-evidence-attachments]');
 if(holder)holder.textContent=inspectorEvidence.length+' foto(s) e anexo(s): '+inspectorEvidence.map(f=>f.name).join(' · ');
 e.target.value='';
});
document.addEventListener('click',async e=>{
 const openPopover=document.querySelector('.rp-header-popover[open]');
 if(openPopover&&!openPopover.contains(e.target)){
  openPopover.removeAttribute('open');
 }
 const openedNavigation=document.querySelector('#central-navigation.is-open');
 if(openedNavigation&&!e.target.closest('#central-navigation,[data-central-menu]')){
  openedNavigation.classList.remove('is-open');
  document.querySelector('[data-central-menu]')?.setAttribute('aria-expanded','false');
  const backdrop=document.querySelector('#agent-drawer-backdrop');
  if(backdrop)backdrop.hidden=true;
 }
 const target=e.target.closest('button');if(!target)return;
 try{
  if(target.dataset.evidenceKind&&['ronda','vistoriador'].includes(account?.role)&&['send','inspections'].includes(page)){
   const isInspection=page==='inspections',form=document.querySelector(isInspection?'#inspection-form':'#send-note');
   if(!form)return;
   try{
    const file=await inspectorCapture.request(target.dataset.evidenceKind);
    if(!form.isConnected)return;
    const store=isInspection?inspectorEvidence:fieldMessageEvidence;
    if(isInspection&&target.dataset.evidenceKind==='selfie'){
     inspectorSelfie=file;
     const selfie=form.querySelector('.rp-inspection-selfie');if(selfie)selfie.innerHTML='Selfie capturada <span>Pronta para envio</span>';
     return;
    }
    if(store.length>=(isInspection?12:8)){flash('Limite de anexos atingido.');return}
    store.push(file);
    const holder=form.querySelector('[data-evidence-attachments]');
    if(holder)holder.textContent=store.map(x=>x.name).join(' · ');
   }catch(error){if(!/cancelad|nenhuma evidência/i.test(error.message))flash(error.message)}
   return;
  }
  if(target.hasAttribute('data-sheet-recolher')){
   const panel=document.querySelector('[data-guard-panel]');
   if(panel){
    panel.classList.add('is-collapsed');
    const content=panel.querySelector('[data-guard-panel-content]');
    if(content)content.hidden=true;
    panel.querySelector('[data-guard-panel-toggle]')?.setAttribute('aria-expanded','false');
   }
   return;
  }
  if(account?.role==='ronda'&&target.closest('[data-agent-sos], #central-panic')){
   guardSosActive=!guardSosActive;
   if(guardSosActive){
    void api('/events',{method:'POST',data:{kind:'panic',occurredAt:Date.now(),description:'Botão de pânico acionado pelo vigia',...await eventTelemetry()}}).catch(()=>{});
   }
   render();
   return;
  }
  if(isPagesTestMode()&&target.dataset.quickRole){
   const role=target.dataset.quickRole;
   account={id:'local-'+role,name:roles[role]||role,username:role,email:role+'@rondapro.local',role,site:'Grupo Maxvel',active:1};
   token='local-offline:'+role;
   sessionStorage.setItem('rondaspro_api_token',token);
   guardLoadState();
   await load();
   return;
  }
  if(target.dataset.action==='toggle-camera-lock'||target.closest('[data-action="toggle-camera-lock"]')){
   try{window.triggerHaptic?.('medium');}catch{}
   const locked=guardMap?.toggleCameraLock();
   flash(locked?'🎯 Foco fixado no GPS':'🔓 Câmera liberada para navegação manual');
   return;
  }
  if(target.dataset.action==='offline-map'||target.closest('[data-action="offline-map"]')){
   try{window.triggerHaptic?.('medium');}catch{}
   const isOnline=typeof navigator==='undefined'||navigator.onLine!==false;
   flash(isOnline
    ? '✓ Mapa Online Operacional: conectado aos servidores de cartografia, com base completa de Divinópolis e rota salvas no aparelho para contingência offline.'
    : '📡 Modo Offline: operando com a base cartográfica de Divinópolis e percurso salvos no aparelho.');
   return;
  }
  if(target.id==='central-panic'||target.hasAttribute('data-agent-sos')){document.querySelector('#central-panic-dialog')?.showModal();return;}
  if(target.hasAttribute('data-guard-fit')){guardMap?.fit();return;}
  if(target.dataset.action==='new-round'||target.closest('[data-action="new-round"]')){
   if(guardRound){
    flash('Ronda já em andamento. Percorra os pontos ou finalize o circuito.');
    return;
   }
   const panel=document.querySelector('[data-guard-panel]');
   if(panel){
    panel.classList.remove('is-collapsed');
    const content=panel.querySelector('[data-guard-panel-content]');
    if(content)content.hidden=false;
    panel.querySelector('[data-guard-panel-toggle]')?.setAttribute('aria-expanded','true');
   }
   const startBtn=document.querySelector('[data-guard-start]');
   if(startBtn){
    startBtn.click();
   }else{
    flash('Painel de Rondas pronto. Pressione Iniciar Rota de Ronda.');
   }
   return;
  }
  if(target.hasAttribute('data-guard-next-link')||e.target.closest('[data-guard-next-link]')){
   if(!guardRound){
    flash('Chegue primeiro ao Posto 1 no mapa e cumpra os 30 segundos de permanência antes de avançar para o Posto 2.');
    return;
   }
   if(guardRound.index === 0){
    if(guardRound.insideSince == null){
     flash('Chegue primeiro ao Posto 1 no mapa e cumpra os 30 segundos de permanência antes de avançar para o Posto 2.');
    }else{
     const elapsed=Date.now()-guardRound.insideSince;
     if(elapsed<GUARD_DWELL_MS){
      const rem=Math.ceil((GUARD_DWELL_MS-elapsed)/1000);
      flash('Permaneça no Posto 1 por mais '+rem+' s com GPS ativo antes de deslocar para o Posto 2.');
     }else{
      flash('Confirme a verificação do Posto 1 no botão abaixo antes de deslocar para o Posto 2.');
     }
    }
    return;
   }
   flash('Deslocamento para o Posto 2 em andamento. Siga a rota indicada no mapa.');
   guardMap?.fit();
   return;
  }
  if(target.dataset.page==='dashboard'&&account?.role==='ronda'){
   document.querySelector('#central-navigation')?.classList.remove('is-open');
   document.querySelector('[data-central-menu]')?.setAttribute('aria-expanded','false');
   const backdrop=document.querySelector('#agent-drawer-backdrop');
   if(backdrop)backdrop.hidden=true;
   flash('Mapa operacional ativo.');
   if(page!=='dashboard'){page='dashboard';render();}
   return;
  }
  if(target.hasAttribute('data-guard-start')){
   if(account?.role!=='ronda'||guardRound)return;
   const planned=guardPlannedRoute();
   if(!planned){
    flash('Aguardando o COI criar e enviar a sua rota.');
    return;
   }
   const fix=await guardRequireGps(),route=buildGuardRoute(planned,fix);if(!route?.points?.length)throw Error('Rota sem coordenadas.');
   const state=initialGuardState(route,fix);target.disabled=true;
   try{
    if(planned.dispatchId){
     const response=await api('/dispatches/'+encodeURIComponent(planned.dispatchId)+'/start',{method:'POST',data:{position:fix}});
     if(!response?.ok)throw Error('COI não confirmou o início do atendimento.');
     state.id=planned.dispatchId;state.dispatchId=planned.dispatchId;
    }else{
     const response=await api('/events',{method:'POST',data:{kind:'patrol_start',roundId:state.id,occurredAt:Date.now(),description:'Ronda iniciada · '+planned.name,details:{routeId:planned.id},position:fix}});
     if(!response?.id)throw Error('COI não confirmou o início da ronda.');
    }
    guardRound=state;guardSave();
    if(window.AndroidTracking?.startTracking)window.AndroidTracking.startTracking();
    guardStartGps();render();flash('Ronda iniciada e sincronizada.');
   }finally{if(target.isConnected)target.disabled=false;}return;
  }
  if(target.hasAttribute('data-guard-arrive')){
   if(!guardRound?.points?.[guardRound.index])return;
   const fix=await guardRequireGps(),state=nextGuardState(guardRound,fix,{action:'arrive'});
   if(!state.inside){
    const d=metersBetween(fix,guardRound.points[guardRound.index]);
    throw Error(Number.isFinite(d)?'Fora do raio de '+GUARD_RADIUS_METERS+' m do ponto (distância: '+Math.round(d)+' m). Aproxime-se do local.':'Fora do raio de '+GUARD_RADIUS_METERS+' m do ponto.');
   }
   guardRound=state.state;guardSave();render();flash('Estou aqui confirmado. Permaneça 30 segundos.');return;
  }
  if(target.hasAttribute('data-guard-checkpoint')){
   if(!guardRound?.points?.[guardRound.index])return;
   const fix=await guardRequireGps(),check=nextGuardState(guardRound,fix);
   if(!check.ready)throw Error('Aguarde 30 segundos dentro do raio com GPS confiável.');
   const current=guardRound.points[guardRound.index];target.disabled=true;
   try{
    const result=await guardEvent('checkpoint','Ponto verificado: '+current.name,{routeId:guardRound.routeId,index:guardRound.index,name:current.name},fix);
    if(!result?.id)throw Error('COE não confirmou o ponto.');
    guardRound=markGuardPoint(guardRound);guardSave();render();flash('Ponto registrado no COE.');
   }finally{if(target.isConnected)target.disabled=false;}return;
  }
  if(target.hasAttribute('data-guard-finish')){
   if(!guardRound||guardRound.index!==guardRound.points.length)return;
   const fix=await guardRequireGps();if(metersBetween(fix,guardRound.base)>GUARD_RADIUS_METERS)throw Error('Retorne à base para concluir a ronda.');
   target.disabled=true;
   try{
    if(guardRound.dispatchId){
     const completed=await api('/dispatches/'+encodeURIComponent(guardRound.dispatchId)+'/complete',{method:'POST',data:{note:'Ronda concluída com todos os pontos verificados pelo GPS e retorno à base.',position:fix}});
     if(!completed?.ok)throw Error('COI não confirmou a conclusão.');
    }else{
     const completed=await guardEvent('patrol_end','Ronda concluída e retorno à base registrado.',{routeId:guardRound.routeId,completedPoints:guardRound.index},fix);
     if(!completed?.id)throw Error('COI não confirmou o encerramento.');
    }
    guardRound=null;guardLastSampleFix=null;guardLastSampleAt=0;guardSave();guardStopGps();
    if(window.AndroidTracking?.stopTracking)window.AndroidTracking.stopTracking();
    await ops.refresh(account,false);
    render();flash('Ronda concluída e sincronizada.');
   }finally{if(target.isConnected)target.disabled=false;}return;
  }
  if(target.hasAttribute('data-wizard-open')){const d=document.querySelector('#rp-inspection-wizard-dialog');if(d&&!d.open)d.showModal();return;}
   if(target.hasAttribute('data-wizard-close')){document.querySelector('#rp-inspection-wizard-dialog')?.close();return;}
   if(target.hasAttribute('data-wizard-next')||target.hasAttribute('data-wizard-back')){
    const form=document.querySelector('#inspection-form');if(!form||!inspectorDraft)return;
    const updated=updateInspectionDraft(inspectorDraft,form),errors=inspectionProblems(updated);
    if(target.hasAttribute('data-wizard-next')&&errors.length){const node=form.querySelector('[data-wizard-error]');node.hidden=false;node.textContent=errors[0];return;}
    updated.step=Math.max(0,Math.min(stepCount()-1,updated.step+(target.hasAttribute('data-wizard-back')?-1:1)));
    inspectorDraft=updated;form.querySelector('.rp-field-wizard').outerHTML=inspectionWizardHtml(inspectorDraft);return;
   }
   if(target.hasAttribute('data-field-tool-torch')){
    guardTorchActive=!guardTorchActive;
    await torch.toggle();
    target.classList.toggle('is-active',guardTorchActive);
    return;
   }
   if(target.hasAttribute('data-agent-sos')){
    guardSosActive=!guardSosActive;
    const bar=document.querySelector('#agent-emergency-bar');
    if(bar)bar.hidden=!guardSosActive;
    target.classList.toggle('is-active',guardSosActive);
    if(guardSosActive){
     flash('Canal de emergência ativado! Telemetria e áudio transmitidos ao COI.');
     try{
      const fix=guardFix||(await guardRequireGps().catch(()=>null));
      await api('/events',{method:'POST',data:{kind:'panic',occurredAt:Date.now(),description:'Canal de emergência ativado pelo Agente no Ronda Pro',position:fix}});
     }catch(err){console.error(err);}
    }else{
     flash('Canal de emergência desativado.');
    }
    return;
   }
   if(target.hasAttribute('data-sheet-recolher')){
    const panel=document.querySelector('[data-guard-panel]');
    if(panel){
     const next=!panel.classList.contains('is-collapsed');
     panel.classList.toggle('is-collapsed',next);
     const content=panel.querySelector('[data-guard-panel-content]');
     if(content)content.hidden=next;
     const toggle=panel.querySelector('[data-guard-panel-toggle]');
     if(toggle)toggle.setAttribute('aria-expanded',String(!next));
    }
    return;
   }
   if(target.dataset.action==='logout-agent'){
    await releaseTreatment();
    if(['ronda','vistoriador'].includes(account?.role))try{await api('/presence/off',{method:'POST'})}catch{}
    ops.stopLive();chat.reset();calls.reset();activity.reset(true);
    try{await api('/logout',{method:'POST'})}catch{}
    token='';account=null;eventResponseDrafts.clear();sessionStorage.removeItem('rondaspro_api_token');
    root.dataset.loadedRole='';loginView();
    return;
   }
   if(target.hasAttribute('data-agent-nav')||target.hasAttribute('data-agent-action')){
    document.querySelector('#central-navigation')?.classList.remove('is-open');
    const backdrop=document.querySelector('#agent-drawer-backdrop');
    if(backdrop)backdrop.hidden=true;
    flash('Rondas sincronizadas com o COI.');
    await ops.refresh(account,false);
    render();
    return;
   }
   if(target.hasAttribute('data-field-tool-panic')){document.querySelector('#central-panic-dialog')?.showModal();return;}
   if(target.hasAttribute('data-field-tool-chat')){const button=document.querySelector('[data-chat-open-quick],[data-chat-page]');if(button)await chat.click(button);else {page='chat';render();}return;}
   if(target.hasAttribute('data-field-tool-alert')||target.hasAttribute('data-field-tool-incident')){composeKind=target.hasAttribute('data-field-tool-alert')?'alert':'incident';page='send';render();return;}
   if(target.hasAttribute('data-inspection-fit')){inspectionMap?.fit();return;}
  if(target.hasAttribute('data-inspection-depart')){
   const task=inspectionQueueNow()[0];if(!task)return;
   target.disabled=true;
   try{
    const fix=await getInspectorFix();
    if(!inspectorBase){inspectorBase={lat:fix.lat,lng:fix.lng};sessionStorage.setItem('rondaspro-inspector-base',JSON.stringify(inspectorBase));}
    await api('/dispatches/'+encodeURIComponent(task.id)+'/start',{method:'POST',data:{position:fix}});
    startInspectorGps();await ops.refresh(account,false);render();
    flash('Saída da base registrada. GPS em acompanhamento.');
   }finally{if(target.isConnected)target.disabled=false}
   return;
  }
  if(target.hasAttribute('data-inspection-arrive')){
   const task=inspectionQueueNow()[0];if(!task?.started_at)return;
   const point=pointOf(task),position=pointOf(inspectorPosition);
   if(point&&position&&metersBetween(point,position)>200){
    throw Error('O GPS ainda indica distância superior a 200 m deste destino. Confira a localização.');
   }
   if(point&&!position)throw Error('Aguarde o GPS para confirmar chegada ao local.');
   target.disabled=true;
   try{
    await api('/dispatches/'+encodeURIComponent(task.id)+'/arrive',{method:'POST',data:{position:inspectorPosition}});
    await ops.refresh(account,false);render();
    requestAnimationFrame(()=>document.querySelector('#inspection-form')?.scrollIntoView({behavior:'smooth',block:'start'}));
    flash('Chegada registrada. Preencha o laudo e as evidências.');
   }finally{if(target.isConnected)target.disabled=false}
   return;
  }
  if(target.hasAttribute('data-field-notification-close')){document.querySelector('#rp-field-notification-dialog')?.close();return;}
  if(target.hasAttribute('data-close-event')){await releaseTreatment();selected=null;page=detailOrigin;render();return;}
  if(await calls.click(target))return;
  if(await chat.click(target))return;
  if(await activity.click(target))return;
  if(await ops.click(target))return;
  if(await routeBoard.click(target))return;
  if(target.dataset.compose==='message'){selected=null;if(page!=='chat')previousPageBeforeChat=page;page='chat';render();return;}
  if(target.dataset.compose){if(!['ronda','vistoriador'].includes(account?.role)||!['alert','incident','message'].includes(target.dataset.compose))return;composeKind=target.dataset.compose;selected=null;if(composeKind==='message'&&page!=='chat')previousPageBeforeChat=page;page=composeKind==='message'?'chat':'send';render();return;}
  if(account?.role==='ronda'&&target.closest('[data-field-tool-torch]')){
   guardTorchActive=!guardTorchActive;
   try{torch.toggle()}catch{}
   render();
   return;
  }
  if(account?.role==='ronda'&&target.closest('[data-sheet-recolher]')){
   const sheet=document.querySelector('.ronda-bottom-sheet');
   if(sheet){
    const collapsed=sheet.classList.toggle('is-collapsed');
    const chevron=sheet.querySelector('[data-sheet-chevron]');
    if(chevron)chevron.style.transform=collapsed?'rotate(180deg)':'rotate(0deg)';
    const content=sheet.querySelector('[data-guard-panel-content]');
    if(content)content.hidden=collapsed;
   }
   return;
  }
   if(target.closest('[data-page="tutorial"]')||target.dataset?.page==='tutorial'){
    document.querySelector('#central-navigation')?.classList.remove('is-open');
    const backdrop=document.querySelector('#agent-drawer-backdrop');
    if(backdrop)backdrop.hidden=true;
    tour.open();
    return;
   }
  if(account?.role==='ronda'&&target.closest('.ronda-menu-item')){
   const item=target.closest('.ronda-menu-item');
   document.querySelectorAll('.ronda-menu-item').forEach(el=>el.classList.remove('is-active','is-highlighted'));
   item.classList.add('is-active','is-highlighted');
   document.querySelector('#central-navigation')?.classList.remove('is-open');
   const backdrop=document.querySelector('#agent-drawer-backdrop');
   if(backdrop)backdrop.hidden=true;
   if(item.dataset.page&&item.dataset.page!=='dashboard'){
    page=item.dataset.page;
    render();
   }else{
    page='dashboard';
    render();
   }
   return;
  }
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
  if(target.hasAttribute('data-inspection-queue')){
   if(!review()||!ops.allowed('despachos')){flash('Despachos não estão habilitados neste perfil.');return;}
   page='dispatches';selected=null;render();
   await ops.click(document.querySelector('[data-ops-new-inspection]'));
   return;
  }
  if(target.hasAttribute('data-close-central-menu')||target.id==='agent-drawer-backdrop'){
   document.querySelector('#central-navigation')?.classList.remove('is-open');
   const trigger=document.querySelector('[data-central-menu]');trigger?.setAttribute('aria-expanded','false');trigger?.focus();
   const backdrop=document.querySelector('#agent-drawer-backdrop');
   if(backdrop)backdrop.hidden=true;
   return;
  }
  if(target.dataset.action==='logout-agent'){
   document.querySelector('#exit')?.click();
   return;
  }
  if(target.hasAttribute('data-central-menu')){
   const nav=document.querySelector('#central-navigation'),open=!nav.classList.contains('is-open');nav.classList.toggle('is-open',open);target.setAttribute('aria-expanded',String(open));
   const backdrop=document.querySelector('#agent-drawer-backdrop');
   if(backdrop)backdrop.hidden=!open;
   return;
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
   if(target.dataset.page==='tutorial'){tour.open();return;}
  if(target.dataset.page){if(!(roleMenus[account.role]||[]).some(entry=>entry[0]===target.dataset.page))return;const mod=({monitor:'mapa',routes:'rondas',team:'rondas',events:'ocorrencias',dispatches:'despachos',alerts:'alertas',export:'relatorios'})[target.dataset.page];if(mod&&review()&&!ops.allowed(mod)){flash('Área desabilitada pela administração.');return;}await releaseTreatment();selected=null;if(target.dataset.page==='chat'&&page!=='chat')previousPageBeforeChat=page;page=target.dataset.page;if(page==='treatments')await readTreatmentRows();if(page==='activity-history')await activity.refresh();document.querySelector('#central-navigation.is-open')?.classList.remove('is-open');document.querySelector('[data-central-menu]')?.setAttribute('aria-expanded','false');const ab=document.querySelector('#agent-drawer-backdrop');if(ab)ab.hidden=true;document.querySelectorAll('.rp-header-popover[open]').forEach(d=>d.open=false);render();if(page==='gestao')await sectorPanel.load();window.scrollTo(0,0);return;}
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
 if(form.id==='verification-settings-form'){e.preventDefault();try{centralVerificationSettings=await saveVerificationSettings(form,api);}catch(error){flash(error.message);const status=form.querySelector('[data-verification-status]');if(status)status.textContent=error.message;}return;}
 if(form.id==='verification-qr-form'){e.preventDefault();try{await renderQrLabels(form,api);}catch(error){flash(error.message);}return;}
 if(['ops-dispatch-form','ops-completion-form','ops-inspector-form','ops-destination-form','coi-field-notice-form'].includes(form.id)){e.preventDefault();try{await ops.submit(form)}catch(err){flash(err.message)}return;}
 if(form.id==='route-form'){e.preventDefault();try{await routeBoard.submit(form)}catch(err){flash(err.message)}return;}
 if(!['central-login','new-user','save-template','recipient-form','send-alert','register-incident','send-note','send-message','upload-evidence','inspection-form'].includes(form.id))return;
 e.preventDefault();const d=Object.fromEntries(new FormData(form));
 try{
  if(form.id==='central-login'){
   try{
    const result=await api('/login',{method:'POST',data:d});
    token=result.token;sessionStorage.setItem('rondaspro_api_token',token);try{localStorage.setItem('rondaspro_android_token',token);window.AndroidTracking?.rememberToken?.(token)}catch{}
    await load();return;
   }catch(loginErr){
    const ident=String(d.email||'').trim().toLowerCase();
    const role=ident.includes('ronda')||ident.includes('vigia')?'ronda':ident.includes('coi')?'coi':ident.includes('vistoria')?'vistoriador':ident.includes('admin')?'admin':null;
    if(isPagesTestMode()&&role){
     account={id:'local-'+role,name:roles[role]||role,username:role,email:role+'@rondapro.local',role,site:'Grupo Maxvel',active:1};
     token='local-offline:'+role;
     sessionStorage.setItem('rondaspro_api_token',token);
     guardLoadState();
     await load();return;
    }
    throw loginErr;
   }
  }
  if(form.id==='inspection-form'){
   inspectorDraft=updateInspectionDraft(inspectorDraft,form);
    if(inspectorDraft?.step!==stepCount()-1)throw Error('Avance até a última etapa.');
    const problems=inspectionProblems(inspectorDraft,{final:true});if(problems.length)throw Error(problems[0]);
    if(!inspectionQueueNow()[0]||d.dispatchId!==inspectionQueueNow()[0].id||!inspectionQueueNow()[0].arrived_at)throw Error('Registre a chegada antes do laudo.');
    if(!d.confirmation)throw Error('Confirme a verificação presencial.');
    if(!inspectorSelfie||!inspectorEvidence.some(file=>file.type.startsWith('image/')))throw Error('Capture selfie e foto do local para concluir.');
    const {criteria,verified,observation}=inspectionPayload(inspectorDraft);
   if(inspectorSubmission?.dispatchId!==d.dispatchId)inspectorSubmission=null;
   if(!inspectorSubmission){
    const record=await api('/events',{method:'POST',data:{kind:'inspection',occurredAt:Date.now(),description:observation.slice(0,1000),details:{criteria,verified,dispatchId:d.dispatchId},...await eventTelemetry()}});
    inspectorSubmission={dispatchId:d.dispatchId,eventId:record.id,uploaded:new Map()};
   }
   const files=[inspectorSelfie,...inspectorEvidence];
   for(const file of files){
    const mediaId=inspectorSubmission.uploaded.get(file)||crypto.randomUUID();
    await api('/media',{method:'POST',raw:file,headers:{'Content-Type':file.type,'X-Ronda-Event-Id':inspectorSubmission.eventId,'X-Ronda-Media-Id':mediaId,'X-Captured-At':String(file.lastModified||Date.now()),'X-Media-View':file===inspectorSelfie?'selfie':file.type.startsWith('image/')?'front':''}});
    inspectorSubmission.uploaded.set(file,mediaId);
   }
   await api('/dispatches/'+d.dispatchId+'/complete',{method:'POST',data:{note:observation,position:(await eventTelemetry()).position||null}});
   const uploaded=inspectorSubmission.uploaded.size;
   inspectorSubmission=null;inspectorSelfie=null;inspectorEvidence=[];inspectorDraft=null;inspectorWizardAutoId=null;
   flash('Vistoria concluída com '+uploaded+' evidências enviadas.');
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
  if(form.id==='send-message'){const responseEventId=selected.event.id;await api('/events/'+responseEventId+'/messages',{method:'POST',data:{body:d.body,audience:d.audience||'general',claimSession}});eventResponseDrafts.delete(responseEventId);form.reset();await loadMessages(selected.event.id);return;}
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
setInterval(()=>{if(account&&['operador','coi','cliente','admin','master','ronda'].includes(account.role)&&['monitor','client','routes','treatments','notifications','dashboard'].includes(page)&&!document.hidden&&!selected&&!(page==='routes'&&document.querySelector('#route-form')))void load();},30000);
setInterval(()=>{if(account&&!document.hidden)void ops.refresh(account,true).catch(()=>{});},15000);
setInterval(()=>{if(claimedEvent&&account&&!document.hidden)void api('/events/'+claimedEvent+'/claim',{method:'POST',data:{claimSession}}).catch(error=>flash(error.message));},40000);
setInterval(()=>{if(['ronda','vistoriador'].includes(account?.role)&&!document.hidden)void eventTelemetry().then(ctx=>api('/presence',{method:'POST',data:{position:ctx.position||null}})).catch(()=>{});},45000);
setInterval(()=>{for(const e of document.querySelectorAll('[data-ops-live-clock]'))e.textContent=new Date().toLocaleTimeString('pt-BR');},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&guardRound?.insideSince!=null){guardRound={...guardRound,insideSince:null};guardSave();}if(!document.hidden&&account?.role==='ronda'&&guardRound)guardStartGps();if(!document.hidden&&['ronda','vistoriador'].includes(account?.role))void eventTelemetry().then(ctx=>api('/presence',{method:'POST',data:{position:ctx.position||null}})).catch(()=>{});});
document.addEventListener('change',e=>{
 if(e.target?.dataset?.coiToggle){void ops.change(e.target).then(()=>load()).catch(error=>flash(error.message));return;}
 const field=e.target.closest('[data-occ-filter]');
 if(field){occurrenceFilters[field.dataset.occFilter]=field.value;render();return;}
 routeBoard.change(e.target);
});
exit.addEventListener('click',async()=>{tour.close();tourAccount='';await releaseTreatment();if(['ronda','vistoriador'].includes(account?.role))try{await api('/presence/off',{method:'POST'})}catch{}ops.stopLive();chat.reset();calls.reset();activity.reset(true);document.querySelector('[data-operational-header]')?.remove();try{await api('/logout',{method:'POST'})}catch{}token='';account=null;eventResponseDrafts.clear();sessionStorage.removeItem('rondaspro_api_token');try{localStorage.removeItem('rondaspro_android_token');}catch{}root.dataset.loadedRole='';loginView()});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 const nav=document.querySelector('#central-navigation.is-open');if(!nav)return;
 nav.classList.remove('is-open');
 const trigger=document.querySelector('[data-central-menu]');trigger?.setAttribute('aria-expanded','false');trigger?.focus();
});
window.__centralJsReady=true;
load();

setInterval(guardTick,1000);
setInterval(()=>{
 if(!guardRound?.insideSince||document.hidden||account?.role!=='ronda'||!navigator.geolocation)return;
 navigator.geolocation.getCurrentPosition(pos=>guardUpdateFix({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:pos.timestamp}),
  ()=>{}, {enableHighAccuracy:true,maximumAge:1500,timeout:6000});
},4000);
setInterval(()=>{if(account&&!document.hidden)void chat.refresh().catch(()=>{});},4000);
setInterval(()=>{if(account&&!document.hidden)void calls.poll();},2000);
