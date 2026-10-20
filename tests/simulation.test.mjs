import test from 'node:test';import assert from 'node:assert/strict';
import {travel,interpolated,travelDuration} from '../src/simulation.js';import {DEMO_ROUTE} from '../src/domain.js';
test('simulação usa posições intermediárias e chega sem teletransporte',()=>{
 const from=DEMO_ROUTE.base,to=DEMO_ROUTE.points[0],start=1800000000000;
 const tr=travel(from,to,4000,start);const a=interpolated(tr,start),b=interpolated(tr,start+2000),c=interpolated(tr,start+4000);
 assert.equal(a.lat,from.lat);assert.notEqual(b.lat,from.lat);assert.notEqual(b.lat,to.lat);assert.equal(c.lat,to.lat);assert.equal(c.finished,true);
});
test('duração de deslocamento fica dentro de limites de demonstração',()=>{const d=travelDuration(DEMO_ROUTE.base,DEMO_ROUTE.points[1]);assert.ok(d>=2400&&d<=6800);});
