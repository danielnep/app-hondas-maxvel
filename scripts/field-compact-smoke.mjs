import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.js';
const server=createAppServer();let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 for(const width of [320,390,768,1366]){
  const context=await browser.newContext({viewport:{width,height:844},permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  await page.route('https://**/*',route=>route.abort());
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('horizon-maxvel-tour-v2','seen');localStorage.setItem('horizon-maxvel-localizacao-ciencia-v1',JSON.stringify({version:'2026-10-11',accepted:true,at:Date.now()}));});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  if(await page.locator('.location-entry-grant').count())await page.locator('.location-entry-grant').click();
  await page.locator('.location-entry-gate').waitFor({state:'detached'});
  await page.locator('[data-ops="central-alert"]').click();
  assert.equal(await page.locator('#field-alert-form textarea').count(),0);
  await page.locator('#field-alert-form input').fill('Portão aberto');
  await page.locator('#field-alert-form button').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rondas-pro-field-notices'))[0].label),'Portão aberto');
  await page.locator('[data-ops="incident-quick"]').click();
  await page.locator('#incident-form [name=title]').fill('Acesso lateral');
  await page.locator('#incident-form [name=description]').fill('Portão lateral encontrado aberto durante a inspeção.');
  await page.locator('#incident-form [name=severity]').selectOption('Alta');
  await page.locator('#incident-form [name=truth]').check();
  await page.locator('#incident-form button[type=submit]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rondas-pro-field-notices'))[0].details.severity),'Alta');
  if(width<=900){
   const map=await page.locator('.patrol-map-panel').boundingBox(),panic=await page.locator('.patrol-map-panel .ops-panic').boundingBox(),card=await page.locator('.patrol-actions').boundingBox();
   assert.ok(panic.x<map.x+80&&panic.y<map.y+130,'pânico no topo esquerdo');
   assert.ok(card.width<=321,'card compacto');
   assert.equal(await page.locator('[data-ops="central-alert"] svg').evaluate(e=>getComputedStyle(e).color),'rgb(250, 204, 21)');
   assert.equal(await page.locator('[data-ops="central-message"] svg').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
  }
  await page.locator('.patrol-actions [data-action="start"]').click({timeout:3000});
  await page.locator('#declaration-check').check();
  await page.locator('[data-action="confirm-start"]').click();
  if(width===390)await page.screenshot({path:'/tmp/rondas-compact-390.png'});
  await page.locator('[data-ops="incident-quick"]').click();
  await page.locator('#incident-form [name=title]').fill('Registro na ronda');
  await page.locator('#incident-form [name=description]').fill('Teste de ocorrência vinculada à ronda em andamento.');
  await page.locator('#incident-form [name=severity]').selectOption('Alta');
  await page.locator('#incident-form [name=truth]').check();
  await page.locator('#incident-form button[type=submit]').click();
  await page.locator('#dialog').waitFor({state:'hidden'});
  await page.locator('[data-ops="central-message"]').click();
  await page.locator('#demo-chat-form input').fill('Mensagem de teste ao COI');
  await page.locator('#demo-chat-form button').click();
  assert.match(await page.locator('.field-chat-messages').innerText(),/Mensagem de teste ao COI/);
  assert.deepEqual(errors,[]);
  console.log('PASS compact field flows',width);
  await context.close();
 }
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
