/* Real browser regression: GitHub Pages origin, but all project files from this worktree.
 * No POST to operations, no deploy, and no changes to actual browsers/users.
 * Run: RP_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs RP_CHROME_BIN=/path/to/chrome node scripts/qa-mobile-management.mjs
 */
import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const {chromium}=await import(process.env.RP_PLAYWRIGHT_MODULE?pathToFileURL(process.env.RP_PLAYWRIGHT_MODULE).href:'playwright');
const out=process.env.RP_QA_OUTPUT||'/tmp/ronda-mobile-management-qa';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.RP_CHROME_BIN||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
let failures=0;
const issues=[];
async function fixture(route){
 const u=new URL(route.request().url());
 if(u.hostname==='photon.komoot.io'){
  const q=u.searchParams.get('q')||'';
  const second=q.includes('B');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{properties:{name:second?'Ponto B':'Ponto A',street:second?'Rua B':'Rua A',city:'Belo Horizonte'},geometry:{coordinates:second?[-43.945,-19.923]:[-43.94,-19.92]}}]})});
 }
 if(u.hostname==='danielnep.github.io'&&(u.pathname.startsWith('/app-hondas-maxvel/')||u.pathname.startsWith('/assets/')||u.pathname.startsWith('/src/'))){
  const rel=u.pathname.replace(/^\/app-hondas-maxvel\//,'').replace(/^\//,'')||'index.html';
  const file=path.resolve(root,rel);
  if(file.startsWith(root+path.sep)&&existsSync(file)){
   const ext=path.extname(file);
   const ct=({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.webmanifest':'application/manifest+json'})[ext];
   return route.fulfill({path:file,contentType:ct||'application/octet-stream'});
  }
 }
 if(!['GET','HEAD'].includes(route.request().method()))return route.fulfill({status:405});
 return route.continue();
}
async function run(width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<800,hasTouch:width<800,serviceWorkers:'block'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',fixture);
 try{
  await page.goto('https://danielnep.github.io/app-hondas-maxvel/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('[data-action="sim-role"][data-role="coi"]').click({timeout:13000});
  if(width<800){
   await page.locator('[data-action="open-mobile-menu"]').click({timeout:7000});
   const item=page.locator('#dialog [data-view="rondas"]');
   await item.waitFor({state:'visible'});
   const rect=await item.boundingBox();
   assert(rect&&rect.width>20,'menu de rotas sem área de toque');
   await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
  }else await page.locator('.sidebar [data-view="rondas"]').click();
  await page.locator('#rp-plan').waitFor({timeout:9000});
  const initial=await page.evaluate(()=>{
   const e=document.querySelector('.app-content'),s=getComputedStyle(e),f=document.querySelector('.rp-plan-actions').getBoundingClientRect();
   return {scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollTop:e.scrollTop,overflow:s.overflowY,footerTop:Math.round(f.top),footerBottom:Math.round(f.bottom),documentWidth:document.documentElement.scrollWidth};
  });
  assert(initial.scrollHeight>initial.clientHeight+100,'formulário não possui área rolável');
  assert(['auto','scroll'].includes(initial.overflow),'overflow do conteúdo deve ser auto');
  await page.evaluate(()=>{document.querySelector('.app-content').scrollTop=400});
  const scrolled=await page.evaluate(()=>document.querySelector('.app-content').scrollTop);
  assert(scrolled>50,'rolagem vertical não se movimenta');
  assert(initial.documentWidth<=width+1,'rolagem horizontal indevida');
  await page.locator('#rp-plan-name').fill('Ronda de teste de layout');
  await page.locator('#rp-plan-query').fill('Ponto A');
  await page.locator('#rp-plan-suggestions [data-action="rp-plan-pick"]').first().click({timeout:8000});
  await page.locator('#rp-plan-query').fill('Ponto B');
  await page.locator('#rp-plan-suggestions [data-action="rp-plan-pick"]').first().click({timeout:8000});
  assert.equal(await page.locator('.rp-plan-stop').count(),2,'dois endereços precisam aparecer na lista');
  await page.locator('.rp-plan-next').click({timeout:7000});
  assert.equal(await page.locator('#rp-plan').getAttribute('data-step'),'2','etapa Agendamento não avançou');
  assert(await page.locator('#rp-plan-hour').isVisible(),'horário não está acessível');
  await page.locator('.rp-plan-next').click({timeout:7000});
  assert.equal(await page.locator('#rp-plan').getAttribute('data-step'),'3','etapa Revisão não avançou');
  assert(await page.locator('.rp-plan-save').isVisible(),'botão Salvar não apareceu na revisão');
  assert(await page.locator('.rp-plan-saved').isVisible(),'rotas cadastradas não podem desaparecer no celular');
  await page.locator('.rp-plan-secondary').click();
  assert.equal(await page.locator('#rp-plan').getAttribute('data-step'),'2','Voltar não funcionou');
  await page.screenshot({path:path.join(out,'route-'+width+'.png')});
  await page.locator('[data-action="demo-chat-overlay"]').first().click({timeout:7000});
  await page.locator('#rp-demo-chat-overlay[open]').waitFor();
  await page.waitForTimeout(420); // Captura final depois da animação glass.
  const chat=await page.evaluate(()=>{
   const names=['#rp-demo-chat-overlay','.rp-field-chat-overlay .field-chat-screen','.rp-field-chat-overlay .field-chat-topbar','.rp-field-chat-overlay .field-chat-surface','.rp-field-chat-overlay .field-chat-list'];
   const css=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect(),c=e&&getComputedStyle(e);return e?{top:Math.round(r.top),bottom:Math.round(r.bottom),background:c.backgroundColor,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}:null};
   return Object.fromEntries(names.map(s=>[s,css(s)]));
  });
  assert(chat['.rp-field-chat-overlay .field-chat-list'],'chat sem lista de conversas');
  assert(chat['#rp-demo-chat-overlay'].bottom<=height+2,'chat ultrapassa a base do viewport');
  if(width<800)assert(chat['#rp-demo-chat-overlay'].bottom-chat['#rp-demo-chat-overlay'].top<=500,'lista do chat não deve ocupar a tela inteira sem mensagens');
  assert.match(chat['#rp-demo-chat-overlay'].background,/rgba\(25, 35, 44, 0\.97\)/,'o fundo glass deve esconder os blocos antigos');
  assert.notEqual(chat['.rp-field-chat-overlay .field-chat-topbar'].background,'rgba(0, 0, 0, 0)','o cabeçalho do chat precisa de superfície glass');
  await page.screenshot({path:path.join(out,'chat-'+width+'.png')});
  console.log('PASS',width,'scroll',initial.scrollHeight+'/'+initial.clientHeight,'scrolled',scrolled,'chatBottom',chat['#rp-demo-chat-overlay'].bottom,'chatBG',chat['#rp-demo-chat-overlay'].background,'pageErrors',errors.length);
  if(errors.length)console.log('PAGE_ERRORS',width,errors.slice(0,3).join(' | '));
 }catch(e){failures++;issues.push({width,error:e.message});console.log('FAIL',width,e.message.slice(0,600))}
 await context.close();
}
for(const [w,h] of [[320,800],[360,800],[393,852],[1440,960]])await run(w,h);
const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const page=await context.newPage();await page.route('**/*',fixture);
try{
 await page.goto('https://danielnep.github.io/app-hondas-maxvel/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('[data-action="sim-role"][data-role="ronda"]').click({timeout:13000});
 await page.locator('[data-action="choose-demo-worker"]').first().click({timeout:13000});
 await page.waitForTimeout(400);
 const field=await page.evaluate(()=>({role:document.body.dataset.rpRole,field:document.body.dataset.rpField,overflow:getComputedStyle(document.body).overflowY}));
 assert.equal(field.field,'true','cockpit não recebeu modo campo');
 console.log('PASS cockpit unchanged',JSON.stringify(field));
}catch(e){failures++;issues.push({width:'field',error:e.message});console.log('FAIL cockpit',e.message.slice(0,400))}
await context.close();await browser.close();
if(failures){console.error('FAILED',JSON.stringify(issues));process.exitCode=1;}
else console.log('ALL MOBILE BROWSER CHECKS PASSED');
