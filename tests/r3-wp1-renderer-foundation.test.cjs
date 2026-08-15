const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const foundation = fs.readFileSync('src/presentation/r3-renderer-foundation.ts', 'utf8');
const roadmap = fs.readFileSync('docs/roadmap/R3-ROADMAP.md', 'utf8');
const spike = fs.readFileSync('docs/architecture/R3-WP1-RENDERER-SPIKE.md', 'utf8');

test('R3 WP1 keeps renderer state downstream of authoritative simulation state', () => {
  assert.match(foundation, /MapPresentationFrame/);
  assert.match(foundation, /renderers must never mutate GameState/i);
  assert.match(foundation, /render\(frame: Readonly<MapPresentationFrame>\)/);
  assert.match(roadmap, /simulation remains authoritative/i);
});

test('R3 WP1 establishes explicit presentation layer boundaries', () => {
  for (const layer of ['terrain', 'political-control', 'routes', 'pieces', 'effects', 'overlays']) {
    assert.match(foundation, new RegExp(`'${layer}'`));
  }
  assert.match(spike, /GameState -> presentation adapter -> immutable MapPresentationFrame -> renderer adapter/);
});

test('R3 WP1 preserves the validated map detail hierarchy', () => {
  assert.match(foundation, /zoomPercent >= 600.*'tactical'/s);
  assert.match(foundation, /zoomPercent >= 285.*'local'/s);
  assert.match(foundation, /zoomPercent >= 135.*'regional'/s);
  assert.match(foundation, /return 'theatre'/);
});

test('R3 WP1 defines versioned assets and renderer-neutral frame instrumentation', () => {
  assert.match(foundation, /R3_ASSET_NAMESPACE = 'r3-v1'/);
  assert.match(foundation, /R3_TARGET_FRAME_MS = 1000 \/ 60/);
  assert.match(foundation, /averageFrameMs/);
  assert.match(foundation, /worstFrameMs/);
  assert.match(foundation, /estimatedFps/);
  assert.match(foundation, /overBudgetRatio/);
});

test('R3 WP1 measured renderer evidence remains preserved while the accepted architecture has evolved', () => {
  assert.match(foundation, /'svg-dom' \| 'webgl-hybrid'/);
  assert.match(spike, /Evolved SVG\/DOM/);
  assert.match(spike, /WebGL hybrid/);
  assert.match(spike, /Preparation benchmark/i);
  assert.match(spike, /Decision/i);
  assert.match(roadmap, /MapLibre\/Three\.js hybrid/i);
  assert.match(roadmap, /measured/i);
});

test('R3 retains the SVG DOM map as the explicit compatibility fallback behind the accepted hybrid renderer', () => {
  assert.match(spike, /primary R3 map renderer is evolved SVG\/DOM/i);
  assert.match(spike, /WebGL[\s\S]*optional acceleration/i);
  assert.match(roadmap, /stable SVG\/DOM campaign map[\s\S]*fallback/i);
  assert.match(roadmap, /MapLibre\/Three\.js hybrid/);
});
