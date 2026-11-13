import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';

async function testArrive() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: {width: 412, height: 915},
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    geolocation: {latitude: -20.1446, longitude: -44.8912, accuracy: 10},
    permissions: ['geolocation']
  });

  const page = await context.newPage();
  
  await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});
  await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
  await page.locator('#central-login [name=password]').fill('Maxvel@2026');
  await page.locator('#central-login button').click();
  await page.waitForSelector('#guard-real-map');
  await page.waitForTimeout(1000);

  console.log('1. Page loaded. Clicking [data-guard-start]...');
  const startBtn = page.locator('[data-guard-start]');
  if (await startBtn.count() > 0 && await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log('2. Checking if [data-guard-arrive] is visible...');
  const arriveBtn = page.locator('[data-guard-arrive]');
  const isArriveVisible = await arriveBtn.isVisible();
  console.log('Is [data-guard-arrive] visible?', isArriveVisible);

  if (isArriveVisible) {
    console.log('3. Clicking [data-guard-arrive] ("Estou aqui")...');
    await arriveBtn.click();
    await page.waitForTimeout(600);

    const alertInfo = await page.evaluate(() => {
      const notice = document.querySelector('#notice');
      const rect = notice ? notice.getBoundingClientRect() : null;
      return {
        text: notice ? notice.innerText : null,
        visible: notice ? notice.classList.contains('visible') : false,
        top: rect ? rect.top : null,
        left: rect ? rect.left : null,
        width: rect ? rect.width : null,
        height: rect ? rect.height : null,
        computedDisplay: notice ? window.getComputedStyle(notice).display : null,
        zIndex: notice ? window.getComputedStyle(notice).zIndex : null
      };
    });
    console.log('Alert Info after "Estou aqui":', JSON.stringify(alertInfo, null, 2));

    await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/screen_arrive_alert.png'});
  }

  await browser.close();
}

testArrive().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
