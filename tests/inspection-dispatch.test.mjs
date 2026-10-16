import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('COI cadastra destino, solicita vistoriador e portal isola laudo por cliente',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-inspection-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='superSecurePasswordForTests!';
 const server=createAppServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const host='http://127.0.0.1:'+server.address().port+'/api';
 const req=async(path,method='GET',data,token)=>{
  const response=await fetch(host+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  let body={};try{body=await response.json()}catch{}
  return {status:response.status,body};
 };
 try{
  const login=await req('/login','POST',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD});
  assert.equal(login.status,200);const admin=login.body.token;
  const pass='PasswordEnough1234!';
  for(const [role,email,site] of [['vistoriador','insp@example.test',''],['cliente','site@example.test','Cliente Modelo'],['cliente','other@example.test','Outro Cliente']]){
   const r=await req('/users','POST',{name:'Teste '+role,email,password:pass,role,site,description:'Conta de teste validada para simulações.'},admin);
   assert.equal(r.status,201);
  }
  const inspector=(await req('/login','POST',{email:'insp@example.test',password:pass})).body.token;
  const client=(await req('/login','POST',{email:'site@example.test',password:pass})).body.token;
  const other=(await req('/login','POST',{email:'other@example.test',password:pass})).body.token;
  const destination=await req('/inspection-destinations','POST',{clientName:'Cliente Modelo',contactName:'Contato Modelo',phone:'(31) 99999-0000',email:'contact@example.test',address:'Rua Exemplo, 100, Divinópolis'},admin);
  assert.equal(destination.status,201);
  assert.equal((await req('/presence','POST',{},inspector)).status,200);
  const available=await req('/availability','GET',null,admin);
  assert.equal(available.status,200);
  const worker=available.body.inspectors.find(w=>w.status==='Disponível');
  assert.ok(worker);
  const sent=await req('/dispatches','POST',{kind:'inspection',workerId:worker.id,destinationId:destination.body.id,reason:'Realizar vistoria de rotina no imóvel protegido.'},admin);
  assert.equal(sent.status,201);
  assert.equal((await req('/dispatches/'+sent.body.id+'/start','POST',{position:{lat:-20.14,lng:-44.89,accuracy:10}},inspector)).status,200);
  const event=await req('/events','POST',{kind:'inspection',occurredAt:Date.now(),description:'Inspeção completa com registro dos quatro critérios',details:{dispatchId:sent.body.id,criteria:{acessos:true,estrutura:true,equipamentos:true,sinalizacao:true}}},inspector);
  assert.equal(event.status,201);
  const finishWithoutEvidence=await req('/dispatches/'+sent.body.id+'/complete','POST',{note:'Local conferido e documentado com evidências.'},inspector);
  assert.equal(finishWithoutEvidence.status,422,'Não concluir vistoria antes de selfie e foto do local');
  const upload=async view=>{
   const response=await fetch(host+'/media',{method:'POST',headers:{Authorization:'Bearer '+inspector,'Content-Type':'image/jpeg','X-Ronda-Event-Id':event.body.id,'X-Media-View':view},body:new Uint8Array([255,216,255,224,0,16])});
   return response.status;
  };
  assert.equal(await upload('selfie'),201);
  assert.equal((await req('/dispatches/'+sent.body.id+'/complete','POST',{note:'Local verificado e documentado com selfie.'},inspector)).status,422);
  assert.equal(await upload('front'),201);
  assert.equal((await req('/dispatches/'+sent.body.id+'/complete','POST',{note:'Local verificado, fotos e laudo entregues ao COI.'},inspector)).status,200);
  const typed=await req('/dispatches','POST',{kind:'inspection',workerId:worker.id,address:'Rua de Teste, 345, Centro, Divinópolis',reason:'Vistoria extra de rotina solicitada pelo COI.',latitude:-20.145,longitude:-44.892,routePoints:[{lat:-20.146,lng:-44.89,label:'Portão lateral'},{lat:-20.1453,lng:-44.891,label:'Entrada técnica'}]},admin);
  assert.equal(typed.status,201,'COI pode informar novo endereço sem cadastro de destino');
  const typedAssignment=(await req('/dispatches','GET',null,inspector)).body.dispatches.find(d=>d.id===typed.body.id);
  assert.equal(typedAssignment.address,'Rua de Teste, 345, Centro, Divinópolis');
  assert.equal(typedAssignment.latitude,-20.145);
  assert.deepEqual(JSON.parse(typedAssignment.route_points),[{lat:-20.146,lng:-44.89,label:'Portão lateral'},{lat:-20.1453,lng:-44.891,label:'Entrada técnica'}]);
  const invalid=await req('/dispatches','POST',{kind:'inspection',workerId:worker.id,address:'Rua Teste, 400',reason:'Vistoria com coordenadas inválidas.',routePoints:[{lat:300,lng:0}]},admin);
  assert.equal(invalid.status,422,'Coordenadas do trajeto precisam ser validadas pelo servidor');
  const allowed=await req('/events','GET',null,client);
  const blocked=await req('/events','GET',null,other);
  assert.ok(allowed.body.events.some(e=>e.id===event.body.id));
  assert.ok(!blocked.body.events.some(e=>e.id===event.body.id));
  assert.equal((await req('/events/media?eventId='+event.body.id,'GET',null,other)).status,404);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});
