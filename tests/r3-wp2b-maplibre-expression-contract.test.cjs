const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

function layerBlock(id, nextId) {
  const start = source.indexOf(`id: '${id}'`);
  assert.notEqual(start, -1, `missing ${id}`);
  const end = nextId ? source.indexOf(`id: '${nextId}'`, start) : source.length;
  assert.notEqual(end, -1, `missing layer after ${id}`);
  return source.slice(start, end);
}

test('territory opacity uses a feature-state case without invalid nested zoom expressions', () => {
  const layer = layerBlock('campaign-territories-fill', 'campaign-territory-state-wash');
  assert.match(layer, /'fill-opacity': \[\s*'case'/);
  assert.match(layer, /\['feature-state', 'hover'\]/);
  assert.doesNotMatch(layer, /\['zoom'\]/);
});

test('strategic route zoom opacity and width use top-level interpolate', () => {
  const layer = layerBlock('campaign-strategic-routes', 'campaign-control-borders');
  assert.match(layer, /'line-opacity': \[\s*'interpolate', \['linear'\], \['zoom'\]/);
  assert.match(layer, /'line-width': \[\s*'interpolate', \['linear'\], \['zoom'\]/);
  assert.doesNotMatch(layer, /'line-opacity': \[\s*'case'[\s\S]*\['zoom'\]/);
  assert.doesNotMatch(layer, /'line-width': \[\s*'case'[\s\S]*\['zoom'\]/);
});

test('terrain capability diagnostic reflects WebGL fallback support', () => {
  assert.match(source, /canvas\.getContext\('webgl2'\) \|\| canvas\.getContext\('webgl'\)/);
  assert.match(source, /WebGL terrain rendering is unavailable/);
});
