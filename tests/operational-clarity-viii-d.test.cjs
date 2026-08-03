const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { newGame } = require('../.test-dist/engine.js');
const {
  createOperationalAwarenessState,
  createTutorialState,
  getEnemyContacts,
  getSupplyClarity,
  getThreatenedTerritories,
  progressTutorial,
  requiresSupplyAcknowledgement,
  TUTORIAL_STEPS
} = require('../.test-dist/operational-clarity.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

test('new campaigns initialise version 14 awareness and guided tutorial state', () => {
  const state = newGame(401, 'standard', true);
  assert.equal(state.version, 14);
  assert.deepEqual(state.operationalAwareness, createOperationalAwarenessState(100));
  assert.deepEqual(state.tutorial, createTutorialState(true, 1));
  assert.equal(TUTORIAL_STEPS.length, 7);
});

test('enemy contacts expose confidence and estimates rather than universal exact identities', () => {
  const state = newGame(402, 'standard', false);
  const contacts = getEnemyContacts(state);
  assert.ok(contacts.length > 0);
  assert.ok(contacts.some(contact => contact.confidence !== 'confirmed'));
  assert.ok(contacts.every(contact => contact.estimatedMax >= contact.estimatedMin));
  assert.ok(contacts.some(contact => contact.formationCount === undefined));
});

test('planned counterattacks create visible threatened-territory warnings', () => {
  const state = newGame(403, 'standard', false);
  const target = state.portalTerritory;
  const neighbour = require('../.test-dist/data.js').TERRITORIES[target].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(neighbour);
  const formation = Object.values(state.enemyFormations).find(item => item.location === neighbour);
  assert.ok(formation);
  state.enemyOrders = [{ id: 'EO-VISIBILITY', turn: state.turn, type: 'counterattack', formationId: formation.id, origin: neighbour, target, executeTurn: state.turn + 1, status: 'planned', priority: 100, summary: 'Counterattack preparations detected' }];
  const threats = getThreatenedTerritories(state);
  assert.equal(threats.length, 1);
  assert.equal(threats[0].territoryId, target);
  assert.equal(threats[0].stage, 'imminent');
});

test('critical logistics state produces actionable diagnostics and end-turn acknowledgement', () => {
  const state = newGame(404, 'standard', false);
  const groupId = Object.keys(state.taskGroups)[0];
  state.logistics.networkEfficiency = 35;
  state.logistics.starvedFormationIds = [groupId];
  state.logistics.formationAllocations[groupId] = { ...state.logistics.formationAllocations[groupId], delivered: 0, ratio: 0, condition: 'cut-off' };
  const clarity = getSupplyClarity(state);
  assert.equal(clarity.severity, 'critical');
  assert.ok(clarity.diagnostics.some(item => item.groupId === groupId));
  assert.equal(requiresSupplyAcknowledgement(state), true);
});

test('tutorial advances only when the requested real action is completed', () => {
  let state = newGame(405, 'standard', true);
  state = progressTutorial(state, 'open-logistics');
  assert.equal(state.tutorial.step, 0);
  for (const trigger of ['select-formation', 'issue-move', 'begin-operation', 'set-garrison', 'open-logistics', 'review-intelligence', 'open-engineering']) state = progressTutorial(state, trigger);
  assert.equal(state.tutorial.completed, true);
  assert.equal(state.tutorial.enabled, false);
});

test('version 13 campaigns migrate to version 14 with tutorial disabled', () => {
  const current = newGame(406, 'standard', false);
  const { operationalAwareness, tutorial, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 13 });
  assert.equal(migrated.version, 14);
  assert.equal(migrated.tutorial.enabled, false);
  assert.equal(migrated.operationalAwareness.previousNetworkEfficiency, migrated.logistics.networkEfficiency);
});

test('the interface exposes attack visibility, supply acknowledgement and tutorial controls', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(app, /PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING/);
  assert.match(app, /ENEMY ACTION DETECTED/);
  assert.match(app, /Correctable logistics failures remain/);
  assert.match(app, /TutorialOverlay/);
  assert.match(map, /enemy-contact-marker/);
  assert.match(map, /enemy-concentration-route/);
  assert.match(main, /operational-clarity\.css/);
});
