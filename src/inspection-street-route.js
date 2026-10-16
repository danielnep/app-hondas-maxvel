import {routeWaypoints} from './domain.js';

/** Serviço comunitário de roteamento, sem chave nem custo por chamada.
 * Um servidor público pode ficar indisponível: a geometria indicativa segue
 * sendo exibida sem afirmar que percorre ruas.
 */
export const STREET_ROUTE_ENDPOINTS=[
 'https://router.project-osrm.org/route/v1/driving/',
 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'
];
export function inspectionRoutingStops(route,maxPoints=24){
 if(!route?.inspectionMode||!route.baseKnown||!route.points?.length)return [];
 const planned=routeWaypoints(route).filter(p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng));
 if(planned.length<2)return [];
 if(planned.length<=maxPoints)return planned;
 // Pontos intermediários são dispensáveis para uma consulta muito longa;
 // destinos reais NUNCA são descartados do circuito.
 const essentials=[route.base,...route.points];
 return essentials.length<=maxPoints?essentials:[];
}
export function streetRouteUrl(points,endpoint=STREET_ROUTE_ENDPOINTS[0]){
 if(!points?.length||points.length<2)throw Error('Rota sem origem e destino');
 const coords=points.map(p=>{
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180)throw Error('Coordenadas inválidas');
  return p.lng.toFixed(6)+','+p.lat.toFixed(6);
 }).join(';');
 return endpoint+coords+'?overview=full&geometries=geojson&steps=false';
}
export function parseStreetRoute(body){
 const line=body?.routes?.[0]?.geometry?.coordinates;
 if(body?.code!=='Ok'||!Array.isArray(line)||line.length<2||line.length>250000)throw Error('Geometria viária indisponível');
 const points=line.map(c=>({lat:Number(c?.[1]),lng:Number(c?.[0])}));
 if(points.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180))throw Error('Geometria viária inválida');
 return points;
}
export async function fetchInspectionStreetPath(route,{fetcher=fetch,signal}={}){
 const points=inspectionRoutingStops(route);
 if(!points.length)return null;
 let lastError;
 for(const endpoint of STREET_ROUTE_ENDPOINTS){
  if(signal?.aborted)throw Error('Consulta cancelada');
  try{
   const response=await fetcher(streetRouteUrl(points,endpoint),{signal,mode:'cors'});
   if(!response.ok)throw Error('Servidor viário: HTTP '+response.status);
   return parseStreetRoute(await response.json());
  }catch(e){
   if(signal?.aborted)throw e;
   lastError=e;
  }
 }
 throw lastError||Error('Sem serviço de roteamento');
}
