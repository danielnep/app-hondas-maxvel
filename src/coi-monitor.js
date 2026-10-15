/* Rondas Pro · COI: pessoas, acompanhamento, evidências e situação.
 * Não há página de mapa. O mapa pertence a cada ronda/vistoria, contextualizado.
 * Tudo é obtido da API autenticada, sem simular pessoas em produção.
 */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=x=>x?new Date(x).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Sem registro';
const clock=x=>x?new Date(x).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';
const coords=x=>x&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&Math.abs(x.lat)<=90&&Math.abs(x.lng)<=180;
const recent=t=>Number.isFinite(t)&&Date.now()-t<=120000&&Date.now()>=t-60000;
const roles={ronda:'Vigia',vistoriador:'Vistoriador'};
const priority={panic:0,route_deviation:1,incident:2,gps_issue:3,alert:4,patrol_incomplete:5,patrol_interrupted:6,message:7,inspection:8};
const label={panic:'Pânico',incident:'Ocorrência',alert:'Alerta',gps_issue:'Falha de GPS',route_deviation:'Desvio',message:'Mensagem',inspection:'Laudo de vistoria',patrol_incomplete:'Ronda incompleta',patrol_interrupted:'Ronda interrompida'};
export function createCoiMonitor(){
 let tab='rondas',snapshot={account:null,rounds:[],events:[],routes:[],users:[],availability:[],dispatches:[]};
 let maps=[],targets=new Map(),previous=new Map();
 function reset(){
  for(const item of maps){try{item.map.remove()}catch{}}
  maps=[];targets.clear();
 }
 function selectTab(value){if(['rondas','vistorias'].includes(value)){tab=value;return true}return false}
 function copy(data){snapshot=data}
 function render(data){
  snapshot=data;targets.clear();
  const {account,rounds=[],events=[],routes=[],users=[],availability=[],dispatches=[]}=data;
  const isAdmin=['admin','master'].includes(account?.role),who=new Map(users.map(u=>[u.id,u]));
  const online=new Map(availability.map(a=>[a.id,a]));
  const latest=(rounds||[]).slice().sort((a,b)=>(b.start||0)-(a.start||0));
  const active=latest.filter(r=>r.status==='em_andamento');
  const inspections=events.filter(e=>e.kind==='inspection').slice().sort((a,b)=>b.occurred_at-a.occurred_at);
  const currentInspections=dispatches.filter(d=>d.kind==='vistoria'&&d.started_at&&!d.completed_at).sort((a,b)=>b.started_at-a.started_at);
  const queue=events.filter(e=>priority[e.kind]!==undefined&&e.status!=='resolvida')
   .sort((a,b)=>(priority[a.kind]??99)-(priority[b.kind]??99)||(b.occurred_at||0)-(a.occurred_at||0));
  const workers=availability.filter(w=>['ronda','vistoriador'].includes(w.role));
  const header='<header class="coi3-heading"><div class="coi3-heading-copy"><div class="eyebrow">CENTRAL OPERACIONAL · GRUPO MAXVEL</div><h1>COI · Acompanhamento</h1><p>Contato, rondas, vistorias e resposta às ocorrências</p><span class="coi3-site">Posto / região: '+esc(account?.site||'Todos os postos autorizados')+'</span></div><div class="coi3-onair"><span class="coi3-led" aria-hidden="true"></span><span>Central conectada<small>Atualizações do servidor a cada 30 s</small></span><strong data-ops-live-clock>'+new Date().toLocaleTimeString('pt-BR')+'</strong></div></header>';
  const metrics='<div class="coi3-stats" aria-label="Resumo operacional"><div><strong>'+active.length+'</strong><span>Rondas em curso</span></div><div><strong>'+currentInspections.length+'</strong><span>Vistorias em curso</span></div><div class="'+(queue.length?'coi3-count-attention':'')+'"><strong>'+queue.length+'</strong><span>Aguardando COI</span></div><div><strong>'+workers.filter(w=>w.status==='Disponível').length+'</strong><span>Campo disponível</span></div></div>';
  const tools='<nav class="coi3-actions" aria-label="Tarefas da central"><button type="button" data-page="treatments" class="coi3-action-urgent"><span aria-hidden="true">◉</span> Tratativas '+(queue.length?'('+queue.length+')':'')+'</button><button type="button" data-page="notifications">Notificações</button><button type="button" data-page="dispatches">Despachar equipe</button></nav>';
  const tabs='<div class="coi3-tabs" role="group" aria-label="Tipo de acompanhamento"><button type="button" data-coi-tab="rondas" aria-pressed="'+(tab==='rondas')+'" class="'+(tab==='rondas'?'is-active':'')+'">Rondas <span>'+latest.length+'</span></button><button type="button" data-coi-tab="vistorias" aria-pressed="'+(tab==='vistorias')+'" class="'+(tab==='vistorias'?'is-active':'')+'">Vistorias <span>'+(inspections.length+currentInspections.length)+'</span></button></div>';
  const location=({id,point,at,route=[],name,kind})=>{
   if(!coords(point))return '<div class="coi3-map-empty">Sem coordenadas recebidas. O mapa aparecerá quando o aparelho enviar uma posição válida.</div>';
   const fresh=recent(at),key=kind+':'+id;
   targets.set(key,{point,at,route,name,kind});
   return '<div class="coi3-location"><div class="coi3-map" data-coi-map="'+esc(key)+'" aria-label="Mapa da '+(kind==='round'?'ronda':'vistoria')+' '+esc(name)+'"></div><div class="coi3-position-status"><span class="'+(fresh?'coi3-fresh':'')+'">'+(fresh?'● GPS recente':'● Última posição conhecida')+'</span><span>'+time(at)+'</span></div></div>';
  };
  const roundCard=r=>{
   const u=who.get(r.userId),person=online.get(r.userId),route=routes.find(x=>x.id===r.routeId)||routes.find(x=>x.user_id===r.userId||x.userId===r.userId);
   const progress=(r.checkpoints||0)+' / '+(route?.points?.length||'—');
   const live=r.status==='em_andamento',presence=person?.position;
   const position=(coords(presence)&&(!r.lastFixAt||presence.at>r.lastFixAt))?presence:r.lastFix;
   const at=position===presence?presence?.at:r.lastFixAt;
   const planned=(route?.points||[]).filter(coords);
   return '<article class="coi3-record '+(live?'is-active':'')+'"><div class="coi3-record-title"><span class="coi3-person-icon" aria-hidden="true">V</span><div><small>'+esc(r.site||u?.site||'Posto não informado')+'</small><h3>'+esc(u?.name||'Vigia')+'</h3><p>'+esc(route?.name||'Ronda registrada')+'</p></div><span class="coi3-record-state '+(live?'coi3-inprogress':'')+'">'+(live?'Em ronda':esc(String(r.status||'Encerrada').replaceAll('_',' ')))+'</span></div><div class="coi3-facts"><span>Início <strong>'+clock(r.start)+'</strong></span><span>Término <strong>'+clock(r.end)+'</strong></span><span>Pontos <strong>'+esc(progress)+'</strong></span><span>Último contato <strong>'+clock(at)+'</strong></span></div>'+location({id:r.id||r.userId,point:position,at,route:planned,name:u?.name||'Vigia',kind:'round'})+'</article>';
  };
  const inspectionCard=(dispatch,event)=>{
   const uid=dispatch?.worker_id||event?.user_id,person=online.get(uid),user=who.get(uid);
   const lastEvent=event||events.find(e=>e.user_id===uid&&e.kind==='inspection'&&(!dispatch?.started_at||e.occurred_at>=dispatch.started_at));
   const active=!!dispatch&&!dispatch.completed_at;
   const presence=person?.position,recordPosition=lastEvent?.position||((Number.isFinite(lastEvent?.lat)&&Number.isFinite(lastEvent?.lng))?{lat:lastEvent.lat,lng:lastEvent.lng}:null);
   const pos=coords(presence)?presence:recordPosition;
   const at=pos===presence?presence.at:lastEvent?.occurred_at;
   const name=user?.name||dispatch?.worker||'Vistoriador',site=dispatch?.site||lastEvent?.site||'Local não informado';
   return '<article class="coi3-record '+(active?'is-active':'')+'"><div class="coi3-record-title"><span class="coi3-person-icon" aria-hidden="true">I</span><div><small>'+esc(site)+'</small><h3>'+esc(name)+'</h3><p>'+esc(dispatch?.address||lastEvent?.description||'Laudo de vistoria')+'</p></div><span class="coi3-record-state '+(active?'coi3-inprogress':'')+'">'+(active?'Em vistoria':'Laudo registrado')+'</span></div><div class="coi3-facts"><span>Início <strong>'+clock(dispatch?.started_at||lastEvent?.occurred_at)+'</strong></span><span>Término <strong>'+clock(dispatch?.completed_at||lastEvent?.occurred_at)+'</strong></span><span>Resultado <strong>'+(Number.isFinite(lastEvent?.details?.qualityPercent)?lastEvent.details.qualityPercent+'% conforme':'—')+'</strong></span></div>'+location({id:dispatch?.id||lastEvent?.id||uid,point:pos,at,route:[],name,kind:'inspection'})+(lastEvent?'<button type="button" class="coi3-record-detail" data-event="'+esc(lastEvent.id)+'">Abrir laudo e evidências →</button>':'<p class="muted">Laudo e mídias aparecem após envio do vistoriador.</p>')+'</article>';
  };
  const inspectorSeen=new Set(currentInspections.map(d=>d.worker_id));
  const view=tab==='rondas'?
   (latest.length?'<div class="coi3-record-stack">'+latest.slice(0,16).map(roundCard).join('')+'</div>':'<div class="coi3-empty">Nenhuma ronda sincronizada. Consulte a equipe e as rotas atribuídas.</div>'):
   ((currentInspections.length||inspections.length)?'<div class="coi3-record-stack">'+currentInspections.slice(0,12).map(d=>inspectionCard(d,null)).join('')+inspections.filter(e=>!inspectorSeen.has(e.user_id)||!currentInspections.some(d=>d.worker_id===e.user_id&&e.occurred_at>=d.started_at)).slice(0,18).map(e=>inspectionCard(null,e)).join('')+'</div>':'<div class="coi3-empty">Nenhuma vistoria recebida. Solicite um vistoriador em Despachar equipe.</div>');
  const queueUI='<section class="coi3-secondary"><header><h2>Comunicação que exige resposta</h2><button type="button" data-page="treatments">Abrir tratativas →</button></header><div class="coi3-alert-list">'+(queue.length?queue.slice(0,5).map(e=>'<button type="button" data-event="'+esc(e.id)+'" class="coi3-alert '+(e.kind==='panic'?'is-panic':'')+'"><strong>'+esc(label[e.kind]||e.kind)+'</strong><span>'+esc(e.description||'Sem descrição')+'</span><small>'+time(e.occurred_at)+' · '+esc(e.site||'Sem posto')+'</small></button>').join(''):'<p class="coi3-empty">Nenhuma pendência de comunicação aberta.</p>')+'</div></section>';
  const body='<section class="coi3-app">'+header+metrics+tools+'<section class="coi3-section"><header class="coi3-section-header"><div><h2>Equipe em acompanhamento</h2><p>Selecione a atividade para ver os registros e a localização disponível de cada profissional.</p></div></header>'+tabs+view+'</section>'+queueUI+'<p class="coi3-footnote">As posições são recebidas mediante permissão GPS do aparelho. Sem leitura recente, o ponto permanece identificado como histórico, nunca como localização ao vivo.</p></section>';
  return body;
 }
 function mount(){
  const L=globalThis.L;if(!L)return;
  for(const el of document.querySelectorAll('[data-coi-map]')){
   const entry=targets.get(el.dataset.coiMap);
   if(!entry||!coords(entry.point))continue;
   const map=L.map(el,{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,attributionControl:true});
   maps.push({key:el.dataset.coiMap,map});
   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap © CARTO',detectRetina:false
   }).addTo(map);
   const path=entry.route.filter(coords).map(p=>[p.lat,p.lng]);
   if(path.length>1)L.polyline(path,{color:'#38bdf8',weight:3,opacity:.88,interactive:false}).addTo(map);
   for(const p of entry.route.filter(coords))L.circleMarker([p.lat,p.lng],{radius:3,color:'#f4f4f5',fillColor:'#38bdf8',fillOpacity:1,weight:1,interactive:false}).addTo(map);
   const live=recent(entry.at);
   const dot=L.circleMarker([entry.point.lat,entry.point.lng],{radius:8,color:'#fff',weight:2,fillColor:live?'#10b981':'#f7cb35',fillOpacity:1,interactive:false}).addTo(map);
   const prior=previous.get(el.dataset.coiMap);
   if(prior&&coords(prior)&&live&&Math.abs(prior.lat-entry.point.lat)+Math.abs(prior.lng-entry.point.lng)<.02){
    const start=performance.now(),duration=1200;
    const animate=t=>{
     if(!el.isConnected)return;
     const factor=Math.min(1,(t-start)/duration);
     const ease=factor*(2-factor);
     dot.setLatLng([prior.lat+(entry.point.lat-prior.lat)*ease,prior.lng+(entry.point.lng-prior.lng)*ease]);
     if(factor<1)requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
   }
   previous.set(el.dataset.coiMap,{lat:entry.point.lat,lng:entry.point.lng});
   if(path.length>1)map.fitBounds([...path,[entry.point.lat,entry.point.lng]],{padding:[19,19],maxZoom:15,animate:false});
   else map.setView([entry.point.lat,entry.point.lng],15,{animate:false});
   setTimeout(()=>{if(el.isConnected)map.invalidateSize()},90);
  }
 }
 return {render,mount,reset,selectTab,getTab:()=>tab};
}
