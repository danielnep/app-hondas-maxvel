/** Visual acceptance: fictitious COI -> address route -> chosen Vigia, Pages-test API only.
 * No production tokens, no actual backend calls, no fabricated GPS tracking.
 */
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {extname,resolve} from 'node:path';

const root=resolve('.'),output='artifacts/route-planner-qa',origin='https://ronda-pro-production.up.railway.app';
mkdirSync(output,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const addresses={
 Maxvel:{name:'Grupo Maxvel (local ilustrativo)',street:'Av. Primeiro de Junho',housenumber:'100',city:'Divinópolis',state:'Minas Gerais',coordinates:[-44.880,-20.142]},
 Shopping:{name:'Shopping (local ilustrativo)',street:'Av. JK',housenumber:'450',city:'Divinópolis',state:'Minas Gerais',coordinates:[-44.882,-20.145]},
 Portaria:{name:'Portaria (local ilustrativo)',street:'Rua Exemplo',housenumber:'20',city:'Divinópolis',state:'Minas Gerais',coordinates:[-44.884,-20.147]}
};
let browser;
function check(ok,message){if(!ok)throw Error(message)}
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [393,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===393?852:900},locale:'pt-BR',serviceWorkers:'block'});
  const p=await ctx.newPage(),errors=[],backend=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin){
    if(url.pathname.startsWith('/api/')){backend.push(url.pathname);return route.abort();}
    const relative=url.pathname.slice(1)||'index.html',file=resolve(root,relative);
    if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:'Not Found'});
    return route.fulfill({path:file,contentType:types[extname(file)]||'application/octet-stream'});
   }
   if(url.hostname==='photon.komoot.io'){
    const q=url.searchParams.get('q')||'';
    const found=Object.entries(addresses).find(([k])=>q.toLowerCase().includes(k.toLowerCase()))?.[1]||addresses.Maxvel;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{name:found.name,street:found.street,housenumber:found.housenumber,city:found.city,state:found.state},geometry:{type:'Point',coordinates:found.coordinates}}]})});
   }
   // External raster/CDN may be unavailable on isolated CI. Keep browser QA deterministic.
   return route.abort();
  });
  try{
   await p.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await p.locator('#dialog .role-picker-list [data-role="coi"]').click();
   if(width<=900){
    await p.locator('[data-action="open-mobile-menu"]').click();
    await p.locator('#dialog [data-view="rondas"]').click();
   }else await p.locator('.sidebar [data-view="rondas"]').click();
   await p.locator('#rp-plan').waitFor();
   check((await p.locator('#rp-plan .rp-plan-steps button').count())===3,'Etapas ausentes');
   check((await p.locator('#rp-plan-worker option').count())===3,'Não encontrou exatamente três vigias fictícios');
   await p.locator('#rp-plan-name').fill('Ronda teste Divinópolis');
   async function add(q){
    await p.locator('#rp-plan-query').fill(q);
    const suggestion=p.locator('#rp-plan-suggestions [data-action="rp-plan-pick"]').first();
    await suggestion.waitFor({timeout:12000});
    await suggestion.click();
   }
   await add('Maxvel');await add('Shopping');await add('Portaria');
   check((await p.locator('#rp-plan .rp-plan-stop').count())===3,'Três endereços não ficaram numerados');
   await p.screenshot({path:output+'/coi-address-'+width+'.png',animations:'disabled'});
   await p.locator('[data-action="rp-plan-next"]').click();
   await p.locator('#rp-plan-repeat').selectOption('alternate');
   await p.locator('#rp-plan-date').fill('2026-10-20');
   await p.locator('#rp-plan-hour').fill('07:30');
   await p.screenshot({path:output+'/coi-schedule-'+width+'.png',animations:'disabled'});
   await p.locator('[data-action="rp-plan-next"]').click();
   await p.locator('.rp-plan-save').click();
   await p.waitForFunction(()=>{const raw=localStorage.getItem('ronda-pro-pages-test-v2:routes');return !!raw&&JSON.parse(raw).some(r=>r.name==='Ronda teste Divinópolis');});
   await p.locator('.user-profile-button').click();
   await p.locator('#dialog [data-action="sim-role-picker"]').click();
   await p.locator('#dialog [data-role="ronda"]').click();
   await p.locator('#dialog [data-username="vigia-demo-lucas"]').click();
   await p.locator('.patrol-map-heading').getByText('Ronda teste Divinópolis').waitFor({timeout:12000});
   await p.screenshot({path:output+'/vigia-route-'+width+'.png',animations:'disabled'});
   const measured=await p.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,hasDemo:!!document.querySelector('.rp-demo-banner-global')}));
   check(measured.doc<=measured.width+3,'Rolagem horizontal: '+JSON.stringify(measured));
   check(measured.hasDemo,'Aviso de demonstração ausente');
   check(backend.length===0,'Chamou produção: '+backend);
   check(errors.length===0,'Erros de JS: '+errors.join(' | '));
   console.log(JSON.stringify({width,role:'COI -> Vigia fictício',steps:3,addresses:3,backend:0,errors:0}));
  }finally{await ctx.close()}
 }
}finally{await browser?.close()}
