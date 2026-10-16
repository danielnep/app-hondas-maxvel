import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGuardRoute} from '../src/field-guard-circuit.js';
import {inspectionRoutingStops,streetRouteUrl,fetchInspectionStreetPath} from '../src/inspection-street-route.js';

const assigned={id:'ronda-1',name:'Ronda de campo',points:[
 {lat:-20.14045,lng:-44.8802,name:'Portaria'},
 {lat:-20.1408,lng:-44.88065,name:'Docas'}
]};
const base={lat:-20.14,lng:-44.88};

test('rota do vigia inclui ruas e retorno à base, sem transformar ponto de visita em base fictícia',()=>{
 const route=buildGuardRoute(assigned,base),stops=inspectionRoutingStops(route);
 assert.equal(route.roadRouting,true);
 assert.equal(route.baseKnown,true);
 assert.equal(stops.length,4);
 assert.deepEqual({lat:stops[0].lat,lng:stops[0].lng},base);
 assert.deepEqual(stops[1],{lat:-20.14045,lng:-44.8802,id:'point-0',name:'Portaria',instruction:'Verificar o ponto.',radius:35});
 assert.deepEqual({lat:stops.at(-1).lat,lng:stops.at(-1).lng},base);
 assert.ok(streetRouteUrl(stops).includes('route/v1/driving/'));
 const unknown=buildGuardRoute(assigned,null);
 assert.equal(unknown.baseKnown,false);
 assert.deepEqual(inspectionRoutingStops(unknown),[]);
});

test('geometria real é consultada sem confundir linha indicativa com ruas',async()=>{
 const route=buildGuardRoute(assigned,base);
 let requestedUrl='';
 const points=await fetchInspectionStreetPath(route,{fetcher:async url=>{
  requestedUrl=url;
  return {ok:true,json:async()=>({code:'Ok',routes:[{geometry:{coordinates:[
   [-44.88,-20.14],[-44.8802,-20.14045],[-44.88065,-20.1408],[-44.88,-20.14]
  ]}}]})};
 }});
 assert.match(requestedUrl,/overview=full/);
 assert.equal(points.length,4);
 assert.deepEqual(points.at(-1),base);
});

test('mapa real habilita percurso viário também para ronda e informa indisponibilidade',()=>{
 const map=readFileSync(new URL('../src/map.js',import.meta.url),'utf8');
 const central=readFileSync(new URL('../src/central.js',import.meta.url),'utf8');
 assert.match(map,/this\.route\.inspectionMode\|\|this\.route\.roadRouting/);
 assert.match(central,/onStreetRoute:status=>/);
 assert.match(central,/data-guard-road/);
 assert.match(central,/guardMap\.setRoute\(revised,null\)/);
 assert.match(map,/this\.route\.inspectionMode\|\|this\.route\.roadRouting/);
 assert.doesNotMatch(central,/guardRound\?\.base\|\|guardFix\|\|planned\.points\?\.\[0\]/);
});
