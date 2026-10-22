import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCoiMonitor} from '../src/coi-monitor.js';
import {createRoutePlanner} from '../src/route-planner.js';

test('COI renders map of planned patrol even before field device has GPS',()=>{
 const m=createCoiMonitor();
 const html=m.render({
  account:{role:'coi',site:'Posto de teste'},rounds:[{id:'round-1',userId:'user-1',routeId:'route-1',status:'em_andamento',checkpoints:0,start:Date.now()}],
  users:[{id:'user-1',name:'Vigia teste'}],availability:[],events:[],dispatches:[],
  routes:[{id:'route-1',name:'Rota da portaria',points:[
   {lat:-20.145,lng:-44.89,name:'Portaria'}, {lat:-20.146,lng:-44.891,name:'Ponto dois'}]}]
 });
 assert.match(html,/data-coi-map="round:round-1"/);
 assert.match(html,/Percurso previsto, sem GPS do profissional/);
 assert.doesNotMatch(html,/GPS recente/);
});

test('demonstration shows registered planned routes but does not invent live GPS',()=>{
 const m=createCoiMonitor();
 const html=m.render({demo:true,account:{role:'admin'},users:[],rounds:[],events:[],availability:[],dispatches:[],routes:[
  {id:'roteiro-1',name:'Percurso demonstrativo',points:[{lat:-20.145,lng:-44.89,name:'Portaria'}]}
 ]});
 assert.match(html,/Prévia dos percursos cadastrados/);
 assert.match(html,/data-coi-map="round:demonstracao-roteiro-1"/);
 assert.match(html,/Nenhum deslocamento fictício/);
 assert.match(html,/Aguardando posição/);
});

test('route entry accepts registered map points and geocoder before submission',async()=>{
 const rp=createRoutePlanner({getData:()=>({role:'coi',demo:true,users:[{id:'1',role:'ronda',active:1,name:'Vigia teste',username:'vigia-demo-teste'}],routes:[]}),
  api:async()=>({}),afterSave:()=>{},notify:()=>{}});
 const html=rp.html();
 assert.match(html,/rp-plan-query/);
 assert.match(html,/rp-plan-map/);
 const script=await readFile(new URL('../src/route-planner.js',import.meta.url),'utf8');
 assert.match(script,/photon\.komoot\.io/);
 assert.match(script,/preRegistered/);
 assert.match(script,/Endereço encontrado · confirme o ponto/);
});
test('COI and dispatch geocode address on map, not text-only',async()=>{
 const [ops,dispatch]=await Promise.all([
  readFile(new URL('../src/ops-center-ui.js',import.meta.url),'utf8'),
  readFile(new URL('../src/dispatch-wizard.js',import.meta.url),'utf8')]);
 assert.match(ops,/ops-inspection-address-suggestions/);
 assert.match(ops,/attachInspectorGeocoder\(dialog\)/);
 assert.match(ops,/photon\.komoot\.io/);
 assert.match(dispatch,/rp-dispatch-preview-map/);
 assert.match(dispatch,/userId:data\.workerId/);
 assert.match(dispatch,/points:destinations\.map/);
 assert.match(dispatch,/rp-dispatch-add-destination/);
 assert.match(dispatch,/rp-dispatch-stops/);
 assert.match(dispatch,/tile\.openstreetmap\.org/);
 assert.match(dispatch,/fallbackPreview/);
 assert.match(dispatch,/Adicione ao menos um destino/);
});

test('Photon usa o idioma suportado no servidor publico em todos os tres fluxos',async()=>{
 const files=['src/dispatch-wizard.js','src/route-planner.js','src/ops-center-ui.js'];
 for(const path of files){
  const code=await readFile(new URL('../'+path,import.meta.url),'utf8');
  assert.match(code,/photon\.komoot\.io\/api\/\?/);
  assert.match(code,/lang=default/);
  assert.doesNotMatch(code,/lang=pt/);
 }
});
