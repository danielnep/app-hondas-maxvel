import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchRoadItinerary,streetRouteUrl,STREET_ROUTE_ENDPOINTS} from '../src/inspection-street-route.js';
import {readFileSync} from 'node:fs';

const stops=[{lat:-20.1437,lng:-44.8906},{lat:-20.1471,lng:-44.8761},{lat:-20.15,lng:-44.87}];
const answer={code:'Ok',routes:[{distance:4150,duration:650,geometry:{type:'LineString',
 coordinates:[[-44.8906,-20.1437],[-44.8893,-20.1418],[-44.88,-20.141],[-44.8761,-20.1471],[-44.872,-20.147],[-44.87,-20.15]]}}]};
test('OSRM usa ordem dos destinos, retorna curvas, distância e tempo reais do servidor',async()=>{
 let requested='';
 const itinerary=await fetchRoadItinerary(stops,{fetcher:async url=>{requested=url;return {ok:true,json:async()=>answer}}});
 assert.match(requested,/-44\.890600,-20\.143700;-44\.876100,-20\.147100;-44\.870000,-20\.150000/);
 assert.match(requested,/overview=full&geometries=geojson/);
 assert.equal(itinerary.path.length,6);
 assert.deepEqual(itinerary.path[1],{lat:-20.1418,lng:-44.8893});
 assert.equal(itinerary.distanceMeters,4150);
 assert.equal(itinerary.durationSeconds,650);
});
test('falha no primeiro roteador tenta segundo; falha total jamais vira linha reta',async()=>{
 const used=[];
 const route=await fetchRoadItinerary(stops.slice(0,2),{fetcher:async url=>{
  used.push(url);
  if(used.length===1)throw Error('offline');
  return {ok:true,json:async()=>answer};
 }});
 assert.equal(used.length,2);
 assert.ok(used[1].startsWith(STREET_ROUTE_ENDPOINTS[1]));
 assert.equal(route.path.length,6);
 await assert.rejects(fetchRoadItinerary(stops.slice(0,2),{fetcher:async()=>({ok:false,status:503})}),/HTTP 503/);
});
test('nenhum destino inválido ou rota sem geometria pode renderizar',async()=>{
 await assert.rejects(fetchRoadItinerary([{lat:0,lng:0},{lat:900,lng:0}]),/Coordenadas inválidas/);
 await assert.rejects(fetchRoadItinerary(stops.slice(0,2),{fetcher:async()=>({ok:true,json:async()=>({code:'NoRoute',routes:[]})})}),/Geometria viária indisponível/);
 assert.throws(()=>streetRouteUrl([]),/Rota sem origem/);
});
test('despacho, planejador e vigia não unem pontos reais por linha reta',()=>{
 const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const dispatch=source('src/dispatch-wizard.js'),planner=source('src/route-planner.js'),field=source('src/map.js');
 for(const s of [dispatch,planner]){assert.match(s,/fetchRoadItinerary/);assert.match(s,/road\.path\.map/);}
 assert.doesNotMatch(dispatch,/L\.polyline\(line/);
 assert.doesNotMatch(planner,/L\.polyline\(line/);
 assert.match(field,/this\.streetPath\?\.length>1\?this\.streetPath:\[\]/);
});
