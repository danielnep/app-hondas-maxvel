import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEMO_ROUTE,DWELL_MS,RADIUS_METERS,createSession,updateLocation,canCompletePoint,completePoint} from '../src/domain.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const android=readFileSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');

test('versão sem captura de fotos e selfie, inclusive Android',()=>{
 assert.doesNotMatch(app,/getUserMedia|capturePhoto|captureSelfie|<input[^>]+type=["']file["']/i);
 assert.doesNotMatch(app,/data-action=["'](?:take-photo|take-selfie|capture-photo|capture-selfie)["']/i);
 assert.doesNotMatch(android,/android\.permission\.CAMERA|android\.permission\.READ_MEDIA_IMAGES/i);
});
test('validação GPS e permanência permanecem funcionais sem fotografia',()=>{
 assert.equal(DEMO_ROUTE.points.length,4);
 assert.equal(RADIUS_METERS,25);
 assert.equal(DWELL_MS,30000);
 const start=Date.now(),s=createSession('Teste sem fotos',DEMO_ROUTE,start);
 const p=s.route.points[0];
 for(const delta of [0,10000,20000,30000]){
  const time=start+delta;
  updateLocation(s,{lat:p.lat,lng:p.lng,accuracy:5,at:time},time);
 }
 assert.equal(canCompletePoint(s),true);
 assert.equal(completePoint(s,start+30000),true);
 assert.equal(s.index,1);
});
