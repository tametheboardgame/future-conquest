const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const layer = fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts', 'utf8');
const strategicNodes = fs.readFileSync('src/game/strategic-network-data.ts', 'utf8');
const design = fs.readFileSync('docs/roadmap/R3-WP3.8A-LANDMARK-CITIES-PASS-1-DESIGN.md', 'utf8');

test('WP3.8A is limited to the approved London, Paris and Brussels strategic nodes', () => {
  for (const [id, name] of [['N-LONDON', 'London'], ['N-PARIS', 'Paris'], ['N-BRUSSELS', 'Brussels']]) {
    assert.match(strategicNodes, new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(layer, new RegExp(`node\\.id === '${id}'`));
  }
  assert.match(layer, /return genericCityCluster\(node\)/);
  assert.doesNotMatch(layer, /node\.position\s*=/);
});

test('London uses Elizabeth Tower and Westminster silhouette language', () => {
  assert.match(layer, /function londonLandmarkCity/);
  assert.match(layer, /Elizabeth Tower \/ Big Ben/);
  assert.match(layer, /Palace of Westminster/);
  assert.match(layer, /cityVariant = 'london'/);
});

test('Paris uses Eiffel Tower, Arc de Triomphe and supporting Haussmann blocks', () => {
  assert.match(layer, /function parisLandmarkCity/);
  assert.match(layer, /Eiffel Tower/);
  assert.match(layer, /Arc de Triomphe/);
  assert.match(layer, /const haussmann = new Group/);
  assert.match(layer, /cityVariant = 'paris'/);
});

test('Brussels uses procedural Atomium and Gothic town-hall silhouette language', () => {
  assert.match(layer, /function brusselsLandmarkCity/);
  assert.match(layer, /SphereGeometry/);
  assert.match(layer, /function atomiumRod/);
  assert.match(layer, /Atomium/);
  assert.match(layer, /Brussels Town Hall \/ Grand-Place spire/);
  assert.match(layer, /cityVariant = 'brussels'/);
});

test('Pass 1 establishes reusable model LOD while preserving existing world visibility rules', () => {
  assert.match(layer, /type WorldLod = 'theatre' \| 'campaign' \| 'selected'/);
  assert.match(layer, /function tagLod/);
  assert.match(layer, /function applyModelLod/);
  assert.match(layer, /tagLod\(westminster, 'campaign'\)/);
  assert.match(layer, /tagLod\(arc, 'campaign'\)/);
  assert.match(layer, /tagLod\(townHall, 'campaign'\)/);
  assert.match(layer, /piece\.node\.importance >= 3/);
  assert.match(layer, /this\.layers\.citiesHubs/);
});

test('runtime evidence identifies bespoke variants and their landmark sources', () => {
  assert.match(layer, /cityVariant\?: CityVariant/);
  assert.match(layer, /landmarks\?: readonly string\[\]/);
  assert.match(layer, /cityVariant: piece\.cityVariant/);
  assert.match(layer, /landmarks: piece\.landmarks/);
});

test('models are self-created procedural geometry and the design lock records later-pass rules', () => {
  assert.match(design, /No third-party meshes, textures or runtime model hosting/i);
  assert.match(design, /dominant landmark/i);
  assert.match(design, /Campaign/);
  assert.match(design, /Theatre/);
  assert.match(design, /Selected/);
  assert.match(design, /authoritative `STRATEGIC_NODES` coordinates/i);
});
