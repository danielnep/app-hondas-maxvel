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

if (typeof document !== 'undefined') installSoftPolish();
