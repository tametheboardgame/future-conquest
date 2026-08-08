const test = require('node:test');
const assert = require('node:assert/strict');
const { __testOnly, beginOperation, canIssueOperationalOrder, endTurn, loadGame, newGame, setGarrison } = require('../.test-dist/engine.js');
const {
  canReorganiseFormation,
  dissolveFormation,
  formationCapability,
  formationTotals,
  mergeFormations,
  occupationRequirement,
  proportionalSplitArmour,
  reorganisationBlockReason,
  renameFormation,
  splitFormation,
  splitFormationValidation,
  suggestSplitFormationName,
  transferFormationResources
} = require('../.test-dist/formation-organisation.js');

function targetState(state, groupId, territoryId) {
  state.selectedTaskGroupId = groupId;
  state.selectedTerritory = territoryId;
  state.targetTerritory = territoryId;
  return state;
}

test('a formation can be split into an exact two-person detachment without losing resources', () => {
  const state = newGame(2);
  const before = formationTotals(state);
  const next = splitFormation(state, {
    sourceId: 'TG-1',
    name: 'Needle Detachment',
    personnel: 2,
    functionalArmour: 1,
    damagedArmour: 0
  });

  assert.notEqual(next, state);
  assert.equal(Object.keys(next.taskGroups).length, 5);
  const detachment = next.taskGroups[next.selectedTaskGroupId];
  assert.equal(detachment.personnel, 2);
  assert.equal(detachment.functionalArmour, 1);
  assert.equal(formationCapability(detachment.personnel).key, 'detachment');
  assert.deepEqual(formationTotals(next), before);
});

test('split rejects negative, zero and over-allocation without mutating state', () => {
  const state = newGame(2);
  assert.equal(splitFormation(state, { sourceId: 'TG-1', name: 'Invalid', personnel: 0, functionalArmour: 0, damagedArmour: 0 }), state);
  assert.equal(splitFormation(state, { sourceId: 'TG-1', name: 'Invalid', personnel: 2600, functionalArmour: 0, damagedArmour: 0 }), state);
  assert.equal(splitFormation(state, { sourceId: 'TG-1', name: 'Invalid', personnel: 10, functionalArmour: 99999, damagedArmour: 0 }), state);
});

test('split armour defaults scale with personnel and never assign more working suits than operators', () => {
  const state = newGame(21);
  const source = state.taskGroups['TG-1'];
  source.personnel = 2400;
  source.functionalArmour = 2742;
  source.damagedArmour = 108;

  const allocation = proportionalSplitArmour(source, 50);
  assert.equal(allocation.functionalArmour, 50);
  assert.ok(allocation.damagedArmour <= 3);
  assert.ok(allocation.functionalArmour < Math.floor(source.functionalArmour / 2));
});

test('a newly split formation cannot be assigned more functional armour than personnel', () => {
  const state = newGame(22);
  const input = {
    sourceId: 'TG-1',
    name: 'Small Guard',
    personnel: 50,
    functionalArmour: 51,
    damagedArmour: 0
  };
  assert.match(splitFormationValidation(state, input), /more functional powered-armour suits than personnel/i);
  assert.equal(splitFormation(state, input), state);
});

test('automatic split names increment from the source formation and remain unique', () => {
  let state = newGame(23);
  const source = Object.values(state.taskGroups).find(group => group.name === 'Spearhead Group');
  assert.ok(source);
  assert.equal(suggestSplitFormationName(state, source.id), 'Spearhead Group 2');

  const allocation = proportionalSplitArmour(source, 100);
  state = splitFormation(state, {
    sourceId: source.id,
    name: '',
    personnel: 100,
    functionalArmour: allocation.functionalArmour,
    damagedArmour: allocation.damagedArmour
  });
  assert.equal(state.taskGroups[state.selectedTaskGroupId].name, 'Spearhead Group 2');
  assert.equal(suggestSplitFormationName(state, state.selectedTaskGroupId), 'Spearhead Group 3');
});

test('explicit duplicate formation names are rejected with a specific validation reason', () => {
  const state = newGame(24);
  const input = {
    sourceId: 'TG-1',
    name: state.taskGroups['TG-2'].name,
    personnel: 100,
    functionalArmour: 50,
    damagedArmour: 0
  };
  assert.match(splitFormationValidation(state, input), /already exists/i);
  assert.equal(splitFormation(state, input), state);
});

test('engineering and interdiction commitments explain why reorganisation is blocked', () => {
  const state = newGame(25);
  state.taskGroups['TG-1'].status = 'engineering';
  state.taskGroups['TG-2'].status = 'interdicting';
  assert.match(reorganisationBlockReason(state.taskGroups['TG-1']), /engineering project/i);
  assert.match(reorganisationBlockReason(state.taskGroups['TG-2']), /interdiction mission/i);
  assert.match(splitFormationValidation(state, {
    sourceId: 'TG-1', name: '', personnel: 100, functionalArmour: 50, damagedArmour: 0
  }), /cancel the project/i);
});

