const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const builder = fs.readFileSync('scripts/maps/build-r3-europe-land-mask.mjs', 'utf8');
const grading = fs.readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');

test('WP2D-E uses pre-clipped Europe land geometry instead of converting world geometry in the browser', () => {
  assert.match(renderer, /import europeLandMask from '\.\.\/assets\/r3-europe-land-mask\.json'/);
  assert.match(renderer, /const terrainLandGeoJSON = europeLandMask/);
  assert.doesNotMatch(renderer, /world-atlas\/land-(?:50m|110m)\.json/);
  assert.doesNotMatch(renderer, /topojsonFeature/);

  assert.match(builder, /world-atlas\/land-50m\.json/);
  assert.match(builder, /topojsonFeature\(atlas, atlas\.objects\.land\)/);
  assert.match(builder, /bboxClip/);
  assert.match(builder, /public\/generated\/r3-terrain\/europe-land-mask-50m\.geojson/);

  assert.match(grading, /detailedLandMaskPath: 'generated\/r3-terrain\/europe-land-mask-50m\.geojson'/);
  assert.match(grading, /landSource\.setData/);
  assert.match(grading, /'110m-fallback'/);
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

test('WP2E baseline keeps a coherent fallback land surface while detailed terrain progressively settles', () => {
  const start = renderer.indexOf("id: 'r3-wp2b-land-wash'");
  const end = renderer.indexOf("id: 'r3-wp2b-hillshade'", start);
  assert.ok(start >= 0 && end > start, 'land-wash layer block was not found');
  const landWash = renderer.slice(start, end);
  assert.match(landWash, /'fill-opacity': \[/);
  assert.match(landWash, /3\.6, compact \? 0\.25 : 0\.3/);
  assert.match(landWash, /4\.8, compact \? 0\.23 : 0\.27/);
  assert.match(landWash, /8\.5, compact \? 0\.1 : 0\.12/);

  // WP3.9B deliberately promotes this baseline to one opaque neutral board
  // surface after the map style is ready; this keeps the original renderer
  // fallback contract intact without reintroducing a political colour wash.
  assert.match(grading, /'r3-wp2b-land-wash', 'fill-opacity', 1/);
});
