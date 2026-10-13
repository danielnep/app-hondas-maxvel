import test from 'node:test';
import assert from 'node:assert/strict';
import {PatrolMap} from '../src/map.js';
import {DEMO_ROUTE} from '../src/domain.js';

test('cartografia inicial funciona sem chave e a falha de rede preserva a rota alternativa',async()=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 let removed=false;
 const map={on(){},hasLayer(){return true},remove(){removed=true},fitBounds(){},invalidateSize(){}};
 let requestedUrl,errorHandler;
 const tile={on(event,handler){if(event==='tileerror')errorHandler=handler;return this},addTo(){return this}};
 const L={map(){return map},tileLayer(url){requestedUrl=url;return tile},control:{zoom(){return {addTo(){}}}}};
 const attributes={};
 const container={innerHTML:'',setAttribute(name,value){attributes[name]=value}};
 class ProviderOnlyMap extends PatrolMap {refreshGeometry(){}}
 let patrol;
 try {
  globalThis.window={L};globalThis.document={};
  patrol=new ProviderOnlyMap(container,{route:DEMO_ROUTE});
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(requestedUrl.startsWith('https://tile.openstreetmap.org/'));
  assert.doesNotMatch(requestedUrl,/key=|cartocdn/);
  assert.equal(patrol.instance,map);
  for(let i=0;i<8;i++)errorHandler();
  assert.equal(removed,true);
  assert.equal(patrol.instance,null);
  assert.equal(attributes['data-map-fallback'],'true');
  assert.match(container.innerHTML,/mapa esquemático/);
  assert.match(container.innerHTML,/polyline/);
 } finally {
  patrol?.destroy();
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
 }
});
