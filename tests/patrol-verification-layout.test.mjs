import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {canShowPatrolVerification} from '../src/operations-upgrade.js';

const vigia={role:'ronda',name:'Ronda Teste'};
const active={status:'active'},completed={status:'completed'};

test('Comprovação só aparece na ronda ativa do vigia',()=>{
 assert.equal(canShowPatrolVerification({user:vigia,view:'minha-ronda',session:active}),true);
 for(const context of [
  {user:vigia,view:'minha-ronda',session:null},
  {user:vigia,view:'minha-ronda',session:completed},
  {user:vigia,view:'historico',session:active},
  {user:{role:'admin'},view:'minha-ronda',session:active},
  {user:null,view:'minha-ronda',session:active},
  {}
 ])assert.equal(canShowPatrolVerification(context),false);
});

test('Card de comprovação não é injetado sob o botão Iniciar ronda',()=>{
 const ops=readFileSync(new URL('../src/operations-upgrade.js',import.meta.url),'utf8');
 assert.doesNotMatch(ops,/querySelector\('\.patrol-action-body'\)\?\.insertAdjacentHTML\('beforeend',gpsQrRow\(\)\)/);
 assert.match(ops,/if\(canShowPatrolVerification\(context\)\)/);
 assert.match(ops,/querySelector\('\.patrol-verification-pane'\)\?\.insertAdjacentHTML\('beforeend',gpsQrRow\(\)\)/);
});

test('Aba Ponto ocupa o painel de ferramentas apenas durante a ronda',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/verificacao:extra\.querySelector\('\.patrol-verification-pane'\)/);
 assert.match(app,/\['verificacao','Ponto'\]/);
 assert.match(app,/active\?'<section class="patrol-verification-pane"/);
 const css=readFileSync(new URL('../assets/ronda-pro.css',import.meta.url),'utf8');
 assert.match(css,/\.ux-patrol-stage>\.patrol-verification-pane\[data-ux-tools-pane\]\{overflow-y:auto!important/);
});
