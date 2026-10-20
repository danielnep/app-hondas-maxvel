import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

const tmp=mkdtempSync(join(tmpdir(),'ronda-drawers-'));
const evidence='artifacts/field-drawer-cross-interaction';
mkdirSync(evidence,{recursive:true});
const password='FieldDrawerQaPassword_2026!';
process.env.RONDA_PRO_DB_PATH=join(tmp,'ronda.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='master@drawer.invalid';
process.env.RONDA_PRO_MASTER_PASSWORD='FieldDrawerMasterPassword_2026!';
process.env.RONDA_PRO_INITIAL_ACCOUNTS=JSON.stringify(['ronda','vistoriador'].map(role=>({
 role,name:role,email:role+'@drawer.invalid',username:role,password
})));
const server=createAppServer(),failures=[],checks=[];let browser;
const verify=(ok,message)=>{if(!ok)throw new Error(message)};
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const executablePath=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim();
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const role of ['ronda','vistoriador'])for(const width of [360,393,1440]){
  const context=await browser.newContext({viewport:{width,height:852},locale:'pt-BR',permissions:['geolocation'],geolocation:{latitude:-20.142,longitude:-44.888,accuracy:5},reducedMotion:'no-preference'});
  const page=await context.newPage(),prefix=role+'-'+width;
  page.on('pageerror',e=>failures.push(prefix+': '+e.message));
  await page.route('https://**/*',route=>route.abort());
  try{
   await page.goto(base+'/central.html',{waitUntil:'domcontentloaded'});
   await page.locator('#central-login [name=email]').fill(role+'@drawer.invalid');
   await page.locator('#central-login [name=password]').fill(password);
   await page.locator('#central-login button').click();
   await page.locator('#central-navigation').waitFor({state:'attached',timeout:15000});
   await page.waitForFunction(()=>document.body.dataset.rpField==='true',{timeout:12000});
   await page.screenshot({path:evidence+'/'+prefix+'-initial.png',fullPage:false});
   const chatTop=page.locator('[data-chat-open-quick]').first();
   verify(await chatTop.isVisible(),prefix+' top chat button missing');
   verify(await page.locator('[data-message-popover]').count()===0,prefix+' obsolete chat popover');
   const notif=page.locator('.rp-notification-popover').first();
   verify(await notif.count()===1,prefix+' notifications missing');
   await notif.locator('summary').click();
   await page.waitForTimeout(400);
   verify(await notif.evaluate(n=>n.open),prefix+' notification drawer did not open');
   const panel=notif.locator('.rp-popover-list');
   const rect=await panel.boundingBox();
   verify(!!rect&&rect.x>=-2&&rect.x+rect.width<=width+3,prefix+' notification exceeds viewport: '+JSON.stringify(rect));
   verify(rect.x>=width-435,prefix+' notice not right-anchored: '+JSON.stringify(rect));
   verify(rect.y>=60,prefix+' notice overlaps header: '+JSON.stringify(rect));
   const handle=panel.locator('.rp-drawer-handle');
   const handleRect=await handle.boundingBox();
   verify(!!handleRect&&Math.abs((handleRect.x+handleRect.width/2)-rect.x)<30,prefix+' collapse handle is not at drawer edge: '+JSON.stringify({handleRect,rect}));
   await page.screenshot({path:evidence+'/'+prefix+'-notification.png',fullPage:false});
   await chatTop.click();
   await page.locator('#rp-field-chat-overlay[open]').waitFor({timeout:12000});
   verify(!(await notif.evaluate(n=>n.open)),prefix+' notifications stayed open over chat');
   verify(await page.locator('#rp-field-chat-overlay .rp-chat-grip').isVisible(),prefix+' chat collapse control missing');
   await page.screenshot({path:evidence+'/'+prefix+'-chat-top.png',fullPage:false});
   await page.locator('#rp-field-chat-overlay .rp-chat-grip').click();
   await page.locator('#rp-field-chat-overlay[open]').waitFor({state:'detached',timeout:5000});
   const bottom=page.locator('[data-field-tool-chat]').first();
   if(await bottom.count()&&await bottom.isVisible()){
    await bottom.click();
    await page.locator('#rp-field-chat-overlay[open]').waitFor({timeout:12000});
    checks.push({role,width,action:'bottom message opens same sheet'});
    await page.keyboard.press('Escape');
    await page.locator('#rp-field-chat-overlay[open]').waitFor({state:'detached',timeout:5000});
   }
   await notif.locator('summary').click();
   verify(await notif.evaluate(n=>n.open),prefix+' notice cannot reopen');
   await handle.click();
   verify(!(await notif.evaluate(n=>n.open)),prefix+' edge grip cannot close notice');
   const navTrigger=page.locator('[data-central-menu]').first();
   await navTrigger.click();
   verify(await page.locator('#central-navigation').evaluate(n=>n.classList.contains('is-open')),prefix+' menu missing');
   await notif.locator('summary').click();
   verify(!(await page.locator('#central-navigation').evaluate(n=>n.classList.contains('is-open'))),prefix+' menu failed to retract on notification');
   await page.keyboard.press('Escape');
   checks.push({role,width,action:'field overlay exclusive; notification edge & mobile menu',geometry:rect});
  }catch(e){failures.push(prefix+': '+e.message)}
  finally{await context.close()}
 }
}finally{
 writeFileSync(evidence+'/results.json',JSON.stringify({checks,failures},null,2));
 await browser?.close();
 server.closeAllConnections();
 await new Promise(ok=>server.close(ok));
 rmSync(tmp,{recursive:true,force:true});
}
console.log(JSON.stringify({checks:checks.length,failures},null,2));
if(failures.length)process.exitCode=1;
