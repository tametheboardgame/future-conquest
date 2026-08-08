const test = require('node:test');
const assert = require('node:assert/strict');
const { TERRITORIES } = require('../.test-dist/data.js');
const { newGame, selectTaskGroup, selectTerritory, beginOperation, endTurn, issueMove, setGarrison, saveGame, loadGame, __testOnly } = require('../.test-dist/engine.js');

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

function targetState(state, groupId, territoryId) {
  state = selectTaskGroup(state, groupId);
  state = selectTerritory(state, territoryId);
  return state;
}

test('difficulty settings create progressively stronger enemy forces', () => {
  const story = newGame(1, 'story');
  const standard = newGame(1, 'standard');
  const hard = newGame(1, 'hard');
  const strength = state => Object.values(state.enemyFormations).reduce((sum, formation) => sum + formation.personnel + formation.armour * 4, 0);
  assert.ok(strength(story) < strength(standard));
  assert.ok(strength(standard) < strength(hard));
});

test('recovering formations cannot move, attack or enter garrison duty', () => {
  let state = newGame(2);
  state.taskGroups['TG-1'].status = 'recovering';
  state = targetState(state, 'TG-1', 'FR-01');
  assert.equal(issueMove(state), state);
  assert.equal(beginOperation(state), state);
  assert.equal(setGarrison(state), state);
});

test('ready formations can toggle garrison duty', () => {
  const state = newGame(2);
  const next = setGarrison(state);
  assert.equal(next.taskGroups['TG-1'].status, 'garrison');
  const released = setGarrison(next);
  assert.equal(released.taskGroups['TG-1'].status, 'ready');
});

test('lowland movement completes in one resolved day', () => {
  let state = newGame(2);
  state.territories['FR-01'].controller = 'player';
  state.territories['FR-01'].occupation = 'controlled';
  state = targetState(state, 'TG-1', 'FR-01');
  state = issueMove(state);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'FR-01');
});

test('the selected Alpine route requires more than one resolved day', () => {
  let state = newGame(2);
  state.territories['CH-02'].controller = 'player';
  state.territories['CH-02'].occupation = 'controlled';
  state.taskGroups['TG-1'].location = 'FR-05';
  state = targetState(state, 'TG-1', 'CH-02');
  state = issueMove(state, 'R-LYON-GOTTHARD');
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'FR-05');
  assert.equal(state.taskGroups['TG-1'].status, 'moving');
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-02');
});

test('two task groups can launch different operations before the same day resolves', () => {
  let state = newGame(2);
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = beginOperation(state);
  assert.equal(Object.keys(state.operations).length, 2);
});

test('multiple task groups can join the same operation', () => {
  let state = newGame(2);
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'FR-01');
  state = beginOperation(state);
  const operation = Object.values(state.operations)[0];
  assert.deepEqual(operation.participantGroupIds.sort(), ['TG-1', 'TG-2']);
});

test('two separate operations can both capture territory on the same resolved day', () => {
  let state = newGame(2);
  for (const formation of Object.values(state.enemyFormations)) formation.personnel = 0;
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = beginOperation(state);
  state = endTurn(state);
  assert.equal(state.territories['FR-01'].controller, 'player');
  assert.equal(state.territories['BE-01'].controller, 'player');
});

test('movement resolves while another task group is fighting', () => {
  let state = newGame(2);
  state.territories['BE-01'].controller = 'player';
  state.territories['BE-01'].occupation = 'controlled';
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'BE-01');
  state = issueMove(state);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-2'].location, 'BE-01');
  assert.ok(Object.keys(state.operations).length >= 1);
});

test('a defeated enemy formation yields the territory', () => {
  let state = newGame(2);
  for (const formation of Object.values(state.enemyFormations)) {
    if (formation.location === 'FR-01') formation.personnel = 0;
  }
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = endTurn(state);
  assert.equal(state.territories['FR-01'].controller, 'player');
});

test('an eight-day offensive withdraws every participating task group to its own origin', () => {
  let state = newGame(2, 'hard');
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  state = targetState(state, 'TG-2', 'FR-01');
  state = beginOperation(state);
  const origins = {
    'TG-1': state.operations[Object.keys(state.operations)[0]].origins['TG-1'],
    'TG-2': state.operations[Object.keys(state.operations)[0]].origins['TG-2']
  };
  for (const operation of Object.values(state.operations)) operation.days = 7;
  for (const formation of Object.values(state.enemyFormations)) {
    if (formation.location === 'FR-01') formation.personnel = 50000;
  }
  state = endTurn(state);
  assert.equal(Object.keys(state.operations).length, 0);
  assert.equal(state.taskGroups['TG-1'].location, origins['TG-1']);
  assert.equal(state.taskGroups['TG-2'].location, origins['TG-2']);
});

