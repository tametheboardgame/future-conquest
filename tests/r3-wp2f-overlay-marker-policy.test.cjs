const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const component = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');
const hierarchyCss = fs.readFileSync('src/r3-map-hierarchy.css', 'utf8');

test('WP2F ordinary territory fill is transparent and hover is feature-state only', () => {
  assert.match(component, /promoteId: 'territory_id'/);
  assert.match(component, /\['boolean', \['feature-state', 'hover'\], false\], 0\.075,\s*0/);
  assert.match(component, /map\.setFeatureState/);
  assert.match(component, /map\.on\('mousemove', 'campaign-territories-fill'/);
  assert.match(component, /map\.on\('mouseleave', 'campaign-territories-fill'/);
});

test('WP2F marker CSS exposes one clamped LOD policy without geographic zoom scaling', () => {
  assert.match(css, /data-overlay-lod='theatre'.*--r3-marker-scale: \.82/);
  assert.match(css, /data-overlay-lod='campaign'.*--r3-marker-scale: \.94/);
  assert.match(css, /data-overlay-lod='local'.*--r3-marker-scale: 1\.05/);
  assert.match(css, /width: calc\(58px \* var\(--r3-marker-scale\)\)/);
  assert.match(css, /transition: width 140ms ease/);
});

test('WP3 physical friendly-piece layer preserves marker geometry while adding material/status hierarchy', () => {
  assert.match(hierarchyCss, /R3-WP3/);
  assert.match(hierarchyCss, /\.r3-terrain-prototype \.r3-terrain-task-group-marker \{/);
  assert.match(hierarchyCss, /--r3-piece-edge:/);
  assert.match(hierarchyCss, /box-shadow:[\s\S]*var\(--r3-piece-edge\)/);
  assert.match(hierarchyCss, /\.r3-terrain-prototype \.r3-terrain-task-group-marker::before/);
  for (const status of ['ready', 'garrison', 'moving', 'attacking', 'recovering', 'engineering', 'interdicting']) {
    assert.match(hierarchyCss, new RegExp(`r3-terrain-task-group-marker\\.${status}`));
  }
  assert.match(hierarchyCss, /r3-terrain-task-group-marker\.selected[\s\S]*z-index: 14/);
  assert.doesNotMatch(hierarchyCss, /\.r3-terrain-prototype \.r3-terrain-task-group-marker[\s\S]{0,600}transform:/);
});
