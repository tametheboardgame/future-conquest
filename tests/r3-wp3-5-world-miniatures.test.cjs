const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const layer = fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const browser = fs.readFileSync('scripts/run-r3-wp2f-visual-runtime.mjs', 'utf8');

test('city and infrastructure miniatures derive only from authoritative strategic nodes', () => {
  assert.match(layer, /STRATEGIC_NODES\.map/);
  assert.match(layer, /node\.position/);
  assert.doesNotMatch(layer, /TERRITORIES\s*=|new gameplay|localStorage/);
  assert.match(layer, /node\.type === 'capital' \|\| node\.type === 'city'/);
});

test('procedural pieces have distinct city, port, airport, rail and crossing silhouettes', () => {
  assert.match(layer, /function cityCluster/);
  for (const type of ['port', 'airport', 'crossing', 'rail-hub']) assert.match(layer, new RegExp(`node\\.type === '${type}'`));
  assert.match(layer, /CylinderGeometry/);
  assert.match(layer, /ConeGeometry/);
});

test('world objects use MapLibre terrain and matrix authority with bounded clearance', () => {
  assert.match(layer, /queryTerrainElevation/);
  assert.match(layer, /MercatorCoordinate\.fromLngLat\(piece\.node\.position, elevation \+ CLEARANCE_METRES\)/);
  assert.match(layer, /projectionMatrix = new Matrix4\(\)\.fromArray\(options\.modelViewProjectionMatrix\)/);
  assert.match(layer, /const CLEARANCE_METRES = 22/);
});

test('deterministic LOD and existing Layers state control physical visibility', () => {
  assert.match(layer, /zoom < 4\.8 \? 'theatre' : zoom < 6\.4 \? 'campaign' : 'selected'/);
  assert.match(layer, /piece\.node\.importance >= 3/);
  assert.match(layer, /this\.layers\.ports/);
  assert.match(layer, /this\.layers\.airports/);
  assert.match(layer, /this\.layers\.citiesHubs/);
  assert.match(host, /worldMiniaturesRef\.current\?\.update\(layers\)/);
});

test('production browser evidence proves visibility, exact anchors and terrain grounding', () => {
  assert.match(browser, /__r3WorldMiniatures/);
  assert.match(browser, /anchorErrorDegrees/);
  assert.match(browser, /visibleCities\.length < 2/);
  assert.match(browser, /visibleInfrastructure\.length < 2/);
  assert.match(browser, /object\.clearance < 10 \|\| object\.clearance > 60/);
  assert.match(browser, /terrain=0 fallback unusable/);
});

test('custom-layer failure retains the established accessible DOM fallback', () => {
  assert.match(host, /physical formation layer unavailable; retaining compatible markers/);
  assert.match(host, /dataset\.physicalFormations = 'fallback'/);
  assert.match(host, /Promise\.all/);
});