test('a successful counterattack retreats formations to a supplied neighbour', () => {
  let state = newGame(2);
  state.turn = 5;
  state.territories['FR-01'] = { controller: 'player', occupation: 'controlled', legitimacy: 60, resistance: 20, supplied: true, fortification: 0, capturedTurn: 2 };
  state.taskGroups['TG-1'].location = 'FR-01';
  state.taskGroups['TG-1'].personnel = 50;
  state.taskGroups['TG-1'].functionalArmour = 0;
  const origin = TERRITORIES['FR-01'].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(origin);
  state.enemyFormations = {
    'EF-TEST': { id: 'EF-TEST', name: 'Test', location: origin, personnel: 50000, armour: 5000, readiness: 100, entrenchment: 0 }
  };
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.territories['FR-01'].controller, 'enemy');
  assert.notEqual(resolved.taskGroups['TG-1']?.location, 'FR-01');
});

test('a failed counterattack leaves the territory controlled', () => {
  let state = newGame(2);
  state.turn = 5;
  state.territories['FR-01'] = { controller: 'player', occupation: 'controlled', legitimacy: 60, resistance: 20, supplied: true, fortification: 20, capturedTurn: 2 };
  state.taskGroups['TG-1'].location = 'FR-01';
  const origin = TERRITORIES['FR-01'].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(origin);
  state.enemyFormations = {
    'EF-TEST': { id: 'EF-TEST', name: 'Test', location: origin, personnel: 300, armour: 0, readiness: 30, entrenchment: 0 }
  };
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.territories['FR-01'].controller, 'player');
});

test('encircled formations are removed rather than left in enemy territory', () => {
  let state = newGame(2);
  state.turn = 5;
  for (const territory of Object.values(state.territories)) {
    territory.controller = 'enemy';
    territory.occupation = 'enemy';
    territory.supplied = false;
  }
  state.territories['FR-01'] = { controller: 'player', occupation: 'controlled', legitimacy: 60, resistance: 20, supplied: false, fortification: 0, capturedTurn: 2 };
  state.taskGroups['TG-1'].location = 'FR-01';
  state.taskGroups['TG-1'].personnel = 20;
  state.taskGroups['TG-1'].functionalArmour = 0;
  const origin = TERRITORIES['FR-01'].neighbours[0];
  state.enemyFormations = {
    'EF-TEST': { id: 'EF-TEST', name: 'Test', location: origin, personnel: 50000, armour: 5000, readiness: 100, entrenchment: 0 }
  };
  const resolved = __testOnly.resolveCounterattack(state);
  assert.equal(resolved.taskGroups['TG-1'], undefined);
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

test('formations suffer attrition only after carried stocks are exhausted and local replenishment is inadequate', () => {
  let state = newGame(2);
  state.territories['CH-02'] = {
    controller: 'player', occupation: 'unsecured', legitimacy: 0, resistance: 100,
    supplied: false, fortification: 0, capturedTurn: 1
  };
  state.taskGroups['TG-1'].location = 'CH-02';
  state.taskGroups['TG-1'].supply = 0;
  state = __testOnly.refreshSupply(state);
  const allocation = state.logistics.formationAllocations['TG-1'];
  assert.ok(allocation.ratio < 15, 'scenario must provide less than 15% of daily demand');
  const before = state.taskGroups['TG-1'].personnel;
  state = endTurn(state);
  assert.equal(state.territories['CH-02'].supplied, false);
  assert.ok(state.taskGroups['TG-1'].personnel < before);
  assert.ok(state.events.some(event => /exhausted carried stocks|attrition/i.test(event.text)));
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
  assert.equal(Object.keys(loaded.operations).length, 2);
});

test('v0.2 saves migrate a single battle into an operation', () => {
  const storage = installStorage();
  const state = newGame(2);
  const legacy = structuredClone(state);
  legacy.version = 2;
  legacy.battle = {
    id: 'B1', attackerGroupId: 'TG-1', origin: state.portalTerritory, target: 'FR-01',
    progress: 25, days: 2, enemyFormationIds: [], enemyPower: 3
  };
  legacy.taskGroups['TG-1'].status = 'attacking';
  legacy.taskGroups['TG-1'].order = { type: 'attack', target: 'FR-01', progress: 25, days: 2 };
  delete legacy.operations;
  storage.set('future-conquest-slice-v0.2', JSON.stringify(legacy));
  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(Object.keys(loaded.operations).length, 1);
  assert.ok(loaded.taskGroups['TG-1'].order.operationId);
});

test('the occupation tutorial cannot be completed by garrisoning the portal', () => {
  let state = newGame(2, 'standard', true);
  state.tutorial.step = 2;
  const next = setGarrison(state);
  assert.equal(next.tutorial.step, 2);
});
