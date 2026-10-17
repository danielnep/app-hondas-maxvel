import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyInspectionDraft,inspectionWizardHtml} from '../src/field-inspection-wizard.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const demo=inspectionWizardHtml({...emptyInspectionDraft('1'),step:4},{demo:true});
const real=inspectionWizardHtml({...emptyInspectionDraft('1'),step:4});

test('checklist mostra ações de câmera, preserva campos de envio e não mostra seletor de arquivos',()=>{
 for(const html of [demo,real]){
  assert.match(html,/Câmera frontal/);
  assert.match(html,/Câmera traseira/);
  assert.doesNotMatch(html,/Selecionar fotos do local|Escolher arquivo|Escolher arquivos|COE/);
  assert.match(html,/Concluir vistoria e enviar ao COI/);
 }
 assert.match(demo,/data-demo-capture="selfie"/);
 assert.match(demo,/data-demo-capture="photo"/);
 assert.match(demo,/name="selfie"/);
 assert.match(demo,/name="localPhoto"/);
 assert.match(real,/data-evidence-kind="photo"/);
 assert.match(real,/data-evidence-kind="selfie"/);
});
test('câmera da demonstração e captura da operação usam mediaDevices',()=>{
 const camera=read('src/inspection-demo-camera.js'),native=read('src/media-capture.js');
 for(const text of [camera,native]){
  assert.match(text,/getUserMedia/);
  assert.match(text,/facingMode/);
  assert.match(text,/canvas\.toBlob/);
  assert.match(text,/getTracks\(\)\.forEach/);
 }
 const index=read('index.html'),sw=read('sw.js');
 assert.match(index,/src\/inspection-demo-camera\.js/);
 assert.match(sw,/src\/inspection-demo-camera\.js/);
});
test('visor de vistorias fornece Google Maps e Waze sob a ação de deslocamento',async()=>{
 const old=globalThis.document;
 globalThis.document={addEventListener(){}};
 try{
  const {inspectionCockpit}=await import('../src/inspection-cockpit.js');
  const html=inspectionCockpit({queue:[{id:'local-1',lat:-20.142,lng:-44.88,address:'Portaria principal'}],mapId:'map-qa'});
  assert.match(html,/rp-inspection-directions/);
  assert.match(html,/Google Maps ↗/);
  assert.match(html,/Waze ↗/);
  assert.match(html,/google\.com\/maps\/dir/);
  assert.match(html,/waze\.com\/ul/);
  assert.ok(html.indexOf('rp-inspection-main-action')<html.indexOf('rp-inspection-directions'));
  assert.doesNotMatch(html,/>Navegar ↗</);
 }finally{globalThis.document=old;}
});
test('tela não mantém força de 100dvh nas janelas e evita vermelho em ação comum',()=>{
 const css=readStyles('inspector-patrol-parity-20261016');
 assert.match(css,/Rondas Pro · contrato visual de 17\/10\/2026/);
 assert.match(css,/\.rp-field-wizard-dialog\[open\][\s\S]*?height:auto!important/);
 assert.match(css,/\.rp-inspection-main-action\{[\s\S]*?background:#edf0f5!important/);
 assert.match(css,/\.rp-inspection-directions/);
 const index=read('index.html'),central=read('central.html');
 assert.match(index,/field\.css\?v=49/);
 assert.match(central,/field\.css\?v=49/);
});
