import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAppServer} from '../server.js';
const temp=mkdtempSync(path.join(tmpdir(),'ronda-production-ui-'));
process.env.RONDA_PRO_DB_PATH=path.join(temp,'test.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='master@qa.test';
process.env.RONDA_PRO_MASTER_PASSWORD='SenhaTestesLocal123!';
process.env.RONDA_PRO_INITIAL_ACCOUNTS=JSON.stringify(['admin','coi','ronda'].map(role=>({name:role+' QA',email:role+'@qa.test',username:role,role,password:'SenhaTestesLocal123!'})));
delete process.env.RONDA_PRO_PILOT_PASSWORD;delete process.env.RONDA_PRO_PILOT_PASSWORD_REVISION;
const srv=createAppServer();await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+srv.address().port;
const {chromium}=await import(pathToFileURL(process.env.RP_PLAYWRIGHT_MODULE).href);
let browser;const results=[];const out=process.env.RP_QA_OUTPUT||'/opt/ronda-pro-build-20261031/visual';mkdirSync(out,{recursive:true});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.RP_CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440])for(const entry of ['/index.html','/'])for(const role of ['master','admin','coi','ronda']){
  const context=await browser.newContext({viewport:{width,height:900},geolocation:{latitude:-20.14,longitude:-44.88},permissions:['geolocation']});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+entry,{waitUntil:'domcontentloaded'});
   const field=entry==='/'?'input[name=email]':'input[name=identifier]';
   await page.locator(field).fill(role==='master'?'master@qa.test':role);
   await page.locator('input[name=password]').fill('SenhaTestesLocal123!');
   const login=page.waitForResponse(r=>r.url()===origin+'/api/login'&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Entrar',exact:true}).click();
   assert.equal((await login).status(),200);
   await page.locator(entry==='/'?'#central-login':'#live-login-form').waitFor({state:'detached',timeout:15000});
   const text=await page.locator('body').innerText();
   assert.doesNotMatch(text,/Ver logins e senhas de teste|vigias demonstrativos|sem servidor/i);
   assert.equal(await page.locator('.role-picker-dialog[open]').count(),0);
   if(width===390&&entry==='/index.html'&&['admin','ronda'].includes(role))await page.screenshot({path:path.join(out,role+'-390.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   results.push({entry,role,width,status:'passed'});
  }catch(e){results.push({entry,role,width,status:'failed',error:e.message});}
  finally{await context.close();}
 }
 assert.equal((await fetch(origin+'/api/users')).status,401);
 writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
 assert.equal(results.filter(x=>x.status==='failed').length,0);
}finally{
 if(browser)await browser.close();await new Promise(ok=>srv.close(ok));rmSync(temp,{recursive:true,force:true});
}
