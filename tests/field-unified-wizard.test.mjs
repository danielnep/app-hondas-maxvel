import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INSPECTION_STAGES,emptyInspectionDraft,stepCount,inspectionWizardHtml,updateInspectionDraft,inspectionPayload,inspectionProblems} from '../src/field-inspection-wizard.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('a vistoria é uma sequência de cinco etapas e mantém retorno, avanço e identificação de locais',()=>{
 const d=emptyInspectionDraft('assignment-123');
 assert.equal(stepCount(),5);
 assert.equal(INSPECTION_STAGES.length,4);
 assert.ok(inspectionWizardHtml(d).includes('Portões de acesso'));
 assert.match(inspectionWizardHtml({...d,step:4}),/Concluir vistoria e enviar ao COE/);
 assert.match(inspectionWizardHtml({...d,step:2}),/Voltar/);
 const form={querySelector:s=>s==='[data-stage="acessos"]'?{}:s==='[name="location-acessos"]'?{value:'Portaria 2'}:s==='[name="issue-acessos"]'?{checked:true}:s==='[name="issue-note-acessos"]'?{value:'Fechadura danificada'}:null,
 querySelectorAll:s=>s==='input[name="check-acessos"]:checked'?[{value:'Portões de acesso'}]:[]};
 const saved=updateInspectionDraft(d,form);
 assert.deepEqual(saved.items.acessos,['Portões de acesso']);assert.equal(saved.locations.acessos,'Portaria 2');
 assert.equal(saved.issueNotes.acessos,'Fechadura danificada');
 assert.equal(inspectionProblems(saved).length,0);
 const result=inspectionPayload({...saved,observation:'Portaria verificada, conforme registro'});
 assert.equal(result.criteria.acessos,false);
 assert.equal(result.criteria.estrutura,null,'itens NÃO examinados não são marcados como conformes nem não conformes');
 assert.equal(result.verified.acessos.anomaly,true);
});
test('anormalidade obriga descrição e conclusão requer verificação real',()=>{
 const d=emptyInspectionDraft('test');
 d.issues.acessos=true;
 assert.match(inspectionProblems(d)[0],/Descreva a anormalidade/);
 const empty=emptyInspectionDraft('test');
 assert.ok(inspectionProblems(empty,{final:true}).length>=2);
});
test('um único app mantém todos os controles da ronda e vistoria, e modal de mensagens',()=>{
 const inspector=read('src/inspection-cockpit.js'),guard=read('src/field-guard-circuit.js'),central=read('src/central.js'),demo=read('src/app.js'),chat=read('src/internal-chat-ui.js');
 assert.ok(guard.includes('data-field-tool-torch')&&demo.includes('data-field-tool-torch'),'lanterna preservada no campo unificado');
 for(const name of ['data-field-tool-panic','data-field-tool-alert','data-field-tool-incident','data-field-tool-chat'])assert.ok(inspector.includes(name),name);
 assert.match(central,/data-wizard-next/);assert.match(central,/inspectionPayload\(inspectorDraft\)/);
 assert.match(demo,/demo-wizard-open/);assert.match(demo,/inspectionPayload\(demoInspectionDraft\)/);
 assert.match(chat,/rp-field-chat-overlay/);assert.match(chat,/conversations\.slice\(0,5\)/);
 assert.match(chat,/data-chat-page/);
});
test('comunicados são estritamente por destinatário e separados de mensagens de conversa',()=>{
 const server=read('server/ops-center.js'),ui=read('src/ops-center-ui.js');
 assert.match(server,/if\(p==='\/api\/field-communications'/);
 assert.match(server,/role IN \('ronda','vistoriador'\)/);
 assert.match(server,/ids\.forEach\(announce\)/);
 assert.match(ui,/id="coi-field-notice-form"/);
 assert.match(ui,/Mensagens de conversa devem ser enviadas pelo Chat interno/);
});
