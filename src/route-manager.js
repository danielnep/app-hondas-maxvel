/* Planejamento e monitoramento de rotas da Central. Dados reais apenas quando sincronizados. */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dt=n=>n?new Date(n).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não disponível';
const isFix=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);
const cleanTrack=rows=>(Array.isArray(rows)?rows:[]).filter(isFix).slice(-1200);
const confirmed=round=>round.status==='em_andamento'&&round.lastFixAt&&Date.now()-round.lastFixAt<60000;
const badge=r=>r.status==='em_andamento'?(confirmed(r)?'Em andamento · GPS recente':'Em andamento · GPS sem atualização recente'):r.status==='concluida'?'Concluída':r.status==='interrompida'?'Interrompida':r.status==='incompleta'?'Incompleta':'Sem início';
const maps=new Map();
export function clearRouteMaps(){for(const m of maps.values())try{m.remove()}catch{}maps.clear();}
function markerSvg(){return '<span aria-hidden="true">📍</span>';}
function detail(r,route){
 const position=isFix(r.lastFix)?r.lastFix:null;
 return '<div class="route-details">'+
  '<div><small>Rota</small><strong>'+esc(route?.name||'Percurso registrado sem rota planejada')+'</strong></div>'+
  '<div><small>Local / posto</small><strong>'+esc(r.site||route?.site||'Não vinculado')+'</strong></div>'+
  '<div><small>Início</small><strong>'+dt(r.start)+'</strong></div>'+
  '<div><small>Fim</small><strong>'+dt(r.end)+'</strong></div>'+
  '<div><small>Última posição recebida</small><strong>'+dt(r.lastFixAt)+'</strong></div>'+
  '<div><small>Sinal GPS</small><strong>'+esc(r.lastFixAt&&Date.now()-r.lastFixAt<60000?'Recente':r.lastFixAt?'Desatualizado':'Indisponível')+'</strong></div>'+
  '<div><small>Distância percorrida (estimativa)</small><strong>'+Number(r.km||0).toFixed(2)+' km</strong></div>'+
  '<div><small>Pontos / alertas</small><strong>'+Number(r.checkpoints||0)+' pontos · '+Number(r.alerts||0)+' alertas</strong></div>'+
  '<div><small>Bateria mais recente</small><strong>'+esc(r.lastBattery==null?'Não informada':r.lastBattery+'%')+'</strong></div>'+
  '<div><small>Precisão GPS</small><strong>'+esc(position&&Number.isFinite(position.accuracy)?Math.round(position.accuracy)+' m':'Não informada')+'</strong></div>'+
  '</div>';
}
function routeRow(r,planned,i){
 return '<details class="route-record" data-route-details '+(i===0?'open':'')+'>'+
  '<summary><span class="route-record-title"><strong>'+esc(planned?.name||'Ronda '+String(i+1))+'</strong><small>'+dt(r.start)+' · '+esc(badge(r))+'</small></span>'+
  '<span class="route-record-right">'+Number(r.checkpoints||0)+' ponto(s) <span aria-hidden="true">⌄</span></span></summary>'+
  '<div class="route-record-body"><div class="route-map-frame"><div class="route-map" data-route-map="'+esc(r.id)+'" aria-label="Mapa do percurso da ronda">'+markerSvg()+' Carregando mapa da rota…</div>'+
  '<p class="route-map-caption">'+(confirmed(r)?'<span class="route-online"></span> GPS recente · leitura automática de 30 em 30 segundos':'Última posição recebida · não afirmar localização atual sem GPS recente')+'</p></div>'+
  detail(r,planned)+'</div></details>';
}
function plannedRow(route){
 return '<details class="route-record route-planned" data-route-details><summary><span class="route-record-title"><strong>'+esc(route.name)+'</strong><small>'+route.points.length+' pontos planejados · '+esc(route.site)+' · '+dt(route.updatedAt)+'</small></span><span class="route-record-right">Planejada <span aria-hidden="true">⌄</span></span></summary>'+
  '<div class="route-record-body"><div class="route-map-frame"><div class="route-map" data-planned-map="'+esc(route.id)+'">Visualização da rota planejada</div><p class="route-map-caption">Rota planejada. Não representa uma execução comprovada.</p></div>'+
  '<div class="route-details"><div><small>Vigia atribuído</small><strong>'+esc(route.workerName||'Colaborador')+'</strong></div>'+
  '<div><small>Posto</small><strong>'+esc(route.site)+'</strong></div>'+
  '<div class="route-checkpoint-list"><small>Sequência de pontos</small><ol>'+route.points.map(point=>'<li>'+esc(point.name)+'</li>').join('')+'</ol></div>'+
  '<button type="button" data-route-edit="'+esc(route.id)+'">Editar rota</button></div></div></details>';
}
export function routeManagementView({users,rounds,routes,watcherId,editorOpen=false,editingId=''}) {
 const watchers=users.filter(u=>u.role==='ronda'&&u.active!==0);
 const selected=watchers.find(x=>x.id===watcherId)||watchers[0];
 const selectedId=selected?.id||'';
 const mine=rounds.filter(x=>x.userId===selectedId).sort((a,b)=>(b.start||0)-(a.start||0));
 const planned=routes.filter(x=>x.userId===selectedId);
 const active=mine.filter(x=>x.status==='em_andamento'),past=mine.filter(x=>x.status!=='em_andamento');
 return '<section class="stack routes-workspace"><header class="toolbar"><div><div class="eyebrow">ADMINISTRAÇÃO · ROTAS POR COLABORADOR</div>'+
 '<h1>Rotas e acompanhamento</h1><p class="muted">Selecione um vigia, visualize a execução e organize as próximas rotas.</p></div>'+
 '<button class="primary" type="button" data-route-new>+ Criar nova rota para colaborador</button></header>'+
 '<section class="surface route-watcher-bar"><label>Colaborador<select data-route-watcher aria-label="Selecionar colaborador">'+
 watchers.map(w=>'<option value="'+esc(w.id)+'" '+(w.id===selectedId?'selected':'')+'>'+esc(w.name)+' · '+esc(w.site||'Sem posto')+'</option>').join('')+
 '</select></label><div class="route-watcher-meta"><strong>'+esc(selected?.site||'Posto não cadastrado')+'</strong><small>'+active.length+' em andamento · '+past.length+' anteriores · '+planned.length+' planejadas</small></div></section>'+
 (editorOpen?routeForm(watchers,selectedId,routes.find(r=>r.id===editingId)): '')+
 '<section class="route-lists"><div class="route-section-heading"><h2>Em andamento</h2><span>'+active.length+' ronda(s)</span></div>'+
 (active.length?active.map((r,i)=>routeRow(r,routes.find(p=>p.id===r.routeId),i)).join(''):'<div class="surface empty">Nenhuma ronda em andamento para este vigia.</div>')+
 '<div class="route-section-heading"><h2>Últimas rondas</h2><span>'+past.length+' registro(s)</span></div>'+
 (past.length?past.slice(0,30).map((r,i)=>routeRow(r,routes.find(p=>p.id===r.routeId),i)).join(''):'<div class="surface empty">Ainda não há histórico sincronizado.</div>')+
 '<div class="route-section-heading"><h2>Rotas planejadas</h2><span>'+planned.length+' disponíveis</span></div>'+
 (planned.length?planned.map(plannedRow).join(''):'<div class="surface empty">Nenhuma rota cadastrada para este vigia. Use Criar nova rota.</div>')+
 '</section><p class="muted">A execução é registrada pelo aparelho e depende de sincronização com a Central. O mapa distingue rota planejada de GPS realmente recebido.</p></section>';
}
function routeForm(watchers,selectedId,route){
 const points=route?.points?.length?route.points:[{name:'Ponto 1',lat:'',lng:''},{name:'Ponto 2',lat:'',lng:''}];
 return '<form id="route-create-form" class="surface route-form" data-route-id="'+esc(route?.id||'')+'"><div class="toolbar"><div><h2>'+(route?'Editar rota':'Nova rota para colaborador')+'</h2>'+
 '<p class="muted">Escolha o vigia e marque pelo menos dois pontos na sequência. Você pode tocar no mapa para preencher as coordenadas.</p></div>'+
 '<button type="button" data-route-cancel>Fechar</button></div><div class="grid"><label>Vigia<select name="userId" required>'+watchers.map(w=>'<option value="'+esc(w.id)+'" '+(w.id===(route?.userId||selectedId)?'selected':'')+'>'+esc(w.name)+' · '+esc(w.site||'Sem posto')+'</option>').join('')+'</select></label>'+
 '<label>Nome da rota<input name="name" required minlength="3" maxlength="120" placeholder="Ex.: Ronda noturna · Galpão 2" value="'+esc(route?.name||'')+'"></label></div>'+
 '<div class="route-editor-layout"><div class="route-map-frame"><div id="route-picker-map" class="route-map route-picker-map" aria-label="Toque no mapa para posicionar os pontos">Mapa para definir os pontos</div>'+
 '<p class="route-map-caption">Toque no mapa para preencher o próximo ponto sem coordenadas. Ajuste os nomes na lista.</p></div>'+
 '<div><div class="toolbar"><h3>Pontos da rota</h3><button type="button" data-add-route-point>+ Adicionar ponto</button></div>'+
 '<div id="route-point-editor">'+points.map((p,i)=>pointFields(p,i)).join('')+'</div></div></div>'+
 '<div class="toolbar"><span class="muted">Raio operacional padrão: 25 metros por ponto. Ordem obrigatória.</span><button type="submit" class="primary">Salvar rota para o vigia</button></div></form>';
}
export function pointFields(p={},i=0){
 return '<div class="route-point-fields" data-route-point><div class="toolbar"><strong>Ponto '+(i+1)+'</strong><button type="button" data-remove-route-point title="Remover este ponto">Remover</button></div>'+
 '<label>Nome do ponto<input name="pointName" maxlength="100" required value="'+esc(p.name||'')+'" placeholder="Ex.: Portaria principal"></label>'+
 '<div class="route-coordinate-fields"><label>Latitude<input type="number" name="lat" step="any" min="-90" max="90" required placeholder="-20.14" value="'+esc(p.lat??'')+'"></label>'+
 '<label>Longitude<input type="number" name="lng" step="any" min="-180" max="180" required placeholder="-44.88" value="'+esc(p.lng??'')+'"></label></div></div>';
}
export function readRouteForm(form){
 const points=[...form.querySelectorAll('[data-route-point]')].map(item=>({
  name:item.querySelector('[name="pointName"]').value.trim(),lat:Number(item.querySelector('[name="lat"]').value),lng:Number(item.querySelector('[name="lng"]').value)
 }));
 if(points.length<2||points.length>30||points.some((p,i)=>p.name.length<2||
  !itemHasCoords(form.querySelectorAll('[data-route-point]')[i])||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180))
  throw Error('Informe de 2 a 30 pontos com nome e coordenadas válidas.');
 return {userId:form.elements.userId.value,name:form.elements.name.value.trim(),points};
}
function itemHasCoords(row){return Boolean(row.querySelector('[name="lat"]').value.trim()&&row.querySelector('[name="lng"]').value.trim());}
function buildMap(target,points,mode,fix){
 if(!target||!window.L||maps.has(target))return;
 const valid=cleanTrack(points),first=valid[0]||fix||{lat:-20.14,lng:-44.89};
 const map=window.L.map(target,{zoomControl:true,scrollWheelZoom:false}).setView([first.lat,first.lng],valid.length?15:12);
 window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
 maps.set(target,map);
 const coords=valid.map(p=>[p.lat,p.lng]);
 if(coords.length>=2){const line=window.L.polyline(coords,{color:mode==='planned'?'#55c2ec':'#ed465d',weight:4,opacity:.9}).addTo(map);map.fitBounds(line.getBounds(),{padding:[25,25],maxZoom:17});}
 else if(coords.length===1)map.setView(coords[0],16);
 valid.forEach((p,i)=>{if(mode==='planned'||i===0||i===valid.length-1)window.L.circleMarker([p.lat,p.lng],{radius:mode==='planned'?7:5,color:'#fff',fillColor:mode==='planned'?'#55c2ec':'#ed465d',fillOpacity:1,weight:2}).addTo(map).bindPopup(esc(p.name||'Posição GPS '+(i+1)));});
 if(isFix(fix))window.L.marker([fix.lat,fix.lng]).addTo(map).bindPopup('Última posição GPS recebida');
 setTimeout(()=>map.invalidateSize(),80);
 return map;
}
export function mountRouteMaps(rounds=[],routes=[]){
 document.querySelectorAll('[data-route-map]').forEach(el=>{
  const r=rounds.find(x=>x.id===el.dataset.routeMap);if(!r||!el.closest('details')?.open)return;
  const assigned=routes.find(x=>x.id===r.routeId);
  const track=cleanTrack(r.track);
  const pts=track.length?track:assigned?.points||[];
  if(!window.L){el.textContent='Mapa indisponível offline. '+pts.length+' posição(ões) registradas.';return;}
  buildMap(el,pts,track.length?'real':'planned',r.lastFix);
 });
 document.querySelectorAll('[data-planned-map]').forEach(el=>{
  if(!el.closest('details')?.open)return;
  const route=routes.find(r=>r.id===el.dataset.plannedMap);
  if(!window.L){el.textContent='Mapa indisponível offline. Pontos: '+(route?.points.length||0);return;}
  buildMap(el,route?.points||[],'planned',null);
 });
 const editor=document.getElementById('route-picker-map');
 if(editor&&window.L&&!maps.has(editor)){
  const rows=[...document.querySelectorAll('[data-route-point]')];
  const known=rows.map(row=>({lat:Number(row.querySelector('[name=lat]').value),lng:Number(row.querySelector('[name=lng]').value)}))
    .filter((p,i)=>rows[i]?.querySelector('[name=lat]').value!==''&&rows[i]?.querySelector('[name=lng]').value!==''&&isFix(p));
  const m=buildMap(editor,known,'planned',null);
  m?.on('click',e=>{
   const list=[...document.querySelectorAll('[data-route-point]')],empty=list.find(row=>!row.querySelector('[name=lat]').value||!row.querySelector('[name=lng]').value);
   if(!empty){const add=document.querySelector('[data-add-route-point]');add?.click();}
   const target=empty||[...document.querySelectorAll('[data-route-point]')].at(-1);
   if(target){target.querySelector('[name=lat]').value=e.latlng.lat.toFixed(6);target.querySelector('[name=lng]').value=e.latlng.lng.toFixed(6);target.querySelector('[name=pointName]').focus();}
   window.L.circleMarker(e.latlng,{radius:6,color:'#fff',fillColor:'#ed465d',fillOpacity:1}).addTo(m);
  });
 }
}
