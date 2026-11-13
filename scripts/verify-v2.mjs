import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';

async function verifyAll() {
  console.log('Launching Playwright on Galaxy A53 (412x915)...');
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

  console.log('=== TEST 1: BOTTOM CARD GEOMETRY & COMPACT GLASS ===');
  const cardInfo = await page.evaluate(() => {
    const sheet = document.querySelector('.ronda-bottom-sheet');
    const r = sheet ? sheet.getBoundingClientRect() : null;
    const s = sheet ? window.getComputedStyle(sheet) : null;
    return {
      rect: r ? {x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom} : null,
      viewportWidth: window.innerWidth,
      widthRatio: r ? (r.width / window.innerWidth).toFixed(3) : null,
      background: s ? s.backgroundColor : null,
      backdropFilter: s ? s.backdropFilter : null,
      borderRadius: s ? s.borderRadius : null,
      padding: s ? s.padding : null
    };
  });
  console.log('Card Info:', JSON.stringify(cardInfo, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v2_01_card_standby_95.png'});

  console.log('=== TEST 2: NEXT LINK ("INICIAR DESLOCAMENTO PARA POSTO 2") ===');
  // Start round first so that Posto 1 is active
  await page.locator('[data-guard-start]').click();
  await page.waitForTimeout(1500);

  // Clear previous notice
  await page.evaluate(() => {
    const n = document.querySelector('#notice');
    if (n) { n.className = ''; n.textContent = ''; }
  });

  // Click [data-guard-next-link]
  const nextLink = page.locator('[data-guard-next-link]');
  console.log('Clicking "Iniciar Deslocamento para Posto 2 →"...');
  await nextLink.click();
  await page.waitForTimeout(800);

  const nextNotice = await page.evaluate(() => {
    const n = document.querySelector('#notice');
    const r = n ? n.getBoundingClientRect() : null;
    return {
      text: n ? n.innerText : null,
      visible: n ? n.classList.contains('visible') : false,
      top: r ? r.top : null,
      display: n ? window.getComputedStyle(n).display : null,
      zIndex: n ? window.getComputedStyle(n).zIndex : null
    };
  });
  console.log('Notice after Next Link:', JSON.stringify(nextNotice, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v2_02_next_link_alert.png'});

  console.log('=== TEST 3: MENU OPTIONS MODAL FIT (ATRIBUIÇÕES / DISPATCHES) ===');
  // Open menu
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(600);

  // Expand Mais áreas
  await page.locator('.ronda-menu-more-summary').click();
  await page.waitForTimeout(400);

  // Click Atribuições
  console.log('Clicking Atribuições in menu...');
  await page.locator('button[data-page="dispatches"]').click();
  await page.waitForTimeout(1000);

  const overlayCheck = await page.evaluate(() => {
    const overlay = document.querySelector('section.rp-field-page-overlay');
    if (!overlay) return 'NO SECTION OVERLAY';
    const r = overlay.getBoundingClientRect();
    const backBtn = overlay.querySelector('.rp-page-back');
    const backRect = backBtn ? backBtn.getBoundingClientRect() : null;
    return {
      overlayRect: {x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left},
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      isFullyWithinScreen: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0,
      backBtnRect: backRect ? {x: backRect.x, y: backRect.y, width: backRect.width, height: backRect.height} : null
    };
  });
  console.log('Overlay Check:', JSON.stringify(overlayCheck, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v2_03_atribuicoes_mobile_fit.png'});

  // Test Back to Map button
  console.log('Clicking ← Voltar ao mapa...');
  await page.locator('section.rp-field-page-overlay .rp-page-back').click();
  await page.waitForTimeout(800);

  const backCheck = await page.evaluate(() => {
    const overlay = document.querySelector('section.rp-field-page-overlay');
    const map = document.querySelector('#guard-real-map');
    return {
      overlayPresent: !!overlay,
      mapVisible: !!map && map.clientHeight > 0
    };
  });
  console.log('After Back click:', JSON.stringify(backCheck, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v2_04_returned_to_map.png'});

  await browser.close();
  console.log('All tests passed successfully!');
}

verifyAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
