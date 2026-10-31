import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.RP_PLAYWRIGHT_MODULE?pathToFileURL(process.env.RP_PLAYWRIGHT_MODULE).href:'playwright');
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {createAppServer} from '../server.js';
const temp=mkdtempSync('/tmp/ronda-verification-browser-'),out=process.env.RP_QA_OUTPUT||'/tmp/ronda-verification-browser-results';mkdirSync(out,{recursive:true});
process.env.RONDA_PRO_DB_PATH=temp+'/qa.sqlite';process.env.RONDA_PRO_MASTER_EMAIL='master@browser.test';process.env.RONDA_PRO_MASTER_PASSWORD='VerificationBrowser_2026!';
delete process.env.RONDA_PRO_PILOT_PASSWORD;delete process.env.RONDA_PRO_INITIAL_ACCOUNTS;
let server=createAppServer(),browser;await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port;
const api=async(path,token,data,method)=>{const res=await fetch(base+'/api'+path,{method:method||(data?'POST':'GET'),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const body=await res.json();assert(res.ok,JSON.stringify(body));return body;};
const results=[];
try{
 const master=(await api('/login',null,{email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD})).token;
 const password='TeamVerification_2026!';
 const admin=await api('/users',master,{name:'Admin QA',email:'admin@browser.test',username:'admin',role:'admin',password,site:'Grupo Maxvel'});
 const worker=await api('/users',master,{name:'Agente QA',email:'ronda@browser.test',username:'ronda',role:'ronda',password,site:'Grupo Maxvel'});
 const points=[{name:'Praça do Santuário',address:'Divinópolis',lat:-20.1429457,lng:-44.8904539},{name:'Restaurante Catedral',address:'Divinópolis',lat:-20.1388762,lng:-44.8850088}];
 await api('/routes',master,{name:'Locais reais para revisão de interface',userId:worker.id,points});
 browser=await chromium.launch({headless:true,executablePath:process.env.RP_CHROME_BIN||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#live-login-form [name=identifier]').fill('admin');await page.locator('#live-login-form [name=password]').fill(password);await page.locator('#live-login-form button').click();await page.locator('.dashboard').waitFor();
 await page.locator('[data-action="open-mobile-menu"]').click();await page.locator('#dialog [data-view="configuracoes"]').click();
 assert.equal(await page.locator('#verification-settings-form').count(),1);
 for(const mode of ['qr','gps+qr','gps']){
  await page.locator('#verification-settings-form [name=verificationMode]').selectOption(mode);
  const changed=page.waitForResponse(r=>r.url().endsWith('/api/operational-settings')&&r.request().method()==='PUT');
  await page.locator('#verification-settings-form button[type=submit]').click();assert.equal((await changed).status(),200);
 }
 await page.screenshot({path:out+'/settings-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await page.locator('#verification-qr-form button').click();await page.locator('[data-verification-qr-labels] img').first().waitFor();assert.equal(await page.locator('[data-verification-qr-labels] img').count(),2);
 await page.screenshot({path:out+'/labels-mobile.png',fullPage:true});
 results.push({surface:'app settings',viewport:'360x800',modes:3,qrLabels:2,errors});assert.deepEqual(errors,[]);
 // A segunda entrada administrativa usa a mesma regra persistida.
 const desktop=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),central=await desktop.newPage();
 await central.goto(base+'/');await central.locator('#central-login [name=email]').fill('admin');await central.locator('#central-login [name=password]').fill(password);await central.locator('#central-login button').click();await central.locator('#central-navigation').waitFor();
 const secondary=central.locator('.rp2-nav-secondary');if(await secondary.count()&&!await secondary.evaluate(node=>node.open))await secondary.locator('summary').click();
 await central.locator('#central-navigation [data-page=permissions]').click();await central.locator('#verification-settings-form').waitFor();
 await central.locator('#verification-settings-form [name=verificationMode]').selectOption('qr');
 const changed=central.waitForResponse(r=>r.url().endsWith('/api/operational-settings')&&r.request().method()==='PUT');await central.locator('#verification-settings-form button[type=submit]').click();assert.equal((await changed).status(),200);
 await central.screenshot({path:out+'/settings-desktop.png',fullPage:true});results.push({surface:'central settings',viewport:'1440x900',saved:'qr'});
 // A conta de ronda recebe QR na entrada e recebe nova regra por sincronização, sem GPS fabricado.
 const field=await browser.newContext({viewport:{width:412,height:830},isMobile:true,hasTouch:true,serviceWorkers:'block'}),phone=await field.newPage();
 await phone.goto(base+'/index.html');await phone.locator('#live-login-form [name=identifier]').fill('ronda');await phone.locator('#live-login-form [name=password]').fill(password);await phone.locator('#live-login-form button').click();await phone.locator('.dashboard').waitFor();
 assert.equal(await phone.locator('[data-action=mode-simulation]').count(),0);
 assert.match(await phone.locator('.patrol-stage-intro').innerText(),/QR Code por ponto/);
 const next=phone.waitForResponse(async res=>res.url().endsWith('/api/operational-settings')&&res.request().method()==='GET'&&(await res.json()).settings.verificationMode==='gps+qr',{timeout:22000});
 await api('/operational-settings',master,{verificationMode:'gps+qr',dwellSeconds:30},'PUT');await next;
 await phone.waitForFunction(()=>document.querySelector('.patrol-stage-intro')?.textContent.includes('GPS + 30 s + QR Code'),null,{timeout:3000});
 results.push({surface:'field policy',receivedAtLogin:'qr',receivedByPolling:'gps+qr',syntheticGps:false});
 // Verifica a cortina QR sem inventar posição ou tempo de GPS.
 const curtainPage=await desktop.newPage();await curtainPage.route('**/qa-qr-curtain',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/assets/theme.css"></head><body></body></html>'}));await curtainPage.goto(base+'/qa-qr-curtain');
 const outcome=await curtainPage.evaluate(async points=>{
  const {createCheckpointCurtain}=await import('/src/checkpoint-curtain.js');const {createSession}=await import('/src/domain.js');
  const route={id:'qa-qr-round',name:'Conferência de QR',base:points[0],points:points.map((p,i)=>({...p,id:'p'+i,radius:25})),rules:{verificationMode:'qr',dwellMs:30000,blockOnDeviation:false}},session=createSession('QA',route,Date.now(),'real');
  session.checkpoints[0].qrVerifiedAt=Date.now();session.insideSince=null;let recorded=0;
  const curtain=createCheckpointCurtain({get:()=>({session,user:{role:'ronda'},view:'minha-ronda',locationFix:null}),recordCheckpoint:async()=>{recorded++},save:()=>{},render:()=>{},notify:()=>{}});curtain.open();
  const button=document.querySelector('[data-curtain-submit]'),visible=!!button&&!button.disabled,clockHidden=document.querySelector('.checkpoint-stopwatch').hidden;
  button.click();await new Promise(ok=>setTimeout(ok,30));return {visible,clockHidden,index:session.index,recorded,insideSince:session.insideSince};
 },points);
 assert.deepEqual(outcome,{visible:true,clockHidden:true,index:1,recorded:1,insideSince:null});results.push({surface:'QR checkpoint without GPS clock',outcome});
 console.log(JSON.stringify(results));writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
 await context.close();await desktop.close();await field.close();
}finally{await browser?.close();server.closeAllConnections();await new Promise(ok=>server.close(ok));rmSync(temp,{recursive:true,force:true});}
