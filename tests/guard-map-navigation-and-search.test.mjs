import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardCockpit} from '../src/field-guard-circuit.js';
import {PatrolMap, calculateAzimuth} from '../src/map.js';
import {
 getLearnedPlaces,
 recordLearnedPlace,
 calculateFrecency,
 searchPlacesWithLearned,
 INITIAL_RECURRENT_COMPANIES
} from '../src/place-search.js';

test('calculateAzimuth computes angles accurately across 4 cardinal and ordinal directions', () => {
 const base = {lat: -20.0000, lng: -44.0000};
 
 // Moving directly North (latitude increases, longitude constant)
 const north = {lat: -19.9900, lng: -44.0000};
 const northBearing = calculateAzimuth(base, north);
 assert.ok(Math.abs(northBearing - 0) < 0.5 || Math.abs(northBearing - 360) < 0.5, `North should be ~0°, got ${northBearing}`);

 // Moving directly East (latitude constant, longitude increases)
 const east = {lat: -20.0000, lng: -43.9900};
 const eastBearing = calculateAzimuth(base, east);
 assert.ok(Math.abs(eastBearing - 90) < 1.0, `East should be ~90°, got ${eastBearing}`);

 // Moving directly South (latitude decreases, longitude constant)
 const south = {lat: -20.0100, lng: -44.0000};
 const southBearing = calculateAzimuth(base, south);
 assert.ok(Math.abs(southBearing - 180) < 1.0, `South should be ~180°, got ${southBearing}`);

 // Moving directly West (latitude constant, longitude decreases)
 const west = {lat: -20.0000, lng: -44.0100};
 const westBearing = calculateAzimuth(base, west);
 assert.ok(Math.abs(westBearing - 270) < 1.0, `West should be ~270°, got ${westBearing}`);

 // Invalid inputs return null
 assert.equal(calculateAzimuth(null, east), null);
 assert.equal(calculateAzimuth(base, null), null);
});

test('guardCockpit contains navigation HUD, compass needle, GPS recenter button and search bar', () => {
 const html = guardCockpit({planned: {name: 'Rota Noturna', points: [{name: 'P1'}]}});
 
 // Search bar & pin
 assert.match(html, /class="rp-map-search-bar"/);
 assert.match(html, /data-guard-search-input/);
 assert.match(html, /data-guard-search-clear/);
 assert.match(html, /data-guard-search-pin-toggle/);
 assert.match(html, /data-guard-search-results/);
 assert.match(html, /data-guard-pin-card/);
 
 // Navigation HUD
 assert.match(html, /class="rp-map-nav-hud"/);
 assert.match(html, /data-action="map-compass"/);
 assert.match(html, /data-compass-needle/);
 assert.match(html, /data-compass-badge/);
 assert.match(html, /data-action="map-follow-gps"/);
 assert.match(html, /data-recenter-badge/);
});

test('PatrolMap tracking and rotation interface contracts are defined', () => {
 assert.equal(typeof PatrolMap.prototype.setTrackingListener, 'function');
 assert.equal(typeof PatrolMap.prototype.emitTrackingState, 'function');
 assert.equal(typeof PatrolMap.prototype.recenterGPS, 'function');
 assert.equal(typeof PatrolMap.prototype.resetNorth, 'function');
 assert.equal(typeof PatrolMap.prototype.toggleAutonomousRotate, 'function');
});

test('beta-ui.css enforces zero blue #1F98FF and satisfies mobile touch target >= 44px', () => {
 const css = readFileSync(new URL('../assets/beta-ui.css', import.meta.url), 'utf8');
 
 // Strict Maxvel blue prohibition
 assert.doesNotMatch(css, /#1F98FF/i, 'Strict prohibition of #1F98FF in Ronda Pro');
 
 // Search bar styling
 assert.match(css, /\.rp-map-search-bar\s*\{[^}]*min-height:\s*48px/);
 assert.match(css, /\.rp-map-search-bar input\[type="search"\]\s*\{[^}]*min-height:\s*44px/);
 assert.match(css, /\.rp-map-search-bar \.rp-search-btn-pin/);
 
 // Navigation HUD styling
 assert.match(css, /\.rp-map-nav-hud/);
 assert.match(css, /\.rp-map-btn-compass/);
 assert.match(css, /\.rp-map-btn-recenter/);
 assert.match(css, /min-width:\s*48px/);
 assert.match(css, /min-height:\s*48px/);
 
 // Emerald active color for GPS follow
 assert.match(css, /\.rp-map-btn-recenter\.is-active\s*\{[^}]*#10b981/i);
});

test('learned places calculates frecency and ranks recurrent companies without Horizon naming', () => {
 const now = Date.now();
 const item = {count: 5, lastUsed: now - 3600000};
 const score = calculateFrecency(item, now);
 assert.ok(score > 50, `Score should be > 50, got ${score}`);

 const places = getLearnedPlaces({limit: 10, now});
 assert.ok(places.length >= 3);
 for (const p of places) {
  assert.ok(!/Horizon/i.test(p.name), `Company name "${p.name}" must not contain Horizon in Ronda Pro`);
 }
});
