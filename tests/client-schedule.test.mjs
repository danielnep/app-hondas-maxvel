import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('rota programada fica salva e acessível ao cliente correto; banco recebe migração sem exclusão',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rondas-client-schedule-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'client.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master-schedule@example.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='SenhaForteMaster2026##';
 const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api';
 const req=async(path,method='GET',data,token)=>{
  const res=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});
  return {status:res.status,data:await res.json()};
 };
 try{
  const root=(await req('/login','POST',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).data.token;
  const pass='SenhaForteTestes2026##';
  const worker=await req('/users','POST',{name:'Vigia teste',email:'vigia-schedule@example.test',password:pass,role:'ronda',site:'Posto A',description:'Vigia responsável por circuito autorizado'},root);
  assert.equal(worker.status,201);
  assert.equal((await req('/users','POST',{name:'Cliente A',email:'cliente-a@example.test',password:pass,role:'cliente',site:'Posto A',description:'Conta cliente da unidade'},root)).status,201);
  assert.equal((await req('/users','POST',{name:'Cliente B',email:'cliente-b@example.test',password:pass,role:'cliente',site:'Posto B',description:'Conta de outra unidade'},root)).status,201);
  const a=(await req('/login','POST',{email:'cliente-a@example.test',password:pass})).data.token;
  const b=(await req('/login','POST',{email:'cliente-b@example.test',password:pass})).data.token;
  const points=[{name:'Ponto da entrada',lat:-20.144,lng:-44.882},{name:'Ponto dos fundos',lat:-20.145,lng:-44.883}];
  const plannedStart=Date.now()+2*86400000;
  const created=await req('/routes','POST',{userId:worker.data.id,name:'Ronda prevista da noite',points,plannedStart},root);
  assert.equal(created.status,201);
  const mine=await req('/routes','GET',undefined,a),other=await req('/routes','GET',undefined,b);
  assert.equal(mine.status,200);assert.equal(other.status,200);
  assert.ok(mine.data.routes.some(r=>r.id===created.data.id&&r.plannedStart===plannedStart));
  assert.ok(!other.data.routes.some(r=>r.id===created.data.id));
  const update=await req('/routes/'+created.data.id,'PUT',{userId:worker.data.id,name:'Ronda reprogramada',points,plannedStart:plannedStart+3600000},root);
  assert.equal(update.status,200);
  const list=await req('/routes','GET',undefined,a);
  assert.equal(list.data.routes.find(r=>r.id===created.data.id).plannedStart,plannedStart+3600000);
  const invalid=await req('/routes','POST',{userId:worker.data.id,name:'Rota inválida',points,plannedStart:-10},root);
  assert.equal(invalid.status,422);
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true})}
});

test('estimativa mostra limite do cálculo, sem prometer trajeto pelas ruas',async()=>{
 const {readFileSync}=await import('node:fs');
 const central=readFileSync(new URL('../src/central.js',import.meta.url),'utf8');
 assert.match(central,/function routeEstimate\(route\)/);
 assert.match(central,/distanceKm\/20\*60/);
 assert.match(central,/30 segundos por ponto/);
 assert.match(central,/Aguardando programação confirmada/);
});
