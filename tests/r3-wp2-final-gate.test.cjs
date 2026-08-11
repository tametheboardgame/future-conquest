const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');
const baseCss = fs.readFileSync('src/r3-strategic-map.css', 'utf8');
const hierarchyCss = fs.readFileSync('src/r3-map-hierarchy.css', 'utf8');

const decorativeGroups = [
  'r3-territory-depth-layer',
  'r3-terrain-layer',
  'r3-territory-light-layer',
  'r3-front-line-layer'
];

test('R3 WP2 preserves the authoritative geographic source and territory interaction path', () => {
  assert.match(map, /import activeGeojson from '..\/assets\/vertical-slice-map\.json'/);
  assert.match(map, /SLICE_IDS\.includes\(active\.properties\?\.territory_id/);
  assert.match(map, /const activePaths = activeFeatures\.map/);
  assert.match(map, /<path key=\{id\} d=\{path\} onClick=\{\(\) => selectTerritory\(id\)\}/);
  assert.match(map, /className="territory-hit-target"/);
});

test('R3 WP2 decorative depth terrain lighting and fronts cannot steal hit testing', () => {
  for (const group of decorativeGroups) {
    assert.ok(map.includes(`className="${group}" aria-hidden="true"`), `missing aria-hidden ${group}`);
  }
  assert.match(baseCss, /\.r3-territory-depth-layer,[\s\S]*\.r3-front-line-layer[\s\S]*pointer-events: none/);
  assert.match(baseCss, /\.territory-terrain,[\s\S]*\.territory-sheen[\s\S]*pointer-events: none/);
  assert.match(baseCss, /\.r3-front-line-underlay,[\s\S]*\.r3-front-line-core[\s\S]*pointer-events: none/);
});

test('R3 WP2 retains the established theatre regional local tactical zoom contract', () => {
  assert.match(map, /zoomPercent >= 600 \? 'tactical' : zoomPercent >= 285 \? 'local' : zoomPercent >= 135 \? 'regional' : 'theatre'/);
  for (const tier of ['theatre', 'regional', 'local', 'tactical']) {
    assert.ok(hierarchyCss.includes(`map-detail-${tier}`) || tier === 'theatre');
  }
});

test('R3 WP2 keeps keyboard and accessible SVG navigation intact', () => {
  assert.match(map, /role="application"/);
  assert.match(map, /tabIndex=\{0\}/);
  assert.match(map, /onKeyDown=\{handleKeyboard\}/);
  assert.match(map, /event\.key\.toLowerCase\(\) === 't'/);
  assert.match(map, /event\.key\.toLowerCase\(\) === 'c'/);
  assert.match(map, /event\.key\.toLowerCase\(\) === 'f'/);
});

test('R3 WP2 explicitly reduces duplicate layered effects on mobile', () => {
  const mobile = hierarchyCss.match(/@media \(max-width: 900px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(mobile, /\.active-campaign-layer[\s\S]*filter: none/);
  assert.match(mobile, /\.territory-sheen[\s\S]*opacity: \.12/);
  assert.match(mobile, /\.strategic-route[\s\S]*filter: none/);
  assert.match(baseCss, /@media \(max-width: 900px\)[\s\S]*\.territory-depth-shell[\s\S]*translateY\(3px\)/);
});

test('R3 WP2 preserves reduced-motion handling for animated map states', () => {
  assert.match(baseCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(baseCss, /\.territory\.active-battle[\s\S]*animation: none/);
  assert.match(hierarchyCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/);
});
