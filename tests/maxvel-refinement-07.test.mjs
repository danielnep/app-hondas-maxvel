import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=load('../index.html');
const js=load('../src/app.js');
const refinements=load('../assets/maxvel-refinement-07.css');
const baseline=load('../assets/maxvel-obsidian-06.css');
const metadata=load('../package.json');

test('as folhas de estilo de cada visão são carregadas sem repetição',()=>{
 const sheets=[...html.matchAll(/rel="stylesheet" href="(\.\/[^"?]+)/g)].map(x=>x[1]);
 assert.deepEqual(sheets,['./assets/ronda-pro.css','./assets/demo-roles.css','./assets/field-entry-v2.css']);
 assert.equal(new Set(sheets).size,sheets.length);
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
  assert.match(html,/<title>Rondas Pro · Grupo Maxvel/);
  assert.doesNotMatch(html,/<title>[^<]*Michelle/);
  assert.doesNotMatch(metadata,/Protótipo Horizon \+ Maxvel/);
  assert.doesNotMatch(js,/(?:chatbot|copiloto|POWER_BI_MICHELLE_IA)/i);
});
