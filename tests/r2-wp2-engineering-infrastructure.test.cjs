const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  __testOnly,
  beginOperation,
  canIssueOperationalOrder,
  issueMove,
  newGame
} = require('../.test-dist/engine.js');
const {
  engineeringDailyWork,
  engineeringMovementFactor,
  engineeringOperationalPersonnel,
  resolveEngineeringProjects,
  startEngineeringProject,
  startEngineeringUpgrade,
  withdrawEngineeringSupport
} = require('../.test-dist/engineering-projects.js');
const { applyInfrastructureDamage, routeCapacityModifierForCondition } = require('../.test-dist/infrastructure-disruption.js');
const { STRATEGIC_ROUTE_BY_ID } = require('../.test-dist/strategic-network-data.js');
const { routeEffectiveCapacity } = require('../.test-dist/strategic-network.js');
const { movementProgressForDay, routeIsTraversable } = require('../.test-dist/route-movement.js');
const { effectiveRouteSupplyCapacity, refreshSupplyNetwork } = require('../.test-dist/supply-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');
const { CURRENT_SAVE_KEY, inspectStoredCampaign } = require('../.test-dist/persistence.js');

const read = file => fs.readFileSync(file, 'utf8');
const ROUTE_ID = 'R-BRUSSELS-AMSTERDAM';

function projectState(condition = 55) {
  let state = structuredClone(newGame(8126, 'standard'));
  state.portalTerritory = 'BE-01';
  for (const id of ['BE-01', 'NL-01']) {
    state.territories[id].controller = 'player';
    state.territories[id].occupation = 'administered';
    state.territories[id].supplied = true;
    state.territories[id].resistance = 5;
  }
  state.taskGroups['TG-1'].location = 'BE-01';
  state.taskGroups['TG-1'].personnel = 2500;
  state.taskGroups['TG-1'].maxPersonnel = 2500;
  state.taskGroups['TG-1'].functionalArmour = Math.min(2000, state.taskGroups['TG-1'].functionalArmour);
  state.taskGroups['TG-1'].status = 'ready';
  state.taskGroups['TG-1'].order = undefined;
  state.selectedTaskGroupId = 'TG-1';
  state.routeStates[ROUTE_ID].condition = condition;
  state.routeStates[ROUTE_ID].status = condition >= 75 ? 'open' : 'damaged';
  state.routeStates[ROUTE_ID].capacityModifier = routeCapacityModifierForCondition(condition);
  state.routeStates[ROUTE_ID].upgradeLevel = 0;
  return refreshSupplyNetwork(state);
}

