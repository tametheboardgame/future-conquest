const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const roadmap = fs.readFileSync('docs/roadmap/R3-ROADMAP.md', 'utf8');
const packageDoc = fs.readFileSync('docs/roadmap/R3-WP2B-REAL-TERRAIN.md', 'utf8');
const dataDoc = fs.readFileSync('docs/architecture/R3-WP2B-TERRAIN-DATA.md', 'utf8');

test('R3 programme records terrain completion and gates WP4 after recovery', () => {
  const wp2b = roadmap.indexOf('## R3-WP2B - Real Terrain Foundation');
  const wp2c = roadmap.indexOf('## R3-WP2C - Terrain Operational Overlay Parity');
  const wp2d = roadmap.indexOf('## R3-WP2D - Terrain Refinement & Presentation Polish');
  const wp2e = roadmap.indexOf('## R3-WP2E through post-WP2I terrain completion');
  const wp3 = roadmap.indexOf('## R3-WP3 - Formation Pieces & Animated Movement');
  const recovery = roadmap.indexOf('## R3 Production Coherence Recovery');
  const stabilisation = roadmap.indexOf('## R3 Stabilisation Gate - Map & WP3 Bug Remediation');
  const wp4 = roadmap.indexOf('## R3-WP4 - Battle, Front & Strategic Event Feedback');
  assert.ok(wp2b >= 0 && wp2c > wp2b && wp2d > wp2c && wp2e > wp2d && wp3 > wp2e);
  assert.ok(recovery > wp3 && stabilisation > recovery && wp4 > stabilisation);
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
