const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const terrainMap = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const workflow = fs.readFileSync('.github/workflows/r3-wp2b-browser-runtime-probe.yml', 'utf8');

test('production terrain is opt-out rather than query-gated', () => {
  assert.match(app, /get\('terrain'\) !== '0'/);
  assert.doesNotMatch(app, /get\('terrain'\) === '1'/);
  assert.match(app, /terrainPrototypeRequested && !terrainPrototypeFailed/);
  assert.match(app, /<MapView/);
});

test('exact-browser gate covers the normal URL, physical WP3.5 pieces, interaction fallback, and forced SVG fallback', () => {
  assert.match(workflow, /page\.goto\('http:\/\/127\.0\.0\.1:4173\/'/);
  assert.doesNotMatch(workflow, /page\.goto\('http:\/\/127\.0\.0\.1:4173\/\?terrain=1'/);
  assert.match(workflow, /__r3FormationMiniatures/);
  assert.match(workflow, /physicalRenderCount/);
  assert.match(workflow, /physicalVisible/);
  assert.match(workflow, /compatibilityMarkerOpacity/);
  assert.match(workflow, /compatibilityMarkerPosition/);
  assert.match(workflow, /r3-terrain-task-group-marker/);
  assert.match(workflow, /\?terrain=0/);
  assert.match(workflow, /svg\.map\.europe-map/);
});

test('production terrain uses production-facing terminology', () => {
  assert.match(terrainMap, /3D TERRAIN COMMAND MAP/);
  assert.doesNotMatch(terrainMap, /R3 TERRAIN SPIKE/);
  assert.doesNotMatch(app, /Loading experimental terrain renderer/);
  assert.doesNotMatch(terrainMap, /Loading experimental terrain renderer/);
});
