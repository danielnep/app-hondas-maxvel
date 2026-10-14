import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_ROUTE,createSession,updateLocation,checkInAtPoint,canCompletePoint,completePoint} from '../src/domain.js';
const fresh=(point,at)=>({lat:point.lat,lng:point.lng,accuracy:5,at});

test('Chegar ao ponto não inicia os 30 segundos sem toque Estou Aqui',()=>{
 const at=1700000000000,s=createSession('Vigia teste',DEMO_ROUTE,at,'simulation');
 s.requiresManualCheckin=true;s.fastDemoClock=true;
 const first=DEMO_ROUTE.points[0];
 let state=updateLocation(s,fresh(first,at),at);
 assert.equal(state.awaitingCheckin,true);
 assert.equal(s.insideSince,null);
 assert.equal(s.checkpoints[0].dwellMs,0);
 state=updateLocation(s,fresh(first,at+15000),at+15000);
 assert.equal(state.awaitingCheckin,true);
 assert.equal(canCompletePoint(s),false);
 const result=checkInAtPoint(s,fresh(first,at+15100),at+15100);
 assert.equal(result.ok,true);
 assert.equal(s.checkpoints[0].checkedInAt,at+15100);
 updateLocation(s,fresh(first,at+18100),at+18100);
 assert.equal(s.checkpoints[0].dwellMs,18000);
 assert.equal(canCompletePoint(s),false);
 updateLocation(s,fresh(first,at+20200),at+20200);
 assert.equal(canCompletePoint(s),true);
 assert.equal(completePoint(s,at+20200),true);
 assert.equal(s.index,1);
 assert.equal(s.checkpoints[1].checkedInAt,undefined);
 updateLocation(s,fresh(DEMO_ROUTE.points[1],at+20500),at+20500);
 assert.equal(s.checkpoints[1].dwellMs,0);
 assert.equal(canCompletePoint(s),false);
});

test('Estou Aqui exige GPS confiável dentro do raio, e velocidade real não acelera',()=>{
 const at=1700001000000,s=createSession('Vigia teste',DEMO_ROUTE,at,'real');
 s.requiresManualCheckin=true;s.fastDemoClock=true;
 const point=DEMO_ROUTE.points[0];
 assert.equal(checkInAtPoint(s,fresh({...point,lat:point.lat+0.002},at),at).ok,false);
 assert.equal(checkInAtPoint(s,{...fresh(point,at),accuracy:70},at).ok,false);
 assert.equal(checkInAtPoint(s,fresh(point,at),at).ok,true);
 updateLocation(s,fresh(point,at+5000),at+5000);
 assert.equal(s.checkpoints[0].dwellMs,5000);
 assert.equal(canCompletePoint(s),false);
});