test('formations in the same province can transfer personnel and armour without resource loss', () => {
  const state = newGame(2);
  const before = formationTotals(state);
  const next = transferFormationResources(state, {
    sourceId: 'TG-1',
    targetId: 'TG-2',
    personnel: 350,
    functionalArmour: 125,
    damagedArmour: 25
  });

  assert.equal(next.taskGroups['TG-1'].personnel, state.taskGroups['TG-1'].personnel - 350);
  assert.equal(next.taskGroups['TG-2'].personnel, state.taskGroups['TG-2'].personnel + 350);
  assert.deepEqual(formationTotals(next), before);
});

test('resource transfers between different provinces are rejected', () => {
  const state = newGame(2);
  state.taskGroups['TG-2'].location = 'BE-01';
  const next = transferFormationResources(state, {
    sourceId: 'TG-1', targetId: 'TG-2', personnel: 10, functionalArmour: 0, damagedArmour: 0
  });
  assert.equal(next, state);
});

test('merging formations conserves personnel, establishment and armour', () => {
  const state = newGame(2);
  const before = formationTotals(state);
  const next = mergeFormations(state, 'TG-1', 'TG-2', 'First Expeditionary Group');

  assert.equal(next.taskGroups['TG-2'], undefined);
  assert.equal(next.taskGroups['TG-1'].name, 'First Expeditionary Group');
  assert.deepEqual(formationTotals(next), before);
});

test('active formations cannot be reorganised', () => {
  let state = newGame(2);
  state = targetState(state, 'TG-1', 'FR-01');
  state = beginOperation(state);
  assert.equal(canReorganiseFormation(state.taskGroups['TG-1']), false);
  assert.equal(renameFormation(state, 'TG-1', 'Not Allowed'), state);
  assert.equal(splitFormation(state, { sourceId: 'TG-1', name: 'Not Allowed', personnel: 2, functionalArmour: 0, damagedArmour: 0 }), state);
});

test('zero-person formations cannot receive orders or project unmanned armour power', () => {
  let state = newGame(2);
  state = transferFormationResources(state, {
    sourceId: 'TG-1',
    targetId: 'TG-2',
    personnel: state.taskGroups['TG-1'].personnel,
    functionalArmour: 0,
    damagedArmour: 0
  });
  const empty = state.taskGroups['TG-1'];
  assert.equal(empty.personnel, 0);
  assert.ok(empty.functionalArmour > 0);
  assert.equal(canIssueOperationalOrder(empty), false);
  assert.equal(__testOnly.deployableArmour(empty), 0);
  assert.equal(setGarrison(state), state);

  state.selectedTaskGroupId = 'TG-1';
  state.targetTerritory = 'FR-01';
  assert.equal(beginOperation(state), state);
});

test('deployable armour is limited by available personnel', () => {
  const state = newGame(2);
  const group = state.taskGroups['TG-1'];
  group.personnel = 2;
  group.functionalArmour = 2500;
  assert.equal(__testOnly.deployableArmour(group), 2);
});

test('formations with residual recovery establishment cannot be dissolved', () => {
  const state = newGame(2);
  state.taskGroups['TG-1'].personnel = 0;
  state.taskGroups['TG-1'].functionalArmour = 0;
  state.taskGroups['TG-1'].damagedArmour = 0;
  assert.equal(dissolveFormation(state, 'TG-1'), state);
});

test('empty formations can be dissolved after resources are reassigned', () => {
  let state = newGame(2);
  state = transferFormationResources(state, {
    sourceId: 'TG-1',
    targetId: 'TG-2',
    personnel: state.taskGroups['TG-1'].personnel,
    functionalArmour: state.taskGroups['TG-1'].functionalArmour,
    damagedArmour: state.taskGroups['TG-1'].damagedArmour
  });
  const next = dissolveFormation(state, 'TG-1');
  assert.equal(next.taskGroups['TG-1'], undefined);
  assert.equal(Object.keys(next.taskGroups).length, 3);
});

test('occupation requirements rise with strategic and terrain demand', () => {
  assert.ok(occupationRequirement('CH-02') > occupationRequirement('BE-01'));
  assert.equal(formationCapability(2).canOccupy, false);
  assert.equal(formationCapability(2500).canOccupy, true);
});

test('an undersized victorious formation captures but does not secure a province', () => {
  let state = newGame(2);
  const target = 'FR-01';
  state.taskGroups['TG-1'].personnel = 40;
  state.taskGroups['TG-1'].maxPersonnel = 40;
  for (const formation of Object.values(state.enemyFormations)) {
    if (formation.location === target) formation.personnel = 0;
  }
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

test('version 3 concurrent-operation saves migrate to version 9', () => {
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
  assert.equal(loaded.version, 14);
  assert.equal(Object.keys(loaded.taskGroups).length, 4);
  assert.ok(Array.isArray(loaded.mobilisations));
});
