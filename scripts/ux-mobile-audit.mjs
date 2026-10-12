/** E6 Auditoria responsiva do aplicativo real, sem a antiga apresentação paralela. */
import {chromium} from 'playwright-core';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=8188,out='artifacts/mobile-ux';
mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server',String(base),'--bind','127.0.0.1'],{stdio:'ignore'});
const bin=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const sizes=[[320,600],[360,700],[390,780],[430,900],[768,1024],[1024,768],[1440,900],[1920,1080]];
const metrics=[];let fatal=0;
async function click(page,selector){await page.locator(selector).first().click({timeout:10000});await wait(130)}
async function revealDialogControl(page,selector){
 for(let step=0;step<10;step++){
  const control=page.locator(selector).first();
  if(await control.isVisible())return control;
  const next=page.locator('#dialog [data-dialog-page="next"]:visible:not(:disabled)').first();
  if(!await next.count())throw Error('Campo inacessível no diálogo: '+selector);
  await next.click({timeout:4000});
 }
 throw Error('Paginação excessiva no diálogo: '+selector);
}
async function state(page,width,height,name){
 const data=await page.evaluate(()=>{
  const box=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}};
  return {actualWidth:innerWidth,actualHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,
   logo:box('.horizon-maxvel-brand'),map:box('#mobile-map'),cta:box('.patrol-actions [data-action="start"]'),nav:box('.mobile-nav.mobile-only'),tour:box('#horizon-tour'),schedule:box('.schedule-workspace')};
 });
 metrics.push({width,height,name,...data});
 await page.screenshot({path:out+'/'+width+'-'+name+'.png',animations:'disabled',timeout:14000});
 if(width<=900&&name==='ronda'&&data.cta&&data.map&&data.nav){
   if(data.map.bottom>data.cta.y+2||data.cta.bottom>data.nav.y+2||data.cta.h<25)
    throw Error('Mapa ou ação de iniciar ronda sobrepostos/cortados: '+JSON.stringify(data));
 }
 if(data.actualWidth>width+2||data.documentWidth>width+3)throw Error('Overflow horizontal em '+width+' '+name+': '+JSON.stringify(data));
 if(data.documentHeight>height+4)throw Error('Overflow vertical global em '+width+' '+name+': '+JSON.stringify(data));
 if(name==='ronda'&&(!data.cta||!data.map||data.cta.y<0||data.cta.y>height-40))throw Error('Ação principal não visível em '+width+': '+JSON.stringify(data));
}
try{
 await wait(900);
 for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:'+base,{waitUntil:'domcontentloaded',timeout:16000});
   await state(page,width,height,'01-login');
   const clicked=await page.locator('.entry-screen [data-action="login"]:visible').last();
   await clicked.click({timeout:8000});
   await state(page,width,height,'02-escolher-perfil');
   await page.locator('#login-form [name="role"][value="ronda"]').check();
   await click(page,'#login-form button[type="submit"]');
   await wait(600);
   if(await page.locator('#horizon-tour [data-tour="close"]').count()){
    await state(page,width,height,'03-tutorial');
    await click(page,'#horizon-tour [data-tour="close"]');
   }
   await state(page,width,height,'04-ronda');
   await click(page,'.patrol-actions [data-action="start"]');
   await (await revealDialogControl(page,'#dialog #declaration-check')).check();
   await revealDialogControl(page,'#dialog [data-action="confirm-start"]');
   await click(page,'[data-action="confirm-start"]');
   await state(page,width,height,'05-ronda-ativa');
   await click(page,'[data-action="sim-role-picker"]');
   await click(page,'#dialog [data-action="sim-role"][data-role="supervisor"]');
   await state(page,width,height,'06-supervisao');
   if(!await page.locator('.dashboard-v4.v4-supervision').count())throw Error('Supervisor sem dashboard operacional próprio');
   await click(page,'[data-v4-tab="insights"]');
   if(!await page.locator('.v4-insights-pane:not([hidden]) .v4-insight-row').count())throw Error('Insights da supervisão inacessíveis');
   await click(page,'[data-v4-tab="mapa"]');
   await page.locator('[data-supervisor-watcher]').selectOption('v03');
   if(!await page.locator('.v4-map-pane .ops-panel-heading h2').innerText().then(t=>t.includes('Rafael Costa')))
    throw Error('Trocar vigia não mudou o mapa supervisionado');
   await state(page,width,height,'06b-mapa-vigia');

   await click(page,'[data-view="rondas"]:visible');
   await state(page,width,height,'07-agenda');
   if(width<=900){
    const rows=page.locator('.schedule-list .schedule-row');
    const first=await rows.first().innerText();
    await page.locator('[data-action="schedule-next"]:visible').first().click({timeout:8000});
    const changed=await page.locator('.schedule-list .schedule-row').first().innerText();
    if(first===changed)throw Error('Seta de próxima página não mudou a escala exibida');
    await page.locator('[data-action="schedule-prev"]:visible').first().click({timeout:8000});
   }
   await click(page,'[data-action="schedule-tab"][data-tab="mapa"]');
   await state(page,width,height,'08-mapa');
   await click(page,'[data-action="sim-role-picker"]');
   await click(page,'#dialog [data-action="sim-role"][data-role="gestor"]');
   await state(page,width,height,'09-gestao');
   if(!await page.locator('.dashboard-v4.v4-management').count())throw Error('Gestão sem dashboard próprio');
   if(await page.locator('.v4-summary-metric').count()!==6)throw Error('Gestão sem seis indicadores baseados em dados');
   await click(page,'[data-v4-tab="equipe"]');
   if(await page.locator('.v4-team-row').count()!==4)throw Error('Equipe demonstrativa não contém quatro vigias');
   await click(page,'[data-v4-watcher="v02"]');
   if(!await page.locator('.v4-map-pane .ops-panel-heading h2').innerText().then(t=>t.includes('Ana Beatriz')))
    throw Error('Seleção da equipe não abriu a rota do vigia');
   await click(page,'[data-v4-tab="insights"]');
   if(!await page.locator('.v4-insights-pane:not([hidden]) .v4-insight-row').count())
    throw Error('Insights da Gestão não acessíveis por aba');
   await state(page,width,height,'09b-insights-gestao');

   await click(page,'[data-action="sim-role-picker"]');
   await click(page,'#dialog [data-action="sim-role"][data-role="admin"]');
   await state(page,width,height,'10-admin');
   if(errors.length)throw Error('Erros JS: '+errors.join('; '));
  }catch(e){fatal++;metrics.push({width,height,error:String(e),consoleErrors:errors});}
  finally{await context.close()}
 }
}finally{
 writeFileSync(out+'/report.json',JSON.stringify({sizes,metrics,fatal},null,2));
 await browser.close();server.kill('SIGTERM');
}
console.log(JSON.stringify({widths:sizes.length,captures:metrics.length,fatal,failures:metrics.filter(x=>x.error).slice(0,9)}));
if(fatal)process.exitCode=1;
