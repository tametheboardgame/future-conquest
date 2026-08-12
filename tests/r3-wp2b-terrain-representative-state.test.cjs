const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadTsModule(path) {
  const source = fs.readFileSync(path, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const moduleRecord = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(moduleRecord, moduleRecord.exports, require);
  return moduleRecord.exports;
}

const overlay = loadTsModule('src/presentation/r3-terrain-overlay.ts');
const network = loadTsModule('src/game/strategic-network-data.ts');
const campaign = JSON.parse(fs.readFileSync('src/assets/vertical-slice-map.json', 'utf8'));

const playerIds = new Set(['FR-02', 'FR-03', 'BE-01', 'BE-02', 'NL-01', 'LU-01']);
const territories = Object.fromEntries(campaign.features.map(feature => {
  const id = feature.properties.territory_id;
  return [id, {
    controller: playerIds.has(id) ? 'player' : 'enemy',
    supplied: true,
    occupation: playerIds.has(id) ? 'controlled' : 'enemy'
  }];
}));

const representativePoliticalState = {
  territories,
  selectedTerritory: 'BE-02',
  targetTerritory: 'DE-02'
};

test('R3 WP2B-C preserves real Benelux/Rhine geometry under simultaneous threat and operation state', () => {
  const originalWallonia = campaign.features.find(feature => feature.properties.territory_id === 'BE-02');
  const result = overlay.buildTerrainPoliticalGeoJSON(campaign, representativePoliticalState, {
    threatenedTerritories: [{ territoryId: 'BE-02', stage: 'under-attack' }],
    activeCombatTerritoryIds: ['DE-02']
  });
  const wallonia = result.features.find(feature => feature.properties.territory_id === 'BE-02');
  const rhine = result.features.find(feature => feature.properties.territory_id === 'DE-02');
  assert.equal(wallonia.properties.selected, true);
  assert.equal(wallonia.properties.threat_stage, 'under-attack');
  assert.equal(rhine.properties.targeted, true);
  assert.equal(rhine.properties.active_combat, true);
  assert.deepEqual(wallonia.geometry, originalWallonia.geometry);
});

test('R3 WP2B-C produces short front marks inside the real dense Rhine corridor', () => {
  const result = overlay.buildTerrainFrontGeoJSON(campaign, [
    { id: 'BE-02::DE-02', fromTerritoryId: 'BE-02', toTerritoryId: 'DE-02' },
    { id: 'DE-02::LU-01', fromTerritoryId: 'LU-01', toTerritoryId: 'DE-02' }
  ]);
  assert.equal(result.features.length, 2);
  for (const feature of result.features) {
    assert.equal(feature.geometry.type, 'LineString');
    for (const [longitude, latitude] of feature.geometry.coordinates) {
      assert.ok(longitude >= 4 && longitude <= 8.5, `${feature.properties.front_id} longitude ${longitude}`);
      assert.ok(latitude >= 49 && latitude <= 52, `${feature.properties.front_id} latitude ${latitude}`);
    }
  }
});

test('R3 WP2B-C uses the authoritative Wallonia-Rhine route and node coordinates in the representative corridor', () => {
  const routeId = 'R-NAMUR-DUSSELDORF';
  const routeStates = Object.fromEntries(network.STRATEGIC_ROUTES.map(route => [route.id, {
    status: 'open', condition: 100, capacityModifier: 1, upgradeLevel: 0
  }]));
  const state = {
    routeStates,
    logistics: {
      bottleneckRouteIds: [routeId],
      routeFlows: { [routeId]: { condition: 'strained', used: 3, capacity: 3 } },
      formationAllocations: { TG1: { path: { routeIds: [routeId] } } }
    },
    selectedTaskGroupId: 'TG1'
  };
  const result = overlay.buildTerrainStrategicRouteGeoJSON(network.STRATEGIC_NODES, network.STRATEGIC_ROUTES, state);
  const feature = result.features.find(candidate => candidate.properties.route_id === routeId);
  const route = network.STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);
  const from = network.STRATEGIC_NODES.find(node => node.id === route.fromNodeId);
  const to = network.STRATEGIC_NODES.find(node => node.id === route.toNodeId);
  assert.deepEqual(feature.geometry.coordinates, [from.position, to.position]);
  assert.equal(feature.properties.bottleneck, true);
  assert.equal(feature.properties.selected_supply_path, true);
  assert.equal(feature.properties.supply_condition, 'strained');
});

test('R3 WP2B-C dense-region LOD has meaningful major-node reduction before local detail', () => {
  const corridorNodes = network.STRATEGIC_NODES.filter(node => (
    node.position[0] >= 2.5 && node.position[0] <= 9
    && node.position[1] >= 49 && node.position[1] <= 52.5
  ));
  const majorNodes = corridorNodes.filter(node => node.importance === 3);
  assert.ok(corridorNodes.length >= 10, `expected dense representative corridor, got ${corridorNodes.length}`);
  assert.ok(majorNodes.length >= 4, `expected several major nodes, got ${majorNodes.length}`);
  assert.ok(majorNodes.length < corridorNodes.length, 'LOD would not reduce dense node pressure');
});