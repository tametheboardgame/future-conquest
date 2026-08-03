const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame } = require('../.test-dist/engine.js');
const {
  calculateSupplyNetwork,
  effectiveFormationLogisticsPriority,
  effectiveTerritoryLogisticsPriority,
  formationSupplyDemand,
  portalSupplyCapacity,
  refreshSupplyNetwork,
  setFormationLogisticsPriority,
  setTerritoryLogisticsPriority
} = require('../.test-dist/supply-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

function overloadedState(seed = 91) {
  const state = newGame(seed);
  const template = state.taskGroups['TG-1'];
  const demand = formationSupplyDemand(template);
  const capacity = portalSupplyCapacity(state);
  const count = Math.ceil(capacity / demand) + 12;
  state.taskGroups = {};
  for (let index = 0; index < count; index += 1) {
    const id = `TG-P-${String(index + 1).padStart(2, '0')}`;
    state.taskGroups[id] = { ...structuredClone(template), id, name: `Priority Group ${index + 1}`, status: 'ready', order: undefined };
  }
  state.selectedTaskGroupId = 'TG-P-01';
  state.logisticsPriorities = { formationOverrides: {}, territoryOverrides: {} };
  return refreshSupplyNetwork(state);
}

test('new campaigns initialise version 12 priority state and automatic defaults', () => {
  const state = newGame(44);
  assert.equal(state.version, 12);
  assert.deepEqual(state.logisticsPriorities, { formationOverrides: {}, territoryOverrides: {} });
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-1'), 'standard');
  assert.equal(effectiveTerritoryLogisticsPriority(state, state.portalTerritory), 'standard');
  assert.equal(state.logistics.formationAllocations['TG-1'].automaticPriority, true);
});

test('automatic operational priorities reflect formation activity', () => {
  const state = newGame(45);
  state.taskGroups['TG-1'].status = 'attacking';
  state.taskGroups['TG-2'].status = 'moving';
  state.taskGroups['TG-3'].status = 'recovering';
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-1'), 'critical');
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-2'), 'high');
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-3'), 'high');
});

test('critical requests are served ahead of restricted requests during a shortage', () => {
  const state = overloadedState();
  const ids = Object.keys(state.taskGroups);
  state.logisticsPriorities.formationOverrides[ids[0]] = 'critical';
  state.logisticsPriorities.formationOverrides[ids[1]] = 'restricted';
  const logistics = calculateSupplyNetwork(state);
  assert.equal(logistics.formationAllocations[ids[0]].priority, 'critical');
  assert.equal(logistics.formationAllocations[ids[1]].priority, 'restricted');
  assert.ok(logistics.formationAllocations[ids[0]].delivered > logistics.formationAllocations[ids[1]].delivered);
});

test('manual formation and administration priorities can return to automatic control', () => {
  const state = newGame(46);
  const formation = setFormationLogisticsPriority(state, 'TG-1', 'critical');
  assert.equal(formation.logisticsPriorities.formationOverrides['TG-1'], 'critical');
  assert.equal(formation.logistics.formationAllocations['TG-1'].automaticPriority, false);
  const resetFormation = setFormationLogisticsPriority(formation, 'TG-1', 'automatic');
  assert.equal(resetFormation.logisticsPriorities.formationOverrides['TG-1'], undefined);

  const territory = setTerritoryLogisticsPriority(resetFormation, state.portalTerritory, 'high');
  assert.equal(territory.logisticsPriorities.territoryOverrides[state.portalTerritory], 'high');
  assert.equal(territory.logistics.territoryAllocations[state.portalTerritory].automaticPriority, false);
  const resetTerritory = setTerritoryLogisticsPriority(territory, state.portalTerritory, 'automatic');
  assert.equal(resetTerritory.logisticsPriorities.territoryOverrides[state.portalTerritory], undefined);
});

test('priority changes warn when lower tiers fall below forty percent delivery', () => {
  let state = overloadedState(94);
  const ids = Object.keys(state.taskGroups);
  const demand = formationSupplyDemand(state.taskGroups[ids[0]]);
  const capacity = portalSupplyCapacity(state);
  let transition = null;
  for (let criticalCount = 0; criticalCount < ids.length - 1; criticalCount += 1) {
    const beforeLower = (capacity - criticalCount * demand) / Math.max(1, (ids.length - criticalCount) * demand);
    const afterLower = (capacity - (criticalCount + 1) * demand) / Math.max(1, (ids.length - criticalCount - 1) * demand);
    if (beforeLower >= 0.4 && afterLower < 0.4) {
      transition = criticalCount;
      break;
    }
  }
  assert.notEqual(transition, null, 'expected a calculable starvation transition');
  for (let index = 0; index < transition; index += 1) state.logisticsPriorities.formationOverrides[ids[index]] = 'critical';
  state = refreshSupplyNetwork(state);
  const next = setFormationLogisticsPriority(state, ids[transition], 'critical');
  assert.ok(next.logistics.starvedFormationIds.length > state.logistics.starvedFormationIds.length);
  assert.match(next.events[0].text, /below 40% of daily logistics demand/);
  assert.equal(next.events[0].tone, 'warning');
});

test('version 11 campaigns migrate to version 12 with automatic priority maps', () => {
  const current = newGame(47);
  const { logisticsPriorities, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 11 });
  assert.equal(migrated.version, 12);
  assert.deepEqual(migrated.logisticsPriorities, { formationOverrides: {}, territoryOverrides: {} });
  assert.ok(migrated.logistics.totalDemand > 0);
});

test('the command interface exposes Phase VIII-B4D logistics controls', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const navigation = fs.readFileSync('src/components/CommandNavigation.tsx', 'utf8');
  const component = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(app, /PHASE VIII-B4D \/ LOGISTICS PRIORITIES/);
  assert.match(app, /<LogisticsCommand/);
  assert.match(navigation, /id: 'logistics'/);
  assert.match(component, /Critical → High → Standard → Restricted/);
  assert.match(component, /Automatic ·/);
  assert.match(component, /Requested/);
  assert.match(component, /Delivered/);
  assert.match(main, /logistics-priorities\.css/);
});
