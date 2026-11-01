import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('produto instalado usa Ronda Pro no singular',()=>{
 const app=JSON.parse(read('manifest.webmanifest'));
 assert.equal(app.name,'Ronda Pro · Grupo Maxvel');
 assert.equal(app.short_name,'Ronda Pro');
 for(const page of ['index.html','central.html']){
  assert.match(read(page),/Ronda Pro/);
  assert.doesNotMatch(read(page),/Rondas Pro/);
 }
});

test('login mobile mantém canvas e rolagem ao abrir teclado',()=>{
 const css=read('assets/theme.css');
 assert.match(css,/html:has\(body\.rp-theme \.entry-screen\)/);
 assert.match(css,/background-attachment:\s*scroll,\s*scroll\s*!important/);
 assert.match(css,/body\.rp-theme:has\(\.entry-screen\)/);
 assert.match(css,/max-height:\s*none\s*!important/);
 assert.match(css,/overflow-y:\s*auto\s*!important/);
 assert.match(css,/grid-template-rows:\s*minmax\(54px,\s*auto\)/);
});