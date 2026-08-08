const test = require('node:test');
const assert = require('node:assert/strict');

const {
  runCurrentEngineBalanceSimulation,
  simulateCurrentEngineCampaign
} = require('../.test-dist/balance-simulation.js');
const { SLICE_IDS } = require('../.test-dist/data.js');

test('current-engine balance campaigns are deterministic for the same seed and doctrine', () => {
  const first = simulateCurrentEngineCampaign(37, 'standard', 'managed', 35);
  const second = simulateCurrentEngineCampaign(37, 'standard', 'managed', 35);
  assert.deepEqual(second, first);
});

test('one run per start covers every active insertion territory exactly once', () => {
  const report = runCurrentEngineBalanceSimulation({
    runsPerStart: 1,
    maxTurns: 20,
    difficulties: ['story'],
    policies: ['managed'],
    seedOffset: 1
  });

  assert.equal(report.campaigns, SLICE_IDS.length);
  assert.deepEqual(
    [...new Set(report.results.map(result => result.startTerritory))].sort(),
    [...SLICE_IDS].sort()
  );
  assert.equal(report.startSummaries.length, SLICE_IDS.length);
});

test('all four player doctrines produce bounded current-engine telemetry', () => {
  for (const policy of ['aggressive', 'balanced', 'cautious', 'managed']) {
    const result = simulateCurrentEngineCampaign(44, 'hard', policy, 25);
    assert.ok(['victory', 'defeat', 'timeout'].includes(result.outcome));
    assert.ok(result.finalTurn >= 1 && result.finalTurn <= 25);
    assert.ok(result.controlledTerritories >= 0 && result.controlledTerritories <= SLICE_IDS.length);
    assert.ok(result.activePersonnel >= 0 && result.activePersonnel <= 10000);
    assert.ok(result.maxEscalation >= 0 && result.maxEscalation <= 100);
    assert.ok(result.minNetworkEfficiency >= 0 && result.minNetworkEfficiency <= 100);
    assert.ok(result.operationsStarted >= 0);
    assert.ok(result.movesIssued >= 0);
    assert.ok(result.engineeringProjectsStarted >= 0);
    assert.ok(result.reserveTurns >= 0);
  }
});