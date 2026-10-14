import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactLabelFor} from '../src/soft-polish.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('rótulos compactos mantêm contexto e distinguem as três áreas',()=>{
 assert.equal(compactLabelFor('app-nav','Meu histórico'),'Hist.');
 assert.equal(compactLabelFor('app-nav','Monitoramento'),'GPS');
 assert.equal(compactLabelFor('central-nav','Indicadores'),'Dados');
 assert.equal(compactLabelFor('central-nav','Alertas e ocorrências'),'Alertas');
 assert.equal(compactLabelFor('central-toolbar','Atualizar'),'↻');
 assert.equal(compactLabelFor('paging','Anterior'),'‹');
});

test('ações de segurança, conclusão e confirmação nunca viram iniciais',()=>{
 const important=['Pânico','Iniciar ronda','Concluir ponto','Registrar ocorrência','Confirmar e salvar','Entrar com segurança','Enviar resposta'];
 for(const area of ['app-nav','app-tabs','paging','app-header','central-nav','central-toolbar'])
  for(const label of important)assert.equal(compactLabelFor(area,label),null,area+': '+label);
});

test('abreviações preservam a descrição acessível e não interceptam ações',()=>{
 const js=read('../src/soft-polish.js');
 assert.match(js,/setAttribute\('aria-label', full\)/);
 assert.match(js,/setAttribute\('title', full\)/);
 assert.match(js,/setAttribute\('aria-hidden', 'true'\)/);
 assert.doesNotMatch(js,/addEventListener\(['"]click/);
 assert.match(read('../assets/soft-polish.css'),/prefers-reduced-motion:reduce/);
 assert.match(read('../assets/soft-polish.css'),/min-width:44px/);
});

test('as duas interfaces carregam a camada e a PWA atualiza seus arquivos',()=>{
 const app=read('../index.html'),central=read('../central.html'),sw=read('../sw.js');
 assert.match(app,/soft-polish\.js/);
 assert.match(central,/soft-polish\.css/);
 assert.match(central,/soft-polish\.js/);
 assert.match(read('../assets/ronda-pro.css'),/rp-soft-view-in/);
 assert.match(sw,/const CACHE='rondas-pro-interface-v\\d+';/);
 assert.match(sw,/soft-polish\.css/);
 assert.match(sw,/soft-polish\.js/);
});

test('V3 adiciona resposta visual em ambos os acessos sem ciclos infinitos',()=>{
 for(const path of ['../assets/ronda-pro.css','../assets/soft-polish.css']){
  const css=read(path),v3=css.slice(css.lastIndexOf('/* Rondas Pro V3'));
  assert.ok(v3.length>3000,path);
  assert.match(v3,/rp-v3-float-in/);
  assert.match(v3,/rp-v3-soft-pop/);
  assert.match(v3,/rp-v3-progress-sheen 1250ms ease-out 1 both/);
  assert.match(v3,/prefers-reduced-motion:reduce/);
  assert.match(v3,/touch|toque|Ações secundárias/);
  assert.doesNotMatch(v3,/animation:[^;}\n]*infinite/);
 }
 const app=read('../index.html'),central=read('../central.html');
 assert.match(app,/ronda-pro\.css\?v=15/);
 assert.match(central,/soft-polish\.css\?v=2/);
});
