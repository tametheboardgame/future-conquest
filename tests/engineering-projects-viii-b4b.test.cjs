const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { newGame } = require('../.test-dist/engine.js');
const {
  cancelEngineeringProject,
  engineeringProjectDemand,
  resolveEngineeringProjects,
  setEngineeringAllocation,
  startEngineeringProject
} = require('../.test-dist/engineering-projects.js');
const { refreshSupplyNetwork } = require('../.test-dist/supply-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');
const { LEGACY_V9_SAVE_KEY, inspectStoredCampaign } = require('../.test-dist/persistence.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function engineeringState() {
  let state = structuredClone(newGame(711, 'standard'));
  state.portalTerritory = 'BE-01';
  for (const id of ['BE-01', 'NL-01']) {
    state.territories[id].controller = 'player';
    state.territories[id].occupation = 'administered';
    state.territories[id].supplied = true;
    state.territories[id].resistance = 10;
  }
  state.taskGroups['TG-1'].location = 'BE-01';
  state.taskGroups['TG-1'].status = 'ready';
  state.taskGroups['TG-1'].order = undefined;
  state.routeStates['R-BRUSSELS-AMSTERDAM'].condition = 55;
  state.routeStates['R-BRUSSELS-AMSTERDAM'].status = 'damaged';
  state.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier = 0.64;
  return refreshSupplyNetwork(state);
}

function installStorage(entries = []) {
  const values = new Map(entries);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test('new campaigns initialise version 10 engineering state', () => {
  const state = newGame(711, 'standard');
  assert.equal(state.version, 11);
  assert.deepEqual(state.engineeringProjects, []);
});

test('starting a repair project commits a formation and adds logistics demand', () => {
  const state = engineeringState();
  const beforeDemand = state.logistics.formationAllocations['TG-1'].demand;
  const started = startEngineeringProject(state, 'R-BRUSSELS-AMSTERDAM', 'TG-1', 50);
  assert.equal(started.engineeringProjects.length, 1);
  assert.equal(started.engineeringProjects[0].status, 'active');
  assert.equal(started.taskGroups['TG-1'].status, 'engineering');
  assert.ok(started.logistics.formationAllocations['TG-1'].demand > beforeDemand);
  assert.equal(engineeringProjectDemand(started.engineeringProjects[0]), 7);
});

test('repair allocation changes logistics demand without creating another project', () => {
  const started = startEngineeringProject(engineeringState(), 'R-BRUSSELS-AMSTERDAM', 'TG-1', 25);
  const projectId = started.engineeringProjects[0].id;
  const lowDemand = started.logistics.formationAllocations['TG-1'].demand;
  const urgent = setEngineeringAllocation(started, projectId, 100);
  assert.equal(urgent.engineeringProjects.length, 1);
  assert.equal(urgent.engineeringProjects[0].allocation, 100);
  assert.ok(urgent.logistics.formationAllocations['TG-1'].demand > lowDemand);
});

test('supplied engineering work restores route condition and releases the formation on completion', () => {
  let state = engineeringState();
  state.routeStates['R-BRUSSELS-AMSTERDAM'].condition = 96;
  state = startEngineeringProject(state, 'R-BRUSSELS-AMSTERDAM', 'TG-1', 100);
  const resolved = resolveEngineeringProjects(state);
  assert.equal(resolved.routeStates['R-BRUSSELS-AMSTERDAM'].condition, 100);
  assert.equal(resolved.routeStates['R-BRUSSELS-AMSTERDAM'].status, 'open');
  assert.equal(resolved.engineeringProjects[0].status, 'completed');
  assert.equal(resolved.taskGroups['TG-1'].status, 'ready');
});

test('cancelling a project releases a formation to its prior garrison status', () => {
  const state = engineeringState();
  state.taskGroups['TG-1'].status = 'garrison';
  const started = startEngineeringProject(state, 'R-BRUSSELS-AMSTERDAM', 'TG-1', 50);
  const cancelled = cancelEngineeringProject(started, started.engineeringProjects[0].id);
  assert.equal(cancelled.engineeringProjects[0].status, 'cancelled');
  assert.equal(cancelled.taskGroups['TG-1'].status, 'garrison');
});

test('version 9 campaigns migrate to version 10 with an empty project ledger', () => {
  const legacy = structuredClone(newGame(711, 'standard'));
  legacy.version = 9;
  delete legacy.engineeringProjects;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 11);
  assert.deepEqual(upgraded.engineeringProjects, []);

  const result = inspectStoredCampaign(installStorage([[LEGACY_V9_SAVE_KEY, JSON.stringify(legacy)]]));
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v9');
  assert.equal(result.state.version, 11);
});

test('the interface exposes engineering command and the Phase VIII-B4B release marker', () => {
  const app = read('src/App.tsx');
  const nav = read('src/components/CommandNavigation.tsx');
  const engineering = read('src/components/EngineeringCommand.tsx');
  const persistence = read('src/game/persistence.ts');
  assert.match(app, /PHASE VIII-B4C \/ INTERDICTION AND COMBAT DAMAGE/);
  assert.match(app, /currentView === 'engineering'/);
  assert.match(nav, /id: 'engineering'/);
  assert.match(engineering, /Higher allocation repairs faster but consumes more network throughput/);
  assert.match(persistence, /future-conquest-slice-v0\.10/);
  assert.match(persistence, /saveVersion:\s*11/);
});
