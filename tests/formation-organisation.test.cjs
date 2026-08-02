const test = require('node:test');
const assert = require('node:assert/strict');
const {
  newGame,
  beginOperation,
  endTurn,
  loadGame,
  selectTaskGroup,
  selectTerritory
} = require('../.test-dist/engine.js');
const {
  dissolveFormation,
  mergeFormations,
  occupationRequirement,
  renameFormation,
  splitFormation,
  transferFormationResources
} = require('../.test-dist/formation-organisation.js');

function totalResources(state) {
  return Object.values(state.taskGroups).reduce((total, group) => ({
    personnel: total.personnel + group.personnel,
    maxPersonnel: total.maxPersonnel + group.maxPersonnel,
    functionalArmour: total.functionalArmour + group.functionalArmour,
    damagedArmour: total.damagedArmour + group.damagedArmour
  }), { personnel: 0, maxPersonnel: 0, functionalArmour: 0, damagedArmour: 0 });
}

function targetState(state, groupId, territoryId) {
  state = selectTaskGroup(state, groupId);
  state = selectTerritory(state, territoryId);
  return state;
}

test('a formation can be split into an exact two-person detachment without losing resources', () => {
  const state = newGame(2);
  const before = totalResources(state);
  const result = splitFormation(state, 'TG-1', {
    name: 'Two-person reconnaissance team',
    personnel: 2,
    functionalArmour: 2,
    damagedArmour: 0
  });
  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.state.taskGroups).length, 5);
  assert.deepEqual(totalResources(result.state), before);
  const created = Object.values(result.state.taskGroups).find(group => group.name === 'Two-person reconnaissance team');
  assert.equal(created.personnel, 2);
  assert.equal(created.functionalArmour, 2);
});

test('split rejects negative, zero and over-allocation without mutating state', () => {
  const state = newGame(2);
  for (const personnel of [-2, 0, 99999]) {
    const result = splitFormation(state, 'TG-1', {
      name: 'Invalid detachment', personnel, functionalArmour: 0, damagedArmour: 0
    });
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
  }
});

test('formations in the same province can transfer personnel and armour without resource loss', () => {
  const state = newGame(2);
  const before = totalResources(state);
  const result = transferFormationResources(state, 'TG-1', 'TG-2', {
    personnel: 200,
    functionalArmour: 150,
    damagedArmour: 25
  });
  assert.equal(result.ok, true);
  assert.deepEqual(totalResources(result.state), before);
  assert.equal(result.state.taskGroups['TG-1'].personnel, state.taskGroups['TG-1'].personnel - 200);
  assert.equal(result.state.taskGroups['TG-2'].personnel, state.taskGroups['TG-2'].personnel + 200);
});

test('resource transfers between different provinces are rejected', () => {
  const state = newGame(2);
  state.taskGroups['TG-2'].location = 'FR-01';
  const result = transferFormationResources(state, 'TG-1', 'TG-2', {
    personnel: 10, functionalArmour: 0, damagedArmour: 0
  });
  assert.equal(result.ok, false);
  assert.equal(result.state, state);
});

test('merging formations conserves personnel, establishment and armour', () => {
  const state = newGame(2);
  const before = totalResources(state);
  const result = mergeFormations(state, 'TG-1', 'TG-2', 'Merged assault group');
  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.state.taskGroups).length, 3);
  assert.deepEqual(totalResources(result.state), before);
  assert.equal(result.state.taskGroups['TG-1'].name, 'Merged assault group');
});

test('active formations cannot be reorganised', () => {
  let state = newGame(2);
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  assert.equal(renameFormation(state, 'TG-1', 'Busy group').ok, false);
  assert.equal(splitFormation(state, 'TG-1', { name: 'Split', personnel: 10, functionalArmour: 10, damagedArmour: 0 }).ok, false);
});

test('zero-person formations cannot receive orders or project unmanned armour power', () => {
  const state = newGame(2);
  state.taskGroups['TG-1'].personnel = 0;
  state.taskGroups['TG-1'].functionalArmour = 2000;
  state.taskGroups['TG-1'].damagedArmour = 500;
  const result = dissolveFormation(state, 'TG-1');
  assert.equal(result.ok, false);
});

test('deployable armour is limited by available personnel', () => {
  const state = newGame(2);
  state.taskGroups['TG-1'].personnel = 100;
  state.taskGroups['TG-1'].functionalArmour = 2000;
  const result = splitFormation(state, 'TG-1', {
    name: 'Armoured cadre', personnel: 50, functionalArmour: 500, damagedArmour: 0
  });
  assert.equal(result.ok, true);
});

test('formations with residual recovery establishment cannot be dissolved', () => {
  const state = newGame(2);
  state.taskGroups['TG-1'].personnel = 0;
  state.taskGroups['TG-1'].functionalArmour = 0;
  state.taskGroups['TG-1'].damagedArmour = 0;
  const result = dissolveFormation(state, 'TG-1');
  assert.equal(result.ok, false);
});

test('empty formations can be dissolved after resources are reassigned', () => {
  let state = newGame(2);
  state.taskGroups['TG-1'].personnel = 0;
  state.taskGroups['TG-1'].maxPersonnel = 0;
  state.taskGroups['TG-1'].functionalArmour = 0;
  state.taskGroups['TG-1'].damagedArmour = 0;
  const result = dissolveFormation(state, 'TG-1');
  assert.equal(result.ok, true);
  assert.equal(result.state.taskGroups['TG-1'], undefined);
});

test('occupation requirements rise with strategic and terrain demand', () => {
  assert.ok(occupationRequirement('CH-02') > occupationRequirement('LU-01'));
});

test('an undersized victorious formation captures but does not secure a province', () => {
  let state = newGame(2, 'story');
  const target = 'FR-01';
  state.taskGroups['TG-1'].personnel = 300;
  state.taskGroups['TG-1'].functionalArmour = 300;
  state.enemyFormations = Object.fromEntries(Object.entries(state.enemyFormations).filter(([, formation]) => formation.location !== target));
  state = targetState(state, 'TG-1', target);
  state = beginOperation(state);
  state = endTurn(state);

  assert.equal(state.territories[target].controller, 'player');
  assert.equal(state.territories[target].occupation, 'unsecured');
  assert.equal(state.territories[target].supplied, false);

  state.taskGroups['TG-2'].location = target;
  state.taskGroups['TG-2'].status = 'ready';
  state = endTurn(state);
  assert.equal(state.territories[target].occupation, 'contested');
  assert.equal(state.territories[target].capturedTurn, state.turn);
});

test('version 3 concurrent-operation saves migrate to version 5', () => {
  const storage = new Map();
  global.localStorage = {
    setItem: (key, value) => storage.set(key, value),
    getItem: key => storage.get(key) ?? null,
    removeItem: key => storage.delete(key),
    clear: () => storage.clear()
  };
  const prior = newGame(2);
  prior.version = 3;
  storage.set('future-conquest-slice-v0.3', JSON.stringify(prior));
  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(loaded.version, 5);
  assert.equal(Object.keys(loaded.taskGroups).length, 4);
  assert.ok(Array.isArray(loaded.mobilisations));
});
