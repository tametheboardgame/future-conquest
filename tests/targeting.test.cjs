const test = require('node:test');
const assert = require('node:assert/strict');
const { newGame } = require('../.test-dist/engine.js');
const { getAdjacentOrderTargets, getOrderTargetInfo } = require('../.test-dist/order-targeting.js');

test('the selected task group always has at least one adjacent order target', () => {
  for (let seed = 0; seed < 15; seed += 1) {
    const state = newGame(seed);
    assert.ok(getAdjacentOrderTargets(state).length > 0);
  }
});

test('adjacent enemy territory is classified as an attack target', () => {
  const state = newGame(0);
  const adjacent = getAdjacentOrderTargets(state)[0];
  state.territories[adjacent].controller = 'enemy';
  assert.deepEqual(getOrderTargetInfo(state, adjacent), {
    kind: 'attack', adjacent: true, territoryId: adjacent
  });
});

test('adjacent controlled territory is classified as a movement target', () => {
  const state = newGame(0);
  const adjacent = getAdjacentOrderTargets(state)[0];
  state.territories[adjacent].controller = 'player';
  assert.deepEqual(getOrderTargetInfo(state, adjacent), {
    kind: 'move', adjacent: true, territoryId: adjacent
  });
});

test('non-adjacent selections remain explicit but out of operational range', () => {
  const state = newGame(0);
  const adjacent = new Set(getAdjacentOrderTargets(state));
  const distant = Object.keys(state.territories).find(id => id !== state.portalTerritory && !adjacent.has(id));
  assert.ok(distant);
  assert.deepEqual(getOrderTargetInfo(state, distant), {
    kind: 'out-of-range', adjacent: false, territoryId: distant
  });
});
