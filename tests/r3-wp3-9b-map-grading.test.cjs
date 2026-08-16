const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const grading = readFileSync('src/presentation/r3-map-visual-grading.ts', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');
const terrain = readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const landMaskBuilder = readFileSync('scripts/maps/build-r3-europe-land-mask.mjs', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');
const formations = readFileSync('src/presentation/r3-formation-miniatures-layer.ts', 'utf8');
const world = readFileSync('src/presentation/r3-world-miniatures-layer.ts', 'utf8');

test('WP3.9B installs the border-led renderer grading profile rather than a CSS canvas filter', () => {
  assert.match(main, /installR3MapVisualGrading\(\)/);
  assert.match(grading, /R3_MAP_VISUAL_GRADING_PROFILE_ID = 'clean-border-v2'/);
  assert.doesNotMatch(grading, /style\.filter|hue-rotate|sepia\(|saturate\(|brightness\(/);
});

test('land is one opaque neutral terrain surface instead of a translucent wash', () => {
  assert.match(terrain, /'fill-color': '#6c805b'/, 'baseline olive source should remain identifiable for the audit');
  assert.match(grading, /land: '#777a72'/);
  assert.match(grading, /'r3-wp2b-land-wash', 'fill-color'/);
  assert.match(grading, /'r3-wp2b-land-wash', 'fill-opacity', 1\)/);
});

test('higher fidelity 50m coastline is delivered as a static MapLibre refinement, not bundled into terrain JS', () => {
  assert.match(landMaskBuilder, /world-atlas\/land-50m\.json/);
  assert.match(landMaskBuilder, /public\/generated\/r3-terrain\/europe-land-mask-50m\.geojson/);
  assert.match(landMaskBuilder, /id: 'r3-europe-land-mask-v3'/);
  assert.match(landMaskBuilder, /delivery: 'static-maplibre-geojson'/);
  assert.match(grading, /detailedLandMaskPath: 'generated\/r3-terrain\/europe-land-mask-50m\.geojson'/);
  assert.match(grading, /fetch\(detailedLandMaskUrl\(\)/);
  assert.match(grading, /landSource\.setData/);
  assert.match(grading, /'110m-fallback'/);
  assert.doesNotMatch(terrain, /land-50m\.json|europe-land-mask-50m/);
  assert.match(packageJson, /"predev": "npm run build:r3-europe-land-mask/);
});

test('broad political fills and the generic pale administrative outline are removed', () => {
  assert.match(grading, /'campaign-territories-fill', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-territory-state-wash', 'fill-opacity', 0/);
  assert.match(grading, /'campaign-administrative-borders', 'line-opacity', 0/);
  assert.match(grading, /coastlineOpacity: 0\.13/);
});

test('controller ownership is carried by a luminous friendly/enemy border pair', () => {
  assert.match(grading, /friendlyBorder: '#76f2e1'/);
  assert.match(grading, /enemyBorder: '#ff776f'/);
  assert.match(grading, /controlGlowLayerId: 'campaign-control-border-glow'/);
  assert.match(grading, /map\.addLayer\([\s\S]*?'line-blur'/);
  assert.match(grading, /'campaign-control-borders', 'line-color'/);
  assert.match(grading, /'campaign-control-borders', 'line-width'/);
});

test('dedicated operational state outlines and fronts retain their established colours', () => {
  assert.match(terrain, /'campaign-fronts-core'[\s\S]*?'line-color': '#ffad66'/);
  assert.match(terrain, /'campaign-state-outline'[\s\S]*?'active_combat'\], false\], '#ff7a63'/);
  assert.match(terrain, /'campaign-state-outline'[\s\S]*?'selected'\], false\], '#effffc'/);
});

test('Three.js lighting remains untouched by the terrain ownership revision', () => {
  assert.match(formations, /new AmbientLight\(0xd9f6ee, 1\.5\)/);
  assert.match(formations, /new DirectionalLight\(0xfff2d4, 2\.4\)/);
  assert.match(world, /new AmbientLight\(0xe6f1e9, 1\.45\)/);
  assert.match(world, /new DirectionalLight\(0xffefcf, 2\.2\)/);
  assert.doesNotMatch(grading, /AmbientLight|DirectionalLight/);
});

test('grading is presentation-only and exposes runtime ownership/coastline evidence', () => {
  assert.match(grading, /__r3MapVisualGrading/);
  assert.match(grading, /ownershipTreatment/);
  assert.match(grading, /coastlineGeometry/);
  assert.match(grading, /dataset\.visualGrading/);
  assert.doesNotMatch(grading, /GameState|newGame|endTurn|saveGame|selectedTerritory|taskGroups/);
});
