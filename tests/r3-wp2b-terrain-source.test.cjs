const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/presentation/r3-terrain-source.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleRecord = { exports: {} };
new Function('module', 'exports', compiled)(moduleRecord, moduleRecord.exports);
const terrain = moduleRecord.exports;

const manifest = {
  tilejson: '3.0.0',
  minzoom: 4,
  maxzoom: 7,
  bounds: [-5.8, 44, 14.8, 53.8],
  attribution: 'Copernicus terrain attribution'
};

test('R3 WP2B generated terrain URLs remain valid under GitHub Pages base paths', () => {
  assert.equal(
    terrain.generatedTerrainManifestUrl('/future-conquest/'),
    '/future-conquest/generated/r3-terrain/tiles.json'
  );
  assert.equal(
    terrain.generatedTerrainTileTemplate('/future-conquest'),
    '/future-conquest/generated/r3-terrain/tiles/{z}/{x}/{y}.png'
  );
});

test('R3 WP2B converts validated TileJSON into a Mapbox Terrain-RGB source', () => {
  assert.deepEqual(terrain.generatedRasterDemSource(manifest, '/future-conquest/'), {
    type: 'raster-dem',
    tiles: ['/future-conquest/generated/r3-terrain/tiles/{z}/{x}/{y}.png'],
    tileSize: 256,
    encoding: 'mapbox',
    minzoom: 4,
    maxzoom: 7,
    bounds: [-5.8, 44, 14.8, 53.8],
    attribution: 'Copernicus terrain attribution'
  });
});

test('R3 WP2B rejects malformed generated terrain manifests before MapLibre receives them', () => {
  assert.throws(() => terrain.generatedRasterDemSource({ ...manifest, tilejson: '2.2.0' }, '/'), /TileJSON/);
  assert.throws(() => terrain.generatedRasterDemSource({ ...manifest, minzoom: 8 }, '/'), /zoom/);
  assert.throws(() => terrain.generatedRasterDemSource({ ...manifest, bounds: [-5.8, 44, Number.NaN, 53.8] }, '/'), /bounds/);
});

test('R3 WP2B generated source contract contains no authenticated runtime endpoint or credential field', () => {
  assert.match(source, /generated\/r3-terrain/);
  assert.doesNotMatch(source, /oauth|client_secret|clientSecret|access_token|accessToken/i);
});
