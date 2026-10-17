import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=readStyles('maxvel-premium-system-20261014');
const web=read('index.html'),central=read('central.html'),sw=read('sw.js');
const old=readStyles('rondas-pro-flow-20261014');
test('Premium Dark aplicado às duas entradas do sistema e atualizado na PWA',()=>{
 assert.match(web,/operational\.css\?v=49/);
 assert.match(central,/operational\.css\?v=49/);
 assert.match(sw,/operational\.css/);
 assert.match(sw,/rondas-pro-interface-v\d+/);
});
test('Tokens do sistema respeitam o vermelho Maxvel, celeste, aviso e fundo escuro',()=>{
 for(const [key,hex] of [['--mxp-red','#f5223d'],['--mxp-cyan','#38bdf8'],['--mxp-alert','#f7cb35'],['--mxp-canvas','#09090b']]){
  assert.ok(css.includes(key+':'+hex),key);
 }
 assert.match(css,/\.side-link\.active/);
 assert.match(css,/\.ops-notice-dot\.panic/);
});
test('Layout cobre área autenticada e áreas da simulação sem criar nova rolagem no cockpit',()=>{
 assert.match(css,/\.app-content:not\(\.ronda-page\)/);
 assert.match(css,/#central-root \.workspace/);
 assert.match(css,/#central-root \.surface/);
 assert.match(css,/#dialog\[open\]/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/\.patrol-workspace\.sheet-collapsed \.patrol-actions\{/);
 assert.match(old,/\.checkpoint-curtain-panel/);
});
