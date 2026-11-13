/* Rondas Pro · COI: pessoas, acompanhamento, evidências e situação.
 * Mapas de rondas e vistorias são visíveis no celular e no computador.
 * Tudo é obtido da API autenticada, sem simular pessoas em produção.
 * Cartografia adaptada: substituído basemaps.cartocdn.com/dark_all por OpenStreetMap para eliminar "API KEY REQUIRED".
 */
import {searchPlacesWithLearned, recordLearnedPlace, searchFocus, distanceLabel} from './place-search.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=x=>x?new Date(x).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Sem registro';
const clock=x=>x?new Date(x).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';
const coords=x=>x&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&Math.abs(x.lat)<=90&&Math.abs(x.lng)<=180;
const recent=t=>Number.isFinite(t)&&Date.now()-t<=120000&&Date.now()>=t-60000;
const roles={ronda:'Ronda · Agente de Ronda',vistoriador:'Ronda · Agente de Ronda'};
const priority={panic:0,route_deviation:1,incident:2,gps_issue:3,alert:4,patrol_incomplete:5,patrol_interrupted:6,message:7,inspection:8};
const label={panic:'Pânico',incident:'Ocorrência',alert:'Alerta',gps_issue:'Falha de GPS',route_deviation:'Desvio',message:'Mensagem',inspection:'Laudo de vistoria',patrol_incomplete:'Ronda incompleta',patrol_interrupted:'Ronda interrompida'};

