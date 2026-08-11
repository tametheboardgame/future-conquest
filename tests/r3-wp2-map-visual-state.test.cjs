const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/presentation/r3-map-visual-state.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleRecord = { exports: {} };
new Function('module', 'exports', compiled)(moduleRecord, moduleRecord.exports);
const visual = moduleRecord.exports;

test('R3 WP2 maps existing terrain categories to stable presentation classes', () => {
  assert.equal(visual.r3TerrainClass('open-lowland'), 'terrain-open-lowland');
  assert.equal(visual.r3TerrainClass('mixed-lowland'), 'terrain-mixed-lowland');
  assert.equal(visual.r3TerrainClass('mixed-upland'), 'terrain-mixed-upland');
  assert.equal(visual.r3TerrainClass('mountainous'), 'terrain-mountainous');
  assert.equal(visual.r3TerrainClass('future-unknown'), 'terrain-unspecified');
});

test('R3 WP2 derives each opposing-control adjacency exactly once', () => {
  const control = {
    A: { controller: 'player' },
    B: { controller: 'enemy' },
    C: { controller: 'enemy' },
    D: { controller: 'player' }
  };
  const definitions = {
    A: { neighbours: ['B', 'D'] },
    B: { neighbours: ['A', 'C'] },
    C: { neighbours: ['B', 'D'] },
    D: { neighbours: ['A', 'C'] }
  };
  assert.deepEqual(visual.deriveR3FrontSegments(control, definitions), [
    { id: 'A::B', fromTerritoryId: 'A', toTerritoryId: 'B' },
    { id: 'C::D', fromTerritoryId: 'C', toTerritoryId: 'D' }
  ]);
});

test('R3 WP2 front derivation is deterministic, pure and ignores missing visual neighbours', () => {
  const control = { B: { controller: 'enemy' }, A: { controller: 'player' } };
  const definitions = { A: { neighbours: ['B', 'Z'] }, B: { neighbours: ['A'] } };
  const before = JSON.stringify({ control, definitions });
  const first = visual.deriveR3FrontSegments(control, definitions);
  const second = visual.deriveR3FrontSegments(control, definitions);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify({ control, definitions }), before);
  assert.match(source, /not a replacement border geometry/i);
  assert.match(source, /never participate in hit-testing, pathfinding or combat/i);
});
