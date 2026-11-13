import { chromium } from '/opt/horizon-agent-core/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

async function verifyRondaProMobile() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // Emulate Samsung Galaxy A53 5G
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    geolocation: { latitude: -19.92083, longitude: -43.93778, accuracy: 10 },
    permissions: ['geolocation']
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem('rondapro-web-location-20261108', 'accepted');
      localStorage.setItem('horizon-maxvel-tour-v2:2.2.6-beta:ronda@rondapro.local', 'seen');
      localStorage.setItem('horizon-maxvel-tour-v2:2.2.6-beta:guest', 'seen');
      localStorage.setItem('horizon-maxvel-tour-v2:2.3.0-production:ronda@rondapro.local', 'seen');
      localStorage.setItem('horizon-maxvel-tour-v2:2.3.0-production:guest', 'seen');
      localStorage.setItem('tutorial-closed', 'true');
    } catch {}
  });

  const page = await context.newPage();
  
  // Track toasts
  const toasts = [];
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('1. Navigating to https://maxvel.hzsys.tech/central.html ...');
  await page.goto('http://127.0.0.1:8325/central.html', { waitUntil: 'networkidle' });

  console.log('2. Logging in as ronda@rondapro.local ...');
  await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
  await page.locator('#central-login [name=password]').fill('Maxvel@2026');
  await page.locator('#central-login button.primary').click();

  console.log('3. Waiting for map to initialize...');
  await page.waitForSelector('#guard-real-map', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Take screenshot 1: Initial load
  await page.screenshot({ path: '/tmp/ronda-mobile-1-initial.png' });
  console.log('Screenshot 1 captured: initial state');

  // Check 1: Check map center
  const mapCenter = await page.evaluate(() => {
    if (window.guardMap?.instance) {
      const c = window.guardMap.instance.getCenter();
      return { lat: c.lat, lng: c.lng };
    }
    return null;
  });
  console.log('Map center:', mapCenter);

  // Check 2: Top bar position & fixedness
  const headerBox = await page.locator('.ronda-header').boundingBox();
  console.log('Header bounding box:', headerBox);

  // Check 3: Lateral HUD buttons
  const hudBox = await page.locator('.rp-map-nav-hud').boundingBox();
  const hudOpacity = await page.locator('.rp-map-nav-hud').evaluate(el => window.getComputedStyle(el).opacity);
  console.log('HUD bounding box:', hudBox, 'opacity:', hudOpacity);

  // Check 4: Check if any toast "Nova ronda recebida do COI." appears over 18 seconds
  console.log('4. Monitoring for false positive alerts over 18 seconds...');
  let falseAlertFound = false;
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(3000);
    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.flash-banner, .toast, .ronda-toast, [data-flash-banner]');
      return el ? el.textContent : null;
    });
    if (toastText && toastText.includes('Nova ronda')) {
      falseAlertFound = true;
      console.error('ERROR: Found false alert:', toastText);
    }
  }
  console.log('False alert observed?', falseAlertFound);

  // Check 5: Bottom sheet collapse / expand toggle
  console.log('5. Testing bottom sheet toggle...');
  const toggleBtn = page.locator('[data-sheet-recolher]');
  if (await toggleBtn.count() > 0) {
    await toggleBtn.first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: '/tmp/ronda-mobile-2-collapsed.png' });
    console.log('Screenshot 2 captured: bottom sheet toggled');
  }

  // Check 6: Recenter button click
  console.log('6. Testing recenter GPS button...');
  const recenterBtn = page.locator('[data-action="map-follow-gps"]');
  if (await recenterBtn.count() > 0) {
    await recenterBtn.click();
    await page.waitForTimeout(1000);
    const updatedCenter = await page.evaluate(() => {
      if (window.guardMap?.instance) {
        const c = window.guardMap.instance.getCenter();
        return { lat: c.lat, lng: c.lng };
      }
      return null;
    });
    console.log('Updated center after recenter click:', updatedCenter);
  }

  await page.screenshot({ path: '/tmp/ronda-mobile-3-final.png' });
  console.log('Screenshot 3 captured: final state');

  await browser.close();

  const success = !falseAlertFound && headerBox && headerBox.y < 30;
  console.log('=== VERIFICATION RESULT ===');
  console.log('Success:', success);
  return { success, falseAlertFound, mapCenter, headerBox, hudBox };
}

verifyRondaProMobile().then(res => {
  console.log('Done:', JSON.stringify(res));
  process.exit(res.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
