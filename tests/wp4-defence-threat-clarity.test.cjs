const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  __testOnly,
  counterattackDefencePower,
  entrenchTerritory,
  loadGame,
  newGame,
  prepareTerritoryDefence,
  reinforceTerritory,
  saveGame,
  setFormationGarrison
} = require('../.test-dist/engine.js');
const { getTerritoryDefenceAssessment } = require('../.test-dist/defence.js');
const { TERRITORIES } = require('../.test-dist/data.js');
const {
  effectiveTerritoryLogisticsPriority,
  setTerritoryLogisticsPriority
} = require('../.test-dist/supply-network.js');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

test('controlled territories expose a bounded defence assessment', () => {
  const state = newGame(1401, 'standard', false);
  const assessment = getTerritoryDefenceAssessment(state, state.portalTerritory);
  assert.ok(assessment);
  assert.equal(assessment.territoryId, state.portalTerritory);
  assert.equal(assessment.localPersonnel, 10000);
  assert.equal(assessment.garrisonPersonnel, 0);
  assert.ok(Number.isFinite(assessment.attackProbability));
  assert.ok(assessment.attackProbability >= 0 && assessment.attackProbability <= 100);
  assert.ok(['FORTIFIED', 'HOLDING', 'EXPOSED', 'CRITICAL'].includes(assessment.defensivePositionLabel));
});

test('garrison assignment can target an explicit local formation', () => {
  const state = newGame(1402, 'standard', false);
  const assigned = setFormationGarrison(state, 'TG-1', true);
  assert.equal(assigned.taskGroups['TG-1'].status, 'garrison');
  const released = setFormationGarrison(assigned, 'TG-1', false);
  assert.equal(released.taskGroups['TG-1'].status, 'ready');
});

test('entrenchment consumes carried stock and improves fortification once per day', () => {
  let state = newGame(1403, 'standard', false);
  state = setFormationGarrison(state, 'TG-1', true);
  const territoryId = state.portalTerritory;
  const fortificationBefore = state.territories[territoryId].fortification;
  const supplyBefore = state.taskGroups['TG-1'].supply;
  const entrenched = entrenchTerritory(state, territoryId, 'TG-1');
  assert.ok(entrenched.territories[territoryId].fortification > fortificationBefore);
  assert.ok(entrenched.taskGroups['TG-1'].supply < supplyBefore);
  assert.equal(entrenched.territories[territoryId].lastEntrenchTurn, state.turn);
  assert.equal(entrenchTerritory(entrenched, territoryId, 'TG-1'), entrenched);
});

test('prepared defence is temporary and materially increases counterattack defence power', () => {
  const state = newGame(1404, 'standard', false);
  const territoryId = state.portalTerritory;
  const basePower = counterattackDefencePower(state, territoryId);
  const prepared = prepareTerritoryDefence(state, territoryId);
  assert.equal(prepared.territories[territoryId].defencePreparedUntil, state.turn + 2);
  assert.ok(counterattackDefencePower(prepared, territoryId) > basePower);
  assert.ok(prepared.taskGroups['TG-1'].supply < state.taskGroups['TG-1'].supply);
});

test('planned counterattacks dominate the territory attack-risk assessment', () => {
  const state = newGame(1405, 'standard', false);
  const territoryId = state.portalTerritory;
  state.enemyOrders.push({
    id: 'EO-WP4-THREAT',
    turn: state.turn,
    type: 'counterattack',
    target: territoryId,
    executeTurn: state.turn + 1,
    status: 'planned',
    priority: 100,
    summary: 'Two enemy formations concentrating for a counterattack.',
    formationId: 'EF-WP4-A',
    supportFormationIds: ['EF-WP4-B']
  });
  const assessment = getTerritoryDefenceAssessment(state, territoryId);
  assert.ok(assessment);
  assert.equal(assessment.threatStage, 'imminent');
  assert.equal(assessment.threateningFormationCount, 2);
  assert.equal(assessment.attackProbability, 86);
  assert.equal(assessment.attackProbabilityLabel, 'CRITICAL');
});

test('reinforce orders a route-connected adjacent formation towards the threatened territory', () => {
  let state = newGame(1406, 'standard', false);
  const territoryId = state.portalTerritory;
  const neighbour = TERRITORIES[territoryId].neighbours.find(id => state.territories[id]);
  assert.ok(neighbour);
  state.territories[neighbour] = {
    ...state.territories[neighbour],
    controller: 'player',
    occupation: 'controlled',
    legitimacy: 55,
    resistance: 20,
    supplied: true,
    fortification: 8,
    capturedTurn: 1
  };
  state.taskGroups['TG-4'].location = neighbour;
  state.taskGroups['TG-4'].status = 'ready';
  state.taskGroups['TG-4'].order = undefined;
  state = __testOnly.refreshSupply(state);
  const reinforced = reinforceTerritory(state, territoryId);
  assert.equal(reinforced.taskGroups['TG-4'].status, 'moving');
  assert.equal(reinforced.taskGroups['TG-4'].order?.type, 'move');
  assert.equal(reinforced.taskGroups['TG-4'].order?.target, territoryId);
  assert.ok(reinforced.taskGroups['TG-4'].order?.routeId);
});

test('defence workflow can raise territory logistics priority through the real supply system', () => {
  const state = newGame(1407, 'standard', false);
  const territoryId = state.portalTerritory;
  const prioritised = setTerritoryLogisticsPriority(state, territoryId, 'high');
  assert.equal(effectiveTerritoryLogisticsPriority(prioritised, territoryId), 'high');
});

test('defence preparation survives normal save and load', () => {
  const originalStorage = global.localStorage;
  global.localStorage = memoryStorage();
  try {
    let state = newGame(1408, 'standard', false);
    state = setFormationGarrison(state, 'TG-1', true);
    state = entrenchTerritory(state, state.portalTerritory, 'TG-1');
    state = prepareTerritoryDefence(state, state.portalTerritory);
    saveGame(state);
    const loaded = loadGame();
    assert.ok(loaded);
    assert.equal(loaded.territories[state.portalTerritory].lastEntrenchTurn, state.turn);
    assert.equal(loaded.territories[state.portalTerritory].defencePreparedUntil, state.turn + 2);
  } finally {
    if (originalStorage === undefined) delete global.localStorage;
    else global.localStorage = originalStorage;
  }
});

test('WP4 interface uses compact counterattack alerts and scale-stable enemy operation lines', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');
  const panel = fs.readFileSync('src/components/DefencePanel.tsx', 'utf8');
  const css = fs.readFileSync('src/defence.css', 'utf8');
  assert.match(app, /<DefencePanel state=\{state\} territoryId=\{selected\.id\}/);
  assert.match(app, /COUNTERATTACK DETECTED/);
  assert.match(app, /enemy-action-alert/);
  assert.doesNotMatch(app, /enemy-threat-list/);
  assert.match(panel, /attack risk/);
  assert.match(panel, /Entrench/);
  assert.match(panel, /Prepare defence/);
  assert.match(panel, /Reinforce/);
  assert.match(panel, /Prioritise supply/);
  assert.match(map, /vectorEffect="non-scaling-stroke"/);
  assert.match(map, /operationWidth/);
  assert.match(map, /formationCount/);
  assert.match(css, /enemyRouteFlow/);
});
