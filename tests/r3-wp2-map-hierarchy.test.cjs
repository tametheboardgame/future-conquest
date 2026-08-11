const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const main = fs.readFileSync('src/main.tsx', 'utf8');
const hierarchy = fs.readFileSync('src/r3-map-hierarchy.css', 'utf8');
const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');

test('R3 WP2 hierarchy tuning loads after the base strategic map and before responsive fit', () => {
  const strategic = main.indexOf("import './r3-strategic-map.css'");
  const hierarchyIndex = main.indexOf("import './r3-map-hierarchy.css'");
  const responsive = main.indexOf("import './responsive-command-fit.css'");
  assert.ok(strategic >= 0 && hierarchyIndex > strategic && responsive > hierarchyIndex);
});

test('R3 WP2 detail tiers progressively suppress country labels in crowded local views', () => {
  assert.match(hierarchy, /map-detail-regional \.future-theatre-labels[\s\S]*opacity: \.5/);
  assert.match(hierarchy, /map-detail-local \.future-theatre-labels[\s\S]*opacity: \.11/);
  assert.match(hierarchy, /map-detail-tactical \.future-theatre-labels[\s\S]*opacity: \.05/);
  assert.match(hierarchy, /country-name-label\.compact[\s\S]*opacity: 0/);
  assert.match(map, /detailTier = zoomPercent >= 600 \? 'tactical' : zoomPercent >= 285 \? 'local' : zoomPercent >= 135 \? 'regional' : 'theatre'/);
});

test('R3 WP2 keeps centre labels above subordinate full territory names at dense zooms', () => {
  assert.match(hierarchy, /map-detail-local \.territory-centre-label[\s\S]*font-size: 15px/);
  assert.match(hierarchy, /map-detail-local \.territory-name-label[\s\S]*opacity: \.68/);
  assert.match(hierarchy, /map-detail-tactical \.territory-name-label[\s\S]*opacity: 1/);
  assert.match(hierarchy, /territory-centre-label,[\s\S]*drop-shadow/);
});

test('R3 WP2 fronts become a supporting cue at local and tactical scale', () => {
  assert.match(hierarchy, /map-detail-regional \.r3-front-line-layer[\s\S]*opacity: \.92/);
  assert.match(hierarchy, /map-detail-local \.r3-front-line-layer[\s\S]*opacity: \.78/);
  assert.match(hierarchy, /map-detail-tactical \.r3-front-line-layer[\s\S]*opacity: \.66/);
  assert.match(hierarchy, /map-detail-local \.r3-front-line-underlay,[\s\S]*stroke-width: 5\.5px/);
});

test('R3 WP2 optional routes and strategic nodes remain legible above terrain without outranking operations', () => {
  assert.match(hierarchy, /\.strategic-route[\s\S]*filter: drop-shadow/);
  assert.match(hierarchy, /map-detail-tactical \.strategic-route[\s\S]*opacity: \.7/);
  assert.match(hierarchy, /\.strategic-node \.node-name[\s\S]*stroke-width: 4\.2px/);
  assert.match(hierarchy, /task-group-marker,[\s\S]*enemy-contact-marker,[\s\S]*threat-marker,[\s\S]*operation-marker/);
  assert.match(hierarchy, /operational layer/i);
});

test('R3 WP2 mobile hierarchy reduces simultaneous surface effects', () => {
  assert.match(hierarchy, /@media \(max-width: 900px\)[\s\S]*active-campaign-layer[\s\S]*filter: none/);
  assert.match(hierarchy, /@media \(max-width: 900px\)[\s\S]*r3-territory-light-layer[\s\S]*opacity: \.42/);
  assert.match(hierarchy, /@media \(max-width: 900px\)[\s\S]*territory-sheen[\s\S]*opacity: \.12/);
  assert.match(hierarchy, /@media \(max-width: 900px\)[\s\S]*strategic-route[\s\S]*filter: none/);
  assert.match(hierarchy, /@media \(max-width: 540px\)[\s\S]*future-theatre-labels[\s\S]*opacity: 0/);
  assert.match(hierarchy, /@media \(prefers-reduced-motion: reduce\)/);
});
