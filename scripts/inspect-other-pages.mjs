import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';

async function inspectOtherPages() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: {width: 412, height: 915},
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});
  await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
  await page.locator('#central-login [name=password]').fill('Maxvel@2026');
  await page.locator('#central-login button').click();
  await page.waitForSelector('#guard-real-map');
  await page.waitForTimeout(1000);

  // 1. Dispatches ("Atribuições")
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(400);
  await page.locator('.ronda-menu-more-summary').click();
  await page.waitForTimeout(300);
  await page.locator('button[data-page="dispatches"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/inspect_page_dispatches.png'});

  // Back to map
  await page.locator('section.rp-field-page-overlay > .rp-page-back').click();
  await page.waitForTimeout(600);

  // 2. Notifications ("Eventos")
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(400);
  await page.locator('.ronda-menu-more-summary').click();
  await page.waitForTimeout(300);
  await page.locator('button[data-page="notifications"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/inspect_page_notifications.png'});

  // Back to map
  await page.locator('section.rp-field-page-overlay > .rp-page-back').click();
  await page.waitForTimeout(600);

  // 3. History
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(400);
  await page.locator('.ronda-menu-more-summary').click();
  await page.waitForTimeout(300);
  await page.locator('button[data-page="guide"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/inspect_page_guide.png'});

  await browser.close();
  console.log('All secondary pages inspected successfully!');
}

inspectOtherPages().catch(console.error);
