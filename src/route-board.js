/** Administrative and COI route workspace. Live readings are displayed only when received from the authenticated API. */
import {searchPlacesWithLearned,recordLearnedPlace,searchFocus,distanceLabel} from './place-search.js';
export function createRouteBoard({api,getContext,redraw,notify}){
 let watcher='',editing=null,editor=false,points=[],maps=[],draftMap=null,previewPoints=null,addressAbort=null,addressDebounce=null,addressResults=[];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stamp=t=>Number.isFinite(t)&&t>0?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não registrado';
 const datetimeLocal=t=>{if(!Number.isFinite(t))return '';const d=new Date(t),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
 const canEdit=()=>['admin','master','coi','operador'].includes(getContext().account?.role);
 const statuses={em_andamento:'Em andamento',concluida:'Concluída',interrompida:'Interrompida',incompleta:'Incompleta',sem_inicio:'Sem início'};
 const shortStatus=r=>statuses[r.status]||'Aguardando sincronização';
 const isFresh=t=>Number.isFinite(t)&&Date.now()-t<90000;
 const roundEvents=(events,id)=>events.filter(x=>x.round_id===id).sort((a,b)=>a.occurred_at-b.occurred_at);
 function resetMaps(){
  for(const map of maps){try{map.remove()}catch{}}
  maps=[];draftMap=null;
 }
 function chooseWorker(){
  const {users}=getContext(),all=users.filter(x=>x.role==='ronda'&&x.active!==0);
  if(!all.some(x=>x.id===watcher))watcher=all[0]?.id||'';
  return all;
 }
 function chosenWorker(){return chooseWorker().find(u=>u.id===watcher)||null}
 function routeHistory(){
  const {rounds,routes,events}=getContext(),worker=chosenWorker();
  if(!worker)return [];
  const mine=rounds.filter(r=>r.userId===worker.id);
  const linked=routes.filter(r=>r.userId===worker.id);
  const items=mine.map(round=>{
   const def=linked.find(x=>x.id===round.routeId)||null;
   const activity=roundEvents(events,round.id);
   return {key:round.id,round,def,activity,time:round.start||0,plannedOnly:false};
  });
  const activeRouteIds=new Set(mine.map(r=>r.routeId).filter(Boolean));
  for(const def of linked.filter(r=>!activeRouteIds.has(r.id))){
   items.push({key:'planned-'+def.id,round:null,def,activity:[],time:def.updatedAt||0,plannedOnly:true});
  }
  return items.sort((a,b)=>(b.round?.status==='em_andamento'?1:0)-(a.round?.status==='em_andamento'?1:0)||b.time-a.time);
 }
 function mapArea(item,index){
  return '<div class="route-map-box" data-route-map="'+esc(item.key)+'" role="img" aria-label="Mapa da rota '+(index+1)+'"><div class="route-map-pending">Mapa disponível com conexão</div></div>';
 }
 function row(item,i){
  const {round:r,def,activity}=item;
  const site=r?.site||def?.site||chosenWorker()?.site||'Local não identificado';
  const gps=activity.filter(e=>e.kind==='gps'&&Number.isFinite(e.lat)&&Number.isFinite(e.lng)&&Number.isFinite(e.accuracy)&&e.accuracy<=35);
  const alerts=activity.filter(e=>['route_deviation','incident','panic','gps_issue','patrol_incomplete','patrol_interrupted'].includes(e.kind));
  const label=r?shortStatus(r):'Planejada · sem execução';
  const live=r?.status==='em_andamento'&&isFresh(r.lastFixAt);
  const gpsStatus=live?'GPS atualizado':r?.lastFixAt?'Última leitura: '+stamp(r.lastFixAt):'Sem GPS sincronizado';
  const name=def?.name||'Execução sem rota planejada vinculada';
  const recent=alerts.slice(-1)[0];
  return '<article class="route-line'+(live?' is-live':'')+'">'+mapArea(item,i)+
   '<div class="route-line-info"><div class="route-row-top"><span class="route-status'+(live?' live':'')+'">'+esc(label)+'</span><small>'+esc(site)+'</small></div>'+
   '<h3>'+esc(name)+'</h3><p class="muted">'+esc(gpsStatus)+(r?.status==='em_andamento'&&!live?' · Sinal a confirmar':'')+'</p>'+
   '<div class="route-facts"><span>Início <b>'+stamp(r?.start)+'</b></span><span>Pontos <b>'+esc(r?.checkpoints??def?.points?.length??0)+'</b></span><span>Bateria <b>'+(r?.lastBattery==null?'—':r.lastBattery+'%')+'</b></span><span>GPS válido <b>'+Number(r?.gpsSamples??gps.length)+' amostras</b></span></div>'+
   (recent?'<p class="route-attention">Registro: '+esc(recent.kind==='gps_issue'?'Falha técnica GPS':recent.kind==='route_deviation'?'Desvio a verificar':recent.kind==='panic'?'Pânico':recent.kind==='patrol_incomplete'?'Ronda incompleta':recent.kind==='patrol_interrupted'?'Ronda interrompida':'Ocorrência')+' · '+stamp(recent.occurred_at)+'</p>':'')+
   (def?'<p class="route-checkpoints">Pontos previstos: '+def.points.map(p=>esc(p.name)).join(' → ')+'</p>':'<p class="muted">Traçado planejado indisponível; somente posições recebidas podem aparecer no mapa.</p>')+
   '<div class="route-actions">'+(canEdit()&&def?'<button type="button" data-route-edit="'+esc(def.id)+'">Editar rota</button>':'')+(r?'<button type="button" data-route-events="'+esc(r.id)+'">Ver cronologia</button>':'')+'</div>'+
   (r?'<details class="route-timeline" data-route-timeline="'+esc(r.id)+'"><summary>Registros da execução</summary><ol>'+activity.slice(-35).reverse().map(e=>'<li><small>'+stamp(e.occurred_at)+'</small><span>'+esc(({gps:'GPS registrado',battery:'Bateria',checkpoint:'Ponto validado',patrol_start:'Início',patrol_end:'Conclusão',route_deviation:'Possível desvio',gps_issue:'Falha técnica GPS',panic:'Pânico',incident:'Ocorrência'})[e.kind]||e.kind)+'</span></li>').join('')+'</ol></details>':'')+
   '</div></article>';
 }
 function editorHtml(){
  if(!editor||!canEdit())return '';
  const worker=chosenWorker();
  return '<section class="surface route-editor" id="route-editor"><div class="toolbar"><div><div class="eyebrow">COI & ADMINISTRAÇÃO · CADASTRO E ENVIO DE ROTAS</div><h2>'+(editing?'Editar rota':'Criar e enviar rota para vigia')+'</h2><p class="muted">Colaborador: '+esc(worker?.name||'Não selecionado')+' · '+esc(worker?.site||'Sem local')+'</p></div><button type="button" data-route-cancel>Fechar</button></div>'+
   '<form id="route-form" class="stack"><label>Nome da rota<input name="name" required minlength="3" maxlength="120" value="'+esc(editing?.name||'')+'" placeholder="Ex.: Ronda noturna · Perímetro externo"></label>'+
   '<label>Início programado (opcional)<input type="datetime-local" name="plannedStart" value="'+esc(datetimeLocal(editing?.plannedStart))+'"></label><p class="muted">O horário informado será exibido ao vigia e ao cliente do posto. Deixe vazio para disponibilizar imediatamente na tela do vigia.</p>'+
   '<div class="route-address-search-box" style="display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.12);">'+
   '<label style="margin:0;"><strong>Endereço do ponto / destino</strong> <small class="muted">(rua, número, bairro, empresa ou condomínio)</small>'+
   '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">'+
   '<input id="route-point-address" type="search" autocomplete="off" placeholder="Digite o endereço (ex.: Av. Amazonas, 1200, Divinópolis ou Praça da Catedral)" style="flex:1;min-width:200px;">'+
   '<button type="button" data-route-search-address class="secondary">Buscar endereço</button>'+
   '</div></label>'+
   '<div id="route-address-suggestions" class="route-address-suggestions" hidden style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;padding-top:4px;"></div>'+
   '</div>'+
   '<p class="muted">Busque pelo endereço acima, toque no mapa para marcar pontos em ordem ou informe as coordenadas abaixo.</p>'+
   '<div id="route-editor-map" class="route-editor-map" aria-label="Mapa para escolher pontos"><span class="muted">O mapa será exibido quando a cartografia carregar.</span></div>'+
   '<div class="route-coordinate-entry"><label>Nome / identificação do ponto<input id="route-point-name" placeholder="Ex.: Portaria principal / Endereço" maxlength="100"></label>'+
   '<label>Latitude<input id="route-point-lat" type="number" step="any" min="-90" max="90" placeholder="-20.14"></label>'+
   '<label>Longitude<input id="route-point-lng" type="number" step="any" min="-180" max="180" placeholder="-44.89"></label>'+
   '<button type="button" data-route-add>+ Adicionar ponto à rota</button></div>'+
   '<div class="route-editor-points"><h3>Pontos da rota em ordem <small>('+points.length+')</small></h3>'+
   (points.length?points.map((p,i)=>'<div class="route-edit-point"><b>'+String(i+1).padStart(2,'0')+'</b><div style="flex:1;display:flex;flex-direction:column;gap:4px;"><label>Identificação<input data-route-rename="'+i+'" maxlength="100" value="'+esc(p.name)+'" aria-label="Nome do ponto '+(i+1)+'"></label>'+(p.address?'<small class="muted">📍 '+esc(p.address)+'</small>':'')+'<small>'+Number(p.lat).toFixed(5)+', '+Number(p.lng).toFixed(5)+'</small></div><button type="button" data-route-remove="'+i+'" aria-label="Remover ponto '+(i+1)+'">Remover</button></div>').join(''):'<p class="muted">Adicione pelo menos um endereço ou ponto no mapa para enviar a rota ao vigia.</p>')+'</div>'+
   '<button type="submit" class="primary" '+(points.length<1?'disabled':'')+'>Salvar e enviar rota para '+esc(worker?.name||'vigia')+'</button></form></section>';
 }
 function render(){
  const workerList=chooseWorker(),person=chosenWorker(),items=routeHistory();
  const active=items.filter(x=>x.round?.status==='em_andamento').length;
  return '<section class="stack route-board"><header class="toolbar route-titlebar"><div><div class="eyebrow">CONTROLE ADMINISTRATIVO · MAPAS E ROTAS</div><h1>Rotas por colaborador</h1><p class="muted">Organize os percursos e acompanhe execuções registradas, da mais recente para a mais antiga.</p></div>'+(canEdit()?'<button type="button" class="primary" data-route-create '+(!person?'disabled':'')+'>+ Criar nova rota para colaborador</button>':'')+'</header>'+
   '<div class="surface route-filter"><label>Selecionar vigia<select id="route-worker">'+workerList.map(w=>'<option value="'+esc(w.id)+'" '+(w.id===watcher?'selected':'')+'>'+esc(w.name)+' · '+esc(w.site||'Local não definido')+'</option>').join('')+'</select></label>'+
   '<div class="route-counter"><strong>'+active+'</strong><small>em andamento</small></div><div class="route-counter"><strong>'+items.length+'</strong><small>rotas e execuções</small></div></div>'+
   editorHtml()+'<div class="route-lines">'+(items.length?items.slice(0,16).map(row).join(''):'<div class="surface empty">'+(person?'Nenhuma rota ou execução registrada para este colaborador. Use Criar nova rota.':'Cadastre um usuário Vigia na área Colaboradores para organizar as rotas.')+'</div>')+'</div>'+
   '<p class="muted">Mapa: linha contínua indica rota planejada; linha tracejada indica posições GPS confiáveis já sincronizadas. Atualização automática a cada 30 segundos com a página aberta. Sem conexão ou GPS confiável, o mapa não afirma posição ao vivo.</p></section>';
 }
 function mount(){
  resetMaps();
  const {events}=getContext(),items=routeHistory();
  const L=globalThis.L;
  if(!L)return;
  const draw=(host,planned,actual,last)=>{
   if(!host)return null;
   host.innerHTML='';
   const map=L.map(host,{zoomControl:true,scrollWheelZoom:false,attributionControl:true});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
   const bounds=[];
   if(planned.length){
    L.polyline(planned.map(p=>[p.lat,p.lng]),{color:'#ed354b',weight:4,opacity:.9}).addTo(map);
    for(const [i,p] of planned.entries()){L.circleMarker([p.lat,p.lng],{radius:5,color:'#f9c5cf',fillColor:'#e33149',fillOpacity:1}).bindTooltip((i+1)+'. '+esc(p.name)).addTo(map);bounds.push([p.lat,p.lng]);}
   }
   if(actual.length){
    L.polyline(actual.map(p=>[p.lat,p.lng]),{color:'#8ddaf6',weight:3,opacity:.9,dashArray:'5 7'}).addTo(map);
    for(const p of actual)bounds.push([p.lat,p.lng]);
   }
   if(last&&Number.isFinite(last.lat)&&Number.isFinite(last.lng)){
    L.circleMarker([last.lat,last.lng],{radius:9,color:'#fff',fillColor:'#60b4ff',fillOpacity:.95,weight:2}).bindTooltip('Última posição registrada').addTo(map);
    bounds.push([last.lat,last.lng]);
   }
   if(bounds.length){map.fitBounds(L.latLngBounds(bounds).pad(.22),{maxZoom:16,animate:false});}
   else map.setView([-20.145,-44.89],12);
   maps.push(map);setTimeout(()=>{try{map.invalidateSize()}catch{}},50);
   return map;
  };
  items.slice(0,16).forEach(item=>{
   const host=[...document.querySelectorAll('[data-route-map]')].find(el=>el.dataset.routeMap===item.key);
   const track=Array.isArray(item.round?.track)?item.round.track:[];
   const actual=track.length?track:item.activity.filter(e=>e.kind==='gps'&&Number.isFinite(e.lat)&&Number.isFinite(e.lng)&&Number.isFinite(e.accuracy)&&e.accuracy<=35);
   draw(host,item.def?.points||[],actual,item.round?.lastFix);
  });
  if(editor){
   const host=document.querySelector('#route-editor-map'),worker=chosenWorker(),base=editing?.points?.[0]||points[0]||null;
   const map=draw(host,points,[],null);draftMap=map;
   if(map){
    if(base)map.setView([base.lat,base.lng],16);
    map.on('click',e=>{
     if(!editor)return;
     const addrInput=document.querySelector('#route-point-address')?.value.trim()||'';
     const nameInput=document.querySelector('#route-point-name')?.value.trim()||'';
     points.push({name:nameInput||addrInput||'Ponto '+(points.length+1),address:addrInput,lat:e.latlng.lat,lng:e.latlng.lng});
     redraw();
    });
   }
   const addrField=document.querySelector('#route-point-address');
   if(addrField&&!addrField.dataset.bound){
    addrField.dataset.bound='true';
    addrField.addEventListener('input',()=>{
     clearTimeout(addressDebounce);
     const q=addrField.value.trim();
     if(q.length<3){
      const box=document.querySelector('#route-address-suggestions');
      if(box){box.hidden=true;box.innerHTML='';}
      return;
     }
     addressDebounce=setTimeout(()=>void runAddressSearch(q),260);
    });
   }
  }
 }
 async function runAddressSearch(query){
  const box=document.querySelector('#route-address-suggestions');
  if(!box)return [];
  const q=String(query??document.querySelector('#route-point-address')?.value??'').trim();
  if(q.length<3){notify('Digite pelo menos 3 caracteres do endereço.');return [];}
  if(addressAbort)addressAbort.abort();
  addressAbort=new AbortController();
  box.hidden=false;
  box.innerHTML='<small class="muted">Buscando endereços…</small>';
  try{
   const focus=searchFocus(null,draftMap)||{lat:-20.14030,lng:-44.88400};
   const items=await searchPlacesWithLearned(q,{focus,limit:6,signal:addressAbort.signal});
   addressResults=items||[];
   if(!addressResults.length){
    box.innerHTML='<small class="muted">Nenhum endereço encontrado automaticamente. Você pode tocar no mapa ou informar latitude/longitude.</small>';
    return [];
   }
   box.innerHTML=addressResults.map((p,i)=>'<button type="button" data-route-address-option="'+i+'" style="display:flex;justify-content:space-between;align-items:center;text-align:left;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#f8fafc;gap:8px;"><span><strong style="display:block;font-size:13px;">'+esc(p.name)+'</strong><small style="color:#94a3b8;font-size:11.5px;">'+esc(p.address||'Endereço localizado')+'</small></span><span style="font-size:11px;color:#cbd5e1;white-space:nowrap;">'+(p.distanceMeters?esc(distanceLabel(p.distanceMeters)):'Selecionar')+'</span></button>').join('');
   return addressResults;
  }catch(err){
   if(err?.name!=='AbortError')box.innerHTML='<small class="muted">Busca de endereço indisponível no momento.</small>';
   return [];
  }
 }
 async function click(button){
  if(!canEdit()&&button.matches('[data-route-create],[data-route-edit],[data-route-remove],[data-route-add],[data-route-cancel],[data-route-search-address],[data-route-address-option]'))return true;
  if(button.hasAttribute('data-route-search-address')){
   await runAddressSearch();
   return true;
  }
  if(button.hasAttribute('data-route-address-option')){
   const idx=Number(button.dataset.routeAddressOption);
   const chosen=addressResults[idx];
   if(chosen&&Number.isFinite(chosen.lat)&&Number.isFinite(chosen.lng)){
    recordLearnedPlace({name:chosen.name,address:chosen.address||chosen.name,lat:chosen.lat,lng:chosen.lng});
    const nameEl=document.querySelector('#route-point-name');
    const addrEl=document.querySelector('#route-point-address');
    const latEl=document.querySelector('#route-point-lat');
    const lngEl=document.querySelector('#route-point-lng');
    const box=document.querySelector('#route-address-suggestions');
    if(nameEl&&!nameEl.value.trim())nameEl.value=chosen.name;
    if(addrEl)addrEl.value=chosen.address||chosen.name;
    if(latEl)latEl.value=String(chosen.lat);
    if(lngEl)lngEl.value=String(chosen.lng);
    if(box)box.hidden=true;
    if(draftMap){try{draftMap.setView([chosen.lat,chosen.lng],17);}catch{}}
    notify('Endereço selecionado: '+chosen.name+'. Clique em "+ Adicionar ponto à rota" para confirmar.');
   }
   return true;
  }
  if(button.hasAttribute('data-route-create')){
   if(!chosenWorker())return true;
   editor=true;editing=null;points=[];redraw();document.querySelector('#route-editor')?.scrollIntoView({block:'start',behavior:'smooth'});return true;
  }
  if(button.hasAttribute('data-route-cancel')){editor=false;editing=null;points=[];redraw();return true;}
  if(button.hasAttribute('data-route-edit')){
   const {routes}=getContext(),route=routes.find(x=>x.id===button.dataset.routeEdit);
   if(!route)return true;
   watcher=route.userId;editing=route;points=route.points.map(x=>({...x}));editor=true;redraw();document.querySelector('#route-editor')?.scrollIntoView({block:'start',behavior:'smooth'});return true;
  }
  if(button.hasAttribute('data-route-remove')){
   const index=Number(button.dataset.routeRemove);if(Number.isInteger(index)&&index>=0&&index<points.length)points.splice(index,1);
   redraw();return true;
  }
  if(button.hasAttribute('data-route-add')){
   const addrVal=document.querySelector('#route-point-address')?.value.trim()||'';
   let name=document.querySelector('#route-point-name')?.value.trim()||addrVal||'Ponto '+(points.length+1);
   let latRaw=document.querySelector('#route-point-lat')?.value;
   let lngRaw=document.querySelector('#route-point-lng')?.value;
   let lat=Number(latRaw),lng=Number(lngRaw);
   if((!latRaw||!lngRaw||!Number.isFinite(lat)||!Number.isFinite(lng))&&addrVal.length>=3){
    const found=await runAddressSearch(addrVal);
    if(found.length&&Number.isFinite(found[0].lat)&&Number.isFinite(found[0].lng)){
     lat=found[0].lat;lng=found[0].lng;latRaw=String(lat);lngRaw=String(lng);
     if(!document.querySelector('#route-point-name')?.value.trim())name=found[0].name||addrVal;
     recordLearnedPlace({name:found[0].name||name,address:found[0].address||addrVal,lat,lng});
    }
   }
   if(!latRaw||!lngRaw||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){
    notify('Busque e selecione um endereço válido ou informe as coordenadas do ponto.');return true;
   }
   points.push({name:name.slice(0,100),address:addrVal.slice(0,250),lat,lng});
   redraw();return true;
  }
  if(button.hasAttribute('data-route-events')){
   const details=document.querySelector('[data-route-timeline="'+button.dataset.routeEvents+'"]');
   if(details){details.open=!details.open;details.scrollIntoView({block:'nearest'});}
   return true;
  }
  return false;
 }
 function change(element){
  if(element.id==='route-worker'){
   watcher=element.value;editing=null;editor=false;points=[];redraw();return true;
  }
  if(element.matches('[data-route-rename]')){
   const i=Number(element.dataset.routeRename);if(points[i])points[i].name=element.value.slice(0,100);return true;
  }
  return false;
 }
 async function submit(form){
  if(!canEdit())throw Error('Somente o COI ou a administração altera rotas.');
  if(form.id!=='route-form')return false;
  const worker=chosenWorker();
  const name=String(new FormData(form).get('name')||'').trim();
  if(!worker||name.length<3||points.length<1||points.some(p=>p.name.trim().length<1)){
   notify('Informe vigia, nome da rota e pelo menos um ponto ou endereço identificado.');return true;
  }
  const scheduled=String(new FormData(form).get('plannedStart')||'').trim();
  const plannedStart=scheduled?Date.parse(scheduled):null;
  if(scheduled&&!Number.isFinite(plannedStart))throw Error('Data e horário de início inválidos.');
  const data={userId:worker.id,name,points,plannedStart};
  const routeId=editing?.id;
  await api(routeId?'/routes/'+routeId:'/routes',{method:routeId?'PUT':'POST',data});
  notify(routeId?'Rota atualizada no servidor.':'Rota cadastrada para '+worker.name+'.');
  editor=false;editing=null;points=[];await redraw(true);return true;
 }
 return {render,mount,resetMaps,click,change,submit};
}