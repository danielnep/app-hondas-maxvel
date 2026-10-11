/**
 * UX Etapa 08: teste ponta a ponta da SIMULAÇÃO NO PRÓPRIO APP.
 * A ausência de rolagem da página não impede rolagem contextual de painéis.
 */
import {chromium} from 'playwright-core';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const port=8189,out='artifacts/app-immersive';
mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const chrome=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[[320,600],[360,700],[390,780],[430,900],[768,1024],[1024,768],[1440,900]];
const log=[];
async function tap(page,sel){await page.locator(sel).first().click({timeout:10000});await wait(170);}
async function state(page,label,w,h){
 const metrics=await page.evaluate(()=>{
  const bounds=s=>{let el=document.querySelector(s);if(!el)return null;let r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)};};
  return {viewport:{width:innerWidth,height:innerHeight},pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,
   workspace:bounds('.patrol-workspace'),map:bounds('#mobile-map'),actions:bounds('.patrol-actions'),primary:bounds('.patrol-actions [data-action="start"]'),nav:bounds('.mobile-nav.mobile-only'),roleBar:bounds('.simulation-rolebar'),roleButtons:[...document.querySelectorAll('.simulation-roles button')].length,
   actualApp:!!document.querySelector('.dashboard.simulation-mode'),hasLegacyPresentation:!!document.querySelector('.presentation-main,.phone-frame')};
 });
 log.push({width:w,height:h,label,...metrics});
 await page.screenshot({path:out+'/'+w+'x'+h+'-'+label+'.png',animations:'disabled',timeout:15000});
 if(metrics.pageWidth>w+2)throw Error('Largura da página se expandiu: '+JSON.stringify(metrics));
 if(metrics.pageHeight>h+3)throw Error('Página do próprio app cresce verticalmente: '+JSON.stringify(metrics));
 if(metrics.hasLegacyPresentation)throw Error('Mockup de celular aparece onde deveria ser o próprio app');
 if(!metrics.actualApp||metrics.roleButtons!==4)throw Error('App real e alternância de quatro perfis indisponíveis');
 if(label==='ready'){
  if(!metrics.map||!metrics.actions||!metrics.primary)throw Error('Mapa, ação ou CTA não renderizados');
  if(metrics.primary.y<0||metrics.primary.y>h-48)throw Error('Iniciar ronda não está alcançável na primeira tela');
  if(metrics.actions.bottom>h-(w<=900?45:0))throw Error('Painel de ação ultrapassou a área móvel');
 }
 return metrics;
}
try{
 await wait(850);
 for(const [width,height] of sizes){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded',timeout:17000});
   await page.locator('#dialog[open]').waitFor({timeout:10000});
   await tap(page,'[data-action="decline-location-notice"]');
   await tap(page,'[data-action="presentation-intro"]');
   await page.locator('#dialog #presentation-name').fill('Colaborador em avaliação');
   await tap(page,'[data-action="launch-presentation"]');
   await state(page,'ready',width,height);
   await tap(page,'.patrol-actions [data-action="start"]');
   await page.locator('#dialog #declaration-check').check();
   await tap(page,'[data-action="confirm-start"]');
   await state(page,'active',width,height);
   await tap(page,'[data-action="sim-role"][data-role="supervisor"]');
   await state(page,'supervisor',width,height);
   if(!await page.locator('#ops-map').count())throw Error('Supervisão não exibiu mapa operacional real do app');
   await tap(page,'[data-action="sim-role"][data-role="gestor"]');
   if(!await page.locator('.dashboard.simulation-mode').count())throw Error('Gestor não entrou no app');
   await tap(page,'[data-action="sim-role"][data-role="admin"]');
   if(!await page.locator('.dashboard.simulation-mode').count())throw Error('Administrador não entrou no app');
   await tap(page,'[data-action="sim-role"][data-role="ronda"]');
   if(!await page.locator('.patrol-actions [data-action="demo-leave"]').count())throw Error('Controles de movimento ausentes após trocar perfil');
   await tap(page,'.patrol-actions [data-action="demo-leave"]');
   await wait(7300);
   await state(page,'deviation',width,height);
   await tap(page,'[data-action="sim-role"][data-role="supervisor"]');
   let navSel=width<=900?'.mobile-nav.mobile-only [data-view="notificacoes"]':'.sidebar [data-view="notificacoes"]';
   await tap(page,navSel);
   await state(page,'alerts',width,height);
   if(!await page.locator('.alerts-queue-list .event-item').count())throw Error('Desvio não aparece para supervisão');
   await tap(page,'[data-action="end-presentation"]');
   if(!await page.locator('.product-home').count())throw Error('Sair não volta à tela inicial');
   if(errors.length)throw Error('Erros de script: '+errors.join('; ').slice(0,400));
  }catch(e){log.push({width,height,error:String(e),console:errors});throw e;}
  finally{await ctx.close();}
 }
}finally{
 writeFileSync(out+'/metrics.json',JSON.stringify(log,null,2));
 await browser.close();server.kill('SIGTERM');
}
console.log(JSON.stringify({screenSizes:sizes,states:log.length,pageOverflowErrors:0,result:'APP REAL, QUATRO PERFIS, MAPA E ALERTAS TESTADOS'}));
