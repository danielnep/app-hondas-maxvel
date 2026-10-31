import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {createAppServer} from '../server.js';
import {pointQrValue} from '../src/verification-policy.js';

test('regra central persiste e QR confirma somente pontos atribuídos, em ordem',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'ronda-policy-'));
 process.env.RONDA_PRO_DB_PATH=join(temp,'qa.sqlite');process.env.RONDA_PRO_MASTER_EMAIL='master@policy.test';process.env.RONDA_PRO_MASTER_PASSWORD='VerificationIsolated_2026!';
 delete process.env.RONDA_PRO_PILOT_PASSWORD;delete process.env.RONDA_PRO_INITIAL_ACCOUNTS;
 let server=createAppServer(),base;
 const start=async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port;};
 const stop=async()=>{server.closeAllConnections();await new Promise(ok=>server.close(ok));};
 const api=async(path,token,data,method)=>{
  const response=await fetch(base+'/api'+path,{method:method||(data?'POST':'GET'),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  return {status:response.status,...await response.json()};
 };
 try{
  await start();assert.equal((await api('/operational-settings')).status,401);
  const master=(await api('/login',null,{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).token;
  const password='PolicyTeamAccount_2026!';
  const created={};for(const role of ['admin','coi','ronda'])created[role]=await api('/users',master,{name:'Política '+role,email:role+'@policy.test',username:role,role,password,site:'Grupo Maxvel'});
  const accounts={};for(const role of ['admin','coi','ronda'])accounts[role]=(await api('/login',null,{email:role,password})).token;
  assert.equal((await api('/operational-settings',accounts.ronda)).settings.dwellSeconds,30);
  for(const mode of ['qr','gps+qr','gps']){
   assert.equal((await api('/operational-settings',accounts.admin,{verificationMode:mode,dwellSeconds:30},'PUT')).status,200);
   assert.equal((await api('/operational-settings',accounts.ronda)).settings.verificationMode,mode);
  }
  assert.equal((await api('/operational-settings',accounts.coi,{verificationMode:'qr',dwellSeconds:30},'PUT')).status,403);
  assert.equal((await api('/operational-settings',accounts.ronda,{verificationMode:'qr',dwellSeconds:30},'PUT')).status,403);
  assert.equal((await api('/operational-settings',accounts.admin,{verificationMode:'qualquer',dwellSeconds:0},'PUT')).status,422);
  await api('/operational-settings',accounts.admin,{verificationMode:'qr',dwellSeconds:30},'PUT');
  await stop();server=createAppServer();await start();assert.equal((await api('/operational-settings',accounts.ronda)).settings.verificationMode,'qr');
  // Coordenadas reais de dois locais públicos retornados pelo geocodificador. Nenhum GPS de aparelho é fabricado.
  const points=[{name:'Praça do Santuário',address:'Praça do Santuário, Divinópolis',lat:-20.1429457,lng:-44.8904539},{name:'Restaurante Catedral',address:'Praça Dom Cristiano, Divinópolis',lat:-20.1388762,lng:-44.8850088}];
  const route=await api('/routes',accounts.admin,{name:'Percurso QA com locais reais',userId:created.ronda.id,points});assert.equal(route.status,201);
  const labels=await api('/routes/'+route.id+'/qr-codes',accounts.admin);assert.equal(labels.status,200);assert.equal(labels.codes.length,2);assert.match(labels.codes[0].svg,/<svg/);
  assert.equal((await api('/routes/'+route.id+'/qr-codes',accounts.ronda)).status,403);
  assert.equal(labels.codes[0].value,pointQrValue(route.id,points[0]));assert.notEqual(labels.codes[0].value,labels.codes[1].value);
  const qr=QRCode.create(labels.codes[0].value,{errorCorrectionLevel:'M'}),scale=6,margin=4,width=(qr.modules.size+margin*2)*scale,pixels=new Uint8ClampedArray(width*width*4).fill(255);
  for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
   const offset=(((y+margin)*scale+dy)*width+(x+margin)*scale+dx)*4;pixels[offset]=pixels[offset+1]=pixels[offset+2]=0;
  }
  assert.equal(jsQR(pixels,width,width).data,labels.codes[0].value);
  const roundId=randomUUID(),request=index=>({id:randomUUID(),roundId,routeId:route.id,pointIndex:index,code:labels.codes[index].value});
  assert.equal((await api('/qr/verify',accounts.admin,request(0))).status,403);
  assert.equal((await api('/qr/verify',accounts.ronda,request(1))).status,409);
  assert.equal((await api('/qr/verify',accounts.ronda,{...request(0),code:labels.codes[1].value})).status,422);
  const first=await api('/qr/verify',accounts.ronda,request(0));assert.equal(first.status,201);assert.equal(first.verified,true);
  const repeat=await api('/qr/verify',accounts.ronda,request(0));assert.equal(repeat.status,200);assert.equal(repeat.id,first.id);
  assert.equal((await api('/qr/verify',accounts.ronda,request(1))).status,201);
  assert.equal((await api('/qr/verify',accounts.ronda,{...request(0),routeId:randomUUID()})).status,403);
 }finally{await stop();rmSync(temp,{recursive:true,force:true});}
});
