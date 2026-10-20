import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/app.js');
const css=readStyles('inspector-patrol-parity-20261016');
const wizard=read('src/wizard.js');
const index=read('index.html');

test('administração alterna panes reais no desktop, resumo agrega e supervisão preserva paralelismo',()=>{
 assert.match(app,/wideDesktop\.matches&&\(user\.role!=='admin'\|\|selected==='resumo'\)/);
 assert.match(app,/node\.hidden=!multiple&&id!==selected/);
 assert.match(app,/v4-desktop-focus/);
 assert.match(app,/shell\.dataset\.activePane=selected/);
 assert.match(css,/v4-desktop-focus \.v4-stage>\.v4-pane\[hidden\]/);
 assert.match(css,/display:none!important/);
 assert.match(css,/v4-wide-workspace \.v4-dashboard-tabs/);
});
test('COI usa grid desktop e eventos não ficam com altura mínima sem conteúdo',()=>{
 assert.match(app,/rp-coi-desktop-grid/);
 assert.match(css,/\.rp-event-columns>\.rp-event-column/);
 assert.match(css,/min-height:0!important;height:auto!important;max-height:none!important/);
 assert.match(css,/\.rp-coi-desktop-grid/);
});
test('solicitação de vistoria tem rolagem nos campos e ação fixa visível',()=>{
 assert.match(app,/class="rp-request-fields"/);
 assert.match(app,/name="instructions" required minlength="10"/);
 assert.match(app,/Enviar solicitação/);
 assert.match(css,/demo-inspection-request \.rp-request-fields/);
 assert.match(css,/demo-inspection-request \.modal-actions/);
 assert.match(css,/flex:0 0 auto!important/);
});
test('apagar dados locais exige disclosure e confirmação preexistente',()=>{
 assert.match(app,/rp-data-danger-zone/);
 assert.match(app,/rp-history-danger/);
 assert.match(app,/window\.confirm\('Apagar '/);
 assert.match(app,/if\(act==='clear-prompt'\).*showDialog/s);
 assert.match(app,/if\(act==='confirm-clear'\)/);
});
test('programação tem seleção legível e mensagens de erro próximas aos campos',()=>{
 assert.match(wizard,/data-wizard-feedback role="alert" hidden/);
 assert.match(wizard,/wizardError\('Marque ao menos um ponto/);
 assert.match(wizard,/wizardError\('Informe latitude e longitude/);
 assert.match(css,/\.wizard-watchers\{/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});
test('CSS corretivo permanece carregado no último slot da demonstração',()=>{
 const name='field.css';
 assert.ok(index.includes(name));
 assert.ok(index.indexOf(name)>index.indexOf('mobile-critical.css'));
});

test('mapa de seleção permanece contido e os botões de endereço e coordenadas não recebem eventos do Leaflet',()=>{
 assert.match(css,/#dialog\[open\] \.round-wizard #wizard-map\{/);
 assert.match(css,/position:relative!important;isolation:isolate!important/);
 assert.match(css,/min-height:235px!important/);
 assert.match(css,/#dialog\[open\] \.round-wizard \.wizard-coordinates\{/);
 assert.match(css,/position:relative!important;z-index:2!important/);
});
