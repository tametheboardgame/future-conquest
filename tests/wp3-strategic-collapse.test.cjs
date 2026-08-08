const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  __testOnly,
  continueCampaignAfterCollapse,
  endTurn,
  newGame,
  saveGame,
  loadGame,
  strategicCollapseDecisionPending,
  surrenderCampaign
} = require('../.test-dist/engine.js');
const { crisisLimitForDifficulty } = require('../.test-dist/enemy-strategy.js');

function atCollapseThreshold(state) {
  state.enemyStrategy.operationalCrisisTurns = crisisLimitForDifficulty(state.difficulty);
  return __testOnly.resolveCampaignOutcome(state);
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

test('new campaigns begin without a strategic-collapse decision', () => {
  const state = newGame(931, 'standard', false);
  assert.equal(state.strategicCollapse.pending, false);
  assert.equal(strategicCollapseDecisionPending(state), false);
});

test('reaching the operational crisis limit opens a decision instead of automatic defeat', () => {
  const state = atCollapseThreshold(newGame(931, 'standard', false));
  assert.equal(state.status, 'playing');
  assert.equal(state.strategicCollapse.pending, true);
  assert.equal(strategicCollapseDecisionPending(state), true);
  assert.equal(state.strategicCollapse.triggerCrisisTurns, crisisLimitForDifficulty(state.difficulty));
});

test('a pending strategic-collapse decision freezes day resolution', () => {
  const state = atCollapseThreshold(newGame(932, 'standard', false));
  const resolved = endTurn(state);
  assert.equal(resolved, state);
  assert.equal(resolved.turn, state.turn);
});

test('surrender converts the pending collapse into the normal defeat state', () => {
  const state = atCollapseThreshold(newGame(933, 'standard', false));
  const surrendered = surrenderCampaign(state);
  assert.equal(surrendered.status, 'defeat');
  assert.equal(surrendered.strategicCollapse.pending, false);
  assert.equal(surrendered.strategicCollapse.lastDecision, 'surrender');
});

test('continue anyway keeps the campaign active without repeating the same crisis episode', () => {
  const state = atCollapseThreshold(newGame(934, 'standard', false));
  const continued = continueCampaignAfterCollapse(state);
  assert.equal(continued.status, 'playing');
  assert.equal(continued.strategicCollapse.pending, false);
  assert.equal(continued.strategicCollapse.acknowledgedEpisode, true);
  const evaluatedAgain = __testOnly.resolveCampaignOutcome(continued);
  assert.equal(evaluatedAgain.strategicCollapse.pending, false);
});

test('full crisis recovery re-arms a future strategic-collapse decision', () => {
  let state = atCollapseThreshold(newGame(935, 'standard', false));
  state = continueCampaignAfterCollapse(state);
  state.enemyStrategy.operationalCrisisTurns = 0;
  state = __testOnly.resolveCampaignOutcome(state);
  assert.equal(state.strategicCollapse.acknowledgedEpisode, false);
  state.enemyStrategy.operationalCrisisTurns = crisisLimitForDifficulty(state.difficulty);
  state = __testOnly.resolveCampaignOutcome(state);
  assert.equal(state.strategicCollapse.pending, true);
});

test('catastrophic force loss remains a hard campaign defeat', () => {
  const state = newGame(936, 'standard', false);
  for (const group of Object.values(state.taskGroups)) group.personnel = 250;
  state.enemyStrategy.operationalCrisisTurns = 0;
  const resolved = __testOnly.resolveCampaignOutcome(state);
  assert.equal(resolved.status, 'defeat');
  assert.equal(strategicCollapseDecisionPending(resolved), false);
});

test('pending strategic-collapse choice survives save and load', () => {
  const originalStorage = global.localStorage;
  global.localStorage = memoryStorage();
  try {
    const state = atCollapseThreshold(newGame(937, 'standard', false));
    saveGame(state);
    const loaded = loadGame();
    assert.ok(loaded);
    assert.equal(loaded.strategicCollapse.pending, true);
    assert.equal(loaded.strategicCollapse.triggeredTurn, state.turn);
  } finally {
    if (originalStorage === undefined) delete global.localStorage;
    else global.localStorage = originalStorage;
  }
});

test('the interface presents continue and surrender without promoting collapse to the defeat ending', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const dialog = fs.readFileSync('src/components/StrategicCollapseDecision.tsx', 'utf8');
  assert.match(app, /collapseDecisionPending && <StrategicCollapseDecision/);
  assert.match(dialog, /CONTINUE ANYWAY/);
  assert.match(dialog, /SURRENDER CAMPAIGN/);
  assert.match(app, /state.status !== 'playing'/);
  assert.match(app, /command-outcome/);
});
