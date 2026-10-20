/** Authenticated responsive review. All accounts and events live in an isolated disposable SQLite database. */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../server.js';

const temp=mkdtempSync(join(tmpdir(),'rp-responsive-'));
const output='artifacts/responsive-management';
mkdirSync(output,{recursive:true});
process.env.RONDA_PRO_DB_PATH=join(temp,'test.sqlite');
process.env.RONDA_PRO_MASTER_EMAIL='responsive-master@example.test';
process.env.RONDA_PRO_MASTER_PASSWORD='ResponsiveMaster2026!!';

const server=createAppServer();
const issues=[],measurements=[];
let browser;
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const widths=[320,360,393,768,1024,1440];
const pages={
  coi:['monitor','treatments','dispatches','notifications','routes','events','team','alerts','export','chat','activity-history'],
  admin:['dashboard','monitor','treatments','dispatches','notifications','permissions','routes','events','team','alerts','export','chat','activity-history']
};

try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const base='http://127.0.0.1:'+server.address().port;
 const api=async(path,token,data)=>{
   const response=await fetch(base+'/api'+path,{
     method:data?'POST':'GET',
     headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},
     body:data?JSON.stringify(data):undefined
   });
   const json=await response.json();
   assert(response.ok,path+': '+JSON.stringify(json));
   return json;
 };
 const master=(await api('/login',null,{
   email:process.env.RONDA_PRO_MASTER_EMAIL,password:process.env.RONDA_PRO_MASTER_PASSWORD
 })).token;
 const password='ResponsiveReview2026!!';
 for(const [role,name] of [['coi','COI Responsivo'],['admin','Administracao Responsiva'],['ronda','Colaborador Teste']]){
   await api('/users',master,{role,name,email:role+'@example.test',password,site:'Unidade Centro',description:'Teste visual isolado'});
 }
 const guard=(await api('/login',null,{email:'ronda@example.test',password})).token;
 await api('/events',guard,{kind:'incident',occurredAt:Date.now(),description:'Evento sintético para validar lista e tratativas em tamanhos diferentes.'});
 browser=await chromium.launch({
   headless:true,
   executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),
   args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']
 });
 async function visit(p,target,width){
   const nav=p.locator('#central-navigation');
   if(width<=900){
     const menu=p.locator('[data-central-menu]').first();
     await menu.click();
     assert(await nav.evaluate(n=>n.classList.contains('is-open')),'O menu não abriu em '+width+'px');
   }
   const item=nav.locator('[data-page="'+target+'"]').first();
   if(!await item.isVisible()){
     const details=nav.locator('.rp2-nav-secondary');
     if(await details.count()&&!await details.evaluate(n=>n.open))await details.locator('summary').click();
   }
   await item.click();
   await p.waitForFunction(key=>!!document.querySelector('#central-navigation [data-page="'+key+'"].active'),target,{timeout:15000});
 }
 async function measure(p,role,target,width){
   const data=await p.evaluate(()=>{
     const html=document.documentElement;
     const app=document.querySelector('#central-root .content');
     const viewport=window.innerWidth;
     const overflow=Math.max(0,Math.ceil(html.scrollWidth-html.clientWidth));
     const width=app?.getBoundingClientRect().width||0;
     const wide=[...document.querySelectorAll('#central-root .content *')]
       .filter(el=>{const b=el.getBoundingClientRect(),style=getComputedStyle(el);return style.display!=='none'&&b.width>0&&b.right>viewport+4&&style.position!=='fixed'})
       .slice(0,6).map(el=>({selector:el.tagName.toLowerCase()+'.'+String(el.className||'').trim().replace(/\\s+/g,'.').slice(0,70),right:Math.round(el.getBoundingClientRect().right)}));
     return {overflow,contentWidth:Math.round(width),wide};
   });
   measurements.push({role,target,width,...data});
   if(data.overflow>2)issues.push({role,target,width,issue:'horizontal-overflow',...data});
 }
 for(const role of ['coi','admin']){
   for(const width of widths){
     const context=await browser.newContext({viewport:{width,height:852},locale:'pt-BR',reducedMotion:'reduce'});
     const page=await context.newPage();
     page.on('pageerror',error=>issues.push({role,width,issue:'script-error',message:error.message}));
     await page.route('https://**/*',route=>route.abort());
     try{
       await page.goto(base+'/central.html',{waitUntil:'domcontentloaded'});
       await page.locator('#central-login [name=email]').fill(role+'@example.test');
       await page.locator('#central-login [name=password]').fill(password);
       await page.locator('#central-login button').click();
       await page.locator('#central-navigation').waitFor({state:'attached',timeout:15000});
       await page.locator('[data-guide-dismiss]').evaluateAll(nodes=>nodes.forEach(node=>node.click()));
       if(width<=900){
         const trigger=page.locator('[data-central-menu]').first();
         await trigger.click();
         assert(await page.locator('#central-navigation.is-open .rp2-nav-dismiss').isVisible(),'Falta fechar no menu');
         await page.keyboard.press('Escape');
         assert(!(await page.locator('#central-navigation').evaluate(node=>node.classList.contains('is-open'))),'Escape não recolheu menu');
         assert(await trigger.getAttribute('aria-expanded')==='false','Estado de menu incorreto');
       }
       const targets=(width===393||width===1440)?pages[role]:(role==='coi'?['monitor','notifications','dispatches','chat']:['dashboard','monitor','team','export']);
       const initial=role==='coi'?'monitor':'dashboard';
       await measure(page,role,initial,width);
       await page.screenshot({path:output+'/'+role+'-'+width+'-'+initial+'.png',fullPage:true});
       for(const target of targets){
         if(target===initial)continue;
         try{
           await visit(page,target,width);
           if(width===1440){
             const position=await page.evaluate(()=>{
               const top=document.querySelector('header.top')?.getBoundingClientRect();
               const context=document.querySelector('#central-root .rp2-contextbar')?.getBoundingClientRect();
               const head=document.querySelector('#central-root .chat-page .toolbar')?.getBoundingClientRect();
               return {scroll:window.scrollY,top:top?.top,topBottom:top?.bottom,contextTop:context?.top,chatTop:head?.top};
             });
             assert(position.scroll<=2,role+'/'+target+' retained old page scroll: '+JSON.stringify(position));
             assert(position.top>=-2&&position.top<=2,role+'/'+target+' header detached: '+JSON.stringify(position));
             assert(position.contextTop>=position.topBottom-2,role+'/'+target+' context overlaps header: '+JSON.stringify(position));
             if(target==='chat')assert(position.chatTop>=position.contextTop+20,role+' chat toolbar covered by context: '+JSON.stringify(position));
           }
           if(target==='chat'&&(width===393||width===1440)){
             await page.locator('.chat-list-empty').waitFor({state:'visible',timeout:8000});
             assert(await page.locator('.chat-list-empty').getByText('Nenhuma conversa por aqui').isVisible(),role+' chat vazio sem instrução legível em '+width+'px');
           }
           await measure(page,role,target,width);
           if(width===393||width===1440)await page.screenshot({path:output+'/'+role+'-'+width+'-'+target+'.png',fullPage:true});
         }catch(error){issues.push({role,target,width,issue:'navigation',message:error.message});}
       }
     }catch(error){issues.push({role,width,issue:'scenario',message:error.message});}
     finally{await context.close();}
   }
 }
 writeFileSync(output+'/results.json',JSON.stringify({measurements,issues},null,2));
 console.log(JSON.stringify({screenChecks:measurements.length,issues:issues.slice(0,35)},null,2));
 assert(!issues.length,issues.length+' falhas de interface responsiva');
}finally{
 if(!issues.length&&measurements.length)writeFileSync(output+'/results.json',JSON.stringify({measurements,issues},null,2));
 await browser?.close();
 server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
 rmSync(temp,{recursive:true,force:true});
}
