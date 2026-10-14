import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const central=read('src/central.js'),app=read('src/app.js'),curtain=read('src/checkpoint-curtain.js');
const css=read('assets/maxvel-premium-system-20261014.css'),sw=read('sw.js');

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

test('COI apresenta triagem por prioridade antes da agenda',()=>{
 const flow=central.slice(central.indexOf('function monitorView()'),central.indexOf('function monitorRows('));
 assert.ok(flow.includes('priorityRank={panic:0'),'Pânico deve ser primeira prioridade');
 assert.ok(flow.indexOf('rp2-attention-queue')<flow.indexOf('ops-agenda-surface'));
 assert.match(flow,/eventList\(triage\.slice\(0,5\)\)/);
 assert.match(flow,/GPS sem leitura não prova desvio/);
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
 assert.match(sw,/rondas-pro-interface-v28/);
});
