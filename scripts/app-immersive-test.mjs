/**
 * E1–E6: teste da plataforma real Graphite Dark e agenda de múltiplos vigias.
 * Executado em Chromium nos GitHub Actions.
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
const report=[];
async function tap(page,selector){
 if(selector==='.app-header [data-action="tour-restart"]'&&!await page.locator(selector+':visible').count()){
  await page.locator('[data-action="profile-menu"]').click();
  selector='#dialog [data-action="tour-restart"]';
 }

 if(selector.startsWith('[data-view=')){
  if(!selector.includes(':visible'))selector+=':visible';
  if(!await page.locator(selector).count())await page.locator('[data-action="open-mobile-menu"]').click();
 }

 if(selector==='[data-action="sim-role-picker"]'){
  if(!await page.locator(selector+':visible').count())await page.locator('[data-action="profile-menu"]').click();
  selector+=':visible';
 }
 if(selector.startsWith('#dialog '))await revealDialogControl(page,selector);await page.locator(selector).first().click({timeout:12000});await wait(200)}
async function enter(page,role='ronda'){
 await tap(page,'[data-action="login"]:visible');
 await page.locator('#dialog[open]').waitFor({timeout:8000});
 await page.locator('#login-form [name="role"][value="'+role+'"]').check();
 await tap(page,'#login-form button[type="submit"]');
 await wait(560);
 const tourClose=page.locator('#horizon-tour [data-tour="close"]');
 if(await tourClose.count())await tap(page,'#horizon-tour [data-tour="close"]');
}
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
async function capture(page,name,width,height){
 const metrics=await page.evaluate(()=>{
  const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}};
  return {viewport:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
   documentHeight:document.documentElement.scrollHeight,primary:box('.patrol-actions [data-action="start"]'),
   map:box('#mobile-map'),action:box('.patrol-actions'),logo:box('.maxvel-only-brand'),
   areas:!!document.querySelector('.app-header [data-action="sim-role-picker"]'),
   app:!!document.querySelector('.dashboard.simulation-mode'),tour:!!document.querySelector('#horizon-tour')};
 });
 report.push({width,height,name,...metrics});
 await page.screenshot({path:out+'/'+width+'x'+height+'-'+name+'.png',animations:'disabled',timeout:14000});
 if(metrics.viewport>width+2||metrics.documentWidth>width+3)throw Error('Expansão horizontal: '+JSON.stringify(metrics));
 if(metrics.documentHeight>height+4)throw Error('Página vertical além da viewport: '+JSON.stringify(metrics));
 if(width<=900&&metrics.app&&name==='ronda'&&metrics.map&&metrics.action){
  if(metrics.map.y<0||metrics.map.bottom>height-45)throw Error('Mapa cortado: '+JSON.stringify(metrics.map));
  if(metrics.action.y<0||metrics.action.bottom>height+2)throw Error('Comandos cortados: '+JSON.stringify(metrics.action));
 }
 if(name==='ronda'){
  if(!metrics.app||!metrics.areas||!metrics.map||!metrics.action||!metrics.primary)throw Error('Aplicativo, seletor Áreas, mapa ou ação não encontrados');
  if(metrics.primary.y<0||metrics.primary.y>height-40)throw Error('Botão de início longe da viewport: '+JSON.stringify(metrics.primary));
 }
 return metrics;
}
try{
 await wait(850);
 for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded',timeout:18000});
   await capture(page,'login',width,height);
   if(!await page.locator('.entry-screen .maxvel-only-brand').count())throw Error('Identidade Maxvel ausente na entrada');
   await enter(page);
   await capture(page,'ronda',width,height);
   if(!await page.locator('.my-schedule').count())throw Error('Página do vigia sem rondas programadas');
   await tap(page,'.patrol-actions [data-action="start"]');
   await (await revealDialogControl(page,'#dialog #declaration-check')).check();
   await revealDialogControl(page,'#dialog [data-action="confirm-start"]');
   await tap(page,'[data-action="confirm-start"]');
   await capture(page,'active',width,height);
   if(width<=900&&await page.locator('#dialog').evaluate(el=>!el.open&&getComputedStyle(el).display!=='none'))
    throw Error('Janela fechada ainda ocupa layout após iniciar ronda');
   await tap(page,'.patrol-actions [data-action="toggle-patrol-sheet"]');
   if(width<=900)await tap(page,'#dialog [data-action="point-evidence"]');
   else await tap(page,'.patrol-actions [data-action="point-evidence"]');
   for(const direction of ['front','right','back','left','selfie'])await tap(page,'#dialog [data-action="demo-capture"][data-direction="'+direction+'"]');
   await tap(page,'#dialog [data-action="demo-rotation"]');
   await tap(page,'#dialog [data-action="demo-evidence-confirm"]');
   if(width<=900){await tap(page,'.patrol-actions [data-action="toggle-patrol-sheet"]');await tap(page,'#dialog [data-action="incident-form"]');}
   else await tap(page,'.patrol-actions [data-action="incident-form"]');
   await (await revealDialogControl(page,'#incident-form [name="title"]')).fill('Luz de acesso apagada');
   await (await revealDialogControl(page,'#incident-form [name="description"]')).fill('Iluminação do portão em desacordo no cenário de demonstração.');
   await (await revealDialogControl(page,'#incident-form [name="truth"]')).check();
   await tap(page,'#incident-form button[type="submit"]');
   if(width<=900){await tap(page,'.patrol-actions [data-action="toggle-patrol-sheet"]');await tap(page,'#dialog [data-action="demo-leave"]');}
   else await tap(page,'.patrol-actions [data-action="demo-leave"]');
   await wait(7400);
   await capture(page,'deviation',width,height);
   if(!await page.locator('.patrol-actions [data-action="justify"]').count())throw Error('Desvio não exigiu justificativa');
   await tap(page,'.patrol-actions [data-action="justify"]');
   const reason=page.locator('#justification-form textarea').first();
   await revealDialogControl(page,'#justification-form textarea');
   await reason.fill('Desvio ilustrativo para conferir uma situação no perímetro.');
   await tap(page,'#justification-form button[type="submit"]');
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="supervisor"]');
   await capture(page,'supervisor',width,height);
   await tap(page,'[data-view="notificacoes"]:visible');
   await tap(page,'[data-action="open-incidents"]');
   await tap(page,'.list-row[data-action="incident-detail"]');
   await (await revealDialogControl(page,'#incident-review-form [name="status"]')).selectOption('Em análise');
   await (await revealDialogControl(page,'#incident-review-form [name="assignee"]')).fill('Equipe de manutenção');
   await (await revealDialogControl(page,'#incident-review-form [name="note"]')).fill('Encaminhado para conferência da iluminação.');
   await tap(page,'[data-action="incident-review"]');
   await tap(page,'[data-action="nav-alerts"]');
   await tap(page,'[data-view="rondas"]:visible');
   if(!await page.locator('.schedule-list .schedule-row').count())throw Error('Agenda sem múltiplos vigias');
   await capture(page,'schedule',width,height);
   await tap(page,'[data-action="program-round"]');
   await page.locator('[data-wizard="worker"][data-id="v01"]').click();
   await tap(page,'[data-wizard="next"]');
   await page.locator('#wizard-start').fill('2027-08-15T09:00');
   await page.locator('#wizard-end').fill('2027-08-15T10:00');
   await tap(page,'[data-wizard="next"]');
   await page.locator('#wizard-lat').fill('-20.14020');
   await page.locator('#wizard-lng').fill('-44.88366');
   await tap(page,'[data-wizard="coordinates"]');
   if(!await page.locator('#wizard-map').count())throw Error('Mapa para pontos não encontrado');
   await tap(page,'[data-wizard="next"]');
   if(!await page.locator('.wizard-review').count())throw Error('Revisão da ronda ausente');
   await tap(page,'[data-wizard="save"]');
   if(!await page.locator('.schedule-list .schedule-row').count())throw Error('Agenda desapareceu após salvar');
   if(width<=900)await tap(page,'[data-action="schedule-show-filters"]');
   await page.locator('[data-schedule-unit]').selectOption('Unidade Centro');
   await page.locator('[data-schedule-watcher]').selectOption('v01');
   await page.locator('[data-schedule-filter]').selectOption('programada');
   // Consultar por vigia e testar filtros por página, sem rolagem da tela.
   if(!await page.locator('.schedule-list .schedule-row').count())throw Error('Filtro por vigia ficou vazio');
   await capture(page,'agenda-filtrada',width,height);
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="gestor"]');
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="admin"]');
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="ronda"]');
   await tap(page,width<=900?'.patrol-map-canvas [data-action="feature-help"]':'.patrol-map-heading [data-action="feature-help"]');
   if(!await page.locator('#dialog[open] .help-detail').count())throw Error('Ajuda contextual ? inativa');
   await tap(page,'#dialog [data-action="close-dialog"]');
   await tap(page,'.app-header [data-action="tour-restart"]');
   if(!await page.locator('#horizon-tour [data-tour="next"]').count())throw Error('Tour não reabriu');
   await tap(page,'#horizon-tour [data-tour="close"]');
   await capture(page,'reopen-tour',width,height);
   await tap(page,'.app-header [data-action="profile-menu"]');
   await tap(page,'#dialog [data-action="logout"]');
   if(!await page.locator('.entry-screen').count())throw Error('Sair não retornou ao login do app');
   if(errors.length)throw Error('JS: '+errors.join(' | ').slice(0,600));
  }catch(error){report.push({width,height,error:String(error),console:errors});throw error}
  finally{await context.close()}
 }
}finally{
 writeFileSync(out+'/metrics.json',JSON.stringify(report,null,2));
 await browser.close();server.kill('SIGTERM');
}
console.log(JSON.stringify({result:'Ronda, agenda, desvio, justificativa, quatro perfis, ajuda e tour',screens:report.length,viewportErrors:0}));
