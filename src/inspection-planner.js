import {loadLeaflet} from './map.js';
import {searchPlacesWithLearned,searchFocus,recordLearnedPlace} from './place-search.js';

// The same planner is opened by the homepage shortcut and the inspector list.
export async function mountInspectionPlanner(dialog,destinations){
 dialog._plannerCleanup?.();
 const form=dialog.querySelector('#ops-inspector-form'),address=form.elements.address;
 const chooser=form.elements.destinationId,host=dialog.querySelector('#ops-inspection-plan-map');
 const suggestions=dialog.querySelector('#ops-inspection-address-suggestions'),list=dialog.querySelector('[data-inspection-stops]');
 const status=dialog.querySelector('[data-ops-route-status]');
 let points=[],markers=[],map=null,timer=null,controller=null,closed=false,epoch=0;
 const listen=(element,event,fn)=>{element.addEventListener(event,fn);cleanups.push(()=>element.removeEventListener(event,fn));};
 const cleanups=[];
 const render=()=>{
  form.elements.inspectionStops.value=JSON.stringify(points);
  list.replaceChildren();markers.forEach(m=>m.remove());markers=[];
  points.forEach((point,index)=>{
   const row=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button');
   label.textContent=(index+1)+'. '+point.address;remove.type='button';remove.textContent='Remover';
   remove.setAttribute('aria-label','Remover local '+(index+1));
   remove.onclick=()=>{points.splice(index,1);render();};
   row.append(label,remove);list.append(row);
   if(map)markers.push(window.L.circleMarker([point.lat,point.lng],{radius:10,color:'#fff',fillColor:'#d32942',fillOpacity:1}).addTo(map).bindTooltip(String(index+1),{permanent:true,direction:'center'}));
  });
  status.textContent=points.length?points.length+' local(is) selecionado(s). Cada local terá sua própria vistoria.':'Toque no mapa ou selecione um endereço para adicionar o primeiro local.';
 };
 const cancelSearch=()=>{epoch++;clearTimeout(timer);controller?.abort();suggestions.replaceChildren();};
 const add=point=>{
  if(points.length>=12){status.textContent='Limite de 12 locais por solicitação.';return;}
  const lat=Number(point.lat),lng=Number(point.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;
  if(points.some(p=>Math.abs(p.lat-lat)<0.000001&&Math.abs(p.lng-lng)<0.000001)){status.textContent='Este ponto já está na lista.';return;}
  const label=String(point.address||point.name||('Ponto no mapa ('+lat.toFixed(6)+', '+lng.toFixed(6)+')')).slice(0,350);
  points.push({lat,lng,address:label,...(point.destinationId?{destinationId:point.destinationId}:{})});cancelSearch();address.value='';chooser.value='';render();
  if(map)map.setView([lat,lng],Math.max(15,map.getZoom()),{animate:false});
 };
 const show=found=>{
  suggestions.replaceChildren();
  for(const point of found){
   const button=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('small');
   button.type='button';button.setAttribute('role','option');strong.textContent=point.name||point.address;
   small.textContent=point.address||'';button.append(strong,small);
   button.onclick=()=>{recordLearnedPlace(point);const saved=destinations.find(p=>p.id===chooser.value);add({...point,...(saved?{destinationId:saved.id,address:saved.address}:{})});};suggestions.append(button);
  }
 };
 const search=()=>{
  cancelSearch();const q=address.value.trim(),mine=epoch;
  if(q.length<3)return;
  status.textContent='Buscando endereço…';
  timer=setTimeout(async()=>{
   controller=new AbortController();
   try{
    const found=await searchPlacesWithLearned(q,{focus:searchFocus(null,map),signal:controller.signal,limit:7});
    if(closed||mine!==epoch)return;
    show(found);status.textContent=found.length?'Selecione o endereço para incluí-lo na vistoria.':'Endereço não encontrado. Marque o local no mapa.';
   }catch(error){if(!closed&&mine===epoch)status.textContent='Busca indisponível. Selecione o ponto diretamente no mapa.';}
  },350);
 };
 listen(address,'input',()=>{chooser.value='';search();});
 listen(chooser,'change',()=>{
  const point=destinations.find(p=>p.id===chooser.value);if(!point)return;
  if(point.latitude!=null&&point.longitude!=null)add({lat:point.latitude,lng:point.longitude,address:point.address,destinationId:point.id});
  else{address.value=point.address;search();}
 });
 listen(dialog.querySelector('[data-ops-map-clear]'),'click',()=>{cancelSearch();points=[];render();});
 const cleanup=()=>{if(closed)return;closed=true;cancelSearch();map?.remove();map=null;cleanups.forEach(fn=>fn());};
 dialog._plannerCleanup=cleanup;
 listen(dialog,'close',cleanup);
 render();
 try{
  const L=await loadLeaflet();if(closed||!host.isConnected)return;
  map=L.map(host,{scrollWheelZoom:false}).setView([-20.1437,-44.8906],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
  map.on('click',e=>{const saved=destinations.find(p=>p.id===chooser.value);add({lat:Number(e.latlng.lat.toFixed(6)),lng:Number(e.latlng.lng.toFixed(6)),...(saved?{destinationId:saved.id,address:saved.address}:{})});});
  render();requestAnimationFrame(()=>{if(!closed)map.invalidateSize();});
 }catch(error){status.textContent='Mapa indisponível. Pesquise e selecione os endereços acima.';}
}
