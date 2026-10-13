import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,DEMO_ROUTE,canCompletePoint,completePoint,updateLocation} from '../src/domain.js';
import {patrolInsights,buildReportData,reportCSV,reportHTML} from '../src/operations-upgrade.js';

test('QR só valida a etapa na ordem obrigatória',()=>{
 const s=createSession('Teste',DEMO_ROUTE);
 s.route.rules={verificationMode:'qr'};
 assert.equal(canCompletePoint(s),false);
 s.checkpoints[1].qrVerifiedAt=Date.now();
 assert.equal(canCompletePoint(s),false);
 s.checkpoints[0].qrVerifiedAt=Date.now();
 assert.equal(canCompletePoint(s),true);
 assert.equal(completePoint(s),true);
 assert.equal(s.index,1);
});
test('GPS + QR exige os dois fatores',()=>{
 const s=createSession('Teste',DEMO_ROUTE,Date.now());
 s.route.rules={verificationMode:'gps+qr',dwellMs:5000};
 assert.equal(canCompletePoint(s),false);
 const p=s.route.points[0],at=Date.now();
 updateLocation(s,{lat:p.lat,lng:p.lng,accuracy:5,at},at);
 updateLocation(s,{lat:p.lat,lng:p.lng,accuracy:5,at:at+6000},at+6000);
 assert.equal(canCompletePoint(s),false);
 s.checkpoints[0].qrVerifiedAt=at+6100;
 assert.equal(canCompletePoint(s),true);
});
test('relatório completo usa valores reais locais e não inventa conclusão',()=>{
 const s=createSession('Teste',DEMO_ROUTE,1000);
 const result=buildReportData({sessions:[s],programs:[]},['resumo','rondas','pontos','alertas']);
 assert.equal(result.resumo.total,1);
 assert.equal(result.resumo.finished,0);
 assert.equal(result.rondas[0].status,'active');
 assert.equal(result.pontos.length,4);
 assert.match(reportCSV(result),/secao;|\"secao\"/);
 assert.match(reportHTML(result),/Demonstração|demonstrativo/);
 assert.equal(patrolInsights([s]).observations[0].value,'0%');
});
test('relatório inteligente aparece somente na seção Relatórios, não como painel persistente na Visão geral',()=>{
 const src=readFileSync(new URL('../src/operations-upgrade.js',import.meta.url),'utf8');
 const overview=src.slice(src.indexOf("if(view==='overview'){"),src.indexOf("if(view==='relatorios'){"));
 const reports=src.slice(src.indexOf("if(view==='relatorios'){"),src.indexOf("if(view==='notificacoes'){"));
 assert.doesNotMatch(overview,/reportSmart\(\)/);
 assert.match(reports,/reportSmart\(\)/);
});
