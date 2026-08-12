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

test('R3 terrain commits a bounded Copernicus Terrain-RGB Europe asset set', () => {
  const tiles = pngFiles(path.join(root, 'tiles'));
  assert.equal(tiles.length, manifest.futureConquest.stats.tiles);
  assert.ok(tiles.length >= 900 && tiles.length <= 1200, `unexpected Europe terrain tile count: ${tiles.length}`);
  assert.equal(manifest.minzoom, 4);
  assert.equal(manifest.maxzoom, 7);
  assert.deepEqual(manifest.bounds, [-25, 33, 50, 72]);
  assert.equal(manifest.futureConquest.encoding, 'mapbox-terrain-rgb');
});

test('R3 terrain evidence proves real Europe relief and primarily GLO-30 coverage', () => {
  const stats = manifest.futureConquest.stats;
  assert.equal(manifest.futureConquest.preferredDataset, 'COP-DEM-GLO-30');
  assert.equal(manifest.futureConquest.fallbackDataset, 'COP-DEM-GLO-90');
  assert.ok(stats.primaryTiles > 600, stats);
  assert.ok(stats.fallbackTiles >= 0 && stats.fallbackTiles < 50, stats);
  assert.ok(stats.seaOnlyTiles > 0, stats);
  assert.equal(stats.primaryTiles + stats.fallbackTiles + stats.seaOnlyTiles, stats.tiles);
  assert.ok(stats.maximumElevationMetres > 5000);
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
