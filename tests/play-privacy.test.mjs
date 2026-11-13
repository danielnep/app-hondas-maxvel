import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createAppServer} from '../server.js';
import {deliverDeletionNotification,processDueNotificationRetries} from '../server/privacy.js';

test('privacy request persists, rejects bad input and limits access to master',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rp-privacy-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@qa.invalid';
 process.env.RONDA_PRO_MASTER_PASSWORD='PrivacyTestPassword123!';
 delete process.env.RESEND_API_KEY;
 const server=createAppServer();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(p,d)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
 try{
  assert.equal((await fetch(base+'/assets/privacy.html')).status,200);
  assert.equal((await fetch(base+'/assets/privacidade-google/exclusao.html')).status,200);
  assert.equal((await fetch(base+'/api/privacy-requests')).status,401);
  assert.equal((await post('/api/privacy-requests',{email:'invalid',kind:'deletion',message:'Delete my data'})).status,422);
  assert.equal((await post('/api/privacy-requests',{email:'person@example.test',organization:'X',kind:'deletion',message:'Solicito análise da exclusão da minha conta.'})).status,422);
  const response=await post('/api/privacy-requests',{email:'person@example.test',organization:'Grupo Maxvel',kind:'deletion',message:'Solicito análise da exclusão da minha conta.'});
  assert.equal(response.status,201);
  const receipt=await response.json();
  assert.ok(receipt.id);
  assert.equal(receipt.status,'received');
  assert.equal(receipt.notificationStatus,'retry_scheduled');
  assert.doesNotMatch(receipt.message,/e-mail enviado/i);
  const login=await post('/api/login',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD});
  const {token}=await login.json();
  const list=await (await fetch(base+'/api/privacy-requests',{headers:{Authorization:'Bearer '+token}})).json();
  assert.equal(list.requests[0].id,receipt.id);
  assert.equal(list.requests[0].status,'received');
  assert.equal(list.requests[0].organization,'Grupo Maxvel');
  assert.equal(list.requests[0].notification_status,'retry_scheduled');
  assert.equal((await post('/api/login',{email:'admin',password:'invalidpassword'})).status,401);
 }finally{
  await new Promise(r=>server.close(r));
  rmSync(dir,{recursive:true,force:true});
 }
});

test('deletion notification sends expected payload to Daniel, retries on failure, and never duplicates accepted messages',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rp-privacy-notify-'));
 const dbFile=join(dir,'privacy-requests.sqlite');
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RESEND_API_KEY='re_test_key_do_not_expose';
 process.env.RESEND_FROM_EMAIL='Horizon <nao-responda@horizonsolucoes.com>';
 process.env.RONDA_PRO_DELETION_NOTIFY_EMAIL='recipient@example.test';
 const db=new DatabaseSync(dbFile);
 const calls=[];
 let shouldFail=true;
 const mockFetch=async(url,opts)=>{
  calls.push({url,opts,body:JSON.parse(opts.body)});
  if(shouldFail)return {ok:false,status:502,json:async()=>({})};
  return {ok:true,status:200,json:async()=>({id:'re_msg_12345'})};
 };
 try{
  db.exec("CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,email TEXT NOT NULL,organization TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'received',notification_status TEXT NOT NULL DEFAULT 'pending',notification_provider_id TEXT,notification_attempts INTEGER NOT NULL DEFAULT 0,notification_last_error TEXT,notification_next_retry_at INTEGER,notification_updated_at INTEGER)");
  const id='proto-test-001';
  const now=1794163000000;
  db.prepare('INSERT INTO requests(id,email,organization,kind,message,created_at,status,notification_status,notification_attempts) VALUES(?,?,?,?,?,?,?,?,0)')
   .run(id,'solicitante@empresa.test','Grupo Maxvel','deletion','TESTE — NÃO EXCLUIR CONTA: pedido de verificação.',now,'received','pending');

  // 1st attempt fails -> preserved as received, notification_status=retry_scheduled
  const afterFail=await deliverDeletionNotification(db,id,{fetchImpl:mockFetch});
  assert.equal(afterFail.status,'received');
  assert.equal(afterFail.notification_status,'retry_scheduled');
  assert.equal(afterFail.notification_attempts,1);
  assert.equal(afterFail.notification_provider_id,null);
  assert.equal(calls.length,1);

  // Force retry window due and succeed
  shouldFail=false;
  db.prepare('UPDATE requests SET notification_next_retry_at=? WHERE id=?').run(Date.now()-1000,id);
  await processDueNotificationRetries(db,{fetchImpl:mockFetch});
  const afterSuccess=db.prepare('SELECT * FROM requests WHERE id=?').get(id);
  assert.equal(afterSuccess.status,'received');
  assert.equal(afterSuccess.notification_status,'accepted');
  assert.equal(afterSuccess.notification_provider_id,'re_msg_12345');
  assert.equal(afterSuccess.notification_attempts,2);
  assert.equal(calls.length,2);
  assert.equal(calls[1].body.subject,`Ronda Pro — solicitação de exclusão — ${id}`);
  assert.deepEqual(calls[1].body.to,['recipient@example.test']);
  assert.equal(calls[1].opts.headers['Idempotency-Key'],`ronda-pro-deletion-${id}`);
  assert.match(calls[1].body.text,/Protocolo: proto-test-001/);
  assert.match(calls[1].body.text,/E-mail do solicitante: solicitante@empresa\.test/);
  assert.match(calls[1].body.text,/Organização informada: Grupo Maxvel/);
  assert.match(calls[1].body.text,/TESTE — NÃO EXCLUIR CONTA/);

  // Subsequent call must not duplicate an already accepted message
  await deliverDeletionNotification(db,id,{fetchImpl:mockFetch});
  assert.equal(calls.length,2);
 }finally{
  db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});
