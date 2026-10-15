import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('assets/maxvel-premium-system-20261014.css');
const web=read('index.html'),central=read('central.html'),sw=read('sw.js');
const old=read('assets/rondas-pro-flow-20261014.css');
test('Premium Dark aplicado às duas entradas do sistema e atualizado na PWA',()=>{
 assert.match(web,/maxvel-premium-system-20261014\.css\?v=3/);
 assert.match(central,/maxvel-premium-system-20261014\.css\?v=3/);
 assert.match(sw,/maxvel-premium-system-20261014\.css/);
 assert.match(sw,/rondas-pro-interface-v34/);
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
