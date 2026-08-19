const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { DeterministicSpatialGrid } = require('../.test-dist/spatial-grid.js');

const markerDeclutterSource = readFileSync('src/presentation/r3-terrain-marker-declutter.ts', 'utf8');
const terrainHostSource = readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const accessibilityCss = readFileSync('src/r3-wp8-accessibility.css', 'utf8');

test('spatial grid preserves insertion order while limiting neighbourhood scans', () => {
  const grid = new DeterministicSpatialGrid(64);
  const points = [];
  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x < 100; x += 1) {
      const point = { id: `${x}:${y}`, x: x * 80, y: y * 80 };
      points.push(point);
      grid.insert(point);
    }
  }

  let inspected = 0;
  for (let index = 0; index < points.length; index += 10) {
    const point = points[index];
    const found = grid.someNearby(point.x, point.y, 48, candidate => {
      inspected += 1;
      return candidate.id === point.id;
    });
    assert.equal(found, true);
  }

  assert.ok(inspected < 10000, `expected localised scans, inspected ${inspected} candidates`);
});

test('spatial grid rejects invalid cell sizes and safely ignores invalid points', () => {
  assert.throws(() => new DeterministicSpatialGrid(0), RangeError);
  const grid = new DeterministicSpatialGrid(32);
  grid.insert({ id: 'invalid', x: Number.NaN, y: 0 });
  assert.equal(grid.someNearby(0, 0, 64, () => true), false);
});

test('terrain declutter uses the deterministic spatial index instead of an all-pairs accepted scan', () => {
  assert.match(markerDeclutterSource, /new DeterministicSpatialGrid/);
  assert.match(markerDeclutterSource, /accepted\.someNearby/);
  assert.doesNotMatch(markerDeclutterSource, /accepted\.some\(/);
});

test('terrain host exposes repeatable motion, colour and Escape recovery controls', () => {
  assert.match(terrainHostSource, /data-reduced-motion/);
  assert.match(terrainHostSource, /data-colour-blind-assist/);
  assert.match(terrainHostSource, /motionScale/);
  assert.match(terrainHostSource, /event\.key !== 'Escape'/);
  assert.match(terrainHostSource, /moveCamera\('theatre', true\)/);
  assert.match(terrainHostSource, /prefers-reduced-motion: reduce/);
});

test('colour-blind and keyboard focus treatment adds non-colour interaction cues', () => {
  assert.match(accessibilityCss, /focus-visible/);
  assert.match(accessibilityCss, /outline-style: double/);
  assert.match(accessibilityCss, /outline: 3px dashed/);
  assert.match(accessibilityCss, /outline: 3px dotted/);
});
