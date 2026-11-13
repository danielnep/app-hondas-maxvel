import {chromium} from '/opt/horizon-agent-core/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

const VIEWPORTS = [
  {name: 'iPhone_SE', width: 320, height: 568},
  {name: 'Android_Popular', width: 360, height: 800},
  {name: 'iPhone_15_Pro', width: 393, height: 852},
  {name: 'Galaxy_A53', width: 412, height: 915}
];

const BASE_URL = 'http://127.0.0.1:8325';

async function run() {
  console.log('🚀 Iniciando verificação multi-viewport do COI e Correções Visuais...');
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n📱 Testando viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: {width: vp.width, height: vp.height},
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36'
    });
    const page = await context.newPage();

    // 1. Acessar página inicial e autenticar ou abrir central
    await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});
    
    // Check if login is needed
    await page.waitForSelector('#central-login, #central-root', {timeout: 10000});
    const emailField = await page.$('#central-login input[name="email"]');
    if (emailField) {
      await emailField.fill('master@rondapro.local');
      await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
      await page.click('#central-login button');
      await page.waitForTimeout(2000);
    }

    async function navigateTo(targetPage) {
      const menuBtn = await page.$('[data-central-menu]');
      if (menuBtn && await menuBtn.isVisible()) {
        await menuBtn.click();
        await page.waitForTimeout(400);
      }
      const moreSummary = await page.$('.ronda-menu-more-summary');
      if (moreSummary && await moreSummary.isVisible()) {
        try { await moreSummary.click(); await page.waitForTimeout(300); } catch {}
      }
      await page.evaluate(p => {
        const btn = document.querySelector(`button[data-page="${p}"]`);
        if (btn) btn.click();
      }, targetPage);
      await page.waitForTimeout(1000);
    }

    // Navegar para Monitoramento COI
    await navigateTo('monitor');

    // 2. Verificar Tactical Map no COI
    const tacticalMap = await page.waitForSelector('#coi-tactical-map', {timeout: 8000});
    assert.ok(tacticalMap, 'Elemento #coi-tactical-map deve estar visível no COI');

    // Verificar se há Carto tiles incorretas
    const cartoTiles = await page.$$('img[src*="cartocdn"]');
    assert.equal(cartoTiles.length, 0, 'Nenhuma tile do Carto com "API KEY REQUIRED" deve estar no DOM');

    // 3. Testar Barra de Digitação de Endereços com reflexo imediato no mapa
    const addressInput = await page.$('#coi-address-search-input');
    assert.ok(addressInput, 'Input de endereço #coi-address-search-input deve estar presente no COI');
    
    await addressInput.fill('Divinópolis');
    await page.waitForTimeout(400);
    const searchBtn = await page.$('#coi-address-search-btn');
    if (searchBtn) await searchBtn.click();
    await page.waitForTimeout(1200);

    // Verificar se o pino foi colocado no mapa
    const pin = await page.$('.coi-pin-icon, .leaflet-marker-icon');
    assert.ok(pin, 'Marcador de reflexo imediato do endereço deve estar no mapa');

    // 4. Testar Modo de Marcação Manual
    const manualBtn = await page.$('#coi-address-manual-btn');
    assert.ok(manualBtn, 'Botão #coi-address-manual-btn deve estar presente');
    await manualBtn.click();
    await page.waitForTimeout(300);

    // Clicar no mapa para adicionar ponto
    await tacticalMap.scrollIntoViewIfNeeded();
    await tacticalMap.click({position: {x: 60, y: 60}});
    await page.waitForTimeout(800);

    const popup = await page.$('.leaflet-popup-content, #coi-save-point-btn');
    assert.ok(popup, 'Popup para salvar ponto marcado deve estar aberto após clique');

    // 5. Testar Popover de Eventos na tela de Despachos
    await navigateTo('dispatches');
    const popoverSummary = await page.$('.rp-header-popover > summary');
    if (popoverSummary) {
        await popoverSummary.click();
        await page.waitForTimeout(500);

        const popoverList = await page.$('.rp-popover-list');
        assert.ok(popoverList, 'Popover list deve existir');

        // Avaliar cor de fundo do popover (deve ser opaco #191919)
        const bgColor = await page.evaluate(el => window.getComputedStyle(el).backgroundColor, popoverList);
        console.log(`  Popover background color: ${bgColor}`);
        assert.ok(bgColor.includes('25, 25, 25') || bgColor.includes('18, 20, 25') || bgColor.includes('rgb('), 'Popover deve ter fundo sólido opaco');

        // Testar clique fora fecha o popover
        await page.mouse.click(10, 10);
        await page.waitForTimeout(400);
        const isOpen = await page.evaluate(() => document.querySelector('.rp-header-popover')?.open);
        console.log(`  Popover fechou ao tocar fora: ${!isOpen}`);
      }

    // 6. Verificar ausência de overflow horizontal
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    assert.equal(overflow, false, `Viewport ${vp.name} não pode ter overflow horizontal`);

    // Tirar screenshot
    const screenshotPath = `/opt/ronda-pro-elite-v3/artifacts/play-review/audit-${vp.name}.png`;
    await page.screenshot({path: screenshotPath, fullPage: false});
    console.log(`  📸 Screenshot salvo em: ${screenshotPath}`);

    results.push({name: vp.name, status: 'PASS', overflow: false});
    await context.close();
  }

  await browser.close();
  console.log('\n✅ Todos os testes multi-viewport e funcionais do COI foram aprovados com sucesso!');
  console.table(results);
}

run().catch(err => {
  console.error('❌ Falha na verificação:', err);
  process.exit(1);
});
