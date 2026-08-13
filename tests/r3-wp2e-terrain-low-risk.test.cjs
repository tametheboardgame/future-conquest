const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const loader = fs.readFileSync('src/presentation/r3-terrain-loader.ts', 'utf8');
const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const roadmap = fs.readFileSync('docs/roadmap/R3-ROADMAP.md', 'utf8');

test('WP2E exposes one reusable non-blocking terrain module prewarm boundary', () => {
  assert.match(loader, /terrainModulePromise \?\?= import\('\.\.\/components\/TerrainMapPrototype'\)/);
  assert.match(loader, /module\.prewarmTerrainRuntime\(\)/);
  assert.match(loader, /\.catch\(\(\) => undefined\)/);
  assert.match(app, /if \(terrainPrototypeRequested\) prewarmTerrainMapModule\(\)/);
  assert.match(app, /lazy\(\(\) => loadTerrainMapModule\(\)/);
});

test('WP2E reuses a cacheable manifest request while preserving retry after failure', () => {
  assert.match(renderer, /fetch\(manifestUrl, \{ cache: 'default' \}\)/);
  assert.match(renderer, /terrainSourcePromise \?\?= resolveTerrainSource\(\)/);
  assert.match(renderer, /terrainSourcePromise = undefined/);
  assert.doesNotMatch(renderer, /cache: 'no-store'/);
});

test('WP2E removes the invisible colour-relief DEM path but keeps mesh and hillshade independent', () => {
  assert.doesNotMatch(renderer, /r3-wp2b-relief-dem/);
  assert.doesNotMatch(renderer, /type: 'color-relief'/);
  assert.match(renderer, /'r3-wp2b-terrain-dem': demSource/);
  assert.match(renderer, /'r3-wp2b-hillshade-dem': \{ \.\.\.demSource \}/);
});

test('roadmap records the WP2E handoff through WP2F and keeps WP3 paused', () => {
  assert.match(roadmap, /R3-WP2D -> R3-WP2E/);
  assert.match(roadmap, /Status: COMPLETE \/ MERGED \(#122\), VISUALLY ACCEPTED/);
  assert.match(roadmap, /R3-WP2E - Terrain Performance & Streaming Optimisation/);
  assert.match(roadmap, /R3-WP2E -> R3-WP2F/);
  assert.match(roadmap, /Status: PAUSED PENDING WP2F LIVE ACCEPTANCE/);
});
