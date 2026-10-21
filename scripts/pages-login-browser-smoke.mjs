/** Chromium: quatro perfis sem senha no GitHub Pages e no Railway, sem chamadas ao backend. */
import {chromium} from 'playwright-core';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';

const bases=[
 {name:'pages',url:'https://danielnep.github.io/app-hondas-maxvel/',prefix:'/app-hondas-maxvel/'},
 {name:'railway',url:'https://ronda-pro-production.up.railway.app/',prefix:'/'}
];
const root=resolve('.');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const roles=[
 ['admin','overview','Administração'],
 ['coi','overview','COI · Acompanhamento'],
 ['vistoriador','vistoriador','Vistoriador'],
 ['ronda','minha-ronda','Operação de Ronda']
];
let browser;
mkdirSync('artifacts/pages-browser-login',{recursive:true});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const target of bases){
  const context=await browser.newContext({viewport:{width:393,height:852},locale:'pt-BR',serviceWorkers:'block',permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88}});
  const page=await context.newPage(),apiCalls=[],errors=[];
  const origin=new URL(target.url).origin;
  await context.route(origin+'/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){apiCalls.push(url.pathname);return route.abort();}
   if(!url.pathname.startsWith(target.prefix))return route.abort();
   const sub=url.pathname.slice(target.prefix.length)||'index.html';
   const filepath=resolve(root,sub);
   if(!filepath.startsWith(root+'/')||!existsSync(filepath))return route.fulfill({status:404,body:'Not Found'});
   return route.fulfill({path:filepath,contentType:types[extname(filepath)]||'application/octet-stream'});
  });
  // Deterministic geocoding fixture: the UI must pick a real map coordinate,
  // not silently accept text as a geographic destination.
  await context.route('https://photon.komoot.io/api/**',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({features:[{type:'Feature',geometry:{coordinates:[-44.8906,-20.1437]},
     properties:{name:'Rua da Vistoria',street:'Rua da Vistoria',housenumber:'123',city:'Divinópolis'}}]})
  }));
  page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(target.url,{waitUntil:'domcontentloaded'});
   await page.locator('#dialog .role-picker-list [data-role="ronda"]').waitFor({timeout:15000});
   const visibleRoles=await page.locator('#dialog .role-picker-list [data-action="sim-role"]').count();
   if(visibleRoles!==4)throw Error(target.name+': seletor mostrou '+visibleRoles+' áreas, esperado 4');
   if(await page.locator('#live-login-form').count())throw Error('Login visível em '+target.name);
   for(const [index,[role,view,label]] of roles.entries()){
    if(index>0){
      await page.locator('.user-profile-button').click();
      await page.locator('#dialog [data-action="sim-role-picker"]').click();
      const picker=page.locator('#dialog.role-picker-dialog[open]');
      const geom=await picker.evaluate(el=>({modal:el.matches(':modal'),rect:el.getBoundingClientRect().toJSON(),buttons:el.querySelectorAll('.role-picker-list button').length}));
      if(!await picker.locator('.role-picker-list').isVisible()||!geom.modal||geom.rect.width<200||geom.rect.height<150||geom.buttons!==4)
       throw Error('Trocar área abriu só o fundo desfocado: '+JSON.stringify(geom));
     }
    await page.locator('#dialog [data-action="sim-role"][data-role="'+role+'"]').click();
    if(role==='ronda'){
     const picker=page.locator('#dialog .rp-demo-worker-picker');
     await picker.waitFor({timeout:12000});
     if(await picker.locator('[data-action="choose-demo-worker"]').count()!==3)throw Error('O seletor deve ter exatamente três vigias fictícios');
     await picker.locator('[data-username="vigia-demo-lucas"]').click();
    }
    await page.waitForFunction(({view,label})=>document.querySelector('.dashboard:not(.simulation-mode)')&&document.querySelector('.side-link.active')?.dataset.view===view&&document.querySelector('.user-profile-button small')?.textContent.trim()===label,{view,label},{timeout:15000});
    if(await page.locator('#live-login-form').count())throw Error('Login reapareceu após troca de área: '+role);
    if(role==='admin'){
      if(await page.locator('#live-dispatch-form').count())throw Error('Formulário vertical ainda na visão geral');
      await page.locator('[data-action="dispatch-open"]').click();
      const form=page.locator('#dialog #live-dispatch-form');
      await form.waitFor({state:'visible',timeout:12000});
      await form.locator('[data-action="dispatch-next"]').click();
      if((await form.getAttribute('data-step'))!=='1')throw Error('Avançou sem vistoriador');
      await form.locator('[name="workerId"]').selectOption({index:1});
      await form.locator('[data-action="dispatch-next"]').click();
      await form.locator('[name="address"]').fill('Rua da Vistoria, 123, Divinópolis');
      await form.locator('#rp-dispatch-suggestions [role="option"]').first().waitFor({timeout:12000});
      await form.locator('#rp-dispatch-suggestions [role="option"]').first().click();
      if(!await form.locator('#rp-dispatch-preview-map').count())throw Error('Mapa do destino ausente no celular');
      await form.locator('[data-action="dispatch-next"]').click();
      await form.locator('[name="reason"]').fill('Conferir portaria principal e acesso dos visitantes.');
      await form.locator('[data-action="dispatch-next"]').click();
      if((await form.getAttribute('data-step'))!=='4'||!await form.getByText('Rua da Vistoria, 123, Divinópolis').count())
       throw Error('Revisão perdeu o rascunho');
      const inspector=await page.locator('#dialog').evaluate(el=>{const bounds=e=>{const r=e?.getBoundingClientRect();return r?{height:r.height,top:r.top,bottom:r.bottom}:null};return {classes:el.className,computed:{height:getComputedStyle(el).height,minHeight:getComputedStyle(el).minHeight,maxHeight:getComputedStyle(el).maxHeight,display:getComputedStyle(el).display},dialog:bounds(el),wizard:bounds(el.querySelector('.rp-dispatch-wizard')),form:bounds(el.querySelector('form')),stage:bounds(el.querySelector('[data-dispatch-stage="4"]')),scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}});console.log('DISPATCH_HEIGHT '+JSON.stringify(inspector));
      const geometry=await page.locator('#dialog').boundingBox();
      if(!geometry||geometry.width>393||geometry.height>600||geometry.y<0)throw Error('Janela de despacho excessivamente alta ou cortada: '+JSON.stringify(geometry));
      await page.screenshot({path:'artifacts/pages-browser-login/'+target.name+'-despacho.png',animations:'disabled'});
      await form.locator('[data-action="dispatch-back"]').click();
      if((await form.getAttribute('data-step'))!=='3'||await form.locator('[name="reason"]').inputValue()!=='Conferir portaria principal e acesso dos visitantes.')
       throw Error('Voltar perdeu orientações');
      await form.locator('[data-action="dispatch-next"]').click();
      await form.locator('[type="submit"]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ronda-pro-pages-test-v2:dispatches')||'[]').some(x=>x.address==='Rua da Vistoria, 123, Divinópolis'&&x.reason==='Conferir portaria principal e acesso dos visitantes.'&&x.kind==='vistoria'),{timeout:12000});
      if(await page.locator('#dialog').evaluate(x=>x.open))throw Error('Janela permaneceu aberta após envio confirmado');
      console.log('OK: '+target.name+' / Despacho completo com 4 etapas, gravação e modal compacto');
     }
     if(role==='vistoriador'){
     const map=page.locator('#demo-inspection-map'),bounds=await map.boundingBox();
     if(!bounds||bounds.width<220||bounds.height<200)throw Error('Mapa do Vistoriador oculto: '+JSON.stringify(bounds));
     await map.locator('.map-fallback, .leaflet-container').first().waitFor({timeout:12000});
     console.log('OK: '+target.name+' / Vistoriador com mapa ('+Math.round(bounds.width)+'x'+Math.round(bounds.height)+')');
     const create=async(kind,address,reason,points='')=>{
      await page.locator('[data-action="inspector-create"][data-task-kind="'+kind+'"]').click();
      const form=page.locator('#dialog #inspector-create-form');
      await form.locator('[name="address"]').fill(address);
      await form.locator('[name="reason"]').fill(reason);
      if(points)await form.locator('[name="points"]').fill(points);
      await form.locator('button[type="submit"]').click();
      await form.waitFor({state:'hidden',timeout:12000});
     };
     await create('ronda','Ronda externa ponto A','Revisão de acesso e iluminação perimetral','Portaria;-20.14020;-44.88366\nEstacionamento;-20.14052;-44.88338');
     await page.locator('#inspector-latest-round-map .map-fallback, #inspector-latest-round-map .leaflet-container').first().waitFor({timeout:12000});
     if(!await page.locator('.rp-inspector-records').getByText('Ronda externa ponto A').count())throw Error('Ronda recém-criada não aparece nas últimas rondas');
     await page.locator('[data-action="live-inspection-start"]').first().click();
     await page.locator('[data-action="inspector-round-finish"]').first().click();
     const finishForm=page.locator('#dialog #inspector-finish-round-form');
     await finishForm.locator('[name="note"]').fill('Ronda concluída sem anormalidades nos acessos.');
     await finishForm.locator('button[type="submit"]').click();
     await finishForm.waitFor({state:'hidden',timeout:12000});
     await create('inspection','Vistoria de acesso lateral','Inspecionar acesso lateral e condições da porta.');
     if(!await page.locator('.rp-inspector-records').getByText('Vistoria de acesso lateral').count())throw Error('Vistoria recém-criada não aparece nas últimas vistorias');
     await page.locator('[data-action="inspector-history-all"]').first().click();
     const history=page.locator('[data-inspection-history-dialog][open]');
     await history.waitFor({timeout:12000});
     if(!await history.getByText('Ronda externa ponto A').count()||!await history.getByText('Vistoria de acesso lateral').count())throw Error('Histórico completo não mostra ambas as atividades');
     await history.locator('[data-inspection-modal-close]').click();
     console.log('OK: '+target.name+' / Vistoriador criou ronda com pontos, iniciou, concluiu, criou vistoria e consultou ambos históricos');
    }
    if(role==='ronda'){
     const map=page.locator('#mobile-map'),bounds=await map.boundingBox();
     if(!bounds||bounds.width<220||bounds.height<200)throw Error('Mapa do Vigia não está visível: '+JSON.stringify(bounds));
     await map.locator('.map-fallback, .leaflet-container').first().waitFor({timeout:15000});
     if(!(await page.locator('.rp-demo-banner-global').count()))throw Error('Aviso de demonstração ausente');
     console.log('OK: '+target.name+' / Vigia mostra mapa sem rota ('+Math.round(bounds.width)+'x'+Math.round(bounds.height)+')');
    }
    await page.screenshot({path:'artifacts/pages-browser-login/'+target.name+'-'+role+'.png'});
    console.log('OK: '+target.name+' / '+role+' sem login, tela '+view);
   }
   if(apiCalls.length)throw Error('Chamadas indevidas ao backend: '+apiCalls.join(','));
   if(errors.length)throw Error('Erro JavaScript: '+errors.join(' | '));
  }catch(err){
   await page.screenshot({path:'artifacts/pages-browser-login/'+target.name+'-failed.png'}).catch(()=>{});
   throw Error(target.name+': '+err.message+' | JS: '+errors.join(' | ')+' | API: '+apiCalls.join(','));
  }finally{await context.close()}
 }
}finally{await browser?.close()}
