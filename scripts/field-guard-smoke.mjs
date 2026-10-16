/**
 * Smoke real da área autenticada do VIGIA, com GPS sintético controlado pelo
 * navegador. Não confundir com uma validação física na rua.
 */
import {chromium} from 'playwright-core';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.js';

const temp=mkdtempSync(join(tmpdir(),'guard-field-'));
process.env.RONDA_PRO_DB_PATH=join(temp,'rounds.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='guard-root@example.test';
process.env.RONDA_PRO_MASTER_PASSWORD='GuardRootPassword!!2026';
const server=createAppServer();let browser;
const basePos={latitude:-20.14,longitude:-44.88,accuracy:8};
const first={lat:-20.14045,lng:-44.8802,name:'Portão principal'};
const second={lat:-20.1408,lng:-44.88065,name:'Docas'};
const request=async(path,token,data)=>{
 const res=await fetch('http://127.0.0.1:'+server.address().port+'/api'+path,{
  method:data?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},
  body:data?JSON.stringify(data):undefined
 });
 const content=await res.json();assert.equal(res.status>=200&&res.status<300,true,path+' '+res.status+' '+JSON.stringify(content));return content;
};
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const admin=(await request('/login',null,{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).token;
 const password='GuardTestPassword!!2026';
 const user=await request('/users',admin,{name:'Vigia Teste de Campo',email:'guard-smoke@example.test',password,role:'ronda',site:'Posto de teste',description:'Operação GPS de teste'});
 await request('/routes',admin,{userId:user.id,name:'Ronda Rua de Teste',points:[first,second]});
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 mkdirSync('artifacts/coi-authenticated',{recursive:true});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:basePos,locale:'pt-BR'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/central.html',{waitUntil:'domcontentloaded'});
 await page.locator('#central-login [name=email]').fill('guard-smoke@example.test');
 await page.locator('#central-login [name=password]').fill(password);
 await page.locator('#central-login button').click();
 await page.locator('#guard-real-map').waitFor({timeout:20000});
 const tools=['torch','panic','alert','incident','chat'];
 for(const item of tools)assert.equal(await page.locator('[data-guard-cockpit] [data-field-tool-'+item+']').count(),1,item+' ausente');
 await page.locator('[data-guard-start]').click();
 await page.locator('[data-guard-arrive]').waitFor({timeout:12000});
 let events=(await request('/events?limit=100',(await request('/login',null,{email:'guard-smoke@example.test',password})).token)).events;
 assert.ok(events.some(e=>e.kind==='patrol_start'),'início não enviado ao servidor');
 await context.setGeolocation({latitude:first.lat,longitude:first.lng,accuracy:8});
 await page.locator('[data-guard-arrive]').click();
 await page.locator('[data-guard-checkpoint]').waitFor({timeout:12000});
 const info=await page.locator('[data-guard-timer]').textContent();
 assert.match(info,/30|29|Permanência/);
 // Tempo acelerado somente na validação automatizada usando data da sessão:
 // a interface continua exigindo os 30 segundos reais na produção.
 const state=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('rondas-pro-real-guard-'));return JSON.parse(localStorage.getItem(key))});
 assert.equal(state.index,0);assert.ok(state.insideSince);
 await page.screenshot({path:'artifacts/coi-authenticated/vigia-mapa-autenticado.png',fullPage:true});
 assert.deepEqual(errors,[]);
 await context.close();
 console.log('Vigia autenticado: mapa e cinco comandos, início sincronizado, Estou aqui e temporizador GPS.');
}finally{
 await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});
}
