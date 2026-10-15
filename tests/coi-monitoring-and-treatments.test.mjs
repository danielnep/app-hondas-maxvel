import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('COI vê GPS recente da equipe, recebe laudos e deve encerrar tratativa; ADM apenas audita',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rondas-coi3-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'operacao.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='admin-coi3@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='MasterSenhaForteTeste2026!!';
 const server=createAppServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/api';
 const call=async(method,path,data,token)=>{
  const res=await fetch(origin+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});
  return {status:res.status,body:await res.json()};
 };
 const post=(p,d,t)=>call('POST',p,d,t);
 const get=(p,t)=>call('GET',p,undefined,t);
 try{
  const master=(await post('/login',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).body.token;
  const password='TesteSenhaForte2026!abc';
  for(const [role,email,site] of [
   ['coi','coi3@example.test',''],['vistoriador','vistoriador3@example.test','Unidade Centro']
  ]){
   const created=await post('/users',{name:'Teste '+role,email,password,role,site,description:'Equipe fictícia exclusiva do teste automatizado'},master);
   assert.equal(created.status,201);
  }
  const coi=(await post('/login',{email:'coi3@example.test',password})).body.token;
  const inspector=(await post('/login',{email:'vistoriador3@example.test',password})).body.token;
  const before=await get('/availability',coi);
  assert.equal(before.status,200);
  const worker=before.body.inspectors[0];assert.ok(worker);
  assert.equal(worker.position,null);
  assert.equal((await get('/availability',inspector)).status,403);
  const position={lat:-20.145,lng:-44.891,accuracy:12};
  const reported=await post('/presence',{position},inspector);
  assert.equal(reported.status,200);assert.equal(reported.body.positionRecorded,true);
  const available=(await get('/availability',coi)).body.inspectors.find(x=>x.id===worker.id);
  assert.equal(available.status,'Disponível');
  assert.equal(available.position.lat,position.lat);
  assert.equal(available.position.lng,position.lng);
  const invalid=await post('/presence',{position:{lat:999,lng:-44.891}},inspector);
  assert.equal(invalid.body.positionRecorded,false);
  const check=(await get('/availability',coi)).body.inspectors.find(x=>x.id===worker.id);
  assert.equal(check.position.lat,position.lat,'GPS inválido não substitui o último fix válido');
  const dest=await post('/inspection-destinations',{
   clientName:'Cliente Exemplo',address:'Rua de Teste, 150, Divinópolis',
   contactName:'Responsável Teste',phone:'31999990000',email:'contato@example.test'
  },master);
  assert.equal(dest.status,201);
  const dispatch=await post('/dispatches',{kind:'inspection',workerId:worker.id,destinationId:dest.body.id,reason:'Conferir os acessos e registrar o estado do local protegido.'},coi);
  assert.equal(dispatch.status,201);
  assert.equal((await post('/dispatches/'+dispatch.body.id+'/start',{position},inspector)).status,200);
  const event=await post('/events',{
   kind:'inspection',occurredAt:Date.now(),description:'Vistoria realizada com quatro critérios e observação completa',
   details:{dispatchId:dispatch.body.id,criteria:{acessos:true,estrutura:true,equipamentos:true,sinalizacao:false}},position
  },inspector);
  assert.equal(event.status,201);
  const inbox=(await get('/notifications',coi)).body.notifications;
  const alert=inbox.find(n=>n.event_id===event.body.id&&n.kind==='inspection');
  assert.ok(alert,'COI deve receber laudo de vistoria');
  assert.equal(alert.event_status,'aberta');
  assert.equal((await post('/notifications/'+alert.id+'/read',{},coi)).status,200);
  assert.equal((await get('/notifications',coi)).body.notifications.find(n=>n.id===alert.id).event_status,'aberta','ler não encerra a tratativa');
  const review=await post('/events/'+event.body.id+'/review',{
   status:'resolvida',conclusion:'O COI verificou o laudo, solicitou acompanhamento da sinalização e registrou a providência para conferência administrativa.'
  },coi);
  assert.equal(review.status,200);
  const closed=(await get('/notifications',coi)).body.notifications.find(n=>n.id===alert.id);
  assert.equal(closed.event_status,'resolvida');
  const admInbox=(await get('/notifications',master)).body.notifications;
  assert.ok(admInbox.some(n=>n.kind==='review'&&n.event_id===event.body.id),'Administração audita a decisão');
  const audit=(await get('/event-treatments',master)).body.treatments;
  assert.ok(audit.some(t=>t.event_id===event.body.id&&t.to_status==='resolvida'));
 }finally{
  await new Promise(resolve=>server.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});

test('composição COI mantém abas, mapa contextual e distinção de GPS antigo',async()=>{
 const {readFileSync}=await import('node:fs');
 const module=readFileSync(new URL('../src/coi-monitor.js',import.meta.url),'utf8');
 const central=readFileSync(new URL('../src/central.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../assets/coi-operations-v3.css',import.meta.url),'utf8');
 assert.match(module,/data-coi-tab="rondas"/);
 assert.match(module,/data-coi-tab="vistorias"/);
 assert.match(module,/position/);
 assert.match(module,/lastFixAt/);
 assert.match(module,/última posição|Última posição/);
 assert.match(module,/requestAnimationFrame\(animate\)/);
 assert.match(module,/basemaps\.cartocdn\.com\/dark_all/);
 assert.match(module,/privacy|GPS recente|sem coordenadas/i);
 assert.match(central,/function treatmentsView\(\)/);
 assert.match(central,/coi\.render\(/);
 assert.match(central,/coi\.mount\(\)/);
 assert.match(css,/@media\(max-width:760px\)/);
});
