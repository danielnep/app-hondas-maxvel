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
   await page.waitForTimeout(650);
   const layout=await page.evaluate(()=>{
    const sels=['#central-root','#central-root .content','.rp-guard-workspace','.rp-inspector-workspace','.rp-inspection-cockpit','.rp-inspection-map-panel','.rp-inspection-map-canvas','.rp-inspector-map','.rp-field-controls','.rp-inspection-commands','.patrol-map-heading','[data-field-tool-chat]','.onboarding-ops'];
    const rows=Object.fromEntries(sels.map(sel=>{
      const el=document.querySelector(sel),style=el&&getComputedStyle(el),b=el?.getBoundingClientRect();
      return [sel,el?{rect:b&&{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)},position:style.position,display:style.display,opacity:style.opacity,background:style.backgroundColor,transform:style.transform,translate:style.translate,visibility:style.visibility,z:style.zIndex}:null]
    }));
    return {rows,atCenter:document.elementFromPoint(innerWidth/2,innerHeight/2)?.outerHTML?.slice(0,250)};
   });
   console.log('FIELD_GEOMETRY',prefix,JSON.stringify(layout));
   // No tutorial may be drawn underneath the map toolbar or field controls.
   verify(await page.locator('.onboarding-ops').count()===0,prefix+' onboarding covers field map');
   const rootHeight=await page.locator('#central-root').evaluate(node=>node.getBoundingClientRect().height);
   verify(rootHeight>=840,prefix+' zero-height field root clips the map: '+rootHeight);
   const mapPanel=page.locator('.rp-inspection-map-panel,.rp-guard-cockpit .patrol-map-panel').first();
   const mapRect=await mapPanel.boundingBox();
   verify(!!mapRect,prefix+' map panel missing');
   verify(mapRect.height>=840,prefix+' map does not fill the viewport: '+JSON.stringify(mapRect));
   verify(mapRect.y<=2,prefix+' map displaced from viewport: '+JSON.stringify(mapRect));
   const mapCanvas=page.locator('.rp-inspection-map-canvas,.rp-guard-cockpit .patrol-map-canvas').first();
   const canvasRect=await mapCanvas.boundingBox();
   verify(!!canvasRect&&canvasRect.height>=840,prefix+' map canvas leaves blank lower strip: '+JSON.stringify(canvasRect));
   const gestureBars=page.locator('.rp-gesture-edge');
   if(width<901)verify(await gestureBars.first().evaluate(node=>getComputedStyle(node,'::after').content)==='none',prefix+' stray swipe bar is drawn on map');
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
   const drawerSurface=await panel.evaluate(node=>{
     const style=getComputedStyle(node),color=style.backgroundColor;
     const alpha=color.match(/rgba?\\(([^)]+)\\)/)?.[1]?.split(',').map(x=>Number(x.trim()))||[];
     return {color,alpha:alpha.length>3?alpha[3]:1};
   });
   verify(drawerSurface.alpha>=.995,prefix+' map and cards bleed through notification glass: '+JSON.stringify(drawerSurface));
   const rect=await panel.boundingBox();
   verify(!!rect&&rect.x>=-2&&rect.x+rect.width<=width+3,prefix+' notification exceeds viewport: '+JSON.stringify(rect));
   verify(rect.x>=width-435,prefix+' notice not right-anchored: '+JSON.stringify(rect));
   verify(rect.y>=60,prefix+' notice overlaps header: '+JSON.stringify(rect));
   const handle=notif.locator('.rp-drawer-handle');
   const handleRect=await handle.boundingBox();
   verify(!!handleRect&&handleRect.y>=rect.y-5&&handleRect.y<rect.y+55&&handleRect.x>=rect.x+rect.width-65,prefix+' notification close is not in its upper toolbar: '+JSON.stringify({handleRect,rect}));
   await page.screenshot({path:evidence+'/'+prefix+'-notification.png',fullPage:false});
   await chatTop.click();
   await page.locator('#rp-field-chat-overlay[open]').waitFor({timeout:12000});
   verify(!(await notif.evaluate(n=>n.open)),prefix+' notifications stayed open over chat');
   await page.locator('#rp-field-chat-overlay .rp-chat-grip').waitFor({state:'visible',timeout:5000});
   await page.waitForTimeout(470);
   const sheetStyle=await page.locator('#rp-field-chat-overlay').evaluate(node=>({
    opacity:Number(getComputedStyle(node).opacity),
    box:node.getBoundingClientRect().toJSON(),
    background:getComputedStyle(node).backgroundColor,
    title:node.querySelector('h1,h2')?.textContent||''
   }));
   verify(sheetStyle.opacity>.95,prefix+' chat not visible after entrance animation: '+JSON.stringify(sheetStyle));
   verify(sheetStyle.box.y>=60,prefix+' chat overlaps fixed toolbar: '+JSON.stringify(sheetStyle));
   verify(sheetStyle.title.trim().length>0,prefix+' chat has no readable heading');
   await page.screenshot({path:evidence+'/'+prefix+'-chat-top.png',fullPage:false});
   await page.locator('#rp-field-chat-overlay .rp-chat-grip').click();
   await page.locator('#rp-field-chat-overlay[open]').waitFor({state:'detached',timeout:5000});
   const bottom=page.locator('[data-field-tool-chat]').first();
   if(await bottom.count()&&await bottom.isVisible()){
    const hit=await bottom.evaluate(node=>{
      const b=node.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,hit=document.elementFromPoint(x,y);
      return {x,y,tag:hit?.tagName,target:!!hit?.closest('[data-field-tool-chat]'),hitHtml:hit?.outerHTML?.slice(0,160)};
    });
    verify(hit.target,prefix+' lower chat is covered by another element: '+JSON.stringify(hit));
    await bottom.click({timeout:5000});
    await page.locator('#rp-field-chat-overlay[open]').waitFor({timeout:12000});
    checks.push({role,width,action:'bottom message opens same sheet'});
    await page.keyboard.press('Escape');
    await page.locator('#rp-field-chat-overlay[open]').waitFor({state:'detached',timeout:5000});
   }
   await notif.locator('summary').click();
   verify(await notif.evaluate(n=>n.open),prefix+' notice cannot reopen');
   await handle.click();
   await page.waitForFunction(()=>!document.querySelector('.rp-notification-popover[open]'),null,{timeout:4000});
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
