const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/presentation/r3-camera-transition.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;
const moduleRecord = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, moduleRecord, moduleRecord.exports);
const camera = moduleRecord.exports;

test('R3 WP1 camera easing is deterministic and clamps invalid progress', () => {
  assert.equal(camera.easeCameraProgress(0), 0);
  assert.equal(camera.easeCameraProgress(0.5), 0.5);
  assert.equal(camera.easeCameraProgress(1), 1);
  assert.equal(camera.easeCameraProgress(-2), 0);
  assert.equal(camera.easeCameraProgress(4), 1);
  assert.equal(camera.easeCameraProgress(Number.NaN), 0);
});

test('R3 WP1 camera transition preserves exact endpoints and viewport aspect', () => {
  const from = { x: 0, y: 0, width: 1440, height: 900 };
  const to = { x: 360, y: 225, width: 720, height: 450 };

  assert.deepEqual(camera.interpolateMapView(from, to, 0), from);
  assert.deepEqual(camera.interpolateMapView(from, to, 1), to);

  const midpoint = camera.interpolateMapView(from, to, 0.5);
  assert.equal(midpoint.x, 180);
  assert.equal(midpoint.y, 112.5);
  assert.equal(midpoint.width / midpoint.height, 1.6);
  assert.ok(midpoint.x >= from.x && midpoint.x <= to.x);
  assert.ok(midpoint.width <= from.width && midpoint.width >= to.width);
});

test('R3 WP1 camera equivalence uses a small tolerance for animation completion', () => {
  const view = { x: 100, y: 50, width: 800, height: 500 };
  assert.equal(camera.cameraViewsEquivalent(view, { ...view, x: 100.005 }), true);
  assert.equal(camera.cameraViewsEquivalent(view, { ...view, x: 100.02 }), false);
});

test('R3 WP1 camera foundation exposes a reduced-motion-friendly transition duration', () => {
  assert.equal(camera.R3_CAMERA_TRANSITION_MS, 320);
  assert.match(source, /avoiding any change to authoritative geographic geometry/i);
});
