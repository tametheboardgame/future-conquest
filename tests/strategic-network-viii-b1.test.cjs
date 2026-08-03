const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TERRITORIES } = require('../.test-dist/data.js');
const { newGame } = require('../.test-dist/engine.js');
const {
  STRATEGIC_NODES,
  STRATEGIC_ROUTES,
  STRATEGIC_NODE_BY_ID
} = require('../.test-dist/strategic-network-data.js');
const {
  createRouteStates,
  normaliseRouteStates,
  nodesForTerritory,
  routesBetween,
  routesForTerritory
} = require('../.test-dist/strategic-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('Phase VIII-B1 defines a strategic network for the fifteen-territory campaign', () => {
  assert.equal(STRATEGIC_NODES.length, 32);
  assert.equal(STRATEGIC_ROUTES.length, 36);
  for (const territoryId of Object.keys(TERRITORIES)) {
    assert.ok(nodesForTerritory(territoryId).length >= 1, `${territoryId} has no strategic node`);
    assert.ok(routesForTerritory(territoryId).length >= 1, `${territoryId} has no strategic route`);
  }
});

test('every existing territory adjacency is represented by at least one explicit route', () => {
  for (const territory of Object.values(TERRITORIES)) {
    for (const neighbour of territory.neighbours) {
      assert.ok(
        routesBetween(territory.id, neighbour).length >= 1,
        `${territory.id}–${neighbour} has no route`
      );
    }
  }
});

test('route endpoints reference valid nodes inside their declared territories', () => {
  for (const route of STRATEGIC_ROUTES) {
    const from = STRATEGIC_NODE_BY_ID[route.fromNodeId];
    const to = STRATEGIC_NODE_BY_ID[route.toNodeId];
    assert.ok(from, `${route.id} has an invalid origin node`);
    assert.ok(to, `${route.id} has an invalid destination node`);
    assert.equal(from.territoryId, route.fromTerritoryId);
    assert.equal(to.territoryId, route.toTerritoryId);
    assert.ok(route.capacity > 0);
    assert.ok(route.supplyCapacity > 0);
    assert.ok(route.movementDays >= 1);
  }
});

test('new campaigns retain the B1 route condition state at save version 7', () => {
  const state = newGame(121, 'standard');
  assert.equal(state.version, 7);
  assert.equal(Object.keys(state.routeStates).length, STRATEGIC_ROUTES.length);
  assert.ok(Object.values(state.routeStates).every(route => route.status === 'open'));
});

test('version 5 campaigns gain a complete strategic route state during migration', () => {
  const current = newGame(122, 'standard');
  const legacy = { ...current, version: 5 };
  delete legacy.routeStates;
  const upgraded = upgradeStrategicState(legacy);
  assert.equal(upgraded.version, 7);
  assert.deepEqual(upgraded.routeStates, createRouteStates());
});

test('route-state normalisation preserves valid damage while repairing malformed data', () => {
  const routeId = STRATEGIC_ROUTES[0].id;
  const states = normaliseRouteStates({
    [routeId]: { status: 'damaged', condition: 42, capacityModifier: .7 },
    invalid: { status: 'destroyed' }
  });
  assert.equal(states[routeId].status, 'damaged');
  assert.equal(states[routeId].condition, 42);
  assert.equal(states[routeId].capacityModifier, .7);
  assert.equal(Object.keys(states).length, STRATEGIC_ROUTES.length);
});

test('the map and territory panel expose independently controlled network layers', () => {
  const map = read('src/components/MapView.tsx');
  const app = read('src/App.tsx');
  const styles = read('src/strategic-network.css');
  const main = read('src/main.tsx');
  assert.match(map, /Strategic routes/);
  assert.match(map, /Cities and hubs/);
  assert.match(map, /Ports/);
  assert.match(map, /Airports/);
  assert.match(map, /strategic-route/);
  assert.match(map, /strategic-node/);
  assert.match(app, /STRATEGIC INFRASTRUCTURE/);
  assert.match(app, /ROUTE CONNECTIONS/);
  assert.match(styles, /\.strategic-route/);
  assert.match(styles, /\.strategic-node/);
  assert.ok(main.indexOf("./strategic-network.css") > main.indexOf("./map-label-hierarchy.css"));
});

test('strategic network overlays cannot intercept territory or formation selection', () => {
  const styles = read('src/strategic-network.css');
  assert.match(styles, /\.europe-map \.strategic-route\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(styles, /\.europe-map \.strategic-node\s*\{[\s\S]*pointer-events:\s*none/);
});
