import { chromium } from '/opt/horizon-agent-core/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'http://127.0.0.1:8325';
const BASELINE_DIR = '/opt/horizon-agent-core/evidence/premium-visual-evolution/baseline';

fs.mkdirSync(BASELINE_DIR, { recursive: true });

async function capture() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // 1. Login Screen
  await page.goto(`${BASE_URL}/central.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(BASELINE_DIR, '01-login-screen.png') });

  // 2. Ronda Cockpit (Expanded & Collapsed)
  await page.fill('#central-login input[name="email"]', 'ronda@rondapro.local');
  await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
  await page.click('#central-login button.primary');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(BASELINE_DIR, '02-ronda-cockpit.png') });

  // Search Bar opened
  const searchBtn = await page.$('[data-action="toggle-search-bar"]');
  if (searchBtn) {
    await searchBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(BASELINE_DIR, '03-ronda-search-opened.png') });
  }

  // Bottom card collapsed
  const chevron = await page.$('.rp-panel-chevron, [data-action="toggle-panel"]');
  if (chevron) {
    await chevron.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(BASELINE_DIR, '04-ronda-bottom-collapsed.png') });
  }

  // 3. COI Monitor
  await context.clearCookies();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${BASE_URL}/central.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#central-login input[name="email"]');
  await page.fill('#central-login input[name="email"]', 'coi@rondapro.local');
  await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
  await page.click('#central-login button.primary');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(BASELINE_DIR, '05-coi-dashboard.png') });

  // Events popover opened
  const bell = await page.$('.rp-header-popover summary');
  if (bell) {
    await bell.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(BASELINE_DIR, '06-coi-events-popover.png') });
  }

  await browser.close();
  console.log('✅ Baseline capturado em:', BASELINE_DIR);
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
