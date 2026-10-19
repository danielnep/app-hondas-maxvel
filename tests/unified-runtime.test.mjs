import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('uma entrada unica com runtime ou previa',()=>{
 const boot=file('src/bootstrap.js');
 assert.match(file('index.html'),/src\/bootstrap\.js/);
 assert.match(boot,/api\/runtime/);
 assert.match(boot,/\.\/central\.js/);
 assert.match(boot,/\.\/app\.js/);
 assert.match(file('central.html'),/location\.replace/);
 assert.doesNotMatch(file('src/app.js'),/\/central\.html/);
 assert.match(file('sw.js'),/\.\/src\/bootstrap\.js/);
});
test('Android recebe backend HTTPS por configuracao do build',()=>{
 const java=file('android/app/src/main/java/br/com/horizon/maxvel/MainActivity.java');
 assert.doesNotMatch(java,/ronda-pro-production\.up\.railway\.app/);
 assert.match(java,/BuildConfig\.RONDA_PRO_BASE_URL/);
 assert.match(java,/appassets\.androidplatform\.net/);
});
test('runtime protege login e usa SQLite persistente quando configurado',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-qa-'));
 const keys=['RONDA_PRO_DB_PATH','RONDA_PRO_MASTER_EMAIL','RONDA_PRO_MASTER_PASSWORD'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const check=async configured=>{
  const server=createAppServer();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  try {
   const mode=await(await fetch(base+'/api/runtime')).json();
   assert.equal(mode.operational,configured);
   assert.equal((await fetch(base+'/api/me')).status,configured?401:503);
   if(configured){
    const headers={'Content-Type':'application/json'};
    const wrong=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({email:'qa@example.invalid',password:'wrong'})});
    assert.equal(wrong.status,401);
    const login=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({email:'qa@example.invalid',password:'TemporaryQaPassword2026!'})});
    assert.equal(login.status,200);
    const {token}=await login.json();assert.equal(token.length,64);
    const me=await fetch(base+'/api/me',{headers:{Authorization:'Bearer '+token}});
    assert.equal(me.status,200);
   }
  }finally{await new Promise(r=>server.close(r))}
 };
 try{
  for(const k of keys)delete process.env[k];
  await check(false);
  process.env.RONDA_PRO_DB_PATH=join(dir,'operations.sqlite');
  process.env.RONDA_PRO_MASTER_EMAIL='qa@example.invalid';
  process.env.RONDA_PRO_MASTER_PASSWORD='TemporaryQaPassword2026!';
  await check(true);
 }finally{
  for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}
  rmSync(dir,{force:true,recursive:true});
 }
});
