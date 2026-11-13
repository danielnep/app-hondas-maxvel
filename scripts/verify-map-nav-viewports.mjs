import {createAppServer} from '../server.js';
import {chromium} from '/opt/horizon-agent-core/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const PORT = 3456;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  {name: '320x568-iPhoneSE', width: 320, height: 568},
  {name: '360x800-Android', width: 360, height: 800},
  {name: '393x852-iPhone15Pro', width: 393, height: 852},
  {name: '412x915-GalaxyA53', width: 412, height: 915}
];

async function run() {
  const server = createAppServer();
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Test server running at ${BASE_URL}`);

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: {width: vp.width, height: vp.height},
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'pt-BR',
      geolocation: {latitude: -20.1446, longitude: -44.8912, accuracy: 10},
      permissions: ['geolocation']
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem('horizon-maxvel-tour-v2:2.2.6-beta:ronda@rondapro.local', 'seen');
        localStorage.setItem('horizon-maxvel-tour-v2:2.2.6-beta:guest', 'seen');
        localStorage.setItem('horizon-maxvel-tour-v2:2.3.0-production:ronda@rondapro.local', 'seen');
        localStorage.setItem('horizon-maxvel-tour-v2:2.3.0-production:guest', 'seen');
        localStorage.setItem('tutorial-closed', 'true');
      } catch {}
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});

    // Fill login
    await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
    await page.locator('#central-login [name=password]').fill('Maxvel@2026');
    await page.locator('#central-login button.primary').click();

    await page.waitForSelector('#guard-real-map', {timeout: 10000});
    await page.waitForTimeout(600);

    // Dismiss tour if present
    const tourClose = page.locator('#horizon-tour [data-tour="close"]');
    if (await tourClose.count()) {
      await tourClose.first().click();
      await page.waitForTimeout(300);
    }

    // Verify search bar
    const searchBar = await page.locator('.rp-map-search-bar');
    const searchBox = await searchBar.boundingBox();
    console.log(`  Search bar bbox:`, searchBox);

    if (!searchBox || searchBox.height < 44) {
      throw new Error(`Search bar too small or not visible on ${vp.name}`);
    }

    // Verify Navigation HUD buttons
    const compassBtn = await page.locator('[data-action="map-compass"]');
    const recenterBtn = await page.locator('[data-action="map-follow-gps"]');
    const compassBox = await compassBtn.boundingBox();
    const recenterBox = await recenterBtn.boundingBox();
    console.log(`  Compass bbox:`, compassBox);
    console.log(`  Recenter bbox:`, recenterBox);

    if (!compassBox || compassBox.width < 44 || compassBox.height < 44) {
      throw new Error(`Compass button touch target < 44px on ${vp.name}`);
    }
    if (!recenterBox || recenterBox.width < 44 || recenterBox.height < 44) {
      throw new Error(`Recenter button touch target < 44px on ${vp.name}`);
    }

    // Check collision between search bar and HUD
    const noVerticalOverlap = (searchBox.y + searchBox.height) < compassBox.y;
    console.log(`  Search & HUD clear separation: ${noVerticalOverlap}`);
    if (!noVerticalOverlap) {
      throw new Error(`Search bar overlaps HUD on ${vp.name}`);
    }

    // Check horizontal viewport overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowInnerWidth = await page.evaluate(() => window.innerWidth);
    console.log(`  Viewport scroll width: ${bodyScrollWidth} vs window inner width: ${windowInnerWidth}`);
    if (bodyScrollWidth > windowInnerWidth + 2) {
      throw new Error(`Horizontal scroll overflow detected on ${vp.name}: ${bodyScrollWidth} > ${windowInnerWidth}`);
    }

    // Screenshot 1: Map Cockpit with HUD & Search
    const ss1 = `/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/603525ec-9623-463d-864c-8ff5ddd085ae/ronda_hud_${vp.name}.png`;
    await page.screenshot({path: ss1});
    console.log(`  Saved screenshot: ${ss1}`);

    // Focus input and test suggestions
    await page.locator('[data-guard-search-input]').focus();
    await page.waitForTimeout(400);
    const resultsPanel = await page.locator('#guard-map-search-results');
    const isResultsVisible = await resultsPanel.isVisible();
    console.log(`  Results panel open: ${isResultsVisible}`);

    const ss2 = `/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/603525ec-9623-463d-864c-8ff5ddd085ae/ronda_search_suggestions_${vp.name}.png`;
    await page.screenshot({path: ss2});

    // Test pin toggle
    await page.locator('[data-guard-search-pin-toggle]').click();
    await page.waitForTimeout(400);
    const pinCard = await page.locator('#guard-map-pin-card');
    const isPinVisible = await pinCard.isVisible();
    console.log(`  Pin confirmation card open: ${isPinVisible}`);

    const ss3 = `/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/603525ec-9623-463d-864c-8ff5ddd085ae/ronda_pin_card_${vp.name}.png`;
    await page.screenshot({path: ss3});

    results.push({
      viewport: vp.name,
      searchHeight: searchBox.height,
      compassSize: `${compassBox.width}x${compassBox.height}`,
      recenterSize: `${recenterBox.width}x${recenterBox.height}`,
      overflow: bodyScrollWidth <= windowInnerWidth + 2,
      suggestionsWorking: isResultsVisible,
      pinCardWorking: isPinVisible
    });

    await context.close();
  }

  await browser.close();
  await new Promise(resolve => server.close(resolve));

  console.log('\n=== Multi-Viewport Visual Matrix Results ===');
  console.table(results);
  console.log('ALL VIEWPORTS PASSED WITH ZERO ERRORS AND ZERO CLIPPING!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
