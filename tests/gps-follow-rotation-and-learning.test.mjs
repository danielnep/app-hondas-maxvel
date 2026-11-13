import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardCockpit} from '../src/field-guard-circuit.js';
import {PatrolMap, calculateAzimuth} from '../src/map.js';
import {
 calculateFrecency,
 getLearnedPlaces,
 recordLearnedPlace,
 searchPlacesWithLearned,
 LEARNED_PLACES_STORAGE_KEY
} from '../src/place-search.js';

test('guardCockpit renders GPS navigation HUD (compass and recenter buttons)', () => {
 const html = guardCockpit({planned: {name: 'Circuito Centro-Sul', points: [{name: 'Posto 1'}]}});
 assert.match(html, /rp-map-nav-hud/);
 assert.match(html, /data-action="map-compass"/);
 assert.match(html, /data-compass-needle/);
 assert.match(html, /data-compass-badge/);
 assert.match(html, /data-action="map-follow-gps"/);
 assert.match(html, /data-recenter-badge/);
 assert.match(html, /rp-map-search-bar/);
});

test('PatrolMap provides auto-follow, heading and map rotation methods', () => {
 assert.equal(typeof PatrolMap.prototype.recenterGPS, 'function');
 assert.equal(typeof PatrolMap.prototype.resetNorth, 'function');
 assert.equal(typeof PatrolMap.prototype.toggleAutonomousRotate, 'function');
 assert.equal(typeof PatrolMap.prototype.setTrackingListener, 'function');
 assert.equal(typeof PatrolMap.prototype.emitTrackingState, 'function');
});

test('calculateAzimuth computes correct cardinal headings', () => {
 const origin = {lat: -20.000, lng: -44.000};
 const north = {lat: -19.990, lng: -44.000};
 const east = {lat: -20.000, lng: -43.990};
 const south = {lat: -20.010, lng: -44.000};
 const west = {lat: -20.000, lng: -44.010};

 const azNorth = calculateAzimuth(origin, north);
 const azEast = calculateAzimuth(origin, east);
 const azSouth = calculateAzimuth(origin, south);
 const azWest = calculateAzimuth(origin, west);

 assert.ok(Math.abs(azNorth - 0) < 1 || Math.abs(azNorth - 360) < 1, `North azimuth: ${azNorth}`);
 assert.ok(Math.abs(azEast - 90) < 2, `East azimuth: ${azEast}`);
 assert.ok(Math.abs(azSouth - 180) < 2, `South azimuth: ${azSouth}`);
 assert.ok(Math.abs(azWest - 270) < 2, `West azimuth: ${azWest}`);
});

test('fast learning algorithm tracks recurrent companies with frecency weighting', () => {
 // Mock localStorage
 const store = new Map();
 globalThis.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
 };

 const now = Date.now();
 const recentPlace = {
  name: 'Empresa Alfa Segurança Ltda',
  address: 'Rua das Flores, 500, Centro',
  lat: -20.1420,
  lng: -44.8850,
  isCompany: true
 };

 // First record
 const first = recordLearnedPlace(recentPlace, {now});
 assert.equal(first.count, 1);
 assert.equal(first.name, 'Empresa Alfa Segurança Ltda');

 // Second record (fast learning: count increases and becomes recurrent)
 const second = recordLearnedPlace(recentPlace, {now: now + 60000});
 assert.equal(second.count, 2);
 assert.equal(second.isRecurrent, true);

 // Frecency calculation
 const score = calculateFrecency(second, now + 60000);
 assert.ok(score > 80, `Expected high frecency score: ${score}`);

 // Retrieve learned places
 const list = getLearnedPlaces({query: 'Alfa', now: now + 60000});
 assert.ok(list.length >= 1);
 assert.equal(list[0].name, 'Empresa Alfa Segurança Ltda');
 assert.equal(list[0].isRecurrent, true);
});

test('searchPlacesWithLearned combines instant learned places and remote results', async () => {
 const results = await searchPlacesWithLearned('Posto', {
  focus: {lat: -19.9208, lng: -43.9378},
  fetcher: async () => ({
   ok: true,
   json: async () => ({
    features: [
     {
      properties: {name: 'Posto Shell Ipiranga', street: 'Av. Amazonas', city: 'Belo Horizonte'},
      geometry: {coordinates: [-43.9400, -19.9250]}
     }
    ]
   })
  })
 });

 assert.ok(results.length >= 1);
 const foundPosto = results.some(p => p.name.includes('Posto'));
 assert.ok(foundPosto, 'Should find Posto in results');
});

test('beta-ui.css defines tactical HUD, compass needle, and pure neutral search styling', () => {
 const css = readFileSync(new URL('../assets/beta-ui.css', import.meta.url), 'utf8');
 assert.match(css, /\.rp-map-nav-hud/);
 assert.match(css, /\.rp-map-btn-compass/);
 assert.match(css, /\.rp-map-btn-recenter/);
 assert.match(css, /\.rp-compass-needle/);
 assert.match(css, /\.rp-recurrent-tag/);
 assert.match(css, /\.rp-search-section-header/);
 assert.match(css, /rgba\(25,\s*25,\s*25/); // pure neutral R=G=B
});
