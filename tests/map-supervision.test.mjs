import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const map=readFileSync(new URL('../src/map.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/horizon-operacional.css',import.meta.url),'utf8');

test('supervisão tem destino Rondas com agenda principal e aba de mapa operacional',()=>{
 assert.match(app,/\['rondas','Rondas','map'\]/);
 assert.match(app,/scheduleTab==='mapa'/);
 assert.match(app,/data-action="schedule-tab"/);
 const begin=app.indexOf('function rondas(){'),end=app.indexOf('\nfunction ',begin+1),section=app.slice(begin,end);
 assert.ok(begin>0&&end>begin);
 assert.ok(section.indexOf('id="ops-map"')>=0);
 assert.ok(section.indexOf('id="ops-map"')<section.indexOf('Histórico de rondas'),'o mapa deve vir antes da tabela');
 assert.match(section,/map-point-list/);
 assert.match(section,/focus-route-point/);
 assert.match(section,/cartografia real|Ruas reais quando online/);
});

test('mapa não confunde linha de cenário com trajeto roteado por ruas',()=>{
 assert.match(app,/a linha entre os pontos é apenas ilustrativa/);
 assert.match(app,/Traçado ilustrativo/);
 assert.match(app,/Posição percorrida/);
 assert.match(map,/INTERMEDIATE WAYPOINTS/);
 assert.match(map,/routeWaypoints\(this\.route\)/);
 assert.match(map,/OpenStreetMap contributors/);
 assert.match(map,/focusPoint\(index\)/);
 assert.match(map,/this\.pointMarkers\[index\+1\]/);
});

test('estado de ponto, 25 m e tempo de permanência constam no popup',()=>{
 assert.match(map,/pointState=i===0/);
 assert.match(map,/Ponto atual/);
 assert.match(map,/Permanência de 30 s|permanência de 30 s/);
 assert.match(map,/Number\(p\.radius\)\|\|25/);
});

test('eventos mostram colunas por tipo e tratativas mantêm categorias distintas',()=>{
 const feed=app.slice(app.indexOf('function notificationsView(){'),app.indexOf('function occurrences(){'));
 assert.match(feed,/rp-event-columns/);
 assert.match(feed,/groups/);
 assert.match(feed,/demoEventNotifications/);
 assert.doesNotMatch(feed,/data-action="filter-alerts"|data-filter=|tablist/);
 const treatment=app.slice(app.indexOf('function occurrences(){'),app.indexOf('\nfunction ',app.indexOf('function occurrences(){')+10));
 assert.match(treatment,/demo-treatment-tab/);
 assert.match(treatment,/rp-demo-pending/);
});

test('mapa, alertas e elementos touch possuem regras responsivas',()=>{
 for(const cls of ['.map-command-page','.map-command-map','.map-point-row','.alerts-queue-card','.alert-filter-tabs','.maxvel-map-popup'])assert.ok(css.includes(cls),cls);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/min-height:64px/);
 assert.match(css,/min-height:44px/);
});
