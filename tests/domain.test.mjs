import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_ROUTE,DWELL_MS,RADIUS_METERS,createSession,updateLocation,canCompletePoint,completePoint,justifyDeviation,hasBlock,finishSession,currentCheckpoint,offsetRouteNear,accurateFix,corridorDistance} from '../src/domain.js';
const pos=(p,at)=>({lat:p.lat,lng:p.lng,accuracy:6,at});
test('raio 25m e permanência 30s',()=>{assert.equal(DEMO_ROUTE.points[0].radius,25);assert.equal(DWELL_MS,30_000)});
test('sequência só libera após 30s',()=>{const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t),p=currentCheckpoint(s);updateLocation(s,pos(p,t),t);assert.equal(canCompletePoint(s),false);updateLocation(s,pos(p,t+10000),t+10000);updateLocation(s,pos(p,t+20000),t+20000);updateLocation(s,pos(p,t+29999),t+29999);assert.equal(canCompletePoint(s),false);updateLocation(s,pos(p,t+30000),t+30000);assert.equal(completePoint(s,t+30000),true);assert.equal(s.index,1)});
test('sinal impreciso invalida contagem sem penalidade',()=>{const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t),p=currentCheckpoint(s);assert.equal(accurateFix({...pos(p,t),accuracy:42},t),false);const r=updateLocation(s,{...pos(p,t),accuracy:42},t);assert.equal(r.reason,'gps-unreliable');assert.equal(s.deviations.length,0)});
test('desvio -> justificativa -> retorno -> nova permanência',()=>{const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t),p=currentCheckpoint(s);updateLocation(s,pos(p,t),t);const far={lat:p.lat+.004,lng:p.lng+.004};updateLocation(s,pos(far,t+1000),t+1000);assert.equal(s.deviations.length,0);updateLocation(s,pos(far,t+5000),t+5000);assert.equal(s.deviations.length,0);updateLocation(s,pos(far,t+9000),t+9000);assert.equal(s.deviations.length,1);assert.equal(hasBlock(s),true);const d=s.deviations[0];assert.equal(justifyDeviation(s,d.id,'Fui verificar uma situação na lateral.',t+9100),true);assert.equal(canCompletePoint(s),false);updateLocation(s,pos(p,t+10000),t+10000);assert.ok(s.deviations[0].returnedAt);updateLocation(s,pos(p,t+20000),t+20000);updateLocation(s,pos(p,t+30000),t+30000);updateLocation(s,pos(p,t+40000),t+40000);assert.equal(canCompletePoint(s),true)});
test('lacuna de GPS reinicia permanência mesmo após retorno do segundo plano',()=>{const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t),p=currentCheckpoint(s);updateLocation(s,pos(p,t),t);updateLocation(s,pos(p,t+10000),t+10000);updateLocation(s,pos(p,t+40000),t+40000);assert.equal(s.checkpoints[0].dwellMs,0);assert.equal(canCompletePoint(s),false)});
test('não finalizar sem retorno à base',()=>{const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t);s.index=4;assert.equal(finishSession(s,t),false);updateLocation(s,pos(s.route.base,t),t);assert.equal(finishSession(s,t),true)});
test('rota de GPS gera pontos de teste perto do aparelho',()=>{const r=offsetRouteNear(-19,-43);assert.ok(Math.abs(r.base.lat+19)<1e-8);assert.equal(r.points.length,4)});
test('corredor representa rota ilustrativa',()=>{assert.ok(corridorDistance(DEMO_ROUTE.base,DEMO_ROUTE)<.1)});
test('GPS impreciso fora da rota não gera desvio nem bloqueio',()=>{
 const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t),p=currentCheckpoint(s);
 for(let i=0;i<6;i++){const result=updateLocation(s,{...pos({lat:p.lat+.001,lng:p.lng+.001},t+i*3000),accuracy:38},t+i*3000);assert.equal(result.reason,'gps-unreliable');}
 assert.equal(s.deviations.length,0);assert.equal(hasBlock(s),false);
});
test('uma única posição afastada não penaliza vigia',()=>{
 const t=Date.now(),s=createSession('Teste',DEMO_ROUTE,t),p=currentCheckpoint(s);
 const result=updateLocation(s,pos({lat:p.lat+.001,lng:p.lng+.001},t),t);
 assert.equal(result.suspected,true);assert.equal(s.deviations.length,0);
});
