import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createAppServer} from '../server.js';

test('tratativas compartilhadas: leitura, COI, atuação subsidiária, concorrência, histórico e persistência',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'rondas-treatment-flow-'));
 const saved={...process.env};
 process.env.RONDA_PRO_DB_PATH=join(dir,'test.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='root-treatment@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='SenhaTesteMuitoForte2026!';
 let server=createAppServer();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let base='http://127.0.0.1:'+server.address().port+'/api';
 const call=async(path,token,method='GET',data)=>{
  const res=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  return {status:res.status,body:await res.json()};
 };
 const login=async email=>(await call('/login',null,'POST',{email,password:process.env.RONDA_PRO_MASTER_PASSWORD})).body.token;
 const note='Conferi os fatos, registrei as providências adotadas e comuniquei os responsáveis pelo local.';
 try{
  const root=await login(process.env.RONDA_PRO_MASTER_EMAIL),tokens={};
  for(const role of ['ronda','vistoriador','coi','admin']){
   const email=role+'-treatment@example.test';
   assert.equal((await call('/users',root,'POST',{name:'Teste '+role,email,password:process.env.RONDA_PRO_MASTER_PASSWORD,role,site:'Posto teste',description:'Conta fictícia de teste automatizado'})).status,201);
   tokens[role]=await login(email);
  }
  const create=async(kind='incident',token=tokens.ronda)=>{
   const result=await call('/events',token,'POST',{kind,occurredAt:Date.now(),description:'Registro de teste para conferência operacional'});
   assert.equal(result.status,201);return result.body.id;
  };
  const incident=await create();
  await t.test('campo → feed e aba; ler não resolve nem remove indicador',async()=>{
   const feed=(await call('/notifications',tokens.coi)).body;
   const n=feed.notifications.find(n=>n.event_id===incident);assert.ok(n);assert.equal(n.origin_name,'Teste ronda');
   assert.equal((await call('/notifications/'+n.id+'/read',tokens.coi,'POST',{})).status,200);
   assert.equal((await call('/treatment-summary',tokens.coi)).body.total,1);
   assert.equal((await call('/notifications',tokens.coi)).body.attention,1);
   assert.equal((await call('/treatment-records?kind=incident',tokens.coi)).body.events[0].id,incident);
   assert.equal((await call('/events/'+incident,tokens.admin)).body.event.coi_treated,false);
  });
  await t.test('reserva por sessão e versão impedem atuação simultânea e repetição',async()=>{
   const session=randomUUID(),otherSession=randomUUID();
   assert.equal((await call('/events/'+incident+'/claim',tokens.coi,'POST',{claimSession:session,version:0})).status,200);
   const contests=await Promise.all([
    call('/events/'+incident+'/claim',tokens.admin,'POST',{claimSession:otherSession,version:0}),
    call('/events/'+incident+'/claim',tokens.coi,'POST',{claimSession:otherSession,version:0})
   ]);
   assert.ok(contests.every(r=>r.status===409));
   assert.equal((await call('/events/'+incident+'/messages',tokens.admin,'POST',{body:'Resposta concorrente não autorizada',claimSession:otherSession})).status,409);
   assert.equal((await call('/events/'+incident+'/messages',tokens.coi,'POST',{body:'A equipe conferiu o local.',claimSession:session})).status,201);
   const data={status:'resolvida',conclusion:note,version:0,claimSession:session,requestId:randomUUID()};
   const result=await call('/events/'+incident+'/review',tokens.coi,'POST',data);assert.equal(result.status,200);
   assert.equal((await call('/events/'+incident+'/review',tokens.coi,'POST',data)).body.already,true);
   assert.equal((await call('/events/'+incident+'/review',tokens.admin,'POST',{...data,requestId:randomUUID(),claimSession:otherSession})).status,409);
   assert.equal((await call('/events/'+incident+'/messages',tokens.admin,'POST',{body:'Não deve duplicar o tratamento.'})).status,409);
   const detail=(await call('/events/'+incident,tokens.admin)).body;
   assert.equal(detail.event.status,'resolvida');assert.equal(detail.event.can_treat,false);
   assert.equal(detail.treatments.length,1);assert.equal(detail.treatments[0].author_role,'coi');
   assert.ok((await call('/notifications',tokens.admin)).body.notifications.some(n=>n.event_id===incident&&n.kind==='review'));
   assert.equal((await call('/treatment-summary',tokens.coi)).body.total,0);
   assert.equal((await call('/notifications',tokens.coi)).body.attention,0);
  });
  await t.test('Administração assume ausência de COI pelo mesmo protocolo',async()=>{
   const key=await create('message',tokens.vistoriador),session=randomUUID();
   assert.ok((await call('/notifications',tokens.coi)).body.notifications.some(n=>n.event_id===key));
   assert.equal((await call('/events/'+key+'/claim',tokens.admin,'POST',{claimSession:session,version:0})).status,200);
   assert.equal((await call('/events/'+key+'/messages',tokens.admin,'POST',{body:'Solicitei a conferência pela equipe.',claimSession:session})).status,201);
   assert.equal((await call('/events/'+key+'/review',tokens.admin,'POST',{status:'resolvida',conclusion:note,version:0,claimSession:session,requestId:randomUUID()})).status,200);
   const item=(await call('/events/'+key,tokens.coi)).body;
   assert.equal(item.treatments[0].author_role,'admin');assert.equal(item.event.can_treat,false);
  });
  await t.test('encaminhamento libera atuação administrativa e rejeita versão antiga',async()=>{
   const key=await create('alert');
   assert.equal((await call('/events/'+key+'/review',tokens.coi,'POST',{status:'encaminhada',conclusion:note,version:0})).status,200);
   assert.equal((await call('/events/'+key+'/review',tokens.admin,'POST',{status:'resolvida',conclusion:note,version:0})).status,409);
   assert.equal((await call('/events/'+key+'/review',tokens.admin,'POST',{status:'resolvida',conclusion:note,version:1})).status,200);
  });
  await t.test('totais independem de limites; feed cronológico paginado e evento antigo acessível',async()=>{
   // Volume sintético direto no banco de teste: não toca dados de produção.
   const db=new DatabaseSync(process.env.RONDA_PRO_DB_PATH);
   const worker=db.prepare("SELECT id FROM users WHERE role='ronda'").get().id;
   const coi=db.prepare("SELECT id FROM users WHERE role='coi'").get().id;
   const at=Date.now()-10000;
   for(let n=0;n<510;n++){
    const id=randomUUID();
    db.prepare('INSERT INTO events(id,user_id,kind,occurred_at,received_at,description) VALUES(?,?,?,?,?,?)').run(id,worker,'incident',at-n,at-n,'Histórico sintético '+n);
    db.prepare('INSERT INTO notifications(id,user_id,kind,title,body,event_id,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),coi,'incident','Histórico','Teste',id,at-n);
   }
   db.close();
   assert.equal((await call('/treatment-summary',tokens.coi)).body.total,510);
   assert.equal((await call('/notifications',tokens.coi)).body.attention,510);
   let cursor=null,ids=[],times=[];
   do{
    const feed=(await call('/notifications'+(cursor?'?cursor='+encodeURIComponent(cursor):''),tokens.coi)).body;
    ids.push(...feed.notifications.map(n=>n.id));times.push(...feed.notifications.map(n=>n.created_at));cursor=feed.nextCursor;
   }while(cursor);
   assert.equal(ids.length,new Set(ids).size);assert.ok(ids.length>=510);
   assert.deepEqual(times,[...times].sort((a,b)=>b-a));
   assert.equal((await call('/events/'+incident,tokens.coi)).body.event.status,'resolvida');
   assert.equal((await call('/events/'+incident,tokens.ronda)).status,404,'Detalhe de gestão não deve liberar acesso ao campo');
   assert.equal((await call('/treatment-summary',tokens.ronda)).status,404);
  });
  await t.test('recarregar servidor preserva estados, histórico e contagens',async()=>{
   await new Promise(r=>server.close(r));server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api';
   assert.equal((await call('/events/'+incident,tokens.admin)).body.treatments.length,1);
   assert.equal((await call('/treatment-summary',tokens.coi)).body.total,510);
  });
 }finally{
  server.closeAllConnections();await new Promise(r=>server.close(r));
  for(const key of ['RONDA_PRO_DB_PATH','RONDA_PRO_MASTER_EMAIL','RONDA_PRO_MASTER_PASSWORD']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
  rmSync(dir,{recursive:true,force:true});
 }
});
