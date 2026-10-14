import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMediaCapture} from '../src/media-capture.js';

test('captura de selfie usa câmera frontal e aceita foto',async()=>{
 const beforeDocument=globalThis.document,beforeWindow=globalThis.window;
 let input,change,attrs={};
 globalThis.document={
  createElement:()=>input={
   style:{},files:[{name:'selfie.jpg',size:128,type:'image/jpeg'}],
   setAttribute:(name,value)=>{attrs[name]=value},
   addEventListener:(name,fn)=>{if(name==='change')change=fn},
   remove:()=>{},
   click:()=>{change()},
  },
  body:{append:()=>{}},
 };
 globalThis.window={addEventListener:()=>{}};
 try{
  const file=await createMediaCapture().request('selfie');
  assert.equal(input.accept,'image/*');
  assert.equal(attrs.capture,'user');
  assert.equal(file.name,'selfie.jpg');
 }finally{
  if(beforeDocument===undefined)delete globalThis.document;else globalThis.document=beforeDocument;
  if(beforeWindow===undefined)delete globalThis.window;else globalThis.window=beforeWindow;
 }
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
 assert.match(curtain,/data-evidence-kind/);
});
