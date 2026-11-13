import test from 'node:test';
import assert from 'node:assert/strict';
import {routeOnlySVG,fallbackSVG} from '../src/map.js';
import {fetchInspectionStreetPath} from '../src/inspection-street-route.js';
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
const route={roadRouting:true,baseKnown:true,base:{lat:-20.140,lng:-44.880,name:'Base'},points:[{lat:-20.141,lng:-44.881,name:'Portaria 1'},{lat:-20.142,lng:-44.882,name:'Portaria 2'}]};
test('mapa offline segue percurso real salvo e posição, sem inventar malha de ruas',async()=>{
 const geometry=[[-44.880,-20.140],[-44.8805,-20.1403],[-44.881,-20.141],[-44.882,-20.142]];
 await fetchInspectionStreetPath(route,{fetcher:async()=>({ok:true,json:async()=>({code:'Ok',routes:[{geometry:{coordinates:geometry}}]})})});
 const inizio=routeOnlySVG(route,{index:0,checkpoints:[{},{}]},{lat:-20.1405,lng:-44.8807},{width:390,height:640});
 const now=routeOnlySVG(route,{index:1,checkpoints:[{completedAt:100},{}]},{lat:-20.1419,lng:-44.8819},{width:390,height:640});
 assert.match(inizio,/ROTA REAL SALVA/);
 assert.match(now,/Mapa offline da rota atribuída/);
 assert.notEqual(inizio,now,'movimento e progresso devem alterar o mapa sem rede');
 assert.doesNotMatch(now,/roadgrid|esquemático/);
 assert.equal((now.match(/<polyline/g)||[]).length,2);
 assert.match(fallbackSVG(route,null,{lat:-20.141,lng:-44.881}),/ROTA REAL SALVA/);
});
