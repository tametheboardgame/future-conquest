const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/game/balance-simulation.ts', 'utf8');
const {
  runCurrentEngineBalanceSimulation,
  simulateCurrentEngineCampaign
} = require('../.test-dist/balance-simulation.js');
const { SLICE_IDS } = require('../.test-dist/data.js');

test('WP11 treats the insertion territory as a start condition rather than a permanent objective', () => {
  assert.equal((source.match(/state\.portalTerritory/g) ?? []).length, 1, 'only result capture may read the engine insertion id');
  assert.match(source, /startTerritory: state\.portalTerritory/);
  assert.doesNotMatch(source, /portalReserve|Portal Guard|portalRecovery|portal-lost|portal sensitivity|portal starts/);
  assert.doesNotMatch(source, /route\.fromTerritoryId === state\.portalTerritory/);
  assert.doesNotMatch(source, /group\.location === state\.portalTerritory/);
});

test('WP11 managed doctrine bases security, supply and engineering on current strategic conditions', () => {
  assert.match(source, /TERRITORY_RESOURCES/);
  assert.match(source, /territoryStrategicValue/);
  assert.match(source, /strategicReserveIds/);
  assert.match(source, /frontier && \(territory\.occupation === 'unsecured' \|\| territory\.occupation === 'contested'\)/);
  assert.match(source, /state\.logistics\.bottleneckRouteIds\.includes\(route\.id\)/);
  assert.match(source, /territoryStrategicValue\(route\.fromTerritoryId\)/);
  assert.match(source, /suppliedLinks \* 1\.5/);
});

test('WP11 defeat classification follows current engine defeat semantics', () => {
  assert.doesNotMatch(source, /'operational-crisis'/);
  const hard = simulateCurrentEngineCampaign(16, 'hard', 'managed', 120);
  if (hard.outcome === 'defeat') {
    assert.equal(hard.defeatCause, 'personnel-collapse');
    assert.ok(hard.activePersonnel < 1200);
  }
});

test('WP11 reports insertion-start sensitivity without granting starts strategic privilege', () => {
  const report = runCurrentEngineBalanceSimulation({
    runsPerStart: 1,
    maxTurns: 15,
    difficulties: ['standard'],
    policies: ['managed'],
    seedOffset: 2
  });
  assert.equal(report.startSummaries.length, SLICE_IDS.length);
  assert.deepEqual(
    report.startSummaries.map(summary => summary.startTerritory).sort(),
    [...SLICE_IDS].sort()
  );
  assert.equal(report.summaries[0].averageReserveTurns, 0, 'managed doctrine uses security detachments rather than a permanent full-size reserve');
});