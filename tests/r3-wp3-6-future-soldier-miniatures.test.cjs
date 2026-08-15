const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const layer = fs.readFileSync('src/presentation/r3-formation-miniatures-layer.ts', 'utf8');

test('WP3.6 identifies the canonical Future Conquest powered-armour visual family', () => {
  assert.match(layer, /R3_FUTURE_SOLDIER_VISUAL_FAMILY = 'future-conquest-powered-armour'/);
  assert.match(layer, /R3_FUTURE_SOLDIER_REFERENCE = 'Future Conquest Armour Revision Sheet\.png'/);
  assert.match(layer, /visualFamily: R3_FUTURE_SOLDIER_VISUAL_FAMILY/);
});

test('WP3.6 soldiers have recognisable modular powered-armour anatomy rather than one generic material token', () => {
  for (const component of [
    'left-powered-thigh',
    'right-powered-greave',
    'modular-chest-plate',
    'left-shoulder-plate',
    'sealed-combat-helmet',
    'multispectral-visor',
    'power-pack-core',
    'power-pack-left-cell',
    'power-pack-right-cell'
  ]) assert.match(layer, new RegExp(component));

  assert.match(layer, /armour: new MeshStandardMaterial/);
  assert.match(layer, /undersuit: new MeshStandardMaterial/);
  assert.match(layer, /accent: new MeshStandardMaterial/);
  assert.match(layer, /weapon: new MeshStandardMaterial/);
  assert.match(layer, /visor: new MeshStandardMaterial/);
  assert.doesNotMatch(layer, /const material = new MeshStandardMaterial\(\{ color: statusColours\[group\.status\]/);
});

test('WP3.6 keeps the primary energy rifle separate and visibly carried', () => {
  assert.match(layer, /rifle\.name = 'carried-energy-rifle'/);
  assert.match(layer, /energy-rifle-body/);
  assert.match(layer, /energy-rifle-barrel/);
  assert.match(layer, /energy-rifle-stock/);
  assert.match(layer, /energy-rifle-power-cell/);
  assert.match(layer, /figure\.add\(rifle\)/);
});

test('WP3.6 uses deterministic five-figure formation composition and strategy-map LOD', () => {
  assert.match(layer, /for \(const \[x, y\] of \[\[-0\.5, -0\.2\], \[0, 0\.22\], \[0\.5, -0\.2\], \[-0\.25, 0\.55\], \[0\.25, 0\.55\]\] as const\)/);
  assert.match(layer, /type MiniatureLod = 'theatre' \| 'campaign' \| 'local'/);
  assert.match(layer, /lod === 'theatre' \? 3 : lod === 'campaign' \? 4 : 5/);
  assert.match(layer, /const figureLimit = selected \? 5/);
  assert.match(layer, /detail\.visible = selected \|\| lod !== 'theatre'/);
  assert.match(layer, /visibleFigureCount/);
});

test('WP3.6 remains procedural, presentation-only and preserves the proven geographic/fallback contract', () => {
  assert.doesNotMatch(layer, /GLTFLoader|FBXLoader|OBJLoader|https?:\/\//);
  assert.match(layer, /formationPresentationPosition\(group, terrainOperationalTerritoryCentres\)/);
  assert.match(layer, /queryTerrainElevation\(lngLat\)/);
  assert.match(layer, /defaultProjectionData\.mainMatrix/);
  assert.match(layer, /piece\.root\.position\.set\(coordinate\.x, coordinate\.y, coordinate\.z\)/);
  assert.match(layer, /interpolateFormationPresentation\(piece\.from, piece\.target, elapsed\)/);
  assert.doesNotMatch(layer, /state\.taskGroups\[[^\]]+\]\s*=/);
  assert.doesNotMatch(layer, /order\.progress\s*=/);
});
