import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

test('pontos cadastrados: só administração grava, COI reutiliza, arquivamento preserva o histórico',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-points-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'db.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@geo.test';
 process.env.RONDA_PRO_MASTER_PASSWORD='GeoTestPassword#12345';
 const server=createAppServer();
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const root='http://127.0.0.1:'+server.address().port+'/api';
 const request=(path,method='GET',data,token)=>fetch(root+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
 try{
  const response=await request('/login','POST',{email:'master@geo.test',password:'GeoTestPassword#12345'});
  assert.equal(response.status,200);const master=(await response.json()).token;
  assert.equal((await request('/saved-points')).status,401);
  assert.equal((await request('/saved-points','POST',{name:'Ponto A',address:'Rua das Flores, 123',lat:-20.14,lng:-44.88})).status,401);
  assert.equal((await request('/saved-points','POST',{name:'Ponto B',address:'Rua dos Ipês, 123',lat:null,lng:null},master)).status,422);
  assert.equal((await request('/users','POST',{name:'COI Teste',email:'coi@geo.test',role:'coi',password:'GeoTestPassword#12345'},master)).status,201);
  const coi=(await (await request('/login','POST',{email:'coi@geo.test',password:'GeoTestPassword#12345'})).json()).token;
  assert.equal((await request('/saved-points','POST',{name:'Sem permissão',address:'Rua dos Ipês, 123',lat:-20.13,lng:-44.87},coi)).status,403);
  const point={name:'Portaria externa',address:'Rua Goiás, 503, Divinópolis, MG',lat:-20.1419,lng:-44.8903};
  const added=await request('/saved-points','POST',point,master);assert.equal(added.status,201);
  const body=await added.json();assert.ok(body.id);
  const available=await request('/saved-points','GET',undefined,coi);assert.equal(available.status,200);
  const saved=(await available.json()).points;
  assert.ok(saved.some(p=>p.id===body.id&&p.address===point.address&&p.lat===point.lat&&p.lng===point.lng));
  assert.equal((await request('/saved-points/'+body.id,'DELETE',undefined,coi)).status,403);
  assert.equal((await request('/saved-points/'+body.id,'DELETE',undefined,master)).status,200);
  const after=(await (await request('/saved-points','GET',undefined,master)).json()).points;
  assert.ok(!after.some(p=>p.id===body.id));
 }finally{await new Promise(ok=>server.close(ok));rmSync(dir,{recursive:true,force:true});}
});
