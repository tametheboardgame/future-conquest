const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = filePath => fs.readFileSync(filePath, 'utf8');

test('terrain has one reusable lazy/prewarm boundary and a cacheable shared manifest', () => {
  const app = read('src/App.tsx');
  const loader = read('src/presentation/r3-terrain-loader.ts');
  const implementation = read('src/components/TerrainMapPrototypeImpl.tsx');
  assert.match(app, /prewarmTerrainMapModule/);
  assert.match(loader, /terrainModulePromise \?\?= import/);
  assert.match(loader, /terrainModulePromise = undefined/);
  assert.match(loader, /TerrainMapModuleHost/);
  assert.match(loader, /onFallback\(`The terrain renderer could not be loaded/);
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
  const markerWrapper = read('src/presentation/r3-terrain-operational-markers.ts');
  const markerCore = read('src/presentation/r3-terrain-operational-markers-core.ts');
  const implementation = read('src/components/TerrainMapPrototypeImpl.tsx');
  assert.match(markerWrapper, /reconcileCoreTerrainOperationalMarkers/);
  assert.match(markerCore, /priorById/);
  assert.match(markerCore, /buildTerrainOperationalMarkerDescriptors/);
  assert.match(markerCore, /if \(!prior\) return new Marker/);
  assert.doesNotMatch(markerCore, /candidate\.remove\(\)/);
  assert.match(markerCore, /element\.onclick = descriptor\.action/);
  assert.match(markerCore, /return prior/);
  assert.match(implementation, /reconcileTerrainOperationalMarkers/);
  assert.doesNotMatch(implementation, /\[politicalData, frontData, routeData, nodeData\]/);
});

test('exact-head Chromium gate waits for useful paint and completed terrain bodies', () => {
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
  assert.match(probe, /data-status="ready"/);
  assert.match(probe, /data-overlay-lod.*campaign/);
  assert.match(probe, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/);
  assert.match(probe, /animationFramesAfterReady: 2/);
  assert.match(probe, /waitForTerrainSettlement/);
  assert.match(probe, /TERRAIN_QUIET_MS = 500/);
  assert.match(probe, /CAMERA_SETTLE_MINIMUM_MS = 950/);
  assert.match(probe, /inFlightTerrainRequests/);
  assert.match(probe, /page\.on\('requestfinished'/);
  assert.match(probe, /requiresCompletedTerrainBodies: true/);
  assert.match(probe, /minimumElapsed && noTerrainInFlight && terrainQuiet/);
  assert.match(probe, /waitForTerrainSettlement\(before, CAMERA_SETTLE_MINIMUM_MS\)/);
  assert.doesNotMatch(probe, /data-map-idle-at|data-map-moving/);
  assert.match(probe, /startupOutcome/);
  assert.match(probe, /r3-terrain-fallback-notice/);
  assert.match(comparison, /regressionBudgets/);
  assert.match(comparison, /process\.exitCode = 1/);
  assert.match(comparison, /firstUsefulPaintMs/);
  assert.match(comparison, /campaignSettledMs/);
  assert.match(comparison, /campaignToTheatreMs/);
  assert.match(comparison, /theatreToSelectedMs/);
  assert.match(comparison, /totalRequests/);
  assert.match(comparison, /duplicateRequests/);
  assert.match(comparison, /transferredBytes/);
  assert.match(implementation, /cancelPendingTileRequestsWhileZooming: cancelPendingTilesWhileZooming/);
  assert.match(implementation, /presentationProfile === 'compact'/);
  assert.match(implementation, /tileCancellationOverride === 'cancel'/);
});

test('performance comparator accepts normal variance and rejects material regressions', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wp2e-comparison-'));
  const basePath = path.join(temp, 'base.json');
  const headPath = path.join(temp, 'head.json');
  const outputPath = path.join(temp, 'comparison.json');
  const script = path.resolve('scripts/compare-r3-wp2e-performance.mjs');
  const evidence = (buildSha, timings = {}, network = {}) => ({
    buildSha,
    firstUsefulPaintMs: 1000,
    campaignSettledMs: 2000,
    campaignToTheatreMs: 1000,
    theatreToSelectedMs: 2000,
    terrainNetwork: {
      totalRequests: 60,
      uniqueRequests: 50,
      duplicateRequests: 10,
      transferredBytes: 5_000_000,
      ...network
    },
    ...timings
  });

  fs.writeFileSync(basePath, JSON.stringify(evidence('base')));
  fs.writeFileSync(headPath, JSON.stringify(evidence('head', {
    firstUsefulPaintMs: 1100,
    campaignSettledMs: 2150,
    campaignToTheatreMs: 1120,
    theatreToSelectedMs: 2150
  }, {
    totalRequests: 64,
    duplicateRequests: 12,
    transferredBytes: 5_300_000
  })));
  const normal = spawnSync(process.execPath, [script, basePath, headPath, outputPath, 'base', 'head']);
  assert.equal(normal.status, 0, normal.stderr.toString());
  const normalOutput = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(normalOutput.regressionGate.pass, true);

  fs.writeFileSync(headPath, JSON.stringify(evidence('head', {
    firstUsefulPaintMs: 2000,
    campaignSettledMs: 4000,
    campaignToTheatreMs: 2000,
    theatreToSelectedMs: 4000
  }, {
    totalRequests: 120,
    duplicateRequests: 60,
    transferredBytes: 10_000_000
  })));
  const regression = spawnSync(process.execPath, [script, basePath, headPath, outputPath, 'base', 'head']);
  assert.notEqual(regression.status, 0);
  const regressionOutput = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(regressionOutput.regressionGate.pass, false);
});
