import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';

async function verifyFullFlow() {
  console.log('Testing full flow on Galaxy A53...');
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

  // STEP 1: Verify Main Map with Floating Circular SOS and Top Bar
  console.log('Step 1: Main Map...');
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_v3_01_map_with_floating_sos.png'});

  // STEP 2: Collapse Bottom Sheet to verify Drag / Pull Handle Cue
  console.log('Step 2: Collapse Sheet...');
  await page.locator('[data-sheet-recolher]').click();
  await page.waitForTimeout(600);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_v3_02_sheet_collapsed_cue.png'});

  // Re-expand Bottom Sheet
  await page.locator('[data-guard-panel-toggle]').click();
  await page.waitForTimeout(600);

  // STEP 3: Open Menu and navigate to Chat Interno
  console.log('Step 3: Open Chat...');
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(400);
  await page.locator('.ronda-menu-more-summary').click();
  await page.waitForTimeout(300);
  await page.locator('button[data-page="chat"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_v3_03_chat_conversations_list.png'});

  // STEP 4: Open Operador COI conversation
  console.log('Step 4: Open Conversation Thread...');
  await page.locator('[data-chat-open]').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_v3_04_chat_thread_clean.png'});

  // STEP 5: Click Back button in chat thread header
  console.log('Step 5: Click Back button in thread header...');
  await page.locator('[data-chat-back]').click();
  await page.waitForTimeout(600);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_v3_05_chat_back_to_list.png'});

  // STEP 6: Click Voltar ao mapa to return to map
  console.log('Step 6: Return to Map...');
  await page.locator('section.rp-field-page-overlay > .rp-page-back').click();
  await page.waitForTimeout(600);
  await page.screenshot({path: '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4/final_v3_06_returned_to_map.png'});

  await browser.close();
  console.log('Full flow verified successfully!');
}

verifyFullFlow().catch(console.error);
