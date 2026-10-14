import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createAppServer} from '../server.js';

test('migração mantém mídias anteriores e API armazena categoria da foto',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-photo-'));
 const dbPath=join(dir,'db.sqlite');
 const before={path:process.env.RONDA_PRO_DB_PATH,email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD};
 const legacy=new DatabaseSync(dbPath);
 legacy.exec('CREATE TABLE media(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,author_id TEXT NOT NULL,mimetype TEXT NOT NULL,filename TEXT NOT NULL,captured_at INTEGER NOT NULL,latitude REAL,longitude REAL,battery REAL,created_at INTEGER NOT NULL)');
 legacy.prepare('INSERT INTO media(id,event_id,author_id,mimetype,filename,captured_at,created_at) VALUES(?,?,?,?,?,?,?)').run('legacy-photo','legacy','legacy','image/jpeg','old-file',100,100);
 legacy.close();
 process.env.RONDA_PRO_DB_PATH=dbPath;
 process.env.RONDA_PRO_MASTER_EMAIL='master@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='superSecurePasswordForTests!';
 const server=createAppServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api';
 const json=async(path,data,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 try{
  const auth=await json('/login',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD});
  assert.equal(auth.status,200);
  const {token}=await auth.json();
  const created=await json('/events',{id:'photo-event-01',kind:'checkpoint',occurredAt:Date.now(),description:'Conferência do ponto de ronda'},token);
  assert.equal(created.status,201);
  const upload=async view=>fetch(base+'/media',{method:'POST',headers:{
   'Authorization':'Bearer '+token,'Content-Type':'image/jpeg','X-Ronda-Event-Id':'photo-event-01','X-Media-View':view,'X-Ronda-Media-Id':'b3d37d2f-cd32-4c3d-bbac-73a7acc13601',
  },body:Buffer.from([255,216,255,224,0,16,74,70,73,70])});
  assert.equal((await upload('unknown')).status,422);
  const uploaded=await upload('selfie');
  assert.equal(uploaded.status,201);
  assert.equal((await upload('selfie')).status,200,'Reenvio idempotente não cria cópia da imagem');
  const resp=await fetch(base+'/events/media?eventId=photo-event-01',{headers:{Authorization:'Bearer '+token}});
  assert.equal(resp.status,200);
  const payload=await resp.json();
  assert.equal(payload.media[0].evidence_view,'selfie');
  assert.equal(payload.media.length,1);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  const check=new DatabaseSync(dbPath);
  assert.equal(check.prepare('SELECT filename,evidence_view FROM media WHERE id=?').get('legacy-photo').filename,'old-file');
  assert.equal(check.prepare('SELECT filename,evidence_view FROM media WHERE id=?').get('legacy-photo').evidence_view,'');
  check.close();
  for(const [key,val] of Object.entries({RONDA_PRO_DB_PATH:before.path,RONDA_PRO_MASTER_EMAIL:before.email,RONDA_PRO_MASTER_PASSWORD:before.password})){
   if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
  rmSync(dir,{recursive:true,force:true});
 }
});
