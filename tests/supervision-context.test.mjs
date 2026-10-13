import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEMO_WATCHERS,demoSchedule,routeForProgram,routeForWatcher} from '../src/scheduling.js';
import {corridorDistance,distanceMeters,routeWaypoints} from '../src/domain.js';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../assets/maxvel-mobile-02.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('os quatro vigias tem geometria demonstrativa diferente e consistente',()=>{
 const coords=DEMO_WATCHERS.map(w=>{
  const route=routeForWatcher(w.id);
  assert.equal(route.watcherId,w.id);
  assert.equal(route.points.length,4);
  assert.equal(route.legs.length,5);
  for(const p of routeWaypoints(route))assert.ok(corridorDistance(p,route)<.1);
  return route.base.lat.toFixed(6)+'|'+route.base.lng.toFixed(6)+'|'+route.points[0].lat.toFixed(6);
 });
 assert.equal(new Set(coords).size,4);
 const example=demoSchedule().filter(x=>x.watcherId==='v01'||x.watcherId==='v02');
 assert.ok(distanceMeters(routeForProgram(example[0]).base,routeForProgram(example.find(x=>x.watcherId!==example[0].watcherId)).base)>10);
});

test('supervisão seleciona vigia independente da ronda e atualiza mapa e histórico',()=>{
 assert.match(app,/selectedSupervisedWatcherId/);
 assert.match(app,/function supervisedContext\(\)/);
 assert.match(app,/data-supervisor-watcher/);
 assert.match(app,/context\.history\.slice\(0,5\)/);
 assert.match(app,/tablePatrols\(context\.history\)/);
 assert.match(app,/registerMap\('ops-map',context\.route,context\.current/);
 assert.match(app,/selectedSupervisedWatcherId=choice\.id/);
});

test('identidade Maxvel preta/vermelha aparece em todos os acessos sem Horizon',()=>{
 assert.match(styles,/border-radius:0!important/);
 assert.match(styles,/#28B6E8/);
 assert.match(styles,/#0C0D0F/);
 assert.doesNotMatch(app,/maxvelseguranca\.com\.br\/images\/banner\/01\.jpg/);
 assert.doesNotMatch(app,/Horizon|horizon/);
 assert.match(app,/class="brand maxvel-only-brand"/);
 assert.match(html,/maxvel-obsidian-06\.css/);
 assert.match(html,/maxvel-mobile-02\.css/);
});
