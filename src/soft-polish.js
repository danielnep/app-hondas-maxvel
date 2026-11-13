/**
 * Rondas Pro | conforto visual e rótulos compactos, sem afetar GPS,
 * autenticação, registros, permissões ou comandos de segurança.
 *
 * O texto completo é preservado no nome acessível e no tooltip.
 */
const SHORTHAND = Object.freeze({
  'app-nav': Object.freeze({
    'Minha ronda':'Ronda', 'Meu histórico':'Hist.', 'Monitoramento':'GPS',
    'Ocorrências':'Ocorr.', 'Configurações':'Config.',
    'Visão geral':'Geral', 'Relatórios':'Relat.', 'Equipe':'Equipe', 'Vigias':'Vigias'
  }),
  'app-tabs': Object.freeze({
    'Visão geral':'Geral', 'Monitoramento':'GPS', 'Notificações':'Alertas',
    'Ocorrências':'Ocorr.', 'Configurações':'Config.', 'Relatórios':'Relat.',
    'Histórico de rondas':'Histórico', 'Meu histórico':'Hist.',
    'Análise e insights':'Análise', 'Programações':'Agenda'
  }),
  'paging': Object.freeze({'Anterior':'‹', 'Próximo':'›', 'Próxima':'›'}),
  'app-header': Object.freeze({'Áreas':'Áreas'}),
  'central-nav': Object.freeze({
    'Minha ronda':'Ronda', 'Meu histórico':'Hist.', 'Avisar equipe':'Avisar',
    'Monitoramento':'GPS', 'Alertas e ocorrências':'Alertas',
    'Indicadores':'Dados', 'Ocorrências':'Ocorr.', 'Colaboradores':'Equipe',
    'Alertas e e-mails':'Avisos', 'Relatórios':'Relat.'
  }),
  'central-toolbar': Object.freeze({
    'Atualizar':'↻', 'Abrir todas':'Todas', 'Analisar colaboradores':'Equipe',
    'Histórico completo':'Hist.', 'Tratar ocorrências':'Tratar',
    'Enviar alerta':'Avisar'
  })
});

/** Exportação sem dependências do navegador para testes de regressão. */
export function compactLabelFor(area, fullLabel) {
  const text = String(fullLabel ?? '').trim().replace(/\s+/g, ' ');
  return SHORTHAND[area]?.[text] ?? null;
}

function areaFor(button) {
  if (button.closest('#central-root .side')) return 'central-nav';
  if (button.closest('#central-root .toolbar')) return 'central-toolbar';
  if (button.closest('.dashboard .schedule-pagination')) return 'paging';
  if (button.closest('.dashboard .app-header .header-actions')) return 'app-header';
  if (button.matches('.dashboard .side-link, .dashboard .mobile-nav [data-view]')) return 'app-nav';
  if (button.closest('.dashboard .v4-dashboard-tabs, .dashboard .ux-report-tabs, .dashboard .ux-ronda-tabs')) return 'app-tabs';
  return null;
}

function compactButton(button) {
  if (button.dataset.rpCompactReady === '1') return;
  const area = areaFor(button);
  if (!area) return;

  // Somente rótulos de navegação e ferramentas secundárias. Nunca ação crítica.
  if (button.matches('.ops-panic, .primary, .danger, [data-action="start"], [data-action="complete-point"]')) return;
  const textNodes = Array.from(button.childNodes).filter(node => node.nodeType === 3 && node.textContent.trim());
  if (textNodes.length !== 1) return;
  const source = textNodes[0];
  const full = source.textContent.trim().replace(/\s+/g, ' ');
  const short = compactLabelFor(area, full);
  if (!short || short === full) return;

  const longElement = document.createElement('span');
  longElement.className = 'rp-label-long';
  longElement.textContent = full;
  const shortElement = document.createElement('span');
  shortElement.className = 'rp-label-short';
  shortElement.textContent = short;
  shortElement.setAttribute('aria-hidden', 'true');

  source.replaceWith(longElement, shortElement);
  if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', full);
  if (!button.hasAttribute('title')) button.setAttribute('title', full);
  button.classList.add('rp-compact-label');
  button.dataset.rpCompactReady = '1';
}