export function createCoiMonitor({api=null,notify=null}={}){
 let tab='rondas',snapshot={account:null,rounds:[],events:[],routes:[],users:[],availability:[],dispatches:[]};
 let maps=[],targets=new Map(),previous=new Map();
 let activeTargetMarker=null,manualPinMode=false,searchDebounceTimer=null,searchAbort=null;

 function reset(){
  if(activeTargetMarker){
   try{activeTargetMarker.remove()}catch{}
   activeTargetMarker=null;
  }
  if(searchAbort){
   try{searchAbort.abort()}catch{}
   searchAbort=null;
  }
  clearTimeout(searchDebounceTimer);
  manualPinMode=false;
  for(const item of maps){try{item.map.remove()}catch{}}
  maps=[];targets.clear();
 }

 function selectTab(value){if(['rondas','vistorias'].includes(value)){tab=value;return true}return false}
 function copy(data){snapshot=data}

 function render(data){
  snapshot=data;targets.clear();
  const {account,rounds=[],events=[],routes=[],users=[],availability=[],dispatches=[],demo=false}=data;
  const isAdmin=['admin','master'].includes(account?.role),who=new Map(users.map(u=>[u.id,u]));
  const online=new Map(availability.map(a=>[a.id,a]));
  const latest=(rounds||[]).slice().sort((a,b)=>(b.start||0)-(a.start||0));
  const active=latest.filter(r=>r.status==='em_andamento');
  const inspections=events.filter(e=>e.kind==='inspection').slice().sort((a,b)=>b.occurred_at-a.occurred_at);
  const currentInspections=dispatches.filter(d=>d.kind==='vistoria'&&d.started_at&&!d.completed_at).sort((a,b)=>b.started_at-a.started_at);
  const queue=events.filter(e=>priority[e.kind]!==undefined&&e.status!=='resolvida')
   .sort((a,b)=>(priority[a.kind]??99)-(priority[b.kind]??99)||(b.occurred_at||0)-(a.occurred_at||0));
  const workers=availability.filter(w=>['ronda','vistoriador'].includes(w.role));
  const disconnected=workers.filter(w=>w.connectionStatus==='offline');
  const teamPresence='<section class="coi3-presence" aria-label="Conexão da equipe de campo"><header><strong>Conexão da equipe</strong><span>'+disconnected.length+' sem comunicação · Atualização automática</span></header><div class="coi3-presence-list">'+(workers.length?workers.map(w=>{
   const state=w.connectionStatus==='offline'?'Offline por falta de conexão':w.connectionStatus==='off_duty'?'Fora de serviço':w.activity||'Online';
   const colour=w.connectionStatus==='offline'?'offline':w.connectionStatus==='off_duty'?'off-duty':'online';
   const detail=w.connectionStatus==='offline'?'Último contato: '+time(w.lastContactAt)+(w.activity?' · '+w.activity+' interrompida na central':''):w.connectionStatus==='off_duty'?'Expediente encerrado ou ainda não iniciado':(w.activity||'Disponível para despacho')+' · '+(w.lastContactAt?'Contato: '+time(w.lastContactAt):'Conectando');
   return '<article class="coi3-presence-person"><span class="coi3-presence-dot '+colour+'" aria-hidden="true"></span><div><b>'+esc(w.name)+'</b><small>'+esc(w.site||'Posto não informado')+' · '+esc(detail)+'</small></div><strong class="coi3-presence-state '+colour+'">'+esc(state)+'</strong></article>';
  }).join(''):'<p class="coi3-empty">Nenhum agente de ronda cadastrado.</p>')+'</div></section>';
  const header='<header class="coi3-heading"><div class="coi3-heading-copy"><div class="eyebrow">CENTRAL OPERACIONAL · GRUPO MAXVEL</div><h1>COI · Acompanhamento</h1><p>Contato, rondas, atendimentos e resposta às ocorrências</p><span class="coi3-site">Posto / região: '+esc(account?.site||'Todos os postos autorizados')+'</span></div><div class="coi3-onair"><span class="coi3-led" aria-hidden="true"></span><span>Central conectada<small>Atualizações do servidor a cada 30 s</small></span><strong data-ops-live-clock>'+new Date().toLocaleTimeString('pt-BR')+'</strong></div></header>';
  const metrics='<div class="coi3-stats" aria-label="Resumo operacional"><div><strong>'+active.length+'</strong><span>Rondas em curso</span></div><div><strong>'+currentInspections.length+'</strong><span>Atendimentos em curso</span></div><div class="'+(queue.length?'coi3-count-attention':'')+'"><strong>'+queue.length+'</strong><span>Aguardando COI</span></div><div><strong>'+workers.filter(w=>w.status==='Disponível').length+'</strong><span>Campo disponível</span></div></div>';
  const tools='<nav class="coi3-actions" aria-label="Tarefas da central"><button type="button" data-page="treatments" class="coi3-action-urgent"><span aria-hidden="true">◉</span> Tratativas '+(queue.length?'('+queue.length+')':'')+'</button><button type="button" data-page="notifications">Notificações</button><button type="button" data-page="dispatches">Despachar equipe</button><button type="button" data-page="routes">📍 Criar / Enviar Rota</button></nav>';
  const tabs='<div class="coi3-tabs" role="group" aria-label="Tipo de acompanhamento"><button type="button" data-coi-tab="rondas" aria-pressed="'+(tab==='rondas')+'" class="'+(tab==='rondas'?'is-active':'')+'">Rondas <span>'+latest.length+'</span></button><button type="button" data-coi-tab="vistorias" aria-pressed="'+(tab==='vistorias')+'" class="'+(tab==='vistorias'?'is-active':'')+'">Atendimentos <span>'+(inspections.length+currentInspections.length)+'</span></button></div>';
  const location=({id,point,at,route=[],track=[],name,kind})=>{
   const knownRoute=route.filter(coords);
   const knownTrack=(track||[]).filter(coords);
   if(!coords(point)&&!knownRoute.length&&!knownTrack.length)return '<div class="coi3-map-empty">Sem GPS e sem percurso cadastrado. Não há localização verificável para mostrar.</div>';
   const fresh=coords(point)&&recent(at),key=kind+':'+id;
   targets.set(key,{point,at,route,track:knownTrack,name,kind});
   return '<div class="coi3-location"><div class="coi3-map" data-coi-map="'+esc(key)+'" aria-label="Mapa da '+(kind==='round'?'ronda':'atendimento')+' '+esc(name)+'"></div><div class="coi3-position-status"><span class="'+(fresh?'coi3-fresh':'')+'">'+(!coords(point)?'● Percurso previsto, sem GPS do profissional':fresh?'● GPS recente (Rastro contínuo em tempo real)':'● Última posição registrada')+'</span><span>'+(!coords(point)?'Aguardando posição':time(at))+(knownTrack.length>1?' · '+knownTrack.length+' pontos na trilha':'')+'</span></div></div>';
  };
  const roundCard=r=>{
   const u=who.get(r.userId),person=online.get(r.userId),route=routes.find(x=>x.id===r.routeId)||routes.find(x=>x.user_id===r.userId||x.userId===r.userId);
   const progress=(r.checkpoints||0)+' / '+(route?.points?.length||'—');
   const live=r.status==='em_andamento',presence=person?.position;
   const position=(coords(presence)&&(!r.lastFixAt||presence.at>r.lastFixAt))?presence:r.lastFix;
   const at=position===presence?presence?.at:r.lastFixAt;
   const planned=(route?.points||[]).filter(coords);
   const track=r.track||[];
   return '<article class="coi3-record '+(live?'is-active':'')+'"><div class="coi3-record-title"><span class="coi3-person-icon" aria-hidden="true">R</span><div><small>'+esc(r.site||u?.site||'Posto não informado')+'</small><h3>'+esc(u?.name||'Ronda')+'</h3><p>'+esc(route?.name||'Ronda registrada')+'</p></div><span class="coi3-record-state '+(live?'coi3-inprogress':'')+'">'+(live?'Em ronda':esc(String(r.status||'Encerrada').replaceAll('_',' ')))+'</span></div><div class="coi3-facts"><span>Início <strong>'+clock(r.start)+'</strong></span><span>Término <strong>'+clock(r.end)+'</strong></span><span>Pontos <strong>'+esc(progress)+'</strong></span><span>Distância <strong>'+(Number.isFinite(r.km)?r.km+' km':'—')+'</strong></span></div>'+location({id:r.id||r.userId,point:position,at,route:planned,track,name:u?.name||'Ronda',kind:'round'})+'</article>';
  };
  const inspectionCard=(dispatch,event)=>{
   const uid=dispatch?.worker_id||event?.user_id,person=online.get(uid),user=who.get(uid);
   const lastEvent=event||events.find(e=>e.user_id===uid&&e.kind==='inspection'&&(!dispatch?.started_at||e.occurred_at>=dispatch.started_at));
   const active=!!dispatch&&!dispatch.completed_at;
   const presence=person?.position,recordPosition=lastEvent?.position||((Number.isFinite(lastEvent?.lat)&&Number.isFinite(lastEvent?.lng))?{lat:lastEvent.lat,lng:lastEvent.lng}:null);
   const pos=coords(presence)?presence:recordPosition;
   const at=pos===presence?presence.at:lastEvent?.occurred_at;
   const name=user?.name||dispatch?.worker||'Ronda',site=dispatch?.site||lastEvent?.site||'Local não informado';
   return '<article class="coi3-record '+(active?'is-active':'')+'"><div class="coi3-record-title"><span class="coi3-person-icon" aria-hidden="true">R</span><div><small>'+esc(site)+'</small><h3>'+esc(name)+'</h3><p>'+esc(dispatch?.address||lastEvent?.description||'Atendimento operacional')+'</p></div><span class="coi3-record-state '+(active?'coi3-inprogress':'')+'">'+(active?'Em atendimento':'Atendimento concluído')+'</span></div><div class="coi3-facts"><span>Início <strong>'+clock(dispatch?.started_at||lastEvent?.occurred_at)+'</strong></span><span>Término <strong>'+clock(dispatch?.completed_at||lastEvent?.occurred_at)+'</strong></span><span>Resultado <strong>'+(Number.isFinite(lastEvent?.details?.qualityPercent)?lastEvent.details.qualityPercent+'% conforme':'—')+'</strong></span></div>'+location({id:dispatch?.id||lastEvent?.id||uid,point:pos,at,route:[],track:[],name,kind:'inspection'})+(lastEvent?'<button type="button" class="coi3-record-detail" data-event="'+esc(lastEvent.id)+'">Abrir laudo e evidências →</button>':'<p class="muted">Laudo e mídias aparecem após envio do Ronda.</p>')+'</article>';
  };
  const inspectorSeen=new Set(currentInspections.map(d=>d.worker_id));
  const view=tab==='rondas'?
   (latest.length?'<div class="coi3-record-stack">'+latest.slice(0,16).map(roundCard).join('')+'</div>':'<div class="coi3-empty">Nenhuma ronda sincronizada. Consulte a equipe e as rotas atribuídas.</div>'):
   ((currentInspections.length||inspections.length)?'<div class="coi3-record-stack">'+currentInspections.slice(0,12).map(d=>inspectionCard(d,null)).join('')+inspections.filter(e=>!inspectorSeen.has(e.user_id)||!currentInspections.some(d=>d.worker_id===e.user_id&&e.occurred_at>=d.started_at)).slice(0,18).map(e=>inspectionCard(null,e)).join('')+'</div>':'<div class="coi3-empty">Nenhum atendimento recebido. Solicite uma ronda em Despachar equipe.</div>');

  const previewRoutes=demo?routes.filter(route=>Array.isArray(route.points)&&route.points.some(coords)).slice(0,3):[];
  const showcase=demo?'<section class="coi3-demo-preview"><header><div><strong>Prévia dos percursos cadastrados</strong><p>Ilustração das rotas previstas. Nenhum deslocamento fictício é apresentado como ronda realizada.</p></div><span>DEMONSTRAÇÃO</span></header>'+
   (previewRoutes.length?'<div class="coi3-record-stack">'+previewRoutes.map((route,i)=>{
    const ordered=route.points.filter(coords);
    return '<article class="coi3-record coi3-demo-route"><h3>'+esc(route.name||'Percurso '+(i+1))+'</h3>'+
     '<ol>'+ordered.slice(0,8).map(p=>'<li>'+esc(p.name||p.address||'Ponto cadastrado')+'</li>').join('')+'</ol>'+
     location({id:'demonstracao-'+(route.id||i),point:null,at:null,route:ordered,name:'Percurso demonstrativo',kind:'round'})+'</article>';
   }).join('')+'</div>':'<p class="coi3-empty">Comece cadastrando pontos em Rotas e rondas. O mapa previsto aparecerá aqui, inclusive no celular.</p>')+
   '</section>':'';

  const queueUI='<section class="coi3-secondary"><header><h2>Comunicação que exige resposta</h2><button type="button" data-page="treatments">Abrir tratativas →</button></header><div class="coi3-alert-list">'+(queue.length?queue.slice(0,5).map(e=>'<button type="button" data-event="'+esc(e.id)+'" class="coi3-alert '+(e.kind==='panic'?'is-panic':'')+'"><strong>'+esc(label[e.kind]||e.kind)+'</strong><span>'+esc(e.description||'Sem descrição')+'</span><small>'+time(e.occurred_at)+' · '+esc(e.site||'Sem posto')+'</small></button>').join(''):'<p class="coi3-empty">Nenhuma pendência de comunicação aberta.</p>')+'</div></section>';

  const tacticalMap='<section class="coi3-tactical-map-card surface" style="margin-bottom:18px;border-radius:14px;background:#191919;border:1px solid #535353;padding:14px;box-sizing:border-box;">'+
   '<header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'+
   '<div><div class="eyebrow" style="font-size:10.5px;letter-spacing:1px;color:#B3B3B3;font-weight:700;">MONITORAMENTO TÁTICO · COI EM TEMPO REAL</div><h2 style="font-size:16px;font-weight:700;color:#FFFFFF;margin:2px 0 0 0;">Mapa Geral de Acompanhamento · Equipe e Postos</h2></div>'+
   '<div style="display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;font-size:11px;font-weight:700;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span> Central Ativa</span></div>'+
   '</header>'+
   '<div class="coi-address-bar-container" style="margin-bottom:10px;display:flex;flex-direction:column;gap:8px;">'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
   '<div style="flex:1;min-width:220px;position:relative;">'+
   '<input id="coi-address-search-input" type="search" autocomplete="off" placeholder="Digite endereço, posto ou local para ver no mapa..." style="width:100%;box-sizing:border-box;min-height:44px;padding:10px 14px;background:#262626;border:1px solid #535353;border-radius:10px;color:#FFFFFF;font-size:13.5px;outline:none;">'+
   '</div>'+
   '<button type="button" id="coi-address-search-btn" class="primary" style="min-height:44px;padding:0 16px;background:#e5232a;border:none;border-radius:10px;color:#FFFFFF;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">🔍 Localizar</button>'+
   '<button type="button" id="coi-address-manual-btn" style="min-height:44px;padding:0 14px;background:#262626;border:1px solid #535353;border-radius:10px;color:#FFFFFF;font-weight:600;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;" title="Toque no mapa para indicar onde seria o ponto">📍 Marcar no mapa</button>'+
   '</div>'+
   '<div id="coi-address-suggestions" hidden style="max-height:220px;overflow-y:auto;background:#262626;border:1px solid #535353;border-radius:10px;padding:6px;display:flex;flex-direction:column;gap:6px;box-shadow:0 12px 36px rgba(0,0,0,0.9);z-index:1000;"></div>'+
   '<div id="coi-address-status" style="display:none;padding:10px 12px;border-radius:8px;background:#303030;border:1px solid #535353;color:#E5E5E5;font-size:12.5px;line-height:1.4;"></div>'+
   '</div>'+
   '<div id="coi-tactical-map" class="coi3-map" style="height:360px;width:100%;border-radius:10px;background:#191919;border:1px solid #535353;overflow:hidden;position:relative;"></div>'+
   '</section>';

  const body='<section class="coi3-app">'+header+metrics+tools+tacticalMap+'<section class="coi3-section"><header class="coi3-section-header"><div><h2>Equipe em acompanhamento</h2><p>Selecione a atividade para ver os registros e a localização disponível de cada profissional.</p></div></header>'+teamPresence+tabs+view+showcase+'</section>'+queueUI+'<p class="coi3-footnote">As posições são recebidas mediante permissão GPS do aparelho. Sem leitura recente, o ponto permanece identificado como histórico, nunca como localização ao vivo.</p></section>';
  return body;
 }

 function mount(){
  const L=globalThis.L;
  if(!L){
   setTimeout(mount,100);
   return;
  }
  function updateTacticalLayers(tMap, group){
   group.clearLayers();
   let markers=[];
   const {availability=[],routes=[],rounds=[]}=snapshot;
   // Rastreamento operacional por rastro contínuo (Phase 3)
   for(const r of rounds){
    const track=(r.track||[]).filter(coords);
    if(track.length>0){
     let seg=[];
     for(const pt of track){
      if(pt.segmentStart&&seg.length>0){
       if(seg.length>1)L.polyline(seg,{color:'#e5232a',weight:4,opacity:0.95,interactive:false}).addTo(group);
       seg=[];
      }
      seg.push([pt.lat,pt.lng]);
      markers.push([pt.lat,pt.lng]);
     }
     if(seg.length>1)L.polyline(seg,{color:'#e5232a',weight:4,opacity:0.95,interactive:false}).addTo(group);
     const firstPt=track[0];
     if(firstPt){
      L.circleMarker([firstPt.lat,firstPt.lng],{radius:6,color:'#fff',fillColor:'#10b981',fillOpacity:1,weight:2}).addTo(group)
       .bindTooltip('Início da trajetória');
      markers.push([firstPt.lat,firstPt.lng]);
     }
    }
   }
   // Presença dos profissionais de ronda
   for(const w of availability){
    if(w.position&&coords(w.position)){
     const isOnline=w.connectionStatus!=='offline';
     const m=L.circleMarker([w.position.lat,w.position.lng],{radius:8,color:'#fff',weight:2,fillColor:isOnline?'#10b981':'#ef4444',fillOpacity:1}).addTo(group);
     m.bindTooltip(esc(w.name)+' ('+esc(roles[w.role]||'Ronda')+')');
     markers.push([w.position.lat,w.position.lng]);
    }
   }
   // Rotas planejadas (indicativas/previstas)
   for(const r of routes){
    const pts=(r.points||[]).filter(coords);
    if(pts.length>1)L.polyline(pts.map(p=>[p.lat,p.lng]),{color:'#e5232a',weight:2,dashArray:'6, 8',opacity:0.65,interactive:false}).addTo(group);
    for(const p of pts){
     L.circleMarker([p.lat,p.lng],{radius:4,color:'#fff',fillColor:'#e5232a',fillOpacity:0.9,weight:1}).addTo(group).bindTooltip(esc(p.name||'Ponto'));
     markers.push([p.lat,p.lng]);
    }
    if(r.base&&coords(r.base)){
     L.circleMarker([r.base.lat,r.base.lng],{radius:7,color:'#fff',fillColor:'#f59e0b',fillOpacity:1,weight:2}).addTo(group).bindTooltip('Base: '+esc(r.name||'Posto'));
     markers.push([r.base.lat,r.base.lng]);
    }
   }
   return markers;
  }

  const tacticalEl=document.getElementById('coi-tactical-map');
  if(tacticalEl){
   let tMap;
   const existingTactical=maps.find(m=>m.key==='tactical-coi-overview');
   if(existingTactical&&tacticalEl._leaflet_id){
    tMap=existingTactical.map;
    updateTacticalLayers(tMap, existingTactical.layerGroup);
   }else if(!tacticalEl._leaflet_id){
    tMap=L.map(tacticalEl,{zoomControl:true,scrollWheelZoom:false});
    const tacticalGroup=L.layerGroup().addTo(tMap);
    maps.push({key:'tactical-coi-overview',map:tMap,layerGroup:tacticalGroup});
    const tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
     maxZoom:19,attribution:'© OpenStreetMap contributors',className:'maxvel-osm-dark-adapted'
    }).addTo(tMap);
    tileLayer.on('tileerror',e=>{
     if(e.tile&&!e.tile.dataset.offlineTried){
      e.tile.dataset.offlineTried='true';
      const c=e.coords;
      if(c&&Number.isFinite(c.z))e.tile.src=`./assets/tiles/${c.z}/${c.x}/${c.y}.png`;
     }
    });

    const markers=updateTacticalLayers(tMap, tacticalGroup);
    if(markers.length>1)tMap.fitBounds(markers,{padding:[24,24],maxZoom:16,animate:false});
    else if(markers.length===1)tMap.setView(markers[0],15,{animate:false});
    else tMap.setView([-20.145,-44.891],13,{animate:false});
    setTimeout(()=>{if(tacticalEl.isConnected)tMap.invalidateSize()},90);
   }

    // BARRA DE DIGITAÇÃO DE ENDEREÇOS COM REFLEXO IMEDIATO NO MAPA
    const addrInput=document.getElementById('coi-address-search-input');
    const searchBtn=document.getElementById('coi-address-search-btn');
    const manualBtn=document.getElementById('coi-address-manual-btn');
    const suggestionsBox=document.getElementById('coi-address-suggestions');
    const statusBox=document.getElementById('coi-address-status');

    function showStatus(html){
     if(!statusBox)return;
     statusBox.style.display='block';
     statusBox.innerHTML=html;
    }
    function hideStatus(){
     if(statusBox)statusBox.style.display='none';
    }

    function reflectPointOnMap(lat,lng,name,address,autoOpenPopup=true){
     tMap.setView([lat,lng],16,{animate:true});
     if(activeTargetMarker){
      try{activeTargetMarker.remove()}catch{}
     }
     const pinHtml='<div style="background:#e5232a;color:#FFF;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:18px;border:2px solid #FFF;box-shadow:0 0 0 3px rgba(229,35,42,0.4),0 4px 12px rgba(0,0,0,0.8);cursor:pointer;">📍</div>';
     const customIcon=L.divIcon({
      className:'coi-pin-icon',
      html:pinHtml,
      iconSize:[34,34],
      iconAnchor:[17,34],
      popupAnchor:[0,-34]
     });
     activeTargetMarker=L.marker([lat,lng],{icon:customIcon,draggable:true}).addTo(tMap);

     const popupContent=document.createElement('div');
     popupContent.style.cssText='font-family:Inter,sans-serif;font-size:13px;color:#191919;min-width:220px;padding:4px 0;';
     popupContent.innerHTML='<strong style="display:block;font-size:14px;color:#191919;margin-bottom:4px;">'+esc(name||'Ponto localizado')+'</strong>'+
      '<input id="coi-pin-name-input" type="text" value="'+esc(name||'')+'" placeholder="Identificação do ponto ou posto" style="width:100%;box-sizing:border-box;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:12px;margin-bottom:6px;">'+
      '<p style="font-size:11.5px;color:#555;margin:0 0 8px 0;line-height:1.3;">'+esc(address||('Coordenadas: '+lat.toFixed(5)+', '+lng.toFixed(5)))+'</p>'+
      '<button type="button" id="coi-save-point-btn" style="width:100%;background:#e5232a;color:#FFF;border:none;border-radius:6px;padding:7px 12px;font-weight:700;font-size:12.5px;cursor:pointer;">Salvar Ponto no COI</button>';

     activeTargetMarker.bindPopup(popupContent);
     if(autoOpenPopup)activeTargetMarker.openPopup();

     activeTargetMarker.on('dragend',e=>{
      const pos=e.target.getLatLng();
      reflectPointOnMap(pos.lat,pos.lng,name,'Coordenadas: '+pos.lat.toFixed(5)+', '+pos.lng.toFixed(5),true);
     });

     popupContent.querySelector('#coi-save-point-btn')?.addEventListener('click',async()=>{
      const inputVal=popupContent.querySelector('#coi-pin-name-input')?.value.trim();
      const finalName=inputVal||name||'Ponto cadastrado';
      const finalAddress=address||('Lat: '+lat.toFixed(5)+', Lng: '+lng.toFixed(5));
      try{
       if(typeof api==='function'){
        await api('/saved-points',{method:'POST',data:{name:finalName,address:finalAddress,lat,lng}});
       }
       if(typeof notify==='function')notify('Ponto "'+finalName+'" salvo com sucesso no COI!');
       showStatus('✓ <strong>Ponto cadastrado:</strong> '+esc(finalName)+' adicionado com sucesso aos pontos operacionais.');
       activeTargetMarker.closePopup();
       activeTargetMarker.bindTooltip('📍 '+esc(finalName)).openTooltip();
      }catch(err){
       showStatus('Erro ao salvar ponto: '+(err.message||'Tente novamente'));
      }
     });

     showStatus('📍 <strong>Local refletido no mapa:</strong> '+esc(name||'Ponto')+' ('+lat.toFixed(5)+', '+lng.toFixed(5)+'). Toque no marcador para salvar.');
    }

   async function executeAddressSearch(query){
    const q=String(query||addrInput?.value||'').trim();
    if(q.length<3){
     showStatus('Digite ao menos 3 caracteres para buscar o endereço.');
     if(suggestionsBox)suggestionsBox.hidden=true;
     return;
    }
    if(searchAbort)searchAbort.abort();
    searchAbort=new AbortController();
    if(suggestionsBox){
     suggestionsBox.hidden=false;
     suggestionsBox.innerHTML='<span style="color:#B3B3B3;font-size:12px;padding:6px;">Buscando endereços e postos…</span>';
    }
    try{
     const focus=searchFocus(null,tMap)||{lat:-20.14030,lng:-44.88400};
     const results=await searchPlacesWithLearned(q,{focus,limit:6,signal:searchAbort.signal});
     if(!results||!results.length){
      if(suggestionsBox){
       suggestionsBox.hidden=true;
       suggestionsBox.innerHTML='';
      }
      showStatus('⚠️ <strong>Endereço não localizado automaticamente.</strong> Você pode tocar/clicar diretamente no mapa para marcar o local exato onde seria.');
      manualPinMode=true;
      tacticalEl.style.cursor='crosshair';
      return;
     }
     suggestionsBox.hidden=false;
     suggestionsBox.innerHTML=results.map((p,i)=>'<button type="button" data-coi-place-idx="'+i+'" style="display:flex;justify-content:space-between;align-items:center;text-align:left;padding:8px 10px;border-radius:8px;background:#303030;border:1px solid #535353;color:#FFFFFF;cursor:pointer;gap:8px;"><span><strong style="display:block;font-size:13px;color:#FFFFFF;">'+esc(p.name)+'</strong><small style="color:#B3B3B3;font-size:11.5px;">'+esc(p.address||'Endereço localizado')+'</small></span><span style="font-size:11px;color:#e5232a;font-weight:700;white-space:nowrap;">Ver no mapa ➔</span></button>').join('');

     suggestionsBox.querySelectorAll('[data-coi-place-idx]').forEach(btn=>{
      btn.addEventListener('click',()=>{
       const idx=Number(btn.dataset.coiPlaceIdx);
       const p=results[idx];
       if(p){
        if(addrInput)addrInput.value=p.name;
        suggestionsBox.hidden=true;
        reflectPointOnMap(p.lat,p.lng,p.name,p.address||p.name,true);
        try{recordLearnedPlace(p)}catch{}
       }
      });
     });

     const first=results[0];
     reflectPointOnMap(first.lat,first.lng,first.name,first.address||first.name,false);
    }catch(err){
     if(err?.name!=='AbortError'){
      showStatus('⚠️ <strong>Busca não retornou resultado.</strong> Toque no mapa para marcar manualmente onde seria.');
      manualPinMode=true;
      tacticalEl.style.cursor='crosshair';
      if(suggestionsBox)suggestionsBox.hidden=true;
     }
    }
   }

   tMap.on('click',e=>{
    const lat=e.latlng.lat,lng=e.latlng.lng;
    const typed=addrInput?.value?.trim()||'';
    const pointTitle=typed||('Ponto '+lat.toFixed(4)+', '+lng.toFixed(4));
    reflectPointOnMap(lat,lng,pointTitle,typed?('Endereço: '+typed):('Lat: '+lat.toFixed(5)+', Lng: '+lng.toFixed(5)),true);
    manualPinMode=false;
    tacticalEl.style.cursor='';
   });

   if(addrInput&&!addrInput.dataset.coiBound){
    addrInput.dataset.coiBound='true';
    addrInput.addEventListener('input',()=>{
     clearTimeout(searchDebounceTimer);
     const val=addrInput.value.trim();
     if(val.length<3){
      if(suggestionsBox){
       suggestionsBox.hidden=true;
       suggestionsBox.innerHTML='';
      }
      hideStatus();
      return;
     }
     searchDebounceTimer=setTimeout(()=>executeAddressSearch(val),280);
    });
    addrInput.addEventListener('keydown',e=>{
     if(e.key==='Enter'){
      e.preventDefault();
      clearTimeout(searchDebounceTimer);
      executeAddressSearch(addrInput.value.trim());
     }
    });
   }

   if(searchBtn&&!searchBtn.dataset.coiBound){
    searchBtn.dataset.coiBound='true';
    searchBtn.addEventListener('click',()=>{
     executeAddressSearch(addrInput?.value?.trim());
    });
   }

   if(manualBtn&&!manualBtn.dataset.coiBound){
    manualBtn.dataset.coiBound='true';
    manualBtn.addEventListener('click',()=>{
     manualPinMode=!manualPinMode;
     if(manualPinMode){
      showStatus('📍 <strong>Modo de marcação ativo:</strong> Toque ou clique em qualquer lugar do mapa para fixar o ponto.');
      tacticalEl.style.cursor='crosshair';
     }else{
      hideStatus();
      tacticalEl.style.cursor='';
     }
    });
   }
  }

  for(const el of document.querySelectorAll('[data-coi-map]')){
   const entry=targets.get(el.dataset.coiMap);
   if(!entry||(!coords(entry.point)&&!entry.route.some(coords)&&!(entry.track||[]).some(coords)))continue;
   let cardMapObj=maps.find(m=>m.key===el.dataset.coiMap);
   let cardMap, cardGroup;
   if(!el._leaflet_id||!cardMapObj){
    cardMap=L.map(el,{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,attributionControl:true});
    cardGroup=L.layerGroup().addTo(cardMap);
    cardMapObj={key:el.dataset.coiMap,map:cardMap,layerGroup:cardGroup};
    maps.push(cardMapObj);
    const tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
     maxZoom:19,attribution:'© OpenStreetMap contributors',crossOrigin:true,className:'maxvel-osm-dark-adapted'
    }).addTo(cardMap);
    tileLayer.on('tileerror',e=>{
     if(e.tile&&!e.tile.dataset.offlineTried){
      e.tile.dataset.offlineTried='true';
      const c=e.coords;
      if(c&&Number.isFinite(c.z))e.tile.src=`./assets/tiles/${c.z}/${c.x}/${c.y}.png`;
     }
    });
   }else{
    cardMap=cardMapObj.map;
    cardGroup=cardMapObj.layerGroup;
    cardGroup.clearLayers();
   }

   // 1. Rota prevista / planejada (linha tracejada discreta)
   const plannedPts=entry.route.filter(coords).map(p=>[p.lat,p.lng]);
   if(plannedPts.length>1)L.polyline(plannedPts,{color:'#888',weight:2,dashArray:'6, 8',opacity:0.7,interactive:false}).addTo(cardGroup);
   for(const p of entry.route.filter(coords)){
    L.circleMarker([p.lat,p.lng],{radius:3,color:'#888',fillColor:'#bbb',fillOpacity:0.8,weight:1,interactive:false}).addTo(cardGroup);
   }

   // 2. Trajetória real registrada por rastro contínuo (linha sólida vermelha #e5232a, dividida por gaps)
   const trackPts=(entry.track||[]).filter(coords);
   let allBoundsPts=[...plannedPts];
   if(trackPts.length>0){
    let seg=[];
    for(const pt of trackPts){
     if(pt.segmentStart&&seg.length>0){
      if(seg.length>1)L.polyline(seg,{color:'#e5232a',weight:4,opacity:0.95,interactive:false}).addTo(cardGroup);
      seg=[];
     }
     seg.push([pt.lat,pt.lng]);
     allBoundsPts.push([pt.lat,pt.lng]);
    }
    if(seg.length>1)L.polyline(seg,{color:'#e5232a',weight:4,opacity:0.95,interactive:false}).addTo(cardGroup);
    // Vértice inicial verde (início da trajetória)
    const start=trackPts[0];
    if(start){
     L.circleMarker([start.lat,start.lng],{radius:5,color:'#fff',fillColor:'#10b981',fillOpacity:1,weight:2,interactive:false}).addTo(cardGroup);
    }
   }

   // 3. Marcador da posição mais recente da ronda
   const live=recent(entry.at);
   const dot=coords(entry.point)?L.circleMarker([entry.point.lat,entry.point.lng],{radius:8,color:'#fff',weight:2.5,fillColor:live?'#10b981':'#f7cb35',fillOpacity:1,interactive:false}).addTo(cardGroup):null;
   if(coords(entry.point))allBoundsPts.push([entry.point.lat,entry.point.lng]);
   const prior=previous.get(el.dataset.coiMap);
   if(dot&&prior&&coords(prior)&&live&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&Math.abs(prior.lat-entry.point.lat)+Math.abs(prior.lng-entry.point.lng)<.02){
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
   if(coords(entry.point))previous.set(el.dataset.coiMap,{lat:entry.point.lat,lng:entry.point.lng});

   if(allBoundsPts.length>1)cardMap.fitBounds(allBoundsPts,{padding:[19,19],maxZoom:15,animate:false});
   else if(allBoundsPts.length===1)cardMap.setView(allBoundsPts[0],15,{animate:false});
   setTimeout(()=>{if(el.isConnected)cardMap.invalidateSize()},90);
  }
 }
 return {render,mount,reset,selectTab,getTab:()=>tab};
}
