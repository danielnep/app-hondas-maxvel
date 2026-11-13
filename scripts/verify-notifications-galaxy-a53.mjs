import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';
import {mkdirSync} from 'node:fs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = process.env.TARGET_URL || 'http://127.0.0.1:8325';

async function testRole(email, roleName) {
  mkdirSync('artifacts/galaxy-a53-review', {recursive: true});
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

  console.log(`Logging in as ${email}...`);
  await page.locator('#central-login [name=email]').fill(email);
  await page.locator('#central-login [name=password]').fill('Maxvel@2026');
  await page.locator('#central-login button').click();

  await page.waitForTimeout(2500);

  // Click on the notification bell
  console.log(`Clicking notification bell for ${roleName}...`);
  const bell = page.locator('.ops-bell-bar summary, .rp-header-popover summary');
  await bell.first().click();
  await page.waitForTimeout(1000);

  const screenshotPath = `artifacts/galaxy-a53-review/05-galaxy-a53-${roleName}-notifications.png`;
  await page.screenshot({path: screenshotPath});
  console.log(`Saved ${screenshotPath}`);

  // Check popover dimensions
  const popoverBox = await page.evaluate(() => {
    const p = document.querySelector('.rp-popover-list');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      windowWidth: window.innerWidth,
      clippedLeft: r.left < 0,
      clippedRight: r.right > window.innerWidth
    };
  });
  console.log(`${roleName} popover box:`, JSON.stringify(popoverBox, null, 2));

  await browser.close();
}

async function main() {
  await testRole('admin@rondapro.local', 'admin');
  await testRole('ronda@rondapro.local', 'ronda');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
