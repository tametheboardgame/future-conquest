from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"{path}: expected {expected} matches, found {count}: {old!r}")
    file.write_text(text.replace(old, new))


replace_once(
    'tests/engine.test.cjs',
    """test('mountain movement requires more than one resolved day', () => {
  let state = makePlayerTerritory(newGame(12), 'CH-02');
  state = targetState(state, 'TG-1', 'CH-02');
  state = issueMove(state);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-01');
  assert.equal(state.taskGroups['TG-1'].status, 'moving');
  assert.equal(state.taskGroups['TG-1'].order.progress, 58);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-02');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
});""",
    """test('the selected Alpine route requires more than one resolved day', () => {
  let state = makePlayerTerritory(newGame(12), 'CH-02');
  state = targetState(state, 'TG-1', 'CH-02');
  state = issueMove(state);
  assert.ok(state.taskGroups['TG-1'].order.routeId);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-01');
  assert.equal(state.taskGroups['TG-1'].status, 'moving');
  assert.equal(state.taskGroups['TG-1'].order.progress, 50);
  state = endTurn(state);
  assert.equal(state.taskGroups['TG-1'].location, 'CH-02');
  assert.equal(state.taskGroups['TG-1'].status, 'ready');
});"""
)
replace_once(
    'tests/engine.test.cjs',
    "assert.equal(loaded.version, 6);",
    "assert.equal(loaded.version, 7);"
)

replace_once(
    'tests/formation-organisation.test.cjs',
    "test('version 3 concurrent-operation saves migrate to version 6', () => {",
    "test('version 3 concurrent-operation saves migrate to version 7', () => {"
)
replace_once(
    'tests/formation-organisation.test.cjs',
    "assert.equal(loaded.version, 6);",
    "assert.equal(loaded.version, 7);"
)

replace_once(
    'tests/persistence.test.cjs',
    """  LEGACY_V4_SAVE_KEY,
  SAVE_METADATA_KEY,""",
    """  LEGACY_V4_SAVE_KEY,
  LEGACY_V6_SAVE_KEY,
  SAVE_METADATA_KEY,"""
)
replace_once('tests/persistence.test.cjs', '    saveVersion: 6,', '    saveVersion: 7,')
replace_once(
    'tests/persistence.test.cjs',
    "test('a current version 6 save is inspected with its matching metadata', () => {",
    "test('a current version 7 save is inspected with its matching metadata', () => {"
)
replace_once(
    'tests/persistence.test.cjs',
    "assert.equal(result.source, 'v6');",
    "assert.equal(result.source, 'v7');"
)
replace_once(
    'tests/persistence.test.cjs',
    """test('missing, corrupted and unsupported saves produce explicit failures', () => {""",
    """test('a version 6 save migrates through the legacy key into version 7', () => {
  const legacy = newGame(2);
  legacy.version = 6;
  const setup = installStorage([[LEGACY_V6_SAVE_KEY, JSON.stringify(legacy)]]);
  const result = inspectStoredCampaign(setup.storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v6');
  assert.equal(result.state.version, 7);
});

test('missing, corrupted and unsupported saves produce explicit failures', () => {"""
)
replace_once(
    'tests/persistence.test.cjs',
    "test('version 4, version 3 and version 2 saves migrate into version 6', () => {",
    "test('version 4, version 3 and version 2 saves migrate into version 7', () => {"
)
replace_count(
    'tests/persistence.test.cjs',
    'assert.equal(result.state.version, 6);',
    'assert.equal(result.state.version, 7);',
    3
)

replace_once(
    'tests/strategic-network-viii-b1.test.cjs',
    "test('new campaigns persist route condition state at save version 6', () => {",
    "test('new campaigns retain the B1 route condition state at save version 7', () => {"
)
replace_count(
    'tests/strategic-network-viii-b1.test.cjs',
    'assert.equal(state.version, 6);',
    'assert.equal(state.version, 7);',
    1
)
replace_count(
    'tests/strategic-network-viii-b1.test.cjs',
    'assert.equal(upgraded.version, 6);',
    'assert.equal(upgraded.version, 7);',
    1
)

replace_count(
    'tests/strategic-response-viii-a.test.cjs',
    'assert.equal(state.version, 6);',
    'assert.equal(state.version, 7);',
    1
)
replace_once(
    'tests/strategic-response-viii-a.test.cjs',
    "test('version 4 campaigns upgrade to strategic network version 6', () => {",
    "test('version 4 campaigns upgrade through the strategic network to version 7', () => {"
)
replace_count(
    'tests/strategic-response-viii-a.test.cjs',
    'assert.equal(upgraded.version, 6);',
    'assert.equal(upgraded.version, 7);',
    1
)

Path('tests/targeting.test.cjs').write_text("""const test = require('node:test');
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
""")

print('Phase VIII-B2 regression expectations updated.')
