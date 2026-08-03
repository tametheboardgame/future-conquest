const test = require('node:test');
const assert = require('node:assert/strict');
const {
  __testOnly,
  beginOperation,
  canIssueOperationalOrder,
  endTurn,
  issueMove,
  loadGame,
  newGame,
  saveGame,
  setGarrison
} = require('../.test-dist/engine.js');
const { TERRITORIES } = require('../.test-dist/data.js');

function makePlayerTerritory(state, id) {
  state.territories[id] = {
    controller: 'player',
    occupation: 'controlled',
    legitimacy: 55,
    resistance: 25,
    supplied: false,
    fortification: 0,
    capturedTurn: 1
  };
  return __testOnly.refreshSupply(state);
}

function targetState(state, groupId, territoryId) {
  state.selectedTaskGroupId = groupId;
  state.selectedTerritory = territoryId;
  state.targetTerritory = territoryId;
  return state;
}

function weakenDefenders(state, territoryId) {
  const defenders = Object.values(state.enemyFormations).filter(formation => formation.location === territoryId);
  assert.ok(defenders.length, `expected defenders in ${territoryId}`);
  for (const defender of defenders) {
    defender.personnel = 1;
    defender.armour = 0;
    defender.readiness = 15;
    defender.entrenchment = 0;
  }
}

function counterattackState({ success, retreat }) {
  let state = newGame(2, 'standard');
  state.turn = 4;
  const target = retreat ? 'BE-01' : state.portalTerritory;
  if (retreat) state = makePlayerTerritory(state, target);
  for (const [id, territory] of Object.entries(state.territories)) {
    if (id !== state.portalTerritory && id !== target) {
      territory.controller = 'enemy';
      territory.occupation = 'enemy';
      territory.supplied = false;
    }
  }
  state = __testOnly.refreshSupply(state);
  const group = state.taskGroups['TG-1'];
  group.location = target;
  group.personnel = success ? 120 : 2600;
  group.functionalArmour = success ? 0 : 2500;
  group.status = 'ready';
  if (!retreat) {
    state.taskGroups = { 'TG-1': group };
    state.selectedTaskGroupId = 'TG-1';
  }
  const origin = TERRITORIES[target].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(origin, 'counterattack origin must exist');
  state.enemyFormations = {
    'EF-TEST': {
      id: 'EF-TEST',
      name: 'Test Counterattack Formation',
      location: origin,
      personnel: success ? 12000 : 300,
      armour: success ? 1200 : 0,
      readiness: success ? 100 : 20,
      entrenchment: 0
    }
  };
  return { state, target };
}

function installStorage() {
  const storage = new Map();
  global.localStorage = {
    setItem: (key, value) => storage.set(key, value),
    getItem: key => storage.get(key) ?? null,
    removeItem: key => storage.delete(key),
    clear: () => storage.clear()
  };
  return storage;
}

test('difficulty settings create progressively stronger enemy forces', () => {
  const total = difficulty => Object.values(newGame(2, difficulty).enemyFormations).reduce((sum, formation) => sum + formation.personnel, 0);
  assert.ok(total('story') < total('standard'));
  assert.ok(total('standard') < total('hard'));
});

test('recovering formations cannot move, attack or enter garrison duty', () => {
  let state = newGame(2);
  state.taskGroups['TG-1'].status = 'recovering';
  assert.equal(canIssueOperationalOrder(state.taskGroups['TG-1']), false);

  state = makePlayerTerritory(state, 'BE-01');
  state = targetState(state, 'TG-1', 'BE-01');
  assert.deepEqual(issueMove(state), state);
  assert.deepEqual(setGarrison(state), state);

  state.territories['BE-01'].controller = 'enemy';
  assert.deepEqual(beginOperation(state), state);
});

test('ready formations can toggle garrison duty', () => {
  const state = newGame(2);
  const garrisoned = setGarrison(state);
  assert.equal(garrisoned.taskGroups['TG-1'].status, 'garrison');
  const released = setGarrison(garrisoned);
  assert.equal(released.taskGroups['TG-1'].status, 'ready');
});

