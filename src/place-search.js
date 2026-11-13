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
export const LEARNED_PLACES_STORAGE_KEY = 'rondas-pro-learned-places';

export const INITIAL_RECURRENT_COMPANIES = [
 {
  name: 'Base Operacional Maxvel',
  address: 'Av. Amazonas, 1200, Centro Industrial, Divinópolis',
  lat: -20.14030,
  lng: -44.88400,
  type: 'company',
  count: 15,
  lastUsed: Date.now() - 3600000,
  isRecurrent: true
 },
 {
  name: 'Galpão Logístico Maxvel Sul',
  address: 'Rodovia Fernão Dias, km 490, Betim',
  lat: -20.14500,
  lng: -44.88800,
  type: 'company',
  count: 9,
  lastUsed: Date.now() - 7200000,
  isRecurrent: true
 },
 {
  name: 'Centro Empresarial Savassi Tower',
  address: 'Av. do Contorno, 6500, Savassi, Belo Horizonte',
  lat: -19.93850,
  lng: -43.93520,
  type: 'company',
  count: 7,
  lastUsed: Date.now() - 14400000,
  isRecurrent: true
 },
 {
  name: 'Posto Petrobras Express 24h',
  address: 'Av. Brasil, 100, Funcionários, Belo Horizonte',
  lat: -19.92080,
  lng: -43.93780,
  type: 'company',
  count: 6,
  lastUsed: Date.now() - 86400000,
  isRecurrent: true
 }
];

export function calculateFrecency(record, now = Date.now()) {
 const lastUsed = Number(record.lastUsed) || now;
 const hoursAgo = Math.max(0, (now - lastUsed) / (1000 * 60 * 60));
 let recencyWeight = 20;
 if (hoursAgo < 4) recencyWeight = 100;
 else if (hoursAgo < 24) recencyWeight = 80;
 else if (hoursAgo < 72) recencyWeight = 60;
 else if (hoursAgo < 168) recencyWeight = 40;
 const count = Math.max(1, Number(record.count) || 1);
 const frequencyScore = Math.min(200, count * 18 * Math.log2(1 + count));
 return (recencyWeight * 0.8) + frequencyScore;
}

export function getLearnedPlaces({query = '', limit = 6, focus = null, now = Date.now()} = {}) {
 let list = [];
 try {
  const raw = globalThis.localStorage?.getItem(LEARNED_PLACES_STORAGE_KEY);
  list = raw ? JSON.parse(raw) : [];
 } catch {
  list = [];
 }
 if (!Array.isArray(list) || !list.length) {
  list = [...INITIAL_RECURRENT_COMPANIES];
 }
 const scored = list.filter(validPlace).map(item => {
  const distanceMeters = placeDistance(focus, item);
  const frecency = calculateFrecency(item, now);
  const count = Number(item.count) || 1;
  const isRecurrent = count >= 2 || frecency >= 50;
  return {
   ...item,
   distanceMeters,
   frecency,
   isRecurrent
  };
 });

 const q = normalizePlaceText(query);
 if (!q) {
  return scored
   .sort((a, b) => (b.frecency - a.frecency) || ((a.distanceMeters || 999999) - (b.distanceMeters || 999999)))
   .slice(0, limit);
 }

 const matched = scored.filter(item => {
  const n = normalizePlaceText(item.name || '');
  const a = normalizePlaceText(item.address || '');
  return n.includes(q) || a.includes(q);
 });

 return matched
  .map(item => {
   const n = normalizePlaceText(item.name || '');
   const boost = n.startsWith(q) ? 50 : 0;
   return {...item, frecency: item.frecency + boost};
  })
  .sort((a, b) => (b.frecency - a.frecency) || ((a.distanceMeters || 999999) - (b.distanceMeters || 999999)))
  .slice(0, limit);
}

export function recordLearnedPlace(place, {now = Date.now()} = {}) {
 if (!validPlace(place)) return null;
 const name = String(place.name || place.address || 'Local').trim();
 const address = String(place.address || place.name || '').trim();
 const key = normalizePlaceText(name + '|' + address);

 let list = [];
 try {
  const raw = globalThis.localStorage?.getItem(LEARNED_PLACES_STORAGE_KEY);
  list = raw ? JSON.parse(raw) : [...INITIAL_RECURRENT_COMPANIES];
 } catch {
  list = [...INITIAL_RECURRENT_COMPANIES];
 }
 if (!Array.isArray(list)) list = [...INITIAL_RECURRENT_COMPANIES];

 const existingIndex = list.findIndex(p => {
  const itemKey = normalizePlaceText((p.name || '') + '|' + (p.address || ''));
  if (itemKey === key) return true;
  const d = placeDistance(p, place);
  return Number.isFinite(d) && d <= 25;
 });

 const isCompany = place.isCompany || /(empresa|ltda|s\.?a|loja|mercado|shopping|hospital|clinica|posto|banco|comercio|restaurante|farmacia|hotel|condominio|galpao|industria|centro|distribuidora|transportadora|seguran[cç]a)/i.test(name + ' ' + address);

 let updatedRecord;
 if (existingIndex >= 0) {
  const prev = list[existingIndex];
  const count = (Number(prev.count) || 1) + 1;
  updatedRecord = {
   ...prev,
   name: name || prev.name,
   address: address || prev.address,
   lat: place.lat,
   lng: place.lng,
   type: isCompany ? 'company' : (prev.type || 'address'),
   count,
   lastUsed: now,
   isRecurrent: true
  };
  list[existingIndex] = updatedRecord;
 } else {
  updatedRecord = {
   name,
   address,
   lat: place.lat,
   lng: place.lng,
   type: isCompany ? 'company' : 'address',
   count: 1,
   firstUsed: now,
   lastUsed: now,
   isRecurrent: false
  };
  list.unshift(updatedRecord);
 }

 try {
  list.sort((a, b) => calculateFrecency(b, now) - calculateFrecency(a, now));
  const trimmed = list.slice(0, 60);
  globalThis.localStorage?.setItem(LEARNED_PLACES_STORAGE_KEY, JSON.stringify(trimmed));
 } catch {}

 return updatedRecord;
}

export async function searchPlacesWithLearned(query, {focus = null, signal, limit = 8, fetcher = globalThis.fetch} = {}) {
 const text = String(query || '').trim();
 const learned = getLearnedPlaces({query: text, limit: 4, focus});
 if (text.length < 3) {
  return learned.slice(0, limit);
 }
 try {
  const remote = await searchPlaces(text, {focus, signal, limit: 10, fetcher});
  const merged = [...learned];
  const seenKeys = new Set(learned.map(p => normalizePlaceText((p.name || '') + '|' + (p.address || ''))));
  for (const r of remote) {
   const k = normalizePlaceText((r.name || '') + '|' + (r.address || ''));
   if (!seenKeys.has(k)) {
    seenKeys.add(k);
    merged.push(r);
   }
  }
  return rankPlaces(merged, focus).slice(0, limit);
 } catch (err) {
  if (learned.length) return learned.slice(0, limit);
  throw err;
 }
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
