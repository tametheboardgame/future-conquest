const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const runtimeModule = import(pathToFileURL(path.resolve('src/presentation/r3-terrain-runtime-error.ts')).href);

test('WP2D classifies the live-review generated tile status-0 error as transient', async () => {
  const { classifyTerrainRuntimeError } = await runtimeModule;
  const result = classifyTerrainRuntimeError(new Error(
    'AJAXError: Failed to fetch (0): ./generated/r3-terrain/tiles/7/65/46.png'
  ));

  assert.equal(result.kind, 'transient-tile-request');
  assert.equal(result.status, 0);
  assert.equal(result.url, './generated/r3-terrain/tiles/7/65/46.png');
});

test('WP2D also recognises MapLibre-like status-0 generated tile errors from production base paths', async () => {
  const { classifyTerrainRuntimeError } = await runtimeModule;
  const result = classifyTerrainRuntimeError({
    message: 'Failed to fetch terrain tile',
    status: 0,
    url: '/future-conquest/generated/r3-terrain/tiles/7/65/46.png'
  });

  assert.equal(result.kind, 'transient-tile-request');
  assert.equal(result.status, 0);
});

test('WP2D does not hide genuine HTTP/source failures', async () => {
  const { classifyTerrainRuntimeError } = await runtimeModule;
  const missing = classifyTerrainRuntimeError({
    message: 'AJAXError: Failed to fetch (404): /future-conquest/generated/r3-terrain/tiles/7/65/46.png',
    status: 404,
    url: '/future-conquest/generated/r3-terrain/tiles/7/65/46.png'
  });
  const invalidStyle = classifyTerrainRuntimeError(new Error('Style validation failed for campaign-territories'));

  assert.equal(missing.kind, 'source-warning');
  assert.equal(missing.status, 404);
  assert.equal(invalidStyle.kind, 'source-warning');
});

test('WP2D only suppresses status-0 requests for the generated terrain tile namespace', async () => {
  const { classifyTerrainRuntimeError } = await runtimeModule;
  const unrelated = classifyTerrainRuntimeError({
    message: 'Failed to fetch (0)',
    status: 0,
    url: '/api/campaign-state'
  });

  assert.equal(unrelated.kind, 'source-warning');
});
