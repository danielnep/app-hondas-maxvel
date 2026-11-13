import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('API: senha, perfis, mensagens internas, idempotência e upload reservado',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-op-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='superSecurePasswordForTests!';
 const server=createAppServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port;
 const post=(path,body,token)=>fetch(address+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 const get=(path,token)=>fetch(address+'/api'+path,{headers:token?{Authorization:'Bearer '+token}:{}});
 try{
  assert.equal((await get('/events')).status,401);
  assert.equal((await post('/login',{email:'master@example.test',password:'wrong'})).status,401);
  const root=await post('/login',{email:'master@example.test',password:process.env.RONDA_PRO_MASTER_PASSWORD});
  assert.equal(root.status,200);const {token:master}=await root.json();
  const newUser=await post('/users',{name:'Vigia Teste',email:'ronda@example.test',password:'PasswordEnough1234!',role:'ronda',site:'Maxvel Centro',description:'Atua no turno noturno e realiza a rota designada'},master);
  assert.equal(newUser.status,201);
  const login=await post('/login',{email:'ronda@example.test',password:'PasswordEnough1234!'});assert.equal(login.status,200);
  const {token:guard}=await login.json();
  assert.equal((await get('/users',guard)).status,404);
  assert.equal((await get('/templates',guard)).status,200);
  const eventId='ronda-incident-001',now=Date.now();
  const created=await post('/events',{id:eventId,kind:'incident',occurredAt:now,description:'Ocorrência de teste',battery:77,position:{lat:-20.13,lng:-44.87,accuracy:8}},guard);
  assert.equal(created.status,201);
  const repeated=await post('/events',{id:eventId,kind:'incident',occurredAt:now,description:'Ocorrência de teste'},guard);
  assert.equal(repeated.status,200);
  const intern=await post('/events/'+eventId+'/messages',{audience:'system',body:'Somente equipe'},guard);
  assert.equal(intern.status,422);
  assert.equal((await post('/events/'+eventId+'/messages',{audience:'system',body:'Verificar posto e comunicar responsável'},master)).status,201);
  assert.equal((await post('/events/'+eventId+'/messages',{audience:'general',body:'Equipe está acompanhando.'},master)).status,201);
  const restricted=(await (await get('/events/'+eventId+'/messages',guard)).json()).messages;
  assert.equal(restricted.length,1);assert.equal(restricted[0].audience,'general');
  const all=(await (await get('/events/'+eventId+'/messages',master)).json()).messages;assert.equal(all.length,2);
  assert.equal((await post('/events/'+eventId+'/review',{status:'resolvida',note:'Foi realizado acompanhamento no posto.'},guard)).status,404);
  assert.equal((await post('/events/'+eventId+'/review',{status:'resolvida',note:'Conferi o registro da ocorrência, validei os horários e encaminhei as providências à equipe responsável.'},master)).status,200);
  assert.equal((await get('/dashboard',master)).status,200);
  assert.equal((await get('/export',guard)).status,404);
  const meta=await post('/media',{anything:true},guard);assert.equal(meta.status,404);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});


test('produção: preserva contas migradas e usa senha individual em novos cadastros',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-password-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master-pilot@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='OldMasterPassword1234!';
 delete process.env.RONDA_PRO_PILOT_PASSWORD;
 delete process.env.RONDA_PRO_PILOT_PASSWORD_REVISION;
 const open=async()=>{const srv=createAppServer();await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));return srv};
 const request=(srv,path,data,token)=>fetch('http://127.0.0.1:'+srv.address().port+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 let srv=null;
 try{
  srv=await open();
  const original=await request(srv,'/login',{email:'master-pilot@example.test',password:'OldMasterPassword1234!'});
  assert.equal(original.status,200);
  const root=(await original.json()).token;
  const created=await request(srv,'/users',{name:'Agente Teste',email:'agente-pilot@example.test',username:'agentepiloto',role:'ronda',password:'AntigaSenhaAgente123!',site:'Maxvel'},root);
  assert.equal(created.status,201);
  await new Promise(ok=>srv.close(ok));srv=null;
  const pilotPass='Equipe@2026';
  process.env.RONDA_PRO_PILOT_PASSWORD=pilotPass;
  process.env.RONDA_PRO_PILOT_PASSWORD_REVISION='piloto-v1';
  srv=await open();
  assert.equal((await request(srv,'/login',{email:'master-pilot@example.test',password:'OldMasterPassword1234!'})).status,401);
  assert.equal((await request(srv,'/login',{email:'agentepiloto',password:'AntigaSenhaAgente123!'})).status,401);
  const migrated=await request(srv,'/login',{email:'master-pilot@example.test',password:pilotPass});
  assert.equal(migrated.status,200);
  const pilotRoot=(await migrated.json()).token;
  assert.equal((await request(srv,'/login',{email:'agentepiloto',password:pilotPass})).status,200);
  const newUser=await request(srv,'/users',{name:'COI Teste',email:'coi-pilot@example.test',username:'coipiloto',role:'coi',site:'Maxvel',password:'SenhaIndividualCOI123!'},pilotRoot);
  assert.equal(newUser.status,201);
  assert.equal((await request(srv,'/login',{email:'coipiloto',password:pilotPass})).status,401);
  assert.equal((await request(srv,'/login',{email:'coipiloto',password:'SenhaIndividualCOI123!'})).status,200);
  await new Promise(ok=>srv.close(ok));srv=null;
  srv=await open();
  assert.equal((await request(srv,'/login',{email:'master-pilot@example.test',password:pilotPass})).status,200);
 }finally{
  if(srv)await new Promise(ok=>srv.close(ok));
  delete process.env.RONDA_PRO_PILOT_PASSWORD;delete process.env.RONDA_PRO_PILOT_PASSWORD_REVISION;
  rmSync(dir,{recursive:true,force:true});
 }
});
