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

test('London is now an Elizabeth Tower hero model rather than a generic city cluster', () => {
  assert.match(layer, /function addElizabethClockFaces/);
  assert.match(layer, /axis: 'x'.*direction: -1/);
  assert.match(layer, /axis: 'y'.*direction: 1/);
  assert.match(layer, /const clockStage = centredBox\(0\.49, 0\.49, 0\.34/);
  assert.match(layer, /const belfry = new Group/);
  assert.match(layer, /const roof = new Mesh\(new ConeGeometry\(0\.3, 0\.46, 4\)/);
  assert.match(layer, /Elizabeth Tower \/ Big Ben/);
  assert.match(layer, /Palace of Westminster/);
  assert.doesNotMatch(layer, /const supporting = new Group/);
});

test('Paris uses a properly flared Eiffel Tower hierarchy with lattice bracing', () => {
  assert.match(layer, /function addEiffelBracing/);
  assert.match(layer, /const basePoints = \[/);
  assert.match(layer, /const firstDeckPoints = \[/);
  assert.match(layer, /const secondDeckPoints = \[/);
  assert.match(layer, /const crownPoints = \[/);
  assert.match(layer, /beamBetween\(basePoints\[i\], firstDeckPoints\[i\]/);
  assert.match(layer, /addEiffelBracing\(bracing, basePoints, firstDeckPoints\)/);
  assert.match(layer, /Eiffel Tower/);
  assert.match(layer, /Arc de Triomphe/);
  assert.doesNotMatch(layer, /const haussmann = new Group/);
});

test('Brussels Atomium models the body-centred cubic nine-sphere structure', () => {
  assert.match(layer, /new Quaternion\(\)\.setFromUnitVectors/);
  assert.match(layer, /const cubeSigns = \[/);
  assert.match(layer, /const centrePoint = new Vector3/);
  assert.match(layer, /for \(const point of \[\.\.\.atomiumPoints, centrePoint\]\)/);
  assert.match(layer, /differentAxes === 1/);
  assert.match(layer, /beamBetween\(atomiumPoints\[i\], centrePoint/);
  assert.match(layer, /Atomium/);
  assert.match(layer, /Brussels Town Hall \/ Grand-Place spire/);
});

test('hero landmark detail is LOD-controlled while core silhouettes survive Theatre view', () => {
  assert.match(layer, /type WorldLod = 'theatre' \| 'campaign' \| 'selected'/);
  assert.match(layer, /function tagLod/);
  assert.match(layer, /function applyModelLod/);
  assert.match(layer, /tagLod\(clocks, 'campaign'\)/);
  assert.match(layer, /tagLod\(bracing, 'campaign'\)/);
  assert.match(layer, /tagLod\(antenna, 'campaign'\)/);
  assert.match(layer, /tagLod\(finials, 'selected'\)/);
  assert.match(layer, /piece\.node\.importance >= 3/);
  assert.match(layer, /this\.layers\.citiesHubs/);
});

test('runtime evidence identifies bespoke variants and their landmark sources', () => {
  assert.match(layer, /cityVariant\?: CityVariant/);
  assert.match(layer, /landmarks\?: readonly string\[\]/);
  assert.match(layer, /cityVariant: piece\.cityVariant/);
  assert.match(layer, /landmarks: piece\.landmarks/);
});

test('design lock records the approved hero-landmark accuracy direction', () => {
  assert.match(design, /approved visual direction/i);
  assert.match(design, /accuracy of the hero landmark/i);
  assert.match(design, /Elizabeth Tower/i);
  assert.match(design, /Eiffel Tower/i);
  assert.match(design, /body-centred cubic/i);
  assert.match(design, /No third-party meshes, textures or runtime model hosting/i);
  assert.match(design, /authoritative `STRATEGIC_NODES` coordinates/i);
});
