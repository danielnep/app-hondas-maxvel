import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoutePlanner} from '../src/route-planner.js';
import {seedDemoThree,routeRequest,DEMO_THREE} from '../src/route-demo-mode.js';
import {pagesTestRequest} from '../src/pages-test-api.js';

const storage=()=>{const data=new Map();return {
 getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)
}};
globalThis.localStorage=storage();
globalThis.sessionStorage=storage();
globalThis.location={hostname:'danielnep.github.io'};

test('cadastro COI usa busca por endereço, mapa, três etapas e zero campos de coordenadas',async()=>{
 const users=DEMO_THREE.map(w=>({...w,id:'pages-'+w.username,role:'ronda',active:1}));
 let repaint=0;
 const planner=createRoutePlanner({
  getData:()=>({users,routes:[],role:'coi',demo:true}),
  api:async()=>({id:'x'}),afterSave:()=>{repaint++;},notify:()=>{}
 });
 const html=planner.html();
 assert.match(html,/Rotas e rondas/);
 assert.match(html,/COI \+ Administrador/);
 assert.match(html,/Pesquisar empresa, local ou endereço/);
 assert.match(html,/rp-plan-map/);
 assert.match(html,/class="rp-plan-action-context"/);
 assert.match(html,/class="rp-plan-next-mobile">Próximo →/);
 assert.match(html,/aria-label="Próximo: Agendamento"/);
 assert.match(html,/class="rp-plan-action-buttons"/);
 for(const item of ['Endereços','Agendamento','Revisão e envio','Dia sim, dia não','Dias específicos'])assert.ok(html.includes(item),item);
 for(const watcher of DEMO_THREE)assert.ok(html.includes(watcher.name));
 assert.ok(!html.includes('Latitude'));
 assert.ok(!html.includes('Longitude'));
 await planner.click({dataset:{action:'rp-plan-kind',kind:'specific'}});
 assert.equal(repaint,1);
 assert.match(planner.html(),/Ronda específica \/ aleatória/);
 planner.dispose();
});

test('três vigias fictícios são criados apenas na demonstração e sem duplicação',()=>{
 seedDemoThree();
 let rows=JSON.parse(localStorage.getItem('ronda-pro-pages-test-v2:extra-users'));
 assert.equal(rows.length,3);
 assert.ok(rows.every(r=>r.demo&&r.role==='ronda'&&r.username.startsWith('vigia-demo-')));
 seedDemoThree();
 rows=JSON.parse(localStorage.getItem('ronda-pro-pages-test-v2:extra-users'));
 assert.equal(rows.length,3);
});

test('COI grava rota de teste no navegador, nunca na API real',async()=>{
 seedDemoThree();
 sessionStorage.setItem('rondaspro_api_token','pages-test:coi');
 let remote=0;
 const payload={userId:'pages-vigia-demo-lucas',name:'Perímetro',points:[{name:'Portaria',lat:-20.14,lng:-44.88},{name:'Entrada',lat:-20.15,lng:-44.89}],schedule:{kind:'routine',recurrence:'alternate',hour:'08:00',startDate:'2026-10-20'}};
 await routeRequest('/routes',{method:'POST',data:payload},async()=>{remote++;return{}},'coi');
 assert.equal(remote,0);
 const rows=(await pagesTestRequest('/routes')).routes;
 assert.equal(rows.length,1);
 assert.equal(rows[0].workerName,'Lucas Ferreira');
 assert.equal(rows[0].schedule.recurrence,'alternate');
 sessionStorage.setItem('rondaspro_api_token','pages-test:vigia-demo-lucas');
 assert.equal((await pagesTestRequest('/routes')).routes.length,1);
 sessionStorage.setItem('rondaspro_api_token','pages-test:vigia-demo-ana');
 assert.equal((await pagesTestRequest('/routes')).routes.length,0);
});