export function installSoftPolish() {
  const observedRoot = document.querySelector('#app') || document.querySelector('#central-root');
  if (!observedRoot) return;
  let lastView = '';
  let scheduled = false;
  function decorate() {
    scheduled = false;
    observedRoot.querySelectorAll('button').forEach(compactButton);
    const app = observedRoot.querySelector('.dashboard');
    const active = app?.querySelector('.side-link.active');
    const central = document.querySelector('#central-root');
    const view = app?.querySelector('.app-content') || central?.querySelector('.content');
    const role = app?.querySelector('.user-pill .avatar')?.textContent || document.querySelector('#current-role')?.textContent || '';
    const key = app ? 'app:' + role + ':' + (active?.dataset.view || '') :
      central ? 'central:' + role + ':' + (central.querySelector('.side button.active')?.dataset.page || '') : '';
    if (view && key && key !== lastView) {
      view.classList.add('rp-soft-view-enter');
      lastView = key;
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(decorate);
  }
  // A aplicação troca telas dinamicamente; não capturamos cliques nem substituímos handlers.
  const observer = new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length || record.removedNodes.length)) schedule();
  });
  observer.observe(observedRoot, {subtree:true, childList:true});
  schedule();
}

/**
 * Mobile Fluid Touch Gestures & Tactile Micro-Interactions Engine
 * Provides Edge-Swipe Navigation, Sheet Pulling, Dialog Dismiss & Haptics.
 */
export function triggerHaptic(type = 'tap') {
  if (typeof window === 'undefined') return;
  const duration = type === 'sos' ? 45 : type === 'medium' ? 22 : type === 'success' ? 30 : 10;
  if (window.AndroidTracking?.vibrate) {
    try { window.AndroidTracking.vibrate(duration); return; } catch {}
  }
  if (navigator.vibrate) {
    try {
      const pattern = type === 'sos' ? [40, 60, 40] :
                      type === 'success' ? [15, 30, 20] :
                      type === 'medium' ? [20] : [10];
      navigator.vibrate(pattern);
    } catch {}
  }
}

