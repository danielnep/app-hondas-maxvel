import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
const temp=mkdtempSync(join(tmpdir(),'ronda-live-browser-'));
const output='artifacts/app-immersive';mkdirSync(output,{recursive:true});
const password='OperationalBrowserCheckPassword_2026!';
const roles=['admin','coi','ronda','vistoriador'];
process.env.RONDA_PRO_DB_PATH=join(temp,'state.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='master@browser.invalid';
process.env.RONDA_PRO_MASTER_PASSWORD='MasterBrowserCheckPassword_2026!';
process.env.RONDA_PRO_INITIAL_ACCOUNTS=JSON.stringify(roles.map(role=>({name:role.toUpperCase(),role,email:role+'@browser.invalid',username:role,password})));
const server=createAppServer();let browser;const results=[],errors=[];
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440])for(const role of roles){
  const context=await browser.newContext({viewport:{width,height:850},locale:'pt-BR',reducedMotion:'reduce',permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88,accuracy:5}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(role+': '+e.message));
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#live-login-form [name="identifier"]').fill(role);
  await page.locator('#live-login-form [name="password"]').fill(password);
  await page.locator('#live-login-form button[type=submit]').click();
  await page.locator('.dashboard').waitFor({timeout:15000});
  if(await page.locator('.simulation-rolebar').count())throw Error(role+': seletor de simulacao permanece visivel');
  // Prevent the oversized notification controls and miniature list glyph reported on COI mobile.
  if(['admin','coi'].includes(role)){
   const header=await page.evaluate(()=>{
    const rect=sel=>{const el=document.querySelector(sel);if(!el)return null;const b=el.getBoundingClientRect();return {width:b.width,height:b.height,left:b.left,right:b.right};};
    const icon=sel=>rect(sel+' svg.icon-svg');
    const menu=document.querySelector('.dashboard .app-menu-button svg.icon-svg');
    return {
     menu:icon('.dashboard .app-menu-button'),
     message:icon('.dashboard .app-header [data-action="demo-chat-overlay"]'),
     bell:rect('.dashboard .app-header .rp-header-popover>summary svg.icon-svg'),
     menuControl:rect('.dashboard .app-menu-button'),
     messageControl:rect('.dashboard .app-header [data-action="demo-chat-overlay"]'),
     paths:menu?.querySelector('path')?.getAttribute('d')||'',
     overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
   });
   const fail=(condition,description)=>{if(!condition)throw Error(role+' '+width+' topo: '+description+' '+JSON.stringify(header));};
   fail(header.message?.width>=18&&header.message.width<=23,'mensagens fora da escala');
   fail(header.messageControl?.height>=38,'mensagens com alvo pequeno');
   if(width===390){
    fail(header.menu?.width>=18&&header.menu.width<=23,'menu fora da escala');
    fail(header.paths.includes('M4 6h16'),'hamburguer não foi carregado');
    fail(header.menuControl?.width>=34,'menu com alvo pequeno');
   }
   if(header.bell)fail(header.bell.width>=18&&header.bell.width<=23,'sino fora da escala');
   fail(header.overflow<=2,'estouro horizontal');
  }

  if(role==='admin'){
   await page.evaluate(()=>document.querySelector('[data-view="configuracoes"]').click());
   await page.locator('#live-create-user-form').waitFor();
   if(width===1440){
    await page.locator('#live-create-user-form [name=role]').selectOption('ronda');
    await page.locator('#live-create-user-form [name=name]').fill('Operador Teste Web');
    await page.locator('#live-create-user-form [name=email]').fill('operadorteste@browser.invalid');
    await page.locator('#live-create-user-form [name=phone]').fill('37999990000');
    await page.locator('#live-create-user-form [name=username]').fill('testeweb');
    await page.locator('#live-create-user-form [name=password]').fill(password);
    await page.locator('#live-create-user-form button[type=submit]').click();
    await page.getByText('Profissional cadastrado no banco de dados.').waitFor({timeout:10000});
   }
  }
  await page.screenshot({path:output+'/'+role+'-'+width+'.png',fullPage:true});
  results.push({role,width,login:true,visible:true});
  await context.close();
 }
}finally{
 writeFileSync(output+'/live-validation.json',JSON.stringify({results,errors},null,2));
 await browser?.close();await new Promise(done=>server.close(done));rmSync(temp,{recursive:true,force:true});
}
if(errors.length){console.error(errors);process.exitCode=1;}else console.log('8 visoes autenticadas e cadastro funcional verificados');
