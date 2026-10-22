import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
import {dueScheduleOccurrence} from '../src/route-schedule.js';

test('ronda explícita notifica o agente; automática aguarda presença e não duplica atribuição',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-programada-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='password-for-automated-tests-2026';
 const server=createAppServer();
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const root='http://127.0.0.1:'+server.address().port+'/api';
 const call=async(path,method='GET',data,token)=>{
  const res=await fetch(root+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  return {status:res.status,body:await res.json()};
 };
 const points=[{name:'Portaria',address:'Rua Exemplo 1',lat:-20.1437,lng:-44.8906},{name:'Área de carga',address:'Rua Exemplo 2',lat:-20.1471,lng:-44.8761}];
 try{
  const admin=(await call('/login','POST',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).body.token;
  const account=await call('/users','POST',{name:'Agente Ronda',email:'agente@example.test',role:'ronda',site:'Posto Divinópolis',password:'password-field-test-2026'},admin);
  assert.equal(account.status,201);
  const workerId=account.body.id;
  const explicit=await call('/routes','POST',{userId:workerId,name:'Ronda 08h',points,schedule:{kind:'routine',recurrence:'daily',hour:'08:00',startDate:'',weekdays:[]},instructions:'Observar acesso e portaria'},admin);
  assert.equal(explicit.status,201,JSON.stringify(explicit.body));
  assert.equal(explicit.body.assignedTo,workerId);
  const agent=(await call('/login','POST',{email:'agente@example.test',password:'password-field-test-2026'})).body.token;
  const assigned=await call('/routes','GET',null,agent);
  assert.ok(assigned.body.routes.some(x=>x.name==='Ronda 08h'&&x.instructions==='Observar acesso e portaria'));
  const initial=(await call('/notifications?channel=events','GET',null,agent)).body.notifications;
  assert.ok(initial.some(x=>x.kind==='notice'&&x.title==='Nova ronda programada'));
  const locale=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
  const parts=locale.formatToParts(new Date()),get=k=>parts.find(x=>x.type===k).value;
  const today=get('year')+'-'+get('month')+'-'+get('day');
  const schedule={kind:'specific',recurrence:'once',hour:'00:00',startDate:today,weekdays:[]};
  assert.equal(dueScheduleOccurrence(schedule,Date.now()),today);
  const automatic=await call('/routes','POST',{userId:'auto',name:'Ronda extraordinária',points,schedule,instructions:'Conferir duas áreas do posto'},admin);
  assert.equal(automatic.status,201,JSON.stringify(automatic.body));
  assert.equal(automatic.body.queued,true);
  assert.equal(automatic.body.assignedTo,null,'sem presença online ainda não atribui');
  const presence=await call('/presence','POST',{position:{lat:-20.1437,lng:-44.8906,accuracy:8}},agent);
  assert.equal(presence.status,200,JSON.stringify(presence.body));
  const after=(await call('/routes','GET',null,agent)).body.routes;
  assert.equal(after.filter(x=>x.name==='Ronda extraordinária').length,1);
  const final=(await call('/notifications?channel=events','GET',null,agent)).body.notifications;
  assert.ok(final.some(x=>x.body.includes('Ronda extraordinária')));
  await call('/presence','POST',{position:null},agent);
  assert.equal((await call('/routes','GET',null,agent)).body.routes.filter(x=>x.name==='Ronda extraordinária').length,1,'sem repetição após refresh');
 }finally{await new Promise(done=>server.close(done));rmSync(dir,{recursive:true,force:true});}
});

test('ocorrência local espera o horário e libera diário uma vez por dia',()=>{
 const base={recurrence:'daily',hour:'20:00',startDate:'',weekdays:[]};
 const before=Date.parse('2026-10-21T18:00:00-03:00');
 const after=Date.parse('2026-10-21T21:00:00-03:00');
 assert.equal(dueScheduleOccurrence(base,before),null);
 assert.equal(dueScheduleOccurrence(base,after),'2026-10-21');
});
