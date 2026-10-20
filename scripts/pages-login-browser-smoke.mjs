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
    }
    await page.locator('#dialog [data-action="sim-role"][data-role="'+role+'"]').click();
    await page.waitForFunction(({view,label})=>document.querySelector('.dashboard:not(.simulation-mode)')&&document.querySelector('.side-link.active')?.dataset.view===view&&document.querySelector('.user-profile-button small')?.textContent.trim()===label,{view,label},{timeout:15000});
    if(await page.locator('#live-login-form').count())throw Error('Login reapareceu após troca de área: '+role);
    if(role==='ronda'){
     const map=page.locator('#mobile-map'),bounds=await map.boundingBox();
     if(!bounds||bounds.width<220||bounds.height<200)throw Error('Mapa do Vigia não está visível: '+JSON.stringify(bounds));
     await map.locator('.map-fallback, .leaflet-container').first().waitFor({timeout:15000});
     if(!(await page.getByText('Nenhuma rota atribuída').count()))throw Error('Falta aviso sobre rota não atribuída');
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
