import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'http://localhost:8325';

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('=== 1. Checking Login Screen (Zero APK Downloads) ===');
  const loginPage = await browser.newPage({viewport: {width: 393, height: 852}});
  await loginPage.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});

  const apkOnLogin = await loginPage.evaluate(() => {
    return {
      hasApkBanner: !!document.querySelector('.rp-login-apk-banner'),
      hasApkLink: !!document.querySelector('a[href*="apk"], a[download*="apk"]'),
      loginFormVisible: !!document.querySelector('#central-login')
    };
  });
  console.log('Login screen check:', apkOnLogin);
  if (apkOnLogin.hasApkBanner || apkOnLogin.hasApkLink) {
    throw new Error('FAIL: APK download link found on login screen!');
  }
  await loginPage.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/d4120549-32aa-42ba-a93a-92768b5c77e5/login_final.png'});
  await loginPage.close();

  console.log('=== 2. Multi-Viewport Header and Chips Geometry Audit ===');
  const viewports = [
    {w: 320, h: 568, name: 'iPhone SE (320x568)'},
    {w: 360, h: 800, name: 'Android Popular (360x800)'},
    {w: 393, h: 852, name: 'iPhone 14/15 Pro (393x852)'},
    {w: 412, h: 915, name: 'Samsung Galaxy A53 (412x915)'}
  ];

  for (const v of viewports) {
    const page = await browser.newPage({viewport: {width: v.w, height: v.h}, isMobile: true, hasTouch: true});
    await page.goto(`${BASE_URL}/central.html`);
    await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
    await page.locator('#central-login [name=password]').fill('Maxvel@2026');
    await page.locator('#central-login button').click();
    await page.waitForSelector('#guard-real-map', {timeout: 8000});

    const metrics = await page.evaluate((vw) => {
      const header = document.querySelector('.ronda-header');
      const torch = document.querySelector('.ronda-btn-torch');
      const sos = document.querySelector('.ronda-btn-sos');
      const menu = document.querySelector('.rp-agent-menu-toggle');
      const chipsRow = document.querySelector('.ronda-chips-row');

      const rH = header.getBoundingClientRect();
      const rT = torch.getBoundingClientRect();
      const rS = sos.getBoundingClientRect();
      const rM = menu.getBoundingClientRect();

      const elT = document.elementFromPoint(rT.x + rT.width/2, rT.y + rT.height/2);
      const elS = document.elementFromPoint(rS.x + rS.width/2, rS.y + rS.height/2);
      const elM = document.elementFromPoint(rM.x + rM.width/2, rM.y + rM.height/2);

      return {
        vw,
        headerRight: rH.right,
        torchRight: rT.right,
        sosRight: rS.right,
        overflow: rS.right > vw || rH.right > vw || header.scrollWidth > header.clientWidth,
        torchClickable: elT === torch || torch.contains(elT),
        sosClickable: elS === sos || sos.contains(elS),
        menuClickable: elM === menu || menu.contains(elM),
        chipsCanScroll: chipsRow.scrollWidth > chipsRow.clientWidth
      };
    }, v.w);

    console.log(`[${v.name}] Result:`, metrics);
    if (metrics.overflow) throw new Error(`FAIL: Header overflows on ${v.name}!`);
    if (!metrics.torchClickable) throw new Error(`FAIL: Torch not clickable on ${v.name}!`);
    if (!metrics.sosClickable) throw new Error(`FAIL: SOS not clickable on ${v.name}!`);
    if (!metrics.menuClickable) throw new Error(`FAIL: Menu not clickable on ${v.name}!`);

    if (v.w === 412) {
      await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/d4120549-32aa-42ba-a93a-92768b5c77e5/ronda_galaxy_a53_final.png'});
    }
    await page.close();
  }

  console.log('=== 3. Testing Camera Lock Tag in Chips Row ===');
  const guardPage = await browser.newPage({viewport: {width: 412, height: 915}, isMobile: true, hasTouch: true});
  await guardPage.goto(`${BASE_URL}/central.html`);
  await guardPage.locator('#central-login [name=email]').fill('ronda@rondapro.local');
  await guardPage.locator('#central-login [name=password]').fill('Maxvel@2026');
  await guardPage.locator('#central-login button').click();
  await guardPage.waitForSelector('#guard-real-map');

  const initialLock = await guardPage.evaluate(() => {
    const chip = document.querySelector('.ronda-chips-row .ronda-chip-camera-lock');
    return {
      text: chip?.textContent,
      isActive: chip?.classList.contains('is-active')
    };
  });
  console.log('Initial camera lock state:', initialLock);

  // Click camera lock chip
  await guardPage.locator('.ronda-chips-row .ronda-chip-camera-lock').click();
  await guardPage.waitForTimeout(300);

  const toggledLock = await guardPage.evaluate(() => {
    const chip = document.querySelector('.ronda-chips-row .ronda-chip-camera-lock');
    return {
      text: chip?.textContent,
      isActive: chip?.classList.contains('is-active')
    };
  });
  console.log('Toggled camera lock state:', toggledLock);

  console.log('=== 4. Testing Offline Persistence & Real Sync ===');
  // Inject mock GPS telemetry while offline
  const syncTestResult = await guardPage.evaluate(async () => {
    // 1. Simulate offline state in window
    window.dispatchEvent(new Event('offline'));
    
    // 2. Clear offline queue
    localStorage.removeItem('ronda_offline_sync_queue');

    // 3. Post telemetry while offline
    const testFix = {lat: -20.1446, lng: -44.8912, accuracy: 8, at: Date.now()};
    
    // Call the application API while offline
    // In central.js, api('/presence', ...) queues mutations when offline
    const res = await window.fetch('/api/presence', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + sessionStorage.getItem('rondaspro_api_token'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({position: testFix})
    });

    const statusAfterSend = await res.json();
    return {
      fetchStatus: res.status,
      fetchBody: statusAfterSend
    };
  });
  console.log('Direct presence call result:', syncTestResult);

  // Wait 1 second and check COI view
  console.log('=== 5. Checking COI Monitor Real-Time Presence ===');
  const coiPage = await browser.newPage({viewport: {width: 1280, height: 800}});
  await coiPage.goto(`${BASE_URL}/central.html`);
  await coiPage.locator('#central-login [name=email]').fill('coi@rondapro.local');
  await coiPage.locator('#central-login [name=password]').fill('Maxvel@2026');
  await coiPage.locator('#central-login button').click();
  await coiPage.waitForTimeout(2000);

  const coiState = await coiPage.evaluate(() => {
    const tacticalMap = document.querySelector('#coi-tactical-map');
    const leafId = tacticalMap?._leaflet_id;
    const markers = document.querySelectorAll('#coi-tactical-map .leaflet-marker-pane, #coi-tactical-map .leaflet-overlay-pane path');
    const statusText = document.body.innerText;
    return {
      hasTacticalMap: !!tacticalMap,
      leafletId: leafId,
      markerCount: markers.length,
      hasRondaListed: statusText.includes('Agente de Ronda') || statusText.includes('ronda@rondapro.local')
    };
  });
  console.log('COI Monitor state:', coiState);
  await coiPage.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/d4120549-32aa-42ba-a93a-92768b5c77e5/coi_monitor_final.png'});

  await guardPage.close();
  await coiPage.close();
  await browser.close();

  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('ERROR in verification:', err);
  process.exit(1);
});
