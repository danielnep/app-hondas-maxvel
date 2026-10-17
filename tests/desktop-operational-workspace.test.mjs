import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/maxvel-visual-2026.css',import.meta.url),'utf8');

test('desktop amplo exibe painéis simultâneos sem retirar abas do mobile/tablet',()=>{
 assert.match(app,/matchMedia\('\(min-width:1280px\)'\)/);
 assert.match(app,/shell\.classList\.toggle\('v4-wide-workspace',multiple\)/);
 assert.match(app,/root\.classList\.toggle\('ux-wide-workspace',multiple\)/);
 assert.match(app,/node\.hidden=!multiple&&id!==selected/);
 assert.match(app,/const multiple=wideDesktop\.matches&&\(user\.role!=='admin'\|\|selected==='resumo'\)/);
 assert.match(app,/shell\.classList\.toggle\('v4-desktop-focus',wideDesktop\.matches&&!multiple\)/);
 assert.match(app,/node\.setAttribute\('aria-hidden',String\(node\.hidden\)\)/);
 assert.match(app,/nodes\[key\]\.hidden=!multiple&&selected\(\)!==key/);
 assert.match(app,/cleanupLayoutBreakpoint\(\)/);
 assert.match(css,/@media \(min-width:1280px\)/);
 assert.match(css,/\.v4-wide-workspace \.v4-stage\{/);
 assert.match(css,/\.ux-wide-workspace \.ux-operations-surface\{/);
});

test('mapa, alertas, equipe e indicadores têm regiões distintas no desktop',()=>{
 for(const name of ['v4-map-pane','v4-alerts-pane','v4-team-pane','v4-summary-pane','v4-insights-pane']){
  assert.ok(css.includes(name),'Ausente: '+name);
 }
 assert.match(css,/grid-template-columns:minmax\(0,1\.65fr\) minmax\(315px,\.9fr\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.55fr\) minmax\(320px,\.9fr\)/);
 assert.match(css,/scrollbar-width:thin/);
 assert.match(css,/:focus-visible/);
});

test('desktop e mobile identificam o posto e mantêm declaração de dados fictícios',()=>{
 assert.match(app,/v4-site-context/);
 assert.match(app,/ops-site-context/);
 assert.match(app,/Posto em foco/);
 assert.match(app,/Dados deste navegador · Cenário fictício/);
 assert.match(app,/Dados deste ambiente de avaliação/);
});
