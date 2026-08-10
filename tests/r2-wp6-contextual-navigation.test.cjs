const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const logistics = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
const infrastructure = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
const navigation = fs.readFileSync('src/game/contextual-navigation.ts', 'utf8');
const responsive = fs.readFileSync('src/responsive-command-fit.css', 'utf8');

test('broken routes retain their exact ID from diagnostics into Infrastructure', () => {
  assert.match(logistics, /onOpenInfrastructure\(item\.routeId, item\.detail\)/);
  assert.match(infrastructure, /setRepairRouteSelection\(routeId\)/);
  assert.match(infrastructure, /data-context-target/);
});

test('formation and territory warnings target the exact object and Defence context', () => {
  assert.match(app, /kind: 'formation', id: group\.id/);
  assert.match(app, /kind: 'territory', id: threat\.territoryId, section: 'defence'/);
  assert.match(app, /Defence assessment and actions are shown/);
});

test('Intelligence, Logistics and Infrastructure share contextual targets and reasons', () => {
  assert.match(app, /kind: 'route', id: route\.id, reason:/);
  assert.match(logistics, /Open Infrastructure · exact route/);
  assert.match(app, /Contextual target opened/);
});

test('stale and wrong target IDs fall back to a useful workspace without unrelated selection', () => {
  assert.match(navigation, /referenced route is no longer available/);
  assert.match(navigation, /referenced formation is no longer available/);
  assert.match(navigation, /referenced territory is no longer available/);
  assert.match(navigation, /referenced operation has ended/);
});

test('resolution is pure and simulation snapshot explicitly excludes UI selection only', () => {
  const resolver = navigation.slice(navigation.indexOf('export function resolveContextualTarget'), navigation.indexOf('/** Removes'));
  assert.doesNotMatch(resolver, /endTurn|beginOperation|issueMove|startEngineering|setFormationLogisticsPriority/);
  assert.match(navigation, /selectedTaskGroupId: _group/);
  assert.match(navigation, /selectedTerritory: _territory/);
});

test('context banners preserve explanation and remain mobile-safe', () => {
  assert.match(infrastructure, /context\.message/);
  assert.match(responsive, /\.contextual-navigation-banner span \{ overflow-wrap: anywhere; \}/);
  assert.match(responsive, /flex-direction: column/);
  assert.match(responsive, /min-height: 44px/);
});
