import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSession,DEMO_ROUTE} from '../src/domain.js';
import {EVIDENCE_DIRECTIONS,simulateCapture,simulateRotation,evidenceProgress,getPointEvidence,confirmDemoEvidence} from '../src/evidence.js';

test('cinco etapas e giro simulados precisam ser distintos e vinculados ao ponto',()=>{
 const s=createSession('Teste',DEMO_ROUTE,Date.now(),'simulation');
 assert.equal(confirmDemoEvidence(s,0),false);
 assert.equal(simulateCapture(s,0,'unknown'),false);
 for(const step of EVIDENCE_DIRECTIONS)assert.equal(simulateCapture(s,0,step.id),true);
 const one=getPointEvidence(s,0);
 assert.equal(evidenceProgress(one).captured,5);
 assert.equal(evidenceProgress(one).rotated,false);
 assert.equal(confirmDemoEvidence(s,0),false);
 assert.equal(simulateRotation(s,0),true);
 assert.equal(confirmDemoEvidence(s,0),true);
 assert.equal(evidenceProgress(getPointEvidence(s,0)).confirmed,true);
 assert.equal(one.motion.sensorReading,false);
 assert.ok(Object.values(one.captures).every(x=>x.mode==='simulated'&&x.mediaRef===null));
 assert.equal(simulateCapture(s,0,'front'),false);
 assert.equal(simulateCapture(s,1,'front'),false,'nao simular ponto nao liberado');
});
test('etapas de evidencia nao fingem camera, fotos nem sensores reais',()=>{
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(src,/DEMONSTRAÇÃO · SEM FOTOS REAIS/);
 assert.match(src,/não ativa a câmera/);
 assert.match(src,/não utiliza o giroscópio/);
 assert.match(src,/point-evidence/);
 assert.match(src,/sim-role-picker/);
 assert.match(src,/patrol-extra-flow/);
});
test('modo real nao registra mock como prova',()=>{
 const s=createSession('Teste',DEMO_ROUTE,Date.now(),'real');
 assert.equal(simulateCapture(s,0,'front'),false);
 assert.equal(simulateRotation(s,0),false);
 assert.equal(confirmDemoEvidence(s,0),false);
});
