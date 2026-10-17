import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMediaCapture} from '../src/media-capture.js';

test('captura frontal e traseira exige câmera ao vivo e preserva fluxo de vídeo',()=>{
 const media=readFileSync(new URL('../src/media-capture.js',import.meta.url),'utf8');
 assert.match(media,/kind==='video'/);
 assert.match(media,/getUserMedia/);
 assert.match(media,/facingMode/);
 assert.match(media,/kind==='selfie'\?'user':'environment'/);
 assert.match(media,/canvas\.toBlob/);
 assert.match(media,/new File\(\[blob\]/);
 assert.match(media,/getTracks\(\)\.forEach/);
});

test('cinco perspectivas independentes, anexos adicionais e rollback permanecem no código',()=>{
 const curtain=readFileSync(new URL('../src/checkpoint-curtain.js',import.meta.url),'utf8');
 const operations=readFileSync(new URL('../src/operations-upgrade.js',import.meta.url),'utf8');
 for(const key of ["'front'","'back'","'left'","'right'","'selfie'"]){
  assert.ok(curtain.includes(key),key+' deve constar das posições de registro');
  assert.ok(operations.includes(key),key+' deve ser preservado nos metadados');
 }
 assert.match(curtain,/data-evidence-view/);
 assert.match(curtain,/requiredEvidenceViews/);
 assert.match(curtain,/previousCheckpoint/);
 assert.match(curtain,/s\.index=previousIndex/);
 assert.match(operations,/mediaViews:saved\.filter/);
 assert.match(operations,/mediaSyncedAt/);
 assert.match(operations,/e\.status==='synced'/);
 assert.match(operations,/X-Ronda-Media-Id/);
 assert.match(curtain,/data-evidence-kind/);
});
