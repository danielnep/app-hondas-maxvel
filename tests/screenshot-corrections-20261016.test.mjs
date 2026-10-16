import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectionPlanPoints} from '../src/inspection-route-map.js';
import {DEMO_ROUTE} from '../src/domain.js';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/maxvel-print-qa-20261016.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const central=readFileSync(new URL('../central.html',import.meta.url),'utf8');

test('vistoria de demonstração inclui base, passagens e destino; não usa mapa mundial',()=>{
 const points=inspectionPlanPoints({
  routePoints:[{lat:-20.1407,lng:-44.8836}],
  latitude:-20.1411,longitude:-44.8833
 },{demo:true});
 assert.deepEqual(points,[
  [DEMO_ROUTE.base.lat,DEMO_ROUTE.base.lng],
  [-20.1407,-44.8836],
  [-20.1411,-44.8833]
 ]);
 const idle=inspectionPlanPoints(null,{demo:true});
 assert.deepEqual(idle,[[DEMO_ROUTE.base.lat,DEMO_ROUTE.base.lng]]);
});
test('operação real não inventa uma base que o COI não configurou',()=>{
 assert.deepEqual(inspectionPlanPoints({
  latitude:-20.15,longitude:-44.89,route_points:'[]'
 }),[[-20.15,-44.89]]);
 assert.deepEqual(inspectionPlanPoints({
  base_latitude:-20.14,base_longitude:-44.88,latitude:-20.15,longitude:-44.89
 }),[[-20.14,-44.88],[-20.15,-44.89]]);
});
test('CSS corretivo ocupa a última camada em ambos os acessos',()=>{
 const asset='assets/maxvel-print-qa-20261016.css';
 assert.ok(index.includes(asset)&&central.includes(asset));
 assert.ok(index.indexOf(asset)>index.indexOf('maxvel-field-refinement-20261016.css'));
 assert.ok(central.indexOf(asset)>central.indexOf('maxvel-field-refinement-20261016.css'));
 assert.match(css,/\.v4-alerts-list>\.event-item[\s\S]*?max-height:none!important/);
 assert.match(css,/\.rp-history-list \.rp-history-entry[\s\S]*?border:1px solid/);
});
test('histórico da demo só aceita exclusão por administrador e confirmação',()=>{
 assert.match(source,/user\?\.role==='admin'/);
 assert.match(source,/demo-history-delete-selected/);
 assert.match(source,/demo-history-delete-all/);
 assert.match(source,/window\.confirm\('Apagar '/);
 assert.match(source,/rondas-pro-demo-history-edited/);
 assert.match(source,/localStorage\.setItem\(DEMO_INSPECTIONS/);
});
test('mensagens no cabeçalho abrem direto o chat',()=>{
 assert.match(source,/aria-label="Abrir chat interno"/);
 assert.doesNotMatch(source,/<strong>Chat interno<\/strong><p>Conversa com o COI neste cenário/);
});
