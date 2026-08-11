const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/presentation/r3-terrain-overlay.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleRecord = { exports: {} };
new Function('module', 'exports', 'require', compiled)(moduleRecord, moduleRecord.exports, require);
const overlay = moduleRecord.exports;

const base = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { territory_id: 'A', label: 'Alpha', centre: [1, 2] }, geometry: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [1, 2]]] } },
    { type: 'Feature', properties: { territory_id: 'B', label: 'Beta', centre: [3, 4] }, geometry: { type: 'Polygon', coordinates: [[[5, 6], [7, 8], [5, 6]]] } }
  ]
};

const politicalState = {
  territories: {
    A: { controller: 'player', supplied: true, occupation: 'secured' },
    B: { controller: 'enemy', supplied: false, occupation: 'enemy' }
  },
  selectedTerritory: 'A',
  targetTerritory: 'B'
};

test('R3 WP2B annotates existing WGS84 features from authoritative political state', () => {
  const result = overlay.buildTerrainPoliticalGeoJSON(base, politicalState);
  assert.equal(result.features[0].properties.controller, 'player');
  assert.equal(result.features[0].properties.selected, true);
  assert.equal(result.features[1].properties.controller, 'enemy');
  assert.equal(result.features[1].properties.targeted, true);
  assert.equal(result.features[0].properties.threat_stage, 'none');
  assert.equal(result.features[0].properties.active_combat, false);
  assert.deepEqual(result.features[0].geometry, base.features[0].geometry);
});

test('R3 WP2B-C projects only supplied visible threat/combat state onto political geometry', () => {
  const result = overlay.buildTerrainPoliticalGeoJSON(base, politicalState, {
    threatenedTerritories: [
      { territoryId: 'A', stage: 'imminent' },
      { territoryId: 'B', stage: 'recent-combat' }
    ],
    activeCombatTerritoryIds: ['A']
  });
  assert.equal(result.features[0].properties.threat_stage, 'imminent');
  assert.equal(result.features[0].properties.active_combat, true);
  assert.equal(result.features[0].properties.recent_combat, false);
  assert.equal(result.features[1].properties.threat_stage, 'recent-combat');
  assert.equal(result.features[1].properties.recent_combat, true);
  assert.match(source, /player-visible operational/i);
  assert.doesNotMatch(source, /enemyStrengthAt|enemyFormations/);
});

test('R3 WP2B overlay adapter is pure and never creates unknown campaign territories', () => {
  const localBase = {
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
  const before = JSON.stringify({ localBase, state });
  const result = overlay.buildTerrainPoliticalGeoJSON(localBase, state);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.territory_id, 'A');
  assert.equal(JSON.stringify({ localBase, state }), before);
  assert.match(source, /presentation-only/i);
  assert.match(source, /without changing game state or geographic geometry/i);
});

test('R3 WP2B-C converts the existing opposing-control front segments into short geospatial marks', () => {
  const before = JSON.stringify(base);
  const result = overlay.buildTerrainFrontGeoJSON(base, [{ id: 'A::B', fromTerritoryId: 'A', toTerritoryId: 'B' }]);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.front_id, 'A::B');
  assert.equal(result.features[0].geometry.type, 'LineString');
  const [start, end] = result.features[0].geometry.coordinates;
  const frontMidpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  assert.ok(Math.abs(frontMidpoint[0] - 2) < 1e-9);
  assert.ok(Math.abs(frontMidpoint[1] - 3) < 1e-9);
  const routeVector = [2, 2];
  const frontVector = [end[0] - start[0], end[1] - start[1]];
  assert.ok(Math.abs(routeVector[0] * frontVector[0] + routeVector[1] * frontVector[1]) < 1e-9);
  assert.equal(JSON.stringify(base), before);
});

test('R3 WP2B-C strategic route geometry reuses authoritative node coordinates and visible route/logistics state', () => {
  const nodes = [
    { id: 'N-A', territoryId: 'A', name: 'Alpha', type: 'city', position: [1, 2], importance: 2, supplyCapacity: 3 },
    { id: 'N-B', territoryId: 'B', name: 'Beta', type: 'rail-hub', position: [3, 4], importance: 3, supplyCapacity: 4 }
  ];
  const routes = [
    { id: 'R-AB', name: 'Alpha–Beta', fromNodeId: 'N-A', toNodeId: 'N-B', fromTerritoryId: 'A', toTerritoryId: 'B', type: 'rail', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true }
  ];
  const state = {
    routeStates: { 'R-AB': { status: 'damaged', condition: 60, capacityModifier: 0.6, upgradeLevel: 0 } },
    logistics: {
      bottleneckRouteIds: ['R-AB'],
      routeFlows: { 'R-AB': { condition: 'strained', used: 3, capacity: 4 } },
      formationAllocations: { TG1: { path: { routeIds: ['R-AB'] } } }
    },
    selectedTaskGroupId: 'TG1'
  };
  const result = overlay.buildTerrainStrategicRouteGeoJSON(nodes, routes, state);
  assert.deepEqual(result.features[0].geometry.coordinates, [[1, 2], [3, 4]]);
  assert.equal(result.features[0].properties.status, 'damaged');
  assert.equal(result.features[0].properties.bottleneck, true);
  assert.equal(result.features[0].properties.selected_supply_path, true);
  assert.equal(result.features[0].properties.supply_condition, 'strained');
});

test('R3 WP2B-C strategic nodes carry only stable node metadata and territory control', () => {
  const nodes = [
    { id: 'N-A', territoryId: 'A', name: 'Alpha', type: 'capital', position: [1, 2], importance: 3, supplyCapacity: 5 }
  ];
  const result = overlay.buildTerrainStrategicNodeGeoJSON(nodes, politicalState);
  assert.equal(result.features.length, 1);
  assert.deepEqual(result.features[0].geometry.coordinates, [1, 2]);
  assert.equal(result.features[0].properties.controller, 'player');
  assert.equal(result.features[0].properties.importance, 3);
});
