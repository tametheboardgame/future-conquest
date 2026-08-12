const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

test('MapLibre v6 worker is bundled through Vite before terrain map construction', () => {
  assert.match(source, /setWorkerUrl/);
  assert.match(source, /maplibre-gl\/dist\/maplibre-gl-worker\.mjs\?worker&url/);
  const setup = source.indexOf('setWorkerUrl(mapLibreWorkerUrl)');
  const construction = source.indexOf('new Map({');
  assert.ok(setup >= 0 && construction > setup, 'worker URL must be configured before Map construction');
});
