import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('permissões administrativas bloqueiam ações restritas, nunca o pânico',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-role-perms-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@permissions.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='TemporaryTestPassword!123';
 const server=createAppServer();
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port+'/api';
 const req=(path,method='GET',data,token)=>fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
 try{
  const root=await req('/login','POST',{email:'master@permissions.test',password:process.env.RONDA_PRO_MASTER_PASSWORD});
  assert.equal(root.status,200);const master=(await root.json()).token;
  for(const [name,role] of [['coi','coi'],['ronda','ronda']]){
   const response=await req('/users','POST',{name:'Perfil '+name,email:name+'@permissions.test',username:name,password:'PasswordForTest#1234',role},master);
   assert.equal(response.status,201);
  }
  const login=async name=>(await (await req('/login','POST',{email:name+'@permissions.test',password:'PasswordForTest#1234'})).json()).token;
  const coi=await login('coi'),guard=await login('ronda');
  assert.equal((await req('/role-permissions')).status,401);
  assert.equal((await req('/role-permissions','GET',undefined,guard)).status,403);
  const settings=(await (await req('/role-permissions','GET',undefined,master)).json()).permissions;
  assert.equal(settings.coi.rondas,true);
  assert.equal((await req('/role-permissions','PUT',{role:'coi',modules:{rondas:false,despachos:false,ocorrencias:false,mensagens:false}},master)).status,200);
  assert.equal((await req('/role-permissions','PUT',{role:'ronda',modules:{rondas:false,mensagens:false,ocorrencias:false,vistoria:true}},master)).status,200);
  assert.equal((await req('/routes','GET',undefined,coi)).status,403);
  assert.equal((await req('/routes','GET',undefined,guard)).status,403);
  assert.equal((await req('/chat/contacts','GET',undefined,coi)).status,403);
  assert.equal((await req('/chat/contacts','GET',undefined,guard)).status,403);
  assert.equal((await req('/events','GET',undefined,coi)).status,403);
  assert.equal((await req('/events','POST',{kind:'incident',occurredAt:Date.now(),description:'Alerta de teste'},guard)).status,403);
  assert.equal((await req('/events','POST',{kind:'panic',occurredAt:Date.now(),description:'Pânico de teste'},guard)).status,201);
  assert.equal((await req('/role-permissions','PUT',{role:'coi',modules:{rondas:true,despachos:true,ocorrencias:true,mensagens:true}},guard)).status,403);
 }finally{await new Promise(ok=>server.close(ok));rmSync(dir,{recursive:true,force:true})}
});
