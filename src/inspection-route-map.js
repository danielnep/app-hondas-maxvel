/**
 * Mapa independente para missões de vistoria.
 * Pontos planejados: referência em linha pontilhada, NÃO rota viária.
 * Linha contínua: deslocamento GPS efetivamente observado no dispositivo.
 */
import {loadLeaflet} from './map.js';
const parsePoint=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180
 ?[Number(p.lat),Number(p.lng)]:null;
const waypoints=assignment=>{
 let points=assignment?.routePoints??assignment?.route_points??[];
 if(typeof points==='string')try{points=JSON.parse(points)}catch{points=[]}
 return Array.isArray(points)?points.slice(0,12).map(parsePoint).filter(Boolean):[];
};
export function createInspectionRouteMap({onPosition=()=>{},onError=()=>{}}={}){
 let map=null,watch=null,liveLine=null,plannedLink=null,locationMarker=null,history=[],lastSend=0,assignmentId=null,planned=[],pathKey='',epoch=0;
 function destroy(){epoch++;if(watch!=null){navigator.geolocation?.clearWatch(watch);watch=null;}map?.remove();map=null;liveLine=null;plannedLink=null;locationMarker=null;}
 function routeData(item){
  const destination=item?.latitude!=null&&item?.longitude!=null?parsePoint({lat:item.latitude,lng:item.longitude}):null;
  return [...waypoints(item),...(destination?[destination]:[])];
 }
 function mount(host,item,{demo=false}={}){
  destroy();assignmentId=item?.id??null;planned=routeData(item);pathKey='rondaspro-inspection-track-'+assignmentId;
  history=[];if(!assignmentId)return init(host,item);
  try{const old=JSON.parse(sessionStorage.getItem(pathKey)||'[]');history=Array.isArray(old)?old.slice(-600).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)):[]}catch{}
  init(host,item);
  return {track:()=>start(demo),stop};
 }
 function init(host,item){
  if(!host)return;
  if(!window.L){const generation=epoch;void loadLeaflet().then(()=>{if(generation===epoch&&host.isConnected&&!map)init(host,item)}).catch(()=>{});return;}
  const startPoint=planned[0]||history.at(-1)||[0,0];
  map=window.L.map(host,{scrollWheelZoom:false}).setView(startPoint,planned.length||history.length?15:2);
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap &copy; CARTO',maxZoom:19}).addTo(map);
  if(planned.length){
   planned.forEach((p,i)=>window.L.circleMarker(p,{radius:i===planned.length-1?10:7,color:'#fff',weight:2,fillColor:i===planned.length-1?'#ed3654':'#a9a4b0',fillOpacity:1}).addTo(map).bindTooltip(i===planned.length-1?'Destino do COI':'Passagem '+(i+1)));
   if(planned.length>1)window.L.polyline(planned,{color:'#f69cae',weight:3,dashArray:'7,9',opacity:.9}).addTo(map);
  }
  if(history.length&&planned.length)plannedLink=window.L.polyline([history.at(-1),planned[0]],{color:'#d99aa9',weight:2,dashArray:'3,9',opacity:.65}).addTo(map);
  if(history.length){liveLine=window.L.polyline(history,{color:'#f2f1f3',weight:4}).addTo(map);locationMarker=window.L.circleMarker(history.at(-1),{radius:8,color:'#fff',fillColor:'#ed3654',fillOpacity:1}).addTo(map)}
  const all=[...planned,...history];
  if(all.length>1)map.fitBounds(window.L.latLngBounds(all),{padding:[34,34],maxZoom:16});
  else if(all.length)map.setView(all[0],15);
  const attachedMap=map;setTimeout(()=>{if(map===attachedMap&&host.isConnected)attachedMap?.invalidateSize({animate:false});},120);
 }
 function stop(){if(watch!=null){navigator.geolocation?.clearWatch(watch);watch=null;}return true;}
 function start(demo){
  if(!navigator.geolocation){onError('GPS não disponível neste aparelho.');return false}
  if(watch!=null)return true;
  watch=navigator.geolocation.watchPosition(async pos=>{
   const p=[pos.coords.latitude,pos.coords.longitude],accuracy=pos.coords.accuracy;
   if(!p.every(Number.isFinite)||accuracy>150){onError('Sinal de GPS ainda impreciso. Aguardando melhor localização.');return}
   const previous=history.at(-1);
   const moved=!previous||Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1])>0.000025;
   if(moved){
    history.push(p);history=history.slice(-600);try{sessionStorage.setItem(pathKey,JSON.stringify(history))}catch{}
    if(map){
     if(!liveLine)liveLine=window.L.polyline(history,{color:'#f2f1f3',weight:4}).addTo(map);else liveLine.setLatLngs(history);
     if(!locationMarker)locationMarker=window.L.circleMarker(p,{radius:8,color:'#fff',fillColor:'#ed3654',fillOpacity:1}).addTo(map);else locationMarker.setLatLng(p);
     if(planned.length){if(!plannedLink)plannedLink=window.L.polyline([p,planned[0]],{color:'#d99aa9',weight:2,dashArray:'3,9',opacity:.65}).addTo(map);else plannedLink.setLatLngs([p,planned[0]]);}
     map.panTo(p,{animate:false});
    }
   }
   onPosition({lat:p[0],lng:p[1],accuracy,at:pos.timestamp||Date.now(),samples:history.length,waypoints:planned.length});
   if(!demo&&Date.now()-lastSend>20000){
    lastSend=Date.now();
    try{await fetch('/api/presence',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(sessionStorage.getItem('rondaspro_api_token')||'')},body:JSON.stringify({position:{lat:p[0],lng:p[1],accuracy}})})}catch{}
   }
  },error=>onError('GPS indisponível: '+error.message),{enableHighAccuracy:true,maximumAge:3000,timeout:15000});
  return true;
 }
 return {mount,stop,destroy,getActive:()=>watch!=null};
}
