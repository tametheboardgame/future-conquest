const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const physical = fs.readFileSync('src/presentation/r3-physical-terrain-colour.ts', 'utf8');
const grading = fs.readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');
const materialiser = fs.readFileSync('scripts/maps/materialise-r3-physical-terrain-texture.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const broadMetadata = JSON.parse(fs.readFileSync('public/generated/r3-terrain/europe-physical-colour-v1.json', 'utf8'));
const tileManifest = JSON.parse(fs.readFileSync('public/generated/r3-terrain/physical-colour-tiles-manifest.json', 'utf8'));
const broadSourceDir = 'src/assets/r3-wp3-9b2-physical-terrain';
const tileRoot = 'public/generated/r3-terrain/physical-colour-tiles';
const expectedBroadBytes = 37032;
const expectedBroadSha = '35026f0b6366ae2f2bbcadce369431cc671e6f2097f61cdcede1da27739e7f56';
const expectedTileBytes = 9338146;
const expectedTileSha = '7185e1629fd3c65f76eb9b5005eeb7582e8c16cff749ec6be297b7269e0b30d2';

function decodeBroadAsset() {
  const parts = fs.readdirSync(broadSourceDir).filter(name => /^part-\d{2}\.b64$/.test(name)).sort();
  assert.equal(parts.length, 5);
  return Buffer.from(parts.map(name => fs.readFileSync(`${broadSourceDir}/${name}`, 'utf8').trim()).join(''), 'base64');
}

function collectTiles() {
  const files = [];
  for (const x of fs.readdirSync(path.join(tileRoot, '7')).sort((a, b) => Number(a) - Number(b))) {
    const xDir = path.join(tileRoot, '7', x);
    for (const name of fs.readdirSync(xDir).filter(name => name.endsWith('.webp')).sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]))) {
      files.push(path.join(xDir, name));
    }
  }
  return files;
}

test('WP3.9B3 retains deterministic lightweight broad physical colour', () => {
  assert.equal(broadMetadata.runtimeBytes, expectedBroadBytes);
  assert.equal(broadMetadata.sha256, expectedBroadSha);
  const image = decodeBroadAsset();
  assert.equal(image.length, expectedBroadBytes);
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'), expectedBroadSha);
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.equal(image.readUInt32LE(4) + 8, image.length);
});

test('WP3.9B3 ships deterministic NASA 500m local-detail tiles inside static budget', () => {
  assert.equal(tileManifest.id, 'r3-wp3-9b3-nasa-blue-marble-500m-local-z7-v1');
  assert.equal(tileManifest.sourceResolution, '500 m/pixel');
  assert.equal(tileManifest.projection, 'Web Mercator XYZ');
  assert.deepEqual(tileManifest.bounds, [-30, 28, 55, 76]);
  assert.equal(tileManifest.tileSize, 512);
  assert.equal(tileManifest.minzoom, 7);
  assert.equal(tileManifest.maxzoom, 7);
  assert.equal(tileManifest.tileCount, 1023);
  assert.equal(tileManifest.totalBytes, expectedTileBytes);
  assert.equal(tileManifest.contentSha256, expectedTileSha);
  assert.ok(tileManifest.totalBytes < 10 * 1024 * 1024);

  const tiles = collectTiles();
  assert.equal(tiles.length, 1023);
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const file of tiles) {
    const payload = fs.readFileSync(file);
    const relative = path.relative(tileRoot, file).split(path.sep).join('/');
    digest.update(relative);
    digest.update(Buffer.from([0]));
    digest.update(payload);
    bytes += payload.length;
    assert.equal(payload.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(payload.subarray(8, 12).toString('ascii'), 'WEBP');
  }
  assert.equal(bytes, expectedTileBytes);
  assert.equal(digest.digest('hex'), expectedTileSha);
});

test('normal dev/build remains network-free and materialises only the tiny broad base', () => {
  assert.match(packageJson.scripts['build:r3-physical-terrain'], /materialise-r3-physical-terrain-texture\.mjs/);
  assert.match(packageJson.scripts.predev, /build:r3-physical-terrain/);
  assert.match(packageJson.scripts.prebuild, /build:r3-physical-terrain/);
  assert.match(materialiser, /expectedBytes = 37032/);
  assert.match(materialiser, new RegExp(expectedBroadSha));
  assert.match(materialiser, /parts\.length !== 5/);
  assert.doesNotMatch(materialiser, /https?:\/\//);
});

test('B3 keeps Campaign/Theatre on the B2 path and lazily registers z7 local raster detail', () => {
  assert.match(physical, /R3_PHYSICAL_TERRAIN_PROFILE_ID = 'physical-colour-v3-local-tiles'/);
  assert.match(physical, /europe-physical-colour-v1\.webp/);
  assert.match(physical, /physical-colour-tiles\/\{z\}\/\{x\}\/\{y\}\.webp/);
  assert.match(physical, /R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM = 7/);
  assert.match(physical, /localDetailStatus: 'deferred' \| 'checking' \| 'ready' \| 'fallback'/);
  assert.match(physical, /writeEvidence\('checking', 'deferred'\)/);
  assert.match(physical, /if \(map\.getZoom\(\) < R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM\) return/);
  assert.match(physical, /map\.on\('zoomend', activate\)/);
  assert.match(physical, /map\.on\('moveend', activate\)/);
  assert.match(physical, /fetch\(localManifestUrl\(\), \{ method: 'HEAD', cache: 'default' \}\)/);
  assert.match(physical, /addLocalDetailTiles\(map\)/);
  assert.match(physical, /type: 'image'/);
  assert.match(physical, /type: 'raster'/);
  assert.match(physical, /tileSize: 512/);
  assert.match(physical, /minzoom: R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM/);
  assert.match(physical, /maxzoom: R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM/);
  assert.match(physical, /map\.addLayer\([\s\S]*?'r3-wp2b-hillshade'\)/);
  assert.match(physical, /hillshade-exaggeration', 0\.36/);
  assert.doesNotMatch(physical, /Promise\.all\(\[\s*fetch\(assetUrl\(\)[\s\S]*localManifestUrl/);
  assert.doesNotMatch(physical, /europe-physical-colour-v2\.webp/);
});

test('accepted border-led ownership remains authoritative over dual-LOD physical terrain', () => {
  assert.match(grading, /'campaign-territories-fill', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-territory-state-wash', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-administrative-borders', 'line-opacity', 0/);
  assert.match(grading, /friendlyBorder: '#76f2e1'/);
  assert.match(grading, /enemyBorder: '#ff776f'/);
  assert.match(grading, /installR3PhysicalTerrainColour\(map\)/);
});

test('WP3.9B3 remains presentation-only', () => {
  assert.doesNotMatch(physical, /GameState|newGame|endTurn|saveGame|selectedTerritory|taskGroups|TERRITORIES/);
  assert.match(physical, /Copernicus GLO-30 remains the 3D elevation authority/);
});
