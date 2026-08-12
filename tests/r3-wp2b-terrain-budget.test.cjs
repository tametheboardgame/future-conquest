const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('scripts/measure-r3-terrain-budget.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/r3-wp2b-lazy-load.yml', 'utf8');

test('R3 terrain keeps the hosted Europe footprint bounded and manifest-consistent', () => {
  assert.match(script, /manifestTileCount/);
  assert.match(script, /tileFiles\.length !== manifestTileCount/);
  assert.match(script, /terrainStaticBytes: 64 \* 1024 \* 1024/);
  assert.doesNotMatch(script, /tileCount: 82/);
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

test('R3 terrain smoke validates the generated manifest before enforcing the production budget', () => {
  const build = workflow.indexOf('name: Build production game');
  const verify = workflow.indexOf('name: Verify Copernicus terrain ships in production output');
  const budget = workflow.indexOf('name: Enforce terrain production budget');
  assert.ok(build >= 0 && verify > build && budget > verify);
  assert.match(workflow, /futureConquest\?\.stats\?\.tiles/);
  assert.match(workflow, /node scripts\/measure-r3-terrain-budget\.mjs/);
  assert.match(workflow, /scripts\/measure-r3-terrain-budget\.mjs/);
});
