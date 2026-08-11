const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const spikeSource = fs.readFileSync('src/presentation/r3-renderer-spike.ts', 'utf8');

test('R3 WP1 renderer spike uses equivalent representative and dense scene pressure', async () => {
  const spike = await import('../scripts/benchmark-r3-renderer-spike.mjs');
  const representative = spike.buildRendererSpikeScene('representative');
  const dense = spike.buildRendererSpikeScene('dense');

  assert.equal(representative.territories.length, 15);
  assert.equal(representative.routes.length, 36);
  assert.equal(representative.pieces.length, 48);
  assert.equal(representative.overlayCount, 30);
  assert.equal(dense.territories.length, 15);
  assert.equal(dense.routes.length, 72);
  assert.equal(dense.pieces.length, 120);
  assert.equal(dense.overlayCount, 90);

  const svg = spike.prepareSvgDomSpike(dense);
  const webgl = spike.prepareWebGlHybridSpike(dense);
  assert.match(svg, /data-selected="true"/);
  assert.ok(webgl.territories.byteLength > 0);
  assert.ok(webgl.routes.byteLength > 0);
  assert.ok(webgl.pieces.byteLength > 0);
  assert.equal(webgl.domOverlayCount, dense.overlayCount);
});

test('R3 WP1 renderer preparation benchmark stays well inside the frame reference budget', async () => {
  const spike = await import('../scripts/benchmark-r3-renderer-spike.mjs');
  const benchmark = spike.runRendererPreparationBenchmark(250);

  for (const profile of [benchmark.representative, benchmark.dense]) {
    assert.ok(Number.isFinite(profile.svgDom.averagePrepareMs));
    assert.ok(Number.isFinite(profile.webglHybrid.averagePrepareMs));
    assert.ok(profile.svgDom.averagePrepareMs < 16.67);
    assert.ok(profile.webglHybrid.averagePrepareMs < 16.67);
    assert.ok(profile.webglHybrid.payloadSize < profile.svgDom.payloadSize);
  }
});

test('R3 WP1 keeps WebGL as a capability-probed optional acceleration path', () => {
  assert.match(spikeSource, /probeWebGlCapability/);
  assert.match(spikeSource, /canvas\.getContext\('webgl2'/);
  assert.match(spikeSource, /canvas\.getContext\('webgl'/);
  assert.match(spikeSource, /supported: false, api: 'none'/);
  assert.match(spikeSource, /domOverlayCount/);
});

test('R3 WP1 selects SVG DOM as the primary renderer while retaining the WebGL option', () => {
  assert.match(spikeSource, /renderer: 'svg-dom'/);
  assert.match(spikeSource, /renderer: 'webgl-hybrid'/);
  assert.match(spikeSource, /rankedRendererEvaluations/);
  assert.match(spikeSource, /R3_WP1_PRIMARY_RENDERER: RendererKind = 'svg-dom'/);
});
