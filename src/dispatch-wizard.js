/** Despacho compacto por etapas. O backend continua sendo a autoridade da operação. */
import {searchAddress,createPointMap} from './geo-tools.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createDispatchWizard({dialog,showDialog,getWorkers,request,refresh,redraw,notify}){
 const names=['Profissional','Destino','Orientações','Revisão'];
 let selectedLocation=null;
 let savedPoints=[],results=[],map=null,lookupSerial=0;
 async function loadPoints(){
  try{const response=await request('/saved-points');savedPoints=(response.points||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)));
   const node=dialog.querySelector('#rp-dispatch-saved');
   if(node)node.innerHTML='<option value="">Pesquisar novo endereço</option>'+savedPoints.map((p,i)=>'<option value="'+i+'">'+escape(p.name)+'</option>').join('');
  }catch{const label=dialog.querySelector('#rp-dispatch-map-status');if(label)label.textContent='Pesquise o endereço; pontos salvos indisponíveis.';}
 }
 function open(){
  const workers=getWorkers().filter(w=>w.role==='ronda'&&w.active);
  const options=workers.map(w=>'<option value="'+escape(w.id)+'">'+escape(w.name)+'</option>').join('');
  showDialog('<section class="rp-dispatch-wizard" aria-label="Solicitar início de ronda">'+
   '<header class="rp-dispatch-head"><div class="rp-dispatch-kicker"><span>GRUPO MAXVEL</span><span>OPERAÇÃO DE CAMPO</span></div>'+
   '<h2>Solicitar início de ronda</h2><p>Envie a solicitação em quatro passos. O vigia inicia após recebê-la.</p></header>'+
   '<nav class="rp-dispatch-steps" aria-label="Etapas do despacho">'+names.map((n,i)=>'<span data-dispatch-progress="'+(i+1)+'" '+(i===0?'aria-current="step"':'')+'><b>'+String(i+1).padStart(2,'0')+'</b><small>'+n+'</small></span>').join('')+'</nav>'+
   '<form id="live-dispatch-form" class="rp-dispatch-form" data-step="1" novalidate>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="1"><span class="rp-dispatch-counter">01 / 04 · EQUIPE</span><h3>Quem fará a ronda?</h3>'+
   '<label for="rp-dispatch-worker">Vigia responsável<select id="rp-dispatch-worker" name="workerId" required><option value="">Selecione o profissional</option>'+options+'</select></label>'+
   '<p>O vigia receberá a solicitação na operação de Ronda.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="2" hidden><span class="rp-dispatch-counter">02 / 04 · DESTINO</span><h3>Onde será a ronda?</h3>'+
   '<label for="rp-dispatch-address">Local ou endereço<input id="rp-dispatch-address" name="address" required minlength="5" maxlength="350" autocomplete="street-address" placeholder="Rua, número, bairro ou referência"></label>'+
   '<label for="rp-dispatch-saved">Pontos pré-cadastrados<select id="rp-dispatch-saved"><option value="">Pesquisar novo endereço</option></select></label>'+
   '<button type="button" data-action="dispatch-geocode">Localizar endereço no mapa</button><div class="rp-geocode-results" id="rp-dispatch-results" role="group" aria-label="Resultados de endereços"></div>'+
   '<div id="rp-dispatch-map" style="height:215px;min-height:215px;border-radius:8px;overflow:hidden;background:#27303b" role="region" aria-label="Mapa de localização do destino"></div>'+
   '<p id="rp-dispatch-map-status" role="status">Digite um endereço e toque em localizar, ou selecione um ponto cadastrado.</p>'+
   '<p>Confira o marcador antes de continuar.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="3" hidden><span class="rp-dispatch-counter">03 / 04 · INSTRUÇÕES</span><h3>O que precisa verificar?</h3>'+
   '<label for="rp-dispatch-reason">Motivo e orientações<textarea id="rp-dispatch-reason" name="reason" required minlength="10" maxlength="1000" rows="3" placeholder="Descreva os itens a verificar e o motivo da solicitação"></textarea></label>'+
   '<p>Instruções objetivas deixam o atendimento mais rápido.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="4" hidden><span class="rp-dispatch-counter">04 / 04 · CONFERÊNCIA</span><h3>Revise a solicitação</h3>'+
   '<dl class="rp-dispatch-review"><div><dt>Vigia</dt><dd data-dispatch-summary="worker"></dd></div><div><dt>Destino</dt><dd data-dispatch-summary="address"></dd></div><div><dt>Instruções</dt><dd data-dispatch-summary="reason"></dd></div></dl></section>'+
   '<p class="rp-dispatch-error" role="alert" hidden></p>'+
   '<footer class="rp-dispatch-actions"><button type="button" class="rp-dispatch-back" data-action="dispatch-back" hidden>Voltar</button>'+
   '<button type="button" class="rp-dispatch-next" data-action="dispatch-next" '+(!workers.length?'disabled':'')+'>Continuar <span aria-hidden="true">→</span></button>'+
   '<button type="submit" class="rp-dispatch-submit" hidden>Solicitar ronda <span aria-hidden="true">✓</span></button></footer></form></section>',false,'rp-dispatch-dialog');
  selectedLocation=null;results=[];lookupSerial++;map?.dispose();map=createPointMap(dialog.querySelector('#rp-dispatch-map'));void loadPoints();
  if(!workers.length){const error=dialog.querySelector('.rp-dispatch-error');error.textContent='Cadastre um vigia ativo antes de solicitar a ronda.';error.hidden=false;}
 }
 function step(next){
  const form=dialog.querySelector('#live-dispatch-form');if(!form)return;
  const current=Number(form.dataset.step)||1;
  if(next>current){
   const control=form.querySelector('[data-dispatch-stage="'+current+'"] select,[data-dispatch-stage="'+current+'"] input,[data-dispatch-stage="'+current+'"] textarea');
   if(control&&!control.checkValidity()){control.setAttribute('aria-invalid','true');control.reportValidity();control.focus();return;}
   control?.removeAttribute('aria-invalid');
  }
  if(current===2&&next>current&&!selectedLocation){const status=dialog.querySelector('#rp-dispatch-map-status');status.textContent='Localize e confirme o endereço no mapa antes de continuar.';return;}
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
  if(n===4){
   const worker=form.querySelector('[name="workerId"]');
   const payload=new FormData(form);
   for(const [key,value] of [['worker',worker.selectedOptions[0]?.textContent],['address',payload.get('address')],['reason',payload.get('reason')]]){
    const node=form.querySelector('[data-dispatch-summary="'+key+'"]');if(node)node.textContent=String(value||'');
   }
  }
  if(n===2&&selectedLocation)requestAnimationFrame(()=>map?.show(selectedLocation).catch(()=>{}));
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
  if(!selectedLocation){step(2);return true;}
  button.disabled=true;button.textContent='Enviando…';
  const data=Object.fromEntries(new FormData(form));
  data.latitude=selectedLocation.lat;data.longitude=selectedLocation.lng;
  try{
   await request('/dispatches',{method:'POST',data:{...data,kind:'ronda'}});
   dialog.close();await refresh();redraw();notify('Solicitação de ronda enviada ao vigia.');
  }catch(error){
   button.disabled=false;button.textContent='Solicitar ronda ✓';
   const message=form.querySelector('.rp-dispatch-error');message.textContent=error.message||'Não foi possível despachar.';message.hidden=false;notify(message.textContent);
  }
  return true;
 }
 async function locate(){
  const address=dialog.querySelector('#rp-dispatch-address')?.value.trim(),status=dialog.querySelector('#rp-dispatch-map-status'),list=dialog.querySelector('#rp-dispatch-results');
  if(!address||address.length<5){status.textContent='Informe rua, número, cidade ou referência.';return;}
  const serial=++lookupSerial;selectedLocation=null;status.textContent='Localizando…';list.innerHTML='';
  try{
   const matches=await searchAddress(address);if(serial!==lookupSerial||!list.isConnected)return;
   results=matches;
   list.innerHTML=matches.map((p,i)=>'<button type="button" data-action="dispatch-select-result" data-index="'+i+'">'+escape(p.address||p.name)+'</button>').join('');
   status.textContent='Selecione o endereço correto para confirmar o marcador.';
   if(matches.length===1)await selectPoint(matches[0]);
  }catch(error){if(serial===lookupSerial)status.textContent=error.message||'Local não encontrado.';}
 }
 async function selectPoint(p){
  if(!p||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return;
  const status=dialog.querySelector('#rp-dispatch-map-status');
  selectedLocation={lat:Number(p.lat),lng:Number(p.lng),name:p.name,address:p.address};
  dialog.querySelector('#rp-dispatch-address').value=p.address;
  status.textContent='Ponto confirmado: '+(p.name||p.address);
  try{await map.show(selectedLocation);}catch(error){status.textContent+=' · Mapa indisponível: '+error.message;}
 }
 async function click(element){
  if(element.dataset.action==='dispatch-geocode'){await locate();return true;}
  if(element.dataset.action==='dispatch-select-result'){await selectPoint(results[Number(element.dataset.index)]);return true;}
  if(element.id==='rp-dispatch-saved'){
   if(element.value!=='')await selectPoint(savedPoints[Number(element.value)]);
   return true;
  }
  return false;
 }
 function changed(element){
  if(element.id==='rp-dispatch-address'){
   lookupSerial++;selectedLocation=null;results=[];
   const list=dialog.querySelector('#rp-dispatch-results'),status=dialog.querySelector('#rp-dispatch-map-status');
   if(list)list.innerHTML='';
   if(status)status.textContent='Endereço alterado. Localize novamente para confirmar o ponto.';
  }
 }
 return {open,step,submit,click,changed};
}
