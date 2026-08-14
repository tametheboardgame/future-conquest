const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const layer = fs.readFileSync('src/presentation/r3-formation-miniatures-layer.ts', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');

test('WP3.5 formation miniatures use a MapLibre custom 3D layer with procedural physical geometry', () => {
  assert.match(layer, /implements CustomLayerInterface/);
  assert.match(layer, /renderingMode = '3d'/);
  assert.match(layer, /new WebGLRenderer\(\{ canvas: map\.getCanvas\(\), context: gl/);
  assert.match(layer, /for \(const \[x, y\] of \[\[-0\.5, -0\.2\].*\[0\.25, 0\.55\]/s);
  assert.match(layer, /CylinderGeometry/);
  assert.match(layer, /ConeGeometry/);
});

test('WP3.5 custom pieces derive geographic state, terrain elevation, state language and deterministic LOD', () => {
  assert.match(layer, /formationPresentationPosition\(group, terrainOperationalTerritoryCentres\)/);
  assert.match(layer, /queryTerrainElevation\(lngLat\)/);
  assert.match(layer, /CLEARANCE_METRES/);
  for (const status of ['ready', 'moving', 'attacking', 'garrison', 'recovering', 'engineering', 'interdicting']) {
    assert.match(layer, new RegExp(`${status}: 0x`));
  }
  assert.match(layer, /zoom < 4\.8 \? 0\.55 : zoom < 6\.4 \? 0\.78 : 1/);
});

test('WP3.5 smoothing remains presentation-only and reduced motion settles immediately', () => {
  assert.match(layer, /this\.reducedMotion \? 1 : 1 - Math\.exp\(-elapsed \/ 135\)/);
  assert.match(layer, /this\.map\.triggerRepaint\(\)/);
  assert.doesNotMatch(layer, /state\.taskGroups\[[^\]]+\]\s*=/);
  assert.doesNotMatch(layer, /order\.progress\s*=/);
});

test('WP3.5 retains DOM formation interaction and renderer-failure fallback', () => {
  assert.match(host, /map\.addLayer\(miniatureLayer\)/);
  assert.match(host, /retaining compatible markers/);
  assert.match(css, /data-physical-formations='ready'.*r3-terrain-task-group-marker/s);
  assert.match(css, /r3-terrain-task-group-marker:focus-visible/);
});
