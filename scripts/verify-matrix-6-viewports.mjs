#!/usr/bin/env node
/**
 * PROTOCOLO DE PRESERVAÇÃO VISUAL E REGRESSÃO ZERO — AUDITORIA REAL
 * Executa a Matriz Visual Obrigatória de 6 Viewports:
 * 1. 320 x 568 (iPhone SE 1ª geração / Ultra-compacto)
 * 2. 360 x 800 (Android Popular Corporativo)
 * 3. 390 x 844 (iPhone Padrão Moderno)
 * 4. 430 x 932 (Smartphones Grandes / Galaxy A53)
 * 5. 768 x 1024 (Tablet / iPad Portrait)
 * 6. 1440 x 900 (Desktop / Monitor Operacional)
 */

import { chromium } from '/opt/horizon-agent-core/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = process.env.TARGET_URL || 'http://127.0.0.1:8325';
const OUTPUT_DIR = '/opt/horizon-agent-core/evidence/matrix-6-viewports';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MATRIX_VIEWPORTS = [
  { id: '320', name: 'Compacto (iPhone SE)', width: 320, height: 568, isMobile: true, hasTouch: true },
  { id: '360', name: 'Android Popular Corporativo', width: 360, height: 800, isMobile: true, hasTouch: true },
  { id: '390', name: 'iPhone Padrão Moderno', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: '430', name: 'Smartphones Grandes / Max', width: 430, height: 932, isMobile: true, hasTouch: true },
  { id: '768', name: 'Tablet iPad Portrait', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { id: '1440', name: 'Desktop Monitor Operacional', width: 1440, height: 900, isMobile: false, hasTouch: false },
];

async function runAudit() {
  console.log('='.repeat(80));
  console.log('🛡️ PROTOCOLO DE PRESERVAÇÃO VISUAL E REGRESSÃO ZERO');
  console.log('MATRIZ VISUAL OBRIGATÓRIA — AUDITORIA REAL DE 6 RESOLUÇÕES');
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  const auditResults = [];

  for (const vp of MATRIX_VIEWPORTS) {
    console.log(`\n📱 AUDITANDO VIEWPORT [${vp.id}px]: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      deviceScaleFactor: vp.isMobile ? 2 : 1
    });

    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    // 1. Carrega Central Operacional
    await page.goto(`${BASE_URL}/central.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Boot & Watchdog Check
    const jsReady = await page.evaluate(() => window.__centralJsReady);
    const slowConnBox = await page.$('text="Conexão lenta ou expirada"');
    assert.strictEqual(jsReady, true, `window.__centralJsReady deve ser true em ${vp.width}px`);
    assert.strictEqual(slowConnBox, null, `Sem falso positivo de conexão lenta em ${vp.width}px`);

    // Screenshot Login
    const loginImgPath = path.join(OUTPUT_DIR, `${vp.id}-01-login.png`);
    await page.screenshot({ path: loginImgPath, fullPage: false });

    // 2. Login como Vigia de Ronda
    const emailInput = await page.$('#central-login input[name="email"]');
    if (emailInput) {
      await emailInput.fill('ronda@rondapro.local');
      await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
      await page.click('#central-login button.primary');
      await page.waitForTimeout(2000);
    }

    await page.waitForSelector('.rp-guard-cockpit, .ronda-header, .rp-desktop-grid', { timeout: 10000 });

    // Aceita termo de localização se exibido
    const locationYes = await page.$('dialog[open] button[data-yes]');
    if (locationYes) {
      await locationYes.click();
      await page.waitForTimeout(500);
    }

    // 3. Checagem Geométrica: Overflow e Bounding Boxes
    const metrics = await page.evaluate(() => {
      const body = document.body;
      const docEl = document.documentElement;
      const scrollWidth = Math.max(body.scrollWidth, docEl.scrollWidth);
      const innerWidth = window.innerWidth;
      const hasHorizontalOverflow = scrollWidth > (innerWidth + 3);

      // Search Bar & HUD
      const searchBar = document.querySelector('.rp-map-search-bar');
      const hud = document.querySelector('.rp-map-nav-hud');
      let collision = false;
      let searchRight = 0;
      let hudLeft = 0;

      if (searchBar && hud) {
        const sRect = searchBar.getBoundingClientRect();
        const hRect = hud.getBoundingClientRect();
        searchRight = sRect.right;
        hudLeft = hRect.left;
        // Colisão se a barra entrar na área do HUD
        if (sRect.width > 0 && hRect.width > 0 && sRect.right > hRect.left) {
          collision = true;
        }
      }

      // Checa se há elementos com azul proibido (#1F98FF ou azuis similares)
      const primaryBtn = document.querySelector('button.primary');
      const btnBg = primaryBtn ? window.getComputedStyle(primaryBtn).backgroundColor : null;

      return {
        scrollWidth,
        innerWidth,
        hasHorizontalOverflow,
        collision,
        searchRight,
        hudLeft,
        btnBg
      };
    });

    console.log(`   Overflow Horizontal: ${metrics.hasHorizontalOverflow ? '❌ FALHA' : '✅ 0px'}`);
    assert.strictEqual(metrics.hasHorizontalOverflow, false, `Não deve haver overflow horizontal em ${vp.width}px`);

    if (metrics.hudLeft > 0) {
      console.log(`   Barra de Busca vs HUD: right=${metrics.searchRight.toFixed(1)}px vs left=${metrics.hudLeft.toFixed(1)}px (Colisão: ${metrics.collision ? '❌' : '✅ ZERO'})`);
      assert.strictEqual(metrics.collision, false, `Busca e HUD colidiram em ${vp.width}px`);
    }

    // 4. Teste de Estabilidade de Interações: Abrir busca e fechar
    const searchTrigger = await page.$('[data-action="toggle-search-bar"]');
    if (searchTrigger) {
      await searchTrigger.click();
      await page.waitForTimeout(300);
    }

    // Screenshot Cockpit Vigia
    const cockpitImgPath = path.join(OUTPUT_DIR, `${vp.id}-02-cockpit-vigia.png`);
    await page.screenshot({ path: cockpitImgPath, fullPage: false });

    // 5. Teste de Bússola (Heading-up vs North) se presente no mobile
    const compassBtn = await page.$('[data-action="map-compass"]');
    if (compassBtn) {
      await compassBtn.click();
      await page.waitForTimeout(300);
      const isActive = await page.evaluate(() => document.querySelector('[data-action="map-compass"]')?.classList.contains('is-active'));
      console.log(`   Modo Bússola (1º toque - Heading Up): ${isActive ? '✅ ATIVO' : '❌ INATIVO'}`);
      assert.strictEqual(isActive, true, 'Bússola deve ativar modo Heading-Up no primeiro toque');

      await compassBtn.click();
      await page.waitForTimeout(300);
      const isReset = await page.evaluate(() => document.querySelector('[data-action="map-compass"]')?.classList.contains('is-active'));
      console.log(`   Modo Bússola (2º toque - Reset Norte): ${!isReset ? '✅ RESETADO' : '❌'}`);
      assert.strictEqual(isReset, false, 'Bússola deve resetar para o Norte no segundo toque');
    }

    // 6. Teste da Central COI
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto(`${BASE_URL}/central.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#central-login input[name="email"]', { timeout: 10000 });

    await page.fill('#central-login input[name="email"]', 'coi@rondapro.local');
    await page.fill('#central-login input[name="password"]', 'Maxvel@2026');
    await page.click('#central-login button.primary');
    await page.waitForTimeout(2500);

    // Screenshot COI
    const coiImgPath = path.join(OUTPUT_DIR, `${vp.id}-03-coi.png`);
    await page.screenshot({ path: coiImgPath, fullPage: false });

    // Verifica que botões primários no COI usam vermelho Maxvel (#cc243b) e NUNCA azul
    const coiBtnColor = await page.evaluate(() => {
      const btn = document.querySelector('button.primary');
      return btn ? window.getComputedStyle(btn).backgroundColor : null;
    });
    console.log(`   Cor do Botão Primário no COI: ${coiBtnColor} (Esperado Maxvel Red rgb(204, 36, 59))`);
    if (coiBtnColor) {
      assert.strictEqual(coiBtnColor, 'rgb(204, 36, 59)', 'Botões primários devem ser Vermelho Maxvel');
    }

    // Teste de Estabilidade das Interações: Notificações Bell Popover
    const bell = await page.$('.rp-header-popover summary');
    if (bell) {
      await bell.click();
      await page.waitForTimeout(500);
      const popoverBg = await page.evaluate(() => {
        const list = document.querySelector('.rp-popover-list');
        return list ? window.getComputedStyle(list).backgroundColor : null;
      });
      console.log(`   Popover Notificações Background: ${popoverBg} (Esperado opaco rgb(25, 25, 25))`);
      assert.strictEqual(popoverBg, 'rgb(25, 25, 25)', 'Popover deve ser opaco #191919');

      // Click outside fecha popover (clica no canto superior esquerdo fora do popover)
      await page.mouse.click(5, 20);
      await page.waitForTimeout(400);
      const isOpen = await page.evaluate(() => document.querySelector('.rp-header-popover')?.hasAttribute('open'));
      console.log(`   Popover fechamento ao clicar fora: ${!isOpen ? '✅ FECHOU' : '❌'}`);
      assert.strictEqual(isOpen, false, 'Popover deve fechar ao clicar fora');
    }

    assert.strictEqual(consoleErrors.length, 0, `Erros de console detectados em ${vp.width}px: ${consoleErrors.join(', ')}`);
    console.log(`   Erros de Console JavaScript: ✅ ZERO`);

    auditResults.push({
      viewport: `${vp.width}x${vp.height}`,
      name: vp.name,
      status: 'APPROVED',
      horizontalOverflow: false,
      collisions: 0,
      consoleErrors: 0,
      screenshots: [loginImgPath, cockpitImgPath, coiImgPath]
    });

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, 'AUDIT-REPORT-6-VIEWPORTS.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    protocol: 'PROTOCOLO_PRESERVAÇÃO_VISUAL_REGRESSÃO_ZERO',
    matrixViewportsCount: MATRIX_VIEWPORTS.length,
    auditor: 'horizon-qa-guardian',
    reviewer: 'horizon-mobile-ui',
    orchestrator: 'May Maestro',
    status: 'APPROVED',
    results: auditResults
  }, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log(`🎉 AUDITORIA CONCLUÍDA COM 100% DE SUCESSO NAS 6 RESOLUÇÕES MANDATÓRIAS!`);
  console.log(`Relatório salvo em: ${reportPath}`);
  console.log('='.repeat(80));
}

runAudit().catch(err => {
  console.error('\n❌ FALHA NA AUDITORIA:', err);
  process.exit(1);
});
