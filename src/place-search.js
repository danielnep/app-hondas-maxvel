// Busca real compartilhada. O foco é GPS recebido ou centro explícito do mapa, nunca uma posição fabricada.
export const validPlace=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
export const normalizePlaceText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
export function placeDistance(a,b){
 if(!validPlace(a)||!validPlace(b))return null;
 const rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function distanceLabel(meters){return Number.isFinite(meters)?meters<1000?Math.round(meters)+' m':(meters/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' km':'';}
export function rankPlaces(items,focus){
 const unique=new Map();
 for(const p of items||[]){
  if(!validPlace(p)||!String(p.name||p.address||'').trim())continue;
  const distanceMeters=placeDistance(focus,p),key=normalizePlaceText((p.name||'')+'|'+(p.address||''));
  const next={...p,distanceMeters},old=unique.get(key);
  if(!old||(Number.isFinite(distanceMeters)&&distanceMeters<old.distanceMeters))unique.set(key,next);
 }
 return [...unique.values()].sort((a,b)=>Number.isFinite(a.distanceMeters)&&Number.isFinite(b.distanceMeters)?a.distanceMeters-b.distanceMeters:0);
}
let lastPosition=null,locationPromise=null;
export function searchFocus(position=null,map=null){
 if(validPlace(position))return {...position,source:position.source||'gps'};
 const native=globalThis.__rondaNativeFix;
 if(validPlace(native)&&(!native.at||Date.now()-native.at<300000))return {...native,source:'gps'};
 if(validPlace(lastPosition)&&Date.now()-lastPosition.at<300000)return lastPosition;
 if(map&&typeof map.getCenter==='function'&&map._loaded!==false){try{const c=map.getCenter();if(validPlace(c))return {lat:c.lat,lng:c.lng,source:'map'};}catch{}}
 return null;
}
export async function requestSearchFocus({fallback=null,timeout=4000}={}){
 const current=searchFocus();if(current)return current;
 if(!globalThis.navigator?.geolocation)return validPlace(fallback)?fallback:null;
 if(!locationPromise)locationPromise=new Promise(resolve=>{
  let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)};
  const timer=setTimeout(()=>finish(null),timeout+250);
  navigator.geolocation.getCurrentPosition(p=>{const value={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at:p.timestamp||Date.now(),source:'gps'};if(validPlace(value))lastPosition=value;finish(validPlace(value)?value:null)},()=>finish(null),{enableHighAccuracy:true,maximumAge:60000,timeout});
 }).finally(()=>{locationPromise=null});
 return await locationPromise||(validPlace(fallback)?fallback:null);
}
function photonPoint(f){
 const p=f.properties||{},c=f.geometry?.coordinates||[];
 const parts=[p.name,p.street,p.housenumber,p.district||p.suburb,p.city||p.county,p.state,p.country].filter(Boolean);
 const address=[...new Set(parts)].join(', ');
 return {name:String(p.name||p.street||'Local'),address,lat:Number(c[1]),lng:Number(c[0])};
}
export async function searchPlaces(query,{focus=null,signal,limit=10,fetcher=globalThis.fetch}={}){
 const text=String(query||'').trim();if(text.length<3)return [];
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,9000);
 const lookup=async(q,nearOnly=false)=>{
  const url=new URL('https://photon.komoot.io/api/');url.search=new URLSearchParams({q,limit:'20',lang:'default',countrycode:'BR'});
  if(validPlace(focus)){
   url.searchParams.set('lat',focus.lat);url.searchParams.set('lon',focus.lng);url.searchParams.set('zoom','13');url.searchParams.set('location_bias_scale','0.1');
   if(nearOnly){const dLat=.35,dLng=.35/Math.max(.2,Math.cos(focus.lat*Math.PI/180));url.searchParams.set('bbox',[Math.max(-180,focus.lng-dLng),Math.max(-90,focus.lat-dLat),Math.min(180,focus.lng+dLng),Math.min(90,focus.lat+dLat)].join(','));}
  }
  const response=await fetcher(url.href,{headers:{Accept:'application/json'},signal:controller.signal});
  if(!response.ok)throw new Error('Pesquisa de locais indisponível ('+response.status+')');
  return ((await response.json()).features||[]).map(photonPoint).filter(validPlace);
 };
 try{
  let items=await lookup(text);
  // Vias podem estar cadastradas com outro tipo (Rua/Avenida). Mantém o nome real retornado e exige seleção.
  const streetName=text.replace(/^(?:avenida|av\.?|rua|r\.|rodovia|travessa|alameda|praça|praca)\s+/i,'').trim();
  if(validPlace(focus)&&streetName!==text&&streetName.length>=3){try{items=[...items,...await lookup(streetName,true)]}catch(error){if(controller.signal.aborted)throw error;}}
  return rankPlaces(items,focus).slice(0,limit);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
