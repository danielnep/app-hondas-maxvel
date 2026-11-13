import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardCockpit} from '../src/field-guard-circuit.js';
import {PatrolMap} from '../src/map.js';
import {searchPlaces} from '../src/place-search.js';

test('guardCockpit renders search bar, results dropdown and positionable pin card', () => {
 const html = guardCockpit({planned: {name: 'Circuito Centro-Sul', points: [{name: 'Posto 1'}]}});
 assert.match(html, /data-guard-search-input/);
 assert.match(html, /data-guard-search-clear/);
 assert.match(html, /data-guard-search-pin-toggle/);
 assert.match(html, /data-guard-search-results/);
 assert.match(html, /data-guard-pin-card/);
 assert.match(html, /data-guard-pin-confirm/);
 assert.match(html, /data-guard-pin-cancel/);
 assert.match(html, /Buscar empresa ou endereço/);
});

test('PatrolMap provides search marker and manual pin handler APIs', () => {
 assert.equal(typeof PatrolMap.prototype.setSearchMarker, 'function');
 assert.equal(typeof PatrolMap.prototype.clearSearchMarker, 'function');
 assert.equal(typeof PatrolMap.prototype.setManualPinHandler, 'function');
});

test('place-search handles search with fallback mock fetcher', async () => {
 const results = await searchPlaces('Posto Petrobras', {
  fetcher: async (url) => {
   return {
    ok: true,
    json: async () => ({
     features: [
      {
       properties: {
        name: 'Posto Petrobras',
        street: 'Av. Brasil',
        housenumber: '100',
        city: 'Belo Horizonte',
        state: 'Minas Gerais',
        country: 'Brasil'
       },
       geometry: {
        coordinates: [-43.9378, -19.9208]
       }
      }
     ]
    })
   };
  }
 });
 assert.equal(results.length, 1);
 assert.equal(results[0].name, 'Posto Petrobras');
 assert.equal(results[0].lat, -19.9208);
 assert.equal(results[0].lng, -43.9378);
});

test('beta-ui.css defines search bar, dropdown and draggable pin with touch targets >= 44px', () => {
 const css = readFileSync(new URL('../assets/beta-ui.css', import.meta.url), 'utf8');
 assert.match(css, /\.rp-map-search-bar/);
 assert.match(css, /\.rp-search-results-panel/);
 assert.match(css, /\.rp-pin-confirm-card/);
 assert.match(css, /\.map-draggable-pin-host/);
 assert.match(css, /\.rp-draggable-pin/);
 assert.match(css, /min-height:\s*48px/);
 assert.match(css, /min-height:\s*44px/);
});
