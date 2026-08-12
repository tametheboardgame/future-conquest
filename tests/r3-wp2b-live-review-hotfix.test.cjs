const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const impl = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const strategicCss = fs.readFileSync('src/r3-strategic-map.css', 'utf8');
const terrainCss = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');

test('WP2B live terrain capability accepts MapLibre WebGL fallback instead of requiring WebGL2 only', () => {
  assert.match(impl, /canvas\.getContext\('webgl2'\) \|\| canvas\.getContext\('webgl'\)/);
  assert.doesNotMatch(impl, /webgl: Boolean\(canvas\.getContext\('webgl2'\)\)/);
});

test('WP2B live terrain fallback is visible and retryable during product-owner review', () => {
  assert.match(app, /terrainPrototypeFailureReason/);
  assert.match(app, /3D terrain unavailable/);
  assert.match(app, /Retry terrain/);
  assert.match(app, /setTerrainPrototypeFailureReason\(reason\)/);
  assert.match(terrainCss, /\.r3-terrain-fallback-notice/);
});

test('R3 map controls preserve absolute overlay positioning and stay above the SVG', () => {
  assert.doesNotMatch(strategicCss, /\.europe-map-frame \.map,\s*\n\.europe-map-frame \.map-controls,\s*\n\.europe-map-frame \.map-viewport-status \{\s*\n\s*position: relative/);
  assert.match(strategicCss, /\.europe-map-frame \.map \{\s*\n\s*position: relative;\s*\n\s*z-index: 2/);
  assert.match(strategicCss, /\.europe-map-frame \.map-controls,[\s\S]*\.europe-map-frame \.map-viewport-status \{\s*\n\s*z-index: 6/);
});
