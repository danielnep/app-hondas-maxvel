import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=file('assets/ronda-pro.css');
const theme=file('assets/theme.css');
const wizard=file('src/dispatch-wizard.js');
const app=file('src/app.js');
const index=file('index.html');
const serviceWorker=file('sw.js');

test('mobile: gestão e formulários recuperam rolagem e campo conserva viewport',()=>{
  assert.match(layout,/html,body\{height:auto!important;min-height:100%!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important/);
  assert.match(layout,/body\[data-rp-field="true"\]\{height:100dvh!important;max-height:100dvh!important;overflow:hidden!important/);
  assert.match(layout,/body:not\(\[data-rp-field="true"\]\) \.dashboard \.app-content:not\(\.ronda-page\)\{display:block!important/);
  assert.match(layout,/\.dashboard \.schedule-list\{[^}]*overflow-y:auto!important/);
  assert.match(layout,/\.dashboard \.ops-alert-list\{[^}]*overflow-y:auto!important/);
  assert.match(layout,/\.ux-ronda-stage>\[data-ux-subpage\]\{[^}]*overflow-y:auto!important/);
  assert.match(layout,/dialog\{[^}]*overflow-y:auto!important/);
  assert.match(layout,/\.dashboard \.ronda-page \.patrol-action-body\{[^}]*overflow-y:auto!important/);
});

test('Glass Maxvel: botões principais não retornam a blocos opacos',()=>{
  assert.match(theme,/--rp-glass:\s*rgba\(27,37,46,\.67\)/);
  assert.match(theme,/\.rp-theme \.dashboard \.rp-plan-secondary\{[^}]*background:var\(--rp-glass\)!important/);
  assert.match(theme,/\.rp-theme \.dashboard \.rp-plan-next,[^{]+\{[^}]*rgba|\.rp-theme \.dashboard \.rp-plan-next,[^{]+\{[^}]*#[0-9a-f]{8}/i);
  assert.match(theme,/\.rp-theme #dialog \.rp-dispatch-back\{[^}]*background:var\(--rp-glass\)!important/);
  assert.match(theme,/\.rp-theme #dialog :is\(\.rp-dispatch-next,\.rp-dispatch-submit\)\{[^}]*rgba\(/);
});

test('a solicitação principal de ronda atende o vigia sem apagar o Vistoriador',()=>{
  assert.match(wizard,/w\.role==='ronda'&&w\.active/);
  assert.match(wizard,/kind:'ronda'/);
  assert.match(wizard,/Solicitar início de ronda/);
  assert.doesNotMatch(wizard,/vistor(?:ia|iador)/i);
  assert.match(app,/data-action="dispatch-open">Solicitar ronda/);
  assert.match(app,/act==='inspector-create'/);
  assert.match(app,/role==='vistoriador'/);
});

test('atualização PWA entrega mudanças de CSS e JS em mobile',()=>{
  assert.match(index,/ronda-pro\.css\?v=53/);
  assert.match(index,/theme\.css\?v=61/);
  assert.match(index,/app\.js\?v=76/);
  assert.match(serviceWorker,/rondas-pro-interface-v72/);
});
