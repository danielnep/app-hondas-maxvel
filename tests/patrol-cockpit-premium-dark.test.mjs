import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const css=readFileSync(new URL('../assets/rondas-pro-flow-20261014.css',import.meta.url),'utf8');
const curtain=readFileSync(new URL('../src/checkpoint-curtain.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Ronda mobile não possui nova rolagem no cockpit recolhido',()=>{
 assert.match(css,/\.patrol-workspace\.sheet-collapsed \.patrol-actions\{[\s\S]*?overflow:visible!important/);
 assert.match(css,/\.patrol-workspace\.sheet-collapsed \.patrol-action-body\{[\s\S]*?overflow:visible!important/);
 assert.match(css,/\.rondas-directions-links\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('Relógio usa cortina sobreposta e formulário interno recuperável',()=>{
 assert.match(css,/\.checkpoint-curtain\{[\s\S]*?position:fixed!important/);
 assert.match(css,/\.checkpoint-curtain-panel\{[\s\S]*?overflow:hidden!important/);
 assert.match(css,/\.checkpoint-curtain-panel \.checkpoint-condition\{[\s\S]*?overflow-y:auto!important/);
 assert.match(curtain,/classList\.toggle\('is-ready',remain===0\)/);
});
test('Paleta institucional, atalho de pânico e cache atualizado',()=>{
 assert.match(css,/--rp-maxvel-red:#f5223d/);
 assert.match(css,/--rp-cyan-current:#38bdf8/);
 assert.match(css,/\.checkpoint-utility-row>\.checkpoint-panic\{/);
 assert.match(index,/rondas-pro-flow-20261014\.css\?v=2/);
});
