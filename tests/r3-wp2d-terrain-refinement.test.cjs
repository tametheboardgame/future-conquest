const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const config = fs.readFileSync('src/presentation/r3-terrain-config.ts', 'utf8');
const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const runtimeErrors = fs.readFileSync('src/presentation/r3-terrain-runtime-error.ts', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');
const budget = fs.readFileSync('scripts/measure-r3-terrain-budget.mjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('public/generated/r3-terrain/tiles.json', 'utf8'));

function layerBlock(id) {
  const start = renderer.indexOf(`id: '${id}'`);
  assert.ok(start >= 0, `layer ${id} was not found`);
  const next = renderer.indexOf("\n      {\n        id: '", start + 1);
  return renderer.slice(start, next >= 0 ? next : undefined);
}

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

test('WP2D-C makes administrative borders quieter than control boundaries', () => {
  const administrative = layerBlock('campaign-administrative-borders');
  const control = layerBlock('campaign-control-borders');
  assert.match(administrative, /4, 0\.07, 5\.5, 0\.1, 7, 0\.16, 9, 0\.23/);
  assert.match(administrative, /4, 0\.3, 6, 0\.45, 8, 0\.68/);
  assert.match(control, /4, 0\.3, 6, 0\.44, 8, 0\.58, 10, 0\.68/);
  assert.match(control, /4, 0\.58, 6, 0\.82, 8, 1\.2/);
});

test('WP2D-C keeps opposing fronts unmistakable without the old oversized underlay', () => {
  const underlay = layerBlock('campaign-fronts-underlay');
  const core = layerBlock('campaign-fronts-core');
  assert.match(underlay, /'line-opacity': 0\.72/);
  assert.match(underlay, /4, 3\.6, 6, 4\.6, 8, 5\.4, 10, 6\.0/);
  assert.match(core, /'line-color': '#ffad66'/);
  assert.match(core, /4, 1\.65, 6, 2\.15, 8, 2\.7, 10, 3\.0/);
});

test('WP2D-C lets critical routes beat ordinary infrastructure clutter', () => {
  const routes = layerBlock('campaign-strategic-routes');
  assert.match(routes, /\['boolean', \['get', 'selected_supply_path'\], false\], 0\.92/);
  assert.match(routes, /\['boolean', \['get', 'bottleneck'\], false\], 0\.82/);
  assert.match(routes, /\n\s+0\.04\n\s+\],\n\s+5\.8/);
  assert.match(routes, /\n\s+0\.12\n\s+\],\n\s+7/);
  assert.match(routes, /\n\s+0\.26\n\s+\],\n\s+9/);
  assert.match(routes, /\n\s+0\.42\n\s+\]\n\s+\]/);
});

test('WP2D-C reduces stale and preparatory state outlines while keeping live combat strongest', () => {
  const stateOutline = layerBlock('campaign-state-outline');
  assert.match(stateOutline, /active_combat'\], false\], 0\.96/);
  assert.match(stateOutline, /recent-combat'\], 0\.42/);
  assert.match(stateOutline, /preparing'\], 0\.68/);
  assert.match(stateOutline, /active_combat'\], false\], 3\.1/);
  assert.match(stateOutline, /recent-combat/);
});
