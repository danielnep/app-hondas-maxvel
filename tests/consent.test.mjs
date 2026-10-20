import test from 'node:test';import assert from 'node:assert/strict';
import {getConsent,saveConsent,revokeConsent,LOCATION_REQUIREMENTS} from '../src/consent.js';
const storage=()=>{const m=new Map();return {setItem:(k,v)=>m.set(k,v),getItem:k=>m.get(k)||null,removeItem:k=>m.delete(k)}};
test('consentimento da primeira abertura só vale após aceitar',()=>{const s=storage();assert.equal(getConsent(s),null);saveConsent(s,1234);assert.equal(getConsent(s).at,1234);revokeConsent(s);assert.equal(getConsent(s),null)});
test('informações explicam segundo plano e limites da web',()=>{assert.equal(LOCATION_REQUIREMENTS.length,4);assert.match(LOCATION_REQUIREMENTS.map(x=>x.description).join(' '),/navegador não acompanha/)});
