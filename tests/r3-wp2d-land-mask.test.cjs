const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

test('WP2D-E uses the continuous World Atlas land mask instead of filling a country collection', () => {
  assert.match(renderer, /import worldLand from 'world-atlas\/land-110m\.json'/);
  assert.match(renderer, /objects: \{ land: unknown \}/);
  assert.match(renderer, /topojsonFeature\(landAtlas, landAtlas\.objects\.land\)/);
  assert.doesNotMatch(renderer, /world-atlas\/countries-110m\.json/);
  assert.doesNotMatch(renderer, /atlas\.objects\.countries/);
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
