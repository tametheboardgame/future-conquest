const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/presentation/r3-terrain-overlay.ts', 'utf8');
const withoutTypeImport = source.replace("import type { GameState } from '../game/types';\n", '');
const compiled = ts.transpileModule(withoutTypeImport, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleRecord = { exports: {} };
new Function('module', 'exports', compiled)(moduleRecord, moduleRecord.exports);
const overlay = moduleRecord.exports;

test('R3 WP2B annotates existing WGS84 features from authoritative political state', () => {
  const base = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { territory_id: 'A', label: 'Alpha' }, geometry: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [1, 2]]] } },
      { type: 'Feature', properties: { territory_id: 'B', label: 'Beta' }, geometry: { type: 'Polygon', coordinates: [[[5, 6], [7, 8], [5, 6]]] } }
    ]
  };
  const state = {
    territories: {
      A: { controller: 'player', supplied: true, occupation: 'secured' },
      B: { controller: 'enemy', supplied: false, occupation: 'enemy' }
    },
    selectedTerritory: 'A',
    targetTerritory: 'B'
  };
  const result = overlay.buildTerrainPoliticalGeoJSON(base, state);
  assert.equal(result.features[0].properties.controller, 'player');
  assert.equal(result.features[0].properties.selected, true);
  assert.equal(result.features[1].properties.controller, 'enemy');
  assert.equal(result.features[1].properties.targeted, true);
  assert.deepEqual(result.features[0].geometry, base.features[0].geometry);
});

test('R3 WP2B overlay adapter is pure and never creates unknown campaign territories', () => {
  const base = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { territory_id: 'A' }, geometry: { type: 'Polygon', coordinates: [] } },
      { type: 'Feature', properties: { territory_id: 'UNKNOWN' }, geometry: { type: 'Polygon', coordinates: [] } }
    ]
  };
  const state = {
    territories: { A: { controller: 'player', supplied: true, occupation: 'secured' } },
    selectedTerritory: null,
    targetTerritory: null
  };
  const before = JSON.stringify({ base, state });
  const result = overlay.buildTerrainPoliticalGeoJSON(base, state);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.territory_id, 'A');
  assert.equal(JSON.stringify({ base, state }), before);
  assert.match(source, /presentation-only/i);
  assert.match(source, /without changing game state or geographic geometry/i);
});
