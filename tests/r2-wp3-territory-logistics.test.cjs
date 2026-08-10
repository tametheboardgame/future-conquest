const test = require('node:test');
const assert = require('node:assert/strict');

const { newGame } = require('../.test-dist/engine.js');
const { refreshSupplyNetwork } = require('../.test-dist/supply-network.js');
const { simulateCurrentEngineCampaign } = require('../.test-dist/balance-simulation.js');
const {
  TERRITORY_RESOURCES,
  getTerritoryResourceState,
  logisticsHubUpgradeQuote,
  normaliseTerritoryResources,
  territorySupplySourceCapacity,
  upgradeLogisticsHub
} = require('../.test-dist/territory-resources.js');

function controlledBrussels() {
  const state = structuredClone(newGame(8126, 'standard'));
  state.territories['BE-01'].controller = 'player';
  state.territories['BE-01'].occupation = 'administered';
  state.territories['BE-01'].legitimacy = 80;
  state.territories['BE-01'].resistance = 5;
  state.territories['BE-01'].supplied = false;
  for (const group of Object.values(state.taskGroups)) {
    group.location = 'BE-01';
    group.status = 'ready';
    group.order = undefined;
  }
  for (const routeState of Object.values(state.routeStates)) {
    routeState.status = 'blocked';
    routeState.capacityModifier = 0;
  }
  getTerritoryResourceState(state, 'BE-01');
  return refreshSupplyNetwork(state);
}

test('WP3 exposes all six territory resource dimensions and persistent reserves', () => {
  const state = newGame(8126, 'standard');
  const resource = getTerritoryResourceState(state, 'BE-01');
  assert.deepEqual(Object.keys(TERRITORY_RESOURCES['BE-01']).sort(), ['energy', 'food', 'industry', 'medical', 'militaryStores', 'transport'].sort());
  assert.ok(resource.stocks.food > 0);
  assert.ok(resource.stocks.industry > 0);
  const normalised = normaliseTerritoryResources(state, {});
  assert.equal(Object.keys(normalised).length, Object.keys(state.territories).length);
});

test('disconnected formations draw finite local reserves instead of failing instantly', () => {
  let state = controlledBrussels();
  const before = getTerritoryResourceState(state, 'BE-01').stocks.food;
  const delivered = Object.values(state.logistics.formationAllocations).reduce((sum, allocation) => sum + allocation.delivered, 0);
  assert.ok(delivered > 0, 'local stocks should sustain some disconnected delivery');
  state = { ...state, turn: state.turn + 1 };
  state = refreshSupplyNetwork(state);
  const after = getTerritoryResourceState(state, 'BE-01').stocks.food;
  assert.ok(after < before, 'local food reserve should be consumed when isolated formations are supplied locally');
});

test('logistics hubs consume local resources and increase persistent source capacity', () => {
  let state = controlledBrussels();
  const resource = getTerritoryResourceState(state, 'BE-01');
  resource.stocks.industry = 120;
  resource.stocks.transport = 120;
  resource.stocks.energy = 120;
  const quote = logisticsHubUpgradeQuote(state, 'BE-01');
  assert.equal(quote.eligible, true);
  assert.equal(quote.affordable, true);
  const beforeCapacity = territorySupplySourceCapacity(state, 'BE-01');
  const beforeIndustry = resource.stocks.industry;
  state = upgradeLogisticsHub(state, 'BE-01');
  const upgraded = getTerritoryResourceState(state, 'BE-01');
  assert.equal(upgraded.hubLevel, 1);
  assert.ok(upgraded.stocks.industry < beforeIndustry);
  assert.ok(territorySupplySourceCapacity(state, 'BE-01') > beforeCapacity);
  assert.ok(state.logistics.sourceCapacity > beforeCapacity, 'upgrade result must contain the refreshed integrated snapshot');
});

test('hub actions cannot mutate concluded campaigns', () => {
  for (const status of ['victory', 'defeat']) {
    const state = controlledBrussels();
    const resource = getTerritoryResourceState(state, 'BE-01');
    resource.stocks.industry = resource.stocks.transport = resource.stocks.energy = 120;
    state.status = status;
    const before = structuredClone(state);
    assert.equal(logisticsHubUpgradeQuote(state, 'BE-01').eligible, false);
    assert.strictEqual(upgradeLogisticsHub(state, 'BE-01'), state);
    assert.deepEqual(state, before);
  }
});

test('exported deliveries deplete the source territory rather than the receiver', () => {
  const state = controlledBrussels();
  const group = Object.values(state.taskGroups)[0];
  group.location = 'NL-01';
  state.territories['NL-01'].controller = 'player';
  getTerritoryResourceState(state, 'NL-01');
  const sourceBefore = getTerritoryResourceState(state, 'BE-01').stocks.food;
  const receiverBefore = getTerritoryResourceState(state, 'NL-01').stocks.food;
  state.logistics.formationAllocations[group.id] = {
    ...state.logistics.formationAllocations[group.id],
    demand: 10,
    delivered: 10,
    path: { ...state.logistics.formationAllocations[group.id].path, sourceTerritoryId: 'BE-01' }
  };
  state.turn += 1;
  const sourceAfter = getTerritoryResourceState(state, 'BE-01').stocks.food;
  const receiverAfter = getTerritoryResourceState(state, 'NL-01').stocks.food;
  assert.ok(sourceAfter < sourceBefore, 'export source must pay for delivery after production');
  assert.ok(receiverAfter >= receiverBefore, 'receiving territory must not be charged for another source allocation');
});

test('hub survives territorial loss while reserves are captured and player benefit disappears', () => {
  let state = controlledBrussels();
  const resource = getTerritoryResourceState(state, 'BE-01');
  resource.stocks.industry = 120;
  resource.stocks.transport = 120;
  resource.stocks.energy = 120;
  state = upgradeLogisticsHub(state, 'BE-01');
  const before = getTerritoryResourceState(state, 'BE-01').stocks.food;
  state.territories['BE-01'].controller = 'enemy';
  state.territories['BE-01'].occupation = 'enemy';
  state.turn += 1;
  refreshSupplyNetwork(state);
  const lost = getTerritoryResourceState(state, 'BE-01');
  assert.equal(lost.hubLevel, 1);
  assert.ok(lost.stocks.food < before);
  assert.equal(territorySupplySourceCapacity(state, 'BE-01'), 0);
});

test('deterministic campaign validation exercises hub construction, value, loss, and continued play', () => {
  const result = simulateCurrentEngineCampaign(18, 'story', 'managed', 20);
  assert.equal(result.hubUpgrades, 1);
  assert.ok(result.hubCapacityGain > 0);
  assert.ok(result.hubValueTurns > 0);
  assert.ok(result.hubLosses > 0);
  assert.ok(result.personnelAfterHubLoss > 0);
  assert.equal(result.outcome, 'timeout', 'campaign should continue after a hub loss');
});
