import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('publicação no GitHub encaminha para o login real da VPS',()=>{
 for(const page of ['index.html','central.html']){
  const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
  const script=html.match(/<script>(window\.__RONDA_PRODUCTION__[\s\S]*?)<\/script>/)[1];
  let target='';const scope={window:{},location:{hostname:'danielnep.github.io',replace:value=>{target=value}}};
  vm.runInNewContext(script,scope);
  assert.equal(scope.window.__RONDA_PRODUCTION__,true);
  assert.equal(target,'https://maxvel.hzsys.tech/');
  scope.location.hostname='maxvel.hzsys.tech';target='';vm.runInNewContext(script,scope);assert.equal(target,'');
 }
});

test('produção não aceita atalhos de login fictício, mesmo no hostname dos testes antigos',async()=>{
 const mode=await import('../src/pages-test-api.js');
 globalThis.location={hostname:'danielnep.github.io'};
 globalThis.__RONDA_PRODUCTION__=true;
 try{assert.equal(mode.isPagesTestMode(),false);}
 finally{delete globalThis.location;delete globalThis.__RONDA_PRODUCTION__;}
});

test('adaptador publicado de produção rejeita chamadas ao simulador',async()=>{
 const mode=await import('../src/production-api-mode.js');
 assert.equal(mode.isPagesTestMode(),false);
 assert.deepEqual(mode.PAGES_TEST_ACCOUNTS,[]);
 await assert.rejects(mode.pagesTestRequest('/login'),error=>error.status===410);
});
