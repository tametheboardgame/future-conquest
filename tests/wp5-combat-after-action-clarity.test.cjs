const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  __testOnly,
  beginOperation,
  loadGame,
  newGame,
  saveGame,
  selectTaskGroup,
  selectTerritory
} = require('../.test-dist/engine.js');
const { estimateCombatFigure } = require('../.test-dist/combat-reports.js');
const { getAdjacentOrderTargets } = require('../.test-dist/order-targeting.js');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

function beginReachableOperation(seed = 1501) {
  let state = newGame(seed, 'standard', false);
  const target = getAdjacentOrderTargets(state).find(id => state.territories[id].controller === 'enemy');
  assert.ok(target, 'expected an adjacent route-connected enemy target');
  state = selectTerritory(state, target);
  state = beginOperation(state);
  const operation = Object.values(state.operations)[0];
  assert.ok(operation, 'operation should begin');
  return { state, target, operationId: operation.id };
}

test('new campaigns initialise an empty after-action archive', () => {
  const state = newGame(1500, 'standard', false);
  assert.deepEqual(state.combatReports, []);
});

test('an offensive operation records the strength originally committed', () => {
  const { state, operationId } = beginReachableOperation(1501);
  const operation = state.operations[operationId];
  assert.ok(operation.combat);
  assert.equal(operation.combat.committedPersonnel, state.taskGroups['TG-1'].personnel);
  assert.equal(operation.combat.committedFunctionalArmour, state.taskGroups['TG-1'].functionalArmour);
  assert.equal(operation.combat.playerKilled, 0);
  assert.equal(operation.combat.playerWounded, 0);
});

test('a formation joining later is added to the cumulative committed-strength baseline', () => {
  let { state, target, operationId } = beginReachableOperation(1502);
  const firstCommitment = state.operations[operationId].combat.committedPersonnel;
  state = selectTaskGroup(state, 'TG-2');
  state = selectTerritory(state, target);
  state = beginOperation(state);
  const operation = state.operations[operationId];
  assert.equal(operation.participantGroupIds.length, 2);
  assert.equal(operation.combat.committedPersonnel, firstCommitment + state.taskGroups['TG-2'].personnel);
});

test('a concluded offensive creates a structured after-action report with contextual losses', () => {
  let { state, target, operationId } = beginReachableOperation(1503);
  state.operations[operationId].progress = 150;
  state = __testOnly.resolveOperations(state);
  const report = state.combatReports[0];
  assert.ok(report);
  assert.equal(report.kind, 'offensive');
  assert.equal(report.outcome, 'victory');
  assert.equal(report.territoryId, target);
  assert.ok(report.playerStartingPersonnel > report.playerEndingPersonnel);
  assert.ok(report.playerKilled > 0);
  assert.ok(report.playerWounded > 0);
  assert.equal(report.playerStartingPersonnel - report.playerEndingPersonnel, report.playerKilled + report.playerWounded);
  assert.ok(report.enemyPersonnelLosses > 0);
  assert.ok(report.note.length > 20);
});

test('forced enemy counterattack records either a defended or lost-territory after-action report', () => {
  let state = newGame(1504, 'standard', false);
  state.turn = 4;
  state = __testOnly.resolveCounterattack(state);
  const report = state.combatReports[0];
  assert.ok(report, 'counterattack should generate an after-action report');
  assert.equal(report.kind, 'counterattack');
  assert.ok(['repelled', 'territory-lost'].includes(report.outcome));
  assert.ok(report.playerStartingPersonnel >= report.playerEndingPersonnel);
  assert.ok(report.playerKilled + report.playerWounded + report.playerOtherLosses >= 0);
  assert.equal(report.durationDays, 1);
});

test('enemy after-action figures are rounded assessments rather than exact values', () => {
  assert.equal(estimateCombatFigure(1237), 1225);
  assert.equal(estimateCombatFigure(247), 250);
  assert.equal(estimateCombatFigure(0), 0);
});

test('after-action archive survives normal save and load', () => {
  const originalStorage = global.localStorage;
  global.localStorage = memoryStorage();
  try {
    let { state, operationId } = beginReachableOperation(1505);
    state.operations[operationId].progress = 150;
    state = __testOnly.resolveOperations(state);
    assert.ok(state.combatReports.length > 0);
    saveGame(state);
    const loaded = loadGame();
    assert.ok(loaded);
    assert.equal(loaded.combatReports[0].id, state.combatReports[0].id);
    assert.equal(loaded.combatReports[0].playerStartingPersonnel, state.combatReports[0].playerStartingPersonnel);
  } finally {
    if (originalStorage === undefined) delete global.localStorage;
    else global.localStorage = originalStorage;
  }
});

test('WP5 UI explains casualty categories and exposes battle reports from Operations', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const component = fs.readFileSync('src/components/CombatReports.tsx', 'utf8');
  const css = fs.readFileSync('src/combat-reports.css', 'utf8');
  assert.match(app, /<CombatReportsPanel state=\{state\}/);
  assert.match(app, /<CombatAfterActionAlert report=\{latestCombatReport\}/);
  assert.match(component, /Killed are permanent losses/);
  assert.match(component, /Wounded leave active strength/);
  assert.match(component, /Returned to duty/);
  assert.match(component, /Captured \/ scattered/);
  assert.match(component, /Enemy figures are rounded battlefield assessments/);
  assert.match(component, /committed →/);
  assert.match(css, /after-action-card/);
  assert.match(css, /combat-report-alert/);
});
