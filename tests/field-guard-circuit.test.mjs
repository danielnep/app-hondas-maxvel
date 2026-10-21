import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGuardRoute,initialGuardState,nextGuardState,markGuardPoint,guardCockpit,GUARD_DWELL_MS,GUARD_RADIUS_METERS} from '../src/field-guard-circuit.js';
const route={id:'route1',name:'Ronda real',site:'Portaria',points:[
 {lat:-20.14,lng:-44.88,name:'Portão principal'},
 {lat:-20.1405,lng:-44.8805,name:'Doca 1'}]};
const base={lat:-20.1398,lng:-44.8799,accuracy:10,at:100000};
test('vigia e vistoriador compartilham o mesmo mapa, sem converter ronda em vistoria',()=>{
 const plan=buildGuardRoute(route,base);
 assert.equal(plan.points.length,2);
 assert.equal(plan.base.lat,base.lat);assert.equal(plan.roadRouting,true);assert.equal(plan.baseKnown,true);
 assert.equal(plan.points[0].name,'Portão principal');
 const planWithoutGps=buildGuardRoute(route,null);assert.equal(planWithoutGps.baseKnown,false,'Sem GPS não se pode afirmar que a base é conhecida');
 const ui=guardCockpit({planned:route});
 for(const tool of ['data-field-tool-torch','data-field-tool-panic','data-field-tool-alert','data-field-tool-incident'])assert.match(ui,new RegExp(tool));
 assert.doesNotMatch(ui,/data-field-tool-chat/,'mensagens continuam no chat independente, nao no cartao');
 assert.match(ui,/data-guard-panel-toggle/);
 assert.match(ui,/data-guard-panel-content/);
 assert.match(ui,/guard-real-map/);assert.match(ui,/data-guard-start/);
 assert.match(readFileSync(new URL('../src/central.js',import.meta.url),'utf8'),/data-guard-arrive/);
});
test('ronda exige 30 segundos com GPS preciso, recente e dentro do raio',()=>{
 const st=initialGuardState(buildGuardRoute(route,base),base,100000);
 const fix={lat:-20.14,lng:-44.88,accuracy:10,at:101000};
 assert.equal(nextGuardState(st,fix,{at:101000,action:'arrive'}).inside,true);
 const arrived=nextGuardState(st,fix,{at:101000,action:'arrive'}).state;
 assert.equal(nextGuardState(arrived,{...fix,at:130500},{at:130500}).ready,false);
 assert.equal(nextGuardState(arrived,{...fix,at:131000},{at:131000}).ready,true);
 const oldFix={...fix,at:101000};
 assert.equal(nextGuardState(arrived,oldFix,{at:131000}).inside,false);
 const away={lat:-20.16,lng:-44.88,accuracy:9,at:105000};
 assert.equal(nextGuardState(arrived,away,{at:105000}).state.insideSince,null);
});
test('avanço preserva cronologia e libera o próximo ponto sem pular a sequência',()=>{
 const st=initialGuardState(buildGuardRoute(route,base),base,100000);
 assert.equal(st.points.length,2);
 const progressed=markGuardPoint(st,132000);
 assert.equal(progressed.index,1);assert.equal(progressed.checkpoints.length,1);
 assert.throws(()=>markGuardPoint(markGuardPoint(progressed)),/sem próximo ponto/);
 assert.match(guardCockpit({round:progressed,planned:route}),/Estou aqui/);
 const back=markGuardPoint(progressed);assert.match(guardCockpit({round:back,planned:route,position:base}),/Distância à base/);
});
