import test from 'node:test';import assert from 'node:assert/strict';
import {DEMO_ROUTE} from '../src/domain.js';import {routeBounds,project,fallbackSVG} from '../src/map.js';
test('limites reais e projeção de mapa alternativo válidos',()=>{
 const b=routeBounds(DEMO_ROUTE);assert.ok(b.minLat<b.maxLat);assert.ok(b.minLng<b.maxLng);
 for(const p of [DEMO_ROUTE.base,...DEMO_ROUTE.points]){const q=project(p,DEMO_ROUTE);assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));}
});
test('mapa offline tem marcadores, rota, atribuição de modo esquemático',()=>{
 const html=fallbackSVG(DEMO_ROUTE,null,DEMO_ROUTE.base);assert.match(html,/polyline/);assert.match(html,/mapa esquemático/);assert.match(html,/aria-label/);assert.match(html,/B<\/text>/);
});
