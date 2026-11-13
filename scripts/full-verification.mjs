import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';

async function fullVerification() {
  console.log('Launching browser against', BASE_URL);
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Galaxy A53 5G
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

  console.log('--- 1. VERIFY HEADER & MAXVEL LOGO ---');
  const brandInfo = await page.evaluate(() => {
    const brand = document.querySelector('.rp-agent-brand-title');
    const img = brand ? brand.querySelector('img.rp-brand-maxvel-logo') : null;
    const text = brand ? brand.querySelector('.rp-brand-text') : null;
    const sep = brand ? brand.querySelector('.rp-brand-sep') : null;
    return {
      hasBrand: !!brand,
      hasImg: !!img,
      imgSrc: img ? img.src : null,
      naturalWidth: img ? img.naturalWidth : null,
      imgRect: img ? img.getBoundingClientRect() : null,
      textRect: text ? text.getBoundingClientRect() : null,
      sepRect: sep ? sep.getBoundingClientRect() : null
    };
  });
  console.log('Brand Info:', JSON.stringify(brandInfo, null, 2));

  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_01_standby_screen.png'});

  console.log('--- 2. OPEN MENU & VERIFY OVERLAY UNBLOCKED ---');
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(600);

  const hitCheck = await page.evaluate(() => {
    const el = document.elementFromPoint(100, 220);
    return {
      tag: el ? el.tagName : null,
      text: el ? el.innerText : null,
      class: el ? el.className : null
    };
  });
  console.log('Hit at (100, 220):', JSON.stringify(hitCheck, null, 2));

  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_02_menu_open.png'});

  console.log('--- 3. EXPAND MAIS ÁREAS & VERIFY SCROLL ---');
  const moreSummary = page.locator('.ronda-menu-more-summary');
  if (await moreSummary.count() > 0) {
    await moreSummary.click();
    await page.waitForTimeout(400);
    const scrollInfo = await page.evaluate(() => {
      const menu = document.querySelector('.rp-agent-side-menu');
      return {
        clientHeight: menu ? menu.clientHeight : null,
        scrollHeight: menu ? menu.scrollHeight : null,
        overflowY: menu ? window.getComputedStyle(menu).overflowY : null,
        isScrollable: menu ? menu.scrollHeight >= menu.clientHeight : false
      };
    });
    console.log('Menu Scroll Info with Mais Áreas expanded:', JSON.stringify(scrollInfo, null, 2));
    await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_03_menu_mais_areas.png'});
  }

  // Close menu by clicking Minha Ronda
  console.log('--- 4. CLICK MINHA RONDA ---');
  await page.locator('.rp-agent-side-menu button:has-text("Minha Ronda")').click();
  await page.waitForTimeout(600);

  console.log('--- 5. CLICK + NOVA RONDA ---');
  await page.locator('button:has-text("+ Nova Ronda")').click();
  await page.waitForTimeout(800);

  console.log('--- 6. START ROUND & CLICK ESTOU AQUI ---');
  const startBtn = page.locator('[data-guard-start]');
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1500);
  }

  // Clear notice
  await page.evaluate(() => {
    const n = document.querySelector('#notice');
    if (n) { n.className = ''; n.textContent = ''; }
  });

  const arriveBtn = page.locator('[data-guard-arrive]');
  console.log('Is arrive visible?', await arriveBtn.isVisible());
  if (await arriveBtn.isVisible()) {
    await arriveBtn.click();
    await page.waitForTimeout(800);

    const arriveAlert = await page.evaluate(() => {
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
    console.log('Arrive Alert (Top Notice):', JSON.stringify(arriveAlert, null, 2));
    await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_04_arrive_top_alert.png'});
  }

  console.log('--- 7. TEST SOS EMERGENCY STATE ---');
  await page.locator('[data-agent-sos]').click();
  await page.waitForTimeout(800);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_05_emergency_sos.png'});

  await browser.close();
  console.log('All verification completed successfully!');
}

fullVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
