const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');

test('player formations stay geographically anchored instead of using large fixed offsets', () => {
  const markers = read('src/presentation/r3-terrain-operational-markers.ts');
  assert.match(markers, /if \(count <= 1\) return \[0, 0\]/);
  assert.match(markers, /const horizontalPitch = 64/);
  assert.match(markers, /const verticalPitch = 44/);
  assert.match(markers, /formationOffset\(index, ordered\.length\)/);
  assert.doesNotMatch(markers, /42 \+ row \* 52/);
  assert.match(markers, /distance <= 48/);
  assert.match(markers, /formationDisplacementX/);
});

test('all player formations are protected from declutter hiding', () => {
  const declutter = read('src/presentation/r3-terrain-marker-declutter.ts');
  assert.match(declutter, /formation: \{ priority: 850, radius: 32, minimumLod: 'theatre', protected: true \}/);
});

test('browser visual probe guards formation visibility, viewport presence and territory alignment', () => {
  const probe = read('scripts/run-r3-wp2f-visual-runtime.mjs');
  assert.match(probe, /visibleFormationCount !== profile\.formationCount/);
  assert.match(probe, /profile\.collisions\.length/);
  assert.match(probe, /displacementPx > 49/);
  assert.match(probe, /placeLabelCollisions\.length/);
  assert.match(probe, /visibleTerritoryCount !== profile\.territoryCount/);
  assert.match(probe, /formationsInCanvas !== profile\.formationCount/);
  assert.match(probe, /data-territory-id/);
  assert.match(probe, /duplicateNodeLayerPresent/);
  assert.match(probe, /queryTerrainElevation/);
});
