const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const physical = fs.readFileSync('src/presentation/r3-physical-terrain-colour.ts', 'utf8');
const grading = fs.readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');
const builder = fs.readFileSync('scripts/maps/build-r3-physical-terrain-texture.py', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const metadataPath = 'public/generated/r3-terrain/europe-physical-colour-v1.json';
const imagePath = 'public/generated/r3-terrain/europe-physical-colour-v1.webp';
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

test('WP3.9B2 ships a small self-hosted physical-colour asset with provenance', () => {
  assert.equal(metadata.id, 'r3-wp3-9b2-natural-earth-physical-colour-v1');
  assert.equal(metadata.sourceLicense, 'public domain');
  assert.deepEqual(metadata.bounds, [-30, 28, 55, 76]);
  assert.deepEqual(metadata.dimensions, [2048, 2192]);
  assert.equal(metadata.sourceProjection, 'equirectangular');
  assert.equal(metadata.deliveryProjection, 'Web Mercator latitude-warped image source');
  assert.equal(metadata.normalBuildDependency, false);
  const bytes = fs.statSync(imagePath).size;
  assert.ok(bytes > 100_000, `physical terrain texture unexpectedly tiny: ${bytes}`);
  assert.ok(bytes < 350_000, `physical terrain texture exceeds static budget: ${bytes}`);
});

test('physical colour is a static image/raster presentation layer below Copernicus hillshade', () => {
  assert.match(physical, /R3_PHYSICAL_TERRAIN_ASSET_PATH = 'generated\/r3-terrain\/europe-physical-colour-v1\.webp'/);
  assert.match(physical, /type: 'image'/);
  assert.match(physical, /type: 'raster'/);
  assert.match(physical, /map\.addLayer\([\s\S]*?'r3-wp2b-hillshade'\)/);
  assert.match(physical, /hillshade-exaggeration', 0\.40/);
  assert.match(physical, /fetch\(assetUrl\(\), \{ method: 'HEAD'/);
  assert.match(physical, /status: 'checking' \| 'ready' \| 'fallback'/);
});

test('asset builder pre-warps equirectangular latitude into MapLibre Web Mercator', () => {
  assert.match(builder, /def mercator_y/);
  assert.match(builder, /def warp_to_web_mercator/);
  assert.match(builder, /np\.degrees\(np\.arctan\(np\.sinh\(projected_y\)\)\)/);
  assert.match(builder, /crop = warp_to_web_mercator\(crop\)/);
});

test('accepted border-led ownership semantics remain the political authority', () => {
  assert.match(grading, /'campaign-territories-fill', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-territory-state-wash', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-administrative-borders', 'line-opacity', 0/);
  assert.match(grading, /friendlyBorder: '#76f2e1'/);
  assert.match(grading, /enemyBorder: '#ff776f'/);
  assert.match(grading, /installR3PhysicalTerrainColour\(map\)/);
});

test('large upstream source is controlled asset-refresh tooling, not a normal build/runtime dependency', () => {
  assert.match(builder, /Natural Earth II 1:50m/);
  assert.match(builder, /TARGET_WIDTH = 2048/);
  assert.match(builder, /OUTPUT_QUALITY = 82/);
  assert.doesNotMatch(packageJson.scripts.prebuild, /physical-terrain|Natural Earth|NE2_50M/);
  assert.doesNotMatch(physical, /raw\.githubusercontent\.com|natural-earth-raster/);
});

test('WP3.9B2 remains presentation-only', () => {
  assert.doesNotMatch(physical, /GameState|newGame|endTurn|saveGame|selectedTerritory|taskGroups|TERRITORIES/);
  assert.match(physical, /Copernicus GLO-30 remains the actual/);
});
