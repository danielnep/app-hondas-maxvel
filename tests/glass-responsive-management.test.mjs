import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const theme=read('assets/theme.css');
const central=read('src/central.js');
const index=read('index.html');
const centralPage=read('central.html');
const glassSection=theme.slice(theme.indexOf('/* Responsive geometry of the approved Glass UI'));

test('a versão aprovada Glass UI permanece como base visual do projeto',()=>{
  assert.match(theme,/--rp-glass:\s*rgba\(27,37,46,\.67\)/);
  assert.match(theme,/--rp-blue:\s*#53bcff/);
  assert.match(theme,/\.rp-theme \.chat-bubble\.is-mine/);
  assert.match(index,/assets\/theme\.css/);
  assert.match(centralPage,/assets\/theme\.css/);
});

test('adaptação de gestão não altera geometria das telas de campo',()=>{
  assert.ok(glassSection.includes('body.rp-theme[data-rp-field="false"]'));
  assert.doesNotMatch(glassSection,/data-rp-field="true"/);
  assert.match(glassSection,/grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(glassSection,/\.rp-event-columns/);
  assert.match(glassSection,/\.ops-monitor-columns/);
  assert.match(glassSection,/\.chat-workspace/);
  assert.match(glassSection,/overflow-x:\s*auto/);
  assert.doesNotMatch(glassSection,/(?:background-color|--rp-blue|--rp-red|font-family):\s*#[0-9a-f]{3,8}/i);
});

test('drawer da Central fecha por comando, clique fora e Escape',()=>{
  assert.match(central,/data-close-central-menu/);
  assert.match(central,/openedNavigation\.classList\.remove\('is-open'\)/);
  assert.match(central,/if\(e\.key!=='Escape'\)return/);
  assert.match(central,/trigger\?\.focus\(\)/);
  assert.match(theme,/\.rp2-role-nav\.is-open/);
  assert.match(theme,/\.rp2-nav-dismiss/);
});

test('estrutura mantém viewport fluida sem divisões entre mobile e desktop',()=>{
  assert.match(index,/width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.match(centralPage,/width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.match(glassSection,/@media \(max-width: 900px\)/);
  assert.match(glassSection,/@media \(max-width: 520px\)/);
  assert.match(glassSection,/body\.rp-theme\[data-rp-field="false"\] #central-root \.side\.rp2-role-nav/);
});
