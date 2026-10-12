import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_ROUTE,createSession} from '../src/domain.js';
import {DEMO_WATCHERS,DEMO_ROUTES,demoSchedule,scheduleStatus,programsForWatcher,nextProgram,validateProgram,createPrograms,cancelProgram,routeForProgram,filterPrograms,pagePrograms,rescheduleProgram} from '../src/scheduling.js';

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


test('consulta da agenda combina status, unidade, vigia e busca sem acentos',()=>{
 const now=new Date(2026,9,12,5).getTime(),all=demoSchedule(now);
 const team=filterPrograms(all,{watcherId:'v01',unit:'Unidade Centro',sessions:[],now});
 assert.equal(team.length,4);
 assert.ok(team.every(p=>p.watcherId==='v01'));
 const filtered=filterPrograms(all,{unit:'Unidade Industrial',query:'patricia',now});
 assert.equal(filtered.length,4);
 assert.ok(filtered.every(p=>p.watcherId==='v10'));
 const onlyScheduled=filterPrograms(all,{status:'programada',now});
 assert.ok(onlyScheduled.length>0);
 assert.ok(onlyScheduled.every(p=>scheduleStatus(p,[],now)==='programada'));
 const combined=filterPrograms(all,{unit:'Unidade Norte',watcherId:'v09',now});
 assert.equal(combined.length,0);
 assert.equal(all.length,48,'consulta não modifica os dados de origem');
});
test('paginação não oculta registros e limita páginas fora do intervalo',()=>{
 const all=demoSchedule(new Date(2026,9,12,5).getTime());
 const a=pagePrograms(all,0,16),b=pagePrograms(all,1,16),c=pagePrograms(all,2,16);
 assert.equal(a.total,48);assert.equal(a.pages,3);
 assert.equal(a.from,1);assert.equal(a.to,16);
 assert.equal(b.from,17);assert.equal(c.to,48);
 assert.equal(new Set([...a.items,...b.items,...c.items].map(p=>p.id)).size,48);
 assert.equal(pagePrograms(all,100,16).page,2);
 assert.equal(pagePrograms([],0,16).total,0);
 assert.equal(pagePrograms([],0,16).pages,1);
});


test('reprogramação guarda dados anteriores e recusa colisão entre escalas',()=>{
 const now=Date.now();
 const created=createPrograms({watcherId:'v03',routeId:'centro',startAt:now+4*3600000,endAt:now+5*3600000},[],now);
 assert.equal(created.ok,true);
 const old=created.items[0];
 const moved=rescheduleProgram(created.items,old.id,{startAt:now+6*3600000,endAt:now+7*3600000,notes:'Rota remarcada'},now);
 assert.equal(moved.ok,true);
 assert.equal(moved.items[0].id,old.id);
 assert.equal(moved.items[0].startAt,now+6*3600000);
 assert.equal(moved.items[0].changes.length,1);
 assert.equal(moved.items[0].changes[0].previous.startAt,old.startAt);
 assert.equal(old.startAt,now+4*3600000,'a entrada original não pode ser alterada');
 const collision=createPrograms({watcherId:'v03',routeId:'centro',startAt:now+8*3600000,endAt:now+9*3600000},moved.items,now).items;
 const invalid=rescheduleProgram([...moved.items,...collision],old.id,{startAt:now+8*3600000,endAt:now+9*3600000},now);
 assert.equal(invalid.ok,false);
 assert.match(invalid.error,/outra ronda/);
 assert.equal(invalid.items[0].startAt,moved.items[0].startAt);
 const cancelled=cancelProgram(moved.items,old.id);
 assert.equal(rescheduleProgram(cancelled,old.id,{startAt:now+5*3600000},now).ok,false);
});
