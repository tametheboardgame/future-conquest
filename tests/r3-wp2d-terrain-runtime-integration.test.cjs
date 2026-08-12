const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const impl = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const classifier = fs.readFileSync('src/presentation/r3-terrain-runtime-error.ts', 'utf8');

test('WP2D routes MapLibre errors through the explicit terrain runtime classifier', () => {
  assert.match(impl, /import \{ classifyTerrainRuntimeError \} from '\.\.\/presentation\/r3-terrain-runtime-error'/);
  assert.match(impl, /const runtimeError = classifyTerrainRuntimeError\(event\.error\)/);
});

test('WP2D keeps initialisation failures fatal while ignoring only classified transient tile aborts after load', () => {
  assert.match(impl, /if \(!loadedRef\.current\)[\s\S]*fallbackRef\.current\(`Terrain renderer error: \$\{runtimeError\.detail\}`\)/);
  assert.match(impl, /runtimeError\.kind === 'transient-tile-request'/);
  assert.match(impl, /R3 terrain transient tile request ignored/);
  assert.match(impl, /setMessage\(`Terrain source warning · \$\{runtimeError\.detail\}`\)/);
});

test('WP2D transient policy is tightly scoped to generated Terrain-RGB tiles and status-zero or abort signals', () => {
  assert.match(classifier, /generated\\\/r3-terrain\\\/tiles/);
  assert.match(classifier, /failed to fetch\\s\*\\\(0\\\)/i);
  assert.match(classifier, /status === 0/);
  assert.match(classifier, /generatedTerrainTile && cancelledOrStatusZero/);
  assert.match(classifier, /'source-warning'/);
});
