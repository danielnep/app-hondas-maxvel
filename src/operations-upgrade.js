/** Rondas Pro: ampliação aditiva da demonstração operacional.
 * Persistência em IndexedDB no dispositivo; em Android o trajeto também usa SQLite nativo.
 * Sem API de produção, "pendente de envio" nunca significa entregue remotamente.
 */
import {fallbackSVG} from './map.js';

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
 let events=[],lastFixSaved=0,lastReportFingerprint='',cameraStream=null,scanning=false;
 const current=()=>api.get();
 const state=()=>current().operationalSettings;
 const supported=()=>typeof indexedDB!=='undefined';
 const persistEvent=async event=>{
  events.unshift(event);
  try{await store.put('events',event);}catch(err){api.notify('Falha ao salvar evento offline no dispositivo.');console.warn(err);}
 };
 async function load(){
  try{events=(await store.all('events')).sort((a,b)=>b.at-a.at);}
  catch(err){console.warn('Registro offline indisponível:',err);}
  // Só a demonstração local é alterada pela recuperação; nenhum envio remoto é presumido.
  api.render();
 }
 const summary=()=>patrolInsights(current().sessions,current().programs);
 const warning='<p class="ops-demo-note">Demonstração: registros deste aparelho. Sem servidor de sincronização nem alerta remoto ativo.</p>';
 function reportSmart(){const info=summary();
  return section('Relatório inteligente · análise automática',
   '<div class="ops-insights">'+info.observations.map(o=>'<div><strong>'+safe(o.value)+'</strong><span>'+safe(o.label)+'</span><small>'+safe(o.detail)+'</small></div>').join('')+'</div>'+
   warning,'Atualizado a partir das rondas, alertas e programações disponíveis neste aparelho.');
 }
 function statusBanner(){
  const s=current();
  return '<div class="ops-status-banner" role="status">'+
   '<strong>📡 GPS e registro contínuo durante a ronda</strong>'+
   '<span>'+ (s.mode==='real'?'Localização do aparelho com autorização.':'Deslocamento simulado para apresentação.')+
   ' Sem internet, os eventos continuam em fila local e o mapa esquemático fica disponível. No Android, posições são armazenadas em SQLite; no navegador, usa-se IndexedDB.</span>'+
   '<small>'+ (navigator.onLine?'Conectado à internet':'Sem internet')+' · '+events.filter(x=>x.status==='pending').length+' evento(s) na fila local · envio ao servidor pendente de implantação</small>'+
   '</div>';
 }
 function panicButton(){
  return '<button type="button" class="ops-panic" data-ops="panic-confirm" aria-label="Botão de pânico, abre confirmação e discador de emergência"><span>⚠</span> PÂNICO</button>';
 }
 function gpsQrRow(){
  const {session:s,operationalSettings:settings}=current();
  const mode=s?.route?.rules?.verificationMode??settings.verificationMode??'gps';
  const point=s?.status==='active'?s.route.points[s.index]:null;
  const verified=!!s?.checkpoints?.[s.index]?.qrVerifiedAt;
  return section('Comprovação do ponto',
   '<div class="ops-inline-actions">'+
   '<button type="button" class="ops-mini-action" data-ops="save-map">⬇ Salvar mapa offline</button>'+
   (point&&mode!=='gps'?'<button type="button" class="ops-mini-action" data-ops="scan-qr" '+(verified?'disabled':'')+'>▣ '+(verified?'QR confirmado':'Ler QR Code')+'</button>':'')+
   '<button type="button" class="ops-mini-action" data-ops="incident-quick">📷 Registrar ocorrência</button></div>'+
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
  const {user,view}=current();
  const dashboard=document.querySelector('.dashboard'),main=dashboard?.querySelector('.app-content');
  if(!main)return;
  if(user?.role==='ronda'){
   dashboard.insertAdjacentHTML('beforeend',panicButton());
   if(view==='minha-ronda'){
    main.querySelector('.patrol-action-body')?.insertAdjacentHTML('beforeend',gpsQrRow());
   }
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
 function mediaFields(){
  return '<details class="ops-media-fields"><summary>Evidências contextuais (opcionais): foto, áudio ou vídeo</summary>'+
   '<p>Adicione foto, áudio ou vídeo. Os arquivos ficam na memória local do dispositivo até integração com servidor. Não é exigida selfie.</p>'+
   '<div class="ops-media-choices">'+
   '<label>📷 Tirar foto<input type="file" name="ops-photo" accept="image/*" capture="environment"></label>'+
   '<label>🎙 Gravar áudio<input type="file" name="ops-audio" accept="audio/*" capture="microphone"></label>'+
   '<label>🎥 Filmar<input type="file" name="ops-video" accept="video/*" capture="environment"></label>'+
   '</div></details>';
 }
 async function attachIncidentMedia(incident,form){
  const files=[...form.querySelectorAll('[name="ops-photo"],[name="ops-audio"],[name="ops-video"]')].flatMap(i=>[...(i.files??[])]);
  incident.media??=[];
  for(const file of files.slice(0,3)){
   if(!file.size||file.size>25*1024*1024){api.notify('Arquivo ignorado: máximo de 25 MB por evidência.');continue;}
   const item={id:uuid(),name:limit(file.name),type:file.type,size:file.size,at:Date.now()};
   try{await store.put('media',{...item,blob:file});incident.media.push(item);}
   catch(err){console.warn(err);api.notify('Não foi possível salvar uma evidência no dispositivo.');}
  }
  if(files.length)await persistEvent({id:uuid(),at:Date.now(),kind:'incident-media',status:'pending',payload:{incidentId:incident.id,count:incident.media.length}});
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
   payload:{sessionId:s.session.id,position:{lat:fix.lat,lng:fix.lng,accuracy:fix.accuracy},source:'webview-or-browser'}});
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
  const payload={vigia:name,sessionId:c.session?.id??null,position:c.locationFix??null,at};
  if(c.session?.status==='active'){
   c.session.notifications.unshift({id:uuid(),kind:'panic',at,seenAt:null,sessionId:c.session.id,label:'PÂNICO: '+name+' solicitou atendimento imediato'});
   c.session.timeline.unshift({id:uuid(),kind:'panic',at,label:'Botão de pânico acionado'});
   api.save();
  }
  await persistEvent({id:uuid(),kind:'panic',status:'pending',at,payload});
  api.render();
  api.showDialog('<div class="ops-emergency-panel"><h2>🚨 Pânico registrado</h2><p>Acionamento associado a <b>'+safe(name)+'</b> às '+safe(nowText(at))+'. O aviso aparece na supervisão desta demonstração. A entrega a outros aparelhos depende do servidor operacional.</p><p>Para uma emergência real, abra o discador e confirme a ligação.</p><a class="button danger full" href="tel:190">📞 Abrir discador · 190</a><button type="button" class="button full" data-action="close-dialog">Voltar ao aplicativo</button></div>',true);
 }
 function exportDialog(){
  const opts=[['resumo','Resumo inteligente'],['rondas','Rondas, horários e responsáveis'],['pontos','Pontos, permanência e QR'],['ocorrencias','Ocorrências e evidências (metadados)'],['alertas','Alertas, justificativas e pânico'],['coordenadas','Localizações registradas'],['programacao','Programação e escala']];
  api.showDialog('<form id="ops-export-form" class="ops-export-form"><h2>Exportar relatório</h2><p>Escolha exatamente o que incluir. Os dados são locais desta demonstração.</p><div class="ops-export-options">'+opts.map(([id,label])=>'<label><input type="checkbox" name="sections" value="'+id+'" '+(id==='coordenadas'?'':'checked')+'>'+safe(label)+'</label>').join('')+'</div>'+
   '<label class="ops-label">Formato do arquivo<select name="format"><option value="html">HTML · abrir ou imprimir em PDF</option><option value="csv">CSV · planilhas</option><option value="json">JSON · dados completos</option></select></label>'+
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
  if(cmd==='incident-quick'){api.incidentDialog();return;}
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
  if(mode==='csv')download(reportCSV(report),file+'.csv','text/csv;charset=utf-8');
  else if(mode==='json')download(JSON.stringify(report,null,2),file+'.json','application/json');
  else download(reportHTML(report),file+'.html','text/html;charset=utf-8');
  api.notify('Relatório exportado do dispositivo.');api.closeDialog();
 },true);
 document.addEventListener('click',e=>{if(e.target.closest('[data-action="close-dialog"]'))stopCamera();},true);
 window.addEventListener('online',()=>api.notify('Conexão restaurada. Registros locais permanecem aguardando integração de sincronização.'));
 load();
 setInterval(()=>{autoReport().catch(console.warn);},60000);
 return {decorate,customerView,mediaFields,incidentMediaList,attachIncidentMedia,recordFix,autoReport,requestEntryGPS,guideSection:()=>
  '<details class="ops-guide-details"><summary>Recursos operacionais adicionais e modo offline</summary><p><b>GPS contínuo:</b> acompanhe a ronda durante o serviço. No Android o serviço nativo pode registrar posições em segundo plano, sujeito às permissões do sistema.</p>'+
  '<p><b>Sequência e validação:</b> 25 m, 30 segundos e QR opcional; Administração configura GPS, QR ou ambos.</p>'+
  '<p><b>Sem conexão:</b> coordenadas ficam no SQLite do Android; registros e evidências ficam no IndexedDB do dispositivo. Envio ao servidor exige integração posterior.</p>'+
  '<p><b>Salvar mapa:</b> mantém os pontos e o esquema da rota disponíveis sem internet; ruas reais exigem mapa offline específico.</p>'+
  '<p><b>Botão de pânico:</b> alerta prioritário no histórico da demonstração e opção de abrir o discador 190.</p>'+
  '<p><b>Gestão e cliente:</b> acompanham progresso e histórico deste cenário; alertas remotos precisam de backend.</p>'+
  '<p><b>Ocorrências:</b> anexar foto, áudio ou vídeo pelo aparelho. <b>Relatórios:</b> geração automática local e exportação por seções em HTML, CSV ou JSON.</p></details>'
 };
}
