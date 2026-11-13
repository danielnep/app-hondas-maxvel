import {searchAddress,createPointMap} from './geo-tools.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createSavedPointsManager({dialog,showDialog,api,notify}){
 let entries=[],candidates=[],selected=null,map=null,searchId=0;
 const item=(p)=>'<article class="rp-point-row"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.address)+'</small></span><button type="button" data-action="admin-point-archive" data-point-id="'+esc(p.id)+'" aria-label="Arquivar '+esc(p.name)+'">Arquivar</button></article>';
 async function refreshList(){
  const response=await api('/saved-points');
  entries=response.points||[];
  const container=dialog.querySelector('#rp-saved-point-list');
  if(container)container.innerHTML=entries.map(item).join('')||'<p>Nenhum ponto cadastrado.</p>';
 }
 async function open(){
  map?.dispose();selected=null;candidates=[];searchId++;
  showDialog('<section class="rp-points-panel"><header><span class="eyebrow">ADMINISTRAÇÃO · MAPAS</span><h2>Pontos cadastrados</h2><p>Crie pontos geográficos reutilizáveis nas rondas.</p></header>'+
   '<nav class="rp-points-modes" aria-label="Modo de pontos"><button type="button" data-action="admin-points-mode" data-mode="list" aria-pressed="true">Pontos salvos</button><button type="button" data-action="admin-points-mode" data-mode="create" aria-pressed="false">Adicionar ponto</button></nav>'+
   '<div class="rp-points-stage" data-points-stage="list"><div id="rp-saved-point-list" class="rp-points-list"></div></div>'+
   '<form id="rp-saved-point-form" class="rp-points-stage" data-points-stage="create" hidden novalidate>'+
   '<label>Nome do ponto<input name="name" minlength="2" maxlength="100" required placeholder="Ex.: Portaria principal"></label>'+
   '<label>Endereço<input name="address" minlength="5" maxlength="350" required placeholder="Rua, número, cidade e estado"></label>'+
   '<button type="button" data-action="admin-point-search">Localizar no mapa</button><div class="rp-geocode-results" id="rp-point-search-results"></div>'+
   '<div id="rp-saved-point-map" class="rp-saved-point-map" role="region" aria-label="Mapa para confirmar ponto"></div>'+
   '<p class="rp-point-status" role="status">Busque o endereço e confirme o marcador antes de salvar.</p>'+
   '<button type="submit" class="rp-save-point" disabled>Salvar ponto confirmado</button></form></section>',false,'rp-admin-points-dialog');
  map=createPointMap(dialog.querySelector('#rp-saved-point-map'));
  try{await refreshList();}catch(error){const node=dialog.querySelector('#rp-saved-point-list');if(node)node.textContent='Não foi possível carregar os pontos: '+error.message;}
 }
 function mode(which){
  for(const stage of dialog.querySelectorAll('[data-points-stage]'))stage.hidden=stage.dataset.pointsStage!==which;
  for(const button of dialog.querySelectorAll('[data-action="admin-points-mode"]'))button.setAttribute('aria-pressed',String(button.dataset.mode===which));
  if(which==='create'&&selected)requestAnimationFrame(()=>map?.show(selected).catch(()=>{}));
 }
 async function mark(p){
  if(!p)return;
  const form=dialog.querySelector('#rp-saved-point-form');
  selected={lat:Number(p.lat),lng:Number(p.lng),name:p.name,address:p.address};
  form.elements.address.value=p.address;
  form.elements.name.value=form.elements.name.value.trim()||p.name;
  const status=form.querySelector('.rp-point-status');
  status.textContent='Local confirmado: '+p.address;
  form.querySelector('[type="submit"]').disabled=false;
  try{await map.show(selected);}catch(error){status.textContent+=' · Mapa indisponível: '+error.message;}
 }
 async function click(element){
  if(element.dataset.action==='admin-points-open'){await open();return true;}
  if(element.dataset.action==='admin-points-mode'){mode(element.dataset.mode);return true;}
  if(element.dataset.action==='admin-point-search'){
   const form=dialog.querySelector('#rp-saved-point-form'),text=form.elements.address.value.trim(),node=dialog.querySelector('#rp-point-search-results'),status=form.querySelector('.rp-point-status');
   if(text.length<5){status.textContent='Informe um endereço mais detalhado.';return true;}
   const serial=++searchId;selected=null;form.querySelector('[type="submit"]').disabled=true;node.innerHTML='';status.textContent='Pesquisando endereços…';
   try{
    const found=await searchAddress(text);
    if(serial!==searchId||!node.isConnected)return true;
    candidates=found;
    node.innerHTML=found.map((p,i)=>'<button type="button" data-action="admin-point-select" data-index="'+i+'">'+esc(p.address)+'</button>').join('');
    status.textContent='Selecione um resultado para confirmar sua posição.';
    if(found.length===1)await mark(found[0]);
   }catch(error){if(serial===searchId)status.textContent=error.message;}
   return true;
  }
  if(element.dataset.action==='admin-point-select'){await mark(candidates[Number(element.dataset.index)]);return true;}
  if(element.dataset.action==='admin-point-archive'){
   if(!entries.some(p=>p.id===element.dataset.pointId))return true;
   try{await api('/saved-points/'+encodeURIComponent(element.dataset.pointId),{method:'DELETE'});await refreshList();notify('Ponto arquivado. Histórico preservado.');}
   catch(error){notify(error.message);}return true;
  }
  return false;
 }
 function changed(element){
  if(!element.matches('#rp-saved-point-form [name="address"]'))return false;
  searchId++;selected=null;
  const form=dialog.querySelector('#rp-saved-point-form');if(!form)return true;
  form.querySelector('[type="submit"]').disabled=true;
  dialog.querySelector('#rp-point-search-results').innerHTML='';
  form.querySelector('.rp-point-status').textContent='Endereço alterado: localize o novo ponto antes de salvar.';
  return true;
 }
 async function submit(form){
  if(form.id!=='rp-saved-point-form')return false;
  const status=form.querySelector('.rp-point-status');
  if(!selected){status.textContent='Confirme um ponto no mapa antes de salvar.';return true;}
  if(!form.elements.name.checkValidity()||!form.elements.address.checkValidity()){form.reportValidity();return true;}
  const save=form.querySelector('[type="submit"]');if(save.disabled)return true;save.disabled=true;
  try{
   await api('/saved-points',{method:'POST',data:{name:form.elements.name.value.trim(),address:selected.address,lat:selected.lat,lng:selected.lng}});
   await refreshList();mode('list');notify('Ponto salvo e disponível para as próximas rondas.');
  }catch(error){status.textContent=error.message;save.disabled=false;}
  return true;
 }
 return {open,click,changed,submit};
}
