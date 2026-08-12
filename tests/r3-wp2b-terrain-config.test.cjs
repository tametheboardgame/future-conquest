const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/presentation/r3-terrain-config.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleRecord = { exports: {} };
new Function('module', 'exports', compiled)(moduleRecord, moduleRecord.exports);
const terrain = moduleRecord.exports;

const inside = (point, bounds) => {
  const [west, south, east, north] = bounds;
  const [longitude, latitude] = point;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
};

test('R3 WP2D expands the continuous real-terrain envelope to the mature Europe theatre', () => {
  assert.deepEqual(terrain.R3_TERRAIN_EUROPE_BOUNDS, [-25, 33, 50, 72]);
  assert.deepEqual(terrain.R3_TERRAIN_PROTOTYPE_BOUNDS, terrain.R3_TERRAIN_EUROPE_BOUNDS);
  assert.deepEqual(terrain.R3_TERRAIN_MANIFEST.theatreBounds, terrain.R3_TERRAIN_EUROPE_BOUNDS);
  assert.equal(terrain.R3_TERRAIN_MANIFEST.sourceFamily, 'copernicus-dem');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.preferredDataset, 'COP-DEM-GLO-30');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.fallbackDataset, 'COP-DEM-GLO-90');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.initialExaggeration, 2);

  for (const point of [
    [-18.6, 64.9], // Iceland
    [-3.1, 56.2], // United Kingdom
    [-3.4, 40.2], // Spain
    [12.6, 42.6], // Italy
    [19.1, 52.0], // Poland
    [22.2, 39.1], // Greece
    [31.3, 49.0], // Ukraine
    [39.0, 56.0], // western Russia
    [47.5, 40.4] // Azerbaijan
  ]) assert.equal(inside(point, terrain.R3_TERRAIN_EUROPE_BOUNDS), true, `Expected ${point} inside Europe terrain envelope`);
});

test('R3 WP2B keeps authenticated terrain acquisition out of the browser runtime', () => {
  assert.equal(terrain.R3_TERRAIN_MANIFEST.runtimeDelivery, 'preprocessed-static-assets');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.requiresBrowserSecret, false);
  assert.match(terrain.R3_TERRAIN_MANIFEST.attribution, /Copernicus DEM/);
  assert.doesNotMatch(source, /client_secret|clientSecret|access_token|accessToken/i);
});

test('R3 WP2B treats the real-terrain renderer as progressive enhancement', () => {
  assert.equal(terrain.chooseCampaignMapRenderer({ webgl: true, terrainEnabled: true }), 'real-terrain');
  assert.equal(terrain.chooseCampaignMapRenderer({ webgl: false, terrainEnabled: true }), 'svg-fallback');
  assert.equal(terrain.chooseCampaignMapRenderer({ webgl: true, terrainEnabled: false }), 'svg-fallback');
  assert.equal(terrain.chooseCampaignMapRenderer({ webgl: true, terrainEnabled: true, forceFallback: true }), 'svg-fallback');
});

test('R3 WP2B-D gives smaller and touch displays a deliberate reduced-pressure path', () => {
  assert.equal(terrain.chooseTerrainPresentationProfile({ viewportWidth: 1440, coarsePointer: false }), 'full');
  assert.equal(terrain.chooseTerrainPresentationProfile({ viewportWidth: 820, coarsePointer: false }), 'compact');
  assert.equal(terrain.chooseTerrainPresentationProfile({ viewportWidth: 820, coarsePointer: true }), 'compact');
  assert.equal(terrain.chooseTerrainPresentationProfile({ viewportWidth: 390, coarsePointer: true }), 'svg-fallback');
  assert.equal(terrain.chooseTerrainPresentationProfile({ viewportWidth: 1440, coarsePointer: false, forceFallback: true }), 'svg-fallback');
});

test('R3 WP2B-D compact terrain reduces camera and relief pressure without changing geography', () => {
  const campaign = terrain.terrainCameraPreset('campaign');
  const full = terrain.terrainCameraForProfile(campaign, 'full');
  const compact = terrain.terrainCameraForProfile(campaign, 'compact');
  assert.deepEqual(full.center, campaign.center);
  assert.deepEqual(compact.center, campaign.center);
  assert.equal(full.pitch, campaign.pitch);
  assert.ok(compact.pitch <= 42);
  assert.ok(compact.zoom < campaign.zoom);
  assert.equal(terrain.terrainExaggerationForProfile('full'), 2);
  assert.equal(terrain.terrainExaggerationForProfile('compact'), 1.6);
});

test('R3 WP2D camera presets preserve a wide theatre and more dramatic campaign/selected views', () => {
  for (const id of ['theatre', 'campaign', 'selected']) {
    const preset = terrain.terrainCameraPreset(id);
    assert.equal(preset.id, id);
    assert.equal(preset.center.length, 2);
    assert.ok(preset.pitch >= 0 && preset.pitch <= 85);
    assert.ok(Number.isFinite(preset.zoom));
  }
  assert.ok(terrain.terrainCameraPreset('theatre').zoom < terrain.terrainCameraPreset('campaign').zoom);
  assert.ok(terrain.terrainCameraPreset('theatre').pitch < terrain.terrainCameraPreset('campaign').pitch);
  assert.ok(terrain.terrainCameraPreset('selected').zoom > terrain.terrainCameraPreset('campaign').zoom);
});

test('R3 WP2B normalises authoritative WGS84 points without inventing gameplay geography', () => {
  assert.deepEqual(terrain.normaliseLngLat([4.3525, 50.8467]), [4.3525, 50.8467]);
  assert.deepEqual(terrain.normaliseLngLat([999, 999]), [180, 85.051129]);
  assert.deepEqual(terrain.normaliseLngLat([Number.NaN, Number.POSITIVE_INFINITY]), [0, 0]);
});
