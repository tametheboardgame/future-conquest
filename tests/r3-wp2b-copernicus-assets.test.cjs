const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = 'public/generated/r3-terrain';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tiles.json'), 'utf8'));

function pngFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? pngFiles(target) : entry.name.endsWith('.png') ? [target] : [];
  });
}

test('R3 WP2B commits a bounded Copernicus Terrain-RGB prototype asset set', () => {
  const tiles = pngFiles(path.join(root, 'tiles'));
  assert.equal(tiles.length, manifest.futureConquest.stats.tiles);
  assert.equal(tiles.length, 82);
  assert.equal(manifest.minzoom, 4);
  assert.equal(manifest.maxzoom, 7);
  assert.deepEqual(manifest.bounds, [-5.8, 44, 14.8, 53.8]);
  assert.equal(manifest.futureConquest.encoding, 'mapbox-terrain-rgb');
});

test('R3 WP2B terrain evidence proves real representative relief and GLO-30 coverage', () => {
  const stats = manifest.futureConquest.stats;
  assert.equal(manifest.futureConquest.preferredDataset, 'COP-DEM-GLO-30');
  assert.equal(manifest.futureConquest.fallbackDataset, 'COP-DEM-GLO-90');
  assert.equal(stats.primaryTiles, 81);
  assert.equal(stats.fallbackTiles, 0);
  assert.equal(stats.seaOnlyTiles, 1);
  assert.ok(stats.maximumElevationMetres > 4500);
});

test('R3 WP2B generated terrain carries the required Copernicus attribution', () => {
  assert.match(manifest.attribution, /Copernicus WorldDEM-30/);
  assert.match(manifest.attribution, /European Union and ESA/);
});

test('R3 WP2B generated PNG tiles are real PNG binary assets', () => {
  const first = pngFiles(path.join(root, 'tiles'))[0];
  const signature = fs.readFileSync(first).subarray(0, 8);
  assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10]);
});
