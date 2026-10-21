/** Pesquisa deliberada de endereços e mapa de confirmação.
 * O Photon/OSM é utilizado apenas quando a pessoa solicita uma busca, sem autocomplete agressivo.
 */
import {loadLeaflet} from './map.js';
const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
export async function searchAddress(query,{signal}={}){
 const term=String(query||'').trim();
 if(term.length<5)throw Error('Informe rua, número, cidade ou ponto de referência.');
 const u=new URL('https://photon.komoot.io/api/');
 u.searchParams.set('q',term);u.searchParams.set('limit','5');u.searchParams.set('lang','pt');
 const response=await fetch(u,{headers:{Accept:'application/json'},signal:signal||AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Serviço de endereços indisponível. Tente novamente.');
 const data=await response.json();
 const list=(data.features||[]).map(item=>{
  const c=item.geometry?.coordinates||[],p=item.properties||{};
  const lat=Number(c[1]),lng=Number(c[0]);
  const address=[p.name,p.housenumber,p.street,p.district,p.city,p.state,p.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
  return {name:String(p.name||p.street||p.city||'Local').slice(0,100),address:address.slice(0,350),lat,lng};
 }).filter(x=>valid(x.lat,x.lng));
 if(!list.length)throw Error('Não encontrei esse endereço. Informe cidade, estado e mais detalhes.');
 return list;
}
export function createPointMap(host){
 let map=null,marker=null,seq=0,disposed=false;
 async function show(point){
  const lat=Number(point?.lat),lng=Number(point?.lng);
  if(!valid(lat,lng))throw Error('Coordenadas inválidas.');
  const thisSeq=++seq;
  const placeholder=document.createElement('div');
  placeholder.className='rp-geo-map-fallback';
  placeholder.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="43" r="30" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"/><circle cx="50" cy="43" r="18" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/><path d="M50 22c-12 0-22 9-22 22 0 16 22 37 22 37s22-21 22-37c0-13-10-22-22-22zm0 16a7 7 0 1 1 0 14 7 7 0 0 1 0-14z" fill="#ef536d"/></svg><strong>Ponto geográfico encontrado</strong><small>Carregando cartografia…</small>';
  placeholder.querySelector('small').textContent=lat.toFixed(5)+', '+lng.toFixed(5)+' · aguardando mapa online';
  host.replaceChildren(placeholder);
  const L=await loadLeaflet();
  if(disposed||thisSeq!==seq||!host.isConnected)return;
  if(!map){
   host.replaceChildren();
   map=L.map(host,{zoomControl:true,scrollWheelZoom:false});
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  }
  if(marker)map.removeLayer(marker);
  marker=L.marker([lat,lng]).addTo(map);
  marker.bindPopup(String(point.name||point.address||'Ponto confirmado')).openPopup();
  map.setView([lat,lng],16,{animate:false});
  requestAnimationFrame(()=>{if(!disposed)map?.invalidateSize()});
 }
 function dispose(){disposed=true;seq++;if(map){map.remove();map=null;marker=null;}}
 return {show,dispose};
}
