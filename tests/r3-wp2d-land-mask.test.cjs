const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const builder = fs.readFileSync('scripts/maps/build-r3-europe-land-mask.mjs', 'utf8');

test('WP2D-E uses a pre-clipped Europe land mask instead of converting world geometry in the browser', () => {
  assert.match(renderer, /import europeLandMask from '\.\.\/assets\/r3-europe-land-mask\.json'/);
  assert.match(renderer, /const terrainLandGeoJSON = europeLandMask/);
  assert.doesNotMatch(renderer, /world-atlas\/land-110m\.json/);
  assert.doesNotMatch(renderer, /topojsonFeature/);
  assert.match(builder, /world-atlas\/land-110m\.json/);
  assert.match(builder, /topojsonFeature\(atlas, atlas\.objects\.land\)/);
  assert.match(builder, /bboxClip/);
  assert.doesNotMatch(renderer, /world-atlas\/countries-110m\.json/);
});

test('WP2D-E keeps political and control geometry separate from the physical land mask', () => {
  assert.match(renderer, /'r3-wp2b-land': \{/);
  assert.match(renderer, /'campaign-territories': \{/);
  assert.match(renderer, /id: 'r3-wp2b-land-wash'/);
  assert.match(renderer, /id: 'campaign-territories-fill'/);
  assert.match(renderer, /id: 'campaign-administrative-borders'/);
  assert.match(renderer, /id: 'campaign-control-borders'/);
});

test('WP2D-E disables repeated world copies on the bounded Europe command map', () => {
  assert.match(renderer, /maxBounds: \[\[west, south\], \[east, north\]\]/);
  assert.match(renderer, /renderWorldCopies: false/);
});

test('WP2D-E suppresses filled land geometry at Theatre scale and restores it before Campaign scale', () => {
  const start = renderer.indexOf("id: 'r3-wp2b-land-wash'");
  const end = renderer.indexOf("id: 'r3-wp2b-hillshade'", start);
  assert.ok(start >= 0 && end > start, 'land-wash layer block was not found');
  const landWash = renderer.slice(start, end);
  assert.match(landWash, /'fill-opacity': \[/);
  assert.match(landWash, /3\.6, 0/);
  assert.match(landWash, /4\.72, 0/);
  assert.match(landWash, /4\.8, compact \? 0\.29 : 0\.34/);
});
