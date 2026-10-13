import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const axePath=require.resolve('axe-core/axe.min.js');
const folder='artifacts/accessibility',port=8191;
mkdirSync(folder,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bin=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
async function check(page,label,width){
 await page.addScriptTag({path:axePath});
 const violations=await page.evaluate(async()=>{
  const x=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
  return x.violations.map(v=>({id:v.id,impact:v.impact,description:v.help,nodes:v.nodes.slice(0,9).map(n=>({target:n.target,summary:n.failureSummary?.slice(0,250)})),count:v.nodes.length}));
 });
 results.push({width,label,violations,count:violations.reduce((n,v)=>n+v.count,0)});
}
async function click(page,selector){await page.locator(selector).first().click({timeout:7000});await sleep(120);}
try{
 await sleep(800);
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:850},isMobile:width<500,hasTouch:width<500,locale:'pt-BR',reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded',timeout:13000});
  await check(page,'01-entrada',width);
  await click(page,'[data-action="login"]:visible');
  await check(page,'02-seletor-perfil',width);
  await page.locator('#login-form input[name="role"][value="ronda"]').check();
  await click(page,'#login-form button[type="submit"]');
  await sleep(580);
  if(await page.locator('#horizon-tour [data-tour="close"]').count())await click(page,'#horizon-tour [data-tour="close"]');
  await check(page,'03-ronda',width);
  if(width<=900){
   await click(page,'[data-action="profile-menu"]');
   await click(page,'#dialog [data-action="logout"]');
  }else await click(page,'[data-action="logout"]');
  await click(page,'[data-action="login"]:visible');
  await page.locator('#login-form input[name="role"][value="supervisor"]').check();
  await click(page,'#login-form button[type="submit"]');
  await sleep(580);
  if(await page.locator('#horizon-tour [data-tour="close"]').count())await click(page,'#horizon-tour [data-tour="close"]');
  await check(page,'04-supervisao',width);
  if(width<=900)await click(page,'[data-action="open-mobile-menu"]');
  await page.locator(width<=900?'#dialog [data-view="rondas"]':'.sidebar [data-view="rondas"]').click();
  await check(page,'04b-agenda',width);
  const nav=key=>page.locator(width<=900?'#dialog [data-view="'+key+'"]':'.sidebar [data-view="'+key+'"]').first();
  if(width<=900)await click(page,'[data-action="open-mobile-menu"]');
  await nav('notificacoes').click();
  await sleep(140);
  await check(page,'05-alertas',width);
  if(width<=900){
   await click(page,'[data-action="open-mobile-menu"]');
   await click(page,'#dialog [data-view="relatorios"]');
  }else await nav('relatorios').click();
  await sleep(140);
  await check(page,'06-relatorios',width);
  await context.close();
 }
}finally{await browser.close();server.kill('SIGTERM');}
const lines=[
 '# Auditoria axe-core de acessibilidade',
 'Executada: '+new Date().toISOString(),
 '',
 '| Largura | Estado | Ocorrências automáticas | Impactos críticos/sérios |',
 '|---:|---|---:|---:|',
 ...results.map(r=>'|'+r.width+'|'+r.label+'|'+r.count+'|'+r.violations.filter(v=>['critical','serious'].includes(v.impact)).reduce((n,v)=>n+v.count,0)+'|'),
 '',
 'A análise automatizada não substitui inspeção humana/TalkBack, nem prova conformidade WCAG.',
 'Corrigir os problemas severos da interface antes de entregar a operação.'
];
writeFileSync(folder+'/report.json',JSON.stringify(results,null,2));
writeFileSync(folder+'/summary.md',lines.join('\n'));
console.log(JSON.stringify({checks:results.length,found:results.reduce((n,x)=>n+x.count,0),criticalSerious:results.reduce((n,r)=>n+r.violations.filter(v=>['critical','serious'].includes(v.impact)).reduce((a,v)=>a+v.count,0),0)}));
