const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { STRATEGIC_ROUTE_BY_ID } = require('../.test-dist/strategic-network-data.js');
const {
  availableRoutesBetween,
  estimateRouteMovementDays,
  movementProgressForDay,
  recommendRoute
} = require('../.test-dist/route-movement.js');
const { getAdjacentOrderTargets, getOrderTargetInfo } = require('../.test-dist/order-targeting.js');
const { beginOperation, issueMove, newGame, __testOnly } = require('../.test-dist/engine.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function positionedState(origin, target, controller = 'player') {
  const state = structuredClone(newGame(422, 'standard'));
  const group = state.taskGroups['TG-1'];
  state.selectedTaskGroupId = group.id;
  state.selectedTerritory = target;
  state.targetTerritory = target;
  group.location = origin;
  group.status = 'ready';
  group.supply = 100;
  delete group.order;
  state.territories[origin].controller = 'player';
  state.territories[origin].occupation = 'controlled';
  state.territories[target].controller = controller;
  state.territories[target].occupation = controller === 'player' ? 'controlled' : 'enemy';
  return state;
}

test('operational reach follows traversable routes and retains parallel-route fallback', () => {
  const state = positionedState('BE-01', 'NL-01');
  assert.ok(getAdjacentOrderTargets(state).includes('NL-01'));
  assert.equal(getOrderTargetInfo(state, 'NL-01').kind, 'move');

  state.routeStates['R-BRUSSELS-AMSTERDAM'].status = 'blocked';
  assert.equal(getOrderTargetInfo(state, 'NL-01').kind, 'move');
  assert.deepEqual(
    availableRoutesBetween(state.routeStates, 'BE-01', 'NL-01').map(route => route.id),
    ['R-ANTWERP-ROTTERDAM-ROAD']
  );

  state.routeStates['R-ANTWERP-ROTTERDAM-ROAD'].status = 'destroyed';
  assert.equal(getOrderTargetInfo(state, 'NL-01').kind, 'route-blocked');
  assert.ok(!getAdjacentOrderTargets(state).includes('NL-01'));
});

test('the recommended corridor favours travel time then effective capacity', () => {
  const state = positionedState('BE-01', 'NL-01');
  const group = state.taskGroups['TG-1'];
  const recommended = recommendRoute(state.routeStates, 'BE-01', 'NL-01', group);
  assert.equal(recommended.id, 'R-BRUSSELS-AMSTERDAM');
  assert.equal(estimateRouteMovementDays(recommended, state.routeStates[recommended.id], group), 1);
});

test('route damage and heavy-equipment restrictions reduce daily movement progress', () => {
  const route = STRATEGIC_ROUTE_BY_ID['R-LYON-GOTTHARD'];
  assert.equal(route.heavyArmour, false);
  const open = { status: 'open', condition: 100, capacityModifier: 1 };
  const damaged = { status: 'damaged', condition: 45, capacityModifier: .65 };
  const infantryProgress = movementProgressForDay(route, open, { functionalArmour: 0, supply: 100 });
  const armouredProgress = movementProgressForDay(route, open, { functionalArmour: 1000, supply: 100 });
  const damagedProgress = movementProgressForDay(route, damaged, { functionalArmour: 1000, supply: 100 });
  assert.ok(armouredProgress < infantryProgress);
  assert.ok(damagedProgress < armouredProgress);
});

test('movement orders persist the selected route and resolve on route timing', () => {
  let state = positionedState('FR-01', 'FR-05');
  state = issueMove(state, 'R-RENNES-LYON');
  assert.equal(state.taskGroups['TG-1'].order.routeId, 'R-RENNES-LYON');

  state = __testOnly.resolveMovement(state);
  assert.equal(state.taskGroups['TG-1'].location, 'FR-01');
  assert.equal(state.taskGroups['TG-1'].order.progress, 50);

  state = __testOnly.resolveMovement(state);
  assert.equal(state.taskGroups['TG-1'].location, 'FR-05');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
  assert.equal(state.taskGroups['TG-1'].order, undefined);
});

test('a corridor blocked after orders are issued halts the movement at origin', () => {
  let state = positionedState('FR-01', 'FR-05');
  state = issueMove(state, 'R-RENNES-LYON');
  state.routeStates['R-RENNES-LYON'].status = 'blocked';
  state = __testOnly.resolveMovement(state);
  assert.equal(state.taskGroups['TG-1'].location, 'FR-01');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
  assert.equal(state.taskGroups['TG-1'].order, undefined);
  assert.match(state.events[0].text, /movement halted/i);
});

test('attacks also require and persist a traversable operational corridor', () => {
  let state = positionedState('FR-02', 'BE-01', 'enemy');
  state = beginOperation(state, 'R-PARIS-BRUSSELS-ROAD');
  assert.equal(state.taskGroups['TG-1'].order.routeId, 'R-PARIS-BRUSSELS-ROAD');
  assert.equal(Object.keys(state.operations).length, 1);

  const blocked = positionedState('FR-02', 'BE-01', 'enemy');
  blocked.routeStates['R-PARIS-BRUSSELS'].status = 'blocked';
  blocked.routeStates['R-PARIS-BRUSSELS-ROAD'].status = 'destroyed';
  const unchanged = beginOperation(blocked);
  assert.equal(Object.keys(unchanged.operations).length, 0);
});

test('version 6 active orders migrate to version 8 with a valid route assignment', () => {
  let state = positionedState('FR-01', 'FR-05');
  state = issueMove(state, 'R-RENNES-LYON');
  const legacy = structuredClone(state);
  legacy.version = 6;
  delete legacy.taskGroups['TG-1'].order.routeId;

  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 10);
  assert.equal(upgraded.taskGroups['TG-1'].order.routeId, 'R-RENNES-LYON');
});

test('the command interface exposes route selection and the version 8 release marker', () => {
  const app = read('src/App.tsx');
  const engine = read('src/game/engine.ts');
  const persistence = read('src/game/persistence.ts');
  assert.match(app, /PHASE VIII-B4B \/ ENGINEERING PROJECTS/);
  assert.match(app, /Operational corridor/);
  assert.match(app, /issueMove\(current, chosenRouteId/);
  assert.match(app, /beginOperation\(current, chosenRouteId/);
  assert.match(engine, /future-conquest-slice-v0\.7/);
  assert.match(persistence, /saveVersion:\s*10/);
  assert.equal(STRATEGIC_ROUTE_BY_ID['R-RENNES-LYON'].movementDays, 2);
});
