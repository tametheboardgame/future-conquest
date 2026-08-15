const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const grading = readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');
const terrain = readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const formations = readFileSync('src/presentation/r3-formation-miniatures-layer.ts', 'utf8');
const world = readFileSync('src/presentation/r3-world-miniatures-layer.ts', 'utf8');

test('WP3.9B installs an explicit renderer grading profile rather than a CSS canvas filter', () => {
  assert.match(main, /installR3MapVisualGrading\(\)/);
  assert.match(grading, /R3_MAP_VISUAL_GRADING_PROFILE_ID = 'clean-neutral-v1'/);
  assert.doesNotMatch(grading, /style\.filter|hue-rotate|sepia\(|saturate\(|brightness\(/);
});

test('the old olive land wash is explicitly replaced with a neutral earth tone', () => {
  assert.match(terrain, /'fill-color': '#6c805b'/, 'baseline olive source should remain identifiable for the audit');
  assert.match(grading, /land: '#958d77'/);
  assert.match(grading, /'r3-wp2b-land-wash', 'fill-color'/);
  assert.match(grading, /'r3-wp2b-land-wash', 'fill-opacity'/);
});

test('hillshade and coastline are rebalanced without touching operational threat colours', () => {
  assert.match(grading, /hillshadeShadow: '#242321'/);
  assert.match(grading, /hillshadeHighlight: '#eee7d8'/);
  assert.match(grading, /hillshadeAccent: '#8a8171'/);
  assert.match(grading, /coastline: '#c6c9bc'/);
  assert.match(terrain, /'campaign-fronts-core'[\s\S]*?'line-color': '#ffad66'/);
  assert.match(terrain, /'active_combat'\], false\], '#ff5447'/);
});

test('Three.js lighting was audited and is already near-neutral rather than being recoloured blindly', () => {
  assert.match(formations, /new AmbientLight\(0xd9f6ee, 1\.5\)/);
  assert.match(formations, /new DirectionalLight\(0xfff2d4, 2\.4\)/);
  assert.match(world, /new AmbientLight\(0xe6f1e9, 1\.45\)/);
  assert.match(world, /new DirectionalLight\(0xffefcf, 2\.2\)/);
  assert.doesNotMatch(grading, /AmbientLight|DirectionalLight/);
});

test('grading is presentation-only and exposes runtime evidence', () => {
  assert.match(grading, /__r3MapVisualGrading/);
  assert.match(grading, /dataset\.visualGrading/);
  assert.doesNotMatch(grading, /GameState|newGame|endTurn|saveGame|selectedTerritory|taskGroups/);
});
