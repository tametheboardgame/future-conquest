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

const createScheduler = () => {
  let now = 0;
  let nextId = 1;
  const callbacks = new Map();
  const cancelled = [];
  return {
    scheduler: {
      now: () => now,
      request: callback => {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      },
      cancel: id => {
        cancelled.push(id);
        callbacks.delete(id);
      }
    },
    flush(timestamp) {
      now = timestamp;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach(callback => callback(timestamp));
    },
    pending: () => callbacks.size,
    cancelled
  };
};

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

test('R3 WP1 camera transition emits start, smooth midpoint and exact destination', () => {
  const from = { x: 0, y: 0, width: 1440, height: 900 };
  const to = { x: 360, y: 225, width: 720, height: 450 };
  const clock = createScheduler();
  const frames = [];

  camera.runCameraTransition(from, to, view => frames.push(view), {
    durationMs: 320,
    scheduler: clock.scheduler
  });

  assert.deepEqual(frames, [from]);
  assert.equal(clock.pending(), 1);
  clock.flush(160);
  assert.deepEqual(frames.at(-1), { x: 180, y: 112.5, width: 1080, height: 675 });
  assert.equal(clock.pending(), 1);
  clock.flush(320);
  assert.deepEqual(frames.at(-1), to);
  assert.equal(clock.pending(), 0);
});

test('R3 WP1 camera transition collapses immediately for reduced motion', () => {
  const from = { x: 0, y: 0, width: 1440, height: 900 };
  const to = { x: 360, y: 225, width: 720, height: 450 };
  const clock = createScheduler();
  const frames = [];

  camera.runCameraTransition(from, to, view => frames.push(view), {
    reducedMotion: true,
    scheduler: clock.scheduler
  });

  assert.deepEqual(frames, [to]);
  assert.equal(clock.pending(), 0);
});

test('R3 WP1 camera transition is cancellable without emitting stale frames', () => {
  const from = { x: 0, y: 0, width: 1440, height: 900 };
  const to = { x: 360, y: 225, width: 720, height: 450 };
  const clock = createScheduler();
  const frames = [];
  const cancel = camera.runCameraTransition(from, to, view => frames.push(view), {
    scheduler: clock.scheduler
  });

  cancel();
  clock.flush(160);
  assert.deepEqual(frames, [from]);
  assert.equal(clock.pending(), 0);
  assert.equal(clock.cancelled.length, 1);
});

test('R3 WP1 camera equivalence uses a small tolerance for animation completion', () => {
  const view = { x: 100, y: 50, width: 800, height: 500 };
  assert.equal(camera.cameraViewsEquivalent(view, { ...view, x: 100.005 }), true);
  assert.equal(camera.cameraViewsEquivalent(view, { ...view, x: 100.02 }), false);
});

test('R3 WP1 camera foundation exposes the default transition duration and geometry boundary', () => {
  assert.equal(camera.R3_CAMERA_TRANSITION_MS, 320);
  assert.match(source, /avoiding any change to authoritative geographic geometry/i);
  assert.match(source, /reduced motion is active/i);
});
