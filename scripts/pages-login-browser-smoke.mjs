/** Smoke no Chromium: GitHub Pages abre diretamente o seletor das cinco áreas, sem login e sem API. */
import {chromium} from 'playwright-core';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';

const base='https://danielnep.github.io/app-hondas-maxvel/';
const origin=new URL(base).origin,root=resolve('.');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const roles=[
 ['ronda','minha-ronda','Operação de Ronda'],
 ['operador','overview','COI · Acompanhamento'],
 ['cliente','cliente','Visão Cliente'],
 ['vistoriador','vistoriador','Vistoriador'],
 ['admin','overview','Administração']
];
let browser;
mkdirSync('artifacts/pages-browser-login',{recursive:true});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:393,height:852},locale:'pt-BR',serviceWorkers:'block',permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88}});
 const page=await context.newPage(),apiCalls=[],errors=[];
 await context.route(origin+'/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/api/')){apiCalls.push(url.pathname);return route.abort();}
  if(!url.pathname.startsWith('/app-hondas-maxvel/'))return route.abort();
  const sub=url.pathname.slice('/app-hondas-maxvel/'.length)||'index.html';
  const filepath=resolve(root,sub);
  if(!filepath.startsWith(root+'/')||!existsSync(filepath))return route.fulfill({status:404,body:'Not Found'});
  return route.fulfill({path:filepath,contentType:types[extname(filepath)]||'application/octet-stream'});
 });
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#dialog .role-picker-list [data-role="ronda"]').waitFor({timeout:15000});
  if(await page.locator('#live-login-form').count())throw Error('Login ainda visível no GitHub Pages');
  for(const [index,[role,view,label]] of roles.entries()){
   if(index>0){
    await page.locator('.user-profile-button').click();
    await page.locator('#dialog [data-action="sim-role-picker"]').click();
   }
   await page.locator('#dialog [data-action="sim-role"][data-role="'+role+'"]').click();
   await page.waitForFunction(({view,label})=>document.querySelector('.dashboard.simulation-mode')&&document.querySelector('.side-link.active')?.dataset.view===view&&document.querySelector('.user-profile-button small')?.textContent.trim()===label,{view,label},{timeout:15000});
   if(await page.locator('#live-login-form').count())throw Error('Login reapareceu após troca de área');
   await page.screenshot({path:'artifacts/pages-browser-login/'+role+'.png'});
   console.log('OK: '+role+' sem login, tela '+view);
  }
  if(apiCalls.length)throw Error('Tentativa de acesso ao servidor: '+apiCalls.join(','));
  if(errors.length)throw Error('Erro JavaScript: '+errors.join(' | '));
 }catch(err){
  await page.screenshot({path:'artifacts/pages-browser-login/failed.png'}).catch(()=>{});
  throw Error(err.message+' | JS: '+errors.join(' | ')+' | API: '+apiCalls.join(','));
 }finally{await context.close()}
}finally{await browser?.close()}
