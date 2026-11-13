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

  console.log('=== TEST 1: TOP BAR & FLOATING CIRCULAR SOS BUTTON ===');
  const topBarInfo = await page.evaluate(() => {
    const header = document.querySelector('.ronda-header');
    const headerActions = document.querySelector('.ronda-header-actions');
    const torchBtn = document.querySelector('.rp-btn-torch');
    const sosInHeader = headerActions?.querySelector('#central-panic, .ronda-btn-sos');
    const floatingSos = document.querySelector('.ronda-sos-floating-fab');
    const r = floatingSos ? floatingSos.getBoundingClientRect() : null;
    const s = floatingSos ? window.getComputedStyle(floatingSos) : null;
    return {
      headerPresent: !!header,
      torchPresent: !!torchBtn,
      sosInHeader: !!sosInHeader,
      floatingSosRect: r ? {x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left} : null,
      floatingSosBorderRadius: s?.borderRadius,
      floatingSosBackground: s?.backgroundImage || s?.backgroundColor
    };
  });
  console.log('Top Bar & SOS Info:', JSON.stringify(topBarInfo, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v3_01_top_bar_and_floating_sos.png'});

  // Test SOS click
  console.log('Clicking Floating SOS Button...');
  await page.locator('.ronda-sos-floating-fab').click();
  await page.waitForTimeout(600);
  const sosBannerInfo = await page.evaluate(() => {
    const banner = document.querySelector('.ronda-sos-banner');
    const notice = document.querySelector('#notice');
    return {
      bannerActive: banner?.classList.contains('is-active'),
      bannerVisible: banner ? window.getComputedStyle(banner).display !== 'none' : false,
      bannerText: banner?.innerText,
      noticeText: notice?.innerText
    };
  });
  console.log('SOS Activation Info:', JSON.stringify(sosBannerInfo, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v3_02_sos_emergency_activated.png'});

  // Click Floating SOS Button again to deactivate
  await page.locator('.ronda-sos-floating-fab').click();
  await page.waitForTimeout(400);

  console.log('=== TEST 2: BOTTOM SHEET COLLAPSE & EXPAND WITH CUE ===');
  const sheetBefore = await page.evaluate(() => {
    const s = document.querySelector('.ronda-bottom-sheet');
    const r = s ? s.getBoundingClientRect() : null;
    return {
      height: r?.height,
      isCollapsed: s?.classList.contains('is-collapsed')
    };
  });
  console.log('Sheet Before Collapse:', JSON.stringify(sheetBefore, null, 2));

  // Click Recolher button
  console.log('Clicking "Recolher painel ⌵"...');
  await page.locator('[data-sheet-recolher]').click();
  await page.waitForTimeout(600);

  const sheetCollapsed = await page.evaluate(() => {
    const s = document.querySelector('.ronda-bottom-sheet');
    const r = s ? s.getBoundingClientRect() : null;
    const cue = s?.querySelector('.ronda-sheet-collapsed-cue');
    const cueVisible = cue ? window.getComputedStyle(cue).display !== 'none' : false;
    return {
      height: r?.height,
      isCollapsed: s?.classList.contains('is-collapsed'),
      cueVisible,
      cueText: cue?.innerText
    };
  });
  console.log('Sheet After Collapse:', JSON.stringify(sheetCollapsed, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v3_03_sheet_collapsed_with_cue.png'});

  // Click on Collapsed Handle Bar to re-expand
  console.log('Clicking on Collapsed Handle to re-expand...');
  await page.locator('[data-guard-panel-toggle]').click();
  await page.waitForTimeout(600);

  const sheetExpanded = await page.evaluate(() => {
    const s = document.querySelector('.ronda-bottom-sheet');
    const r = s ? s.getBoundingClientRect() : null;
    return {
      height: r?.height,
      isCollapsed: s?.classList.contains('is-collapsed')
    };
  });
  console.log('Sheet After Re-expand:', JSON.stringify(sheetExpanded, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v3_04_sheet_re_expanded.png'});

  console.log('=== TEST 3: FULLSCREEN CLEAN MOBILE CHAT ===');
  // Open Menu -> Mais áreas -> Chat interno
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(400);
  await page.locator('.ronda-menu-more-summary').click();
  await page.waitForTimeout(300);
  await page.locator('button[data-page="chat"]').click();
  await page.waitForTimeout(1000);

  // If conversation list is shown, open first conversation
  const hasConv = await page.evaluate(() => {
    const btn = document.querySelector('[data-chat-open]');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (hasConv) await page.waitForTimeout(1000);

  const chatInfo = await page.evaluate(() => {
    const overlay = document.querySelector('#rp-field-chat-overlay, .rp-field-chat-overlay, .chat-page');
    const r = overlay ? overlay.getBoundingClientRect() : null;
    const bubbles = Array.from(document.querySelectorAll('.chat-bubble'));
    const locationLinks = Array.from(document.querySelectorAll('.chat-location-link, .chat-bubble a'));
    const composer = document.querySelector('.chat-composer');
    const compR = composer ? composer.getBoundingClientRect() : null;
    return {
      overlayRect: r ? {x: r.x, y: r.y, width: r.width, height: r.height} : null,
      bubbleCount: bubbles.length,
      hasLocationLink: locationLinks.length > 0,
      composerRect: compR ? {x: compR.x, y: compR.y, width: compR.width, height: compR.height} : null
    };
  });
  console.log('Chat Info:', JSON.stringify(chatInfo, null, 2));
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/v3_05_chat_clean_fullscreen.png'});

  // Click Back button
  const backBtn = page.locator('.ronda-chat-back-btn, [data-chat-overlay-close], [data-page="dashboard"]');
  if (await backBtn.count() > 0) {
    console.log('Closing chat...');
    await backBtn.first().click();
    await page.waitForTimeout(600);
  }

  await browser.close();
  console.log('All verification tests completed successfully!');
}

verifyAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
