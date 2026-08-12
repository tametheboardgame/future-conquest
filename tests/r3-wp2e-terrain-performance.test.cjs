const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');

test('terrain has one reusable lazy/prewarm boundary and a cacheable shared manifest', () => {
  const app = read('src/App.tsx');
  const loader = read('src/presentation/r3-terrain-loader.ts');
  const implementation = read('src/components/TerrainMapPrototypeImpl.tsx');
  assert.match(app, /prewarmTerrainMapModule/);
  assert.match(loader, /terrainModulePromise \?\?= import/);
  assert.match(implementation, /cache: 'force-cache'/);
  assert.match(implementation, /terrainSourcePromise \?\?= resolveTerrainSource/);
  assert.doesNotMatch(implementation, /no-store/);
});

test('redundant zero-opacity relief DEM is gone while mesh and hillshade stay independent', () => {
  const implementation = read('src/components/TerrainMapPrototypeImpl.tsx');
  assert.doesNotMatch(implementation, /r3-wp2b-relief-dem|color-relief-opacity/);
  assert.match(implementation, /'r3-wp2b-terrain-dem': demSource/);
  assert.match(implementation, /'r3-wp2b-hillshade-dem': \{ \.\.\.demSource \}/);
});

test('markers reconcile by stable identity and overlay source updates are isolated', () => {
  const markers = read('src/presentation/r3-terrain-operational-markers.ts');
  const implementation = read('src/components/TerrainMapPrototypeImpl.tsx');
  assert.match(markers, /priorById/);
  assert.match(markers, /return prior/);
  assert.match(implementation, /reconcileTerrainOperationalMarkers/);
  assert.doesNotMatch(implementation, /\[politicalData, frontData, routeData, nodeData\]/);
});

test('exact-head Chromium gate writes request, byte and transition evidence', () => {
  const probe = read('scripts/run-r3-wp2e-performance.mjs');
  const workflow = read('.github/workflows/r3-wp2e-performance-gate.yml');
  for (const field of ['firstUsefulPaintMs', 'campaignSettledMs', 'campaignToTheatreMs', 'theatreToSelectedMs', 'totalRequests', 'uniqueRequests', 'duplicateRequests', 'transferredBytes']) {
    assert.match(probe, new RegExp(field));
  }
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
