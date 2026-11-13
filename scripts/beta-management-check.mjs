// Interactive regression; temporary accounts/database, never production.
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.js';
if(!process.env.RP_PLAYWRIGHT_MODULE)throw Error('Informe RP_PLAYWRIGHT_MODULE explicitamente.');
const {chromium}=await import(pathToFileURL(process.env.RP_PLAYWRIGHT_MODULE).href);
const temp=mkdtempSync(join(tmpdir(),'ronda-beta-management-')),output=process.env.RP_QA_OUTPUT||join(temp,'results');mkdirSync(output,{recursive:true});
const password=randomBytes(20).toString('hex')+'@Aa1';
process.env.RONDA_PRO_DB_PATH=join(temp,'isolated.sqlite');process.env.RONDA_PRO_MASTER_EMAIL='master@qa.invalid';process.env.RONDA_PRO_MASTER_PASSWORD=password;
process.env.RONDA_PRO_INITIAL_ACCOUNTS=JSON.stringify([{name:'Ronda QA',role:'ronda',email:'ronda@qa.invalid',username:'ronda',password}]);
const server=createAppServer();let browser;
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.RP_CHROME_BIN,args:['--no-sandbox']});
 const results=[];
 for(const entry of ['index.html','central.html']){
  const context=await browser.newContext({viewport:{width:393,height:820},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+entry);const form=page.locator(entry==='index.html'?'#live-login-form':'#central-login');
  await form.locator(entry==='index.html'?'[name=identifier]':'[name=email]').fill('master@qa.invalid');await form.locator('[name=password]').fill(password);await form.locator('button[type=submit], button').last().click();
  // A new browser profile must obey the server's per-account/version decision.
  if(entry==='index.html'){
   await page.locator('#horizon-tour').waitFor();await page.locator('[data-tour=next]').click();await page.locator('[data-tour=back]').click();await page.locator('[data-tour=close]').last().click();
  }else{
   await page.waitForTimeout(1000);assert.equal(await page.locator('#horizon-tour').count(),0,'seen account persisted across entries');
   await page.locator('[data-page=tutorial]').evaluate(el=>el.click());await page.locator('#horizon-tour').waitFor();await page.keyboard.press('Escape');
  }
  await page.locator(entry==='index.html'?'[data-view=gestao]':'[data-page=gestao]').evaluate(el=>el.click());
  await page.locator('#sector-form').waitFor();await page.locator('#sector-form [name=name]').fill('Setor UI '+entry);await page.locator('#sector-form [name=address]').fill('Rua Rio Grande do Sul 1541 Divinópolis/MG');assert.equal(await page.locator('[name=addressConfirmed]').isChecked(),false);
  await page.locator('#sector-form [type=submit]').click();await page.locator('#sector-form [name=active]').waitFor();
  await page.locator('[name=name]').fill('Renomeado '+entry);await page.locator('[name=active]').uncheck();await page.locator('#sector-form [type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('.sector-list')?.textContent.includes('Inativo'));await page.locator('[name=active]').check();await page.locator('#sector-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('.sector-list')?.textContent.includes('Ativo'));
  for(const width of [360,412,873]){await page.setViewportSize({width,height:width===873?400:820});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(output,entry+'-'+width+'.png')});}
  assert.deepEqual(errors,[]);results.push({entry,sectorCreated:true,renamed:true,reactivated:true,widths:[360,412,873],errors});await context.close();
 }
 writeFileSync(join(output,'results.json'),JSON.stringify({results,physicalDeviceTested:false,productionDataChanged:false},null,2));console.log(JSON.stringify({output,passed:true}));
}finally{await browser?.close();if(server.listening)await new Promise(ok=>server.close(ok));}
