const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync('src/presentation/r3-formation-movement.ts', 'utf8');
const pureStart = source.indexOf('const clamp01');
const pureEnd = source.indexOf('export function formationPresentationPosition');
const pureSource = stripTypeScriptTypes(source.slice(pureStart, pureEnd).replace('export function interpolateFormationPath', 'function interpolateFormationPath'));
const context = vm.createContext({ Math, globalThis: null });
context.globalThis = context;
vm.runInContext(`${pureSource}\nglobalThis.interpolate = interpolateFormationPath;`, context);
const interpolate = (points, progress) => Array.from(context.interpolate(points, progress));

test('WP3 movement interpolation follows the complete presentation path by distance', () => {
  assert.deepEqual(interpolate([[0, 0], [2, 0]], 0), [0, 0]);
  assert.deepEqual(interpolate([[0, 0], [2, 0]], 0.5), [1, 0]);
  assert.deepEqual(interpolate([[0, 0], [2, 0]], 1), [2, 0]);
  assert.deepEqual(interpolate([[0, 0], [1, 0], [1, 1]], 0.25), [0.5, 0]);
  assert.deepEqual(interpolate([[0, 0], [1, 0], [1, 1]], 0.75), [1, 0.5]);
});

test('WP3 formation movement is presentation-only and route-aware', () => {
  assert.match(source, /group\.status !== 'moving'/);
  assert.match(source, /order\?\.type !== 'move'/);
  assert.match(source, /order\.progress \/ 100/);
  assert.match(source, /STRATEGIC_ROUTES\.find/);
  assert.match(source, /STRATEGIC_NODES\.find/);
  assert.match(source, /route\.fromTerritoryId === group\.location/);
  assert.match(source, /route\.toTerritoryId === group\.location/);
  assert.doesNotMatch(source, /group\.location\s*=/);
  assert.doesNotMatch(source, /order\.progress\s*=/);
  assert.doesNotMatch(source, /group\.order\s*=/);
});
