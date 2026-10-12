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
async function tap(page,selector){await page.locator(selector).first().click({timeout:12000});await wait(200)}
async function enter(page,role='ronda'){
 await tap(page,'[data-action="login"]:visible');
 await page.locator('#dialog[open]').waitFor({timeout:8000});
 await page.locator('#login-form [name="role"][value="'+role+'"]').check();
 await tap(page,'#login-form button[type="submit"]');
 await wait(560);
 const tourClose=page.locator('#horizon-tour [data-tour="close"]');
 if(await tourClose.count())await tap(page,'#horizon-tour [data-tour="close"]');
}
async function capture(page,name,width,height){
 const metrics=await page.evaluate(()=>{
  const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}};
  return {viewport:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
   documentHeight:document.documentElement.scrollHeight,primary:box('.patrol-actions [data-action="start"]'),
   map:box('#mobile-map'),action:box('.patrol-actions'),logo:box('.horizon-maxvel-brand'),
   roles:[...document.querySelectorAll('.simulation-roles [data-role]')].length,
   app:!!document.querySelector('.dashboard.simulation-mode'),tour:!!document.querySelector('#horizon-tour')};
 });
 report.push({width,height,name,...metrics});
 await page.screenshot({path:out+'/'+width+'x'+height+'-'+name+'.png',animations:'disabled',timeout:14000});
 if(metrics.viewport>width+2||metrics.documentWidth>width+3)throw Error('Expansão horizontal: '+JSON.stringify(metrics));
 if(metrics.documentHeight>height+4)throw Error('Página vertical além da viewport: '+JSON.stringify(metrics));
 if(name==='ronda'){
  if(!metrics.app||metrics.roles!==4||!metrics.map||!metrics.action||!metrics.primary)throw Error('Aplicativo, 4 perfis, mapa ou ação não encontrados');
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
   if(!await page.locator('.entry-screen .horizon-maxvel-brand img').count())throw Error('Logo combinado não carregado na entrada');
   await enter(page);
   await capture(page,'ronda',width,height);
   if(!await page.locator('.my-schedule').count())throw Error('Página do vigia sem rondas programadas');
   await tap(page,'.patrol-actions [data-action="start"]');
   await page.locator('#dialog #declaration-check').check();
   await tap(page,'[data-action="confirm-start"]');
   await capture(page,'active',width,height);
   await tap(page,'.patrol-actions [data-action="toggle-patrol-sheet"]');
   await tap(page,'.patrol-actions [data-action="point-evidence"]');
   for(const direction of ['front','right','back','left','selfie'])await tap(page,'#dialog [data-action="demo-capture"][data-direction="'+direction+'"]');
   await tap(page,'#dialog [data-action="demo-rotation"]');
   await tap(page,'#dialog [data-action="demo-evidence-confirm"]');
   await tap(page,'.patrol-actions [data-action="incident-form"]');
   await page.locator('#incident-form [name="title"]').fill('Luz de acesso apagada');
   await page.locator('#incident-form [name="description"]').fill('Iluminação do portão em desacordo no cenário de demonstração.');
   await page.locator('#incident-form [name="truth"]').check();
   await tap(page,'#incident-form button[type="submit"]');
   await tap(page,'.patrol-actions [data-action="demo-leave"]');
   await wait(7400);
   await capture(page,'deviation',width,height);
   if(!await page.locator('.patrol-actions [data-action="justify"]').count())throw Error('Desvio não exigiu justificativa');
   await tap(page,'.patrol-actions [data-action="justify"]');
   const reason=page.locator('#justification-form textarea').first();
   await reason.fill('Desvio ilustrativo para conferir uma situação no perímetro.');
   await tap(page,'#justification-form button[type="submit"]');
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="supervisor"]');
   await capture(page,'supervisor',width,height);
   await tap(page,'[data-view="notificacoes"]:visible');
   await tap(page,'[data-action="open-incidents"]');
   await tap(page,'.list-row[data-action="incident-detail"]');
   await page.locator('#incident-review-form [name="status"]').selectOption('Em análise');
   await page.locator('#incident-review-form [name="assignee"]').fill('Equipe de manutenção');
   await page.locator('#incident-review-form [name="note"]').fill('Encaminhado para conferência da iluminação.');
   await tap(page,'[data-action="incident-review"]');
   await tap(page,'[data-action="nav-alerts"]');
   await tap(page,'[data-view="rondas"]:visible');
   if(!await page.locator('.schedule-list .schedule-row').count())throw Error('Agenda sem múltiplos vigias');
   await capture(page,'schedule',width,height);
   await tap(page,'[data-action="program-round"]');
   await page.locator('#program-form [name="startAt"]').fill('2027-08-15T09:00');
   await page.locator('#program-form [name="endAt"]').fill('2027-08-15T10:00');
   await tap(page,'#program-form button[type="submit"]');
   if(!await page.locator('[data-action="program-confirm"]').count())throw Error('Confirmação do agendamento ausente');
   await tap(page,'[data-action="program-confirm"]');
   // Filtro de grandes agendas + reprogramação com confirmação e preservação do vínculo.
   await page.locator('[data-schedule-unit]').selectOption('Unidade Centro');
   await page.locator('[data-schedule-watcher]').selectOption('v01');
   await page.locator('[data-schedule-filter]').selectOption('programada');
   const localEdit=page.locator('.schedule-row [data-action="program-edit"][data-id^="program-"]');
   if(!await localEdit.count())throw Error('A ronda recém-programada não é encontrada ao filtrar por vigia');
   await tap(page,'.schedule-row [data-action="program-edit"][data-id^="program-"]');
   await page.locator('#program-edit-form [name="startAt"]').fill('2027-08-15T10:30');
   await page.locator('#program-edit-form [name="endAt"]').fill('2027-08-15T11:15');
   await tap(page,'#program-edit-form button[type="submit"]');
   if(!await page.locator('[data-action="program-edit-confirm"]').count())throw Error('Reprogramar não solicitou confirmação');
   await tap(page,'[data-action="program-edit-confirm"]');
   if(!await page.locator('.schedule-row [data-action="program-edit"][data-id^="program-"]').count())throw Error('Ronda reprogramada sumiu da agenda');
   await capture(page,'agenda-filtrada',width,height);
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="gestor"]');
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="admin"]');
   await tap(page,'[data-action="sim-role-picker"]');
   await tap(page,'#dialog [data-action="sim-role"][data-role="ronda"]');
   await tap(page,'.patrol-map-heading [data-action="feature-help"]');
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
