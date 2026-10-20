import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const load=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=load('../index.html');
const js=load('../src/app.js');
const refinements=readStyles('application');
const baseline=readStyles('application');
const metadata=load('../package.json');

test('as folhas de estilo de cada visão são carregadas sem repetição',()=>{
 const sheets=[...html.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1].split('?')[0]).filter(x=>x.startsWith('./'));
 const essential=['./assets/ronda-pro.css','./assets/operational.css','./assets/mobile-critical.css','./assets/field.css'];
 for(const path of essential)assert.ok(sheets.includes(path),'Estilo essencial ausente: '+path);
 assert.equal(new Set(sheets).size,sheets.length,'Nenhuma folha pode ser carregada duas vezes');
 for(const path of sheets)assert.ok(existsSync(new URL('../'+path.slice(2),import.meta.url)),'Arquivo CSS inexistente: '+path);
});
test('topo e rodapé móveis compactos preservam orientação e toque',()=>{
  assert.match(refinements,/flex:0 0 56px!important/);
  assert.match(refinements,/min-height:56px!important/);
  assert.match(refinements,/min-height:44px!important/);
  assert.match(refinements,/safe-area-inset-bottom/);
  assert.match(refinements,/\.dashboard \.app-content\{[\s\S]*?overflow-y:auto!important/);
  assert.match(refinements,/prefers-reduced-motion:reduce/);
});
test('rota, sessão, GPS e alertas seguem no aplicativo original',()=>{
  for(const token of ['RADIUS_METERS','DWELL_MS','updateLocation','justifyDeviation','registerIncident','notificationsView']){
    assert.ok(js.includes(token),'Não excluir '+token);
  }
  assert.match(js,/GUIA INTERATIVO · GRUPO MAXVEL/);
  assert.doesNotMatch(js,/GUIA INTERATIVO · HORIZON/);
});
test('identidade pública não descreve outro produto',()=>{
  assert.match(html,/<title>Ronda Pro · Grupo Maxvel/);
  assert.doesNotMatch(html,/<title>[^<]*Michelle/);
  assert.doesNotMatch(metadata,/Protótipo Horizon \+ Maxvel/);
  assert.doesNotMatch(js,/(?:chatbot|copiloto|POWER_BI_MICHELLE_IA)/i);
});
