import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('a conexão usa a linha nativa e só confirma o servidor após resposta',async()=>{
 const events=new Map(),ready=new Map(),updates=[];
 let failure=false,pending=0;
 const window={
  fetch:async()=>{if(failure)throw new TypeError('Servidor indisponível');return new Response('{}',{status:200});},
  addEventListener:(name,fn)=>events.set(name,fn),
  AndroidTracking:{setConnectionStatus:(state,count)=>updates.push({state,count})},
  RondaOffline:{pending:()=>pending,cache:()=>{},read:()=>'',flush:()=>{}}
 };
 const document={addEventListener:(name,fn)=>ready.set(name,fn),getElementById:()=>null,
  createElement:()=>{throw new Error('O estado da conexão não pode criar sobreposição na WebView.');}};
 const navigator={onLine:true};
 const context=vm.createContext({window,document,navigator,URL,Headers,Response,location:{href:'https://maxvel.hzsys.tech/app/index.html',origin:'https://maxvel.hzsys.tech'},localStorage:{getItem:()=>null,setItem:()=>{}}});
 vm.runInContext(readFileSync(new URL('../src/native-boot.js',import.meta.url),'utf8'),context);
 ready.get('DOMContentLoaded')();assert.deepEqual(updates.at(-1),{state:'connecting',count:0});
 await window.fetch('/api/me');assert.deepEqual(updates.at(-1),{state:'online',count:0});
 failure=true;await window.fetch('/api/me');assert.deepEqual(updates.at(-1),{state:'offline',count:0});
 failure=false;events.get('online')();assert.deepEqual(updates.at(-1),{state:'connecting',count:0});
 pending=3;await window.fetch('/api/me');assert.deepEqual(updates.at(-1),{state:'online',count:3});
 navigator.onLine=false;events.get('offline')();assert.deepEqual(updates.at(-1),{state:'offline',count:3});
});