test('lowland movement completes in one resolved day', () => {
  let state = makePlayerTerritory(newGame(2), 'BE-01');
  state = targetState(state, 'TG-1', 'BE-01');
  state = issueMove(state);
  assert.equal(state.taskGroups['TG-1'].status, 'moving');
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'BE-01');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
  assert.equal(state.taskGroups['TG-1'].order, undefined);
});

test('the selected Alpine route requires more than one resolved day', () => {
  let state = makePlayerTerritory(newGame(12), 'CH-02');
  state = targetState(state, 'TG-1', 'CH-02');
  state = issueMove(state);
  assert.ok(state.taskGroups['TG-1'].order.routeId);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-01');
  assert.equal(state.taskGroups['TG-1'].status, 'moving');
  assert.equal(state.taskGroups['TG-1'].order.progress, 50);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-02');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
});

test('two task groups can launch different operations before the same day resolves', () => {
  let state = newGame(2);
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = beginOperation(state);

  const operations = Object.values(state.operations);
  assert.equal(operations.length, 2);
  assert.deepEqual(new Set(operations.map(operation => operation.target)), new Set(['FR-01', 'BE-01']));
  assert.equal(state.taskGroups['TG-1'].status, 'attacking');
  assert.equal(state.taskGroups['TG-2'].status, 'attacking');
});

test('multiple task groups can join the same operation', () => {
  let state = newGame(2);
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'FR-01');
  state = beginOperation(state);

  const operations = Object.values(state.operations);
  assert.equal(operations.length, 1);
  assert.deepEqual(new Set(operations[0].participantGroupIds), new Set(['TG-1', 'TG-2']));
  assert.equal(state.taskGroups['TG-1'].order.operationId, operations[0].id);
  assert.equal(state.taskGroups['TG-2'].order.operationId, operations[0].id);
});

test('two separate operations can both capture territory on the same resolved day', () => {
  let state = newGame(2);
  weakenDefenders(state, 'FR-01');
  weakenDefenders(state, 'BE-01');
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = beginOperation(state);
  state = endTurn(state);

  assert.equal(state.territories['FR-01'].controller, 'player');
  assert.equal(state.territories['BE-01'].controller, 'player');
  assert.equal(state.taskGroups['TG-1'].location, 'FR-01');
  assert.equal(state.taskGroups['TG-2'].location, 'BE-01');
  assert.equal(Object.keys(state.operations).length, 0);
});

test('movement resolves while another task group is fighting', () => {
  let state = makePlayerTerritory(newGame(2), 'BE-01');
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = issueMove(state);
  state = endTurn(state);

  assert.equal(state.taskGroups['TG-2'].location, 'BE-01');
  assert.equal(state.taskGroups['TG-2'].status, 'ready');
  assert.equal(Object.keys(state.operations).length, 1);
});

test('a defeated enemy formation yields the territory', () => {
  let state = newGame(2);
  const target = 'FR-01';
  weakenDefenders(state, target);
  state = targetState(state, 'TG-1', target);
  state = beginOperation(state);
  state = endTurn(state);
  assert.equal(state.territories[target].controller, 'player');
  assert.equal(state.taskGroups['TG-1'].location, target);
  assert.equal(Object.keys(state.operations).length, 0);
});

test('an eight-day offensive withdraws every participating task group to its own origin', () => {
  let state = newGame(2);
  const target = 'FR-03';
  state = targetState(state, 'TG-1', target);
  state = beginOperation(state);
  state = targetState(state, 'TG-2', target);
  state = beginOperation(state);
  const operation = Object.values(state.operations)[0];
  operation.days = 7;
  operation.progress = -69;
  for (const formation of Object.values(state.enemyFormations)) {
    if (formation.location === target) {
      formation.personnel = 50000;
      formation.armour = 5000;
      formation.readiness = 100;
    }
  }
  state = endTurn(state);
  assert.equal(Object.keys(state.operations).length, 0);
  assert.equal(state.taskGroups['TG-1'].location, 'FR-02');
  assert.equal(state.taskGroups['TG-2'].location, 'FR-02');
  assert.match(state.events[0].text, /abandoned the operation/);
});

