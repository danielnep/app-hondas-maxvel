import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
const require=createRequire(import.meta.url);
const axePath=require.resolve('axe-core/axe.min.js');
const folder='artifacts/accessibility',temp=mkdtempSync(join(tmpdir(),'ronda-access-'));
mkdirSync(folder,{recursive:true});
const roles=['admin','coi','ronda','vistoriador'];
const secret='AccessibilityRunnerPassword_2026!';
const initial=roles.map(role=>({name:role.toUpperCase(),email:role+'@audit.local',username:role,password:secret,role}));
process.env.RONDA_PRO_DB_PATH=join(temp,'ronda.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='master@audit.local';
process.env.RONDA_PRO_MASTER_PASSWORD='AccessibilityMasterPassword_2026!';
process.env.RONDA_PRO_INITIAL_ACCOUNTS=JSON.stringify(initial);
const server=createAppServer();
let browser;const results=[],failures=[];
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 const executablePath=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim();
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440])for(const role of roles){
  const context=await browser.newContext({viewport:{width,height:850},locale:'pt-BR',reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();
  page.on('pageerror',e=>failures.push(role+' '+width+': '+e.message));
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#live-login-form').waitFor({timeout:15000});
  await page.locator('#live-login-form [name="identifier"]').fill(role);
  await page.locator('#live-login-form [name="password"]').fill(secret);
  await page.locator('#live-login-form button[type="submit"]').click();
  await page.locator('.dashboard').waitFor({timeout:15000});
  if(role==='admin'){await page.evaluate(()=>document.querySelector('[data-view="configuracoes"]')?.click());await page.locator('#live-create-user-form').waitFor();}
  await page.addScriptTag({path:axePath});
  const violations=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,targets:v.nodes.slice(0,5).map(x=>x.target)}));});
  results.push({role,width,violations});
  await page.screenshot({path:folder+'/'+role+'-'+width+'.png',fullPage:true});
  if(violations.some(v=>v.impact==='critical'||v.impact==='serious'))failures.push(role+' '+width+': '+JSON.stringify(violations));
  await context.close();
 }
}finally{
 writeFileSync(folder+'/report.json',JSON.stringify({results,failures},null,2));
 await browser?.close();
 await new Promise(ok=>server.close(ok));
 rmSync(temp,{recursive:true,force:true});
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('8 revisoes WCAG dos perfis autenticados sem erros graves');
