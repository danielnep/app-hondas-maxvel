import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchInspectionStreetPath,readOfflineStreetPath} from '../src/inspection-street-route.js';
const data=new Map();globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
const route={roadRouting:true,baseKnown:true,base:{lat:-20.14,lng:-44.88},points:[{lat:-20.141,lng:-44.881}]};
test('downloaded route geometry remains available with zero network',async()=>{
 data.clear();let requests=0;
 const path=await fetchInspectionStreetPath(route,{fetcher:async()=>{requests++;return {ok:true,json:async()=>({code:'Ok',routes:[{geometry:{coordinates:[[-44.88,-20.14],[-44.881,-20.141]]}}]})}}});
 assert.equal(requests,1);assert.deepEqual(path,readOfflineStreetPath(route));
 assert.deepEqual(await fetchInspectionStreetPath(route,{fetcher:()=>{throw Error('offline')}}),path);
 assert.equal(readOfflineStreetPath({...route,points:[{lat:-20.2,lng:-44.89}]}),null);
});
