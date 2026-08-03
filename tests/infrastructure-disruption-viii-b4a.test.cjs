const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { newGame } = require('../.test-dist/engine.js');
const {
  applyInfrastructureDamage,
  resolveInfrastructureRecovery,
  routeStatusForCondition
} = require('../.test-dist/infrastructure-disruption.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('new campaigns initialise the version 9 infrastructure incident ledger', () => {
  const state = newGame(711, 'standard');
  assert.equal(state.version, 13);
  assert.deepEqual(state.infrastructureIncidents, []);
});

test('infrastructure damage persists condition, status, capacity and incident history', () => {
  const state = newGame(711, 'standard');
  const damaged = applyInfrastructureDamage(state, 'R-PARIS-STRASBOURG', 70, 'enemy-interdiction');
  assert.equal(damaged.routeStates['R-PARIS-STRASBOURG'].condition, 30);
  assert.equal(damaged.routeStates['R-PARIS-STRASBOURG'].status, 'blocked');
  assert.ok(damaged.routeStates['R-PARIS-STRASBOURG'].capacityModifier < 1);
  assert.equal(damaged.infrastructureIncidents.length, 1);
  assert.equal(damaged.infrastructureIncidents[0].cause, 'enemy-interdiction');
  assert.match(damaged.events[0].text, /Enemy interdiction damaged/);
});

test('secured and supplied player corridors recover gradually', () => {
  const state = structuredClone(newGame(711, 'standard'));
  for (const id of ['BE-01', 'NL-01']) {
    state.territories[id].controller = 'player';
    state.territories[id].occupation = 'administered';
    state.territories[id].supplied = true;
  }
  state.routeStates['R-BRUSSELS-AMSTERDAM'].condition = 40;
  state.routeStates['R-BRUSSELS-AMSTERDAM'].status = 'damaged';
  state.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier = 0.52;
  const recovered = resolveInfrastructureRecovery(state);
  assert.ok(recovered.routeStates['R-BRUSSELS-AMSTERDAM'].condition > 40);
  assert.ok(recovered.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier > 0.52);
});

test('route condition thresholds produce explicit operational states', () => {
  assert.equal(routeStatusForCondition(100), 'open');
  assert.equal(routeStatusForCondition(60), 'damaged');
  assert.equal(routeStatusForCondition(20), 'blocked');
  assert.equal(routeStatusForCondition(0), 'destroyed');
});

test('version 8 campaigns migrate to version 9 with an empty incident ledger', () => {
  const legacy = structuredClone(newGame(711, 'standard'));
  legacy.version = 8;
  delete legacy.infrastructureIncidents;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 13);
  assert.deepEqual(upgraded.infrastructureIncidents, []);
});

test('the source exposes the Phase VIII-B4A release and disruption engine', () => {
  const app = read('src/App.tsx');
  const engine = read('src/game/engine.ts');
  const persistence = read('src/game/persistence.ts');
  const disruption = read('src/game/infrastructure-disruption.ts');
  assert.match(app, /PHASE VIII-C \/ ENEMY STRATEGY AND CAMPAIGN BALANCE/);
  assert.match(engine, /resolveInfrastructureDisruption/);
  assert.match(engine, /future-conquest-slice-v0\.10/);
  assert.match(persistence, /saveVersion:\s*13/);
  assert.match(disruption, /Resistance sabotage/);
  assert.match(disruption, /Enemy interdiction/);
});
