/** Teste visual da entrada sem login nos mesmos arquivos que o Railway serve. */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {extname,resolve} from 'node:path';
const base='https://ronda-pro-production.up.railway.app/';
const origin=new URL(base).origin;
const root=resolve('.');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const out='artifacts/railway-no-login';
mkdirSync(out,{recursive:true});
const assert=(yes,message)=>{if(!yes)throw Error(message);};
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [393,1440]){
  const context=await browser.newContext({viewport:{width,height:850},locale:'pt-BR',serviceWorkers:'block',permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname.startsWith('/api/'))throw Error('A entrada sem login não pode requisitar a API');
   const relative=url.pathname.slice(1)||'index.html';
   const file=resolve(root,relative);
   if(!(file===root||file.startsWith(root+'/'))||!existsSync(file))return route.fulfill({status:404,body:'Not Found'});
   return route.fulfill({path:file,contentType:types[extname(file)]||'application/octet-stream'});
  });
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('.dashboard .simulation-rolebar').waitFor({timeout:15000});
   assert(await page.locator('#live-login-form').count()===0,'Tela de login apareceu');
   assert(await page.locator('[data-action="sim-role"]').count()===2,'Alternador precisa conter apenas Vigia e Vistoriador');
   await page.screenshot({path:out+'/vigia-'+width+'.png'});
   await page.locator('[data-action="sim-role"][data-role="vistoriador"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-action="sim-role"][data-role="vistoriador"]')?.getAttribute('aria-pressed')==='true');
   assert(await page.locator('#live-login-form').count()===0,'Login apareceu ao alternar Vistoriador');
   await page.screenshot({path:out+'/vistoriador-'+width+'.png'});
   await page.locator('[data-action="sim-role"][data-role="ronda"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-action="sim-role"][data-role="ronda"]')?.getAttribute('aria-pressed')==='true');
   assert(await page.locator('#live-login-form').count()===0,'Login apareceu ao voltar ao Vigia');
   assert(errors.length===0,'Erro de JavaScript: '+errors.join(' | '));
   console.log(JSON.stringify({width,initial:'vigia',switch:'vistoriador',return:'vigia',login:false,errors:errors.length}));
  }finally{await context.close()}
 }
}finally{await browser?.close()}
