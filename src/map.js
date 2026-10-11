import {routeWaypoints} from './domain.js';

/**
 * Maps use genuine OpenStreetMap tiles when Leaflet and the network are available.
 * Patrol routes in demo mode are schematic STRAIGHT SEGMENTS, not verified street paths.
 * Markers and geofences are overlays and do not represent real Maxvel facilities.
 */
const escapeHtml = x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pointsOf=route=>[route.base,...route.points,route.base];
let leafletPromise;
export function loadLeaflet(){
 if(typeof window==='undefined'||typeof document==='undefined')return Promise.reject(new Error('Navegador necessário'));
 if(window.L)return Promise.resolve(window.L);
 if(leafletPromise)return leafletPromise;
 leafletPromise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;s.crossOrigin='anonymous';
  const timer=setTimeout(()=>reject(new Error('Mapa online indisponível')),9000);
  s.onload=()=>{clearTimeout(timer);window.L?resolve(window.L):reject(new Error('Biblioteca cartográfica indisponível'));};
  s.onerror=()=>{clearTimeout(timer);reject(new Error('Falha ao carregar mapa'));};
  document.head.appendChild(s);
 }).catch(err=>{leafletPromise=null;throw err});
 return leafletPromise;
}
export function routeBounds(route){
 const pts=pointsOf(route);return {
  minLat:Math.min(...pts.map(p=>p.lat)),maxLat:Math.max(...pts.map(p=>p.lat)),
  minLng:Math.min(...pts.map(p=>p.lng)),maxLng:Math.max(...pts.map(p=>p.lng))
 };
}
export function project(point,route,width=680,height=360){
 const b=routeBounds(route),latSpan=Math.max(.001,b.maxLat-b.minLat),lngSpan=Math.max(.0012,b.maxLng-b.minLng);
 return {x:55+(point.lng-b.minLng)/lngSpan*(width-110),y:height-45-(point.lat-b.minLat)/latSpan*(height-90)};
}
export function fallbackSVG(route,session,position){
 const path=pointsOf(route).map(x=>{const p=project(x,route);return `${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ');
 const visual=pointsOf(route).slice(0,-1),pos=project(position??route.base,route);
 return `<svg class="fallback-svg" viewBox="0 0 680 360" role="img" aria-label="Esquema alternativo da rota, sem cartografia de ruas" preserveAspectRatio="xMidYMid meet"><defs><pattern id="roadgrid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M 56 0 L 0 0 0 56" fill="none" stroke="#d8e6ee" stroke-width="1"/></pattern></defs><rect width="680" height="360" fill="#ebf5fa"/><rect width="680" height="360" fill="url(#roadgrid)"/><path d="M -15 93H695 M -15 284H695 M 162 -10V370 M 455 -10V370" stroke="white" stroke-width="22"/><path d="M -15 93H695 M -15 284H695 M 162 -10V370 M 455 -10V370" stroke="#c0d3e0" stroke-width="1" stroke-dasharray="7 6"/><polyline points="${path}" fill="none" stroke="#fff" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${path}" fill="none" stroke="#0b8cc3" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="12 7"/>${visual.map((p,i)=>{const q=project(p,route),done=i>0&&session?.checkpoints[i-1]?.completedAt,active=i>0&&session?.index===i-1;return `<g transform="translate(${q.x} ${q.y})"><circle r="25" fill="#0e91c8" fill-opacity=".10"/><circle r="17" fill="${done?'#147c68':active?'#117eaf':'#163b50'}" stroke="white" stroke-width="3"/><text y="5" text-anchor="middle" font-size="14" font-weight="750" fill="white">${i?done?'✓':i:'B'}</text></g>`}).join('')}<g transform="translate(${pos.x} ${pos.y})"><circle r="25" fill="#0499d5" fill-opacity=".15"/><circle r="11" fill="#0383bf" stroke="white" stroke-width="5"/></g><rect x="15" y="13" rx="10" width="241" height="31" fill="#fff"/><text x="26" y="33" font-family="system-ui" font-size="12" fill="#274d62">Modo alternativo · mapa esquemático</text></svg>`;
}
const latlng=p=>[p.lat,p.lng];
const closePositions=(a,b)=>Math.hypot((a.lat-b.lat)*111320,(a.lng-b.lng)*111320*Math.cos(a.lat*Math.PI/180))<2;
const markerHtml=(content,kind='point')=>`<span class="map-marker map-marker-${kind}">${content}</span>`;
export class PatrolMap{
 constructor(container,{route,session=null,position=null,interactive=true,compact=false}={}){
  this.container=container;this.route=route;this.session=session;this.position=position??route.base;this.interactive=interactive;this.compact=compact;
  this.instance=null;this.leaflet=null;this.layers=[];this.pointMarkers=[];this.destroyed=false;this.tracePositions=[this.position];this.traceLayer=null;
  this.showFallback();this.setup();
 }
 showFallback(){if(!this.destroyed&&this.container)this.container.innerHTML=`<div class="map-fallback">${fallbackSVG(this.route,this.session,this.position)}</div><div class="map-attribution-local">Mapa esquemático enquanto a cartografia carrega</div>`}
 async setup(){try{
  const L=await loadLeaflet();if(this.destroyed)return;
  this.leaflet=L;this.container.innerHTML='';
  const m=L.map(this.container,{zoomControl:false,scrollWheelZoom:this.interactive,dragging:this.interactive,attributionControl:true,preferCanvas:true});this.instance=m;
  const credit='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
  const standard=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,minZoom:3,attribution:credit,crossOrigin:true});
  const light=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,minZoom:3,subdomains:'abcd',attribution:credit+' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',crossOrigin:true});
  standard.addTo(m);
  L.control.layers({'Ruas e bairros · OpenStreetMap':standard,'Claro · CARTO':light},null,{collapsed:true,position:'topright'}).addTo(m);
  let tileFailures=0,alternateFailures=0;
  standard.on('tileerror',()=>{
   if(this.destroyed||this.instance!==m)return;
   if(++tileFailures>=5&&m.hasLayer(standard)){m.removeLayer(standard);light.addTo(m);}
  });
  light.on('tileerror',()=>{
   if(this.destroyed||this.instance!==m)return;
   if(++alternateFailures>=5){m.remove();this.instance=null;this.showFallback();this.container.setAttribute('data-map-fallback','true');}
  });
  L.control.zoom({position:'bottomright'}).addTo(m);
  this.refreshGeometry();
  const b=routeBounds(this.route),span=Math.max(b.maxLat-b.minLat,b.maxLng-b.minLng);
  if(span<.0006)m.setView(latlng(this.route.base),18);else m.fitBounds([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],{padding:[44,44],maxZoom:18,animate:false});
  setTimeout(()=>{if(!this.destroyed)m.invalidateSize(false)},80);
 }catch(err){if(!this.destroyed){this.showFallback();this.container.setAttribute('data-map-fallback','true');}}
 }
 refreshGeometry(){
  const L=this.leaflet,m=this.instance;if(!m||!L)return;
  this.layers.forEach(layer=>m.removeLayer(layer));this.layers=[];this.pointMarkers=[];
  const add=(layer)=>{layer.addTo(m);this.layers.push(layer);return layer};
  const pts=pointsOf(this.route).map(latlng);
  add(L.polyline(pts,{color:'#f7ffff',weight:13,opacity:.9,lineJoin:'round',interactive:false}));
  add(L.polyline(pts,{color:'#117fb7',weight:5,opacity:1,dashArray:'11 8',lineJoin:'round',interactive:false}));
  const bases=[this.route.base,...this.route.points];
  bases.forEach((p,i)=>{
   const done=i>0&&this.session?.checkpoints[i-1]?.completedAt;const active=i>0&&this.session?.index===i-1;
   if(i>0)add(L.circle(latlng(p),{radius:p.radius??25,color:active?'#087cad':'#4e9dc5',weight:2,fillColor:active?'#2aa7e1':'#73c8ed',fillOpacity:active?.14:.08,interactive:false}));
   const ic=L.divIcon({className:'map-pin-host',html:markerHtml(i===0?'B':done?'✓':i,done?'done':active?'active':i===0?'base':'point'),iconSize:[36,36],iconAnchor:[18,18]});
const pointState=i===0?'Base':done?'Concluído':active?'Ponto atual':'Planejado';
   const popup=`<div class="maxvel-map-popup"><small>PONTO ${i===0?'BASE':i} · ${pointState}</small><strong>${escapeHtml(p.name)}</strong><span>${i===0?'Retorno previsto à base':`Geocerca de ${Number(p.radius)||25} m · permanência de 30 s`}</span><em>${i>0?escapeHtml(p.instruction||'Seguir a sequência prevista'):'Localização do cenário ilustrativo'}</em></div>`;
   this.pointMarkers[i]=add(L.marker(latlng(p),{icon:ic,keyboard:true,title:i===0?'Base operacional (fictícia)':`${p.name} · raio ${p.radius??25} m`}).bindPopup(popup));
  });
  const userIcon=L.divIcon({className:'map-person-host',html:'<span class="map-person-ring"><i class="map-person-dot"></i></span>',iconSize:[34,34],iconAnchor:[17,17]});
  this.positionMarker=add(L.marker(latlng(this.position),{icon:userIcon,keyboard:true,title:this.session?.mode==='real'?'Localização informada pelo aparelho':'Posição simulada do ronda'}));
  this.traceLayer=add(L.polyline(this.tracePositions.map(latlng),{color:'#00a5de',weight:4,opacity:.9,lineCap:'round',interactive:false}));
  for(const d of this.session?.deviations??[]){
   if(!d.position)continue;
   add(L.circleMarker(latlng(d.position),{radius:9,color:'#fff',weight:3,fillColor:'#dc4557',fillOpacity:1}).bindPopup('<b>Desvio registrado</b><br>'+escapeHtml(d.pointName)+'<br><small>'+ (d.justification?'Justificativa recebida':'Justificativa pendente')+'</small>'));
  }
  this.accuracyCircle=add(L.circle(latlng(this.position),{radius:Math.max(3,Number(this.position.accuracy)||8),color:'#098bc6',weight:1,fillColor:'#37b5eb',fillOpacity:.14,interactive:false}));
 }
 update({session=this.session,position=this.position}={}){
  if(this.destroyed)return;const indexWas=this.session?.index,statusWas=this.session?.status;this.session=session;this.position=position??this.route.base;
  if(this.instance){if(indexWas!==session?.index||statusWas!==session?.status)this.refreshGeometry();
   else{this.positionMarker?.setLatLng(latlng(this.position));this.accuracyCircle?.setLatLng(latlng(this.position));this.accuracyCircle?.setRadius(Math.max(3,Number(this.position.accuracy)||8));this.updateTrace();}}
  else{const holder=this.container?.querySelector('.map-fallback');if(holder)holder.innerHTML=fallbackSVG(this.route,session,this.position);}
 }
 updateTrace(){
  if(!this.position||!Number.isFinite(this.position.lat)||!Number.isFinite(this.position.lng))return;
  const last=this.tracePositions[this.tracePositions.length-1];
  if(last&&closePositions(this.position,last))return;
  this.tracePositions.push({lat:this.position.lat,lng:this.position.lng});
  if(this.tracePositions.length>180)this.tracePositions.shift();
  this.traceLayer?.setLatLngs(this.tracePositions.map(latlng));
 }
 focusPoint(index){
  const p=this.route.points[index];
  if(!p||!this.instance)return false;
  this.instance.flyTo(latlng(p),Math.max(17,Math.min(18,this.instance.getZoom())),{animate:true,duration:0.4});
  this.pointMarkers[index+1]?.openPopup();
  return true;
 }
 center(){if(this.instance)this.instance.panTo(latlng(this.position),{animate:true});}
 fit(){if(!this.instance)return;const b=routeBounds(this.route);this.instance.fitBounds([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],{padding:[45,45],maxZoom:18});}
 invalidate(){this.instance?.invalidateSize(false)}
 destroy(){this.destroyed=true;this.instance?.remove();this.instance=null;if(this.container)this.container.innerHTML=''}
}