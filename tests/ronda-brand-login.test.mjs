import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Nome público e notificações usam Ronda Pro no singular',()=>{
 const files=[
  'index.html','central.html','manifest.webmanifest','src/app.js','src/central.js',
  'src/operations-upgrade.js','src/report-xlsx.js','src/conclusion-dialog.js',
  'src/coi-monitor.js','src/install.js','src/location-entry-gate.js',
  'server.js','server/operational-api.js','android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/br/com/horizon/maxvel/PatrolLocationService.java'
 ];
 for(const file of files){
  const content=read(file);
  assert.doesNotMatch(content,/Rondas Pro|RONDAS PRO/,file+' mantém grafia antiga da marca');
 }
 assert.match(read('manifest.webmanifest'),/"short_name": "Ronda Pro"/);
 assert.match(read('android/app/src/main/AndroidManifest.xml'),/android:label="Ronda Pro"/);
});

test('Tela de login mantém fundo em toda altura da janela móvel',()=>{
 const css=read('assets/central.css');
 assert.match(css,/body\.rp-theme:has\(#central-root\)\s*\{/);
 assert.match(css,/min-height:100dvh\s*!important/);
 assert.match(read('central.html'),/central\.css\?v=51/);
});
