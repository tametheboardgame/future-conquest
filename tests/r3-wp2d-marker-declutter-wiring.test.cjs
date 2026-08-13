const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const markers = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');
const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');

test('WP2D-D tags every terrain marker with stable priority metadata and explicit screen offset', () => {
  assert.match(markers, /Object\.assign\(element\.dataset, \{[\s\S]*r3MarkerKind: kind,[\s\S]*r3MarkerId: markerId,[\s\S]*r3MarkerOffsetX: String\(offset\[0\]\),[\s\S]*r3MarkerOffsetY: String\(offset\[1\]\)[\s\S]*\}\)/);
  assert.match(markers, /Object\.assign\(element\.dataset, descriptor\.dataset\)/);
  for (const kind of [
    'selected-formation',
    'formation',
    'operation',
    'live-threat',
    'recent-threat',
    'selected-territory',
    'territory',
    'enemy-confirmed',
    'enemy-estimated',
    'enemy-activity',
    'enemy-stale',
    'node-major',
    'node-secondary',
    'portal'
  ]) assert.match(markers, new RegExp(`'${kind}'`));
});

test('WP2D-D declutters from projected screen coordinates without altering authoritative marker geography', () => {
  assert.match(markers, /map\.project\(marker\.getLngLat\(\)\)/);
  assert.match(markers, /visibleTerrainMarkerIds\([\s\S]*candidates,[\s\S]*terrainMarkerLodForZoom\(map\.getZoom\(\)\),[\s\S]*reservedRects[\s\S]*\)/);
  assert.match(markers, /element\.hidden = hidden/);
  assert.doesNotMatch(markers, /setLngLat\([^\n]*declutter/i);
});

test('WP2D-D converts the persistent terrain toolbar into a local screen-space reserved rectangle', () => {
  assert.match(markers, /map\.getContainer\(\)\.getBoundingClientRect\(\)/);
  assert.match(markers, /querySelector\('\.r3-terrain-prototype-toolbar'\)/);
  assert.match(markers, /left: toolbarRect\.left - mapRect\.left/);
  assert.match(markers, /top: toolbarRect\.top - mapRect\.top/);
  assert.match(markers, /right: toolbarRect\.right - mapRect\.left/);
  assert.match(markers, /bottom: toolbarRect\.bottom - mapRect\.top/);
});

test('WP2D-D shifts visible protected territory names clear of the actual toolbar before other collision passes', () => {
  assert.match(markers, /function avoidTerritoryToolbarCollisions\(markers: readonly Marker\[\], toolbar: Element \| null \| undefined\)/);
  assert.match(markers, /kind !== 'territory' && kind !== 'selected-territory'/);
  assert.match(markers, /toolbarRect\.bottom - rect\.top \+ gap/);
  assert.match(markers, /toolbarDisplacementX/);
  assert.match(markers, /toolbarDisplacementY/);
  assert.doesNotMatch(markers, /setLngLat\([^\n]*toolbar/i);
  assert.match(markers, /avoidTerritoryToolbarCollisions\(markers, toolbar\);\s*avoidFormationLabelCollisions\(markers\);\s*avoidEnemyPlaceLabelCollisions\(markers\);/);
});

test('WP2D-D hidden declutter state beats marker display rules in the real browser cascade', () => {
  assert.match(markers, /element\.dataset\.declutter = hidden \? 'hidden' : 'visible'/);
  assert.match(css, /\[data-declutter="hidden"\]\s*\{\s*display:\s*none\s*!important;/);
});

test('WP2D-D reapplies declutter after state rebuilds and camera movement', () => {
  assert.match(renderer, /applyTerrainOperationalMarkerLayout\(map, operationalMarkersRef\.current, layers/);
  assert.match(renderer, /map\.on\('moveend', refreshOperationalPresentation\)/);
  assert.match(renderer, /const refreshOperationalPresentation = \(\) => \{[\s\S]*updateOverlayLod\(\);[\s\S]*applyTerrainOperationalMarkerLayout/);
});
