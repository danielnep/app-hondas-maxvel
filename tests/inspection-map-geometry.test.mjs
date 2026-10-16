import test from 'node:test';
import assert from 'node:assert/strict';
import {routeWaypoints,routeLeg} from '../src/domain.js';
import {fallbackSVG} from '../src/map.js';
import {inspectionRoute} from '../src/inspection-queue.js';
import {inspectionRoutingStops,streetRouteUrl,parseStreetRoute,fetchInspectionStreetPath} from '../src/inspection-street-route.js';

const base={lat:-20.1403,lng:-44.884};
const one={id:'X',kind:'vistoria',latitude:-20.145,longitude:-44.889,address:'Local X'};
const two={id:'Y',kind:'vistoria',latitude:-20.15,longitude:-44.891,address:'Local Y',route_points:JSON.stringify([{lat:-20.149,lng:-44.89}])};
const three={id:'Z',kind:'vistoria',latitude:-20.16,longitude:-44.9,address:'Local Z'};
const positions=route=>routeWaypoints(route).map(p=>[p.lat,p.lng]);

test('uma vistoria desenha B → 1, sem encerrar voltando à base',()=>{
 const route=inspectionRoute([one],base),points=positions(route);
 assert.equal(route.points.length,1);
 assert.deepEqual(points,[[base.lat,base.lng],[-20.145,-44.889]]);
 assert.equal(routeLeg(route,0).length,2);
 const svg=fallbackSVG(route,{mode:'simulation',currentId:'X'},base);
 assert.match(svg,/polyline points="/);
 assert.match(svg,/>1<\/text>/);
 assert.doesNotMatch(svg,/>2<\/text>/);
});

test('três vistorias desenham B → 1 → passagem → 2 → 3; sem ponto 4 e sem volta',()=>{
 const route=inspectionRoute([one,two,three],base);
 assert.equal(route.points.length,3);
 assert.deepEqual(route.points.map(p=>p.id),['X','Y','Z']);
 assert.deepEqual(route.legs.map(leg=>leg.length),[0,1,0]);
 assert.deepEqual(positions(route),[
 [base.lat,base.lng],[-20.145,-44.889],[-20.149,-44.89],[-20.15,-44.891],[-20.16,-44.9]
 ]);
 const svg=fallbackSVG(route,{mode:'simulation',currentId:'X'},base);
 assert.match(svg,/>1<\/text>/);
 assert.match(svg,/>2<\/text>/);
 assert.match(svg,/>3<\/text>/);
 assert.doesNotMatch(svg,/>4<\/text>/);
 assert.deepEqual(positions(route).at(-1),[-20.16,-44.9]);
});

test('fallback da vistoria acompanha viewport vertical e não comprime o mapa',()=>{
 const route=inspectionRoute([one,two,three],base);
 const portrait=fallbackSVG(route,{mode:'simulation',currentId:'X'},base,true,true,{width:390,height:620});
 assert.match(portrait,/viewBox="0 0 390 620"/);
 assert.match(portrait,/rect width="390" height="620"/);
 const px=[...portrait.matchAll(/<polyline points="([^"]*)"/g)][0]?.[1];
 assert.ok(px&&px.trim().split(/\s+/).length>=4,'linha contínua entre todos os destinos em retrato');
 const ys=px.trim().split(/\s+/).map(p=>Number(p.split(',')[1]));
 assert.ok(ys.every(y=>y>=130&&y<=380),'números e rota ficam entre painel superior e comandos inferiores');
});

test('ronda convencional mantém retorno à base e ordem anterior',()=>{
 const ronda={base,points:[{lat:-20.142,lng:-44.885},{lat:-20.144,lng:-44.886}],legs:[]};
 assert.deepEqual(positions(ronda),[[base.lat,base.lng],[-20.142,-44.885],[-20.144,-44.886],[base.lat,base.lng]]);
});

test('não inventa saída para uma vistoria se GPS/base não existir',()=>{
 const route=inspectionRoute([one]);
 assert.equal(route.baseKnown,false);
 assert.equal(inspectionRoutingStops(route).length,0);
 assert.equal(route.points.length,1);
});

test('consulta por ruas preserva a sequência dos destinos e passagens',()=>{
 const route=inspectionRoute([one,two],base);
 const stops=inspectionRoutingStops(route);
 assert.equal(stops.length,4);
 const url=streetRouteUrl(stops);
 assert.match(url,/route\/v1\/driving/);
 assert.match(url,/overview=full&geometries=geojson/);
 assert.ok(url.indexOf('-44.889000,-20.145000')<url.indexOf('-44.890000,-20.149000'));
});

test('geom. GeoJSON são convertidas para Leaflet e falhas usam fallback, sem inventar vias',async()=>{
 const route=inspectionRoute([one],base);
 const sample={code:'Ok',routes:[{geometry:{coordinates:[[-44.884,-20.1403],[-44.886,-20.143],[-44.889,-20.145]]}}]};
 assert.deepEqual(parseStreetRoute(sample),[{lat:-20.1403,lng:-44.884},{lat:-20.143,lng:-44.886},{lat:-20.145,lng:-44.889}]);
 let calls=0;
 const path=await fetchInspectionStreetPath(route,{fetcher:async()=>{calls++;return {ok:true,json:async()=>sample}}});
 assert.equal(calls,1);
 assert.equal(path.length,3);
 await assert.rejects(fetchInspectionStreetPath(route,{fetcher:async()=>{throw Error('offline')}}));
});
