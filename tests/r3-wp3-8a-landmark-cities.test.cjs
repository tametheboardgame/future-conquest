const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { gunzipSync } = require('node:zlib');

const layer = fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts', 'utf8');
const assets = fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts', 'utf8');
const build = fs.readFileSync('scripts/build-r3-landmark-miniature-assets.mjs', 'utf8');
const strategicNodes = fs.readFileSync('src/game/strategic-network-data.ts', 'utf8');
const design = fs.readFileSync('docs/roadmap/R3-WP3.8A-LANDMARK-CITIES-PASS-1-DESIGN.md', 'utf8');

const londonSources = [
  'src/assets/landmarks/wp3-8a/london-selected.gltf.gz.b64',
  'src/assets/landmarks/wp3-8a/london-selected.gltf.gz.b64.tail01',
  'src/assets/landmarks/wp3-8a/london-selected.gltf.gz.b64.tail02'
];

test('WP3.8A v2 preserves the approved London, Paris and Brussels strategic-node scope', () => {
  for (const [id, name] of [['N-LONDON', 'London'], ['N-PARIS', 'Paris'], ['N-BRUSSELS', 'Brussels']]) {
    assert.match(strategicNodes, new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(assets, new RegExp(`nodeId: '${id}'`));
  }
  assert.match(layer, /return genericCityCluster\(node\)/);
  assert.doesNotMatch(layer, /node\.position\s*=/);
});

test('approved board-game miniature manifest drives the new authored asset path', () => {
  assert.match(assets, /wp3\.8a-v2-london-selected/);
  assert.match(assets, /london-approved-reference\.webp/);
  assert.match(assets, /selectedUrl: assetUrl\('london-selected\.gltf'\)/);
  assert.match(assets, /authoredFaceCount: 3352/);
  assert.match(assets, /rollout: 'runtime'/);
  assert.match(assets, /wp3\.8a-v2-paris-selected/);
  assert.match(assets, /rollout: 'authoring'/);
  assert.match(assets, /wp3\.8a-v2-brussels-selected/);
});

test('committed London source reconstructs exactly to a non-trivial embedded glTF 2.0 miniature', () => {
  const encoded = londonSources
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('')
    .replace(/\s+/g, '');
  assert.equal(encoded.length, 35972, 'London compressed source was truncated or duplicated');
  assert.ok(fs.statSync(londonSources[1]).size <= 8000 && fs.statSync(londonSources[2]).size <= 8997,
    'London continuation parts exceed connector-safe size');
  const document = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
  assert.equal(document.asset.version, '2.0');
  assert.ok(document.meshes.length >= 8, 'authored miniature should contain multiple detailed mesh/material groups');
  assert.ok(document.materials.length >= 6, 'authored miniature should carry a board-piece material palette');
  assert.match(document.buffers[0].uri, /^data:application\/octet-stream;base64,/);
});

test('build emits self-hosted landmark assets rather than using third-party runtime model hosting', () => {
  assert.match(build, /gunzipSync/);
  assert.match(build, /public\/miniatures\/wp3-8a/);
  assert.match(build, /expectedEncodedLength: 35_972/);
  assert.match(build, /london-selected\.gltf\.gz\.b64\.tail01/);
  assert.match(build, /london-selected\.gltf\.gz\.b64\.tail02/);
  assert.match(build, /createHash\('sha256'\)/);
  assert.doesNotMatch(build, /https?:\/\//);
});

test('Selected view lazy-loads authored glTF while procedural geometry remains a distant/loading/error fallback', () => {
  assert.match(layer, /import\('three\/examples\/jsm\/loaders\/GLTFLoader\.js'\)/);
  assert.match(layer, /loader\.loadAsync\(asset\.selectedUrl\)/);
  assert.match(layer, /rootVisible && lod === 'selected' && piece\.asset/);
  assert.match(layer, /piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);
  assert.match(layer, /piece\.assetRoot\.visible = useAuthoredAsset/);
  assert.match(layer, /retaining procedural fallback/);
});

test('authored miniatures remain children of authoritative terrain-grounded strategic-node roots', () => {
  assert.match(layer, /queryTerrainElevation/);
  assert.match(layer, /MercatorCoordinate\.fromLngLat\(piece\.node\.position, elevation \+ CLEARANCE_METRES\)/);
  assert.match(layer, /const CLEARANCE_METRES = 22/);
  assert.match(layer, /worldPieceInViewport/);
  assert.match(layer, /this\.layers\.citiesHubs/);
  assert.match(layer, /defaultProjectionData\.mainMatrix/);
});

test('runtime evidence distinguishes authored glTF from procedural fallback', () => {
  assert.match(layer, /assetStatus: AssetStatus/);
  assert.match(layer, /presentationModel: PresentationModel/);
  assert.match(layer, /assetId: piece\.asset\?\.assetId/);
  assert.match(layer, /presentationModel: useAuthoredAsset \? 'authored-gltf' : 'procedural-fallback'/);
  assert.match(layer, /authoredFaceCount: piece\.asset\?\.authoredFaceCount/);
});

test('design lock records the asset-driven board-game-piece direction', () => {
  assert.match(design, /board-game-piece/i);
  assert.match(design, /authored/i);
  assert.match(design, /glTF|GLB/i);
  assert.match(design, /procedural.*fallback/i);
  assert.match(design, /authoritative `STRATEGIC_NODES` coordinates/i);
});
