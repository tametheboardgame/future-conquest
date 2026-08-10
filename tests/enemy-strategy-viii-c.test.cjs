const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame, endTurn, __testOnly: engineTest } = require('../.test-dist/engine.js');
const {
  assessEnemyStrategy,
  createEnemyStrategyState,
  crisisLimitForDifficulty,
  resolveEnemyStrategy,
  __testOnly
} = require('../.test-dist/enemy-strategy.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

function exposeFront(state) {
  const origin = state.portalTerritory;
  const target = Object.keys(state.territories).find(id => id !== origin && state.territories[id].controller === 'enemy' && require('../.test-dist/data.js').TERRITORIES[origin].neighbours.includes(id));
  assert.ok(target);
  state.territories[target].controller = 'player';
  state.territories[target].occupation = 'contested';
  state.territories[target].supplied = true;
  for (const group of Object.values(state.taskGroups)) group.location = target;
  return target;
}

test('new campaigns initialise version 13 enemy strategy state', () => {
  const state = newGame(301, 'standard');
  assert.equal(state.version, 14);
  assert.deepEqual(state.enemyStrategy, createEnemyStrategyState('standard'));
  assert.equal(crisisLimitForDifficulty('story'), 7);
  assert.equal(crisisLimitForDifficulty('standard'), 5);
  assert.equal(crisisLimitForDifficulty('hard'), 3);
});

test('strategy assessment escalates into logistics war when the network is failing', () => {
  const state = newGame(302, 'standard');
  state.escalation = 48;
  state.escalationStage = 3;
  state.logistics.networkEfficiency = 31;
  state.logistics.bottleneckRouteIds = Object.keys(state.logistics.routeFlows).slice(0, 2);
  state.logistics.starvedFormationIds = Object.keys(state.taskGroups).slice(0, 2);
  const assessment = assessEnemyStrategy(state);
  assert.ok(assessment.doctrine === 'logistics-war' || assessment.doctrine === 'strategic-emergency');
  assert.ok(assessment.pressure >= 45);
  assert.ok(assessment.threatenedRouteIds.length >= 1);
});

test('counteroffensive doctrine creates a warned multi-formation plan when sufficient enemy power is adjacent', () => {
  const state = newGame(303, 'hard');
  const target = exposeFront(state);
  state.escalation = 60;
  state.escalationStage = 4;
  for (const group of Object.values(state.taskGroups)) {
    group.personnel = 200;
    group.functionalArmour = 100;
    group.morale = 45;
  }
  const next = resolveEnemyStrategy(state);
  const order = next.enemyOrders.find(candidate => candidate.type === 'counterattack' && candidate.status === 'planned');
  assert.ok(order);
  assert.equal(order.target, target);
  assert.ok((order.supportFormationIds ?? []).length >= 1);
  assert.equal(order.executeTurn, state.turn + 1);
  assert.ok(next.intelligenceReports.some(report => report.kind === 'strategy'));
});

test('coordinated counterattack resolution uses supporting formations', () => {
  let state = newGame(304, 'hard');
  const target = exposeFront(state);
  state.turn = 5;
  state.escalation = 70;
  state.escalationStage = 4;
  const enemyNeighbour = require('../.test-dist/data.js').TERRITORIES[target].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(enemyNeighbour);
  const adjacent = Object.values(state.enemyFormations).slice(0, 2);
  assert.equal(adjacent.length, 2);
  for (const formation of adjacent) formation.location = enemyNeighbour;
  state.enemyOrders = [{
    id: 'EO-TEST-COORDINATED',
    turn: 4,
    type: 'counterattack',
    formationId: adjacent[0].id,
    supportFormationIds: [adjacent[1].id],
    origin: adjacent[0].location,
    target,
    executeTurn: 5,
    status: 'planned',
    priority: 110,
    summary: 'Test coordinated attack'
  }];
  for (const group of Object.values(state.taskGroups)) {
    group.personnel = 1;
    group.functionalArmour = 0;
    group.morale = 5;
  }
  const next = engineTest.resolveCounterattack(state);
  assert.equal(next.enemyOrders.find(order => order.id === 'EO-TEST-COORDINATED').status, 'completed');
  assert.equal(next.territories[target].controller, 'enemy');
  assert.equal(next.enemyFormations[adjacent[0].id].location, target);
  assert.equal(next.enemyFormations[adjacent[1].id].location, target);
});

test('coordinated counterattacks require a difficulty-scaled recovery window', () => {
  const state = newGame(307, 'standard');
  const target = exposeFront(state);
  state.turn = 8;
  state.escalationStage = 4;
  state.enemyStrategy.doctrine = 'counteroffensive';
  state.enemyStrategy.focusTerritory = target;
  state.enemyOrders = [{
    id: 'EO-RECENT-COUNTERATTACK',
    turn: 7,
    type: 'counterattack',
    formationId: Object.keys(state.enemyFormations)[0],
    origin: target,
    target,
    status: 'completed',
    priority: 110,
    summary: 'Recently completed counterattack'
  }];
  const next = __testOnly.planCoordinatedCounterattack(state);
  assert.equal(next, state);
  assert.equal(next.enemyOrders.length, 1);
});

test('operational crisis requires depleted carried stocks as well as network failure and can recover', () => {
  let state = newGame(305, 'standard');
  exposeFront(state);
  state.enemyStrategy.pressure = 90;
  state.logistics.networkEfficiency = 20;
  state.logistics.starvedFormationIds = Object.keys(state.taskGroups);
  for (const group of Object.values(state.taskGroups)) group.personnel = 600;

  const buffered = __testOnly.updateOperationalCrisis(state);
  assert.equal(buffered.enemyStrategy.operationalCrisisTurns, 0, 'healthy carried stocks should buffer a temporary network collapse');

  for (const group of Object.values(state.taskGroups)) group.supply = 10;
  const crisis = __testOnly.updateOperationalCrisis(state);
  assert.equal(crisis.enemyStrategy.operationalCrisisTurns, 1);
  crisis.logistics.networkEfficiency = 100;
  crisis.logistics.starvedFormationIds = [];
  for (const group of Object.values(crisis.taskGroups)) {
    group.personnel = 2500;
    group.supply = 100;
  }
  const recovered = __testOnly.updateOperationalCrisis(crisis);
  assert.equal(recovered.enemyStrategy.operationalCrisisTurns, 0);
});

test('version 12 campaigns migrate to version 13 with normalised strategy state', () => {
  const current = newGame(306, 'standard');
  const { enemyStrategy, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 12 });
  assert.equal(migrated.version, 14);
  assert.equal(migrated.enemyStrategy.doctrine, 'containment');
});

test('the interface exposes Phase VIII-C enemy strategy and crisis information', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  const module = fs.readFileSync('src/game/enemy-strategy.ts', 'utf8');
  assert.match(app, /PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING/);
  assert.match(app, /ENEMY THEATRE COMMAND/);
  assert.match(app, /Operational crisis/);
  assert.match(module, /Coordinated counterattack forming/);
  assert.match(module, /applyInfrastructureDamage/);
  assert.match(main, /enemy-strategy\.css/);
});
