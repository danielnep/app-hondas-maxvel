import {chromium} from '/opt/horizon-agent-core/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'http://127.0.0.1:8325';
const SCREENSHOT_DIR = '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/f58bdde0-6381-45e4-8b2c-e4391592048a/galaxy-a53-verification';

fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});

async function run() {
  console.log('🚀 Iniciando verificação minuciosa dos 5 pontos críticos no Galaxy A53...');
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: {width: 412, height: 915},
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  // Test 1: Central Boot & Loading Watchdog
  console.log('1️⃣ Testando boot da central e watchdog sem falso timeout...');
  await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});
  await page.waitForTimeout(1500);

  const jsReady = await page.evaluate(() => window.__centralJsReady);
  console.log('   window.__centralJsReady:', jsReady);
  assert.equal(jsReady, true, 'window.__centralJsReady deve ser true');

  const errorBox = await page.$('text="Conexão lenta ou expirada"');
  assert.equal(errorBox, null, 'Não deve exibir falso positivo de conexão lenta');

  // Test 2: Login as Ronda
  console.log('2️⃣ Efetuando login como Vigia de Ronda...');
  const emailInput = await page.$('#central-login input[name="email"]');
  if (emailInput) {
    await emailInput.fill('ronda@rondapro.local');
    await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
    await page.click('#central-login button.primary');
    await page.waitForTimeout(2500);
  }

  await page.waitForSelector('.rp-guard-cockpit, .ronda-header', {timeout: 10000});
  console.log('   Vigia autenticado e cockpit renderizado com sucesso.');

  // Test 3: Search Bar placement & Bounding Box Overlap
  console.log('3️⃣ Testando barra de busca, HUD e opacidade...');
  const searchTrigger = await page.$('[data-action="toggle-search-bar"]');
  if (searchTrigger) {
    await searchTrigger.click();
    await page.waitForTimeout(500);
  }

  const searchBar = await page.$('.rp-map-search-bar:not(.is-collapsed)');
  assert.ok(searchBar, 'Barra de busca deve estar visível');

  const hud = await page.$('.rp-map-nav-hud');
  assert.ok(hud, 'HUD de navegação lateral deve estar visível');

  const searchBox = await searchBar.boundingBox();
  const hudBox = await hud.boundingBox();

  console.log(`   SearchBar: x=${searchBox.x}, width=${searchBox.width}, right=${searchBox.x + searchBox.width}`);
  console.log(`   HUD: x=${hudBox.x}, width=${hudBox.width}, left=${hudBox.x}`);

  assert.ok(
    searchBox.x + searchBox.width <= hudBox.x,
    `Search bar (${searchBox.x + searchBox.width}px) deve ficar estritamente à esquerda do HUD (${hudBox.x}px)`
  );
  console.log('   ✅ Bounding Box check: ZERO sobreposição entre Busca e HUD!');

  // Check Search Bar & Chips background opacity
  const searchBg = await page.evaluate(() => {
    const el = document.querySelector('.rp-map-search-bar');
    return window.getComputedStyle(el).backgroundColor;
  });
  console.log('   SearchBar backgroundColor:', searchBg);
  assert.equal(searchBg, 'rgb(38, 38, 38)', 'SearchBar deve ser opaco #262626');

  const chipBg = await page.evaluate(() => {
    const el = document.querySelector('.ronda-chip');
    return el ? window.getComputedStyle(el).backgroundColor : null;
  });
  console.log('   RondaChip backgroundColor:', chipBg);
  assert.equal(chipBg, 'rgb(38, 38, 38)', 'Chips devem ser opacos #262626');

  // Test 4: Compass Button Heading-Up Rotation
  console.log('4️⃣ Testando modo de rotação da bússola...');
  const compassBtn = await page.$('[data-action="map-compass"]');
  assert.ok(compassBtn, 'Botão de bússola deve existir');

  // Click 1: Activate Heading-up
  await compassBtn.click();
  await page.waitForTimeout(400);

  const compassActive = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="map-compass"]');
    return btn.classList.contains('is-active');
  });
  console.log('   Compass is-active após 1 toque:', compassActive);
  assert.equal(compassActive, true, 'Bússola deve ativar modo rota no primeiro toque');

  // Click 2: Reset to North
  await compassBtn.click();
  await page.waitForTimeout(400);

  const compassReset = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="map-compass"]');
    return btn.classList.contains('is-active');
  });
  console.log('   Compass is-active após 2 toque (reset Norte):', compassReset);
  assert.equal(compassReset, false, 'Bússola deve desativar e voltar ao Norte no segundo toque');

  // Test 5: Bottom Sheet Chevron toggle
  console.log('5️⃣ Testando recolhimento do Card / Bottom Sheet...');
  const handleBtn = await page.$('[data-guard-panel-toggle]');
  assert.ok(handleBtn, 'Alça de recolhimento da bottom sheet deve existir');

  await handleBtn.click();
  await page.waitForTimeout(400);

  const isCollapsed = await page.evaluate(() => {
    const panel = document.querySelector('[data-guard-panel]');
    return panel.classList.contains('is-collapsed');
  });
  console.log('   Panel is-collapsed:', isCollapsed);
  assert.equal(isCollapsed, true, 'Painel deve recolher');

  await page.screenshot({path: `${SCREENSHOT_DIR}/ronda-search-hud-compass-412.png`});

  // Test 6: COI / Alertas e Popover de Eventos
  console.log('6️⃣ Efetuando logout e login como COI para testar Popover e Cores...');
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});
  await page.waitForSelector('#central-login', {timeout: 10000});

  await page.fill('#central-login input[name="email"]', 'coi@rondapro.local');
  await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
  await page.click('#central-login button.primary');
  await page.waitForTimeout(2500);

  // Open "Eventos" bell popover
  const bellSummary = await page.$('.rp-header-popover summary');
  if (bellSummary) {
    await bellSummary.click();
    await page.waitForTimeout(500);

    const popoverOpen = await page.evaluate(() => {
      const details = document.querySelector('.rp-header-popover');
      return details ? details.open : false;
    });
    console.log('   Popover Eventos open:', popoverOpen);
    assert.equal(popoverOpen, true, 'Popover de eventos deve abrir');

    const popoverBg = await page.evaluate(() => {
      const list = document.querySelector('.rp-popover-list');
      return window.getComputedStyle(list).backgroundColor;
    });
    console.log('   Popover backgroundColor:', popoverBg);
    assert.equal(popoverBg, 'rgb(25, 25, 25)', 'Popover deve ser opaco #191919');

    // Click outside to close (e.g. at y=850 near bottom of screen)
    await page.mouse.click(20, 850);
    await page.waitForTimeout(400);

    const popoverClosed = await page.evaluate(() => {
      const details = document.querySelector('.rp-header-popover');
      return details ? details.open : false;
    });
    console.log('   Popover Eventos após click outside:', popoverClosed);
    assert.equal(popoverClosed, false, 'Popover deve fechar ao clicar fora');
  }

  // Navigate to Alertas / Despachos and check button color
  const sendButtonColor = await page.evaluate(() => {
    const btn = document.querySelector('button.primary');
    if (!btn) return null;
    return window.getComputedStyle(btn).backgroundColor;
  });
  console.log('   button.primary backgroundColor:', sendButtonColor);
  assert.equal(sendButtonColor, 'rgb(204, 36, 59)', 'Botão primário deve ser vermelho Maxvel #cc243b (NO BLUE!)');

  await page.screenshot({path: `${SCREENSHOT_DIR}/coi-clean-412.png`});

  console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO ABSOLUTO!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ Falha na verificação:', err);
  process.exit(1);
});
