import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('publicação atualiza scripts e estilos a partir da rede antes de usar cache offline',()=>{
 assert.match(worker,/const CACHE='rondas-pro-interface-v\d+'/);
 assert.match(worker,/event\.respondWith\(fetch\(request\)\.then\(response=>/);
 const staticBlock=worker.slice(worker.indexOf('// Scripts e estilos'));
 assert.ok(staticBlock.indexOf('fetch(request)')<staticBlock.indexOf('caches.match(request)'), 'não usar JS antigo do cache antes de tentar a rede');
 assert.match(html,/register\("\.\/sw\.js\?v=\d+",\{updateViaCache:"none"\}\)/);
 assert.match(html,/controllerchange/);
 assert.match(html,/activeSessionId/,'não interromper ronda ativa no recarregamento');
});

test('demo móvel oferece somente cinco áreas e unifica COI com Monitoramento',()=>{
 const picker=app.slice(app.indexOf("if(act==='sim-role-picker'){"),app.indexOf("if(act==='schedule-tab')"));
 assert.match(picker,/COI · Acompanhamento/);
 assert.equal((picker.match(/data-role=/g)||[]).length,1,'itens gerados por um único seletor');
 assert.doesNotMatch(picker,/\['coi','Central COI'/);
 assert.match(app,/operador:coiNavigation,coi:coiNavigation/);
 assert.match(picker,/modal\.classList\.add\('role-picker-dialog'\)/);
});