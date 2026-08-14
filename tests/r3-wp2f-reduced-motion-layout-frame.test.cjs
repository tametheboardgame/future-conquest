const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');

const source = fs.readFileSync('src/presentation/r3-coalesced-frame-task.ts', 'utf8');
const moduleUnderTest = { exports: {} };
const executable = stripTypeScriptTypes(source.replace('export const createCoalescedFrameTask', 'const createCoalescedFrameTask'), { mode: 'strip' })
  + '\nmodule.exports = { createCoalescedFrameTask };';
vm.runInNewContext(executable, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { createCoalescedFrameTask } = moduleUnderTest.exports;

test('zero-duration moveend defers and coalesces marker layout until the next frame', () => {
  const frames = new Map();
  let nextFrame = 1;
  let layouts = 0;
  const task = createCoalescedFrameTask({
    request(callback) {
      const handle = nextFrame++;
      frames.set(handle, callback);
      return handle;
    },
    cancel(handle) { frames.delete(handle); }
  }, () => { layouts += 1; });

  // These calls model synchronous moveend emissions from a duration: 0 easeTo.
  task.schedule();
  task.schedule();
  assert.equal(layouts, 0, 'layout must not execute in the click/moveend call stack');
  assert.equal(frames.size, 1, 'repeated moveend events are coalesced');

  const callback = frames.values().next().value;
  frames.clear();
  callback(0);
  assert.equal(layouts, 1, 'deferred layout executes on the next frame');
});

test('cleanup cancels a pending marker-layout frame', () => {
  const frames = new Map();
  const task = createCoalescedFrameTask({
    request(callback) { frames.set(7, callback); return 7; },
    cancel(handle) { frames.delete(handle); }
  }, () => assert.fail('cancelled layout ran'));

  task.schedule();
  task.cancel();
  assert.equal(frames.size, 0);
});
