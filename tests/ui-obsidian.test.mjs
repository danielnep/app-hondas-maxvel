import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readStyles('application');

test('UI carrega a última camada de identidade Maxvel',()=>{
 assert.match(html,/ronda-pro\.css/);
 assert.match(html,/<title>Ronda Pro · Grupo Maxvel/);
 assert.doesNotMatch(html,/(?:alt|content|title)="[^"]*Horizon/);
 assert.match(css,/--mx-red:#e52a40/);
 assert.match(css,/--mx-bg:#050505/);
});
test('marca pública no aplicativo não contém Horizon',()=>{
 assert.match(app,/aria-label="Grupo Maxvel"/);
 assert.doesNotMatch(app,/Horizon|horizon/);
 assert.match(app,/maxvel-logo\.webp/);
});
test('desktop amplo apresenta mapa e alertas simultâneos, tablet mantém abas e menu lateral',()=>{
 const visual=readStyles('maxvel-visual-2026');
 assert.match(app,/if\(screen==='landing'\)return/);
 assert.match(app,/matchMedia\('\(min-width:1280px\)'\)/);
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(css,/\.dashboard \.sidebar\{display:flex!important\}/);
 assert.match(css,/\.dashboard \.v4-stage>\.v4-pane\[hidden\]\{display:none!important\}/);
 assert.match(visual,/\.ux-wide-workspace \.ux-operations-surface\{/);
 assert.match(visual,/\.v4-wide-workspace \.v4-stage\{/);
});
test('sem paginação duplicada em relatórios e sem painéis vazios fixos',()=>{
 assert.match(app,/if\(view==='registros'\)paginateRows/);
 assert.doesNotMatch(app,/view==='registros'\|\|view==='relatorios'/);
 assert.match(app,/const uxListSizes=\(\)=>8/);
 assert.doesNotMatch(app,/if\(window\.innerHeight<720\)/);
 assert.match(css,/\.dashboard \.app-content \.ux-report-stage\{display:block!important/);
});
test('menu lateral mobile e ronda map-first mantidos',()=>{
 assert.match(app,/act==='open-mobile-menu'/);
 assert.match(css,/dialog:has\(\.ux-access-menu\)/);
 assert.match(css,/\.dashboard \.app-content\.ronda-page/);
 assert.match(app,/session-detail/);
});

test('transições breves e consistentes respeitam redução de movimento',()=>{
 assert.match(css,/--mx-motion-fast:130ms/);
 assert.match(css,/--mx-motion-medium:200ms/);
 assert.match(css,/--mx-motion-smooth:cubic-bezier/);
 assert.match(css,/@keyframes mx-drawer-in/);
 assert.match(css,/@keyframes mx-panel-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important;transition:none!important;transform:none!important/);
});
