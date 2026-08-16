const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const physical = fs.readFileSync('src/presentation/r3-physical-terrain-colour.ts', 'utf8');
const grading = fs.readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');
const materialiser = fs.readFileSync('scripts/maps/materialise-r3-physical-terrain-texture.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const metadata = JSON.parse(fs.readFileSync('public/generated/r3-terrain/europe-physical-colour-v1.json', 'utf8'));
const sourceDir = 'src/assets/r3-wp3-9b2-physical-terrain';
const expectedBytes = 37032;
const expectedSha = '35026f0b6366ae2f2bbcadce369431cc671e6f2097f61cdcede1da27739e7f56';

function decodeSourceAsset() {
  const parts = fs.readdirSync(sourceDir).filter(name => /^part-\d{2}\.b64$/.test(name)).sort();
  assert.equal(parts.length, 5);
  return Buffer.from(parts.map(name => fs.readFileSync(`${sourceDir}/${name}`, 'utf8').trim()).join(''), 'base64');
}

test('WP3.9B2 ships deterministic self-hosted physical-colour source with provenance', () => {
  assert.equal(metadata.id, 'r3-wp3-9b2-nasa-blue-marble-june-v1');
  assert.equal(metadata.source, 'NASA Blue Marble: Next Generation, June 2004 base map');
  assert.match(metadata.sourceUrl, /^https:\/\/assets\.science\.nasa\.gov\//);
  assert.deepEqual(metadata.bounds, [-30, 28, 55, 76]);
  assert.deepEqual(metadata.dimensions, [640, 685]);
  assert.equal(metadata.deliveryProjection, 'Web Mercator latitude-warped image source');
  assert.equal(metadata.buildEncoding, 'five base64 chunks materialised locally');
  assert.equal(metadata.runtimeBytes, expectedBytes);
  assert.equal(metadata.sha256, expectedSha);
  assert.equal(metadata.normalBuildDependency, false);

  const image = decodeSourceAsset();
  assert.equal(image.length, expectedBytes);
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'), expectedSha);
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.equal(image.readUInt32LE(4) + 8, image.length);
});

test('normal dev/build materialises the compact texture locally with no upstream network dependency', () => {
  assert.match(packageJson.scripts['build:r3-physical-terrain'], /materialise-r3-physical-terrain-texture\.mjs/);
  assert.match(packageJson.scripts.predev, /build:r3-physical-terrain/);
  assert.match(packageJson.scripts.prebuild, /build:r3-physical-terrain/);
  assert.match(materialiser, /expectedBytes = 37032/);
  assert.match(materialiser, new RegExp(expectedSha));
  assert.match(materialiser, /parts\.length !== 5/);
  assert.match(materialiser, /readUInt32LE\(4\)/);
  assert.doesNotMatch(materialiser, /https?:\/\//);
});

test('physical colour is an image/raster presentation layer below Copernicus hillshade', () => {
  assert.match(physical, /R3_PHYSICAL_TERRAIN_ASSET_PATH = 'generated\/r3-terrain\/europe-physical-colour-v1\.webp'/);
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

test('accepted border-led ownership remains authoritative over the richer physical terrain', () => {
  assert.match(grading, /'campaign-territories-fill', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-territory-state-wash', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-administrative-borders', 'line-opacity', 0/);
  assert.match(grading, /friendlyBorder: '#76f2e1'/);
  assert.match(grading, /enemyBorder: '#ff776f'/);
  assert.match(grading, /installR3PhysicalTerrainColour\(map\)/);
});

test('WP3.9B2 remains presentation-only', () => {
  assert.doesNotMatch(physical, /GameState|newGame|endTurn|saveGame|selectedTerritory|taskGroups|TERRITORIES/);
  assert.match(physical, /Copernicus GLO-30 remains the actual/);
});
