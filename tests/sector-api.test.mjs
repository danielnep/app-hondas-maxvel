import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOperationalApi} from '../server/operational-api.js';

test('API real sem socket: autenticação, setores, ACL, emergência e persistência SQLite',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ronda-beta-api-'));
 process.env.RONDA_PRO_DB_PATH=join(dir,'isolated.sqlite');
 process.env.RONDA_PRO_MASTER_EMAIL='master@beta.invalid';process.env.RONDA_PRO_MASTER_PASSWORD='IsolatedBetaPassword123!';
 delete process.env.RONDA_PRO_INITIAL_ACCOUNTS;
 let api=createOperationalApi();
 const request=async(path,method='GET',data,token)=>{
  const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);
  Object.assign(req,{url:'/api'+path,method,headers:{host:'local',...(token?{authorization:'Bearer '+token}:{})}});
  const res={writeHead(status){this.status=status},end(raw){this.data=JSON.parse(raw)}};
  assert.equal(await api(req,res),true);return res;
 };
 const login=async email=>{const res=await request('/login','POST',{email,password:'IsolatedBetaPassword123!'});assert.equal(res.status,200);return res.data.token;};
 try{
  assert.equal((await request('/sectors')).status,401);
  const master=await login('master@beta.invalid'),accounts={};
  for(const role of ['admin','coi','operador','ronda','vistoriador','cliente']){
   const created=await request('/users','POST',{name:role+' Beta',email:role+'@beta.invalid',password:'IsolatedBetaPassword123!',role,site:'Setor QA'},master);assert.equal(created.status,201,role);
   const token=await login(role+'@beta.invalid');accounts[role]={token,id:(await request('/me','GET',undefined,token)).data.user.id};
   if(role!=='admin')assert.equal((await request('/sectors','POST',{name:'Negado',addressConfirmed:false},token)).status,403);
  }
  const created=await request('/sectors','POST',{name:'Setor QA',address:'Referência provisória',addressConfirmed:false},accounts.admin.token);assert.equal(created.status,201);
  const path='/sectors/'+created.data.id;
  for(const {id} of Object.values(accounts).filter(a=>a!==accounts.admin))assert.equal((await request(path+'/members','PUT',{userId:id,enabled:true},master)).status,200);
  const update={name:'Setor Beta',address:'Referência provisória',addressConfirmed:false,active:true,capabilities:{mapa:false,rondas:false,despachos:false,relatorios:false,equipe:false,vistorias:false,ocorrencias:false,alertas:false}};
  assert.equal((await request(path,'PUT',update,master)).status,200);
  assert.ok((await request('/coi-permissions','GET',undefined,accounts.coi.token)).data.modules.every(m=>!m.enabled));
  assert.ok((await request('/coi-permissions','GET',undefined,master)).data.modules.every(m=>m.enabled));
  for(const role of ['coi','operador','ronda','vistoriador','cliente']){
   const token=accounts[role].token;
   for(const endpoint of ['/dashboard','/routes','/dispatches','/export','/users'])assert.equal((await request(endpoint,'GET',undefined,token)).status,403,role+endpoint);
  }
  assert.equal((await request('/events','POST',{id:'beta-emergency-test',kind:'panic',occurredAt:Date.now(),description:'Teste isolado de emergência'},accounts.ronda.token)).status,201);
  assert.equal((await request('/events','GET',undefined,accounts.ronda.token)).status,200);
  assert.equal((await request('/onboarding','PUT',{},accounts.ronda.token)).status,200);
  api=createOperationalApi();
  assert.equal((await request('/onboarding','GET',undefined,accounts.ronda.token)).data.seen,true);
  assert.equal((await request('/onboarding','GET',undefined,accounts.cliente.token)).data.seen,false);
  const list=(await request('/sectors','GET',undefined,master)).data.sectors;
  assert.equal(list[0].name,'Setor Beta');assert.equal(list[0].address_confirmed,false);assert.equal(list[0].members.length,5);
  await request(path,'DELETE',undefined,master);
  assert.equal((await request('/sectors','GET',undefined,master)).data.sectors[0].members.length,5);
  await request(path,'PUT',{...update,capabilities:{...update.capabilities,mapa:true}},master);
  assert.equal((await request('/dashboard','GET',undefined,accounts.coi.token)).status,200);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
