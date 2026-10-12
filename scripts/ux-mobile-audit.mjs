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
async function checkInteractiveBounds(page,label){
 const overflow=await page.evaluate(()=>{
  const main=document.querySelector('.dashboard .app-content');if(!main)return [];
  const bound=main.getBoundingClientRect();
  return [...main.querySelectorAll('button,input,select,textarea')]
   .filter(el=>{
    if(el.closest('[hidden]')||!el.getClientRects().length)return false;
    const style=getComputedStyle(el),box=el.getBoundingClientRect();
    return style.visibility!=='hidden'&&style.display!=='none'&&(box.top<bound.top-4||box.bottom>bound.bottom+4);
   }).slice(0,6).map(el=>({element:el.outerHTML.slice(0,115),y:Math.round(el.getBoundingClientRect().y),
     bottom:Math.round(el.getBoundingClientRect().bottom)}));
 });
 if(overflow.length)throw Error('Ações cortadas em '+label+': '+JSON.stringify(overflow));
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
   if(width<=900&&await page.locator('#dialog').evaluate(el=>!el.open&&getComputedStyle(el).display!=='none'))
    throw Error('Diálogo fechado está ocupando altura fora da tela');
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
   if(width<=900){
    const visiblePanels=async()=>page.locator('.ux-ronda-stage > [data-ux-subpage]').evaluateAll(nodes=>
     nodes.filter(e=>!e.hidden&&getComputedStyle(e).display!=='none').map(e=>e.dataset.uxSubpage));
    if(JSON.stringify(await visiblePanels())!=='["mapa"]')throw Error('Painéis sobrepostos ao entrar no mapa: '+JSON.stringify(await visiblePanels()));
    const alignment=await page.evaluate(()=>{
     const content=document.querySelector('.dashboard .app-content'),panel=document.querySelector('.ux-ronda-stage');
     const nav=document.querySelector('.mobile-nav.mobile-only');
     return {panel:panel?.getBoundingClientRect().bottom,content:content?.getBoundingClientRect().bottom,
      nav:nav?.getBoundingClientRect().top,map:document.querySelector('#ops-map')?.getBoundingClientRect().height};
    });
    if(alignment.nav-alignment.panel>35)throw Error('Espaço vazio sob o painel do mapa: '+JSON.stringify(alignment));
    if(alignment.map<130)throw Error('Mapa menor que área útil: '+JSON.stringify(alignment));
    await click(page,'[data-ux-ronda-tab="pontos"]');
    if(JSON.stringify(await visiblePanels())!=='["pontos"]')throw Error('Pontos e mapa aparecem simultaneamente');
    if(!await page.locator('.hx05-point-row .hx05-open-button').count())throw Error('Prévia de pontos sem botões Abrir');
    await click(page,'.hx05-point-row .hx05-open-button');
    if(!await page.locator('#dialog[open] .hx05-point-detail').count())throw Error('Detalhe do ponto não abriu');
    await click(page,'#dialog [data-action="focus-route-point"]');
    if(await page.locator('#dialog').evaluate(el=>el.open))throw Error('Detalhe não fechou ao abrir mapa');
    if(JSON.stringify(await visiblePanels())!=='["mapa"]')throw Error('Ver no mapa não selecionou o mapa');
    await click(page,'.map-command-panel [data-action="center-maps"]');
    await click(page,'[data-ux-ronda-tab="historico"]');
    if(JSON.stringify(await visiblePanels())!=='["historico"]')throw Error('Histórico não isolado da área do mapa');
    await state(page,width,height,'08b-historico-isolado');
    await click(page,'[data-ux-ronda-tab="mapa"]');
    if(JSON.stringify(await visiblePanels())!=='["mapa"]')throw Error('Mapa não voltou após histórico');
    await checkInteractiveBounds(page,'rondas / mapa');
   }

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
   if(width<=900)await checkInteractiveBounds(page,'gestão / insights');
   await click(page,'[data-v4-tab="resumo"]');
   if(width<=900)await checkInteractiveBounds(page,'gestão / resumo');


   await click(page,'[data-action="sim-role-picker"]');
   await click(page,'#dialog [data-action="sim-role"][data-role="admin"]');
   await state(page,width,height,'10-admin');
   if(width<=900){
    await click(page,'.mobile-nav [data-action="open-mobile-menu"]');
    await click(page,'#dialog [data-view="relatorios"]');
    await state(page,width,height,'11-relatorios');
    await checkInteractiveBounds(page,'relatório / resumo');
    for(const tab of ['analise','eventos','historico']){
     await click(page,'[data-ux-report-tab="'+tab+'"]');
     await checkInteractiveBounds(page,'relatório / '+tab);
    }
    await click(page,'.mobile-nav [data-action="open-mobile-menu"]');
    await click(page,'#dialog [data-view="equipe"]');
    await state(page,width,height,'12-equipe');
    await checkInteractiveBounds(page,'equipe');
    await click(page,'.mobile-nav [data-action="open-mobile-menu"]');
    await click(page,'#dialog [data-view="configuracoes"]');
    await state(page,width,height,'13-configuracoes');
    await checkInteractiveBounds(page,'configurações');
    if(await page.locator('.hx05-setting-row').count()!==3)throw Error('Configurações não estão em três linhas com prévia');
    await click(page,'.hx05-setting-row [data-setting="dwellSeconds"]');
    if(!await page.locator('#dialog[open] #hx05-settings-form').count())throw Error('Configuração não abriu em janela');
    await page.locator('#dialog #hx05-settings-value').fill('45');
    await click(page,'#dialog #hx05-settings-form button[type="submit"]');
    if(!await page.locator('.hx05-setting-row').first().innerText().then(t=>t.includes('45 segundos')))
     throw Error('Salvar configuração não atualizou a prévia da lista');
    await click(page,'.hx05-setting-row [data-setting="evidenceEnabled"]');
    await click(page,'#dialog [data-action="close-dialog"]');
    if(await page.locator('#dialog').evaluate(el=>el.open))throw Error('Fechar configuração não fechou janela');

   }

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
