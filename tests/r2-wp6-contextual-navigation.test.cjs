const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { newGame, selectTaskGroupForNavigation } = require('../.test-dist/engine.js');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const logistics = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
const infrastructure = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
const navigation = fs.readFileSync('src/game/contextual-navigation.ts', 'utf8');
const responsive = fs.readFileSync('src/responsive-command-fit.css', 'utf8');
const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');
const engine = fs.readFileSync('src/game/engine.ts', 'utf8');

test('broken routes retain their exact ID from diagnostics into Infrastructure', () => {
  assert.match(logistics, /onOpenInfrastructure\(item\.routeId, item\.detail\)/);
  assert.match(infrastructure, /setRepairRouteSelection\(routeId\)/);
  assert.match(infrastructure, /data-context-target/);
});

test('adviser warnings preserve and open the exact suicidal-assault operation', () => {
  assert.match(clarity, /operationId: operation\.id, territoryId: operation\.target/);
  assert.match(app, /warning\.operationId[\s\S]*kind: 'operation', id: warning\.operationId/);
  assert.match(app, /data-context-selected=\{navigationContext\?\.target\.kind === 'operation'/);
});

test('formation and territory warnings target the exact object and Defence context', () => {
  assert.match(app, /kind: 'formation', id: group\.id/);
  assert.match(app, /kind: 'territory', id: threat\.territoryId, section: 'defence'/);
  assert.match(app, /Defence assessment and actions are shown/);
});

test('frontline threats only promise Defence at a unique friendly position', () => {
  assert.match(app, /friendlyPositions\.length === 1/);
  assert.match(app, /id: defensivePosition, section: 'defence'/);
  assert.match(app, /id: territory\.id, section: 'intelligence'/);
  assert.match(app, /No unique friendly defensive position can be identified/);
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

test('formation and operation deep-links use tutorial-neutral selection', () => {
  assert.match(engine, /export function selectTaskGroupForNavigation/);
  const helper = engine.slice(engine.indexOf('export function selectTaskGroupForNavigation'), engine.indexOf('export function selectTerritory'));
  assert.doesNotMatch(helper, /progressTutorial/);
  assert.match(app, /target\.kind === 'formation'[\s\S]*selectTaskGroupForNavigation\(current, target\.id\)/);
  assert.match(app, /target\.kind === 'operation'[\s\S]*selectTaskGroupForNavigation\(current, participant\)/);

  const state = newGame(6606, 'standard', true);
  const tutorialBefore = structuredClone(state.tutorial);
  const alternateGroup = Object.keys(state.taskGroups).find(id => id !== state.selectedTaskGroupId);
  const navigated = selectTaskGroupForNavigation(state, alternateGroup);
  assert.deepEqual(navigated.tutorial, tutorialBefore, 'navigation selection must not satisfy select-formation');
  assert.equal(navigated.selectedTaskGroupId, alternateGroup);
});

test('non-contextual target and workspace controls clear stale context', () => {
  assert.match(app, /const openTerritoryOnMap[\s\S]*setNavigationContext\(null\)/);
  assert.match(app, /const openGroupOnMap[\s\S]*setNavigationContext\(null\)/);
  assert.match(app, /FormationRoster[\s\S]*setNavigationContext\(null\)/);
  assert.match(app, /onSelect=\{openTerritoryOnMap\}/);
  assert.match(app, /onSelectGroup=\{openGroupOnMap\}/);
  assert.match(app, /const changeView[\s\S]*setNavigationContext\(null\)/);
  assert.match(infrastructure, /const selectTab[\s\S]*onClearContext\(\)/);
});

test('context banners preserve explanation and remain mobile-safe', () => {
  assert.match(infrastructure, /context\.message/);
  assert.match(responsive, /\.contextual-navigation-banner span \{ overflow-wrap: anywhere; \}/);
  assert.match(responsive, /flex-direction: column/);
  assert.match(responsive, /min-height: 44px/);
});
