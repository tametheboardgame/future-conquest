const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame } = require('../.test-dist/engine.js');
const {
  frontierInterdictionRoutes,
  interdictionGroupsForRoute,
  interdictionMissionDemand,
  resolveInterdictionMissions,
  resolveOperationCombatDamage,
  startInterdictionMission
} = require('../.test-dist/interdiction-missions.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

function availableMission(seed = 11) {
  const state = newGame(seed);
  const route = frontierInterdictionRoutes(state)[0];
  assert.ok(route, 'expected a frontier route');
  const group = interdictionGroupsForRoute(state, route.id)[0];
  assert.ok(group, 'expected an eligible formation');
  return { state, route, group };
}

test('new campaigns initialise version 11 interdiction state', () => {
  const state = newGame(21);
  assert.equal(state.version, 14);
  assert.deepEqual(state.interdictionMissions, []);
});

test('starting an interdiction mission commits a frontier formation and increases logistics demand', () => {
  const { state, route, group } = availableMission(31);
  const before = state.logistics.formationAllocations[group.id].demand;
  const next = startInterdictionMission(state, route.id, group.id, 100);
  assert.equal(next.interdictionMissions.length, 1);
  assert.equal(next.interdictionMissions[0].status, 'active');
  assert.equal(next.taskGroups[group.id].status, 'interdicting');
  assert.ok(next.logistics.formationAllocations[group.id].demand > before);
  assert.ok(next.logistics.formationAllocations[group.id].demand >= interdictionMissionDemand({ intensity: 100 }));
});

test('a supplied interdiction mission reaches a persistent outcome and releases its formation', () => {
  let resolved = null;
  for (let seed = 1; seed <= 120 && !resolved; seed += 1) {
    const { state, route, group } = availableMission(seed);
    let missionState = startInterdictionMission(state, route.id, group.id, 100);
    missionState.interdictionMissions[0].progress = 99;
    missionState.logistics.formationAllocations[group.id].ratio = 100;
    const next = resolveInterdictionMissions(missionState);
    if (next.interdictionMissions[0].status !== 'active') resolved = { before: missionState, next, route, group };
  }
  assert.ok(resolved, 'expected a terminal mission result');
  const mission = resolved.next.interdictionMissions[0];
  assert.ok(mission.status === 'succeeded' || mission.status === 'failed');
  assert.notEqual(resolved.next.taskGroups[resolved.group.id].status, 'interdicting');
  if (mission.status === 'succeeded') {
    assert.ok(resolved.next.routeStates[resolved.route.id].condition < resolved.before.routeStates[resolved.route.id].condition);
    assert.equal(resolved.next.infrastructureIncidents[0].cause, 'player-interdiction');
    assert.ok(mission.damageInflicted > 0);
  } else {
    assert.ok(mission.casualties > 0);
  }
});

test('active territorial combat can generate persistent route damage', () => {
  let damaged = null;
  for (let seed = 1; seed <= 200 && !damaged; seed += 1) {
    const state = newGame(seed);
    state.turn = seed;
    const route = frontierInterdictionRoutes(state)[0];
    if (!route) continue;
    const group = Object.values(state.taskGroups)[0];
    group.order = { type: 'attack', target: route.toTerritoryId, progress: 10, days: 1, routeId: route.id, operationId: 'OP-TEST' };
    group.status = 'attacking';
    const operation = { id: 'OP-TEST', target: route.toTerritoryId, participantGroupIds: [group.id], origins: { [group.id]: group.location }, progress: 10, days: 7, enemyFormationIds: [], enemyPower: 10 };
    const next = resolveOperationCombatDamage(state, operation, [group], 12000);
    if (next.routeStates[route.id].condition < state.routeStates[route.id].condition) damaged = { next, route };
  }
  assert.ok(damaged, 'expected deterministic combat damage within the seed range');
  assert.equal(damaged.next.infrastructureIncidents[0].cause, 'combat');
});

test('version 10 campaigns migrate to version 11 with an empty interdiction ledger', () => {
  const current = newGame(51);
  const { interdictionMissions, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 10 });
  assert.equal(migrated.version, 14);
  assert.deepEqual(migrated.interdictionMissions, []);
});

test('the interface exposes the Phase VIII-B4C infrastructure warfare controls', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const component = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(app, /PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING/);
  assert.match(app, /<InfrastructureCommand/);
  assert.match(component, /startInterdictionMission/);
  assert.match(component, /setInterdictionIntensity/);
  assert.match(component, /cancelInterdictionMission/);
  assert.match(component, /Launch interdiction mission/);
  assert.match(component, /Mission intensity/);
  assert.match(main, /interdiction\.css/);
  assert.match(main, /infrastructure-command\.css/);
});
