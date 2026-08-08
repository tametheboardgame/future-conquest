const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame, endTurn, __testOnly } = require('../.test-dist/engine.js');
const { refreshSupplyNetwork, estimatedFormationStockDays } = require('../.test-dist/supply-network.js');
const { territorySupplySourceCapacity } = require('../.test-dist/territory-resources.js');

function makeSoleControlledTerritory(state, territoryId, occupation = 'controlled') {
  for (const [id, territory] of Object.entries(state.territories)) {
    territory.controller = id === territoryId ? 'player' : 'enemy';
    territory.occupation = id === territoryId ? occupation : 'enemy';
    territory.legitimacy = id === territoryId ? 62 : 0;
    territory.resistance = id === territoryId ? 18 : 0;
    territory.supplied = false;
  }
  for (const group of Object.values(state.taskGroups)) group.location = territoryId;
  return state;
}

test('territorial supply sources differ by strategic economic value', () => {
  const state = newGame(711, 'standard', false);
  state.territories['DE-02'].controller = 'player';
  state.territories['DE-02'].occupation = 'controlled';
  state.territories['DE-02'].legitimacy = 62;
  state.territories['DE-02'].resistance = 18;
  state.territories['CH-02'].controller = 'player';
  state.territories['CH-02'].occupation = 'controlled';
  state.territories['CH-02'].legitimacy = 62;
  state.territories['CH-02'].resistance = 18;
  assert.ok(territorySupplySourceCapacity(state, 'DE-02') > territorySupplySourceCapacity(state, 'CH-02'));
});

test('a formation can draw local supply without any route to the former portal territory', () => {
  let state = newGame(711, 'standard', false);
  const formerPortal = state.portalTerritory;
  const localTerritory = Object.keys(state.territories).find(id => id !== formerPortal && id === 'DE-02') || 'FR-02';
  state = makeSoleControlledTerritory(state, localTerritory);
  state.territories[formerPortal].controller = 'enemy';
  state.territories[formerPortal].occupation = 'enemy';
  state = refreshSupplyNetwork(state);
  const allocation = state.logistics.formationAllocations['TG-1'];
  assert.ok(allocation.delivered > 0);
  assert.equal(allocation.path.sourceTerritoryId, localTerritory);
  assert.notEqual(allocation.path.sourceTerritoryId, formerPortal);
});

test('losing the insertion territory is not an automatic campaign defeat', () => {
  let state = newGame(711, 'standard', false);
  const formerPortal = state.portalTerritory;
  const fallback = formerPortal === 'DE-02' ? 'DE-03' : 'DE-02';
  state = makeSoleControlledTerritory(state, fallback);
  state.territories[formerPortal].controller = 'enemy';
  state.territories[formerPortal].occupation = 'enemy';
  state.enemyStrategy.operationalCrisisTurns = 0;
  state = refreshSupplyNetwork(state);
  state = endTurn(state);
  assert.equal(state.status, 'playing');
  assert.ok(Object.values(state.taskGroups).reduce((sum, group) => sum + group.personnel, 0) > 1200);
});

test('carried formation stocks absorb a short supply interruption rather than disappearing immediately', () => {
  let state = newGame(711, 'standard', false);
  const territoryId = state.portalTerritory;
  state = makeSoleControlledTerritory(state, territoryId, 'unsecured');
  for (const group of Object.values(state.taskGroups)) group.supply = 100;
  state = refreshSupplyNetwork(state);
  const before = state.taskGroups['TG-1'].supply;
  state = __testOnly.resolveOccupationAndLogistics(state);
  assert.ok(state.taskGroups['TG-1'].supply > 0);
  assert.ok(state.taskGroups['TG-1'].supply < before || state.logistics.formationAllocations['TG-1'].ratio >= 65);
  assert.ok(estimatedFormationStockDays(state.taskGroups['TG-1']) > 0);
});

test('portal-specific supply and defeat assumptions are absent from the current mechanics', () => {
  const supply = fs.readFileSync('src/game/supply-network.ts', 'utf8');
  const engine = fs.readFileSync('src/game/engine.ts', 'utf8');
  const strategy = fs.readFileSync('src/game/enemy-strategy.ts', 'utf8');
  const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');
  assert.doesNotMatch(supply, /portalSupplyCapacity|distances = new Map<string, number>\(\[\[state\.portalTerritory/);
  assert.doesNotMatch(engine, /territories\[next\.portalTerritory\]\.controller !== 'player'|portal access can no longer be sustained|lost operational cohesion or access to the portal/);
  assert.doesNotMatch(strategy, /portalBonus|portalFrontline/);
  assert.doesNotMatch(clarity, /Portal source capacity|portal supply network/);
});
