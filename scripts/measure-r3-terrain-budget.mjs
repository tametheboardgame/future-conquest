import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = path.resolve('dist');
const ASSETS = path.join(DIST, 'assets');
const TERRAIN = path.join(DIST, 'generated', 'r3-terrain');
const TILE_ROOT = path.join(TERRAIN, 'tiles');
const TILEJSON = path.join(TERRAIN, 'tiles.json');

const limits = Object.freeze({
  // WP2D hosts a Europe-wide static terrain envelope. Total hosted bytes are
  // bounded here, while browser/runtime probes separately measure the much
  // smaller set of tiles actually requested by representative camera views.
  terrainStaticBytes: 64 * 1024 * 1024,
  terrainJsBytes: 1100 * 1024,
  terrainJsGzipBytes: 300 * 1024,
  terrainWorkerBytes: 550 * 1024,
  terrainWorkerGzipBytes: 180 * 1024,
  terrainCssBytes: 90 * 1024,
  terrainCssGzipBytes: 20 * 1024
});

const fail = message => {
  console.error(`R3 terrain budget failure: ${message}`);
  process.exitCode = 1;
};

const walk = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const location = path.join(root, entry.name);
  return entry.isDirectory() ? walk(location) : [location];
});

if (!fs.existsSync(TERRAIN) || !fs.existsSync(ASSETS) || !fs.existsSync(TILEJSON)) {
  throw new Error('Run the production build before measuring the R3 terrain budget.');
}

const manifest = JSON.parse(fs.readFileSync(TILEJSON, 'utf8'));
const manifestTileCount = manifest?.futureConquest?.stats?.tiles;
if (!Number.isInteger(manifestTileCount) || manifestTileCount <= 0) {
  fail(`terrain manifest has invalid futureConquest.stats.tiles: ${String(manifestTileCount)}`);
}

const terrainFiles = walk(TERRAIN);
const tileFiles = fs.existsSync(TILE_ROOT)
  ? walk(TILE_ROOT).filter(file => file.endsWith('.png'))
  : [];
const terrainStaticBytes = terrainFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);

if (tileFiles.length !== manifestTileCount) {
  fail(`Terrain-RGB tile count ${tileFiles.length} does not match manifest count ${manifestTileCount}`);
}
if (terrainStaticBytes > limits.terrainStaticBytes) {
  fail(`static terrain is ${terrainStaticBytes} bytes; hosted Europe budget is ${limits.terrainStaticBytes}`);
}

const emittedAssets = fs.readdirSync(ASSETS);
const terrainJsFiles = emittedAssets.filter(name => /^TerrainMapPrototype-.*\.js$/.test(name));
const terrainWorkerFiles = emittedAssets.filter(name => /^maplibre-gl-worker-.*\.js$/.test(name));
const terrainCssFiles = emittedAssets.filter(name => /^TerrainMapPrototype-.*\.css$/.test(name));

if (terrainJsFiles.length !== 1) {
  fail(`expected exactly one lazy TerrainMapPrototype JS chunk, found ${terrainJsFiles.length}`);
}
if (terrainWorkerFiles.length !== 1) {
  fail(`expected exactly one lazy MapLibre worker asset, found ${terrainWorkerFiles.length}`);
}
if (terrainCssFiles.length !== 1) {
  fail(`expected exactly one lazy TerrainMapPrototype CSS chunk, found ${terrainCssFiles.length}`);
}

const measureAsset = (name, rawBudget, gzipBudget) => {
  if (!name) return { name: null, bytes: 0, gzipBytes: 0 };
  const bytes = fs.readFileSync(path.join(ASSETS, name));
  const gzipBytes = gzipSync(bytes, { level: 9 }).byteLength;
  if (bytes.byteLength > rawBudget) {
    fail(`${name} is ${bytes.byteLength} bytes; raw budget is ${rawBudget}`);
  }
  if (gzipBytes > gzipBudget) {
    fail(`${name} is ${gzipBytes} bytes gzip; gzip budget is ${gzipBudget}`);
  }
  return { name, bytes: bytes.byteLength, gzipBytes };
};

const terrainJs = measureAsset(terrainJsFiles[0], limits.terrainJsBytes, limits.terrainJsGzipBytes);
const terrainWorker = measureAsset(terrainWorkerFiles[0], limits.terrainWorkerBytes, limits.terrainWorkerGzipBytes);
const terrainCss = measureAsset(terrainCssFiles[0], limits.terrainCssBytes, limits.terrainCssGzipBytes);

const indexJsFiles = emittedAssets.filter(name => /^index-.*\.js$/.test(name));
if (!indexJsFiles.length) fail('main production JS chunk was not found');
for (const name of indexJsFiles) {
  const text = fs.readFileSync(path.join(ASSETS, name), 'utf8');
  if (text.includes('maplibregl-ctrl') || text.includes('MapLibre GL JS')) {
    fail(`MapLibre implementation markers leaked into eager chunk ${name}`);
  }
}

const result = {
  limits,
  measured: {
    terrainTiles: tileFiles.length,
    manifestTerrainTiles: manifestTileCount,
    terrainStaticBytes,
    terrainJs,
    terrainWorker,
    terrainCss,
    eagerIndexChunks: indexJsFiles
  }
};

console.log(JSON.stringify(result, null, 2));
if (process.exitCode) process.exit(process.exitCode);
