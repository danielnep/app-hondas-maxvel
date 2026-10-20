import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('Acesso real: login por usuario/email, cadastro minimo, estado privado e chat',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'ronda-live-'));
 const previous={...process.env};
 process.env.RONDA_PRO_DB_PATH=join(folder,'ronda.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@tests.local';
 process.env.RONDA_PRO_MASTER_PASSWORD='TopSecretMasterTestPass_2026';
 process.env.RONDA_PRO_INITIAL_ACCOUNTS=JSON.stringify([
  {name:'Administrador',email:'admin@tests.local',username:'admin',password:'AdminBootstrapSecret2026',role:'admin'},
  {name:'COI',email:'coi@tests.local',username:'coi',password:'CoiBootstrapSecret2026',role:'coi'}
 ]);
 const server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 const request=async(path,method='GET',data,token)=>{
  const response=await fetch(url+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  return {status:response.status,data:await response.json()};
 };
 try{
  const admin=(await request('/login','POST',{email:'admin',password:'AdminBootstrapSecret2026'}));
  assert.equal(admin.status,200);
  const a=admin.data.token;assert.equal(admin.data.user.role,'admin');
  const existing=await request('/login','POST',{email:'coi@tests.local',password:'CoiBootstrapSecret2026'});
  assert.equal(existing.status,200);
  const c=existing.data.token;
  const create=await request('/users','POST',{role:'ronda',name:'Vigia Real',email:'vigia@tests.local',phone:'37999990000',username:'vigia01',password:'Vigia-Seguro-2026'},a);
  assert.equal(create.status,201,JSON.stringify(create.data));
  const duplicate=await request('/users','POST',{role:'ronda',name:'Vigia Real',email:'outro@tests.local',phone:'37999990000',username:'vigia01',password:'Vigia-Seguro-2026'},a);
  assert.equal(duplicate.status,409);
  const login=await request('/login','POST',{email:'vigia01',password:'Vigia-Seguro-2026'});
  assert.equal(login.status,200);const v=login.data.token;
  assert.equal((await request('/users','POST',{role:'admin',name:'Invasor',email:'x@y.z',phone:'',username:'teste',password:'123456789012'},v)).status,404);
  const state={sessions:[],programs:[],selectedWatcherId:'',operationalSettings:{dwellSeconds:30}};
  assert.equal((await request('/app-state','PUT',state,v)).status,200);
  assert.deepEqual((await request('/app-state','GET',undefined,v)).data.state,state);
  assert.equal((await request('/app-state','GET',undefined,c)).data.state,null);
  const contacts=await request('/chat/contacts','GET',undefined,v);
  const person=contacts.data.contacts.find(x=>x.name==='COI');
  assert.ok(person,'Contato COI ausente');
  const start=await request('/chat/conversations','POST',{members:[person.id]},v);
  assert.equal(start.status,201);
  const sent=await request('/chat/conversations/'+start.data.id+'/messages','POST',{body:'Mensagem operacional real'},v);
  assert.equal(sent.status,201);
  const received=await request('/chat/conversations/'+start.data.id+'/messages','GET',undefined,c);
  assert.equal(received.status,200);
  assert.equal(received.data.messages.at(-1).body,'Mensagem operacional real');
 }finally{
  await new Promise(ok=>server.close(ok));rmSync(folder,{recursive:true,force:true});
  for(const key of ['RONDA_PRO_DB_PATH','RONDA_PRO_MASTER_EMAIL','RONDA_PRO_MASTER_PASSWORD','RONDA_PRO_INITIAL_ACCOUNTS']){
   if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
  }
 }
});
