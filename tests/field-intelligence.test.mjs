import test from 'node:test';
import assert from 'node:assert/strict';
import {ALERT_PRESETS,assessGps,addTrackSample,metersBetween,comparePatrols,validateAlertTemplate} from '../src/field-intelligence.js';
test('modelos de alerta possuem campos consistentes',()=>{
 assert.ok(ALERT_PRESETS.length>=8);
 for(const template of ALERT_PRESETS)assert.equal(validateAlertTemplate(template),true,template.id);
 assert.notEqual(ALERT_PRESETS.find(t=>t.id==='support'),undefined);
});
test('GPS impreciso e atrasado não autorizam concluir desvio',()=>{
 const now=Date.now();
 for(const fix of [{lat:-20,lng:-44,accuracy:80,at:now},{lat:-20,lng:-44,accuracy:6,at:now-70000}]){
  const r=assessGps(fix,{now,corridorDistanceM:150});assert.equal(r.deviation,'unknown');
 }
 const near=assessGps({lat:-20,lng:-44,accuracy:23,at:now},{now,corridorDistanceM:44,corridorWidthM:30});
 assert.equal(near.deviation,'not-confirmed');
 const far=assessGps({lat:-20,lng:-44,accuracy:5,at:now},{now,corridorDistanceM:110,corridorWidthM:30});
 assert.equal(far.deviation,'suspected');
});
test('cálculo de distância filtra salto impossível e desconexão',()=>{
 const start={lat:-20.14,lng:-44.88,at:100000,accuracy:5};
 const first=addTrackSample([],start);
 assert.equal(first.accepted,true);
 const jumped=addTrackSample(first.track,{...start,lat:start.lat+1,at:start.at+1000});
 assert.equal(jumped.accepted,false);assert.equal(jumped.distanceM,0);
 const duplicate=addTrackSample(first.track,{...start});assert.equal(duplicate.accepted,false);
 const gap=addTrackSample(first.track,{...start,lat:start.lat+.0001,at:start.at+300000});
 assert.equal(gap.reason,'gap');assert.equal(gap.distanceM,0);
 assert.ok(metersBetween({lat:-20,lng:-44},{lat:-20.001,lng:-44})>100);
});
test('resumo separa pânicos de conclusão e produtividade',()=>{
 const s={id:'s1',name:'Vigia Teste',route:{name:'Rota teste',points:[{id:'p'}]},checkpoints:[{completedAt:100}],startedAt:1000,finishedAt:2000,status:'completed',incidents:[],notifications:[]};
 const r=comparePatrols([s],[{kind:'panic',payload:{sessionId:'s1'}}]);
 assert.equal(r.ratio,100);assert.equal(r.insights.find(i=>i.kind==='panic').value,1);
 assert.match(r.insights.find(i=>i.kind==='panic').detail,/não indicador de produtividade/);
});
