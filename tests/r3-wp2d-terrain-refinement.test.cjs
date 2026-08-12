const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const config = fs.readFileSync('src/presentation/r3-terrain-config.ts', 'utf8');
const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const runtimeErrors = fs.readFileSync('src/presentation/r3-terrain-runtime-error.ts', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');
const budget = fs.readFileSync('scripts/measure-r3-terrain-budget.mjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('public/generated/r3-terrain/tiles.json', 'utf8'));

test('WP2D terrain manifest and runtime config use the Europe theatre envelope', () => {
  assert.deepEqual(manifest.bounds, [-25, 33, 50, 72]);
  assert.equal(manifest.futureConquest.stats.tiles, 960);
  assert.match(config, /R3_TERRAIN_EUROPE_BOUNDS = \[-25\.0, 33\.0, 50\.0, 72\.0\]/);
  assert.match(config, /id: 'r3-wp2d-europe-theatre-v1'/);
  assert.match(config, /id: 'theatre', center: \[12\.0, 56\.0\], zoom: 3\.45, pitch: 28/);
});

test('WP2D terrain budget follows the generated manifest instead of the old 82-tile prototype', () => {
  assert.match(budget, /manifestTileCount/);
  assert.match(budget, /tileFiles\.length !== manifestTileCount/);
  assert.match(budget, /terrainStaticBytes: 64 \* 1024 \* 1024/);
  assert.doesNotMatch(budget, /tileCount:\s*82/);
});

test('WP2D ignores only transient status-zero generated-terrain requests after readiness', () => {
  assert.match(runtimeErrors, /generatedTerrainTile && cancelledOrStatusZero \? 'transient-tile-request' : 'source-warning'/);
  assert.match(renderer, /runtimeError\.kind === 'transient-tile-request'/);
  assert.match(renderer, /Terrain source warning/);
  assert.match(renderer, /if \(!loadedRef\.current\)/);
});

test('WP2D terrain HUD owns the upper stacking plane above operational markers', () => {
  const toolbarMatch = css.match(/\.r3-terrain-prototype-toolbar\s*\{[\s\S]*?z-index:\s*(\d+);/);
  assert.ok(toolbarMatch, 'terrain toolbar z-index was not found');
  const toolbarZ = Number(toolbarMatch[1]);
  const operationalZ = [...css.matchAll(/\.r3-terrain-(?:territory-label|node-marker|task-group-marker|enemy-contact|threat-marker|operation-marker|portal-marker)\s*\{[\s\S]*?z-index:\s*(\d+);/g)]
    .map(match => Number(match[1]));
  assert.ok(operationalZ.length >= 6, 'expected operational marker z-index rules');
  assert.ok(toolbarZ > Math.max(...operationalZ), `toolbar z-index ${toolbarZ} must exceed operational marker maximum ${Math.max(...operationalZ)}`);
});

test('WP2D camera presets use dynamic toolbar safe padding and respond to toolbar resizing', () => {
  assert.match(renderer, /function terrainViewportPadding\(/);
  assert.match(renderer, /toolbar\?\.getBoundingClientRect\(\)\.height/);
  assert.match(renderer, /map\.setPadding\(terrainViewportPadding\(toolbarRef\.current, presentationProfile\)\)/);
  assert.match(renderer, /new ResizeObserver\(applySafePadding\)/);
  assert.match(renderer, /padding: terrainViewportPadding\(toolbarRef\.current, presentationProfile\)/);
  assert.match(renderer, /ref=\{toolbarRef\}/);
});
