import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.TARGET_URL||'https://maxvel.hzsys.tech';
const browser=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
mkdirSync('/opt/ronda-pro-elite-v3/artifacts/coi-inspection',{recursive:true});
try{
 for(const [width,height] of [[320,568],[360,800],[393,852],[412,915]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,locale:'pt-BR'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.locator('#central-login [name=email]').fill(process.env.COI_TEST_EMAIL||'coi@rondapro.local');
  await page.locator('#central-login [name=password]').fill(process.env.COI_TEST_PASSWORD||'');
  await page.locator('#central-login button').click();
  await page.locator('[data-inspection-queue]').click();
  const modal=page.locator('#ops-inspector-modal');
  await modal.waitFor({state:'visible'});
  const map=page.locator('#ops-inspection-plan-map.leaflet-container');
  await map.waitFor();
  await map.scrollIntoViewIfNeeded();
  await map.click({position:{x:100,y:100}});
  await page.waitForFunction(()=>JSON.parse(document.querySelector('[name=inspectionStops]').value).length===1);
  await map.click({position:{x:160,y:170}});
  await page.waitForFunction(()=>JSON.parse(document.querySelector('[name=inspectionStops]').value).length===2);
  assert.equal(await page.locator('[data-inspection-stops] li').count(),2);
  await page.locator('[aria-label="Remover local 1"]').click();
  assert.equal(await page.locator('[data-inspection-stops] li').count(),1);
  await map.scrollIntoViewIfNeeded();await map.click({position:{x:90,y:190}});
  const selected=JSON.parse(await page.locator('[name=inspectionStops]').inputValue());
  assert.equal(selected.length,2);
  assert.ok(selected.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)));
  const metrics=await modal.evaluate(e=>({width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}));
  assert.ok(metrics.width<=width&&metrics.scroll<=metrics.client+1,'modal sem overflow horizontal');
  await map.scrollIntoViewIfNeeded();
  await page.screenshot({path:'/opt/ronda-pro-elite-v3/artifacts/coi-inspection/map-'+width+'.png'});
  await page.locator('[data-ops-map-clear]').click();
  assert.equal(await page.locator('[data-inspection-stops] li').count(),0);
  await modal.locator('[data-ops-close-inspector]').last().click();
  await page.locator('[data-ops-new-inspection]').click();
  await page.locator('#ops-inspection-plan-map.leaflet-container').waitFor();
  assert.equal(await page.locator('[data-inspection-stops] li').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,height,homepageOpensMap:true,multiplePoints:true,removeAndClear:true,reopen:true,errors}));
  await page.close();
 }
}finally{await browser.close();}
