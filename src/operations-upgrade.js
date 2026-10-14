import {evidenceButtons,createMediaCapture} from './media-capture.js';
/** Rondas Pro: ampliação aditiva da demonstração operacional.
 * Persistência em IndexedDB no dispositivo; em Android o trajeto também usa SQLite nativo.
 * Sem API de produção, "pendente de envio" nunca significa entregue remotamente.
 */
import {fallbackSVG} from './map.js';
import {createXlsxReport} from './report-xlsx.js';
import {comparePatrols,ALERT_PRESETS} from './field-intelligence.js';

const DB_NAME='rondas-pro-dispositivo-v1';
const DB_VERSION=1;
const uuid=()=>globalThis.crypto?.randomUUID?.()??'ev-'+Date.now()+'-'+Math.random().toString(16).slice(2);
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowText=n=>new Date(n).toLocaleString('pt-BR');
const limit=(value,max=130)=>String(value??'').slice(0,max);
const validateCoords=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Number.isFinite(p.accuracy)&&p.accuracy>=0;
const round=n=>Math.round(n*100)/100;

export function openDeviceStore(indexedDB=globalThis.indexedDB){
 if(!indexedDB)return Promise.reject(new Error('Armazenamento IndexedDB indisponível'));
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,DB_VERSION);
  request.onupgradeneeded=()=>{
   const db=request.result;
   for(const name of ['events','media','maps','reports'])
    if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error??new Error('Falha de armazenamento local'));
 });
}
export function createDeviceStore(){
 let dbPromise;
 const db=()=>dbPromise??=(openDeviceStore().catch(e=>{dbPromise=null;throw e}));
 const transact=async(name,kind,action)=>{
  const database=await db();
  return new Promise((resolve,reject)=>{
   const tx=database.transaction(name,kind);
   const req=action(tx.objectStore(name));
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
   tx.onerror=()=>reject(tx.error);
  });
 };
 return {
  put:(name,object)=>transact(name,'readwrite',o=>o.put(object)),
  get:(name,id)=>transact(name,'readonly',o=>o.get(id)),
  all:name=>transact(name,'readonly',o=>o.getAll()),
  delete:(name,id)=>transact(name,'readwrite',o=>o.delete(id))
 };
}
/** Exibe a comprovação apenas na ronda em andamento do próprio vigia. */
export function canShowPatrolVerification({user,view,session}={}){
 return user?.role==='ronda'&&view==='minha-ronda'&&session?.status==='active';
}
export function patrolInsights(sessions=[],programs=[]){
 const total=sessions.length,finished=sessions.filter(s=>s.status==='completed'),
  open=sessions.reduce((n,s)=>n+(s.incidents??[]).filter(i=>i.status!=='Resolvida').length,0),
  alerts=sessions.reduce((n,s)=>n+(s.notifications??[]).filter(i=>!i.seenAt).length,0),
  valid=finished.map(s=>s.finishedAt-s.startedAt).filter(n=>Number.isFinite(n)&&n>=0);
 const time=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length/60000):null;
 const observations=[
  {label:'Conclusão de rondas',value:total?round(finished.length/total*100)+'%':'Sem dados',detail:finished.length+' de '+total+' execuções registradas'},
  {label:'Tempo médio de conclusão',value:time===null?'Sem dados':time+' min',detail:'Calculado apenas sobre rondas finalizadas'},
  {label:'Ocorrências em aberto',value:open,detail:'Demandam acompanhamento humano'},
  {label:'Alertas não analisados',value:alerts,detail:'Inclui eventos de pânico, desvios e ocorrências'},
  {label:'Programações cadastradas',value:programs.length,detail:'Agendamento não é comprovação de execução'}
 ];
 return {total,finished:finished.length,open,alerts,observations};
}
export function buildReportData(context,sections=['resumo','rondas','pontos','ocorrencias','alertas','coordenadas','programacao'],events=[]){
 const sessions=[...(context.sessions??[])].sort((a,b)=>b.startedAt-a.startedAt);
 const insight=patrolInsights(sessions,context.programs??[]);
 const result={titulo:'Rondas Pro · Relatório operacional',geradoEm:new Date().toISOString(),ambiente:'Demonstração local, sem sincronização remota',secoes:sections};
 if(sections.includes('resumo'))result.resumo=insight;
 if(sections.includes('rondas'))result.rondas=sessions.map(s=>({id:s.id,responsavel:s.name,rota:s.route?.name,inicio:s.startedAt,fim:s.finishedAt,status:s.status,pontosConcluidos:s.index,totalPontos:s.route?.points?.length??0,modo:s.mode}));
 if(sections.includes('pontos'))result.pontos=sessions.flatMap(s=>(s.checkpoints??[]).map((p,i)=>({ronda:s.id,nome:s.route?.points?.[i]?.name,indice:i+1,concluidoEm:p.completedAt,permanenciaMs:p.dwellMs,qrValidadoEm:p.qrVerifiedAt??null})));
 if(sections.includes('ocorrencias'))result.ocorrencias=sessions.flatMap(s=>(s.incidents??[]).map(i=>({ronda:s.id,vigia:s.name,...i,media:(i.media??[]).map(m=>({nome:m.name,tipo:m.type,tamanho:m.size}))})));
 if(sections.includes('alertas'))result.alertas=[...sessions.flatMap(s=>(s.notifications??[]).map(n=>({ronda:s.id,vigia:s.name,...n}))),...events.filter(x=>x.kind==='panic').map(x=>({vigia:x.payload?.vigia,tipo:'panic',criadoEm:x.at,entrega:x.status}))];
 if(sections.includes('coordenadas'))result.coordenadas=sessions.map(s=>({ronda:s.id,ultimaPosicao:s.lastFix??null,amostras:events.filter(e=>e.kind==='gps'&&e.payload?.sessionId===s.id).sort((a,b)=>a.at-b.at).map(e=>({at:e.at,...e.payload.position})),observacao:'Amostras guardadas neste dispositivo; históricos nativos adicionais dependem da recuperação SQLite'}));
 if(sections.includes('programacao'))result.programacao=(context.programs??[]).map(p=>({...p}));
 return result;
}
export function reportCSV(report){
 const rows=[['secao','campo','valor']];
 for(const [key,value] of Object.entries(report)){
  if(Array.isArray(value))for(const obj of value)rows.push([key,'registro',JSON.stringify(obj)]);
  else rows.push([key,'dados',JSON.stringify(value)]);
 }
 return '\ufeff'+rows.map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
}
export function reportHTML(report){
 const sections=Object.entries(report).map(([key,value])=>'<section><h2>'+safe(key)+'</h2><pre>'+safe(JSON.stringify(value,null,2))+'</pre></section>').join('');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório · Rondas Pro</title><style>body{font:14px system-ui;margin:32px;color:#192230}h1{color:#136995}section{break-inside:avoid;border-top:1px solid #ccc;margin-top:18px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 monospace}@media print{body{margin:12mm}}</style></head><body><h1>Rondas Pro · Grupo Maxvel</h1><p>Relatório demonstrativo. Gerado em '+safe(nowText(Date.now()))+'. Dados locais de teste, sem validação operacional de campo.</p>'+sections+'</body></html>';
}
function download(content,name,type){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function section(title,body,sub=''){
 return '<section class="ops-added-section"><h2>'+safe(title)+'</h2>'+(sub?'<p>'+safe(sub)+'</p>':'')+body+'</section>';
}

export function createOperationsUpgrade(api){
 const store=createDeviceStore();
 const evidenceCapture=createMediaCapture({notify:api.notify});
 let events=[],lastFixSaved=0,lastReportFingerprint='',cameraStream=null,scanning=false,lastBattery=null,lastBatterySaved=0;
 let alertTemplates=JSON.parse(localStorage.getItem('rondas-pro-local-alert-templates')||'null')||ALERT_PRESETS.map(x=>({...x}));
 const batteryApi=async()=>{
  try{if(window.AndroidTracking?.getBatteryLevel){const n=Number(window.AndroidTracking.getBatteryLevel());if(Number.isFinite(n)&&n>=0&&n<=100)return {level:n,source:'android'};}
  if(navigator.getBattery){const b=await navigator.getBattery();return {level:Math.round(b.level*100),charging:b.charging,source:'web'};}}
  catch(err){console.warn('Bateria indisponível',err);}
  return null;
 };
 const current=()=>api.get();
 const state=()=>current().operationalSettings;
 const supported=()=>typeof indexedDB!=='undefined';
 const persistEvent=async event=>{
  events.unshift(event);
  try{await store.put('events',event);}catch(err){api.notify('Falha ao salvar evento offline no dispositivo.');console.warn(err);}
  if(event.status==='pending')void syncPending().catch(console.warn);
 };
 const allowedSyncedKinds=new Set(['panic','gps','battery','checkpoint','incident','alert','patrol_start','patrol_end','gps_issue','route_deviation']);
 let inSync=false;
 async function syncPending(){
  const token=sessionStorage.getItem('rondaspro_api_token');
  if(!token||!navigator.onLine||inSync)return;
  inSync=true;
  try{
   // Eventos concluídos ainda podem conter imagens cujo envio falhou.
   const toSync=events.filter(e=>allowedSyncedKinds.has(e.kind)&&e.payload?.mode!=='simulation'&&(
    e.status==='pending'||(e.status==='synced'&&Array.isArray(e.payload?.mediaIds)&&e.payload.mediaIds.length>0&&!e.mediaSyncedAt)
   )).slice().reverse().slice(0,80);
   for(const event of toSync){
    const p=event.payload||{},pos=p.position;
    if(event.status==='pending'){
     const data={id:event.id,kind:event.kind,roundId:p.sessionId||null,occurredAt:event.at,
       description:p.description||p.observation||p.title||({'panic':'Acionamento do botão de pânico','gps':'Leitura GPS','battery':'Nível de bateria','checkpoint':'Conferência do ponto','patrol_start':'Ronda iniciada','patrol_end':'Ronda concluída'}[event.kind]||'Evento de ronda'),
       position:pos&&Number.isFinite(pos.lat)&&Number.isFinite(pos.lng)?pos:null,
       battery:Number.isFinite(p.battery)?p.battery:null,
       details:{...p,position:undefined,battery:undefined}};
     let response;
     try{response=await fetch('/api/events',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)});}
     catch{return}
     if(response.status===401||response.status===403)return;
     if(!response.ok){event.syncError='HTTP '+response.status;await store.put('events',event);continue;}
     event.status='synced';event.syncedAt=Date.now();delete event.syncError;
     await store.put('events',event);
    }
    if(!Array.isArray(p.mediaIds)||!p.mediaIds.length)continue;
    let mediaPending=false;
    for(const mediaId of p.mediaIds){
     const media=await store.get('media',mediaId);
     if(!media?.blob){mediaPending=true;continue;}
     if(media.remoteUploaded)continue;
     try{
      const res=await fetch('/api/media',{method:'POST',headers:{Authorization:'Bearer '+token,
       'Content-Type':media.type,'X-Ronda-Event-Id':event.id,'X-Captured-At':String(media.takenAt||event.at),
       ...(Number.isFinite(media.position?.lat)&&Number.isFinite(media.position?.lng)?{'X-Media-Lat':String(media.position.lat),'X-Media-Lng':String(media.position.lng)}:{}),
       ...(Number.isFinite(media.battery)?{'X-Media-Battery':String(media.battery)}:{}),
       ...(media.view?{'X-Media-View':media.view}:{}),
       ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(media.id)?{'X-Ronda-Media-Id':media.id}:{})},body:media.blob});
      if(res.status===401||res.status===403)return;
      if(res.ok){media.remoteUploaded=true;delete media.syncError;await store.put('media',media);}
      else{mediaPending=true;media.syncError='HTTP '+res.status;await store.put('media',media);}
     }catch{mediaPending=true;}
    }
    if(!mediaPending){event.mediaSyncedAt=Date.now();await store.put('events',event);}
   }
  }finally{inSync=false;}
 }
 let lastGpsIssueAt=0,badQualitySince=null;
 async function recordGpsIssue(message,fix=null,{immediate=false}={}){
  const c=current();
  if(c.mode!=='real'||c.session?.status!=='active')return;
  const now=Date.now();
  if(!immediate){
   badQualitySince??=now;
   if(now-badQualitySince<180000)return;
  }
  if(now-lastGpsIssueAt<180000)return;
  lastGpsIssueAt=now;badQualitySince=null;
  await persistEvent({id:uuid(),kind:'gps_issue',at:now,status:'pending',payload:{
   sessionId:c.session.id,mode:'real',description:message,
   position:fix&&validateCoords(fix)?{lat:fix.lat,lng:fix.lng,accuracy:fix.accuracy}:null,
   battery:lastBattery?.level??null,templateId:'gps_unreliable'}});
 }
 function gpsQualityRecovered(){badQualitySince=null;}
 async function recordNativeFixes(rows,sessionId){
  if(!sessionId||!Array.isArray(rows))return;
  const known=new Set(events.filter(e=>e.kind==='gps').map(e=>e.id));
  let queued=0;
  for(const row of rows.slice(0,3000)){
   if(!Number.isFinite(row.at)||!Number.isFinite(row.lat)||!Number.isFinite(row.lng)||!Number.isFinite(row.accuracy))continue;
   const eid='native-'+sessionId+'-'+row.at;
   if(known.has(eid))continue;
   await persistEvent({id:eid,at:row.at,kind:'gps',status:'pending',payload:{
    mode:'real',sessionId,position:{lat:row.lat,lng:row.lng,accuracy:row.accuracy},
    battery:Number.isFinite(row.battery)?row.battery:null,source:'android-background'}});
   known.add(eid);queued++;
  }
  if(queued)api.notify(queued+' posições nativas encaminhadas para a fila de sincronização.');
 }
 async function recordIncident(incident){
  const c=current(),session=c.session;
  if(session?.mode!=='real')return;
  await persistEvent({id:incident.id,at:incident.at,kind:'incident',status:'pending',payload:{
    sessionId:session.id,mode:'real',description:incident.title+': '+incident.description,
    position:incident.location,battery:lastBattery?.level??null,
    severity:incident.severity,mediaIds:(incident.media??[]).map(x=>x.id)}});
 }
 async function recordCheckpoint(checkpoint,files,point){
  const c=current(),session=c.session,at=checkpoint.observedAt||Date.now(),saved=[];
  for(const item of files){
   const file=item?.file??item;
   const view=['front','back','left','right','selfie'].includes(item?.view)?item.view:null;
   if(!file?.size||file.size>25*1024*1024){api.notify('Evidência excede 25 MB ou está vazia.');continue;}
   if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/webm','audio/mp4','audio/ogg'].includes(file.type)||(view&&!['image/jpeg','image/png','image/webp'].includes(file.type))){api.notify('Tipo de mídia não suportado.');continue;}
   const mid=uuid(),metadata={id:mid,name:limit(file.name),type:file.type,size:file.size,takenAt:file.lastModified||at,
    position:checkpoint.position,battery:lastBattery?.level??null,...(view?{view}:{})};
   await store.put('media',{...metadata,blob:file});
   saved.push(metadata);
  }
  const required=Array.isArray(session.route?.rules?.requiredEvidenceViews)?session.route.rules.requiredEvidenceViews.filter(view=>['front','back','left','right','selfie'].includes(view)):[];
  if(required.some(view=>!saved.some(file=>file.view===view)))throw new Error('As fotos obrigatórias não foram salvas no dispositivo.');
  checkpoint.media=saved;
  session.timeline.unshift({id:uuid(),at,kind:'checkpoint-observation',label:'Observação registrada: '+point.name,
    pointId:point.id,description:checkpoint.observation});
  await persistEvent({id:uuid(),at,kind:'checkpoint',status:'pending',payload:{
   mode:session.mode,sessionId:session.id,pointId:point.id,pointName:point.name,
   observation:checkpoint.observation,description:'Ponto '+point.name+': '+checkpoint.observation,
   position:checkpoint.position,battery:lastBattery?.level??null,mediaIds:saved.map(x=>x.id),
   mediaViews:saved.filter(x=>x.view).map(x=>({view:x.view,id:x.id}))}});
 }
 async function recordLifecycle(kind,round){
  if(round?.mode!=='real')return;
  await persistEvent({id:uuid(),at:Date.now(),kind,status:'pending',payload:{
   mode:'real',sessionId:round.id,description:kind==='patrol_start'?'Início da ronda '+round.route.name:'Término da ronda '+round.route.name,
   position:round.lastFix??null,battery:lastBattery?.level??null}});
 }

 async function load(){
  try{events=(await store.all('events')).sort((a,b)=>b.at-a.at);await syncPending();}
  catch(err){console.warn('Registro offline indisponível:',err);}
  // Só a demonstração local é alterada pela recuperação; nenhum envio remoto é presumido.
  api.render();
 }
 const summary=()=>patrolInsights(current().sessions,current().programs);
 async function sampleBattery(){
  const sample=await batteryApi();if(!sample)return;
  if(!lastBattery||Math.abs(sample.level-lastBattery.level)>=1||sample.charging!==lastBattery.charging){
   lastBattery=sample;const c=current();
   if(c.session?.status==='active'&&c.mode==='real')await persistEvent({id:uuid(),at:Date.now(),kind:'battery',status:'pending',payload:{sessionId:c.session.id,mode:'real',battery:sample.level,...sample}});
  }else lastBattery=sample;
 }
 const warning='<p class="ops-demo-note">Dados locais do dispositivo. Sincronização remota só ocorre após autenticação na Central Operacional, com banco configurado e conexão disponível; a demonstração nunca envia dados simulados.</p>';
 function reportSmart(){const info=summary(),operational=comparePatrols(current().sessions,events);
  return section('Relatório inteligente · análise automática',
   '<div class="ops-insights">'+[...info.observations,...operational.insights.map(o=>({label:o.title,value:o.value,detail:o.detail}))].map(o=>'<div><strong>'+safe(o.value)+'</strong><span>'+safe(o.label)+'</span><small>'+safe(o.detail)+'</small></div>').join('')+'</div>'+
   warning,'Atualizado a partir das rondas, alertas e programações disponíveis neste aparelho.');
 }
 function statusBanner(){
  const s=current();
  return '<div class="ops-status-banner" role="status">'+
   '<strong>📡 GPS e registro contínuo durante a ronda</strong>'+
   '<span>'+ (s.mode==='real'?'Localização do aparelho com autorização.':'Deslocamento simulado para apresentação.')+
   ' Sem internet, os eventos continuam em fila local e o mapa esquemático fica disponível. No Android, posições são armazenadas em SQLite; no navegador, usa-se IndexedDB.</span>'+
   '<small>'+ (navigator.onLine?'Conectado à internet':'Sem internet')+' · '+events.filter(x=>x.status==='pending').length+' evento(s) na fila local · sincronização exige login operacional</small>'+
   '</div>';
 }
 function panicButton(){
  return '<button type="button" class="ops-panic" data-ops="panic-confirm" aria-label="Abrir acionamento de pânico"><span class="ops-panic-symbol" aria-hidden="true">!</span><strong>PÂNICO</strong></button>';
 }
 function communicationActions(){
  const icons={
   alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3 9 16H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
   incident:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></svg>',
   message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 10h8M8 13h6"/></svg>'
  };
  return '<section class="patrol-communication-bar" aria-label="Ações rápidas de comunicação"><div class="patrol-communication-actions" role="group" aria-label="Comunicação com a central">'+
   '<button type="button" data-ops="central-alert">'+icons.alert+'<span>Enviar alerta</span></button>'+
   '<button type="button" data-ops="incident-quick">'+icons.incident+'<span>Registrar ocorrência</span></button>'+
   '<button type="button" data-ops="central-message">'+icons.message+'<span>Enviar mensagem</span></button></div>'+
   '<p class="patrol-communication-note">Para enviar à central, use seu acesso autenticado. Ocorrências da demonstração ficam neste dispositivo.</p></section>';
 }
 function gpsQrRow(){
  const {session:s,operationalSettings:settings}=current();
  const mode=s?.route?.rules?.verificationMode??settings.verificationMode??'gps';
  const point=s?.status==='active'?s.route.points[s.index]:null;
  const verified=!!s?.checkpoints?.[s.index]?.qrVerifiedAt;
  return section('Comprovação do ponto',
   '<div class="ops-inline-actions">'+
   '<button type="button" class="ops-mini-action" data-ops="save-map">⬇ Salvar mapa offline</button>'+
   (point&&mode!=='gps'?'<button type="button" class="ops-mini-action" data-ops="scan-qr" '+(verified?'disabled':'')+'>▣ '+(verified?'QR confirmado':'Ler QR Code')+'</button>':'')+'</div>'+
   '<p>Validação configurada: <b>'+safe(mode==='gps'?'GPS no ponto + permanência':mode==='qr'?'QR Code por ponto':'GPS e QR Code obrigatórios')+'</b>. Ordem dos pontos obrigatória. Sem selfie.</p>');
 }
 function adminQuick(){
  return '<div class="ops-admin-actions">'+
   '<button type="button" class="button primary" data-ops="export">⬇ Exportar relatório completo</button></div>';
 }
 function qrSetting(){
  const active=state().verificationMode??'gps';
  const options=[['gps','GPS + permanência'],['qr','QR Code (GPS continua monitorando)'],['gps+qr','GPS + permanência + QR Code']];
  return section('Verificação obrigatória dos pontos',
   '<label class="ops-label" for="ops-mode">O administrador escolhe como cada nova ronda valida os pontos. A sequência nunca pode ser pulada.</label>'+
   '<div class="ops-inline-actions"><select id="ops-mode">'+options.map(([id,label])=>'<option value="'+id+'" '+(active===id?'selected':'')+'>'+safe(label)+'</option>').join('')+'</select>'+
   '<button type="button" class="button primary" data-ops="save-qr-setting">Salvar regra</button></div>'+
   '<p>GPS: localização confiável dentro de 25 m por 30 s. QR: código atribuído a cada ponto. GPS + QR: os dois requisitos. A escolha vale para as próximas rondas.</p>');
 }
 function customerView(){
  const all=current().sessions.slice().sort((a,b)=>b.startedAt-a.startedAt);
  const active=all.find(s=>s.status==='active'),recent=all.slice(0,12);
  return '<div class="ops-client"><div class="page-title"><div><div class="eyebrow">RONDAS PRO · CLIENTE</div><h1>Acompanhe o serviço</h1><p>Veja execução, últimos registros e evidências da sua unidade neste cenário de avaliação.</p></div></div>'+
   statusBanner()+
   section('Serviço acompanhado',active?'<p><strong>Ronda em execução:</strong> '+safe(active.route.name)+' · '+safe(active.name)+'</p><p>Etapa '+active.index+' de '+active.route.points.length+' · última posição '+(active.lastFix?safe(nowText(active.lastFix.at)):'indisponível')+'</p>':'<p>Nenhuma execução em tempo real neste navegador. Consulte o último registro abaixo.</p>')+
   section('Rondas e histórico',recent.length?'<div class="ops-client-list">'+recent.map(s=>'<div><strong>'+safe(s.route.name)+'</strong><span>'+safe(s.name)+' · '+safe(nowText(s.startedAt))+'</span><small>'+safe(s.status==='completed'?'Concluída':'Em andamento')+' · '+s.index+'/'+s.route.points.length+' pontos · '+s.incidents.length+' ocorrência(s)</small></div>').join('')+'</div>':'<p>Sem registros realizados.</p>')+
   warning+
   '</div>';
 }
 function decorate(){
  const context=current();
  const {user,view}=context;
  const dashboard=document.querySelector('.dashboard'),main=dashboard?.querySelector('.app-content');
  if(!main)return;
  if(user?.role==='ronda'){
   dashboard.insertAdjacentHTML('beforeend',panicButton());
   if(view==='minha-ronda'){
    // Os três comandos são sempre visíveis na tela inicial, mesmo antes de iniciar a ronda.
    // No desktop acompanham as ações; no celular ficam logo após a ação principal.
    const primaryTarget=window.innerWidth<=900
     ?main.querySelector('.patrol-actions'):main.querySelector('.patrol-primary-flow');
    primaryTarget?.insertAdjacentHTML('afterend',communicationActions());
   }
   if(canShowPatrolVerification(context))
    main.querySelector('.patrol-verification-pane')?.insertAdjacentHTML('beforeend',gpsQrRow());
  }
  if(user?.role==='admin'){
   if(view==='relatorios'){
    main.querySelector('.report-page')?.insertAdjacentHTML('afterbegin',adminQuick()+reportSmart());
   }
   if(view==='notificacoes'){
    const pending=events.filter(x=>x.kind==='panic');
    main.querySelector('.alerts-command-page')?.insertAdjacentHTML('afterbegin',section('Pânico · registros deste dispositivo',
     pending.length?pending.map(x=>'<p>🚨 <strong>'+safe(x.payload?.vigia)+'</strong> acionou PÂNICO em '+safe(nowText(x.at))+' · registro local, envio remoto pendente.</p>').join(''):'<p>Nenhum acionamento de pânico neste dispositivo.</p>'));
   }
   if(view==='configuracoes')main.insertAdjacentHTML('beforeend',qrSetting());
  }
  
 }
 function mediaFields(){return '<section class="ops-media-fields" data-evidence-host><strong>Evidências contextuais (opcionais)</strong><p>Capture e anexe diretamente foto, vídeo ou áudio, sem selecionar arquivos manualmente.</p>'+evidenceButtons()+'</section>';}
 async function attachIncidentMedia(incident,form){
  const files=Array.isArray(form.__evidenceFiles)?form.__evidenceFiles:[];
  incident.media??=[];
  for(const file of files.slice(0,3)){
   if(!file.size||file.size>25*1024*1024){api.notify('Arquivo ignorado: máximo de 25 MB por evidência.');continue;}
   const item={id:uuid(),name:limit(file.name),type:file.type,size:file.size,at:Date.now(),takenAt:file.lastModified||Date.now(),position:current().locationFix??null,battery:lastBattery?.level??null};
   try{await store.put('media',{...item,blob:file});incident.media.push(item);}
   catch(err){console.warn(err);api.notify('Não foi possível salvar uma evidência no dispositivo.');}
  }
  if(files.length)await persistEvent({id:uuid(),at:Date.now(),kind:'incident-media',status:'pending',payload:{incidentId:incident.id,count:incident.media.length,position:current().locationFix??null,battery:lastBattery?.level??null}});
 }
 function incidentMediaList(i){
  return '<div class="ops-media-list"><strong>Evidências anexadas</strong>'+((i.media??[]).length?
   i.media.map(m=>'<button type="button" class="ops-mini-action" data-ops="open-media" data-media-id="'+safe(m.id)+'">'+safe(m.name)+' · '+Math.round(m.size/1024)+' KB</button>').join(''):'<p>Nenhum arquivo anexado.</p>')+'</div>';
 }
 async function recordFix(fix){
  const s=current();
  if(s.mode!=='real'||!s.session||s.session.status!=='active'||!validateCoords(fix))return;
  if(Date.now()-lastFixSaved<5000)return;
  lastFixSaved=Date.now();
  await persistEvent({id:uuid(),at:fix.at||Date.now(),kind:'gps',status:'pending',
   payload:{sessionId:s.session.id,mode:'real',position:{lat:fix.lat,lng:fix.lng,accuracy:fix.accuracy},battery:lastBattery?.level??null,source:'webview-or-browser'}});
 }
 async function autoReport(){
  const ctx=current(),sig=JSON.stringify(ctx.sessions.map(s=>[s.id,s.status,s.index,s.incidents?.length,s.notifications?.length]));
  if(sig===lastReportFingerprint)return;
  lastReportFingerprint=sig;
  try{await store.put('reports',{id:'automatic-latest',at:Date.now(),data:buildReportData(ctx,['resumo','rondas','pontos','ocorrencias','alertas','programacao'],events)});}
  catch(err){console.warn('Relatório automático não persistido:',err);}
 }
 async function panic(){
  const c=current(),at=Date.now(),name=c.user?.name??'Vigia';
  const payload={vigia:name,sessionId:c.session?.id??null,mode:c.session?.mode??'simulation',position:c.locationFix??null,battery:lastBattery?.level??null,at};
  if(c.session?.status==='active'){
   c.session.notifications.unshift({id:uuid(),kind:'panic',at,seenAt:null,sessionId:c.session.id,label:'PÂNICO: '+name+' solicitou atendimento imediato'});
   c.session.timeline.unshift({id:uuid(),kind:'panic',at,label:'Botão de pânico acionado'});
   api.save();
  }
  await persistEvent({id:uuid(),kind:'panic',status:'pending',at,payload});
  api.render();
  api.showDialog('<div class="ops-emergency-panel"><h2>🚨 Pânico registrado</h2><p>Acionamento associado a <b>'+safe(name)+'</b> às '+safe(nowText(at))+'. O aviso aparece na supervisão desta demonstração. A entrega a outros aparelhos depende de login operacional, banco persistente e sincronização confirmada.</p><p>Para uma emergência real, abra o discador e confirme a ligação.</p><a class="button danger full" href="tel:190">📞 Abrir discador · 190</a><button type="button" class="button full" data-action="close-dialog">Voltar ao aplicativo</button></div>',true);
 }
 function exportDialog(){
  const opts=[['resumo','Resumo inteligente'],['rondas','Rondas, horários e responsáveis'],['pontos','Pontos, permanência e QR'],['ocorrencias','Ocorrências e evidências (metadados)'],['alertas','Alertas, justificativas e pânico'],['coordenadas','Localizações registradas'],['programacao','Programação e escala']];
  api.showDialog('<form id="ops-export-form" class="ops-export-form"><h2>Exportar relatório</h2><p>Escolha exatamente o que incluir. Os dados são locais desta demonstração.</p><div class="ops-export-options">'+opts.map(([id,label])=>'<label><input type="checkbox" name="sections" value="'+id+'" '+(id==='coordenadas'?'':'checked')+'>'+safe(label)+'</label>').join('')+'</div>'+
   '<label class="ops-label">Formato do arquivo<select name="format"><option value="html">HTML · abrir ou imprimir em PDF</option><option value="csv">CSV · planilhas</option><option value="json">JSON · dados completos</option><option value="xlsx">Excel XLSX · dashboard e abas</option></select></label>'+
   '<button type="submit" class="button primary full">Gerar e exportar</button></form>',true);
 }
 async function scanQR(){
  const s=current().session,point=s?.route?.points?.[s.index];
  if(!point||s.status!=='active'){api.notify('Inicie uma ronda para ler o QR Code.');return;}
  const expected=point.qrCode??'MAXVEL-'+point.id.toUpperCase();
  api.showDialog('<div class="ops-qr-panel"><h2>▣ QR Code · '+safe(point.name)+'</h2><p>Leia o código fixado no ponto. A ordem da ronda continua obrigatória.</p>'+
   '<video id="ops-qr-video" playsinline muted autoplay aria-label="Leitor de QR Code"></video>'+
   '<button type="button" class="button primary full" data-ops="qr-camera">Ativar câmera e ler QR</button>'+
   '<details><summary>Simular leitura (somente demonstração)</summary><p>Código fictício deste ponto: <code>'+safe(expected)+'</code></p>'+
   '<label class="ops-label">Código de teste<input id="ops-qr-code" placeholder="Digite o código da demonstração"></label><button type="button" class="button" data-ops="qr-manual">Validar código de demonstração</button></details>'+
   '<p class="ops-demo-note">O leitor usa a câmera quando compatível. Código digitado é recurso somente demonstrativo; em produção será validado no servidor.</p></div>',true);
 }
 function acceptQR(value){
  const c=current(),s=c.session,p=s?.route?.points?.[s.index];
  if(!p||s.status!=='active')return;
  const expected=p.qrCode??'MAXVEL-'+p.id.toUpperCase();
  if(String(value).trim()!==expected){api.notify('QR Code não corresponde ao próximo ponto.');return;}
  s.checkpoints[s.index].qrVerifiedAt=Date.now();
  s.timeline.unshift({id:uuid(),kind:'qr',at:Date.now(),label:'QR Code confirmado: '+p.name,pointId:p.id});
  api.save();stopCamera();api.render();api.notify('QR Code validado para o ponto '+(s.index+1)+'.');
 }
 function stopCamera(){scanning=false;cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;}
 async function cameraQR(){
  if(!navigator.mediaDevices?.getUserMedia||typeof BarcodeDetector==='undefined'){
   api.notify('Leitura automática indisponível neste aparelho. Use a simulação de código.');return;
  }
  try{
   cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
   const video=document.getElementById('ops-qr-video');if(!video){stopCamera();return;}
   video.srcObject=cameraStream;await video.play();scanning=true;
   const detector=new BarcodeDetector({formats:['qr_code']});
   const scan=async()=>{
    if(!scanning||!video.isConnected){stopCamera();return;}
    try{const codes=await detector.detect(video);if(codes.length){acceptQR(codes[0].rawValue);return;}}
    catch(err){console.warn(err);}
    if(scanning)setTimeout(scan,300);
   };
   scan();
  }catch(err){stopCamera();api.notify('Câmera não disponível ou permissão negada.');}
 }
 async function saveMap(){
  const c=current(),route=c.session?.route??c.selectedRoute;
  if(!route){api.notify('Selecione uma rota antes de salvar.');return;}
  const saved={id:'map-'+route.id,route,at:Date.now(),type:'esquema-georreferenciado'};
  try{
   await store.put('maps',saved);
   const svg=fallbackSVG(route,c.session,c.locationFix??route.base);
   download(svg,'ronda-mapa-offline.svg','image/svg+xml;charset=utf-8');
   api.notify('Rota e esquema de mapa salvos no dispositivo. Ruas detalhadas exigem pacote cartográfico offline licenciado.');
  }catch(err){api.notify('Não foi possível guardar o mapa offline.');}
 }
 function requestEntryGPS(){
  if(!navigator.geolocation)return;
  // O navegador pede a permissão por ação do usuário. Cenário demonstrativo continua separado de uma ronda real.
  navigator.geolocation.getCurrentPosition(()=>{},()=>{},{
   enableHighAccuracy:true,timeout:12000,maximumAge:0
  });
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-evidence-kind],[data-evidence-remove]');
  if(!button)return;
  const host=button.closest('.ops-media-fields');
  if(!host)return;
  event.preventDefault();event.stopPropagation();
  const form=host.closest('form');
  if(!form)return;
  const list=host.querySelector('[data-evidence-attachments]');
  if(button.hasAttribute('data-evidence-remove')){
   const index=Number(button.dataset.evidenceRemove);
   if(Number.isInteger(index))form.__evidenceFiles?.splice(index,1);
  }else{
   try{
    const file=await evidenceCapture.request(button.dataset.evidenceKind);
    if(!form.isConnected)return;
    if(!file?.size||file.size>25*1024*1024){api.notify('O arquivo deve ter no máximo 25 MB.');return;}
    form.__evidenceFiles??=[];
    if(form.__evidenceFiles.length>=3){api.notify('Limite de três evidências por registro.');return;}
    form.__evidenceFiles.push(file);
   }catch(error){if(!/cancelad|Nenhuma evidência/i.test(error.message))api.notify(error.message);}
  }
  if(list&&form.isConnected){
   list.innerHTML=form.__evidenceFiles?.length
    ?form.__evidenceFiles.map((file,i)=>'<span class="attached-file">'+safe(file.name)+' <button type="button" data-evidence-remove="'+i+'" aria-label="Remover evidência">×</button></span>').join('')
    :'Nenhuma evidência anexada.';
  }
 },true);
 document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-ops]');if(!el)return;
  e.preventDefault();e.stopPropagation();
  const cmd=el.dataset.ops;
  if(cmd==='panic-confirm'){
   api.showDialog('<div class="ops-emergency-panel"><h2>🚨 Acionar botão de pânico?</h2><p>Registra aviso prioritário com horário, vigia e última posição disponível. A demonstração não transmite alerta para outro celular. Após registrar, você poderá abrir o discador 190.</p>'+
    '<button type="button" class="button danger full" data-ops="panic-now">Confirmar acionamento</button>'+
    '<button type="button" class="button full" data-action="close-dialog">Cancelar</button></div>',true);return;
  }
  if(cmd==='panic-now'){await panic();return;}
  if(cmd==='central-alert'){window.location.assign('/central.html#alert');return;}
  if(cmd==='central-message'){window.location.assign('/central.html#message');return;}
  if(cmd==='incident-quick'){
   if(current().session?.status==='active')api.incidentDialog();
   else window.location.assign('/central.html#incident');
   return;
  }
  if(cmd==='export'){if(current().user?.role!=='admin')return;exportDialog();return;}
  if(cmd==='save-map'){await saveMap();return;}
  if(cmd==='scan-qr'){await scanQR();return;}
  if(cmd==='qr-camera'){await cameraQR();return;}
  if(cmd==='qr-manual'){acceptQR(document.querySelector('#ops-qr-code')?.value);return;}
  if(cmd==='save-qr-setting'){
   if(current().user?.role!=='admin')return;
   const selected=document.getElementById('ops-mode')?.value;
   if(!['gps','qr','gps+qr'].includes(selected))return;
   state().verificationMode=selected;api.persist();api.render();api.notify('Regra de QR/GPS salva para as próximas rondas.');return;
  }
  if(cmd==='open-media'){
   const item=await store.get('media',el.dataset.mediaId);
   if(!item?.blob){api.notify('Arquivo não encontrado neste dispositivo.');return;}
   const url=URL.createObjectURL(item.blob);
   const anchor=document.createElement('a');anchor.href=url;anchor.download=item.name||'evidencia';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),5000);return;
  }
  
 },true);
 document.addEventListener('submit',e=>{
  if(e.target.id!=='ops-export-form')return;e.preventDefault();e.stopPropagation();if(current().user?.role!=='admin')return;
  const form=e.target,selected=[...form.querySelectorAll('[name="sections"]:checked')].map(x=>x.value);
  if(!selected.length){api.notify('Selecione ao menos uma seção.');return;}
  const report=buildReportData(current(),selected,events);
  const mode=form.querySelector('[name="format"]').value;
  const file='rondas-pro-relatorio-'+new Date().toISOString().slice(0,10);
  if(mode==='xlsx'){
    const blob=createXlsxReport(report);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file+'.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
   }else if(mode==='csv')download(reportCSV(report),file+'.csv','text/csv;charset=utf-8');
  else if(mode==='json')download(JSON.stringify(report,null,2),file+'.json','application/json');
  else download(reportHTML(report),file+'.html','text/html;charset=utf-8');
  api.notify('Relatório exportado do dispositivo.');api.closeDialog();
 },true);
 document.addEventListener('click',e=>{if(e.target.closest('[data-action="close-dialog"]'))stopCamera();},true);
 window.addEventListener('online',()=>{api.notify('Conexão restaurada. Tentando sincronizar registros autenticados.');syncPending().catch(console.warn);});
 load();
 setInterval(()=>{autoReport().catch(console.warn);sampleBattery().catch(console.warn);syncPending().catch(console.warn);},60000);
 sampleBattery().catch(console.warn);
 return {allEvents:()=>[...events],decorate,customerView,mediaFields,incidentMediaList,attachIncidentMedia,recordFix,recordGpsIssue,gpsQualityRecovered,recordNativeFixes,recordIncident,recordCheckpoint,recordLifecycle,syncPending,autoReport,requestEntryGPS,guideSection:()=>
  '<details class="ops-guide-details"><summary>Recursos operacionais adicionais e modo offline</summary><p><b>GPS contínuo:</b> acompanhe a ronda durante o serviço. No Android o serviço nativo pode registrar posições em segundo plano, sujeito às permissões do sistema.</p>'+
  '<p><b>Sequência e validação:</b> 25 m, 30 segundos e QR opcional; Administração configura GPS, QR ou ambos.</p>'+
  '<p><b>Sem conexão:</b> coordenadas ficam no SQLite do Android; registros e evidências ficam no IndexedDB do dispositivo. Envio ao servidor ocorre somente com login autenticado, servidor configurado e conexão disponível.</p>'+
  '<p><b>Salvar mapa:</b> mantém os pontos e o esquema da rota disponíveis sem internet; ruas reais exigem mapa offline específico.</p>'+
  '<p><b>Botão de pânico:</b> alerta prioritário no histórico da demonstração e opção de abrir o discador 190.</p>'+
  '<p><b>Gestão e cliente:</b> acompanham progresso e histórico deste cenário; alertas remotos precisam de backend.</p>'+
  '<p><b>Ocorrências:</b> anexar foto, áudio ou vídeo pelo aparelho. <b>Relatórios:</b> geração automática local e exportação por seções em XLSX com dashboard, HTML, CSV ou JSON.</p></details>'
 };
}
