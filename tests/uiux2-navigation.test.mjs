import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const central=read('src/central.js'),app=read('src/app.js'),curtain=read('src/checkpoint-curtain.js');
const css=read('assets/maxvel-premium-system-20261014.css'),sw=read('sw.js'),entry=read('src/location-entry-gate.js');

test('perfis conservam comandos existentes mas separam acesso frequente e áreas secundárias',()=>{
 assert.match(central,/const rp2Priority=\{/);
 for(const role of ['ronda','operador','coi','admin','master','cliente','vistoriador']){
  assert.match(central,new RegExp('\\b'+role+':\\['));
 }
 assert.match(central,/data-page/);
 assert.match(central,/aria-current="page"/);
 assert.match(central,/rp2-nav-secondary/);
 assert.match(central,/rp2GlyphPaths/);
 assert.match(central,/ops\.allowed/);
});

test('COI prioriza pessoas, tratativas, rondas e vistorias em vez de mapa genérico',()=>{
 const monitor=read('src/coi-monitor.js');
 assert.match(central,/function monitorView\(\)\{/);
 assert.match(central,/coi\.render/);
 assert.match(central,/\['treatments','Tratativas'/);
 assert.match(central,/function treatmentsView\(\)/);
 assert.match(monitor,/data-coi-tab="rondas"/);
 assert.match(monitor,/data-coi-tab="vistorias"/);
 assert.match(monitor,/coi3-record-stack/);
 assert.match(monitor,/priority=\{panic:0/);
 assert.match(monitor,/GPS recente/);
});

test('Vistoriador e Cliente preservam dados reais com organização guiada',()=>{
 assert.match(central,/rp2-inspection-checklist/);
 assert.match(central,/name="dispatchId"/);
 assert.match(central,/name="observation"/);
 assert.match(central,/rp2-client-timeline/);
 assert.match(central,/rp2-timeline-entry/);
 assert.match(central,/Acesso autenticado/);
});

test('capturas possuem miniaturas e limpeza de memória; temporizador evita leitura a cada segundo',()=>{
 assert.match(curtain,/rp2-evidence-preview-list/);
 assert.match(curtain,/URL\.createObjectURL/);
 assert.match(curtain,/URL\.revokeObjectURL/);
 assert.match(curtain,/data-evidence-count/);
 assert.match(curtain,/role="timer" aria-live="off"/);
 assert.match(curtain,/data-dwell-message role="status"/);
 assert.match(app,/role="timer" aria-live="off"/);
 assert.match(app,/aria-current="\$\{view===key\?'page':'false'\}"/);
});

test('visual transversal mantém Maxvel, layout mobile legível e movimento reduzido',()=>{
 assert.match(css,/--mxp-canvas:#09090b/);
 assert.match(css,/--mxp-red:#f5223d/);
 assert.match(css,/--mxp-cyan:#38bdf8/);
 assert.match(css,/rp2-role-nav/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(sw,/rondas-pro-interface-v31/);
 assert.match(entry,/rp2-gate-brand/);
 assert.match(entry,/maxvel-logo.webp/);
 assert.match(entry,/<svg viewBox/);
 assert.doesNotMatch(entry,/location-entry-icon[^']*⌖/);
});
