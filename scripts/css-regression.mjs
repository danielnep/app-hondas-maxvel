/** Compare every computed property against a separate baseline checkout.
 * Baseline receives only the known missing-brace repair, so this isolates cleanup. */
import {chromium} from 'playwright-core';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
const baseline=process.env.CSS_BASELINE_DIR;
if(!baseline)throw Error('Set CSS_BASELINE_DIR to the unmodified baseline checkout.');
const {createAppServer}=await import(pathToFileURL(path.resolve(baseline,'server.js')));
process.env.RONDA_PRO_DB_PATH=mkdtempSync('/tmp/ronda-css-db-')+'/db.sqlite';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'artifacts/css-hygiene');
const files={app:['ronda-pro','operational','mobile-critical','field'],central:['central','operational','field']};
const styles=Object.fromEntries(Object.entries(files).map(([key,names])=>[key,names.map(n=>readFileSync(root+'/assets/'+n+'.css','utf8').replace(/@import[^\n]+/g,'')).join('\n')]));
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||chromium.executablePath(),args:['--no-sandbox','--disable-gpu'],headless:true});
const results=[];mkdirSync(output,{recursive:true});
async function compare(page,name,entry='app'){
 const result=await page.evaluate(async({text})=>{
  const snapshot=()=>[...document.querySelectorAll('body *')].flatMap((el,i)=>['','::before','::after'].map(pseudo=>{
   const s=getComputedStyle(el,pseudo||null);return {key:i+':'+el.tagName+':'+el.className+':'+pseudo,values:[...s].sort().map(p=>p+':'+s.getPropertyValue(p)).join(';')};
  }));
  document.querySelectorAll('body *').forEach(el=>{el.style.setProperty('animation','none','important');el.style.setProperty('transition','none','important')});
  const before=snapshot();
  const links=[...document.querySelectorAll('link[rel=stylesheet]')].filter(x=>!x.href.startsWith('https://'));
  links.forEach(x=>x.disabled=true);
  const style=document.createElement('style');style.textContent=text;document.head.append(style);
  await new Promise(requestAnimationFrame);
  const after=snapshot(),diff=[];
  for(let i=0;i<Math.max(before.length,after.length);i++)if(before[i]?.values!==after[i]?.values){
    const b=before[i]?.values?.split(';')||[],a=after[i]?.values?.split(';')||[];
    diff.push({key:before[i]?.key,changes:b.filter((p,j)=>p!==a[j]).map((p)=>({before:p,after:a.find(x=>x.split(':')[0]===p.split(':')[0])})).slice(0,8)});
  }
  style.remove();links.forEach(x=>x.disabled=false);
  return {nodes:before.length/3,differences:diff.length,examples:diff.slice(0,4)};
 },{text:styles[entry]});
 results.push({name,...result});console.log(name,JSON.stringify(result));
 if(name==='390-vistoriador'||name==='390-ronda')await page.screenshot({path:path.join(output,name+'.png')});
}
try{
 for(const width of (process.env.CSS_WIDTHS||'320,390,768,1366').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88}});
  const page=await context.newPage();await page.route('https://**/*',route=>route.abort());
  await page.route('**/*.css*',async route=>{const url=route.request().url();if(url.startsWith('https://'))return route.abort();let response,body;try{response=await route.fetch();body=await response.text()}catch{return route.abort().catch(()=>{})}body=body.replace('color:#151b22!important;font-weight:750!important;box-shadow:none!important\n.dashboard','color:#151b22!important;font-weight:750!important;box-shadow:none!important}\n.dashboard');return route.fulfill({response,body});});
  await page.addInitScript(()=>{
   localStorage.setItem('horizon-maxvel-tour-v2','seen');
   localStorage.setItem('horizon-maxvel-localizacao-ciencia-v1',JSON.stringify({version:'2026-10-11',accepted:true,at:Date.now()}));
  });
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.dashboard').waitFor();
  if(await page.locator('.location-entry-grant').count())await page.locator('.location-entry-grant').click();
  await page.locator('.location-entry-gate').waitFor({state:'detached'});
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#toast{display:none!important}'});
  await compare(page,width+'-ronda');
  for(const role of ['vistoriador','operador','admin']){
   await page.locator('[data-action="sim-role-picker"]').first().evaluate(n=>n.click());
   if(!await page.locator('#dialog [data-action="sim-role"][data-role="'+role+'"]').count()){
    if(await page.locator('#dialog[open]').count())await page.locator('#dialog .dialog-close').evaluate(n=>n.click());
    await page.locator('.patrol-actions [data-action="start"]').click();
    await page.locator('#declaration-check').check();await page.locator('[data-action="confirm-start"]').click();
    await page.locator('[data-action="sim-role-picker"]').first().evaluate(n=>n.click());
   }
   await page.locator('#dialog [data-action="sim-role"][data-role="'+role+'"]').evaluate(n=>n.click());
   await compare(page,width+'-'+role);
  }
  await page.goto('http://127.0.0.1:'+server.address().port+'/central.html');
  await page.locator('#central-login').waitFor();
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  await compare(page,width+'-central-login','central');
  await context.close();
 }
}finally{writeFileSync(path.join(output,'parity.json'),JSON.stringify(results,null,2));await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
if(results.some(r=>r.differences))process.exitCode=1;
