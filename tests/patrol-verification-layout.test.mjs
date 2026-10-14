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

test('Comprovação continua reservada à aba Ponto da ronda ativa',()=>{
 const ops=readFileSync(new URL('../src/operations-upgrade.js',import.meta.url),'utf8');
 assert.doesNotMatch(ops,/querySelector\('\.patrol-action-body'\)\?\.insertAdjacentHTML\('beforeend',gpsQrRow\(\)\)/);
 assert.match(ops,/if\(canShowPatrolVerification\(context\)\)/);
 assert.ok(ops.includes("querySelector('.patrol-verification-pane')?.insertAdjacentHTML('beforeend',gpsQrRow())"));
 assert.ok(!ops.includes('gpsQrRow()+communicationActions()'),'A comunicação não deve ficar escondida na aba Ponto');
});

test('Ações rápidas aparecem na tela inicial antes da ronda e preservam Iniciar ronda',()=>{
 const ops=readFileSync(new URL('../src/operations-upgrade.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../assets/ronda-pro.css',import.meta.url),'utf8');
 assert.ok(ops.includes("if(view==='minha-ronda')"));
 assert.ok(ops.includes("main.querySelector('.patrol-actions')"),'Atalhos mobile devem ficar fora de Mais opções');
 assert.ok(ops.includes("primaryTarget?.insertAdjacentHTML('afterend',communicationActions())"));
 assert.ok(ops.includes('data-ops="incident-quick"'));
 assert.ok(ops.includes('data-ops="central-alert"'));
 assert.ok(ops.includes('data-ops="central-message"'));
 assert.ok(css.includes('.patrol-workspace.sheet-collapsed>.patrol-communication-bar'));
 assert.ok(css.includes('position:absolute!important;inset:0!important;z-index:0!important'),'O mapa deve preencher o fundo do vigia');
 assert.ok(css.includes('grid-template-columns:78px 52px 52px!important'),'Ações compactas ficam no canto oposto ao pânico');
 assert.ok(css.includes('calc(118px + env(safe-area-inset-bottom,0px))'),'Painel principal fica sobre o mapa, acima dos atalhos');
 assert.ok(css.includes('@keyframes rp-dock-reveal'),'Ações oferecem resposta visual');
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'),'Animações respeitam acessibilidade');
});

test('Aba Ponto ocupa o painel de ferramentas apenas durante a ronda',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/verificacao:extra\.querySelector\('\.patrol-verification-pane'\)/);
 assert.match(app,/\['verificacao','Ponto'\]/);
 assert.match(app,/active\?'<section class="patrol-verification-pane"/);
 const css=readFileSync(new URL('../assets/ronda-pro.css',import.meta.url),'utf8');
 assert.match(css,/\.ux-patrol-stage>\.patrol-verification-pane\[data-ux-tools-pane\]\{overflow-y:auto!important/);
});


test('Janelas móveis apresentam avanço, rolagem e revisão de campos obrigatórios',()=>{
 const pagination=readFileSync(new URL('../src/dialog-pagination.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../assets/ronda-pro.css',import.meta.url),'utf8');
 assert.ok(pagination.includes('ux-dialog-page-scroll'),'Conteúdo da etapa deve ter scroll próprio');
 assert.ok(pagination.includes('checkValidity()'),'Avançar valida os campos da etapa atual');
 assert.ok(pagination.includes('Avançar ›'),'Etapas longas devem ter avançar');
 assert.ok(pagination.includes('‹ Voltar'),'Etapas longas devem ter voltar');
 assert.ok(css.includes('dialog[open].ux-dialog-paging .ux-dialog-page-scroll'));
 assert.ok(css.includes('dialog[open].ux-dialog-paging .ux-dialog-pagination'));
 assert.ok(css.includes('dialog[open]:not(.guide-dialog):not(.ux06-fullscreen)'),'Janelas comuns não podem ser cortadas');
});


test('Desvio confirmado encerra cortina do ponto e libera justificativa',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const curtain=readFileSync(new URL('../src/checkpoint-curtain.js',import.meta.url),'utf8');
 assert.ok(app.includes("(session&&hasBlock(session)))curtain?.close()"),'Ao bloquear uma ronda a tela principal volta a ficar interativa');
 assert.ok(curtain.includes("key!==s.id+':'+s.index||hasBlock(s)"),'Conferência não permanece aberta durante desvio');
 assert.ok(curtain.includes("if(s?.status==='active'&&hasBlock(s)){close();return}"),'Cortina não reabre durante exigência de justificativa');
});
