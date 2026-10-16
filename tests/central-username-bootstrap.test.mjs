import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('central preserva o Master e permite usuário inicial temporário, mesmo após desativar o provisionamento',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rondas-user-'));
 const keys=['RONDA_PRO_DB_PATH','RONDA_PRO_MASTER_EMAIL','RONDA_PRO_MASTER_PASSWORD','RONDA_PRO_INITIAL_USERNAME','RONDA_PRO_INITIAL_PASSWORD'];
 const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 Object.assign(process.env,{
  RONDA_PRO_DB_PATH:join(dir,'database.sqlite'),
  RONDA_PRO_MASTER_EMAIL:'master-qa@example.test',
  RONDA_PRO_MASTER_PASSWORD:'MasterStrongTestPassword!73',
  RONDA_PRO_INITIAL_USERNAME:'operadorteste',
  RONDA_PRO_INITIAL_PASSWORD:'9816'
 });
 let server;
 const start=async()=>{
  server=createAppServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return 'http://127.0.0.1:'+server.address().port;
 };
 const login=async(address,user,password)=>fetch(address+'/api/login',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:user,password})
 });
 try{
  let address=await start();
  let reply=await login(address,'operadorteste','9816');
  assert.equal(reply.status,200);const {token,user}=await reply.json();
  assert.equal(user.role,'admin');assert.equal(user.name,'Daniel');
  assert.equal((await fetch(address+'/api/users',{headers:{Authorization:'Bearer '+token}})).status,200);
  assert.equal((await login(address,'operadorteste','9817')).status,401);
  assert.equal((await login(address,'master-qa@example.test','MasterStrongTestPassword!73')).status,200);
  await new Promise(resolve=>server.close(resolve));server=null;
  delete process.env.RONDA_PRO_INITIAL_USERNAME;delete process.env.RONDA_PRO_INITIAL_PASSWORD;
  address=await start();
  assert.equal((await login(address,'operadorteste','9816')).status,200,'conta permanece no banco persistente');
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  for(const key of keys){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}
  rmSync(dir,{recursive:true,force:true});
 }
});
