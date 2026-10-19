import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectionCockpit} from '../src/inspection-cockpit.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=read('assets/inspector-patrol-parity-20261016.css');
const torch=read('src/field-torch.js');
const inspector=read('src/inspection-cockpit.js');
const index=read('index.html');
const central=read('central.html');
const sw=read('sw.js');
const demoStyles=read('assets/demo-roles.css');

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
 const atelier=read('assets/maxvel-atelier-20261016.css');
 assert.match(atelier,/#e9edf3!important;border-color:#e9edf3!important;color:#151a20!important/);
 const unified=read('assets/field-unified-20261016.css');
 assert.match(unified,/rp-field-wizard-forward\{background:#e7edf5!important;border-color:#e7edf5!important;color:#151a20!important/);
 assert.match(inspector,/class="rp-inspection-torch" data-field-tool-torch/);
});

test('publicação atualiza cache PWA e ambas as páginas de campo',()=>{
 assert.match(index,/rondas-pro-updated-v49/);
 assert.match(index,/sw\.js\?v=49/);
 assert.match(sw,/rondas-pro-interface-v49/);
 const bundled=read('assets/ronda-pro.css');
 assert.match(index,/assets\/ronda-pro\.css\?v=19/);
 for(const name of ['inspector-patrol-parity-20261016.css','maxvel-field-refinement-20261016.css'])
  assert.ok(bundled.includes('/* ORIGINAL: assets/'+name+' */'));
 assert.match(central,/inspector-patrol-parity-20261016\.css\?v=3/);
 assert.match(central,/maxvel-field-refinement-20261016\.css\?v=2/);
});

test('minimapa da Administração contém camadas Leaflet dentro de sua própria área',()=>{
 assert.ok(demoStyles.includes('.demo-mini-route-map{position:relative;isolation:isolate;overflow:hidden;height:206px'));
 assert.ok(read('assets/ronda-pro.css').includes('/* ORIGINAL: assets/demo-roles.css */'));
});
