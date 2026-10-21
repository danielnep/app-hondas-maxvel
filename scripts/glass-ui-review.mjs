/** Isolated UI review: synthetic users/data only, never a production URL. */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';
const dir=mkdtempSync(join(tmpdir(),'rp-glass-'));
process.env.RONDA_PRO_DB_PATH=join(dir,'review.sqlite');process.env.RONDA_PRO_MASTER_EMAIL='review@example.test';process.env.RONDA_PRO_MASTER_PASSWORD='ReviewLocal2026!!';
const server=createAppServer(),out='artifacts/glass-ui';mkdirSync(out,{recursive:true});let browser;const results=[],errors=[];
const assert=(x,msg)=>{if(!x)throw Error(msg)};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const api=async(path,token,data)=>{const r=await fetch(base+'/api'+path,{method:data?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const body=await r.json();assert(r.ok,path+': '+JSON.stringify(body));return body};
 const master=(await api('/login',null,{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).token;
 const password='VisualReview2026!!';
 for(const [role,name]of [['coi','Mariana · COI'],['admin','Daniel · Administração'],['ronda','Lucas Ferreira'],['vistoriador','Ana Souza']])await api('/users',master,{name,email:role+'@example.test',password,role,site:'Unidade Centro',description:'Conta sintética para revisão visual isolada'});
 const guard=(await api('/login',null,{email:'ronda@example.test',password})).token;
 for(const [kind,description]of [['incident','Portão lateral encontrado aberto durante a ronda.'],['alert','Iluminação da entrada precisa de verificação.'],['message','Equipe no local. Aguardando orientação da central.'],['panic','Acionamento sintético para conferir o tratamento visual.']])await api('/events',guard,{kind,occurredAt:Date.now(),description});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 async function context(width,height=900){const c=await browser.newContext({viewport:{width,height},locale:'pt-BR',reducedMotion:'reduce',permissions:['geolocation'],geolocation:{latitude:-20.14,longitude:-44.88}});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route('https://**/*',r=>r.abort());return {c,p}}
 async function capture(p,name){await p.screenshot({path:out+'/'+name+'.png',fullPage:true});const excess=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(excess<=1,name+' overflow '+excess);results.push({screen:name,overflow:excess})}
 async function nav(p,page){const b=p.locator('[data-page="'+page+'"]').first();if(!await b.isVisible())await p.locator('[data-central-menu]').click();await b.click()}
 for(const role of ['coi','admin']){const{c,p}=await context(1440);await p.goto(base+'/central.html');await p.locator('#central-login [name=email]').fill(role+'@example.test');await p.locator('#central-login [name=password]').fill(password);await p.locator('#central-login button').click();await p.locator('#central-navigation').waitFor({state:'attached'});await p.locator('[data-guide-dismiss]').evaluateAll(es=>es.forEach(e=>e.click()));await capture(p,role+'-desktop');for(const page of ['notifications','treatments','events','team','export','chat']){await nav(p,page);await p.waitForTimeout(120);await capture(p,role+'-'+page)}await c.close()}
 // A branch utiliza contas reais; a revisão visual não deve tentar acessar a demonstração removida.
 for(const width of [320,393]){
  for(const role of ['ronda','vistoriador']){
   const{c,p}=await context(width,852);
   await p.goto(base+'/central.html');
   await p.locator('#central-login [name=email]').fill(role+'@example.test');
   await p.locator('#central-login [name=password]').fill(password);
   await p.locator('#central-login button').click();
   await p.locator('#central-navigation').waitFor({state:'attached'});
   await p.locator('[data-guide-dismiss]').evaluateAll(es=>es.forEach(e=>e.click()));
   assert(await p.locator('#central-navigation').count()===1,'Navegação autenticada presente');
   await capture(p,(role==='ronda'?'vigia':'vistoriador')+'-'+width);
   await c.close();
  }
 }
 for(const role of ['ronda','vistoriador']){const{c,p}=await context(393,852);await p.goto(base+'/central.html');await p.locator('#central-login [name=email]').fill(role+'@example.test');await p.locator('#central-login [name=password]').fill(password);await p.locator('#central-login button').click();await p.locator('#central-navigation').waitFor({state:'attached'});await p.locator('[data-guide-dismiss]').evaluateAll(es=>es.forEach(e=>e.click()));await capture(p,role+'-authenticated');
  if(role==='ronda'){
   const emergency=p.locator('#central-panic');assert(await emergency.isVisible(),'Pânico global deve estar visível no celular');await emergency.click({timeout:4000});await p.locator('#central-panic-dialog[open]').waitFor();await p.locator('#panic-cancel').click();
    assert(await p.locator('.rp-guard-quick-panel [data-field-tool-chat]').count()===0,'Mensagens não deve ocupar o cartão do vigia');await p.locator('[data-chat-open-quick]').click();await p.locator('#rp-field-chat-overlay[open]').waitFor();assert(await p.locator('#chat-body:visible').count()===0,'Authenticated composer hidden in list');await p.locator('[data-chat-new]').click();await p.locator('#chat-dialog label').filter({hasText:'Mariana'}).locator('input[type=checkbox]').check();await p.locator('[data-chat-create] button[type=submit]').click();await p.locator('#chat-body').fill('Revisão autenticada com anexo.');await p.locator('[data-chat-attachment]').setInputFiles({name:'revisao.txt',mimeType:'text/plain',buffer:Buffer.from('Arquivo sintético de revisão visual.')});await p.locator('[data-chat-compose] [type=submit]').click();await p.locator('[data-chat-thread]').getByText('Revisão autenticada com anexo.',{exact:true}).waitFor();await p.locator('[data-chat-download]').waitFor();assert(await p.locator('[data-chat-attachment]').evaluate(n=>getComputedStyle(n).opacity)==='0','Native file selector must be visually integrated');const composer=await p.locator('[data-chat-compose]').boundingBox();assert(composer.height<200,'Authenticated composer must remain compact');await capture(p,'vigia-authenticated-chat');
   const ct=(await api('/login',null,{email:'coi@example.test',password})).token;const conversations=(await api('/chat/conversations',ct)).conversations;assert(conversations.some(c=>c.last?.body==='Revisão autenticada com anexo.'),'COI receives authenticated field message');await p.locator('.rp-chat-grip').click();
   await p.locator('[data-page="history"]').first().evaluate(n=>n.click());await p.locator('.rp-field-page-overlay').waitFor();assert(await p.locator('#guard-real-map').count()===1,'Live map remains behind history');await capture(p,'vigia-history-overlay');
  }
  await c.close()}
 assert(errors.length===0,'JavaScript: '+errors.join('; '));console.log(JSON.stringify({results,errors}));
}finally{writeFileSync(out+'/review.json',JSON.stringify({results,errors},null,2));await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true})}
