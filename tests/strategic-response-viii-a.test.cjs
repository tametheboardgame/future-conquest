const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { newGame, endTurn } = require('../.test-dist/engine.js');
const {
  ESCALATION_STAGES,
  getEscalationStage,
  resolveStrategicResponse,
  upgradeStrategicState
} = require('../.test-dist/strategic-response.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('Phase VIII-A defines five visible escalation stages', () => {
  assert.equal(ESCALATION_STAGES.length, 5);
  assert.equal(getEscalationStage(3).label, 'Local response');
  assert.equal(getEscalationStage(31).label, 'Alliance coordination');
  assert.equal(getEscalationStage(80).label, 'Strategic emergency');
});

test('new campaigns carry mobilisation, enemy planning and intelligence state', () => {
  const state = newGame(41, 'standard');
  assert.equal(state.version, 5);
  assert.equal(state.escalationStage, 1);
  assert.ok(state.mobilisationPool > 0);
  assert.deepEqual(state.mobilisations, []);
  assert.deepEqual(state.enemyOrders, []);
  assert.ok(state.intelligenceReports.length >= 1);
});

test('crossing an escalation threshold schedules visible mobilisation', () => {
  const state = newGame(52, 'standard');
  state.escalation = 31;
  const next = resolveStrategicResponse(state);
  assert.equal(next.escalationStage, 3);
  assert.ok(next.mobilisations.some(project => project.id === 'NATIONAL-RESERVE'));
  assert.ok(next.mobilisations.some(project => project.id === 'ALLIED-ARMOURED'));
  assert.ok(next.intelligenceReports.some(report => report.kind === 'mobilisation'));
});

test('mobilisation projects deploy persistent enemy formations on arrival', () => {
  let state = newGame(61, 'standard');
  state.escalation = 31;
  state = resolveStrategicResponse(state);
  state.mobilisations = state.mobilisations.map(project => ({ ...project, arrivalTurn: state.turn }));
  const deployed = resolveStrategicResponse(state);
  assert.ok(deployed.mobilisations.every(project => project.status === 'deployed'));
  assert.ok(Object.keys(deployed.enemyFormations).some(id => id.startsWith('EF-M-')));
});

test('enemy command creates operational intent and intelligence reports', () => {
  const state = newGame(73, 'hard');
  state.escalation = 55;
  const next = resolveStrategicResponse(state);
  assert.ok(next.enemyOrders.length >= 1);
  assert.ok(next.intelligenceReports.some(report => report.kind === 'order'));
});

test('version 4 campaigns upgrade to strategic response version 5', () => {
  const current = newGame(88, 'standard');
  const legacy = { ...current, version: 4 };
  delete legacy.escalationStage;
  delete legacy.mobilisationPool;
  delete legacy.mobilisations;
  delete legacy.enemyOrders;
  delete legacy.intelligenceReports;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 5);
  assert.equal(upgraded.escalationStage, getEscalationStage(upgraded.escalation).id);
  assert.ok(Array.isArray(upgraded.mobilisations));
});

test('the normal daily sequence advances strategic response state', () => {
  const state = newGame(99, 'standard');
  const next = endTurn(state);
  assert.equal(next.turn, 2);
  assert.ok(next.escalation > state.escalation);
  assert.ok(Array.isArray(next.enemyOrders));
});

test('the Intelligence view exposes mobilisation, assessed intent and confidence reports', () => {
  const app = read('src/App.tsx');
  const styles = read('src/strategic-response.css');
  assert.match(app, /MOBILISATION PIPELINE/);
  assert.match(app, /ASSESSED ENEMY INTENT/);
  assert.match(app, /INTELLIGENCE REPORTS/);
  assert.match(app, /Escalation Stage/);
  assert.match(styles, /mobilisation-card/);
  assert.match(styles, /intelligence-report-card/);
});
