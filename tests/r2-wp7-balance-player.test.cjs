const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/game/balance-simulation.ts', 'utf8');
const { simulateCurrentEngineCampaign } = require('../.test-dist/balance-simulation.js');

test('WP7 managed player uses assessed defence without hidden campaign-start privilege', () => {
  assert.match(source, /getTerritoryDefenceAssessment/);
  assert.match(source, /prepareTerritoryDefence/);
  assert.match(source, /entrenchTerritory/);
  assert.match(source, /reinforcementIssued/);
  assert.equal((source.match(/state\.portalTerritory/g) ?? []).length, 1, 'the insertion id is result metadata only');
});

test('WP7 managed player makes condition-led engineering, hub, resource and supply decisions', () => {
  assert.match(source, /repairableEngineeringRoutes/);
  assert.match(source, /logisticsHubUpgradeQuote/);
  assert.match(source, /territoryStrategicValue\(id\)/);
  assert.match(source, /setTerritoryLogisticsPriority/);
  assert.match(source, /sourceTerritoryId === state\.taskGroups/);
});

test('WP7 representative campaign exercises integrated strategic actions deterministically', () => {
  const first = simulateCurrentEngineCampaign(16, 'standard', 'managed', 60);
  const second = simulateCurrentEngineCampaign(16, 'standard', 'managed', 60);
  assert.deepEqual(second, first);
  assert.ok(first.defensivePreparations > 0);
  assert.ok(first.entrenchments > 0);
  assert.ok(first.reconcentrationMoves > 0);
  assert.ok(first.engineeringProjectsStarted > 0);
  assert.ok(first.hubUpgrades > 0);
  assert.ok(first.hubCapacityGain > 0);
  assert.ok(first.hubValueTurns > 0);
  assert.ok(first.supplyPriorityChanges > 0);
  assert.ok(first.territoryStockDrawTurns > 0);
  assert.ok(first.reconcentrationMoves <= first.finalTurn, 'at most one defensive reinforcement may be ordered per day');
});
