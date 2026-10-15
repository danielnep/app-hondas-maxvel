import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../server.js';

test('chat privado: recibos reais, exclusão atômica, anexos, autorização e reinício; histórico permanente',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'rondas-chat-')),keys=['RONDA_PRO_DB_PATH','RONDA_PRO_MASTER_EMAIL','RONDA_PRO_MASTER_PASSWORD'],saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.RONDA_PRO_DB_PATH=join(dir,'data.sqlite');process.env.RONDA_PRO_MASTER_EMAIL='master@example.test';process.env.RONDA_PRO_MASTER_PASSWORD='SenhaMasterForte2026!';
 let server=createAppServer(),base;
 async function listen(){await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api';}
 async function call(path,token,method='GET',data){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});const result=r.headers.get('content-type')?.includes('application/json')?await r.json():await r.arrayBuffer();return {status:r.status,body:result};}
 await listen();
 try{
  const master=(await call('/login',null,'POST',{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).body.token;
  async function user(name,role='ronda',site='Centro'){
   const email=name+'@example.test',password='SenhaTesteForte2026!';const created=await call('/users',master,'POST',{name,role,site,email,password,phone:'37999991234',description:'Responsável por acompanhamento operacional'});assert.equal(created.status,201,JSON.stringify(created.body));return {id:created.body.id,token:(await call('/login',null,'POST',{email,password})).body.token};
  }
  const a=await user('Daniel'),b=await user('Maria'),c=await user('Carlos'),coi=await user('Monitor','coi'),inspector=await user('Vistoriador','vistoriador'),client=await user('Cliente','cliente','Outro');
  const create=await call('/chat/conversations',a.token,'POST',{members:[b.id]});assert.equal(create.status,201);const cid=create.body.id;
  const send=async(body,extra={})=>call('/chat/conversations/'+cid+'/messages',a.token,'POST',{body,...extra});
  const read=async(ids,token=b.token,conv=cid)=>call('/chat/conversations/'+conv+'/read',token,'POST',{ids});
  const messages=async(token=b.token,conv=cid)=>call('/chat/conversations/'+conv+'/messages',token);
  let deleted,seenMessage;
  await t.test('prévia não confirma entrega ou leitura; lista confirma entrega; leitura explícita confirma visualização',async()=>{
   const mid=randomUUID();const s=await send('Mensagem de teste',{id:mid});assert.equal(s.status,201);assert.equal(s.body.message.state,'enviada');seenMessage=mid;
   const preview=await call('/chat/conversations',b.token);assert.equal(preview.body.unread,1);assert.equal(preview.body.conversations[0].last.state,'enviada');
   const delivery=await call('/chat/deliveries',b.token);assert.ok(delivery.body.messages.some(m=>m.id===mid));assert.equal((await call('/chat/deliveries',b.token,'POST',{ids:[mid]})).status,200);assert.equal((await call('/chat/conversations',b.token)).body.unread,1,'Entrega em segundo plano não marca leitura');
   assert.equal((await messages()).body.messages[0].state,'recebida');assert.equal((await messages(a.token)).body.messages[0].canDelete,true);
   assert.equal((await read([mid])).status,200);const state=(await messages(a.token)).body.messages[0];assert.equal(state.state,'visualizada');assert.equal(state.canDelete,false);
   assert.equal((await call('/chat/messages/'+mid+'?scope=all',a.token,'DELETE')).status,409);assert.equal((await call('/chat/conversations',b.token)).body.unread,0);
   assert.equal((await send('Mensagem de teste',{id:mid})).status,200);assert.equal((await messages()).body.messages.length,1,'Reenvio não duplica');
  });
  await t.test('exclusão para todos antes da leitura remove texto e anexo, sem excluir histórico',async()=>{
   const s=await send('Arquivo',{kind:'document',attachments:[{filename:'teste.txt',mimetype:'text/plain',data:Buffer.from('conteudo privado').toString('base64')}]});deleted=s.body.message.id;const attachment=s.body.message.attachments[0].id;
   assert.equal((await call('/chat/attachments/'+attachment,b.token)).status,200);assert.equal((await call('/chat/attachments/'+attachment,c.token)).status,404);
   assert.equal((await call('/chat/messages/'+deleted+'?scope=all',b.token,'DELETE')).status,403);
   assert.equal((await call('/chat/messages/'+deleted+'?scope=all',a.token,'DELETE')).status,200);
   const result=(await messages()).body.messages.find(m=>m.id===deleted);assert.equal(result.body,'Mensagem excluída');assert.deepEqual(result.attachments,[]);assert.equal((await call('/chat/attachments/'+attachment,b.token)).status,404);
  });
  await t.test('grupos: qualquer visualização impede exclusão; recibos por participante e ocultação individual',async()=>{
   const group=(await call('/chat/conversations',a.token,'POST',{members:[b.id,c.id],title:'Equipe',isGroup:true})).body.id;
   const s=await call('/chat/conversations/'+group+'/messages',a.token,'POST',{body:'Grupo'});const mid=s.body.message.id;
   await read([mid],b.token,group);assert.equal((await call('/chat/messages/'+mid+'?scope=all',a.token,'DELETE')).status,409);
   const m=(await messages(a.token,group)).body.messages[0];assert.equal(m.receipts.length,2);assert.equal(m.receipts.filter(r=>r.read_at).length,1);
   assert.equal((await call('/chat/messages/'+mid+'?scope=self',b.token,'DELETE')).status,200);assert.equal((await messages(b.token,group)).body.messages.length,0);assert.equal((await messages(c.token,group)).body.messages.length,1);
  });
  await t.test('isolamento: terceiros, cliente de outro posto, respostas cruzadas e sinalização',async()=>{
   assert.equal((await messages(c.token)).status,404);assert.equal((await call('/chat/conversations',client.token)).body.conversations.length,0);
   assert.equal((await call('/chat/conversations',a.token,'POST',{members:[client.id]})).status,403);
   assert.equal((await call('/chat/conversations/'+cid+'/signals',c.token,'POST',{recipientId:b.id,signal:{type:'offer'}})).status,404);
   assert.equal((await call('/chat/conversations/'+cid+'/signals',a.token,'POST',{recipientId:c.id,signal:{type:'offer'}})).status,422);
   assert.equal((await call('/chat/conversations/'+cid+'/signals',a.token,'POST',{recipientId:b.id,signal:{type:'offer',callId:'call-test',sdp:{type:'offer',sdp:'test'}}})).status,201);
   assert.equal((await call('/chat/signals',b.token)).body.signals.length,1);assert.equal((await call('/chat/signals',c.token)).body.signals.length,0);
   assert.equal((await read([seenMessage],c.token)).status,404);
  });
  let roundId,eventId;
  await t.test('eventos separados do chat, telefone de pânico, cronologia e rota detalhada',async()=>{
   roundId=randomUUID();let at=Date.now()-60000;
   async function event(kind,position=null,details={}){const r=await call('/events',a.token,'POST',{kind,roundId,occurredAt:at+=5000,description:'Registro operacional de '+kind,position,details});assert.equal(r.status,201,JSON.stringify(r.body));return r.body.id;}
   await event('patrol_start');await event('gps',{lat:-20.14,lng:-44.89,accuracy:8});await event('checkpoint',{lat:-20.1401,lng:-44.8901,accuracy:8});await event('gps',{lat:-20.1402,lng:-44.8902,accuracy:8});eventId=await event('panic',{lat:-20.1402,lng:-44.8902,accuracy:8});await event('patrol_end');
   for(let i=0;i<6;i++)await event('alert');
   const ns=await call('/notifications?channel=events&limit=5',coi.token);assert.equal(ns.body.notifications.length,5);assert.ok(ns.body.unread>5);assert.ok(ns.body.total>5);assert.ok(ns.body.notifications.every(n=>n.kind!=='message'));
   const phone=await call('/activity/phone?event='+eventId,coi.token);assert.equal(phone.body.phone,'37999991234');assert.equal((await call('/activity/phone?event='+eventId,c.token)).status,404);
   const detail=await call('/activity/rounds/'+roundId,coi.token);assert.equal(detail.status,200);assert.equal(detail.body.round.status,'concluida');assert.equal(detail.body.track.length,2);assert.ok(detail.body.markers.some(m=>m.kind==='panic'));assert.equal((await call('/activity/rounds/'+roundId,c.token)).status,404);
   const h=await call('/activity/history?type=round&limit=1',coi.token);assert.equal(h.body.records.length,1);assert.equal(h.body.records[0].id,roundId);
   assert.equal((await call('/chat/conversations',a.token)).body.conversations.find(c=>c.id===cid).last.id,deleted,'Eventos não viram mensagens de chat');
   const n=ns.body.notifications[0];await call('/notifications/'+n.id+'/read',coi.token,'POST',{});assert.equal((await call('/notifications?channel=events',coi.token)).body.unread,ns.body.unread-1);
  });
  await t.test('paginação, busca e sincronização de exclusão fora da página recente',async()=>{
   const early=(await send('Registro anterior a várias páginas')).body.message.id;
   for(let i=0;i<52;i++)assert.equal((await send('Mensagem paginada '+i)).status,201);
   const first=(await messages()).body;assert.equal(first.messages.length,50);assert.equal(first.hasMore,true);
   const oldest=first.messages[0],second=(await call('/chat/conversations/'+cid+'/messages?before='+oldest.created_at+'&beforeId='+oldest.id,b.token)).body;
   const combined=[...first.messages,...second.messages];assert.equal(new Set(combined.map(m=>m.id)).size,combined.length);assert.ok(second.messages.some(m=>m.id===early));
   assert.equal((await call('/chat/messages/'+early+'?scope=all',a.token,'DELETE')).status,200);
   const states=await call('/chat/conversations/'+cid+'/message-states',b.token,'POST',{ids:[early]});assert.equal(states.body.messages[0].body,'Mensagem excluída');
   const search=await call('/chat/conversations/'+cid+'/messages?q='+encodeURIComponent('Mensagem paginada 51'),b.token);assert.equal(search.body.messages.length,1);
  });
  await t.test('vistoria abre histórico individual e detalhe autorizado com critérios preservados',async()=>{
   const event=await call('/events',inspector.token,'POST',{kind:'inspection',occurredAt:Date.now(),description:'Vistoria concluída no posto Centro',details:{criteria:{acessos:true,estrutura:true,equipamentos:false,sinalizacao:true}}});assert.equal(event.status,201);
   const list=await call('/activity/history?type=inspection',coi.token);assert.equal(list.body.records[0].id,event.body.id);assert.equal(list.body.records[0].details.qualityPercent,75);
   assert.equal((await call('/activity/events/'+event.body.id,inspector.token)).body.event.details.criteria.equipamentos,false);
   assert.equal((await call('/activity/events/'+event.body.id,c.token)).status,404);
  });
  await t.test('reinício mantém mensagens, recibos, exclusões, anexos e rondas',async()=>{
   server.closeAllConnections();await new Promise(r=>server.close(r));server=createAppServer();await listen();
   const m=(await call('/chat/conversations/'+cid+'/message-states',a.token,'POST',{ids:[seenMessage,deleted]})).body.messages;assert.equal(m.find(m=>m.id===seenMessage).state,'visualizada');assert.equal(m.find(m=>m.id===deleted).body,'Mensagem excluída');assert.equal((await call('/activity/rounds/'+roundId,coi.token)).body.track.length,2);
  });
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];rmSync(dir,{recursive:true,force:true})}
});
