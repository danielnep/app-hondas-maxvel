import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/ronda-pro.css',import.meta.url),'utf8');

test('UI carrega a última camada de identidade Maxvel',()=>{
 assert.match(html,/ronda-pro\.css/);
 assert.match(html,/<title>Rondas Pro · Grupo Maxvel/);
 assert.doesNotMatch(html,/(?:alt|content|title)="[^"]*Horizon/);
 assert.match(css,/--mx-red:#e52a40/);
 assert.match(css,/--mx-bg:#050505/);
});
test('marca pública no aplicativo não contém Horizon',()=>{
 assert.match(app,/aria-label="Grupo Maxvel"/);
 assert.doesNotMatch(app,/Horizon|horizon/);
 assert.match(app,/maxvel-logo\.webp/);
});
test('desktop usa abas únicas e tem menu lateral',()=>{
 assert.match(app,/if\(screen==='landing'\)return; \/\/ Desktop/);
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(css,/\.dashboard \.sidebar\{display:flex!important\}/);
 assert.match(css,/\.dashboard \.v4-stage>\.v4-pane\[hidden\]\{display:none!important\}/);
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
