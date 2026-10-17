import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('mesma camada Maxvel acompanha campo, central, cache offline e distribuição APK',()=>{
 const name='maxvel-ux-reform-20261017.css';
 for(const path of ['index.html','central.html','sw.js'])assert.ok(read(path).includes(name),path);
 assert.match(read('android/app/build.gradle'),/assets\/\*\*/);
 assert.match(read('sw.js'),/interface-v47/);
 assert.match(read('index.html'),/sw.js\?v=47/);
});
test('mapa vem primeiro, pânico é prioritário e a comunicação mantém ações distintas',()=>{
 const c=read('src/inspection-cockpit.js');
 const map=c.indexOf('rp-inspection-map-panel'),panel=c.indexOf('rp-inspection-commands');
 assert.ok(map>=0&&panel>map);
 for(const name of ['data-field-tool-panic','data-field-tool-alert','data-field-tool-incident','data-field-tool-chat','data-inspection-circuit-open'])assert.ok(c.includes(name),name);
 assert.match(c,/data-wizard-open/);
});
test('reforma reforça estados, contraste, toque e preferência de movimento',()=>{
 const css=read('assets/maxvel-ux-reform-20261017.css');
 assert.match(css,/--rp-ux-red:#ee3152/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:370px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.rp-event-columns/);
});

test('ação crítica da vistoria é irmã da área rolável e permanece visível',()=>{
 const c=read('src/inspection-cockpit.js');
 assert.match(c,/<\/div>'\+\s*'<div class="rp-inspection-primary-actions">/);
 const css=read('assets/maxvel-ux-reform-20261017.css');
 assert.match(css,/rp-inspection-commands>\.rp-inspection-primary-actions/);
 assert.match(css,/flex:0 0 auto!important/);
});
