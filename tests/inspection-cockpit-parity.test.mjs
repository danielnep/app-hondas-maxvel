import test from 'node:test';
import assert from 'node:assert/strict';

let delegate=null;
// O cockpit só usa o document para delegar aberturas das janelas.
globalThis.document={addEventListener(name,handler){if(name==='click')delegate=handler;}};
const {inspectionCockpit}=await import('../src/inspection-cockpit.js');

const visits=[
 {id:'inspection-a',lat:-20.14245,lng:-44.88285,address:'Condomínio Reserva da Serra',instructions:'Verificar acesso'},
 {id:'inspection-b',lat:-20.13885,lng:-44.88135,address:'Metalúrgica Xavier',instructions:'Conferir perímetro'}
];
test('mapa e ações de campo reutilizam o padrão minimalista da ronda',()=>{
 const html=inspectionCockpit({queue:visits,mapId:'inspection-map',mode:'real',position:{lat:-20.14,lng:-44.88}});
 assert.match(html,/class="map-container mini rp-inspector-map"/);
 for(const id of ['data-inspection-fit','data-field-tool-panic','data-field-tool-alert','data-field-tool-incident','data-field-tool-chat','data-inspection-circuit-open','data-inspection-history-open','data-inspection-distance']){
  assert.ok(html.includes(id),id);
 }
 assert.match(html,/data-inspection-stops/);
 assert.match(html,/data-inspection-history-open/);
 assert.match(html,/Condomínio Reserva da Serra/);
 assert.doesNotMatch(html,/rp-field-quicktools|rp-inspection-map-hud|<details/);
});
test('modo demonstrativo conserva as ações de percurso e checklist',()=>{
 const html=inspectionCockpit({queue:visits,mapId:'demo-inspection-map',mode:'demo'});
 assert.match(html,/data-action="demo-inspection-depart"/);
 assert.match(html,/data-action="demo-inspection-fit"/);
 const started=inspectionCockpit({queue:[{...visits[0],startedAt:Date.now()}],mode:'demo'});
 assert.match(started,/data-action="demo-inspection-arrive"/);
 const arrived=inspectionCockpit({queue:[{...visits[0],startedAt:Date.now(),arrivedAt:Date.now()}],mode:'demo'});
 assert.match(arrived,/data-action="demo-wizard-open"/);
});
test('opções abrem o circuito, histórico e fecham janelas',()=>{
 assert.equal(typeof delegate,'function');
 let shown=0,closed=0;
 const circuit={showModal(){shown++;},close(){closed++;}};
 const history={showModal(){shown++;}};
 const cockpit={querySelector(selector){return selector.includes('circuit')?circuit:history;}};
 const control=attrs=>({
  closest(selector){return selector.includes('[data-inspection-cockpit]')?cockpit:this;},
  hasAttribute(name){return attrs.includes(name);}
 });
 delegate({target:{closest(){return control(['data-inspection-circuit-open']);}}});
 assert.equal(shown,1);
 const old=globalThis.document.querySelector;
 globalThis.document.querySelector=selector=>selector.includes('circuit')?circuit:history;
 delegate({target:{closest(){return control(['data-inspection-history-open']);}}});
 assert.equal(closed,1);
 assert.equal(shown,2);
 globalThis.document.querySelector=old;
});
