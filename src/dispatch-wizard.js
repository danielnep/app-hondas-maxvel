import {loadLeaflet} from './map.js';
/** Despacho compacto por etapas. O backend continua sendo a autoridade da operação. */
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createDispatchWizard({dialog,showDialog,getWorkers,getPlaces=()=>[],request,refresh,redraw,notify}){
 let locationPoint=null,previewMap=null,previewMarker=null,searchController=null,searchTimer=null;
 const names=['Profissional','Destino','Orientações','Revisão'];
 function open(){
  const workers=getWorkers().filter(w=>w.role==='ronda'&&w.active);
  const options=workers.map(w=>'<option value="'+escape(w.id)+'">'+escape(w.name)+'</option>').join('');
  showDialog('<section class="rp-dispatch-wizard" aria-label="Solicitar início de ronda">'+
   '<header class="rp-dispatch-head"><div class="rp-dispatch-kicker"><span>GRUPO MAXVEL</span><span>OPERAÇÃO DE CAMPO</span></div>'+
   '<h2>Solicitar início de ronda</h2><p>Envie a solicitação em quatro passos. O vigia responsável inicia após recebê-la.</p></header>'+
   '<nav class="rp-dispatch-steps" aria-label="Etapas do despacho">'+names.map((n,i)=>'<span data-dispatch-progress="'+(i+1)+'" '+(i===0?'aria-current="step"':'')+'><b>'+String(i+1).padStart(2,'0')+'</b><small>'+n+'</small></span>').join('')+'</nav>'+
   '<form id="live-dispatch-form" class="rp-dispatch-form" data-step="1" novalidate>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="1"><span class="rp-dispatch-counter">01 / 04 · EQUIPE</span><h3>Quem fará a ronda?</h3>'+
   '<label for="rp-dispatch-worker">Vigia responsável<select id="rp-dispatch-worker" name="workerId" required><option value="">Selecione o profissional</option>'+options+'</select></label>'+
   '<p>O vigia receberá a solicitação na área de Ronda.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="2" hidden><span class="rp-dispatch-counter">02 / 04 · DESTINO</span><h3>Onde será a ronda?</h3>'+
   '<label for="rp-dispatch-address">Local ou endereço<input id="rp-dispatch-address" name="address" required minlength="5" maxlength="350" autocomplete="street-address" placeholder="Rua, número, bairro e cidade"></label>'+
   '<div id="rp-dispatch-suggestions" class="rp-plan-suggestions" role="listbox" aria-label="Locais encontrados"></div>'+
   '<div id="rp-dispatch-preview-map" class="rp-plan-map" role="img" aria-label="Mapa do local escolhido">O mapa mostrará o endereço encontrado.</div>'+
   '<p id="rp-dispatch-location-status" class="rp-dispatch-location-status">Pesquise e selecione o endereço para confirmar no mapa.</p>'+
   '<input type="hidden" name="latitude"><input type="hidden" name="longitude">'+
   '<p>Confirme o endereço no mapa para orientar o vigia.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="3" hidden><span class="rp-dispatch-counter">03 / 04 · INSTRUÇÕES</span><h3>Quais são as orientações para a ronda?</h3>'+
   '<label for="rp-dispatch-reason">Motivo e orientações<textarea id="rp-dispatch-reason" name="reason" required minlength="10" maxlength="1000" rows="3" placeholder="Descreva o motivo e as orientações para a ronda"></textarea></label>'+
   '<p>Instruções objetivas deixam o atendimento mais rápido.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="4" hidden><span class="rp-dispatch-counter">04 / 04 · CONFERÊNCIA</span><h3>Revise a solicitação</h3>'+
   '<dl class="rp-dispatch-review"><div><dt>Vigia</dt><dd data-dispatch-summary="worker"></dd></div><div><dt>Destino</dt><dd data-dispatch-summary="address"></dd></div><div><dt>Instruções</dt><dd data-dispatch-summary="reason"></dd></div></dl></section>'+
   '<p class="rp-dispatch-error" role="alert" hidden></p>'+
   '<footer class="rp-dispatch-actions"><button type="button" class="rp-dispatch-back" data-action="dispatch-back" hidden>Voltar</button>'+
   '<button type="button" class="rp-dispatch-next" data-action="dispatch-next" '+(!workers.length?'disabled':'')+'>Próximo <span aria-hidden="true">→</span></button>'+
   '<button type="submit" class="rp-dispatch-submit" hidden>Solicitar ronda <span aria-hidden="true">✓</span></button></footer></form></section>',false,'rp-dispatch-dialog');
  locationPoint=null;
  if(!workers.length){const error=dialog.querySelector('.rp-dispatch-error');error.textContent='Cadastre um vigia ativo antes de solicitar a ronda.';error.hidden=false;}
  const input=dialog.querySelector('#rp-dispatch-address');
  if(input)input.addEventListener('input',()=>scheduleLocation(input.value));
 }

 function clearPreview(){
  if(searchController)searchController.abort();
  clearTimeout(searchTimer);
  previewMap?.remove();previewMap=null;previewMarker=null;
 }
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 function registered(){
  const points=[];
  for(const r of getPlaces()||[])for(const p of r.points||[]){
   if(valid(p))points.push({name:p.name||p.address||'Ponto',address:p.address||p.name||'Ponto',lat:p.lat,lng:p.lng});
  }
  return points.slice(0,40);
 }
 async function showPreview(point){
  if(!valid(point))return;
  const host=dialog.querySelector('#rp-dispatch-preview-map');
  if(!host)return;
  try{
   const L=await loadLeaflet();if(!host.isConnected)return;
   if(!previewMap){
    host.textContent='';
    previewMap=L.map(host,{scrollWheelZoom:false}).setView([point.lat,point.lng],15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(previewMap);
   }
   if(previewMarker)previewMarker.remove();
   previewMarker=L.marker([point.lat,point.lng]).addTo(previewMap).bindPopup(escape(point.address||point.name));
   previewMap.setView([point.lat,point.lng],15,{animate:false});
   setTimeout(()=>{if(host.isConnected)previewMap?.invalidateSize()},90);
  }catch{host.textContent='Cartografia indisponível. O endereço continua identificado na pesquisa.';}
 }
 function selectPoint(point){
  if(!valid(point))return;
  locationPoint=point;
  const field=dialog.querySelector('#rp-dispatch-address');
  if(field)field.value=String(point.address||point.name).slice(0,350);
  dialog.querySelector('[name="latitude"]').value=point.lat;
  dialog.querySelector('[name="longitude"]').value=point.lng;
  const list=dialog.querySelector('#rp-dispatch-suggestions');if(list)list.textContent='';
  const status=dialog.querySelector('#rp-dispatch-location-status');
  if(status)status.textContent='Local confirmado no mapa. Você pode continuar.';
  void showPreview(point);
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
  const a=dialog.querySelector('[name="latitude"]'),b=dialog.querySelector('[name="longitude"]');
  if(a)a.value='';if(b)b.value='';
  const status=dialog.querySelector('#rp-dispatch-location-status');
  if(value.trim().length<3){displaySuggestions(registered().slice(0,8));if(status)status.textContent='Escolha um ponto cadastrado ou pesquise o endereço.';return;}
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
  if(n===2){const address=form.querySelector('#rp-dispatch-address');scheduleLocation(address?.value||'');}
  if(n===4){
   const worker=form.querySelector('[name="workerId"]');
   const payload=new FormData(form);
   for(const [key,value] of [['worker',worker.selectedOptions[0]?.textContent],['address',payload.get('address')],['reason',payload.get('reason')]]){
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
   if(!field?.checkValidity()){step(index);field.reportValidity();return true;}
  }
  const button=form.querySelector('[type="submit"]');if(button.disabled)return true;
  button.disabled=true;button.textContent='Enviando…';
  const data=Object.fromEntries(new FormData(form));
  if(!locationPoint){step(2);notify('Confirme o endereço selecionando um ponto no mapa antes de enviar.');button.disabled=false;button.textContent='Solicitar ronda ✓';return true;}
  try{
   await request('/dispatches',{method:'POST',data:{...data,latitude:locationPoint.lat,longitude:locationPoint.lng,kind:'ronda'}});
   dialog.close();clearPreview();await refresh();redraw();notify('Solicitação de ronda enviada ao vigia, com localização confirmada no mapa.');
  }catch(error){
   button.disabled=false;button.textContent='Solicitar ronda ✓';
   const message=form.querySelector('.rp-dispatch-error');message.textContent=error.message||'Não foi possível despachar.';message.hidden=false;notify(message.textContent);
  }
  return true;
 }
 return {open,step,submit};
}
