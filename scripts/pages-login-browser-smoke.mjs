/** Real Chromium: four offline logins, served under a simulated GitHub Pages origin.
 * Uses the actual static files of this branch, and never contacts the Railway API.
 */
import {chromium} from 'playwright-core';
import {PAGES_TEST_ACCOUNTS} from '../src/pages-test-api.js';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';

const base='https://danielnep.github.io/app-hondas-maxvel/';
const origin=new URL(base).origin;
const root=resolve('.');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const fail=[];
let browser;
mkdirSync('artifacts/pages-browser-login',{recursive:true});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const account of PAGES_TEST_ACCOUNTS){
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
   await page.locator('#live-login-form [name=identifier]').fill(account.username);
   await page.locator('#live-login-form [name=password]').fill(account.password);
   await page.locator('#live-login-form button[type=submit]').click();
   await page.waitForFunction(()=>sessionStorage.getItem('rondaspro_api_token')?.startsWith('pages-test:')&&!document.querySelector('#live-login-form'),null,{timeout:15000});
   if(apiCalls.length)throw Error('Login attempted backend '+apiCalls.join(','));
   if(errors.length)throw Error('JS '+errors.join(' | '));
   await page.screenshot({path:'artifacts/pages-browser-login/'+account.username+'.png'});
   console.log('OK: '+account.username+', role '+account.role);
  }catch(err){
   const msg=await page.locator('.flag').allTextContents().catch(()=>[]);
   fail.push({role:account.role,message:err.message,flag:msg,errors,apiCalls});
   await page.screenshot({path:'artifacts/pages-browser-login/'+account.username+'-failed.png'}).catch(()=>{});
  }finally{await context.close()}
 }
 if(fail.length)throw Error(JSON.stringify(fail));
}finally{await browser?.close()}