export function installMobileGestures() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  window.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }, {passive: true});

  window.addEventListener('touchend', e => {
    if (e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const deltaX = t.clientX - touchStartX;
    const deltaY = t.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (deltaTime > 650) return; // ignore long-press or slow drags

    const nav = document.querySelector('#central-navigation, .side.rp2-role-nav');
    const isNavOpen = nav?.classList.contains('is-open');

    // 1. Edge-swipe right to open navigation drawer (from left bezel)
    if (!isNavOpen && touchStartX <= 38 && deltaX >= 55 && absY < 45) {
      const menuTrigger = document.querySelector('[data-central-menu], .side-toggle');
      if (menuTrigger) menuTrigger.click();
      else nav?.classList.add('is-open');
      navigator.vibrate?.([10]);
      return;
    }

    // 2. Swipe left to dismiss navigation drawer
    if (isNavOpen && deltaX <= -50 && absY < 50) {
      const dismiss = document.querySelector('[data-close-central-menu]');
      if (dismiss) dismiss.click();
      else nav?.classList.remove('is-open');
      navigator.vibrate?.([8]);
      return;
    }

    // 3. Swipe down to dismiss active modal dialogs (Chat, Panic, Occurrences)
    const openDialog = document.querySelector('dialog[open], .rp-field-chat-overlay[open], #central-panic-dialog[open]');
    if (openDialog && touchStartY <= 180 && deltaY >= 60 && absX < 45) {
      const closeBtn = openDialog.querySelector('[data-dialog-close], .chat-dialog-close, button[data-action="cancel"], .dialog-close');
      if (closeBtn) closeBtn.click();
      else if (typeof openDialog.close === 'function') openDialog.close();
      navigator.vibrate?.([8]);
      return;
    }

    // 4. Swipe up/down on bottom sheet cockpit header
    const cockpit = document.querySelector('.rp-guard-quick-panel, [data-guard-cockpit]');
    if (cockpit) {
      const rect = cockpit.getBoundingClientRect();
      const inHeader = touchStartY >= rect.top && touchStartY <= rect.top + 75 && touchStartX >= rect.left && touchStartX <= rect.right;
      if (inHeader) {
        const toggle = cockpit.querySelector('.rp-guard-panel-toggle, [data-guard-toggle]');
        if (deltaY < -35 && absX < 40) {
          // Swipe up -> expand
          if (cockpit.getAttribute('aria-expanded') !== 'true') {
            toggle?.click();
            navigator.vibrate?.([10]);
          }
        } else if (deltaY > 35 && absX < 40) {
          // Swipe down -> collapse
          if (cockpit.getAttribute('aria-expanded') === 'true') {
            toggle?.click();
            navigator.vibrate?.([10]);
          }
        }
      }
    }
  }, {passive: true});

  // Position mobile popovers cleanly and exclusively
  document.addEventListener('toggle', (e) => {
    if (e.target.matches?.('.rp-header-popover') && e.target.open) {
      document.querySelectorAll('.rp-header-popover[open]').forEach(d => {
        if (d !== e.target) d.open = false;
      });
      const pop = e.target.querySelector('.rp-popover-list');
      if (pop && window.innerWidth <= 768) {
        pop.style.setProperty('position', 'fixed', 'important');
        pop.style.setProperty('left', '12px', 'important');
        pop.style.setProperty('right', '12px', 'important');
        pop.style.setProperty('width', 'auto', 'important');
        pop.style.setProperty('max-width', 'calc(100vw - 24px)', 'important');
        pop.style.setProperty('top', 'calc(64px + env(safe-area-inset-top, 0px))', 'important');
        pop.style.setProperty('z-index', '10050', 'important');
        pop.style.setProperty('background', '#191919', 'important');
        pop.style.setProperty('border', '1px solid #535353', 'important');
      }
    }
  }, true);

  // Tap outside drawer or popover to close
  window.addEventListener('pointerdown', e => {
    const clickedSummary = e.target.closest('.rp-header-popover > summary');
    const openPopovers = document.querySelectorAll('.rp-header-popover[open]');
    
    if (clickedSummary) {
      const parentDetails = clickedSummary.closest('.rp-header-popover');
      openPopovers.forEach(d => {
        if (d !== parentDetails) d.open = false;
      });
    } else {
      openPopovers.forEach(d => {
        if (!d.contains(e.target)) d.open = false;
      });
    }

    const nav = document.querySelector('#central-navigation, .side.rp2-role-nav');
    if (nav?.classList.contains('is-open')) {
      if (!nav.contains(e.target) && !e.target.closest('[data-central-menu], .side-toggle')) {
        const dismiss = document.querySelector('[data-close-central-menu]');
        if (dismiss) dismiss.click();
        else {
          nav.classList.remove('is-open');
          document.querySelector('[data-central-menu]')?.setAttribute('aria-expanded', 'false');
        }
        navigator.vibrate?.([6]);
      }
    }

    // Tactile haptic feedback on tactical action buttons & interactive controls
    const interactive = e.target.closest('button, a, .ronda-chip, .rp-agent-menu-item, .ronda-menu-item, .rp-sheet-tool-card, input[type=checkbox]');
    if (interactive) {
      if (interactive.matches('#central-panic, .ronda-btn-sos, .rp-btn-sos')) {
        triggerHaptic('sos');
      } else if (interactive.matches('.ronda-btn-torch, .rp-btn-torch, .rp-guard-panel-toggle, .rp-sheet-drag-btn, .field-torch-fab, [data-central-menu]')) {
        triggerHaptic('medium');
      } else if (interactive.matches('[data-action="complete-point"], [data-action="start"], .rp-inspection-main-action')) {
        triggerHaptic('success');
      } else {
        triggerHaptic('tap');
      }
    }
  }, {passive: true});
}

if (typeof document !== 'undefined') {
  installSoftPolish();
  installMobileGestures();
}
