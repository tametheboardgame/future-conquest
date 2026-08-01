const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const app = readFileSync('src/App.tsx', 'utf8');
const map = readFileSync('src/components/MapView.tsx', 'utf8');
const engine = readFileSync('src/game/engine.ts', 'utf8');
const types = readFileSync('src/game/types.ts', 'utf8');

test('game state stores an operations collection rather than a single battle', () => {
  assert.match(types, /operations:\s*Record<string, Operation>/);
  assert.doesNotMatch(types, /battle:\s*Battle/);
});

test('the command interface exposes active operations and joining reinforcement', () => {
  assert.match(app, /ACTIVE OPERATIONS/);
  assert.match(app, /Join operation/);
  assert.match(app, /Resolve all orders/);
  assert.doesNotMatch(app, /!state\.battle/);
});

test('the map renders every active operation target and route', () => {
  assert.match(map, /Object\.values\(state\.operations\)/);
  assert.match(map, /className="operation-route"/);
  assert.match(map, /operation\.participantGroupIds/);
});

test('the engine resolves all operations as part of the daily sequence', () => {
  assert.match(engine, /function resolveOperations/);
  assert.match(engine, /next = resolveOperations\(next\)/);
  assert.match(engine, /getOperationAtTarget/);
});
