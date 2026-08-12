const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('scripts/measure-r3-terrain-budget.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/r3-wp2b-lazy-load.yml', 'utf8');

test('R3 WP2B-D locks the representative terrain footprint to a bounded production budget', () => {
  assert.match(script, /tileCount: 82/);
  assert.match(script, /terrainStaticBytes: 8 \* 1024 \* 1024/);
  assert.match(script, /terrainJsBytes: 1100 \* 1024/);
  assert.match(script, /terrainJsGzipBytes: 300 \* 1024/);
  assert.match(script, /terrainWorkerBytes: 550 \* 1024/);
  assert.match(script, /terrainWorkerGzipBytes: 180 \* 1024/);
  assert.match(script, /terrainCssBytes: 90 \* 1024/);
  assert.match(script, /terrainCssGzipBytes: 20 \* 1024/);
});

test('R3 WP2B-D requires MapLibre runtime code and worker to remain lazy production assets', () => {
  assert.match(script, /TerrainMapPrototype-\.\*\\\.js/);
  assert.match(script, /maplibre-gl-worker-\.\*\\\.js/);
  assert.match(script, /TerrainMapPrototype-\.\*\\\.css/);
  assert.match(script, /expected exactly one lazy MapLibre worker asset/);
  assert.match(script, /MapLibre implementation markers leaked into eager chunk/);
});

test('R3 WP2B-D production smoke enforces the budget after the real Vite build', () => {
  const build = workflow.indexOf('name: Build production game');
  const budget = workflow.indexOf('name: Enforce terrain production budget');
  assert.ok(build >= 0 && budget > build);
  assert.match(workflow, /node scripts\/measure-r3-terrain-budget\.mjs/);
  assert.match(workflow, /scripts\/measure-r3-terrain-budget\.mjs/);
});
