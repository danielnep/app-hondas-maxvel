import { chromium } from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
    args: ['--no-sandbox']
  });

  // 1. Vigia Mobile (Galaxy A53 - 412x915)
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8325');
  await page.fill('#central-login input[name="email"]', 'ronda@rondapro.local');
  await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
  await page.click('#central-login button.primary, button[type="submit"]');
  await page.waitForTimeout(1500);

  // Focus search input
  const searchInput = await page.$('#guard-map-search-input');
  if (searchInput) {
    await searchInput.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/opt/horizon-agent-core/evidence/08-guard-search-recurrent.png' });
    console.log('Saved 08-guard-search-recurrent.png');

    await searchInput.fill('Centro');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/opt/horizon-agent-core/evidence/09-guard-search-query.png' });
    console.log('Saved 09-guard-search-query.png');
  }

  // 2. COI View (Desktop - 1280x800)
  const coiCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const coiPage = await coiCtx.newPage();
  await coiPage.goto('http://127.0.0.1:8325/central.html');
  await coiPage.fill('#central-login input[name="email"]', 'coi@rondapro.local');
  await coiPage.fill('#central-login input[name="password"]', 'Maxvel@2026');
  await coiPage.click('#central-login button.primary, button[type="submit"]');
  await coiPage.waitForTimeout(2000);

  // Inspect navigation items in menu
  console.log('Navigating in COI...');
  await coiPage.waitForTimeout(2000);
  
  // Click on Despachos navigation item
  const despNavItem = await coiPage.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Despachos');
  });
  if (despNavItem && despNavItem.asElement()) {
    await despNavItem.asElement().click();
    await coiPage.waitForTimeout(1500);
    console.log('Clicked Despachos nav');
  }

  // Test #ops-dispatch-modal with refined address search and recurrent suggestions
  await coiPage.evaluate(() => {
    const dialog = document.querySelector('#ops-dispatch-modal');
    if (dialog) {
      dialog.showModal();
      const input = dialog.querySelector('input[name="address"]');
      if (input) input.focus();
    }
  });
  await coiPage.waitForTimeout(600);
  await coiPage.screenshot({ path: '/opt/horizon-agent-core/evidence/10-coi-dispatch-recurrent.png' });
  console.log('Saved 10-coi-dispatch-recurrent.png');

  // Close dispatch modal
  await coiPage.evaluate(() => {
    document.querySelector('#ops-dispatch-modal')?.close();
  });
  await coiPage.waitForTimeout(300);

  // Test #ops-inspector-modal with refined address search and recurrent suggestions
  await coiPage.evaluate(() => {
    const dialog = document.querySelector('#ops-inspector-modal');
    if (dialog) {
      dialog.showModal();
      const input = dialog.querySelector('input[name="address"]');
      if (input) input.focus();
    }
  });
  await coiPage.waitForTimeout(600);
  await coiPage.screenshot({ path: '/opt/horizon-agent-core/evidence/11-coi-inspector-recurrent.png' });
  console.log('Saved 11-coi-inspector-recurrent.png');

  await coiPage.evaluate(() => {
    document.querySelector('#ops-inspector-modal')?.close();
  });

  console.log('All visual verification snapshots captured!');
  await browser.close();
}

main().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
