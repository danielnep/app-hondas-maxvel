import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardSnapshot} from '../src/dashboard-insights.js';

const w=[{id:'v01',name:'Vigia Um',unit:'Centro'},{id:'v02',name:'Vigia Dois',unit:'Norte'}];
const fake={id:'a',watcherId:'v01',name:'Vigia Um',status:'active',startedAt:120,
 checkpoints:[{}],deviations:[{justification:'Explicada',returnedAt:null}],incidents:[{status:'Aberta'}],
 notifications:[{seenAt:null}]};
test('insights gerenciais usam exclusivamente dados disponíveis, sem inventar desempenho',()=>{
 const empty=dashboardSnapshot({watchers:w,now:1000});
 assert.equal(empty.completionRatio,null);
 assert.equal(empty.insights.find(x=>x.id==='completion').value,'—');
 assert.equal(empty.pending,0);
 const snapshot=dashboardSnapshot({watchers:w,sessions:[fake,{id:'b',watcherId:'v02',name:'Vigia Dois',status:'completed',startedAt:121,checkpoints:[],deviations:[],incidents:[],notifications:[]}],now:1000});
 assert.equal(snapshot.total,2);
 assert.equal(snapshot.completed,1);
 assert.equal(snapshot.completionRatio,50);
 assert.equal(snapshot.pending,1);
 assert.equal(snapshot.unresolved,1);
 assert.equal(snapshot.openIncidents,1);
 assert.deepEqual(snapshot.roster.map(x=>x.total),[1,1]);
 assert.equal(snapshot.insights.find(x=>x.id==='alerts').target,'notificacoes');
});
test('cálculo não altera registro original',()=>{
 const before=JSON.stringify(fake);
 dashboardSnapshot({sessions:[fake],watchers:w});
 assert.equal(JSON.stringify(fake),before);
});
