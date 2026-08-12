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

test('R3 WP2B defines a continuous real-terrain prototype across England to the Alps', () => {
  assert.deepEqual(terrain.R3_TERRAIN_PROTOTYPE_BOUNDS, [-5.8, 44, 14.8, 53.8]);
  assert.equal(terrain.R3_TERRAIN_MANIFEST.sourceFamily, 'copernicus-dem');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.preferredDataset, 'COP-DEM-GLO-30');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.fallbackDataset, 'COP-DEM-GLO-90');
  assert.equal(terrain.R3_TERRAIN_MANIFEST.initialExaggeration, 2);
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

test('R3 WP2B camera presets are geospatial presentation state only', () => {
  for (const id of ['theatre', 'campaign', 'selected']) {
    const preset = terrain.terrainCameraPreset(id);
    assert.equal(preset.id, id);
    assert.equal(preset.center.length, 2);
    assert.ok(preset.pitch >= 0 && preset.pitch <= 85);
    assert.ok(Number.isFinite(preset.zoom));
  }
  assert.ok(terrain.terrainCameraPreset('selected').zoom > terrain.terrainCameraPreset('campaign').zoom);
});

test('R3 WP2B normalises authoritative WGS84 points without inventing gameplay geography', () => {
  assert.deepEqual(terrain.normaliseLngLat([4.3525, 50.8467]), [4.3525, 50.8467]);
  assert.deepEqual(terrain.normaliseLngLat([999, 999]), [180, 85.051129]);
  assert.deepEqual(terrain.normaliseLngLat([Number.NaN, Number.POSITIVE_INFINITY]), [0, 0]);
});
