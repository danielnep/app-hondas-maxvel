import {chromium} from '/opt/horizon-romaneio-gptoss/node_modules/playwright-core/index.mjs';

const CHROME = process.env.CHROME_BIN || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE_URL = 'https://maxvel.hzsys.tech';
const ARTIFACT_DIR = '/root/.local/share/horizon-antigravity-account/.gemini/antigravity-cli/brain/a4833dd9-da69-4a05-a632-c9d75e54adf4';

async function runAudit() {
  console.log('=== VERIFICAÇÃO UI/UX MOBILE · CHAT WHATSAPP PARITY & SOS EXCLUSIVO NO MAPA ===');
  console.log('Dispositivo: Samsung Galaxy A53 (412x915, DPR 2.625)');

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

  // 1. Acesso autenticado à central
  console.log('1. Acessando central e autenticando como ronda...');
  await page.goto(`${BASE_URL}/central.html`, {waitUntil: 'networkidle'});
  await page.locator('#central-login [name=email]').fill('ronda@rondapro.local');
  await page.locator('#central-login [name=password]').fill('Maxvel@2026');
  await page.locator('#central-login button').click();
  await page.waitForSelector('#guard-real-map', {timeout: 10000});
  await page.waitForTimeout(1200);

  // 2. Tela do Mapa: verificar presença do botão SOS flutuante
  console.log('2. Verificando presença do botão SOS na tela do mapa...');
  const mapState = await page.evaluate(() => {
    const sos = document.querySelector('#central-panic');
    const s = sos ? window.getComputedStyle(sos) : null;
    const r = sos ? sos.getBoundingClientRect() : null;
    return {
      sosExists: !!sos,
      sosVisible: s ? s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' : false,
      sosDisplay: s?.display,
      sosPosition: s?.position,
      rect: r ? {x: r.x, y: r.y, width: r.width, height: r.height} : null
    };
  });
  console.log('Estado do Mapa & SOS:', JSON.stringify(mapState, null, 2));
  if (!mapState.sosVisible) throw new Error('SOS deve estar visível no mapa operacional!');
  await page.screenshot({path: `${ARTIFACT_DIR}/verify_01_map_with_sos.png`});

  // 3. Abrir Menu Lateral e clicar em "Chat interno"
  console.log('3. Abrindo Menu Lateral e navegando para Chat interno...');
  await page.locator('[data-central-menu]').click();
  await page.waitForTimeout(500);

  // Abrir o accordion "Mais áreas" para revelar o botão de Chat
  await page.evaluate(() => {
    const details = document.querySelector('.ronda-menu-more-details');
    if (details) details.open = true;
  });
  await page.waitForTimeout(300);

  await page.locator('button[data-page="chat"]').click();
  await page.waitForTimeout(1500);

  // 4. Verificar Lista de Conversas: Single-Column, SEM coluna direita vazia, SEM botão de pânico
  console.log('4. Verificando Lista de Conversas no Chat...');
  const chatListState = await page.evaluate(() => {
    const sos = document.querySelector('#central-panic');
    const sosStyle = sos ? window.getComputedStyle(sos) : null;
    const sosVisible = sos ? (sosStyle.display !== 'none' && sosStyle.visibility !== 'hidden' && Number(sosStyle.opacity) > 0) : false;

    const sidebar = document.querySelector('.chat-sidebar');
    const main = document.querySelector('.chat-main');
    const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
    const mainStyle = main ? window.getComputedStyle(main) : null;
    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;

    const convButtons = Array.from(document.querySelectorAll('.chat-conversation'));
    return {
      sosVisibleOnChat: sosVisible,
      sosComputedDisplay: sosStyle?.display,
      sidebarWidth: sidebarRect?.width,
      sidebarDisplay: sidebarStyle?.display,
      mainDisplay: mainStyle?.display,
      isMainHidden: mainStyle?.display === 'none',
      conversationCount: convButtons.length
    };
  });
  console.log('Estado da Lista de Conversas:', JSON.stringify(chatListState, null, 2));
  if (chatListState.sosVisibleOnChat) throw new Error('ERRO: Botão de SOS está visível sobre a lista de conversas do chat!');
  if (!chatListState.isMainHidden) throw new Error('ERRO: Coluna vazia chat-main não está oculta na lista de conversas!');
  await page.screenshot({path: `${ARTIFACT_DIR}/verify_02_chat_list_single_column_no_sos.png`});

  // 5. Clicar em uma conversa para abrir a thread
  console.log('5. Clicando na primeira conversa para abrir a thread...');
  const firstConv = page.locator('[data-chat-open]').first();
  await firstConv.click();
  await page.waitForTimeout(1200);

  // 6. Verificar Thread da Conversa: Single-Column, chamadas discretas, sem botão de pânico
  console.log('6. Verificando Thread da Conversa...');
  const chatThreadState = await page.evaluate(() => {
    const sos = document.querySelector('#central-panic');
    const sosStyle = sos ? window.getComputedStyle(sos) : null;
    const sosVisible = sos ? (sosStyle.display !== 'none' && sosStyle.visibility !== 'hidden' && Number(sosStyle.opacity) > 0) : false;

    const sidebar = document.querySelector('.chat-sidebar');
    const main = document.querySelector('.chat-main');
    const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
    const mainStyle = main ? window.getComputedStyle(main) : null;
    const mainRect = main ? main.getBoundingClientRect() : null;

    const callAudio = document.querySelector('button[data-chat-call="audio"]');
    const callVideo = document.querySelector('button[data-chat-call="video"]');
    const callAudioText = callAudio?.innerText?.trim();
    const callVideoText = callVideo?.innerText?.trim();

    const backBtn = document.querySelector('button[data-chat-back]');
    const composer = document.querySelector('.chat-composer');
    const compRect = composer ? composer.getBoundingClientRect() : null;

    return {
      sosVisibleOnThread: sosVisible,
      sidebarDisplay: sidebarStyle?.display,
      isSidebarHidden: sidebarStyle?.display === 'none',
      mainWidth: mainRect?.width,
      hasDiscreetAudioBtn: !!callAudio,
      hasDiscreetVideoBtn: !!callVideo,
      callAudioHasBulkyText: callAudioText && callAudioText.length > 0,
      callVideoHasBulkyText: callVideoText && callVideoText.length > 0,
      hasBackBtn: !!backBtn,
      composerAtBottom: compRect ? compRect.bottom <= 915 : false
    };
  });
  console.log('Estado da Thread da Conversa:', JSON.stringify(chatThreadState, null, 2));
  if (chatThreadState.sosVisibleOnThread) throw new Error('ERRO: Botão de SOS está visível sobre a conversa do chat!');
  if (!chatThreadState.isSidebarHidden) throw new Error('ERRO: Sidebar de conversas não está oculta dentro da thread!');
  if (chatThreadState.callAudioHasBulkyText || chatThreadState.callVideoHasBulkyText) {
    throw new Error('ERRO: Botões de chamada não devem conter texto chamativo, devem ser ícones discretos!');
  }
  await page.screenshot({path: `${ARTIFACT_DIR}/verify_03_chat_thread_whatsapp_style.png`});

  // 7. Voltar para a lista de conversas pelo botão ←
  console.log('7. Clicando no botão ← para voltar à lista de conversas...');
  await page.locator('button[data-chat-back]').click();
  await page.waitForTimeout(800);

  const returnedToList = await page.evaluate(() => {
    const sidebar = document.querySelector('.chat-sidebar');
    const main = document.querySelector('.chat-main');
    return {
      sidebarDisplay: sidebar ? window.getComputedStyle(sidebar).display : null,
      mainDisplay: main ? window.getComputedStyle(main).display : null
    };
  });
  console.log('Retorno para a Lista:', JSON.stringify(returnedToList, null, 2));
  await page.screenshot({path: `${ARTIFACT_DIR}/verify_04_back_to_conv_list.png`});

  // 8. Voltar para o mapa
  console.log('8. Clicando em Voltar ao mapa...');
  const backToMap = page.locator('button.ronda-chat-back-to-map');
  await backToMap.click();
  await page.waitForTimeout(1000);

  // 9. Verificar que voltou ao mapa e que o SOS reapareceu
  console.log('9. Verificando retorno ao mapa com SOS ativo...');
  const finalMapState = await page.evaluate(() => {
    const sos = document.querySelector('#central-panic');
    const s = sos ? window.getComputedStyle(sos) : null;
    return {
      mapPresent: !!document.querySelector('#guard-real-map'),
      sosVisible: s ? s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 : false
    };
  });
  console.log('Estado Final do Mapa:', JSON.stringify(finalMapState, null, 2));
  if (!finalMapState.sosVisible) throw new Error('ERRO: SOS deve reaparecer ao retornar ao mapa operacional!');
  await page.screenshot({path: `${ARTIFACT_DIR}/verify_05_returned_to_map_with_sos.png`});

  await browser.close();
  console.log('=== SUCESSO: TODAS AS VERIFICAÇÕES MOBILE (GALAXY A53) PASSARAM COM ÊXITO! ===');
}

runAudit().catch(err => {
  console.error('Falha na auditoria:', err);
  process.exit(1);
});
