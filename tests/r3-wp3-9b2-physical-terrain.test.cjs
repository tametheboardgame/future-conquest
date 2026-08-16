const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const physical = fs.readFileSync('src/presentation/r3-physical-terrain-colour.ts', 'utf8');
const grading = fs.readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');
const materialiser = fs.readFileSync('scripts/maps/materialise-r3-physical-terrain-texture.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const metadata = JSON.parse(fs.readFileSync('public/generated/r3-terrain/europe-physical-colour-v2.json', 'utf8'));
const sourceDir = 'src/assets/r3-wp3-9b3-physical-terrain';
const expectedBytes = 396994;
const expectedSha = 'f6257502818ac444c64fc94897f9fcfecfddd3e5525f00880a06b48e49577af4';

function decodeSourceAsset() {
  const parts = fs.readdirSync(sourceDir).filter(name => /^part-\d{2}\.b64$/.test(name)).sort();
  assert.equal(parts.length, 4);
  return Buffer.from(parts.map(name => fs.readFileSync(`${sourceDir}/${name}`, 'utf8').trim()).join(''), 'base64');
}

test('WP3.9B3 ships deterministic high-resolution physical colour with NASA provenance', () => {
  assert.equal(metadata.id, 'r3-wp3-9b3-nasa-blue-marble-june-hires-v1');
  assert.equal(metadata.source, 'NASA Blue Marble: Next Generation, June 2004 base map');
  assert.match(metadata.sourceUrl, /^https:\/\/assets\.science\.nasa\.gov\//);
  assert.match(metadata.sourceResolution, /^2 km\/pixel/);
  assert.deepEqual(metadata.bounds, [-30, 28, 55, 76]);
  assert.deepEqual(metadata.dimensions, [2048, 2192]);
  assert.equal(metadata.deliveryProjection, 'Web Mercator latitude-warped image source');
  assert.equal(metadata.buildEncoding, 'four base64 chunks materialised locally');
  assert.equal(metadata.runtimeBytes, expectedBytes);
  assert.equal(metadata.sha256, expectedSha);
  assert.equal(metadata.normalBuildDependency, false);
  assert.ok(metadata.runtimeBytes < 3000000, 'high-resolution colour texture exceeds B3 runtime budget');

  const image = decodeSourceAsset();
  assert.equal(image.length, expectedBytes);
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'), expectedSha);
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.equal(image.readUInt32LE(4) + 8, image.length);
});

test('normal dev/build materialises the B3 texture locally with no upstream network dependency', () => {
  assert.match(packageJson.scripts['build:r3-physical-terrain'], /materialise-r3-physical-terrain-texture\.mjs/);
  assert.match(packageJson.scripts.predev, /build:r3-physical-terrain/);
  assert.match(packageJson.scripts.prebuild, /build:r3-physical-terrain/);
  assert.match(materialiser, /expectedBytes = 396994/);
  assert.match(materialiser, new RegExp(expectedSha));
  assert.match(materialiser, /parts\.length !== 4/);
  assert.match(materialiser, /readUInt32LE\(4\)/);
  assert.doesNotMatch(materialiser, /https?:\/\//);
});

test('B3 physical colour remains an image/raster presentation layer below Copernicus hillshade', () => {
  assert.match(physical, /R3_PHYSICAL_TERRAIN_PROFILE_ID = 'physical-colour-v2-hires'/);
  assert.match(physical, /R3_PHYSICAL_TERRAIN_ASSET_PATH = 'generated\/r3-terrain\/europe-physical-colour-v2\.webp'/);
  assert.match(physical, /r3-wp3-9b3-physical-colour/);
  assert.match(physical, /type: 'image'/);
  assert.match(physical, /type: 'raster'/);
  assert.match(physical, /map\.addLayer\([\s\S]*?'r3-wp2b-hillshade'\)/);
  assert.match(physical, /'raster-opacity': 0\.98/);
  assert.match(physical, /'raster-saturation': 0\.16/);
  assert.match(physical, /'raster-contrast': 0\.10/);
  assert.match(physical, /hillshade-exaggeration', 0\.36/);
  assert.match(physical, /status: 'checking' \| 'ready' \| 'fallback'/);
  assert.doesNotMatch(physical, /raw\.githubusercontent\.com|natural-earth-raster/);
});

test('accepted border-led ownership remains authoritative over high-resolution physical terrain', () => {
  assert.match(grading, /'campaign-territories-fill', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-territory-state-wash', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-administrative-borders', 'line-opacity', 0/);
  assert.match(grading, /friendlyBorder: '#76f2e1'/);
  assert.match(grading, /enemyBorder: '#ff776f'/);
  assert.match(grading, /installR3PhysicalTerrainColour\(map\)/);
});

test('WP3.9B3 remains presentation-only', () => {
  assert.doesNotMatch(physical, /GameState|newGame|endTurn|saveGame|selectedTerritory|taskGroups|TERRITORIES/);
  assert.match(physical, /Copernicus GLO-30 remains the actual/);
});
