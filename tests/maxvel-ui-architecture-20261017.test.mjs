import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('um sistema visual compartilhado por campo, central, Android e cache offline',()=>{
 const theme='maxvel-ui-architecture-20261017.css';
 for(const p of ['index.html','central.html','sw.js'])assert.ok(load(p).includes(theme),p);
 assert.match(load('sw.js'),/rondas-pro-interface-v48/);
 assert.match(load('android/app/build.gradle'),/assets\/\*\*/);
});
test('popovers com largura limitada e modais proporcionais ao conteúdo',()=>{
 const css=load('assets/maxvel-ui-architecture-20261017.css');
 for(const re of [/\.rp-popover-list/,/position:fixed!important/,/max-width:calc\(100vw - 24px\)/,/#dialog\.rp-flow-dialog\[open\]:has\(\.ux-access-menu\)/,/#rp-demo-chat-overlay:has\(\.field-chat-list\)/])assert.match(css,re);
});
test('COI está corretamente nomeado e vistoriador começa pelo mapa',()=>{
 const app=load('src/app.js');
 assert.doesNotMatch(app,/Mensagens do COE|<b>COE · Central de Operações<\/b>/);
 const functionText=app.slice(app.indexOf('function demoInspectorView()'),app.indexOf('function demoAdminRouteQueue()'));
 assert.match(functionText,/inspectionCockpit/);
 assert.match(functionText,/return '<section class="demo-role-view rp-demo-inspector">'\+map\+form/);
 assert.match(functionText,/<dialog id="rp-demo-wizard-dialog"/);
 assert.doesNotMatch(functionText,/showModal\(/);
});

test('troca para vistoriador nao aciona checklist automaticamente',()=>{
 const app=load('src/app.js');
 const render=app.slice(app.indexOf('function render(){'),app.indexOf('function ' ,app.indexOf('function render(){')+20));
 assert.doesNotMatch(render,/demoWizardAutoId=.*showModal/);
 assert.match(app,/if\(act==='demo-wizard-open'\)/);
});

test('conversa vazia usa altura compacta',()=>{assert.match(load('assets/maxvel-ui-architecture-20261017.css'),/#rp-demo-chat-overlay:has/)});
