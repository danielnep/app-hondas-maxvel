import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const premium=read('assets/maxvel-premium-system-20261014.css');
const glass=read('assets/central-glass-20261014.css');
const flow=read('assets/rondas-pro-flow-20261014.css');
const index=read('index.html'),central=read('central.html'),sw=read('sw.js');
test('Grafite uniforme sem degradês e com identidade Maxvel',()=>{
 for(const t of ['--mxp-red:#f5223d','--mxp-cyan:#38bdf8','--mxp-canvas:#09090b','--mxp-r-sm:7px','--mxp-r-md:10px','--mxp-r-lg:14px'])assert.ok(premium.includes(t),t);
 for(const source of [premium,glass,flow])assert.doesNotMatch(source,/linear-gradient\\(/);
});
test('Cinco abas alinhadas e pessoas sem cards internos',()=>{
 assert.match(premium,/grid-template-columns:repeat\\(5,minmax\\(0,1fr\\)\\)/);
 assert.match(premium,/\\.v4-team-list/);
 assert.match(premium,/\\.v4-team-row/);
 assert.match(premium,/\\.v4-pane:not\\(\\.v4-map-pane\\)/);
});
test('Pânico e fluxo map-first preservados',()=>{
 assert.match(flow,/overflow:visible!important/);
 assert.match(flow,/position:fixed!important/);
 assert.match(premium,/\\.ops-panic,\\.field-torch-fab/);
});
test('Revisão e cache carregados no app e central',()=>{
 assert.match(index,/rondas-pro-flow-20261014\\.css\\?v=3/);
 assert.match(index,/maxvel-premium-system-20261014\\.css\\?v=2/);
 assert.match(central,/central-glass-20261014\\.css\\?v=2/);
 assert.match(central,/maxvel-premium-system-20261014\\.css\\?v=2/);
 assert.match(sw,/rondas-pro-interface-v25/);
});
