import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';
import {mkdirSync} from 'node:fs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = process.env.TARGET_URL || 'https://maxvel.hzsys.tech';

async function main() {
  mkdirSync('artifacts/galaxy-a53-review', {recursive: true});
  console.log(`Launching chromium against ${BASE_URL}...`);
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Galaxy A53 5G viewport: 412 x 915
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
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('Browser error:', msg.text());
  });

  console.log('Navigating to central.html...');
  await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});

  // Login
  console.log('Logging in as ronda@rondapro.local...');
  await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
  await page.locator('#central-login [name=password]').fill('Maxvel@2026');
  await page.locator('#central-login button').click();

  // Wait for guard workspace
  await page.waitForSelector('[data-guard-cockpit]', {timeout: 15000});
  console.log('Guard cockpit loaded!');

  // Wait 3s for map tiles and GPS update
  await page.waitForTimeout(3000);

  // Take screenshot 1: Guard Cockpit + Map on Galaxy A53 5G
  await page.screenshot({path: 'artifacts/galaxy-a53-review/01-galaxy-a53-guard-map.png'});
  console.log('Saved 01-galaxy-a53-guard-map.png');

  // Verify Leaflet container has rendered layers
  const mapHasLayers = await page.evaluate(() => {
    const map = document.querySelector('#guard-real-map');
    return {
      exists: !!map,
      leafletLoaded: !!window.L,
      leafletPanes: map ? map.querySelectorAll('.leaflet-pane').length : 0,
      tiles: map ? map.querySelectorAll('.leaflet-tile').length : 0,
      markers: map ? map.querySelectorAll('.map-pin-host, .map-person-host').length : 0,
      fallbackSvg: !!map.querySelector('.fallback-svg')
    };
  });
  console.log('Map status:', JSON.stringify(mapHasLayers, null, 2));

  // Check Panic button position & z-index
  const panicInfo = await page.evaluate(() => {
    const btn = document.querySelector('#central-panic');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(btn);
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      zIndex: style.zIndex,
      display: style.display,
      position: style.position
    };
  });
  console.log('Panic button info:', JSON.stringify(panicInfo, null, 2));

  // Open mobile drawer navigation menu
  console.log('Opening mobile menu...');
  const menuBtn = page.locator('[data-central-menu]');
  await menuBtn.click();
  await page.waitForTimeout(600);

  // Take screenshot 2: Mobile drawer menu open
  await page.screenshot({path: 'artifacts/galaxy-a53-review/02-galaxy-a53-menu-open.png'});
  console.log('Saved 02-galaxy-a53-menu-open.png');

  // Verify Panic button is hidden or NOT overlapping menu items
  const menuOverlapCheck = await page.evaluate(() => {
    const panic = document.querySelector('#central-panic');
    const nav = document.querySelector('#central-navigation');
    const panicDisplay = panic ? window.getComputedStyle(panic).display : 'none';
    const navRect = nav ? nav.getBoundingClientRect() : null;
    return {
      panicDisplay,
      navZIndex: nav ? window.getComputedStyle(nav).zIndex : null,
      navVisible: navRect ? navRect.width > 0 && navRect.height > 0 : false
    };
  });
  console.log('Menu overlap check:', JSON.stringify(menuOverlapCheck, null, 2));

  // Close menu
  console.log('Closing menu...');
  await page.locator('[data-close-central-menu]').click();
  await page.waitForTimeout(500);

  // Open Chat dialog
  console.log('Opening chat dialog...');
  await page.locator('[data-page="chat"], [data-chat-badge] button, .rp-header-tools [data-chat-badge]').first().click();
  await page.waitForTimeout(1000);

  // Take screenshot 3: Chat on Galaxy A53 5G
  await page.screenshot({path: 'artifacts/galaxy-a53-review/03-galaxy-a53-chat.png'});
  console.log('Saved 03-galaxy-a53-chat.png');

  await browser.close();
  console.log('All Galaxy A53 5G tests completed!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