test('a successful counterattack retreats formations to a supplied neighbour', () => {
  const { state, target } = counterattackState({ success: true, retreat: true });
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.territories[target].controller, 'enemy');
  assert.equal(resolved.taskGroups['TG-1'].location, state.portalTerritory);
  assert.equal(resolved.taskGroups['TG-1'].status, 'recovering');
});

test('a failed counterattack leaves the territory controlled', () => {
  const { state, target } = counterattackState({ success: false, retreat: true });
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.territories[target].controller, 'player');
  assert.match(resolved.events[0].text, /repelled an enemy counterattack/);
});

test('encircled formations are removed rather than left in enemy territory', () => {
  const { state, target } = counterattackState({ success: true, retreat: false });
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.territories[target].controller, 'enemy');
  assert.equal(Object.keys(resolved.taskGroups).length, 0);
  assert.equal(resolved.selectedTaskGroupId, '');
  assert.match(resolved.events[0].text, /encircled and ceased to exist/);
});

test('counterattack retreat removes a task group from its active operation', () => {
  let state = newGame(2);
  state.turn = 4;
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  const operationId = state.taskGroups['TG-1'].order.operationId;
  const origin = state.taskGroups['TG-1'].location;
  const enemyOrigin = TERRITORIES[origin].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(enemyOrigin);
  state.enemyFormations = {
    'EF-TEST': { id: 'EF-TEST', name: 'Test', location: enemyOrigin, personnel: 50000, armour: 5000, readiness: 100, entrenchment: 0 }
  };
  state.taskGroups['TG-1'].personnel = 120;
  state.taskGroups['TG-1'].functionalArmour = 0;
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.operations[operationId], undefined);
});

test('isolated formations suffer attrition when local supply is exhausted', () => {
  let state = newGame(2);
  state.territories['CH-02'] = {
    controller: 'player', occupation: 'controlled', legitimacy: 50, resistance: 30,
    supplied: false, fortification: 0, capturedTurn: 1
  };
  state.taskGroups['TG-1'].location = 'CH-02';
  state.taskGroups['TG-1'].supply = 0;
  state = __testOnly.refreshSupply(state);
  const before = state.taskGroups['TG-1'].personnel;
  state = endTurn(state);
  assert.equal(state.territories['CH-02'].supplied, false);
  assert.ok(state.taskGroups['TG-1'].personnel < before);
  assert.match(state.events[0].text, /isolated/);
});

test('save and load preserves multiple active operations', () => {
  installStorage();
  let state = newGame(2, 'hard');
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = beginOperation(state);
  saveGame(state);
  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(loaded.difficulty, 'hard');
  assert.equal(Object.keys(loaded.operations).length, 2);
  assert.equal(loaded.taskGroups['TG-1'].order.type, 'attack');
  assert.equal(loaded.taskGroups['TG-2'].order.type, 'attack');
});

test('v0.2 saves migrate a single battle into an operation', () => {
  const storage = installStorage();
  let state = newGame(2, 'standard');
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  const operation = Object.values(state.operations)[0];
  const legacy = {
    ...state,
    version: 2,
    battle: {
      id: 'B-LEGACY',
      attackerGroupId: 'TG-1',
      origin: operation.origins['TG-1'],
      target: operation.target,
      progress: operation.progress,
      days: operation.days,
      enemyFormationIds: operation.enemyFormationIds,
      enemyPower: operation.enemyPower
    }
  };
  delete legacy.operations;
  delete legacy.taskGroups['TG-1'].order.operationId;
  storage.set('future-conquest-slice-v0.2', JSON.stringify(legacy));

  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(loaded.version, 14);
  assert.equal(Object.keys(loaded.operations).length, 1);
  assert.ok(loaded.taskGroups['TG-1'].order.operationId);
});

test('the occupation tutorial cannot be completed by garrisoning the portal', () => {
  const state = newGame(119, 'standard', true);
  state.tutorial.step = 2;
  const garrisoned = setGarrison(state);
  assert.equal(garrisoned.taskGroups[garrisoned.selectedTaskGroupId].status, 'garrison');
  assert.equal(garrisoned.tutorial.step, 2);
});
