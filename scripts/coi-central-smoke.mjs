/** Fluxos autenticados com contas e SQLite exclusivamente temporários. */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
const dir=mkdtempSync(join(tmpdir(),'rondas-coi-browser-'));
process.env.RONDA_PRO_DB_PATH=join(dir,'isolated.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='root-browser@example.test';
process.env.RONDA_PRO_MASTER_PASSWORD='ForteSenhaLocalTeste2026!!';
const password='SenhaDeTeste2026##';
const server=createAppServer(),report=[];
let browser;
const assert=(v,m)=>{if(!v)throw Error(m)};
const out='artifacts/coi-authenticated';mkdirSync(out,{recursive:true});
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,token,data)=>{
  const r=await fetch(base+'/api'+path,{method:data?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  const json=await r.json();assert(r.ok,path+': '+r.status+' '+JSON.stringify(json));return json;
 };
 const root=(await request('/login',null,{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).token;
 for(const role of ['coi','admin','ronda'])await request('/users',root,{name:'Teste '+role,email:role+'-browser@example.test',password,role,site:'Posto de teste',description:'Conta fictícia exclusiva da validação automatizada'});
 const guard=(await request('/login',null,{email:'ronda-browser@example.test',password})).token;
 let chrome=process.env.CHROME_BIN;
 if(!chrome){try{chrome=execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim()}catch{chrome=chromium.executablePath()}}
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function login(role,viewport){
  const context=await browser.newContext({viewport,locale:'pt-BR'}),page=await context.newPage();
  await page.goto(base+'/central.html',{waitUntil:'domcontentloaded'});
  await page.locator('#central-login [name=email]').fill(role+'-browser@example.test');
  await page.locator('#central-login [name=password]').fill(password);
  await page.locator('#central-login button').click();
  await page.locator('#central-navigation').waitFor({state:'attached',timeout:15000});
  if(viewport.width<=760)assert(!await page.locator('#central-navigation').isVisible(),'Menu móvel deve iniciar recolhido');
  await page.emulateMedia({reducedMotion:'reduce'});
  return {context,page};
 }
 async function navigate(page,name){
  if(await page.locator('#central-event-dialog[open]').count())await page.locator('[data-close-event]').click();
  const button=page.locator('button[data-page="'+name+'"]').first();
  if(!await button.isVisible())await page.locator('[data-central-menu]').click();
  await button.click();
 }
 async function conclude(page){
  await page.locator('[data-claim-treatment]').click();
  await page.locator('[data-review-status="resolvida"]').click();
  await page.locator('.conclusion-overlay textarea').fill('Conferi o relato e os horários, solicitei verificação no posto e registrei as providências adotadas com a equipe.');
  if(await page.locator('.conclusion-overlay [data-ack]').count())await page.locator('.conclusion-overlay [data-ack]').check();
  await page.locator('.conclusion-overlay [type=submit]').click();
  await page.locator('.conclusion-overlay').waitFor({state:'detached'});
 }
 for(const [width,height] of [[390,850],[1366,900]]){
  const event=await request('/events',guard,{kind:'incident',occurredAt:Date.now(),description:'Ocorrência do fluxo '+width});
  const coi=await login('coi',{width,height}),admin=await login('admin',{width:1366,height:900});
  const errors=[];coi.page.on('pageerror',e=>errors.push(e.message));admin.page.on('pageerror',e=>errors.push(e.message));
  const token=await coi.page.evaluate(()=>sessionStorage.getItem('rondaspro_api_token'));
  const adminToken=await admin.page.evaluate(()=>sessionStorage.getItem('rondaspro_api_token'));
  assert(await coi.page.locator('.rp-recent-activity').count()===1,'Resumo de última ronda e atividades ausente');
  assert(await coi.page.locator('[data-page="activity-history"]').count()>0,'Histórico de rondas ausente');
  await coi.page.screenshot({path:out+'/coi-'+width+'.png',fullPage:true});
  await navigate(coi.page,'treatments');
  await coi.page.locator('[data-treatment-tab="incident"]').waitFor();
  assert(await coi.page.locator('[data-event="'+event.id+'"]:visible').count()===0,'Pendente não pode estar no histórico');
  await coi.page.screenshot({path:out+'/tratativas-'+width+'.png',fullPage:true});
  await navigate(coi.page,'notifications');
  assert(await coi.page.locator('[data-ops-filter],.coi3-notification-tabs').count()===0,'Feed não pode possuir filtros ou abas');
  const notice=(await request('/notifications',token)).notifications.find(n=>n.event_id===event.id);
  await coi.page.locator('.rp-event-columns [data-ops-notification="'+notice.id+'"]').click();
  await coi.page.locator('[data-claim-treatment]').waitFor();
  assert((await request('/treatment-summary',token)).total===1,'Ler não pode resolver a pendência');
  await coi.page.locator('[data-claim-treatment]').click();
  await coi.page.locator('#send-message textarea').fill('Rascunho que deve permanecer após sincronização.');
  await navigate(admin.page,'treatments');
  await admin.page.locator('[data-event="'+event.id+'"]').click();
  assert(await admin.page.locator('[data-claim-treatment]').count()===0,'Administração não pode assumir registro reservado pelo COI');
  await request('/events/'+event.id+'/messages',guard,{body:'Confirmação adicional enviada pelo vigia.'});
  await coi.page.waitForFunction(()=>document.querySelector('#thread')?.textContent.includes('Confirmação adicional'),null,{timeout:18000});
  assert(await coi.page.locator('#send-message textarea').inputValue()==='Rascunho que deve permanecer após sincronização.','Sincronização apagou o rascunho');
  await coi.page.locator('#send-message button').click();
  await coi.page.locator('[data-review-status="resolvida"]').click();
  await coi.page.locator('.conclusion-overlay textarea').fill('Conferi o relato e os horários, solicitei verificação no posto e registrei as providências adotadas com a equipe.');
  await coi.page.locator('.conclusion-overlay [type=submit]').click();
  await coi.page.locator('.conclusion-overlay').waitFor({state:'detached'});
  await admin.page.waitForFunction(()=>document.querySelector('[data-event-operational-status]')?.textContent==='Concluída',null,{timeout:18000});
  assert(await admin.page.locator('[data-claim-treatment],[data-review-status]').count()===0,'Registro concluído permite tratamento duplicado');
  assert((await request('/events/'+event.id,adminToken)).treatments.length===1,'Caminhos criaram tratativas duplicadas');
  await navigate(coi.page,'notifications');
  assert(await coi.page.locator('.rp-event-columns [data-ops-notification="'+notice.id+'"].is-completed').count()===1,'Notificação concluída não foi atenuada');
  await coi.page.waitForTimeout(600);
  await coi.page.screenshot({path:out+'/notificacoes-'+width+'.png',fullPage:true});
  const fallback=await request('/events',guard,{kind:'alert',occurredAt:Date.now(),description:'Solicitação sem tratamento do COI '+width});
  await navigate(admin.page,'notifications');
  // Receber a alteração em outra sessão é parte do aceite.
  await admin.page.waitForFunction(text=>document.querySelector('.ops-inbox-3')?.textContent.includes(text),'Solicitação sem tratamento do COI '+width,{timeout:18000});
  const n=(await request('/notifications',adminToken)).notifications.find(n=>n.event_id===fallback.id);
  await admin.page.locator('.rp-event-columns [data-ops-notification="'+n.id+'"]').click();
  await admin.page.locator('.rp-coi-missing').waitFor();
  await conclude(admin.page);
  assert((await request('/events/'+fallback.id,token)).treatments[0].author_role==='admin','Atuação subsidiária não foi persistida');
  await coi.page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-pending-scope="total"],[data-pending-scope="notifications"]')).every(n=>n.hidden),null,{timeout:18000});
  await coi.page.reload({waitUntil:'domcontentloaded'});
  await coi.page.locator('.coi3-app').waitFor();
  assert((await request('/treatment-summary',token)).total===0,'Recarregamento perdeu a conclusão');
  const overflow=await coi.page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'Overflow em '+width+': '+overflow);assert(!errors.length,'Erros JavaScript: '+errors.join('; '));
  report.push({width,height,feed:true,categories:true,coiConclusion:true,adminFallback:true,crossSession:true,draftPreserved:true,reload:true,overflow});
  await coi.context.close();await admin.context.close();
 }
 writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({authenticatedCentral:'ok',report},null,2));
}finally{
 if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});
}
