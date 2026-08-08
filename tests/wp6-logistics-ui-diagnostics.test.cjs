const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame } = require('../.test-dist/engine.js');
const { getSupplyClarity } = require('../.test-dist/operational-clarity.js');

test('supply diagnostics remain queryable when the network is healthy', () => {
  const state = newGame(1601, 'standard', false);
  const clarity = getSupplyClarity(state);
  assert.ok(clarity);
  assert.ok(['normal', 'warning', 'danger', 'critical'].includes(clarity.severity));
  assert.ok(Array.isArray(clarity.diagnostics));
});

test('WP6 Logistics uses one command surface with internal tabs', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const component = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
  assert.doesNotMatch(app, /currentView === 'logistics' && <div className="logistics-command-stack"/);
  assert.match(app, /onOpenInfrastructure=\{\(\) => changeView\('engineering'\)\}/);
  assert.match(component, /type LogisticsTab = 'overview' \| 'formations' \| 'administration' \| 'diagnostics'/);
  assert.match(component, /Review diagnostics/);
  assert.match(component, /Diagnostics are always available/);
});

test('WP6 explains distributed sources, network delivery and carried stocks', () => {
  const component = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
  assert.match(component, /Territorial sources/);
  assert.match(component, /Network delivery/);
  assert.match(component, /Carried stocks/);
  assert.match(component, /former portal is not a permanent supply source/);
  assert.match(component, /temporary network break draws those stocks down/);
});

test('WP6 diagnostics route the player to an actionable command area', () => {
  const component = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
  assert.match(component, /Open formation/);
  assert.match(component, /Open Infrastructure/);
  assert.match(component, /Open territory/);
  assert.match(component, /Review priorities/);
  assert.match(component, /Priority decides who receives scarce throughput first\. It cannot repair a destroyed route or create source capacity/);
});

test('WP6 removes nested list scrolling from Logistics', () => {
  const css = fs.readFileSync('src/logistics-priorities.css', 'utf8');
  assert.doesNotMatch(css, /max-height:\s*700px/);
  assert.doesNotMatch(css, /\.logistics-priority-list\.compact\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /The command-view is the single scrolling surface/);
  assert.match(css, /\.logistics-tabs/);
});

test('healthy diagnostics still provide an explicit useful state', () => {
  const component = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
  assert.match(component, /No active supply fault/);
  assert.match(component, /Review priorities anyway/);
});
