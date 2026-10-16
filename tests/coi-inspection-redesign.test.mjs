import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/app.js'),central=read('src/central.js'),ops=read('src/ops-center-ui.js'),backend=read('server/ops-center.js'),css=read('assets/maxvel-coi-inspection-polish-20261016.css'),index=read('index.html'),centralHtml=read('central.html');

test('ícones de chat e histórico corretos na navegação demonstrativa',()=>{
 assert.match(app,/items\.push\(\['chat-interno','Chat interno','message'\]\)/);
 assert.match(app,/\['ocorrencias','Histórico de eventos','clipboard'\]/);
 assert.doesNotMatch(app,/\['chat-interno','Chat interno','bell'\]/);
});
test('eventos pendentes em colunas e histórico somente finalizado',()=>{
 assert.match(app,/const pending=demoEventNotifications\(\)\.filter\(n=>!n\.seenAt\)/);
 assert.match(app,/data-column-kind/);
 assert.match(app,/const done=demoEventNotifications\(\)\.filter\(n=>!!n\.seenAt\)/);
 assert.match(central,/const queue=events\.filter\(isPending\)/);
 assert.match(central,/const finished=events\.filter\(e=>!isPending\(e\)\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(170px,1fr\)\)/);
 assert.match(css,/border-right:1px solid #484851/);
});
test('COI autentica, solicita endereço e preserva permissões no servidor',()=>{
 assert.match(ops,/data-ops-select-inspector/);
 assert.match(ops,/name="destinationId"/);
 assert.match(ops,/name="address"/);
 assert.match(backend,/kind==='vistoria'&&clean\(data\.destinationId\)&&!dest/);
 assert.match(backend,/!availability\(\)\.some/);
 assert.match(backend,/audit\(user,'dispatch\.'\+kind\+'\.create'/);
});
test('demo comunica tarefa COI, chegada, duas provas e finalização',()=>{
 assert.match(app,/demo-inspection-request/);
 assert.match(app,/demo-inspection-arrive/);
 assert.match(app,/demo-inspection-routine/);
 assert.match(app,/data-proof="photo"/);
 assert.match(app,/data-proof="selfie"/);
 assert.match(app,/!demoProof\.photo\|\|!demoProof\.selfie/);
 assert.match(app,/saveDemoInspectionTasks/);
 assert.match(app,/Sem vistoria pendente/);
});
test('vistoriador autenticado exige duas provas e critérios, sem destino não inventa mapa',()=>{
 assert.match(central,/inspectorProof=\{photo:null,selfie:null\}/);
 assert.match(central,/data-inspection-role="photo"/);
 assert.match(central,/data-inspection-role="selfie"/);
 assert.match(central,/!inspectorProof\.photo\|\|!inspectorProof\.selfie/);
 assert.match(central,/ops\.activeInspection\(\)/);
 assert.match(central,/ops\.currentInspection\(\)/);
 assert.match(central,/data-ops-start/);
 assert.match(central,/assignment\?\.started_at\?/);
 assert.match(ops,/currentInspection:\(\)=>dispatches\.find/);
 assert.match(ops,/inspectorAssignment\?'inspections':'dispatches'/);
 assert.match(central,/Sem vistoria pendente/);
});
test('cabeçalho e popover com posicionamento absoluto, tema grafite carregado nos dois apps',()=>{
 assert.match(css,/\.rp-header-popover\s*\.rp-popover-list\{/);
 assert.match(css,/position:absolute!important/);
 assert.match(css,/--mx26-surface:#19191e/);
 assert.ok(index.includes('maxvel-coi-inspection-polish-20261016.css?v=1'));
 assert.ok(centralHtml.includes('maxvel-coi-inspection-polish-20261016.css?v=1'));
});
