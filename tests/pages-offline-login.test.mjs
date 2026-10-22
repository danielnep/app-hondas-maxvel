import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGES_TEST_ACCOUNTS,isPagesTestMode,pagesTestRequest} from '../src/pages-test-api.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
globalThis.localStorage=storage();
globalThis.sessionStorage=storage();
globalThis.location={hostname:'danielnep.github.io'};
test('Pages and Ronda Pro Railway use password-free local test profiles without enabling them elsewhere',()=>{
 assert.equal(isPagesTestMode(),true);
 location.hostname='ronda-pro-production.up.railway.app';
 assert.equal(isPagesTestMode(),true);
 location.hostname='outro-servico.up.railway.app';
 assert.equal(isPagesTestMode(),false);
 location.hostname='localhost';
 assert.equal(isPagesTestMode(),false);
 location.hostname='danielnep.github.io';
});
test('each of four test accounts logs in locally, persists state and rejects wrong password',async()=>{
 assert.equal(PAGES_TEST_ACCOUNTS.length,4);
 for(const a of PAGES_TEST_ACCOUNTS){
  await assert.rejects(pagesTestRequest('/login',{method:'POST',data:{email:a.username,password:'incorrect'}}),{status:401});
  const login=await pagesTestRequest('/login',{method:'POST',data:{email:a.username,password:a.password}});
  assert.equal(login.user.role,a.role);
  sessionStorage.setItem('rondaspro_api_token',login.token);
  const me=await pagesTestRequest('/me');
  assert.equal(me.user.username,a.username);
  const state={sessions:[],programs:[],selectedWatcherId:'',operationalSettings:{dwellSeconds:30}};
  assert.equal((await pagesTestRequest('/app-state',{method:'PUT',data:state})).stored,true);
  assert.deepEqual((await pagesTestRequest('/app-state')).state,state);
  assert.ok(Array.isArray((await pagesTestRequest('/users')).users));
  assert.ok(Array.isArray((await pagesTestRequest('/routes')).routes));
  assert.ok(Array.isArray((await pagesTestRequest('/events')).events));
  await pagesTestRequest('/logout',{method:'POST'});
  await assert.rejects(pagesTestRequest('/me'),{status:401});
 }
});
test('local admin can add testing account and field profile cannot',async()=>{
 const admin=PAGES_TEST_ACCOUNTS[0],vigia=PAGES_TEST_ACCOUNTS[2];
 const login=await pagesTestRequest('/login',{method:'POST',data:{email:admin.username,password:admin.password}});
 sessionStorage.setItem('rondaspro_api_token',login.token);
 assert.equal((await pagesTestRequest('/users')).users.length,3);
 const user={name:'Vigia Extra',username:'extra',email:'extra@example.test',role:'ronda',password:'Extra-Only-Test2026!'};
 assert.equal(typeof (await pagesTestRequest('/users',{method:'POST',data:user})).id,'string');
 assert.equal((await pagesTestRequest('/users')).users.length,4);
 await assert.rejects(pagesTestRequest('/users',{method:'POST',data:user}),{status:409});
 const field=await pagesTestRequest('/login',{method:'POST',data:{email:vigia.username,password:vigia.password}});
 sessionStorage.setItem('rondaspro_api_token',field.token);
 await assert.rejects(pagesTestRequest('/users',{method:'POST',data:{...user,username:'extra2',email:'extra2@example.test'}}),{status:403});
});
test('Pages app routes never require a backend for sign in',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const client=readFileSync(new URL('../src/live-client.js',import.meta.url),'utf8');
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(client,/if\(isPagesTestMode\(\)\)return pagesTestRequest/);
 assert.match(app,/\.\/central\.html/);
 assert.match(home,/src\/app\.js\?v=/);
 assert.match(worker,/pages-test-api\.js/);
});
