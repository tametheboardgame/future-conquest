const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { newGame } = require('../.test-dist/engine.js');
const { TERRITORIES } = require('../.test-dist/data.js');
const { getAdviserWarnings, moveTutorial } = require('../.test-dist/operational-clarity.js');

test('WP5 adviser detects every approved strategic warning without mutating campaign state', () => {
  const state = newGame(5501, 'standard', true);
  const territoryId = state.portalTerritory;
  const group = Object.values(state.taskGroups)[0];
  group.location = territoryId; group.status = 'garrison'; group.personnel = 500; group.supply = 4;
  state.territories[territoryId].supplied = false;
  state.enemyOrders = [{ id:'wp5-threat', turn:state.turn, type:'counterattack', origin:TERRITORIES[territoryId].neighbours[0], target:territoryId, executeTurn:state.turn, status:'executing', priority:100, summary:'attack' }];
  // Make the territory undefended after retaining a separate low-garrison example.
  const lowTerritory = TERRITORIES[territoryId].neighbours[0];
  state.territories[lowTerritory].controller = 'player'; state.territories[lowTerritory].occupation = 'controlled';
  group.location = lowTerritory;
  const routeId = Object.keys(state.logistics.routeFlows)[0];
  state.logistics.routeFlows[routeId] = { ...state.logistics.routeFlows[routeId], used:100, capacity:50, utilisation:200, condition:'overloaded' };
  state.logistics.bottleneckRouteIds = [routeId];
  state.engineeringProjects.push({ id:'wp5-project', routeId, kind:'repair', createdTurn:state.turn, startingCondition:20, targetCondition:100, progress:0, allocation:0, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 });
  state.operations['wp5-operation'] = { id:'wp5-operation', target:territoryId, participantGroupIds:[group.id], origins:{[group.id]:lowTerritory}, progress:0, days:3, enemyFormationIds:[], enemyPower:5000 };
  const snapshot = structuredClone(state);
  const warnings = getAdviserWarnings(state, 'Full Guidance');
  assert.deepEqual(new Set(warnings.map(w => w.category)), new Set(['undefended-threat','isolation','low-garrison','exhausted-stocks','overloaded-route','engineering-support-loss','suicidal-assault']));
  assert.deepEqual(state, snapshot, 'advice must not alter or restrict otherwise legal campaign actions');
});

test('WP5 Assistance levels apply predictable severity thresholds', () => {
  const state = newGame(5502, 'standard', false);
  const group = Object.values(state.taskGroups)[0]; group.status = 'garrison'; group.personnel = 500;
  const full = getAdviserWarnings(state, 'Full Guidance');
  assert.ok(full.some(w => w.severity === 'warning'));
  assert.ok(getAdviserWarnings(state, 'Recommended').every(w => ['danger','critical'].includes(w.severity)));
  assert.ok(getAdviserWarnings(state, 'Critical Only').every(w => w.severity === 'critical'));
  assert.deepEqual(getAdviserWarnings(state, 'Off'), []);
});

test('WP5 tutorial Back and Forward are bounded and wrong actions do not desynchronise it', () => {
  const state = newGame(5503, 'standard', true);
  assert.equal(moveTutorial(state, -1).tutorial.step, 0);
  const forward = moveTutorial(state, 1);
  assert.equal(forward.tutorial.step, 1);
  assert.equal(moveTutorial(forward, -1).tutorial.step, 0);
  assert.equal(state.tutorial.step, 0);
});

test('WP5 tutorial teaches map framing and remains horizontally contained', () => {
  const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const css = fs.readFileSync('src/operational-clarity.css', 'utf8');
  for (const concept of ['Europe', 'Campaign', 'Selected', 'Zoom', 'pan']) assert.match(clarity, new RegExp(concept, 'i'));
  assert.match(overlay, />Back</); assert.match(overlay, />Forward</);
  assert.match(css, /calc\(100vw - 16px\)/); assert.match(css, /overflow-wrap:anywhere/);
});
