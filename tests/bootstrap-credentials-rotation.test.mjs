import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('rotacao versionada de senha preserva usuario, estado e invalida token anterior',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'ronda-rotation-'));
 const keys=['RONDA_PRO_DB_PATH','RONDA_PRO_MASTER_EMAIL','RONDA_PRO_MASTER_PASSWORD','RONDA_PRO_INITIAL_ACCOUNTS','RONDA_PRO_INITIAL_ACCOUNTS_REVISION'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const seed=password=>JSON.stringify([{name:'Administrador',email:'admin@tests.local',username:'admin',password,role:'admin'}]);
 const oldPassword='OriginalAdminPass2026!',newPassword='UpdatedAdminPass2026!';
 Object.assign(process.env,{
  RONDA_PRO_DB_PATH:join(folder,'test.sqlite'),
  RONDA_PRO_MASTER_EMAIL:'master@tests.local',
  RONDA_PRO_MASTER_PASSWORD:'MasterTestingOnly2026!',
  RONDA_PRO_INITIAL_ACCOUNTS:seed(oldPassword)
 });
 delete process.env.RONDA_PRO_INITIAL_ACCOUNTS_REVISION;
 const open=async()=>{
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const request=async(path,method='GET',data,token)=>{
   const r=await fetch(base+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
   return {status:r.status,data:await r.json()};
  };
  return {server,request};
 };
 const close=server=>new Promise(resolve=>server.close(resolve));
 let current;
 try{
  current=await open();
  const first=await current.request('/login','POST',{email:'admin',password:oldPassword});
  assert.equal(first.status,200);
  const oldToken=first.data.token;
  assert.equal((await current.request('/app-state','PUT',{marker:'kept'},oldToken)).status,200);
  await close(current.server);current=null;

  process.env.RONDA_PRO_INITIAL_ACCOUNTS=seed(newPassword);
  process.env.RONDA_PRO_INITIAL_ACCOUNTS_REVISION='20261020';
  current=await open();
  assert.equal((await current.request('/login','POST',{email:'admin',password:oldPassword})).status,401);
  assert.equal((await current.request('/me','GET',undefined,oldToken)).status,401);
  const changed=await current.request('/login','POST',{email:'admin',password:newPassword});
  assert.equal(changed.status,200);
  assert.deepEqual((await current.request('/app-state','GET',undefined,changed.data.token)).data.state,{marker:'kept'});
  await close(current.server);current=null;

  // Revisao anterior, mesmo que carregue a senha antiga, nao faz rollback.
  process.env.RONDA_PRO_INITIAL_ACCOUNTS=seed(oldPassword);
  process.env.RONDA_PRO_INITIAL_ACCOUNTS_REVISION='20261019';
  current=await open();
  assert.equal((await current.request('/login','POST',{email:'admin',password:newPassword})).status,200);
  assert.equal((await current.request('/login','POST',{email:'admin',password:oldPassword})).status,401);
 }finally{
  if(current)await close(current.server);
  rmSync(folder,{recursive:true,force:true});
  for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}
 }
});
