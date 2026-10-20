import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('botões de comunicação não se movem indefinidamente enquanto são clicados',()=>{
 const css=read('assets/ronda-pro.css');
 assert.match(css,/animation:rp-dock-reveal \.55s/);
 assert.doesNotMatch(css,/rp-dock-idle/);
});

test('lanterna indica estado ligado no CSS fonte e no CSS entregue',()=>{
 for(const path of ['assets/inspector-patrol-parity-20261016.css','assets/ronda-pro.css']){
  const css=read(path);
  assert.match(css,/\.rp-inspection-torch\.is-lit/);
  assert.match(css,/\.rp-inspection-torch\.is-lit svg\{color:#ffd36a!important\}/);
 }
 assert.match(read('src/field-torch.js'),/el\.classList\.toggle\('is-lit',state\.on\)/);
});

test('novas correções invalidam o cache do módulo, CSS e service worker',()=>{
 const index=read('index.html');
 assert.match(index,/ronda-pro\.css\?v=20/);
 assert.match(index,/app\.js\?v=64/);
 assert.match(index,/sw\.js\?v=50/);
 assert.match(read('src/app.js'),/ui-motion\.js\?v=3/);
 assert.match(read('sw.js'),/rondas-pro-interface-v50/);
});
