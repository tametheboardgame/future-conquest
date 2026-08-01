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

test('mountain movement requires more than one resolved day', () => {
  let state = makePlayerTerritory(newGame(12), 'CH-02');
  state = targetState(state, 'TG-1', 'CH-02');
  state = issueMove(state);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-01');
  assert.equal(state.taskGroups['TG-1'].status, 'moving');
  assert.equal(state.taskGroups['TG-1'].order.progress, 58);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-02');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
});

test('a defeated enemy formation yields the territory', () => {
  let state = newGame(2);
  const target = 'FR-01';
  const defender = Object.values(state.enemyFormations).find(formation => formation.location === target);
  assert.ok(defender);
  defender.personnel = 1;
  defender.armour = 0;
  defender.readiness = 15;
  defender.entrenchment = 0;
  state = targetState(state, 'TG-1', target);
  state = beginOperation(state);
  state = endTurn(state);
  assert.equal(state.territories[target].controller, 'player');
  assert.equal(state.taskGroups['TG-1'].location, target);
  assert.equal(state.battle, null);
});

test('an eight-day offensive withdraws to its origin', () => {
  let state = newGame(2);
  const target = 'FR-03';
  state = targetState(state, 'TG-1', target);
  state = beginOperation(state);
  state.battle.days = 7;
  state.battle.progress = -69;
  for (const formation of Object.values(state.enemyFormations)) {
    if (formation.location === target) {
      formation.personnel = 50000;
      formation.armour = 5000;
      formation.readiness = 100;
    }
  }
  const origin = state.battle.origin;
  state = endTurn(state);
  assert.equal(state.battle, null);
  assert.equal(state.taskGroups['TG-1'].location, origin);
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

test('save and load preserves an active battle', () => {
  const storage = new Map();
  global.localStorage = {
    setItem: (key, value) => storage.set(key, value),
    getItem: key => storage.get(key) ?? null,
    removeItem: key => storage.delete(key),
    clear: () => storage.clear()
  };
  let state = newGame(2, 'hard');
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  saveGame(state);
  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(loaded.difficulty, 'hard');
  assert.equal(loaded.battle.target, 'FR-01');
  assert.equal(loaded.taskGroups['TG-1'].order.type, 'attack');
});
