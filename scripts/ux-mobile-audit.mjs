/** Auditoria responsiva da entrada ATUAL de três áreas no ambiente de teste.
 * Navega com Chromium nos arquivos desta branch; não acessa API nem dados de produção.
 * Os testes de fluxo completo do cadastro de rotas ficam em route-planner-browser-qa.mjs.
 */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('.'),out=resolve('artifacts/mobile-ux'),origin='https://ronda-pro-production.up.railway.app';
mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const sizes=[[320,600],[360,700],[390,780],[430,900],[768,1024],[1024,768],[1440,900],[1920,1080]];
const bin=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];let fatal=0;
function check(condition,message){if(!condition)throw Error(message)}
async function screen(page,width,name){
 await page.screenshot({path:out+'/'+width+'-'+name+'.png',animations:'disabled',timeout:14000});
 const measurements=await page.evaluate(()=>{
  const r=s=>{const el=document.querySelector(s);if(!el)return null;const box=el.getBoundingClientRect();return {width:box.width,height:box.height,left:box.left,right:box.right,top:box.top,bottom:box.bottom}};
  return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,product:r('.brand.maxvel-only-brand'),main:r('.app-content'),map:r('#mobile-map'),planner:r('#rp-plan')};
 });
 check(measurements.documentWidth<=measurements.viewport+3,'Rolagem horizontal '+width+' '+name+': '+JSON.stringify(measurements));
 check(!!measurements.main,'Área de trabalho ausente: '+name);
 results.push({width,name,...measurements});
}
async function role(page,kind,first=false){
 if(!first){
  await page.locator('.user-profile-button').click();
  await page.locator('#dialog [data-action="sim-role-picker"]').click();
 }
 await page.locator('#dialog .role-picker-list [data-role="'+kind+'"]').click();
 if(kind==='ronda'){
  await page.locator('#dialog [data-username="vigia-demo-lucas"]').click();
 }
 await page.locator('.dashboard').waitFor({state:'visible',timeout:12000});
}
async function navigation(page,target){
 const side=page.locator('.sidebar [data-view="'+target+'"]');
 if(await side.isVisible()){await side.click();return;}
 await page.locator('[data-action="open-mobile-menu"]').click();
 await page.locator('#dialog [data-view="'+target+'"]').click();
}
try{
 for(const [width,height] of sizes){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',async request=>{
   const url=new URL(request.request().url());
   if(url.origin===origin){
    if(url.pathname.startsWith('/api/')){remote.push(url.pathname);return request.abort();}
    const relative=url.pathname.slice(1)||'index.html',file=resolve(root,relative);
    if(!file.startsWith(root+'/')||!existsSync(file))return request.fulfill({status:404,body:'Not Found'});
    return request.fulfill({path:file,contentType:types[extname(file)]||'application/octet-stream'});
   }
   return request.abort();
  });
  try{
   await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:16000});
   await page.locator('#dialog .role-picker-list [data-role="ronda"]').waitFor({timeout:12000});
   check(await page.locator('#dialog .role-picker-list [data-role]').count()===3,'Seletor não contém as três áreas');
   await role(page,'ronda',true);
   await page.locator('#mobile-map').waitFor({state:'visible',timeout:12000});
   check((await page.locator('.user-profile-button').textContent()).includes('Lucas Ferreira'),'Vigia fictício não foi selecionado');
   await screen(page,width,'vigia');
   await role(page,'coi');
   await navigation(page,'rondas');
   await page.locator('#rp-plan').waitFor({state:'visible',timeout:12000});
   check(await page.locator('#rp-plan-worker option').count()===4,'Seletor precisa listar automático e três agentes de ronda');
   check(await page.locator('#rp-plan .rp-plan-steps button').count()===3,'Etapas da rota ausentes');
   await screen(page,width,'coi-rotas');
   await role(page,'admin');
   check(await page.locator('.dashboard').isVisible(),'Administração inacessível');
   await navigation(page,'rondas');
   await page.locator('#rp-plan').waitFor({state:'visible',timeout:12000});
   await screen(page,width,'admin-rotas');
   check(errors.length===0,'Erros JS: '+errors.join(' | '));
   check(remote.length===0,'Chamada real de API durante teste: '+remote.join(', '));
   console.log(JSON.stringify({width,areas:3,selectedWorker:'Lucas Ferreira',planner:3,errors:0,remote:0}));
  }catch(error){fatal++;results.push({width,height,error:String(error),consoleErrors:errors});}
  finally{await ctx.close();}
 }
}finally{
 writeFileSync(out+'/report.json',JSON.stringify({sizes,results,fatal},null,2));
 await browser.close();
}
console.log(JSON.stringify({widths:sizes.length,areas:3,fatal,failures:results.filter(r=>r.error)}));
if(fatal)process.exitCode=1;
