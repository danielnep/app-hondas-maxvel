/** Regressão: o perfil COI da demonstração abre e trata os registros locais. */
import {chromium} from 'playwright-core';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
const dir=mkdtempSync(join(tmpdir(),'coi-demo-'));
process.env.RONDA_PRO_DB_PATH=join(dir,'test.sqlite');
const server=createAppServer();let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [390,1366]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('horizon-maxvel-tour-v2','seen');
   localStorage.setItem('horizon-maxvel-localizacao-ciencia-v1',JSON.stringify({version:'2026-10-11',accepted:true,at:Date.now()}));
  });
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.locator('.dashboard').waitFor();
  if(await page.locator('.location-entry-grant').count())await page.locator('.location-entry-grant').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  // Entradas de preparação; os registros e formulários usam cliques reais abaixo.
  await page.locator('[data-action="sim-role-picker"]').first().evaluate(el=>el.click());
  await page.locator('#dialog [data-action="sim-role"][data-role="operador"]').click();
  await page.locator('[data-view="notificacoes"]').first().evaluate(el=>el.click());
  await page.locator('[data-action="notification-detail"][data-id="rev3-fixture-notice-v03"]').click();
  await page.locator('[data-action="acknowledge"]').waitFor({state:'visible'});
  await page.locator('[data-action="acknowledge"]').click();
  await page.locator('[data-action="notification-detail"][data-id="rev3-fixture-notice-v04"]').click();
  await page.locator('#incident-review-form').waitFor({state:'visible'});
  await page.locator('#incident-review-form [name="status"]').selectOption('Em análise');
  await page.locator('#incident-review-form [name="note"]').fill('Conferência solicitada pela equipe COI.');
  await page.locator('[data-action="incident-review"]').click();
  await page.locator('[data-view="ocorrencias"]').first().evaluate(el=>el.click());
  await page.locator('[data-action="incident-detail"]').first().click();
  await page.locator('#incident-review-form [name="status"]').selectOption('Resolvida');
  await page.locator('#incident-review-form [name="note"]').fill('Iluminação conferida e providência concluída pelo COI.');
  await page.locator('[data-action="incident-review"]').click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('horizon-maxvel-v1')));
  const incident=state.sessions.flatMap(s=>s.incidents).find(i=>i.id==='rev3-fixture-incident');
  if(incident.status!=='Resolvida'||incident.history.length!==2||errors.length)throw Error(JSON.stringify({incident,errors}));
  console.log('COI '+width+'px: alerta aberto/analisado; ocorrência aberta pelo feed e pela lista, tratada e persistida.');
  await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
