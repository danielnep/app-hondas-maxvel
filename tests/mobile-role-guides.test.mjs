import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileGuideFor} from '../src/mobile-role-guides.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('os perfis recebem guias móveis completos sem confundir avaliação com dados reais',()=>{
 for(const role of ['ronda','operador','coi','admin','cliente','vistoriador']){
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
 assert.match(app,/const mobileGuide=!isLaunching\?mobileGuideFor\(user\?\.role\):null/);
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
 for(const term of [/monitoramento/i,/alertas/i,/ocorrências/i,/vigia/i,/localização|sinal|GPS/i,/autenticad/i])
  assert.match(text,term);
});

test('Administrativo recebe painel, ocorrências, relatórios e informações de validação',()=>{
 const guide=mobileGuideFor('admin');
 const text=guide.stages.map(x=>x.title+' '+x.body).join(' ');
 for(const term of [/visão geral/i,/rondas/i,/rota/i,/notificações/i,/ocorrências/i,/relatórios/i,/configurações/i,/autenticada/i])
  assert.match(text,term);
});

test('aplicativo e PWA incluem conteúdo dos perfis na mesma publicação',()=>{
 assert.match(read('../index.html'),/src\/bootstrap\.js\?v=[0-9]+/); assert.match(read('../src/bootstrap.js'),/app\.js\?v=[0-9]+/);
 const sw=read('../sw.js');
 assert.match(sw,/const CACHE=['"]rondas-pro-interface-v[0-9]+['"]/);
 assert.match(sw,/\.\/src\/mobile-role-guides\.js/);
});
