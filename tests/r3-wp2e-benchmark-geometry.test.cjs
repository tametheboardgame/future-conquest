const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'scripts/run-r3-wp2e-performance.mjs'), 'utf8');

test('WP2E benchmark fixes terrain surface geometry across base and head', () => {
  assert.match(source, /const BENCHMARK_MAP_WIDTH = 1100;/);
  assert.match(source, /const BENCHMARK_MAP_HEIGHT = 600;/);
  assert.match(source, /page\.addStyleTag/);
  assert.match(source, /\.map-panel \{/);
  assert.match(source, /\.r3-terrain-prototype-shell/);
  assert.match(source, /benchmarkSurface/);
  assert.match(source, /normalisedAcrossBuilds:\s*true/);
});

test('WP2E benchmark fails rather than silently accepting geometry drift', () => {
  assert.match(source, /BENCHMARK_DIMENSION_TOLERANCE/);
  assert.match(source, /benchmarkWidthDelta/);
  assert.match(source, /benchmarkHeightDelta/);
  assert.match(source, /terrain benchmark surface drifted/);
});
