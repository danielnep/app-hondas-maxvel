import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardCockpit,mountGuardQuickPanel} from '../src/field-guard-circuit.js';
import {inspectionCockpit} from '../src/inspection-cockpit.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Ronda usa cartao compacto independente; chat permanece na interface de vistoria',()=>{
 const html=guardCockpit({planned:{name:'Portaria',points:[{name:'Portao'}]}});
 assert.match(html,/data-guard-panel-toggle/);
 assert.match(html,/aria-controls="rp-guard-panel-content"/);
 assert.match(html,/data-guard-panel-content/);
 assert.doesNotMatch(html,/data-field-tool-panic/);
 assert.match(read('src/central.js'),/id="central-panic"/);
 assert.match(html,/data-field-tool-incident/);
 assert.doesNotMatch(html,/data-field-tool-chat/);
 assert.match(inspectionCockpit({queue:[],mapId:'inspection-map'}),/data-field-tool-chat/);
 assert.match(read('src/central.js'),/mountGuardQuickPanel\(root\)/);
});
test('inatividade recolhe controles, acionador restaura e foco impede fechamento',()=>{
 const priorDoc=globalThis.document,priorTimeout=globalThis.setTimeout,priorClear=globalThis.clearTimeout;
 let callback=null,interval=null;
 globalThis.setTimeout=(cb,delay)=>{callback=cb;interval=delay;return 20};
 globalThis.clearTimeout=()=>{callback=null};
 const classes=new Set();
 const attrs={};
 const handlers={};
 const button={addEventListener(name,fn){handlers[name]=fn},setAttribute(k,v){attrs[k]=v},focus(){globalThis.document.activeElement=button}};
 const content={hidden:false};
 const hint={textContent:''};
 const panel={dataset:{},isConnected:true,
   classList:{contains:v=>classes.has(v),toggle(v,active){if(active)classes.add(v);else classes.delete(v)}},
   contains(el){return el===button||el===content},
   addEventListener(){},
   querySelector(s){return s==='[data-guard-panel-toggle]'?button:s==='[data-guard-panel-content]'?content:s==='[data-guard-panel-hint]'?hint:null}};
 const root={querySelector:()=>panel};
 globalThis.document={activeElement:null,querySelector:()=>null};
 try{
  mountGuardQuickPanel(root);
  assert.equal(interval,8000);
  callback();
  assert.equal(content.hidden,true);
  assert.equal(attrs['aria-expanded'],'false');
  assert.match(hint.textContent,/Toque para reabrir/);
  handlers.click();
  assert.equal(content.hidden,false);
  assert.equal(attrs['aria-expanded'],'true');
  assert.equal(interval,8000);
  globalThis.document.activeElement=content;
  callback();
  assert.equal(content.hidden,false,'uso ativo impede recolhimento');
  globalThis.document.activeElement=null;
  callback();
  assert.equal(content.hidden,true);
 }finally{globalThis.document=priorDoc;globalThis.setTimeout=priorTimeout;globalThis.clearTimeout=priorClear;}
});
test('overlay real do despacho mantem campos navegaveis, glass fosco e versoes novas',()=>{
 const app=read('src/app.js'),wizard=read('src/dispatch-wizard.js'),theme=read('assets/theme.css'),field=read('assets/field.css'),index=read('index.html');
 assert.match(app,/if\(act==='dispatch-open'\)/);
 assert.match(app,/modal\.showModal\(\)/);
 assert.match(wizard,/rp-dispatch-title/);
 assert.match(wizard,/aria-modal/);
 assert.match(wizard,/name="workerId"/);
 assert.match(wizard,/name="address"/);
 assert.match(wizard,/name="reason"/);
 assert.match(wizard,/kind:'ronda'/);
 assert.match(theme,/rp-dispatch-dialog\[open\]/);
 assert.match(theme,/rgba\(23,30,39,\.94\)/);
 assert.match(field,/\.rp-guard-quick-panel\.is-collapsed/);
 assert.match(index,/theme\.css\?v=60/);
 assert.match(index,/app\.js\?v=75/);
});
