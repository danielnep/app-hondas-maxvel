/**
 * Etapa 02: auditoria visual/de interação de UI mobile.
 * Instrumentação isolada: não muda dados de produção nem regras de ronda.
 * Execução no GitHub Actions com navegador Chromium e playwright-core.
 */
import {chromium} from 'playwright-core';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

const WIDTHS=[320,360,390,430,768,1024,1440,1920];
const OUT='artifacts/ux-mobile-audit';
mkdirSync(OUT,{recursive:true});
const port=8177;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const output=[];
const browserErrors=[];
const executable=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome || command -v chromium-browser'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage']});
let fatal=0;
async function shot(page,width,slug){
 const filename=OUT+'/'+width+'-'+slug+'.png';
 try{await page.screenshot({path:filename,animations:'disabled',timeout:13000});}
 catch(e){output.push({width,slug,capture_error:String(e).slice(0,240)});}
}
async function assess(page,width,slug){
 let metrics=await page.evaluate(()=>{
  const root=document.documentElement;
  const visible=el=>{
   let r=el.getBoundingClientRect(),st=getComputedStyle(el);
   return st.visibility!=='hidden'&&st.display!=='none'&&r.width>0&&r.height>0&&r.bottom>0&&r.right>0;
  };
  const targets=[...document.querySelectorAll('button,a,[role=button],input[type=checkbox]')].filter(visible).map(el=>{
    const r=el.getBoundingClientRect();
    return {label:(el.getAttribute('aria-label')||el.textContent||el.title||'').trim().slice(0,65),action:el.dataset.action||el.dataset.view||'',w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y),disabled:el.disabled||false};
  });
  const smallText=[...document.querySelectorAll('h1,h2,h3,p,small,label,strong,button,.eyebrow,.map-caption,.tag')].filter(visible).map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,55),size:parseFloat(getComputedStyle(el).fontSize)})).filter(e=>e.size>0&&e.size<12);
  const dialog=document.querySelector('dialog[open]');
  const position=sel=>{let e=document.querySelector(sel);if(!e||!visible(e))return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)};};
  const map=document.querySelector('#mobile-map,#ops-map,#hero-map');
  return {viewport:{w:innerWidth,h:innerHeight},scrollWidth:root.scrollWidth,overflowX:root.scrollWidth>innerWidth+1,
     docHeight:root.scrollHeight,title:document.title,dialog:dialog?{height:Math.round(dialog.getBoundingClientRect().height),scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,hasScroll:dialog.scrollHeight>dialog.clientHeight+3,mandatory:dialog.dataset.mandatoryNotice==='true'}:null,
     targetCount:targets.length,undersized:targets.filter(a=>!a.disabled&&(a.w<44||a.h<44)).slice(0,30),
     undersizedCount:targets.filter(a=>!a.disabled&&(a.w<44||a.h<44)).length,
     microTextCount:smallText.length,microTextExamples:smallText.slice(0,25),
     modalCTA:position('[data-action="accept-location-notice"]'),
     actionStart:position('[data-action="start"]'),
     nav:position('.mobile-nav'),map:map?{...position('#mobile-map')||position('#ops-map')||position('#hero-map'),real:!!map.querySelector('.leaflet-container'),fallback:!!map.querySelector('.map-fallback')}:null,
     guide:position('.guide-inline'),topbar:position('.app-header'),hero:position('.product-hero'),
     startInitiallyVisible:!!position('[data-action="start"]') && position('[data-action="start"]').bottom<=innerHeight,
     noticeCTAInitiallyVisible:!!position('[data-action="accept-location-notice"]') && position('[data-action="accept-location-notice"]').bottom<=innerHeight};
 });
 output.push({width,screen:slug,...metrics});
 await shot(page,width,slug);
 return metrics;
}
async function clickAction(page,action,opts={}){
 const selector='[data-action="'+action+'"]';
 const target=page.locator(selector).first();
 await target.waitFor({state:'attached',timeout:5000});
 await target.click({timeout:5000,...opts});
 await wait(240);
}
async function enterProfile(page,role){
 await clickAction(page,'login');
 await page.locator('#login-form input[name=name]').fill('Auditoria UX');
 await page.locator('#login-form input[name=role][value='+role+']').check();
 await page.locator('#login-form button[type=submit]').click();
 await wait(250);
}
try{
 await wait(900);
 for(const width of WIDTHS){
  const height=width<500?740:width<900?940:950;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e).slice(0,400)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text().slice(0,260))});
  const scenario={width,steps:[],errors};
  try{
   await page.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded',timeout:13000});
   await page.locator('#dialog[open]').waitFor({timeout:12000});
   scenario.steps.push('consent');
   await assess(page,width,'01-consent');
   await clickAction(page,'decline-location-notice');
   const landingMetrics=await assess(page,width,'02-landing');
   scenario.steps.push('landing');
   if(width<500){
     if(landingMetrics.viewport.w>width+1||landingMetrics.scrollWidth>width+1)
       throw new Error('Viewport aumentou além do dispositivo: '+JSON.stringify({actual:landingMetrics.viewport.w,scroll:landingMetrics.scrollWidth,width}));
     const loginHit=await page.evaluate(()=>{
       const btn=document.querySelector('.topnav [data-action="login"]');
       if(!btn)return {error:'CTA não encontrado'};
       const r=btn.getBoundingClientRect();
       const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
       return {hit:!!top&&(top===btn||btn.contains(top)),name:top?.tagName||'',className:String(top?.className||'').slice(0,80)};
     });
     if(!loginHit.hit)throw new Error('Logo cobre botão de entrada: '+JSON.stringify(loginHit));
   }
   await enterProfile(page,'ronda');
   await assess(page,width,'03-ronda-before');
   if(width<=900){
    const nav=await page.locator('.mobile-nav.mobile-only').boundingBox();
    if(!nav||nav.height>96)throw new Error('Navegação mobile inválida: '+JSON.stringify(nav));
   }
   scenario.steps.push('ronda');
   await clickAction(page,'start');
   await assess(page,width,'04-start-rules');
   await page.locator('#dialog #declaration-check').check();
   await clickAction(page,'confirm-start');
   await assess(page,width,'05-ronda-active');
   scenario.steps.push('ronda-active');
   await clickAction(page,'demo-leave');
   await wait(7000);
   await assess(page,width,'06-deviation');
   scenario.steps.push('deviation');
   if(await page.locator('[data-action=justify]').count()){
    await clickAction(page,'justify');
    await assess(page,width,'07-justification');
    scenario.steps.push('justification');
    await page.locator('#dialog [name=reason]').fill('Desvio provocado intencionalmente para auditoria de usabilidade.');
    await page.locator('#justification-form button[type=submit]').click();
    await wait(250);
    await assess(page,width,'08-justified');
   }
   if(width<=900){
    await clickAction(page,'profile-menu');
    const logoutInMenu=page.locator('#dialog [data-action="logout"]');
    await logoutInMenu.waitFor({state:'visible',timeout:5000});
    await logoutInMenu.click();
    await wait(240);
    scenario.steps.push('profile menu logout accessible');
   }else{
    await clickAction(page,'logout');
    scenario.steps.push('desktop logout accessible');
   }
   await enterProfile(page,'supervisor');
   await assess(page,width,'09-supervisor');
   scenario.steps.push('supervisor');
   const viewNav=key=>page.locator(width<=900?'.mobile-nav.mobile-only [data-view="'+key+'"]':'.sidebar [data-view="'+key+'"]').first();
   await viewNav('rondas').click({timeout:6000});
   await wait(330);
   await assess(page,width,'09a-map-view');
   const routeFocus=page.locator('[data-action="focus-route-point"]').first();
   await routeFocus.click({timeout:7000});
   await wait(200);
   if(await page.locator('#dialog[open]').count())await clickAction(page,'close-dialog');
   await viewNav('notificacoes').click({timeout:6000});
   await wait(220);
   await assess(page,width,'09b-alerts-pending');
   await clickAction(page,'filter-alerts',{force:true});
   const allFilter=page.locator('[data-action="filter-alerts"][data-filter="all"]');
   await allFilter.click({timeout:6000});
   await wait(180);
   await assess(page,width,'09c-alerts-all');
   await viewNav('relatorios').click({timeout:6000});
   await wait(250);
   await assess(page,width,'09d-reports');
   scenario.steps.push('reports');
   await viewNav('overview').click({timeout:6000});
   await wait(200);
   scenario.steps.push('map and alert filtering');
   await clickAction(page,'launch-scenario');
   const isRealApp=await page.locator('.dashboard.simulation-mode .simulation-rolebar').count();
   const roleCount=await page.locator('.dashboard.simulation-mode .simulation-roles button').count();
   if(isRealApp!==1||roleCount!==4)throw new Error('Simulação não abriu o próprio app com quatro perfis');
   const logoLoaded=await page.locator('.dashboard .app-header .brand-lockup').evaluate(img=>img.complete&&img.naturalWidth>0);
   if(!logoLoaded)throw new Error('Lockup da Horizon não carregou dentro do app');
   await assess(page,width,'10-integrated');
   scenario.steps.push('integrated');
  }catch(err){fatal++;scenario.error=String(err).slice(0,1000);}
  scenario.errors=errors.slice(0,25);
  browserErrors.push(scenario);
  await context.close();
 }
}finally{
 await browser.close();
 server.kill('SIGTERM');
}
const summary={audit:'Etapa 02 | UX mobile-first Hondas Maxvel',date:new Date().toISOString(),url:'http://127.0.0.1:'+port,widths:WIDTHS,scenarios:browserErrors,metrics:output};
writeFileSync(OUT+'/audit.json',JSON.stringify(summary,null,2));
writeFileSync(OUT+'/summary.md',[
 '# Auditoria automatizada Hondas Maxvel',
 'Executado '+summary.date,
 '',
 '| Largura | Estado | Overflow horizontal | Alvos < 44 px | Textos < 12 px | Modal tem rolagem |',
 '|---:|---|---|---:|---:|---|',
 ...output.map(m=>'|'+m.width+'|'+m.screen+'|'+(m.overflowX?'**SIM**':'não')+'|'+m.undersizedCount+'|'+m.microTextCount+'|'+(m.dialog?.hasScroll?'sim':'não')+'|'),
 '',
 '## Falhas do fluxo',
 ...browserErrors.map(s=>'- '+s.width+' px: '+(s.error||'sem exceção no fluxo')+'; etapas: '+s.steps.join(' > ')+'; erros de console: '+s.errors.length),
 '',
 'Observação: a métrica de elementos <44px é uma triagem conservadora e inclui itens de interface não essenciais; validar relevância manualmente.',
 'Os mapas podem mostrar fallback devido a rede do runner; não interpretar como falha do provedor cartográfico.'
].join('\n'));
const virtualViewportBugs=output.filter(m=>m.width<500&&m.viewport?.w>m.width+2).map(m=>({deviceWidth:m.width,innerWidth:m.viewport.w,state:m.screen}));
summary.virtualViewportBugs=virtualViewportBugs;
writeFileSync(OUT+'/audit.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({widths:WIDTHS,scenarios:browserErrors.map(s=>({width:s.width,steps:s.steps,error:s.error,consoleErrors:s.errors.length})),metrics:output.length,fatal,virtualViewportBugs}));
if(fatal>0||virtualViewportBugs.length>0)process.exitCode=1;
