const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

test('terrain and hillshade retain independent raster DEM source instances', () => {
  assert.match(source, /'r3-wp2b-terrain-dem': demSource/);
  assert.match(source, /'r3-wp2b-hillshade-dem': \{ \.\.\.demSource \}/);
  assert.match(source, /terrain: \{\s*source: 'r3-wp2b-terrain-dem'/);
  assert.match(source, /id: 'r3-wp2b-hillshade'[\s\S]*?source: 'r3-wp2b-hillshade-dem'/);
  assert.doesNotMatch(source, /'r3-wp2b-dem'/);
  assert.doesNotMatch(source, /r3-wp2b-relief-dem/);
  assert.doesNotMatch(source, /type: 'color-relief'/);
});
