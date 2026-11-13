import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createSectorManagement,SECTOR_MODULES} from '../server/sector-management.js';

test('setores: ACL, CRUD sem exclusão, capacidades, vínculos, auditoria e onboarding por conta',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT,active INTEGER);CREATE TABLE audit(actor TEXT,action TEXT,subject TEXT)');
 const users=Object.fromEntries(['master','admin','coi','operador','ronda','vistoriador','cliente'].map(role=>{const user={id:randomUUID(),name:role,role};db.prepare('INSERT INTO users VALUES(?,?,?,1)').run(user.id,role,role);return [role,user];}));
 const service=createSectorManagement(db,{id:randomUUID,now:Date.now,audit:(u,a,s)=>db.prepare('INSERT INTO audit VALUES(?,?,?)').run(u.id,a,s),resp:(r,status,data)=>Object.assign(r,{status,data}),body:async req=>Buffer.from(JSON.stringify(req.data)),serialize:JSON.parse});
 const call=async(role,path,method='GET',data={})=>{const res={};assert.equal(await service.handle({data},res,users[role],path,method),true);return res;};
 try{
  for(const role of ['coi','operador','ronda','vistoriador','cliente'])assert.equal((await call(role,'/api/sectors','POST',{})).status,403);
  const created=await call('admin','/api/sectors','POST',{name:'Centro',address:'Rua Rio Grande do Sul 1541 Divinópolis/MG',addressConfirmed:false});assert.equal(created.status,201);
  const sid=created.data.id,path='/api/sectors/'+sid;
  assert.equal((await call('master','/api/sectors','POST',{name:'centro',addressConfirmed:false})).status,409);
  assert.equal(service.list()[0].address_confirmed,false);
  const capabilities=Object.fromEntries(SECTOR_MODULES.map(m=>[m,false]));
  const update={name:'Centro Renomeado',address:'Referência provisória',addressConfirmed:false,active:true,capabilities};
  assert.equal((await call('master',path,'PUT',update)).status,200);
  assert.equal((await call('admin',path,'PUT',{...update,capabilities:{mapa:'false'}})).status,422);
  for(const role of ['coi','operador','ronda','vistoriador','cliente']){
   assert.equal((await call('admin',path+'/members','PUT',{userId:users[role].id,enabled:true})).status,200);
   assert.equal(service.allows(users[role],'mapa'),false);
   assert.equal((await call(role,path,'DELETE')).status,403);
  }
  assert.equal(service.allows(users.master,'mapa'),true);
  assert.equal((await call('master',path,'PUT',{...update,capabilities:{mapa:true}})).status,200);
  assert.equal(service.allows(users.coi,'mapa'),true);
  assert.equal((await call('admin',path,'DELETE')).status,200);
  assert.equal(service.allows(users.coi,'mapa'),false);
  assert.equal(service.list()[0].members.length,5);
  assert.equal((await call('admin',path+'/members','PUT',{userId:users.coi.id,enabled:false})).status,409);
  await call('admin',path,'PUT',{...update,capabilities:{mapa:true}});
  await call('admin',path+'/members','PUT',{userId:users.coi.id,enabled:false});assert.equal(service.allows(users.coi,'mapa'),true);
  // A sector without capability rows must not accidentally grant legacy access.
  db.prepare('DELETE FROM maxvel_sector_capabilities WHERE sector_id=?').run(sid);assert.equal(service.allows(users.ronda,'mapa'),false);
  assert.equal((await call('ronda','/api/onboarding')).data.seen,false);
  await call('ronda','/api/onboarding','PUT');assert.equal((await call('ronda','/api/onboarding')).data.seen,true);
  assert.equal((await call('cliente','/api/onboarding')).data.seen,false);
  assert.ok(db.prepare("SELECT count(*) n FROM audit WHERE action LIKE 'sector.%'").get().n>=10);
 }finally{db.close();}
});
