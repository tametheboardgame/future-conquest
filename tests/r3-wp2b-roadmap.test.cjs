const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const roadmap = fs.readFileSync('docs/roadmap/R3-ROADMAP.md', 'utf8');
const packageDoc = fs.readFileSync('docs/roadmap/R3-WP2B-REAL-TERRAIN.md', 'utf8');
const dataDoc = fs.readFileSync('docs/architecture/R3-WP2B-TERRAIN-DATA.md', 'utf8');

test('R3 programme inserts WP2B before formation animation', () => {
  const wp2b = roadmap.indexOf('## R3-WP2B - Real Terrain Foundation');
  const wp3 = roadmap.indexOf('## R3-WP3 - Formation Pieces & Animated Movement');
  assert.ok(wp2b >= 0 && wp3 > wp2b);
  assert.match(roadmap, /WP3 is paused until WP2B/i);
});

test('R3 WP2B explicitly replaces political slab elevation with continuous terrain', () => {
  assert.match(packageDoc, /single continuous geospatial terrain surface/i);
  assert.match(packageDoc, /Political capture must never alter the physical terrain mesh/i);
  assert.match(packageDoc, /no continuation of the WP2 raised-political-slab effect as the primary map/i);
});

test('R3 WP2B selects MapLibre Copernicus and Three.js with an SVG fallback', () => {
  assert.match(packageDoc, /Primary terrain\/map platform: \*\*MapLibre GL JS\*\*/);
  assert.match(packageDoc, /Terrain source direction: \*\*Copernicus DEM\*\*/);
  assert.match(packageDoc, /Three\.js through a MapLibre custom 3D layer/);
  assert.match(packageDoc, /SVG\/DOM strategic map remains an accessible\/reduced-effects\/failure fallback/);
});

test('R3 WP2B forbids browser geospatial acquisition credentials', () => {
  assert.match(dataDoc, /does not query authenticated Copernicus DEM services from the shipped browser/i);
  assert.match(dataDoc, /No terrain acquisition credential or access token belongs in Vite\/browser output/i);
  assert.match(dataDoc, /MapLibre requests only the generated same-origin Terrain-RGB assets/i);
  assert.match(packageDoc, /shipped browser must not contain Copernicus client secrets/i);
});
