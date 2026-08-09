const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { canIssueOperationalOrder, newGame } = require('../.test-dist/engine.js');
const {
  cancelEngineeringProject,
  engineeringOperationalPersonnel,
  engineeringProjectDemand,
  engineeringSupportDemand,
  resolveEngineeringProjects,
  setEngineeringAllocation,
  startEngineeringProject,
  withdrawEngineeringSupport
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
  state.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier = 0.59;
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

test('new campaigns initialise an empty engineering project ledger', () => {
  const state = newGame(711, 'standard');
  assert.equal(state.version, 14);
  assert.deepEqual(state.engineeringProjects, []);
});

test('starting a supported repair project leaves the parent formation operational and adds only support overhead', () => {
  const state = engineeringState();
  const beforeDemand = state.logistics.formationAllocations['TG-1'].demand;
  const started = startEngineeringProject(state, 'R-BRUSSELS-AMSTERDAM', 'TG-1', 25);
  const project = started.engineeringProjects[0];

  assert.equal(project.status, 'active');
  assert.equal(project.kind, 'repair');
  assert.equal(project.allocation, 25);
  assert.equal(started.taskGroups['TG-1'].status, 'ready');
  assert.equal(canIssueOperationalOrder(started.taskGroups['TG-1']), true);
  assert.equal(engineeringOperationalPersonnel(started, started.taskGroups['TG-1']), Math.floor(started.taskGroups['TG-1'].personnel * 0.8));
  assert.ok(started.logistics.formationAllocations['TG-1'].demand > beforeDemand);
  assert.equal(engineeringSupportDemand(project), 2);
  assert.ok(engineeringProjectDemand(project) >= 3);
});

test('civil repair can start with no formation support and still advance', () => {
  const started = startEngineeringProject(engineeringState(), 'R-BRUSSELS-AMSTERDAM');
  assert.equal(started.engineeringProjects[0].allocation, 0);
  assert.equal(started.engineeringProjects[0].assignedTaskGroupId, undefined);
  const before = started.routeStates['R-BRUSSELS-AMSTERDAM'].condition;
  const resolved = resolveEngineeringProjects(started);
  assert.ok(resolved.routeStates['R-BRUSSELS-AMSTERDAM'].condition > before);
  assert.equal(resolved.engineeringProjects[0].status, 'active');
});

test('support allocation changes logistics demand without creating another project', () => {
  const started = startEngineeringProject(engineeringState(), 'R-BRUSSELS-AMSTERDAM', 'TG-1', 25);
  const projectId = started.engineeringProjects[0].id;
  const lowDemand = started.logistics.formationAllocations['TG-1'].demand;
  const urgent = setEngineeringAllocation(started, projectId, 100);
  assert.equal(urgent.engineeringProjects.length, 1);
  assert.equal(urgent.engineeringProjects[0].allocation, 100);
  assert.ok(urgent.logistics.formationAllocations['TG-1'].demand > lowDemand);
});

test('withdraw support keeps the civil project active while cancellation is a separate decision', () => {
  const started = startEngineeringProject(engineeringState(), 'R-BRUSSELS-AMSTERDAM', 'TG-1', 50);
  const projectId = started.engineeringProjects[0].id;
  const withdrawn = withdrawEngineeringSupport(started, projectId);
  assert.equal(withdrawn.engineeringProjects[0].status, 'active');
  assert.equal(withdrawn.engineeringProjects[0].allocation, 0);
  assert.equal(withdrawn.engineeringProjects[0].assignedTaskGroupId, undefined);
  assert.equal(withdrawn.taskGroups['TG-1'].status, 'ready');

  const cancelled = cancelEngineeringProject(withdrawn, projectId);
  assert.equal(cancelled.engineeringProjects[0].status, 'cancelled');
});

test('supplied engineering work restores route condition over time and releases military support on completion', () => {
  let state = engineeringState();
  state.routeStates['R-BRUSSELS-AMSTERDAM'].condition = 92;
  state.routeStates['R-BRUSSELS-AMSTERDAM'].capacityModifier = 0.93;
  state = startEngineeringProject(state, 'R-BRUSSELS-AMSTERDAM', 'TG-1', 100);

  for (let day = 0; day < 20 && state.engineeringProjects[0].status === 'active'; day += 1) {
    state = resolveEngineeringProjects(state);
  }

  assert.equal(state.routeStates['R-BRUSSELS-AMSTERDAM'].condition, 100);
  assert.equal(state.routeStates['R-BRUSSELS-AMSTERDAM'].status, 'open');
  assert.equal(state.engineeringProjects[0].status, 'completed');
  assert.equal(state.engineeringProjects[0].allocation, 0);
  assert.equal(state.engineeringProjects[0].assignedTaskGroupId, undefined);
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
});

test('version 9 campaigns migrate with an empty project ledger', () => {
  const legacy = structuredClone(newGame(711, 'standard'));
  legacy.version = 9;
  delete legacy.engineeringProjects;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 14);
  assert.deepEqual(upgraded.engineeringProjects, []);

  const result = inspectStoredCampaign(installStorage([[LEGACY_V9_SAVE_KEY, JSON.stringify(legacy)]]));
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v9');
  assert.equal(result.state.version, 14);
});

test('the interface exposes the unified infrastructure command and current persistence version', () => {
  const app = read('src/App.tsx');
  const nav = read('src/components/CommandNavigation.tsx');
  const infrastructure = read('src/components/InfrastructureCommand.tsx');
  const persistence = read('src/game/persistence.ts');
  assert.match(app, /PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING/);
  assert.match(app, /currentView === 'engineering'/);
  assert.match(nav, /id: 'engineering'/);
  assert.match(infrastructure, /Strategic infrastructure command/);
  assert.match(persistence, /future-conquest-slice-v0\.10/);
  assert.match(persistence, /saveVersion:\s*14/);
});
