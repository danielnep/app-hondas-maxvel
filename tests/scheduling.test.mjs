import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_ROUTE,createSession} from '../src/domain.js';
import {DEMO_WATCHERS,DEMO_ROUTES,demoSchedule,scheduleStatus,programsForWatcher,nextProgram,validateProgram,createPrograms,cancelProgram,routeForProgram} from '../src/scheduling.js';

test('escala exemplo contém múltiplos vigias e vínculos estáveis',()=>{
 const now=new Date(2026,9,12,5,0).getTime(),list=demoSchedule(now);
 assert.equal(DEMO_WATCHERS.length,12);
 assert.equal(DEMO_ROUTES.length,3);
 assert.equal(list.length,48);
 assert.equal(new Set(list.map(p=>p.id)).size,list.length);
 for(const p of list){
  assert.ok(DEMO_WATCHERS.some(w=>w.id===p.watcherId));
  assert.ok(DEMO_ROUTES.some(r=>r.id===p.routeId));
  assert.ok(p.endAt>p.startAt);
 }
 assert.equal(programsForWatcher(list,'v01').length,4);
});
test('programação não equivale a execução, mas se vincula à ronda iniciada',()=>{
 const now=new Date(2026,9,12,5).getTime(),list=demoSchedule(now);
 const candidate=list.find(p=>p.watcherId==='v01'&&p.startAt>now);
 assert.equal(scheduleStatus(candidate,[],now),'programada');
 const s=createSession('Lucas Ferreira',routeForProgram(candidate),now,'simulation');s.programId=candidate.id;
 assert.equal(scheduleStatus(candidate,[s],now),'em andamento');
 s.status='completed';
 assert.equal(scheduleStatus(candidate,[s],now),'concluída');
 assert.equal(s.route.points.length,DEMO_ROUTE.points.length);
});
test('impede choque de horário do mesmo vigia, permite outro vigia',()=>{
 const now=Date.now(),p={watcherId:'v01',routeId:'centro',startAt:now+7200000,endAt:now+10800000};
 const made=createPrograms(p,[],now);
 assert.equal(made.ok,true);
 assert.match(validateProgram(p,made.items,now),/outra ronda/);
 assert.equal(validateProgram({...p,watcherId:'v02'},made.items,now),null);
 assert.match(validateProgram({...p,routeId:'norte'},[],now),/unidade/);
 assert.equal(validateProgram({...p,startAt:now-120000},[],now),'Escolha um horário atual ou futuro.');
});
test('recorrência é validada de maneira atômica e cancelamento preserva histórico',()=>{
 const now=Date.now(),p={watcherId:'v04',routeId:'centro',startAt:now+3600000,endAt:now+5400000,repeat:'daily7'};
 const result=createPrograms(p,[],now);
 assert.equal(result.ok,true);assert.equal(result.items.length,7);
 const canceled=cancelProgram(result.items,result.items[0].id);
 assert.equal(canceled[0].status,'cancelled');
 assert.equal(result.items[0].status,'scheduled');
 const blocked=createPrograms(p,result.items,now);
 assert.equal(blocked.ok,false);
 assert.equal(blocked.items.length,0);
});
test('próxima programação depende do vigia e não cruza entre pessoas',()=>{
 const now=Date.now(),rows=[
 {id:'a',watcherId:'v01',routeId:'centro',startAt:now+3600000,endAt:now+5400000,status:'scheduled'},
 {id:'b',watcherId:'v02',routeId:'norte',startAt:now+1800000,endAt:now+3600000,status:'scheduled'}];
 assert.equal(nextProgram(rows,'v01',[],now).id,'a');
 assert.equal(nextProgram(rows,'v02',[],now).id,'b');
 assert.equal(nextProgram(rows,'v01',[{programId:'a'}],now),null);
});
