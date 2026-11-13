import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';

async function testInteractivity() {
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

  console.log('--- TEST 1: HEADER & LOGO ---');
  const headerBrand = await page.evaluate(() => {
    const brand = document.querySelector('.rp-agent-brand');
    const logoImg = brand ? brand.querySelector('img') : null;
    return {
      brandHTML: brand ? brand.innerHTML : 'NOT FOUND',
      logoSrc: logoImg ? logoImg.src : null,
      logoWidth: logoImg ? logoImg.clientWidth : null,
      logoHeight: logoImg ? logoImg.clientHeight : null
    };
  });
  console.log('Header Brand:', JSON.stringify(headerBrand, null, 2));

  console.log('--- TEST 2: MENU OPEN & TOUCH BLOCKING ---');
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(500);

  const hitElement = await page.evaluate(() => {
    const el = document.elementFromPoint(100, 220);
    return {
      tag: el ? el.tagName : null,
      class: el ? el.className : null,
      text: el ? el.innerText : null,
      id: el ? el.id : null,
      outerHTML: el ? el.outerHTML.slice(0, 100) : null
    };
  });
  console.log('Element at (100, 220):', JSON.stringify(hitElement, null, 2));

  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/screen_01_menu_open.png'});

  console.log('--- TEST 3: CLICKING MENU ITEMS ---');
  // Click Minha Ronda
  const minhaRondaBtn = page.locator('.rp-agent-side-menu button:has-text("Minha Ronda")');
  console.log('Clicking Minha Ronda button...');
  await minhaRondaBtn.click();
  await page.waitForTimeout(500);

  const notice1 = await page.evaluate(() => {
    const n = document.querySelector('#notice');
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return {
      text: n.innerText,
      top: r.top,
      display: window.getComputedStyle(n).display,
      zIndex: window.getComputedStyle(n).zIndex
    };
  });
  console.log('Notice after Minha Ronda:', JSON.stringify(notice1, null, 2));

  console.log('--- TEST 4: CLICKING + NOVA RONDA ---');
  const novaRondaBtn = page.locator('button:has-text("+ Nova Ronda")');
  console.log('Clicking + Nova Ronda button...');
  await novaRondaBtn.click();
  await page.waitForTimeout(500);

  const notice2 = await page.evaluate(() => {
    const n = document.querySelector('#notice');
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return {
      text: n.innerText,
      top: r.top,
      display: window.getComputedStyle(n).display,
      zIndex: window.getComputedStyle(n).zIndex
    };
  });
  console.log('Notice after + Nova Ronda:', JSON.stringify(notice2, null, 2));

  console.log('--- TEST 5: BOTTOM SHEET & ACTIONS ---');
  const sheetState = await page.evaluate(() => {
    const sheet = document.querySelector('.rp-guard-bottom-sheet');
    const startBtn = document.querySelector('[data-guard-start]');
    const arriveBtn = document.querySelector('[data-guard-arrive]');
    const checkpointBtn = document.querySelector('[data-guard-checkpoint]');
    const finishBtn = document.querySelector('[data-guard-finish]');
    const mainActionBtn = document.querySelector('.rp-inspection-main-action');
    return {
      sheetFound: !!sheet,
      sheetClass: sheet ? sheet.className : null,
      startVisible: startBtn ? window.getComputedStyle(startBtn).display !== 'none' : false,
      arriveVisible: arriveBtn ? window.getComputedStyle(arriveBtn).display !== 'none' : false,
      checkpointVisible: checkpointBtn ? window.getComputedStyle(checkpointBtn).display !== 'none' : false,
      finishVisible: finishBtn ? window.getComputedStyle(finishBtn).display !== 'none' : false,
      mainActionText: mainActionBtn ? mainActionBtn.innerText : null,
      mainActionClass: mainActionBtn ? mainActionBtn.className : null
    };
  });
  console.log('Sheet State:', JSON.stringify(sheetState, null, 2));

  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/screen_02_bottom_sheet.png'});

  // Click the main action button ("Iniciar Rota de Ronda")
  console.log('Clicking Main Action in sheet...');
  const mainBtn = page.locator('.rp-guard-bottom-sheet .rp-inspection-main-action, [data-guard-start]');
  if (await mainBtn.count() > 0) {
    await mainBtn.first().click();
    await page.waitForTimeout(600);
  }

  const sheetStateAfterStart = await page.evaluate(() => {
    const mainActionBtn = document.querySelector('.rp-inspection-main-action');
    const arriveBtn = document.querySelector('[data-guard-arrive]');
    const notice = document.querySelector('#notice');
    return {
      mainActionText: mainActionBtn ? mainActionBtn.innerText : null,
      arriveVisible: arriveBtn ? window.getComputedStyle(arriveBtn).display !== 'none' : false,
      noticeText: notice ? notice.innerText : null,
      noticeTop: notice ? notice.getBoundingClientRect().top : null
    };
  });
  console.log('Sheet State After Start:', JSON.stringify(sheetStateAfterStart, null, 2));

  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/screen_03_after_start.png'});

  // If arrive button is visible, click it ("Estou aqui")
  const arriveBtn = page.locator('[data-guard-arrive]');
  if (await arriveBtn.count() > 0 && await arriveBtn.first().isVisible()) {
    console.log('Clicking "Estou aqui" button...');
    await arriveBtn.first().click();
    await page.waitForTimeout(600);

    const noticeAfterArrive = await page.evaluate(() => {
      const notice = document.querySelector('#notice');
      return {
        text: notice ? notice.innerText : null,
        top: notice ? notice.getBoundingClientRect().top : null,
        visible: notice ? window.getComputedStyle(notice).display !== 'none' : false,
        zIndex: notice ? window.getComputedStyle(notice).zIndex : null
      };
    });
    console.log('Notice After Arrive:', JSON.stringify(noticeAfterArrive, null, 2));
    await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/screen_04_after_arrive.png'});
  }

  await browser.close();
}

testInteractivity().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
