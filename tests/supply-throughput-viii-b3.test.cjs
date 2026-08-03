const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { newGame, endTurn, __testOnly } = require('../.test-dist/engine.js');
const {
  calculateSupplyNetwork,
  effectiveRouteSupplyCapacity,
  formationSupplyDemand,
  refreshSupplyNetwork,
  supplyConditionForRatio
} = require('../.test-dist/supply-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function controlledCorridorState(portal, controlled) {
  const state = structuredClone(newGame(711, 'standard'));
  state.portalTerritory = portal;
  for (const [id, territory] of Object.entries(state.territories)) {
    territory.controller = controlled.includes(id) ? 'player' : 'enemy';
    territory.occupation = controlled.includes(id) ? 'controlled' : 'enemy';
    territory.resistance = controlled.includes(id) ? 20 : 0;
    territory.supplied = false;
  }
  return state;
}

test('new campaigns calculate a finite version 8 logistics network', () => {
  const state = newGame(711, 'standard');
  assert.equal(state.version, 10);
  assert.equal(state.logistics.turn, 1);
  assert.ok(state.logistics.sourceCapacity > 0);
  assert.ok(state.logistics.totalDemand > 0);
  assert.equal(state.supply, state.logistics.networkEfficiency);
  for (const group of Object.values(state.taskGroups)) {
    assert.ok(state.logistics.formationAllocations[group.id]);
    assert.equal(state.logistics.formationAllocations[group.id].condition, 'sustained');
  }
});

test('formation demand reflects personnel, armour and operational status', () => {
  const state = newGame(711, 'standard');
  const group = structuredClone(state.taskGroups['TG-1']);
  const ready = formationSupplyDemand(group);
  group.status = 'attacking';
  assert.ok(formationSupplyDemand(group) > ready);
  group.personnel = Math.floor(group.personnel / 2);
  group.functionalArmour = Math.floor(group.functionalArmour / 2);
  assert.ok(formationSupplyDemand(group) < ready * 1.2);
});

test('a narrow Alpine corridor becomes a visible throughput bottleneck', () => {
  let state = controlledCorridorState('FR-05', ['FR-05', 'CH-02']);
  for (const group of Object.values(state.taskGroups)) group.location = 'CH-02';
  state = refreshSupplyNetwork(state);
  const flow = state.logistics.routeFlows['R-LYON-GOTTHARD'];
  assert.ok(flow.capacity > 0);
  assert.equal(flow.used, flow.capacity);
  assert.equal(flow.condition, 'overloaded');
  assert.ok(state.logistics.bottleneckRouteIds.includes('R-LYON-GOTTHARD'));
  assert.ok(state.logistics.networkEfficiency < 80);
  assert.ok(Object.values(state.logistics.formationAllocations).some(allocation => allocation.condition !== 'sustained'));
});

test('parallel routes share supply demand and preserve throughput when one corridor closes', () => {
  let state = controlledCorridorState('BE-01', ['BE-01', 'NL-01']);
  for (const group of Object.values(state.taskGroups)) group.location = 'NL-01';
  state = refreshSupplyNetwork(state);
  const first = state.logistics.routeFlows['R-BRUSSELS-AMSTERDAM'];
  const second = state.logistics.routeFlows['R-ANTWERP-ROTTERDAM-ROAD'];
  assert.ok(first.used > 0);
  assert.ok(second.used > 0);
  const baseline = state.logistics.totalDelivered;

  state.routeStates['R-BRUSSELS-AMSTERDAM'].status = 'blocked';
  state = refreshSupplyNetwork(state);
  assert.equal(state.logistics.routeFlows['R-BRUSSELS-AMSTERDAM'].capacity, 0);
  assert.ok(state.logistics.routeFlows['R-ANTWERP-ROTTERDAM-ROAD'].used > 0);
  assert.equal(state.logistics.totalDelivered, baseline);
});

test('route damage reduces effective daily supply capacity', () => {
  const state = newGame(711, 'standard');
  const routeId = 'R-PARIS-STRASBOURG';
  const open = effectiveRouteSupplyCapacity(state, routeId);
  state.routeStates[routeId].status = 'damaged';
  state.routeStates[routeId].condition = 45;
  state.routeStates[routeId].capacityModifier = 0.65;
  const damaged = effectiveRouteSupplyCapacity(state, routeId);
  assert.ok(damaged > 0);
  assert.ok(damaged < open);
});

test('supply condition thresholds are stable and explicit', () => {
  assert.equal(supplyConditionForRatio(1), 'sustained');
  assert.equal(supplyConditionForRatio(.7), 'strained');
  assert.equal(supplyConditionForRatio(.5), 'undersupplied');
  assert.equal(supplyConditionForRatio(.2), 'critical');
  assert.equal(supplyConditionForRatio(0), 'cut-off');
});

test('daily logistics consequences use delivered demand rather than connectivity alone', () => {
  let state = controlledCorridorState('FR-05', ['FR-05', 'CH-02']);
  for (const group of Object.values(state.taskGroups)) {
    group.location = 'CH-02';
    group.supply = 45;
  }
  state = refreshSupplyNetwork(state);
  const before = state.taskGroups['TG-1'].supply;
  state = __testOnly.resolveOccupationAndLogistics(state);
  assert.ok(state.taskGroups['TG-1'].supply < before);
  assert.ok(state.events.some(event => /bottleneck|throughput|supply/i.test(event.text)));
});

test('version 7 campaigns migrate through version 8 to version 9 with recalculated logistics', () => {
  const legacy = structuredClone(newGame(711, 'standard'));
  legacy.version = 7;
  delete legacy.logistics;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 10);
  assert.ok(upgraded.logistics.totalDemand > 0);
  assert.equal(upgraded.supply, upgraded.logistics.networkEfficiency);
});

test('the interface exposes throughput, bottlenecks and the version 8 release marker', () => {
  const app = read('src/App.tsx');
  const map = read('src/components/MapView.tsx');
  const engine = read('src/game/engine.ts');
  const persistence = read('src/game/persistence.ts');
  const css = read('src/supply-network.css');
  assert.match(app, /PHASE VIII-B4B \/ ENGINEERING PROJECTS/);
  assert.match(app, /Delivered throughput/);
  assert.match(app, /LOGISTICS NETWORK/);
  assert.match(map, /Supply network/);
  assert.match(map, /supply-route-flow/);
  assert.match(engine, /future-conquest-slice-v0\.10/);
  assert.match(persistence, /saveVersion:\s*10/);
  assert.match(css, /\.supply-route-flow\.overloaded/);
});

test('supply-flow overlays remain non-interactive above the operational map', () => {
  const map = read('src/components/MapView.tsx');
  const css = read('src/supply-network.css');
  assert.match(map, /className="supply-route-layer" aria-hidden="true"/);
  assert.match(css, /\.supply-route-layer,\s*\n\.supply-route-layer \* \{\s*\n\s*pointer-events:\s*none/);
});
