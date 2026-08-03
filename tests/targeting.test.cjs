const test = require('node:test');
const assert = require('node:assert/strict');
const { newGame } = require('../.test-dist/engine.js');
const { getAdjacentOrderTargets, getOrderTargetInfo } = require('../.test-dist/order-targeting.js');

test('the selected task group always has at least one route-connected order target', () => {
  for (let seed = 0; seed < 15; seed += 1) {
    const state = newGame(seed);
    assert.ok(getAdjacentOrderTargets(state).length > 0);
  }
});

test('route-connected enemy territory is classified as an attack target', () => {
  const state = newGame(0);
  const adjacent = getAdjacentOrderTargets(state)[0];
  state.territories[adjacent].controller = 'enemy';
  const info = getOrderTargetInfo(state, adjacent);
  assert.equal(info.kind, 'attack');
  assert.equal(info.adjacent, true);
  assert.equal(info.territoryId, adjacent);
  assert.ok(info.routeIds.length >= 1);
  assert.ok(info.availableRouteIds.length >= 1);
  assert.ok(info.recommendedRouteId);
});

test('route-connected controlled territory is classified as a movement target', () => {
  const state = newGame(0);
  const adjacent = getAdjacentOrderTargets(state)[0];
  state.territories[adjacent].controller = 'player';
  const info = getOrderTargetInfo(state, adjacent);
  assert.equal(info.kind, 'move');
  assert.equal(info.adjacent, true);
  assert.equal(info.territoryId, adjacent);
  assert.ok(info.availableRouteIds.includes(info.recommendedRouteId));
});

test('non-connected selections remain explicit but out of operational range', () => {
  const state = newGame(0);
  const adjacent = new Set(getAdjacentOrderTargets(state));
  const distant = Object.keys(state.territories).find(id => id !== state.portalTerritory && !adjacent.has(id));
  assert.ok(distant);
  const info = getOrderTargetInfo(state, distant);
  assert.equal(info.kind, 'out-of-range');
  assert.equal(info.adjacent, false);
  assert.equal(info.territoryId, distant);
  assert.deepEqual(info.routeIds, []);
  assert.deepEqual(info.availableRouteIds, []);
});