function storageWith(state) {
  const values = new Map([[CURRENT_SAVE_KEY, JSON.stringify(state)]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test('R2-WP2 civil projects progress without military support', () => {
  const started = startEngineeringProject(projectState(), ROUTE_ID);
  const project = started.engineeringProjects[0];
  const before = started.routeStates[ROUTE_ID].condition;
  assert.equal(project.assignedTaskGroupId, undefined);
  assert.equal(project.allocation, 0);
  assert.ok(engineeringDailyWork(started, project) > 0);
  const resolved = resolveEngineeringProjects(started);
  assert.ok(resolved.routeStates[ROUTE_ID].condition > before);
});

test('R2-WP2 25 percent support leaves a 2500-person parent formation operational', () => {
  const started = startEngineeringProject(projectState(), ROUTE_ID, 'TG-1', 25);
  const group = started.taskGroups['TG-1'];
  assert.equal(group.status, 'ready');
  assert.equal(group.order, undefined);
  assert.equal(canIssueOperationalOrder(group), true);
  assert.equal(engineeringOperationalPersonnel(started, group), 2000);
  assert.ok(engineeringMovementFactor(started, group.id) > 0.88);
});

test('R2-WP2 supporting formations can move and the support detachment proportionally slows movement', () => {
  const base = projectState();
  base.targetTerritory = 'NL-01';
  const baselineOrdered = issueMove(base, ROUTE_ID);
  const baselineResolved = __testOnly.resolveMovement(baselineOrdered);
  const baselineProgress = baselineResolved.taskGroups['TG-1'].order?.progress ?? 100;

  let supported = startEngineeringProject(projectState(), ROUTE_ID, 'TG-1', 25);
  supported.targetTerritory = 'NL-01';
  const supportedOrdered = issueMove(supported, ROUTE_ID);
  assert.equal(supportedOrdered.taskGroups['TG-1'].status, 'moving');
  const supportedResolved = __testOnly.resolveMovement(supportedOrdered);
  const supportedProgress = supportedResolved.taskGroups['TG-1'].order?.progress ?? 100;
  assert.ok(supportedProgress < baselineProgress);
  assert.ok(supportedProgress > 0);
});

test('R2-WP2 supporting formations can still launch combat operations', () => {
  let state = startEngineeringProject(projectState(), ROUTE_ID, 'TG-1', 25);
  state.targetTerritory = 'FR-02';
  const attacked = beginOperation(state);
  assert.equal(attacked.taskGroups['TG-1'].status, 'attacking');
  assert.equal(attacked.engineeringProjects[0].status, 'active');
  assert.equal(attacked.engineeringProjects[0].allocation, 25);
});

test('R2-WP2 military support accelerates civil work and can be withdrawn without cancelling it', () => {
  const civil = startEngineeringProject(projectState(), ROUTE_ID);
  const civilRate = engineeringDailyWork(civil, civil.engineeringProjects[0]);
  const supported = startEngineeringProject(projectState(), ROUTE_ID, 'TG-1', 50);
  const supportedRate = engineeringDailyWork(supported, supported.engineeringProjects[0]);
  assert.ok(supportedRate > civilRate);

  const withdrawn = withdrawEngineeringSupport(supported, supported.engineeringProjects[0].id);
  assert.equal(withdrawn.engineeringProjects[0].status, 'active');
  assert.equal(withdrawn.engineeringProjects[0].allocation, 0);
  assert.ok(engineeringDailyWork(withdrawn, withdrawn.engineeringProjects[0]) > 0);
});

test('R2-WP2 lower material throughput slows rather than binary-stalls secure civil work', () => {
  const started = startEngineeringProject(projectState(), ROUTE_ID, 'TG-1', 50);
  const normalRate = engineeringDailyWork(started, started.engineeringProjects[0]);
  const starved = structuredClone(started);
  starved.logistics.territoryAllocations['BE-01'].ratio = 0;
  starved.logistics.territoryAllocations['NL-01'].ratio = 0;
  starved.logistics.formationAllocations['TG-1'].ratio = 0;
  const starvedRate = engineeringDailyWork(starved, starved.engineeringProjects[0]);
  assert.ok(starvedRate > 0);
  assert.ok(starvedRate < normalRate);
});

test('R2-WP2 positive-condition damage remains traversable with reduced movement and throughput', () => {
  const pristine = projectState(100);
  const damaged = applyInfrastructureDamage(pristine, ROUTE_ID, 70, 'combat');
  const route = STRATEGIC_ROUTE_BY_ID[ROUTE_ID];
  const pristineRoute = pristine.routeStates[ROUTE_ID];
  const damagedRoute = damaged.routeStates[ROUTE_ID];
  const group = pristine.taskGroups['TG-1'];

  assert.equal(damagedRoute.status, 'damaged');
  assert.equal(routeIsTraversable(route, damagedRoute), true);
  assert.ok(movementProgressForDay(route, damagedRoute, group) < movementProgressForDay(route, pristineRoute, group));
  assert.ok(effectiveRouteSupplyCapacity(damaged, ROUTE_ID) > 0);
  assert.ok(effectiveRouteSupplyCapacity(damaged, ROUTE_ID) < effectiveRouteSupplyCapacity(pristine, ROUTE_ID));
});

test('R2-WP2 destroyed and explicitly blocked corridors remain impassable', () => {
  const route = STRATEGIC_ROUTE_BY_ID[ROUTE_ID];
  const destroyedState = applyInfrastructureDamage(projectState(30), ROUTE_ID, 40, 'combat');
  assert.equal(destroyedState.routeStates[ROUTE_ID].status, 'destroyed');
  assert.equal(routeIsTraversable(route, destroyedState.routeStates[ROUTE_ID]), false);
  assert.equal(effectiveRouteSupplyCapacity(destroyedState, ROUTE_ID), 0);

  const blocked = projectState(50);
  blocked.routeStates[ROUTE_ID].status = 'blocked';
  assert.equal(routeIsTraversable(route, blocked.routeStates[ROUTE_ID]), false);
  assert.equal(effectiveRouteSupplyCapacity(blocked, ROUTE_ID), 0);
});

test('R2-WP2 corridor construction produces a persistent capacity and movement upgrade', () => {
  let state = projectState(100);
  const route = STRATEGIC_ROUTE_BY_ID[ROUTE_ID];
  const beforeCapacity = routeEffectiveCapacity(route, state.routeStates[ROUTE_ID]);
  const beforeSupply = effectiveRouteSupplyCapacity(state, ROUTE_ID);
  const beforeMove = movementProgressForDay(route, state.routeStates[ROUTE_ID], state.taskGroups['TG-1']);

  state = startEngineeringUpgrade(state, ROUTE_ID, 'TG-1', 50);
  assert.equal(state.engineeringProjects[0].kind, 'upgrade');
  for (let day = 0; day < 60 && state.engineeringProjects[0].status === 'active'; day += 1) state = resolveEngineeringProjects(state);

  assert.equal(state.engineeringProjects[0].status, 'completed');
  assert.equal(state.routeStates[ROUTE_ID].upgradeLevel, 1);
  assert.ok(routeEffectiveCapacity(route, state.routeStates[ROUTE_ID]) > beforeCapacity);
  assert.ok(effectiveRouteSupplyCapacity(state, ROUTE_ID) > beforeSupply);
  assert.ok(movementProgressForDay(route, state.routeStates[ROUTE_ID], state.taskGroups['TG-1']) > beforeMove);
});

test('R2-WP2 legacy whole-formation engineering commitments normalise into operational support', () => {
  const legacy = projectState();
  legacy.taskGroups['TG-1'].status = 'engineering';
  legacy.engineeringProjects = [{
    id: 'ENG-LEGACY', routeId: ROUTE_ID, assignedTaskGroupId: 'TG-1', createdTurn: 1,
    startingCondition: 55, targetCondition: 100, progress: 20, allocation: 50,
    supplySpent: 5, status: 'active', returnStatus: 'ready'
  }];
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.taskGroups['TG-1'].status, 'ready');
  assert.equal(upgraded.engineeringProjects[0].kind, 'repair');
  assert.equal(upgraded.engineeringProjects[0].assignedTaskGroupId, 'TG-1');
  assert.equal(upgraded.engineeringProjects[0].allocation, 50);
  assert.equal(canIssueOperationalOrder(upgraded.taskGroups['TG-1']), true);
});

test('R2-WP2 current saves preserve active projects and route upgrades through normalisation', () => {
  let state = startEngineeringProject(projectState(), ROUTE_ID, 'TG-1', 25);
  state.routeStates[ROUTE_ID].upgradeLevel = 1;
  const result = inspectStoredCampaign(storageWith(state));
  assert.equal(result.ok, true);
  assert.equal(result.state.engineeringProjects[0].status, 'active');
  assert.equal(result.state.engineeringProjects[0].allocation, 25);
  assert.equal(result.state.routeStates[ROUTE_ID].upgradeLevel, 1);
});

test('R2-WP2 Infrastructure UI exposes civil-first repair, upgrades, support withdrawal and separate cancellation', () => {
  const source = read('src/components/InfrastructureCommand.tsx');
  assert.match(source, /local civil capacity/i);
  assert.match(source, /Military formation required<\/dt><dd>No/);
  assert.match(source, /label: 'Upgrade'/);
  assert.match(source, /Withdraw support/);
  assert.match(source, /Cancel project/);
  assert.match(source, /Parent combat availability/);
  assert.match(source, /Parent movement rate/);
  assert.match(source, /Only destroyed or explicitly blocked corridors are impassable/);
  assert.doesNotMatch(source, /Both actions tie up a formation/);
});
