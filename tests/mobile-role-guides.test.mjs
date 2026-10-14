import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileGuideFor} from '../src/mobile-role-guides.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('todos os três perfis usam o mesmo fluxo mobile sem afetar o guia original do vigia',()=>{
 assert.equal(mobileGuideFor('ronda'),null);
 for(const role of ['operador','admin']){
  const guide=mobileGuideFor(role);
  assert.ok(guide.title&&guide.subtitle);
  assert.equal(guide.stages.length,5);
  for(const stage of guide.stages){
   assert.ok(stage.title.length>=8);
   assert.match(stage.body,/<p>/);
   assert.doesNotMatch(stage.body,/<script|onclick|data-action/);
  }
 }
 const app=read('../src/app.js');
 assert.match(app,/window\.innerWidth<=900&&!isLaunching\?mobileGuideFor\(user\?\.role\):null/);
 assert.match(app,/mobileGuide\?mobileGuide\.stages\.map/);
 assert.match(app,/mobileGuide\?mobileGuide\.stages\[guideStage\]\.body:lesson\(guideStage\)/);
 assert.match(app,/mobileGuide\?'':ops\.guideSection\(\)/);
 assert.match(app,/modal\.dataset\.guideRole/);
 assert.match(app,/data-action="guide"/);
});

test('Operadores recebem orientações de monitoramento sem prometer GPS remoto em demonstração',()=>{
 const guide=mobileGuideFor('operador');
 assert.match(guide.stages.map(x=>x.title).join(' '),/central|rondas|alertas|ocorrências|limites/i);
 const text=guide.stages.map(x=>x.body).join(' ');
 for(const term of ['Monitoramento','Alertas','Ocorrências','Vigias','GPS','autenticação'])assert.ok(text.includes(term),term);
});

test('Administrativo recebe painel, ocorrências, relatórios e informações de validação',()=>{
 const guide=mobileGuideFor('admin');
 const text=guide.stages.map(x=>x.body).join(' ');
 for(const term of ['Visão geral','Rondas','Equipe','Notificações','Ocorrências','Relatórios','Configurações','servidor'])assert.ok(text.includes(term),term);
});

test('aplicativo e PWA incluem conteúdo dos perfis na mesma publicação',()=>{
 assert.match(read('../index.html'),/src\/app\.js\?v=35/);
 const sw=read('../sw.js');
 assert.match(sw,/rondas-pro-interface-v10/);
 assert.match(sw,/\.\/src\/mobile-role-guides\.js/);
});
