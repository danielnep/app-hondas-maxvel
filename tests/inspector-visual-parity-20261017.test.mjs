import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectionCockpit} from '../src/inspection-cockpit.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=readStyles('inspector-patrol-parity-20261016');
const torch=read('src/field-torch.js');
const inspector=read('src/inspection-cockpit.js');
const index=read('index.html');
const central=read('central.html');
const sw=read('sw.js');
const demoStyles=readStyles('demo-roles');

test('vistoriador não cria segunda lanterna ao trocar de área',()=>{
 assert.match(torch,/const inspectorButton=dash\.querySelector\('\[data-inspection-cockpit\] \[data-field-tool-torch\]'\)/);
 assert.match(torch,/globalButton\?\.remove\(\)/);
 assert.match(torch,/inspectorButton\.setAttribute\('data-field-torch',''\)/);
 const html=inspectionCockpit({queue:[],mapId:'demo-inspection-map',mode:'demo'});
 assert.equal((html.match(/data-field-tool-torch/g)||[]).length,1);
});

test('estado vazio não repete avisos e mantém comandos operacionais',()=>{
 const html=inspectionCockpit({queue:[],mapId:'demo-inspection-map',mode:'demo'});
 assert.match(html,/rp-inspection-cockpit is-idle/);
 assert.match(html,/Sem destinos atribuídos/);
 assert.match(html,/Aguardando COI/);
 assert.doesNotMatch(html,/class="rp-inspection-ready"/);
 assert.match(html,/data-field-tool-alert/);
 assert.match(html,/data-field-tool-chat/);
 assert.match(html,/data-field-tool-panic/);
});

test('inspetor mantém medidas compactas da ronda no celular',()=>{
 assert.match(css,/width:min\(318px,calc\(100% - 24px\)\)!important/);
 assert.match(css,/height:57px!important;min-height:57px!important/);
 assert.match(css,/rp-inspection-cockpit\.is-idle \.rp-inspection-primary-actions/);
 assert.match(css,/rp-inspection-cockpit \.rp-inspection-panic/);
 assert.match(css,/width:56px!important;height:56px!important/);
});

test('grafite nos painéis e comunicação, perigo preserva contraste próprio',()=>{
 assert.match(css,/border-color:#414a55!important/);
 assert.match(css,/background:#191c22ee!important/);
 assert.match(css,/background:#242932ee!important/);
 assert.match(css,/background:linear-gradient\(150deg,#f93258,#b10d36\)/);
 const atelier=readStyles('maxvel-atelier-20261016');
 assert.match(atelier,/#e9edf3!important;border-color:#e9edf3!important;color:#151a20!important/);
 const unified=readStyles('field-unified-20261016');
 assert.match(readStyles('application'),/rp-field-wizard-forward/);
 assert.match(unified,/#e7edf5!important/);
 assert.match(inspector,/class="rp-inspection-torch" data-field-tool-torch/);
});

test('publicação atualiza cache PWA e ambas as páginas de campo',()=>{
 assert.match(index,/rondas-pro-updated-v59/);
 assert.match(index,/sw\.js\?v=59/);
 assert.match(sw,/rondas-pro-interface-v59/);
 for(const page of [index,central]){
  assert.match(page,/field\.css\?v=51/);
 }
});

test('minimapa da Administração contém camadas Leaflet dentro de sua própria área',()=>{
 assert.ok(demoStyles.includes('.demo-mini-route-map{position:relative;isolation:isolate;overflow:hidden;height:206px'));
 assert.ok(index.includes('ronda-pro.css?v=51'));
});
