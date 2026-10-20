import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEMO_ROUTE,routeLeg,routeWaypoints,corridorDistance,offsetRouteNear,createSession,updateLocation,distanceMeters} from '../src/domain.js';
import {travel,interpolated} from '../src/simulation.js';
import {fallbackSVG} from '../src/map.js';

test('cinco trechos de ronda usam vertices intermediarios preservando quatro pontos e base',()=>{
 const points=routeWaypoints(DEMO_ROUTE);
 assert.equal(DEMO_ROUTE.points.length,4);
 assert.equal(DEMO_ROUTE.legs.length,5);
 assert.ok(points.length>14);
 assert.deepEqual(points[0],DEMO_ROUTE.base);
 assert.deepEqual(points.at(-1),DEMO_ROUTE.base);
 for(let i=0;i<5;i++){
  const leg=routeLeg(DEMO_ROUTE,i);
  assert.ok(leg.length>=4,'trecho '+i+' precisa de vertices extras');
  assert.deepEqual(leg[0],i===0?DEMO_ROUTE.base:DEMO_ROUTE.points[i-1]);
  assert.deepEqual(leg.at(-1),i===4?DEMO_ROUTE.base:DEMO_ROUTE.points[i]);
  for(const p of leg)assert.ok(corridorDistance(p,DEMO_ROUTE)<.1);
 }
});

test('simulacao acompanha curvas exibidas e nao dispara desvio ao seguir a rota',()=>{
 const time=1800000000000;
 const session=createSession('Ronda demonstrativa',DEMO_ROUTE,time);
 let last=DEMO_ROUTE.base;
 for(let i=0;i<5;i++){
  const leg=routeLeg(DEMO_ROUTE,i);
  const t=time+i*10000;
  const tr=travel(leg[0],leg.at(-1),6000,t,leg.slice(1,-1));
  assert.equal(tr.path.length,leg.length);
  for(let step=0;step<=12;step++){
   const at=t+500*step;
   const p=interpolated(tr,at);
   assert.ok(corridorDistance(p,DEMO_ROUTE)<=.5,'posicao do proprio percurso, sem alerta');
   updateLocation(session,{...p,accuracy:5,at},at);
   assert.equal(session.deviations.length,0,'nao sinalizar falso desvio entre curvas');
   last=p;
  }
 }
 assert.ok(distanceMeters(last,DEMO_ROUTE.base)<1,'retorno a base');
});

test('GPS local desloca vertices intermediarios e mapa offline mantem trajeto',()=>{
 const relocated=offsetRouteNear(-19,-43);
 assert.equal(relocated.legs.length,5);
 assert.ok(distanceMeters(relocated.legs[1][1],DEMO_ROUTE.legs[1][1])>100000);
 assert.ok(corridorDistance(relocated.legs[1][0],relocated)<1);
 const html=fallbackSVG(DEMO_ROUTE,null,DEMO_ROUTE.base);
 const pointsCount=routeWaypoints(DEMO_ROUTE).length;
 const routePolyline=html.match(/<polyline points="([^"]+)"/);
 assert.ok(routePolyline);
 assert.equal(routePolyline[1].trim().split(/\s+/).length,pointsCount);
});

test('vigia tem mapa workspace inteiro com comandos recolhiveis e perfil intacto',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readStyles('app-shell');
 assert.match(app,/patrol-workspace\$\{patrolSheetCollapsed/);
 assert.match(app,/toggle-patrol-sheet/);
 assert.match(app,/id="mobile-map"/);
 assert.match(app,/mySchedule\(\)/);
 assert.match(app,/patrolScenarioControls\(\)/);
 assert.match(css,/\.dashboard \.ronda-page \.patrol-map-panel\{/);
 assert.match(css,/position:absolute;inset:0/);
 assert.match(css,/\.patrol-workspace\.sheet-collapsed/);
});
