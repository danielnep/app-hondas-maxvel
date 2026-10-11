import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/horizon-operacional.css',import.meta.url),'utf8');
const start=js.indexOf('function reports(){'),stop=js.indexOf('\nfunction ',start+1),reports=js.slice(start,stop);

test('relatório calcula progresso somente com dados das rondas e eventos locais',()=>{
 assert.ok(start>0&&stop>start);
 assert.match(reports,/sessionList\(\)/);
 assert.match(reports,/recentNotification\(\)/);
 assert.match(reports,/completedAt/);
 assert.match(reports,/seenAt/);
 assert.match(reports,/item\.total\?Math\.round/);
 assert.match(reports,/não|Dados locais, sem servidor/);
});

test('relatório tem hierarquia, histórico, alertas e impressão no navegador',()=>{
 for(const token of ['report-insights-grid','report-progress-list','report-events-list','report-roster','tablePatrols(all)','Imprimir / PDF'])assert.ok(reports.includes(token),token);
 assert.match(reports,/notificationRow/);
 assert.match(js,/if\(act==='print'\)\{window\.print\(\)/);
});

test('visual desktop preserva detalhes e transparência na impressão',()=>{
 assert.match(css,/@media\(min-width:1600px\)/);
 assert.match(css,/@media print\s*\{/);
 assert.match(css,/report-roster \.table-wrap/);
 assert.match(css,/report-page \.kpi/);
 assert.match(css,/\.report-context-bar/);
 assert.match(css,/\.report-events-list/);
});
