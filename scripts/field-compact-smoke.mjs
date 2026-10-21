import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('.'),origin='https://ronda-pro-production.up.railway.app';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 for(const width of [320,390,768,1366]){
  const context=await browser.newContext({viewport:{width,height:844},permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin){
    if(url.pathname.startsWith('/api/'))throw Error('Teste não deve chamar API real: '+url.pathname);
    const file=resolve(root,url.pathname.slice(1)||'index.html');
    if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:'Not Found'});
    return route.fulfill({path:file,contentType:types[extname(file)]||'application/octet-stream'});
   }
   return route.abort();
  });
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('horizon-maxvel-tour-v2','seen');localStorage.setItem('horizon-maxvel-localizacao-ciencia-v1',JSON.stringify({version:'2026-10-11',accepted:true,at:Date.now()}));});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#dialog .role-picker-list [data-role="ronda"]').click();
  await page.locator('#dialog [data-username="vigia-demo-lucas"]').click();
  await page.locator('.dashboard').waitFor({state:'visible',timeout:12000});
  await page.locator('[data-ops="central-alert"]').click();
  assert.equal(await page.locator('#field-alert-form textarea').count(),0);
  await page.locator('#field-alert-form input').fill('Portão aberto');
  await page.locator('#field-alert-form button').click();
  const afterAlert=await page.evaluate(()=>({dashboard:!!document.querySelector('.dashboard'),rolePicker:!!document.querySelector('#dialog .role-picker-list'),alerts:JSON.parse(localStorage.getItem('rondas-pro-field-notices')||'[]').length,body:document.body.getAttribute('class')}));
  console.log('CHECK after alert '+width+' '+JSON.stringify(afterAlert));
  assert.ok(afterAlert.dashboard,'Aplicativo saiu da área Vigia após registrar o alerta');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rondas-pro-field-notices'))[0].label),'Portão aberto');
  await page.locator('[data-view="meus-envios"]').first().evaluate(el=>el.click());
  await page.locator('[data-action="own-notice-detail"]').first().click();
  assert.match(await page.locator('#dialog').innerText(),/Aguardando resposta/);
  assert.equal(await page.locator('#dialog textarea').count(),0);
  await page.locator('#dialog .dialog-close').click();
  await page.locator('[data-view="minha-ronda"]').first().evaluate(el=>el.click());
  await page.locator('[data-ops="incident-quick"]').click();
  await page.locator('#incident-form [name=title]').fill('Acesso lateral');
  await page.locator('#incident-form [name=description]').fill('Portão lateral encontrado aberto durante a inspeção.');
  await page.locator('#incident-form [name=severity]').selectOption('Alta');
  await page.locator('#incident-form [name=truth]').check();
  await page.locator('#incident-form button[type=submit]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rondas-pro-field-notices'))[0].details.severity),'Alta');
  if(width<=900){
   const map=await page.locator('.patrol-map-panel').boundingBox(),panic=await page.locator('.ops-panic').boundingBox(),card=await page.locator('.patrol-actions').boundingBox();
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
  await page.locator('#demo-chat-body').waitFor({state:'visible'});
  await page.locator('#demo-chat-body').fill('Mensagem de teste ao COI');
  await page.locator('#demo-chat-form button').click();
  assert.match(await page.locator('.field-chat-thread').innerText(),/Mensagem de teste ao COI/);
  assert.equal(await page.locator('.field-chat-contact-row:visible').count(),0,'Chat do vigia deve abrir diretamente na conversa');
  assert.equal(await page.locator('.field-chat-surface').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px','Chat não pode ficar dentro de card com borda');
  await page.locator('.field-chat-back').click();
  assert.ok(await page.locator('.patrol-actions').isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS compact field flows',width);
  await context.close();
 }
}finally{await browser?.close()}
