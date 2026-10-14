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
async function click(page,selector){
 if(selector.startsWith('[data-view=')){
  if(!selector.includes(':visible'))selector+=':visible';
  if(!await page.locator(selector).count())await page.locator('[data-action="open-mobile-menu"]').click();
 }

 if(selector==='[data-action="sim-role-picker"]'){
  if(!await page.locator(selector+':visible').count())await page.locator('[data-action="profile-menu"]').click();
  selector+=':visible';
 }
 await page.locator(selector).first().click({timeout:10000});await wait(130)
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
async function checkInteractiveBounds(page,label){
 const overflow=await page.evaluate(()=>{
  const main=document.querySelector('.dashboard .app-content');if(!main)return [];
  const bound=main.getBoundingClientRect();
  return [...main.querySelectorAll('button,input,select,textarea')]
   .filter(el=>{
    if(el.closest('[hidden]')||!el.getClientRects().length)return false;
    const style=getComputedStyle(el),box=el.getBoundingClientRect();
    return style.visibility!=='hidden'&&style.display!=='none'&&(box.left<bound.left-4||box.right>bound.right+4);
   }).slice(0,6).map(el=>({element:el.outerHTML.slice(0,115),y:Math.round(el.getBoundingClientRect().y),
     bottom:Math.round(el.getBoundingClientRect().bottom)}));
 });
 if(overflow.length)throw Error('Ações cortadas em '+label+': '+JSON.stringify(overflow));
}
async function checkRoleGuide(page,width,height,role,heading){
 await page.locator('.app-header [data-action="profile-menu"]:visible').click();
 await page.locator('#dialog [data-action="guide"]:visible').click();
 const dialog=page.locator('#dialog.guide-dialog[open]');
 await dialog.waitFor({timeout:8000});
 const header=await page.locator('#dialog #guide-title').innerText();
 if(header!==heading)throw Error('Guia '+role+' com título incorreto: '+header);
 const measures=await dialog.evaluate(el=>{
  const sc=el.querySelector('.guide-scroll'),footer=el.querySelector('.guide-footer');
  const d=el.getBoundingClientRect(),f=footer.getBoundingClientRect();
  return {role:el.dataset.guideRole,width:d.width,right:d.right,bottom:d.bottom,
   scrollWidth:sc.scrollWidth,clientWidth:sc.clientWidth,
   bodyOverflow:getComputedStyle(sc).overflowY,footerTop:f.top,footerBottom:f.bottom,
   hasGenericPages:!!el.querySelector('.ux-dialog-pagination')};
 });
 if(measures.role!==role||measures.right>width+3||measures.bottom>height+3||
    measures.scrollWidth>measures.clientWidth+2||!['auto','scroll'].includes(measures.bodyOverflow)||
    measures.hasGenericPages||measures.footerBottom>height+3)
  throw Error('Guia '+role+' com overflow ou paginação indevida: '+JSON.stringify(measures));
 const title=await dialog.locator('#guide-current-heading').innerText();
 if(!title||await dialog.locator('.guide-tabs button').count()!==5)
  throw Error('Etapas ausentes no guia de '+role);
 await dialog.locator('.guide-step-picker > summary').click();
 const vertical=await dialog.locator('.guide-tabs').evaluate(el=>{
  const bounds=Array.from(el.querySelectorAll('button'),b=>b.getBoundingClientRect());
  return bounds.every((b,i)=>i===0||b.top>=bounds[i-1].bottom-1);
 });
 if(!vertical)throw Error('Seletor do perfil '+role+' rola horizontalmente');
 await dialog.locator('.guide-tabs [data-stage="3"]').click();
 if(!((await dialog.locator('.guide-stage-progress > span').innerText()).includes('Etapa 4 de 5')))
  throw Error('Seleção de etapa falhou em '+role);
 await dialog.locator('[data-action="guide-back"]:visible').click();
 if(!((await dialog.locator('.guide-stage-progress > span').innerText()).includes('Etapa 3 de 5')))
  throw Error('Voltar etapa falhou em '+role);
 await dialog.locator('.dialog-close').click();
 if(await dialog.count())throw Error('Guia '+role+' não fechou');
}

async function state(page,width,height,name){
 await page.evaluate(()=>document.fonts.ready);
 // Aguarda a marca assumir dimensões reais antes de medir a interface animada.
 // Se continuar invisível/cortada, o teste falhará em vez de ignorar o problema.
 await page.waitForFunction(()=>{
  const candidates=[...document.querySelectorAll('.brand.maxvel-only-brand')]
   .filter(node=>{const style=getComputedStyle(node);return style.display!=='none'&&style.visibility!=='hidden';});
  return candidates.some(node=>{
   const mark=node.querySelector('.ronda-pro-wordmark');
   return node.getBoundingClientRect().width>40&&node.getBoundingClientRect().height>10
    &&mark?.getBoundingClientRect().width>8;
  });
 },null,{timeout:8000});
 const branding=await page.locator('.brand.maxvel-only-brand:visible').evaluateAll(nodes=>nodes.map(node=>{
  const box=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,centerY:r.top+r.height/2};};
  return {outer:box(node),product:box(node.querySelector('.ronda-pro-wordmark')),divider:box(node.querySelector('.brand-divider')),partner:box(node.querySelector('.brand-partner')),image:box(node.querySelector('img'))};
 }));
 for(const brand of branding){
  if(brand.product.right>brand.divider.left-3||brand.image.left<brand.divider.right+3||brand.product.left<brand.outer.left-1||brand.image.right>brand.outer.right+1||Math.abs(brand.partner.centerY-brand.product.centerY)>3)
   throw Error('Marca amontoada ou cortada em '+width+' '+name+': '+JSON.stringify(brand));
 }
 const data=await page.evaluate(()=>{
  const box=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}};
  return {actualWidth:innerWidth,actualHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,
   logo:box('.maxvel-only-brand'),map:box('#mobile-map'),cta:box('.patrol-actions [data-action="start"]'),nav:box('.mobile-nav.mobile-only'),tour:box('#horizon-tour'),schedule:box('.schedule-workspace')};
 });
 metrics.push({width,height,name,...data});
 await page.screenshot({path:out+'/'+width+'-'+name+'.png',animations:'disabled',timeout:14000});
 if(width<=900&&name==='ronda'&&data.cta&&data.map&&data.nav){
   if((data.map.y<data.cta.bottom-2&&data.cta.y<data.map.bottom-2)||data.cta.bottom>data.nav.y+2||data.cta.h<25)
    throw Error('Mapa ou ação de iniciar ronda sobrepostos/cortados: '+JSON.stringify(data));
 }
 if(data.actualWidth>width+2||data.documentWidth>width+3)throw Error('Overflow horizontal em '+width+' '+name+': '+JSON.stringify(data));
 if(data.documentHeight>height+4)throw Error('Overflow vertical global em '+width+' '+name+': '+JSON.stringify(data));
 if(name==='ronda'&&(!data.cta||!data.map||data.cta.y<0||data.cta.y>height-40))throw Error('Ação principal não visível em '+width+': '+JSON.stringify(data));
}
try{
 await wait(900);
 for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce',permissions:['geolocation'],geolocation:{latitude:-20.1402,longitude:-44.8837,accuracy:8}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:'+base,{waitUntil:'domcontentloaded',timeout:16000});
   // Permissão já concedida: entra sem modal. Caso contrário, exige toque explícito.
   await page.locator('.location-entry-gate:visible, .dashboard:visible').first().waitFor({timeout:12000});
   const needsPermission=await page.locator('.location-entry-gate:visible').count()>0;
   await state(page,width,height,needsPermission?'01-gps-primeiro-acesso':'01-gps-ja-autorizado');
   if(needsPermission){
    await click(page,'.location-entry-grant');
    await page.locator('.location-entry-gate').waitFor({state:'detached',timeout:11000});
   }
   await page.locator('.dashboard:visible').first().waitFor({timeout:11000});
   await wait(450);
   if(await page.locator('#horizon-tour [data-tour="close"]').count())await click(page,'#horizon-tour [data-tour="close"]');
   await state(page,width,height,'04-ronda');
   if(width<=900){
    const roleText=await page.locator('#toast').innerText();
    if(!roleText.includes('Operação de Ronda:')&&!roleText.includes('Localização autorizada.'))throw Error('Estado de entrada do Vigia incorreto: '+roleText);
    const control=await page.locator('.app-header [data-action="profile-menu"] .avatar').evaluate(el=>
     ({width:el.getBoundingClientRect().width,display:getComputedStyle(el).display}));
    if(control.width<12||control.display==='none')throw Error('Botão de perfis aparece vazio: '+JSON.stringify(control));
    const sizes=await page.evaluate(()=>{
     const top=document.querySelector('#toast').getBoundingClientRect();
     return {center:Math.abs(top.x+top.width/2-innerWidth/2),y:top.y,bottom:top.bottom,height:innerHeight};
    });
    if(sizes.center>10||sizes.y<0||sizes.bottom>sizes.height+2)throw Error('Aviso fora da área visível: '+JSON.stringify(sizes));
   }
   if(width<=900){
    // O guia completo de Vigia usa exclusivamente rolagem vertical dentro do modal.
    await page.locator('.app-header [data-action="profile-menu"]:visible').click();
    await page.locator('#dialog [data-action="guide"]:visible').click();
    const guide=page.locator('#dialog.guide-dialog[open]');
    await guide.waitFor({timeout:8000});
    const geometry=await guide.evaluate(dialog=>{
      const scroller=dialog.querySelector('.guide-scroll');
      const footer=dialog.querySelector('.guide-footer');
      const sr=scroller.getBoundingClientRect(),dr=dialog.getBoundingClientRect(),fr=footer.getBoundingClientRect();
      return {dialogWidth:dr.width,dialogHeight:dr.height,dialogRight:dr.right,
        dialogBottom:dr.bottom,scrollHeight:scroller.scrollHeight,clientHeight:scroller.clientHeight,
        scrollWidth:scroller.scrollWidth,clientWidth:scroller.clientWidth,scrollBottom:sr.bottom,
        footerTop:fr.top,footerBottom:fr.bottom,bodyOverflow:getComputedStyle(scroller).overflowY,
        tabsOverflow:getComputedStyle(dialog.querySelector('.guide-tabs')).overflowX,
        hasGenericPages:!!dialog.querySelector('.ux-dialog-pagination')};
    });
    if(geometry.dialogWidth>width+2||geometry.dialogHeight>height+2||
       geometry.dialogRight>width+3||geometry.dialogBottom>height+3||
       geometry.scrollWidth>geometry.clientWidth+2||
       geometry.scrollBottom>geometry.footerTop+2||geometry.footerBottom>height+3||
       !['auto','scroll'].includes(geometry.bodyOverflow)||geometry.hasGenericPages)
      throw Error('Guia do vigia não cabe ou não rola verticalmente em '+width+': '+JSON.stringify(geometry));
    if(await page.locator('#dialog .guide-tabs button').count()!==5)
      throw Error('Guia perdeu as cinco etapas em '+width);
    await page.locator('#dialog .guide-step-picker > summary').click();
    const nav=await page.locator('#dialog .guide-tabs').evaluate(el=>{
      const buttons=[...el.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
      return {w:el.scrollWidth,clientW:el.clientWidth,
        vertical:buttons.every((r,i)=>!i||r.top>=buttons[i-1].bottom-1)};
    });
    if(nav.w>nav.clientW+2||!nav.vertical)throw Error('Etapas do guia não são verticais: '+JSON.stringify(nav));
    await page.locator('#dialog .guide-step-picker > summary').click();
    const content=page.locator('#dialog .guide-scroll');
    if(geometry.scrollHeight>geometry.clientHeight+10){
      await content.evaluate(el=>{el.scrollTop=el.scrollHeight});
      const reached=await content.evaluate(el=>el.scrollTop);
      if(reached<10)throw Error('Não é possível rolar o conteúdo do guia verticalmente: '+reached);
    }
    for(let step=2;step<=5;step++){
      await page.locator('#dialog [data-action="guide-forward"]:visible').click();
      const text=await page.locator('#dialog .guide-stage-progress > span').innerText();
      if(!text.includes('Etapa '+step+' de 5'))
        throw Error('Guia não avançou à etapa '+step+' em '+width+': '+text);
      if(await page.locator('#dialog .guide-scroll').evaluate(el=>el.scrollLeft>1))
        throw Error('O guia deslizou horizontalmente');
    }
    await page.locator('#dialog [data-action="close-dialog"]:visible').last().click();
    if(await page.locator('#dialog').evaluate(el=>el.open))
      throw Error('Guia não fecha após a última etapa');
   }
   await click(page,'.patrol-actions [data-action="start"]');
   await (await revealDialogControl(page,'#dialog #declaration-check')).check();
   await revealDialogControl(page,'#dialog [data-action="confirm-start"]');
   await click(page,'[data-action="confirm-start"]');
   await state(page,width,height,'05-ronda-ativa');
   if(width<=900){
    const dims=await page.evaluate(()=>{
     const viewportBottom=document.documentElement.clientHeight,
      main=document.querySelector('.dashboard .app-content')?.getBoundingClientRect(),
      map=document.querySelector('#mobile-map')?.getBoundingClientRect(),
      action=document.querySelector('.patrol-actions')?.getBoundingClientRect();
     return {gap:viewportBottom-main.bottom,mapHeight:map.height,actionBottom:action.bottom,mapBottom:map.bottom,viewportBottom};
    });
    if(dims.gap>15||dims.mapHeight<125||dims.actionBottom>dims.viewportBottom+2)
     throw Error('Mapa ou limite inferior não ocupam a área útil: '+JSON.stringify(dims));
    await click(page,'.patrol-actions [data-action="toggle-patrol-sheet"]');
    const sheet=await page.locator('#dialog[open].ux06-fullscreen .ux06-sheet').count();
    if(!sheet)throw Error('Menu da ronda não abriu em janela ampla');
    const modalSize=await page.locator('#dialog').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));
    if(modalSize.w<width*.87||modalSize.h<height*.8)throw Error('Janela de ferramentas pequena demais: '+JSON.stringify(modalSize));
    await click(page,'#dialog .ux06-sheet-back');
    if(await page.locator('#dialog').evaluate(el=>el.open))throw Error('Voltar não fechou ferramentas');
   }
   if(width<=900&&await page.locator('#dialog').evaluate(el=>!el.open&&getComputedStyle(el).display!=='none'))
    throw Error('Diálogo fechado está ocupando altura fora da tela');
   // O vigia acessa o histórico próprio sem relatórios da gestão.
   if(width<=900){
    await click(page,'[data-action="open-mobile-menu"]');
    await click(page,'#dialog [data-view="historico"]');
   } else await click(page,'[data-view="historico"]:visible');
   await state(page,width,height,'06-historico-do-vigia');
   if(!await page.locator('.schedule-workspace').count())throw Error('Vigia sem tela de histórico próprio.');
   if(await page.locator('.report-page').count())throw Error('Relatório administrativo visível ao vigia.');

   // Operadores: acompanhamento de rondas e alertas, sem entrar na gestão administrativa.
   await click(page,'[data-action="sim-role-picker"]');
   await click(page,'#dialog [data-action="sim-role"][data-role="operador"]');
   await state(page,width,height,'07-central-monitoramento');
   if(width<=900)await checkRoleGuide(page,width,height,'operador','COI · Monitoramento');
   if(!await page.locator('.operations-page').count())throw Error('Operador sem área de monitoramento.');
   if(!await page.locator('#ops-map').count())throw Error('Operador sem mapa de rondas.');
   if(await page.locator('[data-view="relatorios"]').count())throw Error('Operador recebeu menu de relatórios administrativos.');
   await page.locator('[data-supervisor-watcher]').selectOption('v03');
   await state(page,width,height,'08-monitorar-vigia');

   // Administrador: seus indicadores próprios e ferramentas analíticas.
   await click(page,'[data-action="sim-role-picker"]');
   await click(page,'#dialog [data-action="sim-role"][data-role="admin"]');
   await state(page,width,height,'09-dashboard-administrativo');
   if(width<=900)await checkRoleGuide(page,width,height,'admin','Painel Administrativo');
   if(!await page.locator('.dashboard-v4').count())throw Error('Administrativo sem dashboard.');
   if(width<=900){
    await click(page,'[data-action="open-mobile-menu"]');
    await click(page,'#dialog [data-view="relatorios"]');
    await state(page,width,height,'10-relatorios-administrativos');
    await checkInteractiveBounds(page,'relatórios administrativos');
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
