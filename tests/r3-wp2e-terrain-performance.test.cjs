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
  assert.match(implementation, /cache: 'default'/);
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
  assert.match(markers, /buildTerrainOperationalMarkerDescriptors/);
  assert.match(markers, /if \(!prior\) return new Marker/);
  assert.doesNotMatch(markers, /candidate\.remove\(\)/);
  assert.match(markers, /element\.onclick = descriptor\.action/);
  assert.match(markers, /return prior/);
  assert.match(implementation, /reconcileTerrainOperationalMarkers/);
  assert.doesNotMatch(implementation, /\[politicalData, frontData, routeData, nodeData\]/);
});

test('exact-head Chromium gate writes comparable request, byte and transition evidence', () => {
  const probe = read('scripts/run-r3-wp2e-performance.mjs');
  const comparison = read('scripts/compare-r3-wp2e-performance.mjs');
  const workflow = read('.github/workflows/r3-wp2e-performance-gate.yml');
  const implementation = read('src/components/TerrainMapPrototypeImpl.tsx');
  for (const field of ['firstUsefulPaintMs', 'campaignSettledMs', 'campaignToTheatreMs', 'theatreToSelectedMs', 'totalRequests', 'uniqueRequests', 'duplicateRequests', 'transferredBytes']) {
    assert.match(probe, new RegExp(field));
  }
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/);
  assert.match(probe, /R3_WP2E_BUILD_SHA/);
  assert.match(probe, /R3_WP2E_VARIANT/);
  assert.match(probe, /waitForTerrainSettlement/);
  assert.match(probe, /TERRAIN_QUIET_MS = 500/);
  assert.match(probe, /CAMERA_SETTLE_MINIMUM_MS = 950/);
  assert.match(probe, /minimumElapsed && terrainQuiet/);
  assert.match(probe, /waitForTerrainSettlement\(before, CAMERA_SETTLE_MINIMUM_MS\)/);
  assert.doesNotMatch(probe, /data-map-idle-at|data-map-moving/);
  assert.match(probe, /startupOutcome/);
  assert.match(probe, /r3-terrain-fallback-notice/);
  assert.match(workflow, /R3_WP2E_TILE_CANCELLATION: retain/);
  assert.match(implementation, /cancelPendingTileRequestsWhileZooming: !retainTilesWhileZooming/);
  assert.match(implementation, /presentationProfile === 'full'[\s\S]+tileCancellation/);
  assert.doesNotMatch(probe, /process\.env\.GITHUB_SHA/);
  assert.match(comparison, /evidence identity mismatch/);
  for (const field of ['firstUsefulPaintMs', 'campaignSettledMs', 'campaignToTheatreMs', 'theatreToSelectedMs']) {
    assert.match(comparison, new RegExp(field));
  }
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /pull_request:[\s\S]+paths:[\s\S]+scripts\/compare-r3-wp2e-performance\.mjs/);
});
