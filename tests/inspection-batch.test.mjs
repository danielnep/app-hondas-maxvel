import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('COI: múltiplos locais atômicos, presença, coordenadas e vínculo do cliente',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-batch-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master-batch@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='BatchSecurePassword2026!';
 const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/api';
 const req=async(path,method='GET',data,token)=>{
  const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  return {status:r.status,body:await r.json()};
 };
 try{
  const master=(await req('/login','POST',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).body.token;
  const pass='BatchTestPassword123!';
  const make=async(role,email,site)=>{const created=await req('/users','POST',{name:'Teste '+role,email,password:pass,role,site,description:'Conta descartável de regressão operacional.'},master);assert.equal(created.status,201);return (await req('/login','POST',{email,password:pass})).body.token;};
  const inspector=await make('vistoriador','inspector@example.test','Base da equipe');
  const coi=await make('coi','coi@example.test','');
  const client=await make('cliente','client@example.test','Cliente vinculado');
  const other=await make('cliente','other@example.test','Outro cliente');
  const workerId=(await req('/me','GET',null,inspector)).body.user.id;
  const dest=await req('/inspection-destinations','POST',{clientName:'Cliente vinculado',address:'Rua Cliente, 100, Divinópolis',latitude:-20.14,longitude:-44.89},master);
  assert.equal(dest.status,201);
  const stops=[{lat:-20.14,lng:-44.89,address:'Rua Cliente, 100, Divinópolis',destinationId:dest.body.id},{lat:-20.15,lng:-44.90,address:'Rua Segundo, 200, Divinópolis'}];
  const payload={workerId,reason:'[PONTUAL] Conferir os acessos de cada endereço.',stops};
  assert.equal((await req('/dispatches/inspections-batch','POST',payload,client)).status,403);
  assert.equal((await req('/dispatches/inspections-batch','POST',payload,coi)).status,409);
  await req('/presence','POST',{},inspector);
  for(const invalid of [[],[...stops,{lat:91,lng:0,address:'Local inválido'}],[...stops,{lat:null,lng:0,address:'Local sem GPS'}],Array(13).fill(stops[0]),[...stops,{...stops[1],destinationId:'missing'}]]){
   assert.equal((await req('/dispatches/inspections-batch','POST',{...payload,stops:invalid},coi)).status,422);
   assert.equal((await req('/dispatches','GET',null,inspector)).body.dispatches.length,0,'lote inválido não deixa visitas parciais');
  }
  const sent=await req('/dispatches/inspections-batch','POST',payload,coi);
  assert.equal(sent.status,201);assert.equal(sent.body.dispatches.length,2);
  const rows=(await req('/dispatches','GET',null,inspector)).body.dispatches;
  assert.equal(rows.length,2);assert.ok(rows.every(d=>d.kind==='vistoria'));
  const saved=rows.find(d=>d.destination_id===dest.body.id);
  assert.equal(saved.site,'Cliente vinculado');assert.equal(saved.latitude,-20.14);
  assert.equal(rows.find(d=>!d.destination_id).longitude,-44.90);
  const inbox=(await req('/notifications','GET',null,inspector)).body.notifications;
  assert.equal(inbox.filter(n=>sent.body.dispatches.some(d=>d.id===n.dispatch_id)).length,2);
  const position={lat:-20.14,lng:-44.89,accuracy:10};
  assert.equal((await req('/dispatches/'+saved.id+'/start','POST',{position},inspector)).status,200);
  assert.equal((await req('/dispatches/'+saved.id+'/arrive','POST',{position},inspector)).status,200);
  const event=await req('/events','POST',{kind:'inspection',occurredAt:Date.now(),description:'Local verificado com laudo do cliente correto.',details:{dispatchId:saved.id,criteria:{acessos:true,estrutura:true,equipamentos:true,sinalizacao:true}}},inspector);
  assert.equal(event.status,201);
  const clientEvents=(await req('/events','GET',null,client)).body.events;
  const otherEvents=(await req('/events','GET',null,other)).body.events;
  assert.ok(clientEvents.some(e=>e.id===event.body.id));
  assert.ok(!otherEvents.some(e=>e.id===event.body.id));
  assert.equal((await req('/dispatches/inspections-batch','POST',{...payload,stops:[stops[1]]},coi)).status,201,'recebe novos locais enquanto está em vistoria');
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
