const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { newGame } = require('../.test-dist/engine.js');
const {
  applyInfrastructureDamage,
  resolveInfrastructureRecovery,
  routeCapacityModifierForCondition,
  routeStatusForCondition
} = require('../.test-dist/infrastructure-disruption.js');
const { STRATEGIC_ROUTE_BY_ID } = require('../.test-dist/strategic-network-data.js');
const { routeIsTraversable } = require('../.test-dist/route-movement.js');
const { effectiveRouteSupplyCapacity } = require('../.test-dist/supply-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('new campaigns initialise the infrastructure incident ledger', () => {
  const state = newGame(711, 'standard');
  assert.equal(state.version, 14);
  assert.deepEqual(state.infrastructureIncidents, []);
});

test('heavy infrastructure damage persists as degraded but usable until the corridor is actually destroyed', () => {
  const state = newGame(711, 'standard');
  const damaged = applyInfrastructureDamage(state, 'R-PARIS-STRASBOURG', 70, 'enemy-interdiction');
  const route = STRATEGIC_ROUTE_BY_ID['R-PARIS-STRASBOURG'];
  const routeState = damaged.routeStates[route.id];

  assert.equal(routeState.condition, 30);
  assert.equal(routeState.status, 'damaged');
  assert.ok(routeState.capacityModifier > 0 && routeState.capacityModifier < 1);
  assert.equal(routeIsTraversable(route, routeState), true);
  assert.ok(effectiveRouteSupplyCapacity(damaged, route.id) > 0);
  assert.equal(damaged.infrastructureIncidents.length, 1);
  assert.equal(damaged.infrastructureIncidents[0].cause, 'enemy-interdiction');
  assert.match(damaged.events[0].text, /Enemy interdiction damaged/);
});

test('secured and supplied player corridors recover gradually without jumping between binary states', () => {
  const state = structuredClone(newGame(711, 'standard'));
  for (const id of ['BE-01', 'NL-01']) {
    state.territories[id].controller = 'player';
    state.territories[id].occupation = 'administered';
    state.territories[id].supplied = true;
  }
  state.routeStates['R-BRUSSELS-AMSTERDAM'].condition = 40;
  state.routeStates['R-BRUSSELS-AMSTERDAM'].status = 'damaged';
  state.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier = routeCapacityModifierForCondition(40);
  const beforeModifier = state.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier;
  const recovered = resolveInfrastructureRecovery(state);
  assert.ok(recovered.routeStates['R-BRUSSELS-AMSTERDAM'].condition > 40);
  assert.ok(recovered.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier > beforeModifier);
  assert.equal(recovered.routeStates['R-BRUSSELS-AMSTERDAM'].status, 'damaged');
});

test('route condition thresholds reserve impassability for genuine destruction or explicit blocks', () => {
  assert.equal(routeStatusForCondition(100), 'open');
  assert.equal(routeStatusForCondition(75), 'open');
  assert.equal(routeStatusForCondition(60), 'damaged');
  assert.equal(routeStatusForCondition(20), 'damaged');
  assert.equal(routeStatusForCondition(1), 'damaged');
  assert.equal(routeStatusForCondition(0), 'destroyed');
});

test('version 8 campaigns migrate with an empty incident ledger', () => {
  const legacy = structuredClone(newGame(711, 'standard'));
  legacy.version = 8;
  delete legacy.infrastructureIncidents;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 14);
  assert.deepEqual(upgraded.infrastructureIncidents, []);
});

test('the source exposes persistent disruption with progressive capacity mechanics', () => {
  const app = read('src/App.tsx');
  const engine = read('src/game/engine.ts');
  const persistence = read('src/game/persistence.ts');
  const disruption = read('src/game/infrastructure-disruption.ts');
  assert.match(app, /PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING/);
  assert.match(engine, /resolveInfrastructureDisruption/);
  assert.match(persistence, /saveVersion:\s*14/);
  assert.match(disruption, /Resistance sabotage/);
  assert.match(disruption, /Enemy interdiction/);
  assert.match(disruption, /condition <= 0/);
});
