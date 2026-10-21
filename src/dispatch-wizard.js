import {loadLeaflet} from './map.js';
/** Despacho compacto por etapas. O backend continua sendo a autoridade da operação. */
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createDispatchWizard({dialog,showDialog,getWorkers,getPlaces=()=>[],request,refresh,redraw,notify}){
 let locationPoint=null,destinations=[],previewMap=null,previewLayers=[],previewEpoch=0,searchController=null,searchTimer=null;
 dialog.addEventListener('close',()=>clearPreview());
 const names=['Profissional','Destino','Orientações','Revisão'];
 function open(){
  clearPreview();destinations=[];locationPoint=null;
  const workers=getWorkers().filter(w=>w.role==='ronda'&&w.active);
  const options=workers.map(w=>'<option value="'+escape(w.id)+'">'+escape(w.name)+'</option>').join('');
  showDialog('<section class="rp-dispatch-wizard" aria-label="Solicitar início de ronda">'+
   '<header class="rp-dispatch-head"><div class="rp-dispatch-kicker"><span>GRUPO MAXVEL</span><span>OPERAÇÃO DE CAMPO</span></div>'+
   '<h2 id="rp-dispatch-title">Solicitar início de ronda</h2><p>Envie a solicitação em quatro passos. O vigia responsável inicia após recebê-la.</p></header>'+
   '<nav class="rp-dispatch-steps" aria-label="Etapas do despacho">'+names.map((n,i)=>'<span data-dispatch-progress="'+(i+1)+'" '+(i===0?'aria-current="step"':'')+'><b>'+String(i+1).padStart(2,'0')+'</b><small>'+n+'</small></span>').join('')+'</nav>'+
   '<form id="live-dispatch-form" class="rp-dispatch-form" data-step="1" novalidate>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="1"><span class="rp-dispatch-counter">01 / 04 · EQUIPE</span><h3>Quem fará a ronda?</h3>'+
   '<label for="rp-dispatch-worker">Vigia responsável<select id="rp-dispatch-worker" name="workerId" required><option value="">Selecione o profissional</option>'+options+'</select></label>'+
   '<p>O vigia receberá a solicitação na área de Ronda.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="2" hidden><span class="rp-dispatch-counter">02 / 04 · DESTINOS</span><h3>Por quais lugares o vigia passará?</h3>'+
   '<label for="rp-dispatch-address">Pesquisar próximo destino<input id="rp-dispatch-address" name="address" minlength="5" maxlength="350" autocomplete="off" placeholder="Rua, número, bairro e cidade"></label>'+
   '<div id="rp-dispatch-suggestions" class="rp-plan-suggestions" role="listbox" aria-label="Locais encontrados"></div>'+
   '<div id="rp-dispatch-preview-map" class="rp-plan-map" aria-label="Mapa dos destinos da ronda">O mapa mostrará os endereços escolhidos.</div>'+
   '<p id="rp-dispatch-location-status" class="rp-dispatch-location-status" role="status" aria-live="polite">Pesquise um endereço, selecione o resultado e confira no mapa.</p>'+ '<button type="button" id="rp-dispatch-add-destination" class="rp-dispatch-add" disabled>+ Adicionar destino</button>'+ '<div class="rp-dispatch-stops-heading"><strong>Destinos da ronda (<span id="rp-dispatch-stop-count">0</span>/12)</strong><small>Na ordem em que o vigia deverá visitar</small></div>'+ '<ol id="rp-dispatch-stops" class="rp-dispatch-stops" aria-label="Destinos confirmados"></ol>'+
   '<input type="hidden" name="latitude"><input type="hidden" name="longitude">'+
   '<p>Confira o marcador e toque em Adicionar destino. Você pode incluir até 12 locais.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="3" hidden><span class="rp-dispatch-counter">03 / 04 · INSTRUÇÕES</span><h3>Quais são as orientações para a ronda?</h3>'+
   '<label for="rp-dispatch-reason">Motivo e orientações<textarea id="rp-dispatch-reason" name="reason" required minlength="10" maxlength="1000" rows="3" placeholder="Descreva o motivo e as orientações para a ronda"></textarea></label>'+
   '<p>Instruções objetivas deixam o atendimento mais rápido.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="4" hidden><span class="rp-dispatch-counter">04 / 04 · CONFERÊNCIA</span><h3>Revise a solicitação</h3>'+
   '<dl class="rp-dispatch-review"><div><dt>Vigia</dt><dd data-dispatch-summary="worker"></dd></div><div><dt>Destinos</dt><dd data-dispatch-summary="address"></dd></div><div><dt>Instruções</dt><dd data-dispatch-summary="reason"></dd></div></dl></section>'+
   '<p class="rp-dispatch-error" role="alert" hidden></p>'+
   '<footer class="rp-dispatch-actions"><button type="button" class="rp-dispatch-back" data-action="dispatch-back" hidden>Voltar</button>'+
   '<button type="button" class="rp-dispatch-next" data-action="dispatch-next" '+(!workers.length?'disabled':'')+'>Próximo <span aria-hidden="true">→</span></button>'+
   '<button type="submit" class="rp-dispatch-submit" hidden>Solicitar ronda <span aria-hidden="true">✓</span></button></footer></form></section>',false,'rp-dispatch-dialog');
  dialog.setAttribute('aria-labelledby','rp-dispatch-title');
  dialog.setAttribute('aria-modal','true');
  locationPoint=null;
  dialog.querySelector('#rp-dispatch-worker')?.focus({preventScroll:true});
  if(!workers.length){const error=dialog.querySelector('.rp-dispatch-error');error.textContent='Cadastre um vigia ativo antes de solicitar a ronda.';error.hidden=false;}
  const input=dialog.querySelector('#rp-dispatch-address');
  if(input)input.addEventListener('input',()=>scheduleLocation(input.value));
  dialog.querySelector('#rp-dispatch-add-destination')?.addEventListener('click',addDestination);
  dialog.querySelector('#rp-dispatch-stops')?.addEventListener('click',event=>{
   const button=event.target.closest('[data-dispatch-remove],[data-dispatch-up],[data-dispatch-down],[data-dispatch-focus]');if(!button)return;
   const index=Number(button.dataset.dispatchRemove??button.dataset.dispatchUp??button.dataset.dispatchDown??button.dataset.dispatchFocus);
   if(!Number.isInteger(index)||index<0||index>=destinations.length)return;
   if(button.hasAttribute('data-dispatch-remove'))destinations.splice(index,1);
   if(button.hasAttribute('data-dispatch-up')&&index>0)[destinations[index-1],destinations[index]]=[destinations[index],destinations[index-1]];
   if(button.hasAttribute('data-dispatch-down')&&index<destinations.length-1)[destinations[index],destinations[index+1]]=[destinations[index+1],destinations[index]];
   renderDestinations();void showPreview(destinations[index]||destinations[0]);
  });
  renderDestinations();
 }

 function clearPreview(){
  if(searchController)searchController.abort();
  clearTimeout(searchTimer);
  previewEpoch++;
  previewLayers=[];previewMap?.remove();previewMap=null;
 }
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 function registered(){
  const points=[];
  for(const r of getPlaces()||[])for(const p of r.points||[]){
   if(valid(p))points.push({name:p.name||p.address||'Ponto',address:p.address||p.name||'Ponto',lat:p.lat,lng:p.lng});
  }
  return points.slice(0,40);
 }

 function tileFor(point){
  const z=14,n=2**z,lat=Math.max(-85.0511,Math.min(85.0511,point.lat));
  const x=(point.lng+180)/360*n,y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;
  const xt=Math.floor(x),yt=Math.floor(y),offsetX=Math.round((x-xt)*256),offsetY=Math.round((y-yt)*256);
  return {url:'https://tile.openstreetmap.org/'+z+'/'+xt+'/'+yt+'.png',left:43-offsetX,top:30-offsetY};
 }
 function renderDestinations(){
  const host=dialog.querySelector('#rp-dispatch-stops'),count=dialog.querySelector('#rp-dispatch-stop-count');
  if(!host)return;
  if(count)count.textContent=String(destinations.length);
  host.innerHTML=destinations.map((p,i)=>{
   const tile=tileFor(p),location='https://www.openstreetmap.org/?mlat='+p.lat+'&mlon='+p.lng+'#map=17/'+p.lat+'/'+p.lng;
   return '<li class="rp-dispatch-stop"><button type="button" class="rp-dispatch-stop-mini" data-dispatch-focus="'+i+'" aria-label="Mostrar destino '+(i+1)+' no mapa"><img loading="lazy" alt="" src="'+tile.url+'" style="left:'+tile.left+'px;top:'+tile.top+'px"><b class="rp-dispatch-mini-marker" aria-hidden="true">'+(i+1)+'</b></button>'+
    '<div class="rp-dispatch-stop-label"><strong>'+(i+1)+'. '+escape(p.name||p.address)+'</strong><small>'+escape(p.address)+'</small><a href="'+location+'" target="_blank" rel="noopener noreferrer">Ver no OpenStreetMap ↗</a></div>'+
    '<div class="rp-dispatch-stop-tools"><button type="button" data-dispatch-up="'+i+'" '+(!i?'disabled':'')+' aria-label="Subir destino '+(i+1)+'">↑</button><button type="button" data-dispatch-down="'+i+'" '+(i===destinations.length-1?'disabled':'')+' aria-label="Descer destino '+(i+1)+'">↓</button><button type="button" data-dispatch-remove="'+i+'" aria-label="Remover destino '+(i+1)+'">×</button></div></li>';
  }).join('')||'<li class="rp-dispatch-stop-empty">Nenhum destino incluído.</li>';
 }
 function fallbackPreview(point){
  const host=dialog.querySelector('#rp-dispatch-preview-map');if(!host||!valid(point))return;
  if(previewMap){previewMap.remove();previewMap=null;}
  const box=0.008,lat=point.lat,lng=point.lng;
  const url='https://www.openstreetmap.org/export/embed.html?bbox='+[lng-box,lat-box,lng+box,lat+box].join('%2C')+'&layer=mapnik&marker='+lat+'%2C'+lng;
  host.innerHTML='<iframe title="Mapa do OpenStreetMap" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="'+url+'"></iframe>'+
   '<a class="rp-dispatch-map-link" href="https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=16/'+lat+'/'+lng+'" target="_blank" rel="noopener noreferrer">Abrir mapa completo ↗</a>';
 }
 async function showPreview(point=null){
  const host=dialog.querySelector('#rp-dispatch-preview-map');if(!host)return;
  const focus=valid(point)?point:locationPoint||destinations.at(-1);
  if(!valid(focus))return;
  const epoch=++previewEpoch;
  if(!previewMap)fallbackPreview(focus); // Mapas de contingência aparecem sem esperar pelo CDN do Leaflet.
  try{
   const L=await loadLeaflet();if(epoch!==previewEpoch||!host.isConnected)return;
   if(!previewMap){
    host.textContent='';
    previewMap=L.map(host,{scrollWheelZoom:false,zoomControl:true}).setView([focus.lat,focus.lng],15);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19});
    let failures=0;
    tiles.on('tileerror',()=>{if(++failures>=3&&epoch===previewEpoch)fallbackPreview(focus)});
    tiles.addTo(previewMap);
   }
   for(const layer of previewLayers)previewMap.removeLayer(layer);
   previewLayers=[];
   const line=destinations.map(p=>[p.lat,p.lng]);
   if(line.length>1)previewLayers.push(L.polyline(line,{color:'#65c7f4',weight:4,opacity:.95}).addTo(previewMap));
   destinations.forEach((p,i)=>{
    previewLayers.push(L.marker([p.lat,p.lng]).addTo(previewMap).bindPopup(escape((i+1)+'. '+p.address)));
   });
   if(locationPoint&&valid(locationPoint))previewLayers.push(L.circleMarker([locationPoint.lat,locationPoint.lng],{radius:10,color:'#fff',weight:2,fillColor:'#e53c56',fillOpacity:.95}).addTo(previewMap).bindTooltip('Próximo destino · confirme para adicionar'));
   if(line.length>1)previewMap.fitBounds(L.latLngBounds([...line,[focus.lat,focus.lng]]).pad(.18),{maxZoom:16,animate:false});
   else previewMap.setView([focus.lat,focus.lng],15,{animate:false});
   setTimeout(()=>{if(epoch===previewEpoch&&host.isConnected)previewMap?.invalidateSize()},160);
  }catch(error){
   if(epoch!==previewEpoch||!host.isConnected)return;
   fallbackPreview(focus);
   const status=dialog.querySelector('#rp-dispatch-location-status');
   if(status)status.textContent='O mapa interativo não carregou. Abrimos o OpenStreetMap alternativo; os endereços continuam disponíveis.';
  }
 }
 function selectPoint(point){
  if(!valid(point))return;
  locationPoint=point;
  const field=dialog.querySelector('#rp-dispatch-address');
  if(field)field.value=String(point.address||point.name).slice(0,350);
  const list=dialog.querySelector('#rp-dispatch-suggestions');if(list)list.textContent='';
  const status=dialog.querySelector('#rp-dispatch-location-status');
  if(status)status.textContent='Ponto localizado. Confira no mapa e toque em Adicionar destino.';
  const add=dialog.querySelector('#rp-dispatch-add-destination');if(add)add.disabled=destinations.length>=12;
  void showPreview(point);
 }
 function addDestination(){
  if(!valid(locationPoint)||destinations.length>=12)return;
  const point={name:String(locationPoint.name||locationPoint.address).slice(0,100),address:String(locationPoint.address||locationPoint.name).slice(0,350),lat:locationPoint.lat,lng:locationPoint.lng};
  if(destinations.some(p=>p.address===point.address&&p.lat===point.lat&&p.lng===point.lng)){
   const status=dialog.querySelector('#rp-dispatch-location-status');if(status)status.textContent='Este endereço já está na lista.';return;
  }
  destinations.push(point);locationPoint=null;
  const field=dialog.querySelector('#rp-dispatch-address');if(field)field.value='';
  const add=dialog.querySelector('#rp-dispatch-add-destination');if(add)add.disabled=true;
  renderDestinations();
  displaySuggestions([]);
  const status=dialog.querySelector('#rp-dispatch-location-status');
  if(status)status.textContent=destinations.length+' '+(destinations.length===1?'destino confirmado':'destinos confirmados')+'. '+(destinations.length<12?'Pesquise mais um ou prossiga.':'Limite de 12 destinos atingido.');
  void showPreview(point);
  field?.focus({preventScroll:true});
 }
 function displaySuggestions(items){
  const host=dialog.querySelector('#rp-dispatch-suggestions');if(!host)return;
  host.textContent='';
  for(const point of items.slice(0,8)){
   if(!valid(point))continue;
   const button=document.createElement('button');button.type='button';
   button.setAttribute('role','option');button.className='rp-dispatch-location-choice';
   const strong=document.createElement('strong');strong.textContent=point.name||'Ponto encontrado';
   const small=document.createElement('small');small.textContent=point.address||'Local encontrado';
   button.append(strong,small);
   button.addEventListener('click',()=>selectPoint(point));host.append(button);
  }
 }
 function scheduleLocation(value){
  if(searchController)searchController.abort();clearTimeout(searchTimer);
  locationPoint=null;
  const add=dialog.querySelector('#rp-dispatch-add-destination');if(add)add.disabled=true;
  const a=dialog.querySelector('[name="latitude"]'),b=dialog.querySelector('[name="longitude"]');
  if(a)a.value='';if(b)b.value='';
  const status=dialog.querySelector('#rp-dispatch-location-status');
  if(value.trim().length<3){displaySuggestions(registered().slice(0,8));if(status)status.textContent='Escolha um ponto cadastrado ou pesquise o próximo endereço.';if(destinations.length)void showPreview(destinations.at(-1));return;}
  const known=registered().filter(p=>(p.name+' '+p.address).toLocaleLowerCase('pt-BR').includes(value.trim().toLocaleLowerCase('pt-BR')));
  displaySuggestions(known);
  if(status)status.textContent='Localizando o endereço para mostrar no mapa...';
  searchTimer=setTimeout(async()=>{
   const controller=new AbortController();searchController=controller;
   try{
    const response=await fetch('https://photon.komoot.io/api/?lang=pt&limit=6&q='+encodeURIComponent(value.trim()),{signal:controller.signal});
    if(!response.ok)throw Error('Pesquisa de endereço indisponível');
    const data=await response.json();
    if(controller.signal.aborted)return;
    const found=(data.features||[]).map(f=>{
     const props=f.properties||{},coords=f.geometry?.coordinates||[];
     return {name:String(props.name||props.street||'Local'),address:[props.street,props.housenumber,props.city,props.state].filter(Boolean).join(', ')||String(props.name||value),
      lat:Number(coords[1]),lng:Number(coords[0])};
    }).filter(valid);
    displaySuggestions([...known,...found]);
    if(found.length){void showPreview(found[0]);if(status)status.textContent='Confira o ponto encontrado no mapa e toque no endereço correto.';}
    else if(status)status.textContent='Nenhum resultado encontrado. Experimente rua, número, bairro e cidade.';
   }catch(e){if(!controller.signal.aborted&&status)status.textContent='Não foi possível consultar endereços agora. Tente novamente.';}
  },650);
 }

 function step(next){
  const form=dialog.querySelector('#live-dispatch-form');if(!form)return;
  const current=Number(form.dataset.step)||1;
  if(next>current){
   const control=form.querySelector('[data-dispatch-stage="'+current+'"] select,[data-dispatch-stage="'+current+'"] input,[data-dispatch-stage="'+current+'"] textarea');
   if(control&&!control.checkValidity()){control.setAttribute('aria-invalid','true');control.reportValidity();control.focus();return;}
   control?.removeAttribute('aria-invalid');
  }
  if(current===2&&next>current&&!destinations.length){const status=dialog.querySelector('#rp-dispatch-location-status');if(status)status.textContent='Adicione pelo menos um destino antes de continuar.';form.querySelector('#rp-dispatch-address')?.focus();return;}
  const n=Math.max(1,Math.min(4,next));form.dataset.step=String(n);
  for(const panel of form.querySelectorAll('[data-dispatch-stage]'))panel.hidden=Number(panel.dataset.dispatchStage)!==n;
  for(const item of dialog.querySelectorAll('[data-dispatch-progress]')){
   const value=Number(item.dataset.dispatchProgress);item.removeAttribute('aria-current');
   if(value===n)item.setAttribute('aria-current','step');
   item.classList.toggle('is-complete',value<n);
  }
  form.querySelector('[data-action="dispatch-back"]').hidden=n===1;
  form.querySelector('[data-action="dispatch-next"]').hidden=n===4;
  form.querySelector('[type="submit"]').hidden=n!==4;
  if(n===2){const address=form.querySelector('#rp-dispatch-address');scheduleLocation(address?.value||'');setTimeout(()=>{if(previewMap?.invalidateSize)previewMap.invalidateSize()},120);}
  if(n===4){
   const worker=form.querySelector('[name="workerId"]');
   const payload=new FormData(form);
   for(const [key,value] of [['worker',worker.selectedOptions[0]?.textContent],['address',destinations.map((p,i)=>(i+1)+'. '+p.address).join('\n')],['reason',payload.get('reason')]]){
    const node=form.querySelector('[data-dispatch-summary="'+key+'"]');if(node)node.textContent=String(value||'');
   }
  }
  form.querySelector('[data-dispatch-stage="'+n+'"] :is(select,input,textarea,h3)')?.focus({preventScroll:true});
 }
 async function submit(form){
  if(form.id!=='live-dispatch-form')return false;
  if(form.dataset.step!=='4')return true;
  for(const [index,key] of [[1,'workerId'],[2,'address'],[3,'reason']]){
   const field=form.elements.namedItem(key);
   if(key==='address'){if(!destinations.length){step(2);notify('Adicione ao menos um destino.');return true;}continue;}
   if(!field?.checkValidity()){step(index);field.reportValidity();return true;}
  }
  const button=form.querySelector('[type="submit"]');if(button.disabled)return true;
  button.disabled=true;button.textContent='Enviando…';
  const data=Object.fromEntries(new FormData(form));
  if(!destinations.length){step(2);notify('Adicione ao menos um destino pela pesquisa e pelo mapa.');button.disabled=false;button.textContent='Solicitar ronda ✓';return true;}
  try{
   const first=destinations[0];
   await request('/dispatches',{method:'POST',data:{...data,address:first.address,latitude:first.lat,longitude:first.lng,routePoints:destinations.map(p=>({lat:p.lat,lng:p.lng,label:p.address.slice(0,70)})),kind:'ronda'}});
   dialog.close();clearPreview();await refresh();redraw();notify('Ronda enviada ao vigia com '+destinations.length+' '+(destinations.length===1?'destino':'destinos')+' confirmados.');
  }catch(error){
   button.disabled=false;button.textContent='Solicitar ronda ✓';
   const message=form.querySelector('.rp-dispatch-error');message.textContent=error.message||'Não foi possível despachar.';message.hidden=false;notify(message.textContent);
  }
  return true;
 }
 return {open,step,submit};
}
