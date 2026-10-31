import {routeWaypoints} from './domain.js';
import {fetchInspectionStreetPath,readOfflineStreetPath} from './inspection-street-route.js';

/**
 * Maps use genuine OpenStreetMap tiles when Leaflet and the network are available.
 * Patrol routes in demo mode use INTERMEDIATE WAYPOINTS for a detailed fictional path, not verified street routing.
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
  const s=document.createElement('script');s.src='./assets/vendor/leaflet/leaflet.js';s.async=true;s.crossOrigin='anonymous';
  const timer=setTimeout(()=>reject(new Error('Mapa online indisponível')),9000);
  s.onload=()=>{
   clearTimeout(timer);
   if(!window.L){reject(new Error('Biblioteca cartográfica indisponível'));return;}
   if(!window.__RONDA_ANDROID_BUNDLE__){resolve(window.L);return;}
   const rotate=document.createElement('script');rotate.src='./assets/vendor/leaflet/leaflet-rotate.js';
   rotate.onload=()=>resolve(window.L);
   rotate.onerror=()=>resolve(window.L); // never block the offline map if compass plugin is unavailable
   document.head.appendChild(rotate);
  };
  s.onerror=()=>{clearTimeout(timer);reject(new Error('Falha ao carregar mapa'));};
  document.head.appendChild(s);
 }).catch(err=>{leafletPromise=null;throw err});
 return leafletPromise;
}
export function routeBounds(route){
 const pts=routeWaypoints(route);return {
  minLat:Math.min(...pts.map(p=>p.lat)),maxLat:Math.max(...pts.map(p=>p.lat)),
  minLng:Math.min(...pts.map(p=>p.lng)),maxLng:Math.max(...pts.map(p=>p.lng))
 };
}
export function project(point,route,width=680,height=360){
 const b=routeBounds(route),latSpan=Math.max(.001,b.maxLat-b.minLat),lngSpan=Math.max(.0012,b.maxLng-b.minLng);
 return {x:55+(point.lng-b.minLng)/lngSpan*(width-110),y:height-45-(point.lat-b.minLat)/latSpan*(height-90)};
}
// Real route-only map: persisted OSRM geometry and GPS; no downloaded street tiles needed.
export function routeOnlySVG(route,session,position,{width=680,height=360}={}){
 const street=readOfflineStreetPath(route);
 const points=(route?.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 const base=route?.base;
 const nodes=[...(street||[]),...(base?[base]:[]),...points];
 if(!nodes.length)return null;
 const w=Math.max(300,Math.round(width)),h=Math.max(280,Math.round(height));
 const minLat=Math.min(...nodes.map(p=>p.lat)),maxLat=Math.max(...nodes.map(p=>p.lat));
 const minLng=Math.min(...nodes.map(p=>p.lng)),maxLng=Math.max(...nodes.map(p=>p.lng));
 const ratio=Math.cos(((minLat+maxLat)/2)*Math.PI/180);
 const lngSpan=Math.max(.0001,(maxLng-minLng)*ratio),latSpan=Math.max(.0001,maxLat-minLat);
 const scale=Math.min((w-72)/lngSpan,(h-92)/latSpan);
 const project=p=>({x:w/2+((p.lng-(minLng+maxLng)/2)*ratio*scale),y:h/2-((p.lat-(minLat+maxLat)/2)*scale)});
 const poly=path=>path.filter((_,i)=>i===0||i===path.length-1||i%Math.max(1,Math.ceil(path.length/1800))===0).map(p=>{const t=project(p);return t.x.toFixed(1)+','+t.y.toFixed(1)}).join(' ');
 const planned=[base,...points].filter(Boolean);
 const line=street?.length>1?`<polyline points="${poly(street)}" fill="none" stroke="#152c3a" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${poly(street)}" fill="none" stroke="#55c9f5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`:`<polyline points="${poly(planned)}" fill="none" stroke="#8d959e" stroke-width="3" stroke-dasharray="6 7"/>`;
 const pins=planned.map((p,i)=>{const q=project(p),done=i>0&&!!session?.checkpoints?.[i-1]?.completedAt,current=i>0&&session?.index===i-1;return `<g transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)})"><circle r="17" fill="${done?'#307f67':current?'#128ac5':'#263b4b'}" stroke="#fff" stroke-width="2"/><text y="5" text-anchor="middle" fill="#fff" font-size="13" font-family="sans-serif" font-weight="700">${i===0?'B':done?'✓':i}</text></g>`}).join('');
 const canLocate=Number.isFinite(position?.lat)&&Number.isFinite(position?.lng);
 const user=canLocate?(()=>{const q=project(position);return `<g transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)})"><circle r="20" fill="#55c9f5" opacity=".15"/><circle r="9" fill="#55c9f5" stroke="white" stroke-width="3"/></g>`})():'';
 const label=street?.length>1?'ROTA REAL SALVA · DISPONÍVEL OFFLINE':'PONTOS SALVOS · TRAJETO VIÁRIO AINDA NÃO BAIXADO';
 return `<svg class="fallback-svg route-only-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa offline da rota atribuída e posição GPS"><rect width="${w}" height="${h}" fill="#17232e"/>${line}${pins}${user}<rect x="9" y="9" width="${Math.min(w-18,Math.max(218,label.length*6.8))}" height="31" rx="6" fill="#09151edb"/><text x="17" y="29" fill="#e9f5ff" font-size="10" font-family="sans-serif">${label}</text></svg>`;
}
export function fallbackSVG(route,session,position,showRoute=true,showPosition=true,viewport=null){
 if(route?.roadRouting&&route?.baseKnown){
  const routeOnly=routeOnlySVG(route,session,position,{width:viewport?.width||680,height:viewport?.height||360});
  if(routeOnly)return routeOnly;
 }

 const width=Math.max(300,Math.round(Number(viewport?.width)||680)),height=Math.max(280,Math.round(Number(viewport?.height)||360));
 const street=`M -15 ${Math.round(height*.258)}H${width+15} M -15 ${Math.round(height*.789)}H${width+15} M ${Math.round(width*.238)} -10V${height+10} M ${Math.round(width*.669)} -10V${height+10}`;
 const projectHere=p=>{
  const q=project(p,route,width,height);
  if(!viewport||!route.inspectionMode)return q;
  const b=routeBounds(route),span=Math.max(.001,b.maxLat-b.minLat);
  const top=Math.min(135,Math.round(height*.25)),bottom=Math.min(245,Math.round(height*.39));
  return {...q,y:height-bottom-(p.lat-b.minLat)/span*Math.max(30,height-top-bottom)};
 };

 const path=routeWaypoints(route).map(x=>{const p=projectHere(x);return `${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ');
 const visual=pointsOf(route).slice(0,-1),pos=projectHere(position??route.base);
 const routeOverlay=showRoute?`<polyline points="${path}" fill="none" stroke="#0C0D0F" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${path}" fill="none" stroke="#55C9F5" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="12 7"/>${visual.map((p,i)=>{const q=projectHere(p),done=i>0&&(route.inspectionMode?!!p.completedAt:!!session?.checkpoints[i-1]?.completedAt),active=i>0&&(route.inspectionMode?session?.currentId===p.id:session?.index===i-1);return `<g transform="translate(${q.x} ${q.y})"><circle r="25" fill="#55C9F5" fill-opacity=".10"/><circle r="17" fill="${done?'#357B68':active?'#55C9F5':'#43484C'}" stroke="white" stroke-width="3"/><text y="5" text-anchor="middle" font-size="14" font-weight="750" fill="white">${i?done?'✓':i:'B'}</text></g>`}).join('')}`:'';
 return `<svg class="fallback-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Esquema alternativo da rota, sem cartografia de ruas" preserveAspectRatio="xMidYMid meet"><defs><pattern id="roadgrid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M 56 0 L 0 0 0 56" fill="none" stroke="#323639" stroke-width="1"/></pattern></defs><rect width="${width}" height="${height}" fill="#17191B"/><rect width="${width}" height="${height}" fill="url(#roadgrid)"/><path d="${street}" stroke="#313538" stroke-width="22"/><path d="M -15 93H695 M -15 284H695 M 162 -10V370 M 455 -10V370" stroke="#656B70" stroke-width="1" stroke-dasharray="7 6"/>${routeOverlay}${showPosition?`<g transform="translate(${pos.x} ${pos.y})"><circle r="25" fill="#55C9F5" fill-opacity=".15"/><circle r="11" fill="#55C9F5" stroke="white" stroke-width="5"/></g>`:''}<rect x="15" y="13" rx="0" width="241" height="31" fill="#1D2023"/><text x="26" y="33" font-family="system-ui" font-size="12" fill="#F3F4F6">Modo alternativo · mapa esquemático</text></svg>`;
}
const latlng=p=>[p.lat,p.lng];
const closePositions=(a,b)=>Math.hypot((a.lat-b.lat)*111320,(a.lng-b.lng)*111320*Math.cos(a.lat*Math.PI/180))<2;
const markerHtml=(content,kind='point')=>`<span class="map-marker map-marker-${kind}">${content}</span>`;
export class PatrolMap{
 constructor(container,{route,session=null,position=null,interactive=true,compact=false,onMapClick=null,standbyClean=false,positionVerified=true,onStreetRoute=()=>{}}={}){
  this.container=container;this.route=route;this.session=session;this.position=position??route.base;this.interactive=interactive;this.compact=compact;this.onMapClick=onMapClick;this.standbyClean=standbyClean;
  this.instance=null;this.leaflet=null;this.layers=[];this.pointMarkers=[];this.destroyed=false;this.pendingFocus=null;this.pendingFit=false;this.positionVerified=positionVerified;this.tracePositions=positionVerified?[this.position]:[];this.traceLayer=null;this.liveLayer=null;this.tileVisible=false;this.tileFallbackTimer=null;
  this.streetPath=readOfflineStreetPath(route);this.streetRequest=null;this.streetEpoch=0;this.onStreetRoute=onStreetRoute;
  this.lastHeading=null;this.lastNavigationAt=0;
  this.headingListener=event=>{
   const value=Number(event.detail?.heading);
   if(Number.isFinite(value)&&value>=0&&value<=360){this.lastHeading=value;this.followNavigation();}
  };
  if(globalThis.window?.__RONDA_ANDROID_BUNDLE__)window.addEventListener('rondapro:native-heading',this.headingListener);
  this.showFallback();this.setup();if(this.route.inspectionMode||this.route.roadRouting)this.loadStreetPath();
 }
 fallbackViewport(){return this.route.inspectionMode||this.route.roadRouting?{width:Math.max(300,this.container?.clientWidth||680),height:Math.max(320,this.container?.clientHeight||360)}:null}
 showFallback(){if(!this.destroyed&&this.container)this.container.innerHTML=`<div class="map-fallback">${fallbackSVG(this.route,this.session,this.position,!this.standbyClean||!!this.session,this.positionVerified,this.fallbackViewport())}</div><div class="map-attribution-local">${this.route.roadRouting||this.route.inspectionMode?'Traçado geográfico salvo no dispositivo · cartografia externa opcional':'Mapa esquemático enquanto a cartografia carrega'}</div>`}
 async setup(){try{
  const L=await loadLeaflet();if(this.destroyed)return;
  this.leaflet=L;
  // Preserve a useful schematic map until online tiles actually arrive.
  // Otherwise a loaded Leaflet script with a failing tile provider leaves a black panel.
  const staged=typeof document.createElement==='function'&&typeof this.container.appendChild==='function';
  const mount=staged?document.createElement('div'):this.container;
  if(staged){
   mount.className='map-live-layer';
   mount.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .2s ease';
   this.container.appendChild(mount);this.liveLayer=mount;
  }else this.container.innerHTML='';
  const m=L.map(mount,{zoomControl:false,scrollWheelZoom:this.interactive,dragging:this.interactive,attributionControl:true,preferCanvas:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,rotate:!!window.__RONDA_ANDROID_BUNDLE__,touchRotate:true});this.instance=m;
  if(typeof this.onMapClick==='function')m.on('click',event=>this.onMapClick({lat:event.latlng.lat,lng:event.latlng.lng}));
  const credit='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
  // CARTO can return an HTTP-200 image saying API KEY REQUIRED, which tileerror cannot detect.
  // Start directly with genuine OSM cartography; the dark palette is applied only to the tile pane.
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,minZoom:3,attribution:credit,crossOrigin:true,className:'maxvel-osm-dark-adapted'
  });
  let osmErrors=0;
  // When offline, keep real road geometry from the last successful online routing.
  if(this.streetPath?.length>1&&staged){
   this.tileVisible=true;clearTimeout(this.tileFallbackTimer);
   mount.style.opacity='1';mount.style.pointerEvents='auto';
   this.container.querySelector('.map-fallback')?.remove();
   this.container.querySelector('.map-attribution-local')?.remove();
   this.container.removeAttribute('data-map-fallback');
  }
  osm.on('tileload',()=>{
   if(this.destroyed||this.instance!==m||!staged||this.tileVisible)return;
   this.tileVisible=true;clearTimeout(this.tileFallbackTimer);
   mount.style.opacity='1';mount.style.pointerEvents='auto';
   this.container.querySelector('.map-fallback')?.remove();
   this.container.querySelector('.map-attribution-local')?.remove();
   this.container.removeAttribute('data-map-fallback');
  });
  if(staged)this.tileFallbackTimer=setTimeout(()=>{
   if(this.destroyed||this.instance!==m||this.tileVisible)return;
   m.remove();this.instance=null;mount.remove();this.liveLayer=null;
   this.showFallback();this.container.setAttribute('data-map-fallback','true');
  },12000);
  osm.on('tileerror',()=>{
   if(this.destroyed||this.instance!==m)return;
   if(++osmErrors>=5&&m.hasLayer(osm)&&!this.streetPath?.length){
    clearTimeout(this.tileFallbackTimer);m.remove();this.instance=null;mount!==this.container&&mount.remove();this.liveLayer=null;this.showFallback();
    this.container.setAttribute('data-map-fallback','true');
   }
  });
  if(typeof navigator==='undefined'||navigator.onLine!==false)osm.addTo(m);
  L.control.zoom({position:'bottomright'}).addTo(m);
  this.refreshGeometry();
  if(this.standbyClean&&!this.session){m.setView(latlng(this.position),16,{animate:false});return;}
  const b=routeBounds(this.route),span=Math.max(b.maxLat-b.minLat,b.maxLng-b.minLng);
  if(span<.0006)m.setView(latlng(this.route.base),18);else m.fitBounds([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],{...this.mapViewPadding(),animate:false});
  setTimeout(()=>{
   if(this.destroyed||this.instance!==m)return;
   m.invalidateSize(false);
   if(this.pendingFocus!==null){const focus=this.pendingFocus;this.pendingFocus=null;this.focusPoint(focus);}
   else if(this.pendingFit){this.pendingFit=false;this.fit();}
  },80);
 }catch(err){if(!this.destroyed){this.showFallback();this.container.setAttribute('data-map-fallback','true');}}
 }
 refreshGeometry(){
  const L=this.leaflet,m=this.instance;if(!m||!L)return;
  this.layers.forEach(layer=>m.removeLayer(layer));this.layers=[];this.pointMarkers=[];
  const add=(layer)=>{layer.addTo(m);this.layers.push(layer);return layer};
  if(this.standbyClean&&!this.session){
   if(!this.positionVerified)return;
   const icon=L.divIcon({className:'map-person-host',html:'<span class="map-person-ring"><i class="map-person-dot"></i></span>',iconSize:[34,34],iconAnchor:[17,17]});
   this.positionMarker=add(L.marker(latlng(this.position),{icon,interactive:false,keyboard:false}));
   this.accuracyCircle=add(L.circle(latlng(this.position),{radius:Math.max(3,Number(this.position.accuracy)||8),color:'#55C9F5',weight:1,fillOpacity:.10,interactive:false}));
   return;
  }
  // Em ronda real, não ligar pontos por linhas retas quando OSRM estiver indisponível.
  const pts=((this.route.inspectionMode||this.route.roadRouting)?(this.streetPath?.length>1?this.streetPath:[]):routeWaypoints(this.route)).map(latlng);
  if(pts.length>1){
   add(L.polyline(pts,{color:'#08090d',weight:12,opacity:.92,lineJoin:'round',interactive:false}));
   add(L.polyline(pts,{color:'#55C9F5',weight:5,opacity:1,dashArray:(this.route.inspectionMode||this.route.roadRouting)&&this.streetPath?.length>1?null:'11 8',lineJoin:'round',interactive:false}));
  }
  const bases=[this.route.base,...this.route.points];
  bases.forEach((p,i)=>{
   const inspection=this.route.inspectionMode===true;
   const done=i>0&&(inspection?!!p.completedAt:!!this.session?.checkpoints[i-1]?.completedAt);
   const active=i>0&&(inspection?this.session?.currentId===p.id:this.session?.index===i-1);
   if(i>0&&!inspection)add(L.circle(latlng(p),{radius:p.radius??25,color:active?'#55C9F5':'#73797E',weight:2,fillColor:active?'#55C9F5':'#70767A',fillOpacity:active?.14:.08,interactive:false}));
   const ic=L.divIcon({className:'map-pin-host',html:markerHtml(i===0?'B':done?'✓':i,done?'done':active?'active':i===0?'base':'point'),iconSize:[36,36],iconAnchor:[18,18]});
const pointState=i===0?'Base':done?'Concluído':active?(inspection?'Destino atual':'Ponto atual'):'Planejado';
   const popup=`<div class="maxvel-map-popup"><small>${inspection?'VISTORIA':'PONTO'} ${i===0?'BASE':i} · ${pointState}</small><strong>${escapeHtml(p.name)}</strong><span>${inspection?(i===0?'Base de partida':p.inspectionVia?'Passagem definida pelo COI':'Destino de vistoria'):(i===0?'Retorno previsto à base':`Geocerca de ${Number(p.radius)||25} m · permanência de 30 s`)}</span><em>${i>0?escapeHtml(p.instruction||'Seguir a sequência prevista'):'Ponto inicial do circuito'}</em></div>`;
   this.pointMarkers[i]=add(L.marker(latlng(p),{icon:ic,interactive:i>0,keyboard:i>0,title:i===0?undefined:inspection?p.name:`${p.name} · raio ${p.radius??25} m`}).bindPopup(popup));
  });
  const userIcon=L.divIcon({className:'map-person-host',html:'<span class="map-person-ring"><i class="map-person-dot"></i></span>',iconSize:[34,34],iconAnchor:[17,17]});
  this.positionMarker=this.positionVerified?add(L.marker(latlng(this.position),{icon:userIcon,keyboard:false,interactive:false,title:this.session?.mode==='real'?'Localização informada pelo aparelho':'Posição ilustrativa da demonstração'})):null;
  this.traceLayer=add(L.polyline(this.tracePositions.map(latlng),{color:'#55C9F5',weight:4,opacity:.9,lineCap:'round',interactive:false}));
  for(const d of this.session?.deviations??[]){
   if(!d.position)continue;
   add(L.circleMarker(latlng(d.position),{radius:9,color:'#fff',weight:3,fillColor:'#dc4557',fillOpacity:1}).bindPopup('<b>Desvio registrado</b><br>'+escapeHtml(d.pointName)+'<br><small>'+ (d.justification?'Justificativa recebida':'Justificativa pendente')+'</small>'));
  }
  this.accuracyCircle=this.positionVerified?add(L.circle(latlng(this.position),{radius:Math.max(3,Number(this.position.accuracy)||8),color:'#55C9F5',weight:1,fillColor:'#55C9F5',fillOpacity:.14,interactive:false})):null;
 }
 async loadStreetPath(){
  const epoch=++this.streetEpoch;
  this.streetRequest?.abort();
  this.streetRequest=null;this.streetPath=readOfflineStreetPath(this.route);
  if(!(this.route.inspectionMode||this.route.roadRouting))return;
  if(!this.route.baseKnown){
   this.onStreetRoute('Sem posição de partida: ative o GPS para traçar o trajeto.');
   return;
  }
  if(!this.route.points.length){
   this.onStreetRoute('Nenhum destino no mapa.');
   return;
  }
  const controller=new AbortController();this.streetRequest=controller;
  this.onStreetRoute('Calculando percurso pelas ruas…');
  const timeout=setTimeout(()=>controller.abort(),9000);
  try{
   const coordinates=await fetchInspectionStreetPath(this.route,{signal:controller.signal});
   if(this.destroyed||epoch!==this.streetEpoch||controller.signal.aborted)return;
   if(!coordinates?.length){
    this.onStreetRoute('Trajeto pelas ruas indisponível; destinos identificados no mapa.');
    return;
   }
   this.streetPath=coordinates;
   this.onStreetRoute('Percurso viário calculado · destinos numerados no mapa.');
   if(this.instance){this.refreshGeometry();this.fit();}
  }catch{
   if(!this.destroyed&&epoch===this.streetEpoch)
    this.onStreetRoute('Roteamento pelas ruas indisponível; destinos visíveis, sem linha fictícia.');
  }finally{
   clearTimeout(timeout);
   if(this.streetRequest===controller)this.streetRequest=null;
  }
 }
 setRoute(route,session=this.session){
  if(this.destroyed)return;
  const previous=routeWaypoints(this.route).map(p=>p.lat+','+p.lng).join(';'),
    next=routeWaypoints(route).map(p=>p.lat+','+p.lng).join(';');
  const changed=previous!==next||this.route.baseKnown!==route.baseKnown;
  this.route=route;this.session=session;
  if(changed&&(route.inspectionMode||route.roadRouting))this.loadStreetPath();
  if(this.instance){this.refreshGeometry();this.fit();}
  else this.showFallback();
 }
 update({session=this.session,position=this.position}={}){
  if(this.destroyed)return;const indexWas=this.session?.index,statusWas=this.session?.status;this.session=session;this.position=position??this.route.base;
  if(!this.positionVerified&&position&&(this.route.inspectionMode||this.route.roadRouting)){
   this.positionVerified=true;this.tracePositions=[position];
   if(this.instance)this.refreshGeometry();
   else this.showFallback();
   return;
  }
  if(this.instance){if(indexWas!==session?.index||statusWas!==session?.status)this.refreshGeometry();
   else{this.positionMarker?.setLatLng(latlng(this.position));this.accuracyCircle?.setLatLng(latlng(this.position));this.accuracyCircle?.setRadius(Math.max(3,Number(this.position.accuracy)||8));this.updateTrace();}this.followNavigation();}
  else{const holder=this.container?.querySelector('.map-fallback');if(holder)holder.innerHTML=fallbackSVG(this.route,session,this.position,!this.standbyClean||!!session,this.positionVerified,this.fallbackViewport());}
 }
 followNavigation(){
  if(!window.__RONDA_ANDROID_BUNDLE__||!this.instance||this.destroyed||this.session?.status!=='active'||!this.positionVerified)return;
  if(!this.position||!Number.isFinite(this.position.lat)||!Number.isFinite(this.position.lng))return;
  const now=Date.now();if(now-this.lastNavigationAt<750)return;this.lastNavigationAt=now;
  const map=this.instance;
  map.panTo(latlng(this.position),{animate:true,duration:.5});
  if(map.getZoom()<16)map.setZoom(17,{animate:false});
  if(Number.isFinite(this.lastHeading)){
   if(typeof map.setHeading==='function')map.setHeading(this.lastHeading,{ease:.22,deadzone:1});
   else if(typeof map.setBearing==='function')map.setBearing(-this.lastHeading);
  }
  const next=this.route.points?.[Math.max(0,this.session.index||0)];
  if(!next||!Number.isFinite(this.lastHeading))return;
  const from=this.position;
  const deltaLon=(next.lng-from.lng)*Math.PI/180;
  const lat1=from.lat*Math.PI/180,lat2=next.lat*Math.PI/180;
  const destination=(Math.atan2(Math.sin(deltaLon)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(deltaLon))*180/Math.PI+360)%360;
  const difference=((destination-this.lastHeading+540)%360)-180;
  const instruction=Math.abs(difference)>145?'Sentido contrário':Math.abs(difference)<27?'Direção correta':difference>0?'Vire à direita':'Vire à esquerda';
  let note=this.container.querySelector('.ronda-native-heading-note');
  if(!note){note=document.createElement('output');note.className='ronda-native-heading-note';note.setAttribute('role','status');
   note.style.cssText='position:absolute;bottom:15px;left:15px;z-index:600;padding:10px 13px;border:1px solid #ffffff25;border-radius:12px;background:#111a21ed;color:#f5f8fc;font:650 13px system-ui;pointer-events:none';this.container.append(note);}
  note.textContent=instruction+' · '+Math.abs(Math.round(difference))+'°';
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
  if(!p)return false;
  if(!this.instance){if(!this.destroyed){this.pendingFocus=index;return true;}return false;}
  this.pendingFocus=null;
  this.instance.invalidateSize(false);
  this.instance.flyTo(latlng(p),Math.max(17,Math.min(18,this.instance.getZoom())),{animate:true,duration:0.4});
  this.pointMarkers[index+1]?.openPopup();
  return true;
 }
 mapViewPadding(){
  if(!this.route.inspectionMode)return {padding:[45,45],maxZoom:18};
  const h=this.container?.clientHeight||500;
  return {paddingTopLeft:[24,Math.min(135,Math.round(h*.25))],paddingBottomRight:[24,Math.min(245,Math.round(h*.39))],maxZoom:17};
 }
 center(){if(this.instance)this.instance.panTo(latlng(this.position),{animate:true});}
 fit(){if(!this.instance){if(!this.destroyed)this.pendingFit=true;return;}this.pendingFit=false;if(this.standbyClean&&!this.session){this.instance.panTo(latlng(this.position));return;}const b=routeBounds(this.route);this.instance.fitBounds((this.route.inspectionMode||this.route.roadRouting)&&this.streetPath?.length>1?this.streetPath.map(latlng):[[b.minLat,b.minLng],[b.maxLat,b.maxLng]],this.mapViewPadding());}
 invalidate(){this.instance?.invalidateSize(false)}
 destroy(){
  this.destroyed=true;this.streetEpoch++;this.streetRequest?.abort();if(this.headingListener&&typeof window!=='undefined')window.removeEventListener?.('rondapro:native-heading',this.headingListener);
  clearTimeout(this.tileFallbackTimer);
  const map=this.instance;this.instance=null;
  if(map){try{map.stop();map.off();map.remove();}catch{}}
  this.liveLayer=null;
  if(this.container)this.container.innerHTML='';
 }
}
