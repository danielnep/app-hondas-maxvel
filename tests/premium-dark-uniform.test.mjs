import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const premium=read('assets/maxvel-premium-system-20261014.css');
const glass=read('assets/central-glass-20261014.css');
const flow=read('assets/rondas-pro-flow-20261014.css');
const index=read('index.html'),central=read('central.html'),sw=read('sw.js');
test('Grafite uniforme sem degradês e com identidade Maxvel',()=>{
 for(const token of ['--mxp-red:#f5223d','--mxp-cyan:#38bdf8','--mxp-canvas:#09090b','--mxp-r-sm:7px','--mxp-r-md:10px','--mxp-r-lg:14px'])
  assert.ok(premium.includes(token),token);
 for(const source of [premium,glass,flow])assert.ok(!source.includes('linear-gradient('),'Superfícies foscas não usam gradientes decorativos');
});
test('Cinco abas alinhadas e pessoas sem cards internos',()=>{
 assert.ok(premium.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
 assert.ok(premium.includes('.v4-team-list'));
 assert.ok(premium.includes('.v4-team-row'));
 assert.ok(premium.includes('.v4-pane:not(.v4-map-pane)'));
 assert.ok(premium.includes('border-bottom:1px solid var(--mxp-rule)!important'));
 assert.ok(premium.includes('border:1px solid var(--mxp-rule)!important;border-radius:10px!important'));
 assert.ok(premium.includes('border-radius:7px!important'));
});
test('Pânico e fluxo map-first preservados',()=>{
 assert.ok(flow.includes('overflow:visible!important'));
 assert.ok(flow.includes('position:fixed!important'));
 assert.ok(premium.includes('.ops-panic,.field-torch-fab'));
});
test('Revisão e cache carregados no app e central',()=>{
 assert.ok(index.includes('rondas-pro-flow-20261014.css?v=3'));
 assert.ok(index.includes('maxvel-premium-system-20261014.css?v=3'));
 assert.ok(central.includes('central-glass-20261014.css?v=2'));
 assert.ok(central.includes('maxvel-premium-system-20261014.css?v=3'));
 assert.ok(sw.includes('rondas-pro-interface-v\d+'));
});
