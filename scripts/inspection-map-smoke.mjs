/**
 * Browser regression: ensure inspection route is actually visible, not only
 * present in the data model. Uses only synthetic destinations in Divinópolis.
 */
import {chromium} from 'playwright-core';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.js';

const directory=mkdtempSync(join(tmpdir(),'rondas-inspection-map-'));
process.env.RONDA_PRO_DB_PATH=join(directory,'test.sqlite');
const server=createAppServer();let browser;
const output='artifacts/uiux-refinement';
mkdirSync(output,{recursive:true});
const samples=[
 {address:'Maxvel Logística',latitude:-20.14135,longitude:-44.88605},
 {address:'Condomínio Reserva da Serra',latitude:-20.14245,longitude:-44.88285,
  routePoints:[{lat:-20.14190,lng:-44.88380}]},
 {address:'Metalúrgica Xavier',latitude:-20.13885,longitude:-44.88135}
];
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const total of [1,3]){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['geolocation'],geolocation:{latitude:-20.1403,longitude:-44.8840,accuracy:10}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await page.addInitScript(({rows})=>{
   localStorage.setItem('maxvel-demo-inspection-requests-v1',JSON.stringify(rows));
   localStorage.setItem('horizon-maxvel-tour-v2','seen');
   localStorage.setItem('horizon-maxvel-localizacao-ciencia-v1',JSON.stringify({version:'2026-10-11',accepted:true,at:Date.now()}));
  },{rows:samples.slice(0,total).map((r,i)=>({
   id:'demo-route-'+i,worker:'Vistoriador demonstrativo',instructions:'Verificar os acessos e registrar a vistoria no local.',
   routine:false,createdAt:Date.now()+i,completedAt:null,...r
  }))});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.locator('.dashboard').waitFor({timeout:30000});
  if(await page.locator('.location-entry-grant').count())await page.locator('.location-entry-grant').click();
  if(await page.locator('.location-entry-gate').count())await page.locator('.location-entry-gate').waitFor({state:'detached'});
  const openRoles=()=>page.locator('[data-action="sim-role-picker"]').first().evaluate(node=>node.click());
  await openRoles();
  if(!await page.locator('#dialog [data-action="sim-role"][data-role="vistoriador"]').count()){
   // A demo abre a troca de papéis somente depois de iniciar a experiência.
   await page.locator('.patrol-actions [data-action="start"]').click();
   await page.locator('#declaration-check').check();
   await page.locator('[data-action="confirm-start"]').click();
   await openRoles();
  }
  await page.locator('#dialog [data-action="sim-role"][data-role="vistoriador"]').click();
  const target=page.locator('#demo-inspection-map .fallback-svg');
  await target.waitFor({state:'attached',timeout:15000});
  const state=await target.evaluate(svg=>({
   labels:[...svg.querySelectorAll('g text')].map(n=>n.textContent.trim()),
   route:[...svg.querySelectorAll('polyline')][0]?.getAttribute('points')?.trim().split(/\s+/)||[]
  }));
  assert.deepEqual(state.labels,['B',...Array.from({length:total},(_,i)=>String(i+1))],
   'Os marcadores exibidos devem ser B e 1..N sem contar passagens');
  assert.ok(state.route.length>=total+1,'Percurso tem de ligar base e todos os destinos');
  assert.notEqual(state.route[0],state.route.at(-1),'Vistoria não fecha automaticamente na base');
  if(errors.length)throw Error('Erros de navegador: '+errors.join('; '));
  await page.screenshot({path:output+'/trajeto-vistoria-'+total+'-destino'+(total>1?'s':'')+'.png',fullPage:true});
  console.log('Vistoriador '+total+' destino(s): '+JSON.stringify(state));
  await context.close();
 }
 writeFileSync(output+'/inspecao-mapa-route-smoke.txt','Passou: 1 destino e 3 destinos, numeração correta e caminho contínuo B → N.');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
 rmSync(directory,{recursive:true,force:true});
}
