import test from 'node:test';
import assert from 'node:assert/strict';
import {routeCanStart,nextRouteStart} from '../src/route-schedule.js';
const time=(day,hour)=>new Date(day+'T'+hour+':00').getTime();
const route=(recurrence,props={})=>({schedule:{kind:'routine',recurrence,hour:'08:00',startDate:'2026-10-20',weekdays:[2,4],...props}});
test('ronda única não inicia antes da hora ou em outro dia',()=>{
 const r=route('once');
 assert.equal(routeCanStart(r,time('2026-10-20','07:59')),false);
 assert.equal(routeCanStart(r,time('2026-10-20','08:00')),true);
 assert.equal(routeCanStart(r,time('2026-10-21','08:01')),false);
 assert.equal(nextRouteStart(r,time('2026-10-19','09:00')),time('2026-10-20','08:00'));
 assert.equal(nextRouteStart(r,time('2026-10-21','00:00')),null);
});
test('dia sim/dia não respeita referência, inclusive após domingo',()=>{
 const r=route('alternate');
 assert.equal(routeCanStart(r,time('2026-10-19','11:00')),false);
 assert.equal(routeCanStart(r,time('2026-10-20','08:01')),true);
 assert.equal(routeCanStart(r,time('2026-10-21','08:01')),false);
 assert.equal(routeCanStart(r,time('2026-10-22','08:01')),true);
 assert.equal(nextRouteStart(r,time('2026-10-21','09:00')),time('2026-10-22','08:00'));
});
test('semanal respeita somente dias autorizados',()=>{
 const r=route('weekly');
 assert.equal(routeCanStart(r,time('2026-10-20','08:00')),true);
 assert.equal(routeCanStart(r,time('2026-10-21','09:00')),false);
 assert.equal(nextRouteStart(r,time('2026-10-21','09:00')),time('2026-10-22','08:00'));
});
test('diária respeita início, horário e próxima ocorrência',()=>{
 const r=route('daily');
 assert.equal(routeCanStart(r,time('2026-10-20','07:59')),false);
 assert.equal(routeCanStart(r,time('2026-10-20','08:02')),true);
 assert.equal(nextRouteStart(r,time('2026-10-20','08:02')),time('2026-10-21','08:00'));
});
test('agendamento inválido não libera ronda',()=>{
 for(const schedule of [{recurrence:'once',hour:'88:77',startDate:'2026-10-20'},{recurrence:'alternate',hour:'08:00',startDate:'2026-02-30'},{recurrence:'weekly',hour:'08:00',weekdays:[]}]) {
  assert.equal(routeCanStart({schedule},time('2026-10-20','09:00')),false);
  assert.equal(nextRouteStart({schedule},time('2026-10-20','09:00')),null);
 }
});
test('rotas legadas sem recorrência seguem compatíveis',()=>{
 const plannedStart=time('2026-10-20','10:00');
 assert.equal(routeCanStart({schedule:{},plannedStart},time('2026-10-19','09:00')),true);
 assert.equal(nextRouteStart({schedule:{},plannedStart},time('2026-10-20','09:00')),plannedStart);
 assert.equal(nextRouteStart({schedule:{},plannedStart},time('2026-10-21','09:00')),null);
});
