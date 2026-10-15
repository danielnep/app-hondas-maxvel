/**
 * Smoke da central autenticada, usando somente contas e banco temporários.
 */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

const dir=mkdtempSync(join(tmpdir(),'rondas-coi-browser-'));
process.env.RONDA_PRO_DB_PATH=join(dir,'isolated.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='test-coi-browser@example.test';
process.env.RONDA_PRO_MASTER_PASSWORD='ForteSenhaLocalTeste2026!!';
const server=createAppServer();
let browser;
const report=[];
const assert=(value,message)=>{if(!value)throw Error(message)};
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const auth=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})});
 assert(auth.status===200,'Login do master para preparar teste falhou');
 const token=(await auth.json()).token;
 const created=await fetch(base+'/api/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({
  name:'Operador de validação',email:'operator-browser@example.test',password:'SenhaDeTeste2026##',role:'coi',
  description:'Perfil de teste autorizado para a central.'
 })});
 assert(created.status===201,'Falha ao criar conta COI fictícia');
 const chrome=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim();
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
 const out='artifacts/coi-authenticated';mkdirSync(out,{recursive:true});
 for(const [width,height] of [[390,850],[1366,900]]){
  const page=await browser.newPage({viewport:{width,height},locale:'pt-BR'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/central.html',{waitUntil:'domcontentloaded'});
  await page.locator('#central-login [name=email]').fill('operator-browser@example.test');
  await page.locator('#central-login [name=password]').fill('SenhaDeTeste2026##');
  await page.locator('#central-login button').click();
  await page.locator('.coi3-app').waitFor({timeout:15000});
  assert((await page.locator('h1').first().textContent()||'').includes('COI'),'Título COI ausente, viewport '+width);
  assert(await page.locator('[data-coi-tab="rondas"]').count()===1,'Aba rondas ausente');
  assert(await page.locator('[data-coi-tab="vistorias"]').count()===1,'Aba vistorias ausente');
  assert(await page.locator('.coi3-onair').count()===1,'Status online da central ausente');
  assert(!(await page.locator('button:has-text("Mapa da operação")').count()),'Aba Mapa da operação não deve existir no COI');
  await page.locator('[data-coi-tab="vistorias"]').click();
  assert(await page.locator('[data-coi-tab="vistorias"]').getAttribute('aria-pressed')==='true','Aba vistorias não ficou ativa');
  await page.screenshot({path:out+'/coi-'+width+'.png',fullPage:true});
  await page.locator('button[data-page="treatments"]').first().click();
  await page.locator('.coi3-treatments').waitFor({timeout:6000});
  assert((await page.locator('h1').first().textContent()||'').includes('Tratativas'),'Página de tratativas não abriu');
  await page.screenshot({path:out+'/tratativas-'+width+'.png',fullPage:true});
  await page.locator('button[data-page="notifications"]').first().click();
  await page.locator('.ops-inbox-3').waitFor({timeout:6000});
  assert(await page.locator('[data-ops-filter="pending"]').count()===1,'Filtro de pendências ausente');
  const overscroll=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overscroll<=6,'Overflow horizontal em '+width+'px: '+overscroll);
  assert(!errors.length,'Erros JavaScript: '+errors.join(' ; '));
  report.push({width,height,coi:true,treatments:true,inbox:true,horizontalOverflow:overscroll});
  await page.close();
 }
 console.log(JSON.stringify({authenticatedCentral:'ok',report},null,2));
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
 rmSync(dir,{recursive:true,force:true});
}
