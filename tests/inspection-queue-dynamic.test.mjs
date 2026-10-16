import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pointOf,metersBetween,queueInspections,inspectionRoute,inspectionSignature} from '../src/inspection-queue.js';
import {inspectionCockpit,inspectionStops} from '../src/inspection-cockpit.js';

const task=(id,lat,lng,opts={})=>({id,kind:'vistoria',address:'Unidade '+id,created_at:Number(id.replace(/\D/g,''))||1,latitude:lat,longitude:lng,...opts});
test('trajeto ordena alvos pela proximidade do ponto atual, não pela hora de criação',()=>{
 const start={lat:-20.14,lng:-44.88};
 const a=task('1',-20.165,-44.88),b=task('2',-20.1405,-44.8805),c=task('3',-20.145,-44.881);
 assert.deepEqual(queueInspections([a,c,b],start).map(x=>x.id),['2','3','1']);
 assert.ok(metersBetween(start,b)<metersBetween(start,a));
});
test('a visita já iniciada continua primeiro quando o COI acrescenta novas',()=>{
 const start={lat:-20.14,lng:-44.88};
 const active=task('1',-20.15,-44.88,{started_at:1000});
 const near=task('2',-20.1501,-44.8801),far=task('3',-20.17,-44.9);
 assert.deepEqual(queueInspections([far,near,active],start).map(x=>x.id),['1','2','3']);
 assert.deepEqual(queueInspections([far,near,active],{lat:-20.14,lng:-44.88}).map(x=>x.id),['1','2','3']);
});
test('não inventa GPS ou a posição de destinos sem coordenadas',()=>{
 assert.equal(pointOf({latitude:null,longitude:null}),null);
 assert.equal(pointOf({}),null);
 assert.equal(metersBetween({lat:0,lng:0},{address:'X'}),Infinity);
 const unresolved=task('3',null,null),near=task('2',-20.14,-44.88);
 assert.deepEqual(queueInspections([unresolved,near],{lat:-20.1401,lng:-44.8801}).map(x=>x.id),['2','3']);
 const route=inspectionRoute([near,unresolved],{lat:-20.141,lng:-44.882});
 assert.equal(route.points.length,1);
 assert.equal(route.inspectionMode,true);
});
test('rota cartográfica mantém base, pontos intermediários e todos os destinos',()=>{
 const route=inspectionRoute([task('1',-20.145,-44.89,{route_points:JSON.stringify([{lat:-20.144,lng:-44.888}])}),task('2',-20.15,-44.9)],{lat:-20.14,lng:-44.88});
 assert.equal(route.points.length,2,'passagens do COI não viram destinos numerados');
 assert.equal(route.legs[0].length,1,'passagem integra geometria até o destino 1');
 assert.equal(route.points[0].name,'Unidade 1');
 assert.equal(route.points[1].name,'Unidade 2');
 assert.equal(route.base.lat,-20.14);
});
test('cockpit preserva mapa da ronda e sequência visual, mas restringe laudo à chegada',()=>{
 const row=task('1',-20.14,-44.88);
 const idle=inspectionCockpit({mapId:'inspection-map'});
 assert.match(idle,/id="inspection-map"/);
 assert.match(idle,/patrol-workspace/);
 assert.match(idle,/Aguardando solicitações|Nenhuma vistoria pendente/);
 const pending=inspectionCockpit({mapId:'inspection-map',queue:[row],mode:'real'});
 assert.match(pending,/data-inspection-depart/);
 assert.doesNotMatch(pending,/id="inspection-form"/);
 const started=inspectionCockpit({mapId:'inspection-map',queue:[{...row,started_at:123}],mode:'real'});
 assert.match(started,/data-inspection-arrive/);
 const arrived=inspectionCockpit({mapId:'inspection-map',queue:[{...row,started_at:123,arrived_at:124}],mode:'real'});
 assert.match(arrived,/Abrir checklist/);
 assert.match(inspectionStops([row,task('2',-20.15,-44.89)]),/2<\/span>/);
 assert.notEqual(inspectionSignature([row]),inspectionSignature([{...row,arrived_at:123}]));
});
test('acesso real, demonstração e cache carregam o mesmo cockpit',()=>{
 const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const app=file('src/app.js'),central=file('src/central.js');
 const map=file('src/map.js'),server=file('server/ops-center.js');
 const html=file('index.html'),auth=file('central.html'),worker=file('sw.js');
 for(const s of [app,central])assert.match(s,/inspectionCockpit/);
 assert.match(map,/this\.route\.inspectionMode/);
 assert.match(central,/refreshInspectorStops/);
 assert.match(server,/kind==='vistoria'&&w\.status==='Em vistoria'/);
 assert.match(server,/inspection\.arrive/);
 assert.match(html,/inspector-cockpit-20261016\.css/);
 assert.match(auth,/inspector-cockpit-20261016\.css/);
 assert.match(worker,/src\/inspection-queue\.js/);
});
