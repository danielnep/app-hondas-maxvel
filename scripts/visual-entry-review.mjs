/** Visual acceptance for the actual entry URL. Credentials/authentication are not tested or modified. */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createAppServer} from '../server.js';

const output='artifacts/visual-entry-review';
mkdirSync(output,{recursive:true});
const results=[],errors=[];
const server=createAppServer();
let browser;
function assert(ok,message){if(!ok)throw Error(message)}
const widths=[320,360,393,768,1024,1440];
try {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']
 });
 for(const width of widths) {
  const height=width<600?852:900;
  const context=await browser.newContext({viewport:{width,height},locale:'pt-BR',reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(width+'px JS: '+e.message));
  await page.route('https://**/*',r=>r.abort());
  let inspected=null;
  try {
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#live-login-form').waitFor({state:'visible',timeout:15000});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(120);
   const metrics=await page.evaluate(()=>{
     const box=node=>{if(!node)return null;const b=node.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
     const form=document.getElementById('live-login-form'),panel=form.closest('.entry-panel'),main=form.closest('.entry-main');
     const labels=[...form.querySelectorAll(':scope>label')];
     const inputs=[...form.querySelectorAll(':scope>label>input')];
     return {
      viewport:{width:innerWidth,height:innerHeight},
      documentWidth:document.documentElement.scrollWidth,
      panel:box(panel),main:box(main),form:box(form),
      labels:labels.map(box),inputs:inputs.map(box),
      button:box(form.querySelector('button[type=submit]')),
      formDisplay:getComputedStyle(form).display,
      formBackground:getComputedStyle(form).backgroundColor,
      formBorder:getComputedStyle(form).borderTopWidth,
      outerBackground:getComputedStyle(panel).backgroundColor,
      hidden:[...form.querySelectorAll('input')].some(i=>getComputedStyle(i).visibility==='hidden'),
      screenshotReady:!!document.querySelector('.entry-topnav .brand')
     };
   });
   inspected=metrics;
   const {panel,form,labels,inputs,button,viewport}=metrics;
   assert(metrics.screenshotReady,width+' logo missing');
   assert(metrics.formDisplay==='grid',width+' login not a vertical grid');
   assert(metrics.formBorder==='0px',width+' duplicate inner login border');
   assert(panel&&panel.width<=viewport.width-10&&panel.width>=Math.min(viewport.width-54,260),width+' panel width wrong '+JSON.stringify(panel));
   assert(metrics.documentWidth<=viewport.width+2,width+' horizontal document overflow '+metrics.documentWidth);
   assert(labels.length===2&&inputs.length===2,width+' expected two vertically stacked labeled inputs');
   assert(inputs[0].top>labels[0].top&&inputs[1].top>labels[1].top,width+' detached input labels');
   assert(labels[1].top>=labels[0].bottom+7,width+' password label overlaps username field');
   assert(button.top>=labels[1].bottom+6,width+' submit overlaps password field');
   assert([form,...labels,...inputs,button].every(b=>b.left>=panel.left-2&&b.right<=panel.right+2),width+' controls exceed outer Glass panel');
   assert(Math.abs(inputs[0].left-inputs[1].left)<=2&&Math.abs(inputs[0].width-inputs[1].width)<=2,width+' inputs do not share vertical alignment');
   assert(inputs.every(b=>b.height>=44),width+' mobile touch target too small');
   const space=metrics.viewport.width<600?48:34;
   assert(form.top>=panel.top-2&&form.bottom<=panel.bottom+2,width+' form clipped by its container');
   await page.screenshot({path:output+'/login-'+width+'.png',fullPage:true,animations:'disabled'});
   const focus=page.locator('#live-login-form [name=identifier]');
   await focus.focus();
   assert(await focus.evaluate(n=>document.activeElement===n),width+' field cannot receive keyboard focus');
   results.push({width,status:'PASS',metrics});
  } catch(error) {
   errors.push(width+'px '+error.message);
   results.push({width,status:'FAIL',message:error.message,metrics:inspected});
   await page.screenshot({path:output+'/FAILED-login-'+width+'.png',fullPage:true}).catch(()=>{});
  } finally { await context.close(); }
 }
} finally {
 writeFileSync(output+'/results.json',JSON.stringify({results,errors},null,2));
 await browser?.close();
 server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({screens:results.length,passed:results.filter(x=>x.status==='PASS').length,errors},null,2));
if(errors.length)process.exitCode=1;
