const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const markers = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');
const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

test('WP2D-D tags every terrain marker with stable priority metadata and explicit screen offset', () => {
  assert.match(markers, /element\.dataset\.r3MarkerKind = kind/);
  assert.match(markers, /element\.dataset\.r3MarkerId = markerId/);
  assert.match(markers, /element\.dataset\.r3MarkerOffsetX = String\(offset\[0\]\)/);
  assert.match(markers, /element\.dataset\.r3MarkerOffsetY = String\(offset\[1\]\)/);
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
  assert.match(markers, /visibleTerrainMarkerIds\(candidates, terrainMarkerLodForZoom\(map\.getZoom\(\)\)\)/);
  assert.match(markers, /element\.hidden = hidden/);
  assert.doesNotMatch(markers, /setLngLat\([^\n]*declutter/i);
});

test('WP2D-D reapplies declutter after state rebuilds and camera movement', () => {
  assert.match(renderer, /applyTerrainOperationalMarkerDeclutter\(map, operationalMarkersRef\.current\)/);
  assert.match(renderer, /map\.on\('moveend', refreshOperationalPresentation\)/);
  assert.match(renderer, /const refreshOperationalPresentation = \(\) => \{[\s\S]*updateOverlayLod\(\);[\s\S]*applyTerrainOperationalMarkerDeclutter/);
});
