const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('src/r3-strategic-map.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');

test('R3 WP2 loads after tactical map styling while preserving the final responsive contract', () => {
  const r2 = main.indexOf("import './r2-tactical-map.css'");
  const r3 = main.indexOf("import './r3-strategic-map.css'");
  const responsive = main.indexOf("import './responsive-command-fit.css'");
  assert.ok(r2 >= 0 && r3 > r2 && responsive > r3);
});

test('R3 WP2 gives authoritative territory paths controlled screen-space depth', () => {
  assert.match(css, /\.europe-map \.territory \{/);
  assert.match(css, /drop-shadow\(0 2px 0/);
  assert.match(css, /drop-shadow\(0 4px 0/);
  assert.match(css, /screen-space effects/i);
  assert.match(map, /className={`territory \$\{territory\.controller\}/);
  assert.match(map, /className="r3-territory-depth-layer" aria-hidden="true"/);
  assert.match(map, /className={`territory-depth-shell \$\{territory\.controller\}`}/);
});

test('R3 WP2 keeps political, selected, targeted and combat states visually distinct', () => {
  for (const selector of [
    '.territory.player',
    '.territory.enemy',
    '.territory.selected',
    '.territory.targeted',
    '.territory.threatened',
    '.territory.active-battle'
  ]) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
});

test('R3 WP2 wires terrain classification into restrained SVG texture overlays', () => {
  assert.match(map, /r3TerrainClass\(TERRITORIES\[id\]\?\.terrain\)/);
  assert.match(map, /className="r3-terrain-layer" aria-hidden="true"/);
  assert.match(map, /className="r3-territory-light-layer" aria-hidden="true"/);
  for (const pattern of [
    'r3TerrainOpenLowland',
    'r3TerrainMixedLowland',
    'r3TerrainMixedUpland',
    'r3TerrainMountainous',
    'r3TerritorySheen'
  ]) {
    assert.ok(map.includes(`id="${pattern}"`), `missing ${pattern}`);
  }
  assert.match(css, /\.territory-terrain\.terrain-open-lowland/);
  assert.match(css, /\.territory-terrain\.terrain-mixed-lowland/);
  assert.match(css, /\.territory-terrain\.terrain-mixed-upland/);
  assert.match(css, /\.territory-terrain\.terrain-mountainous/);
  assert.match(css, /political control[\s\S]*secondary texture cue/i);
});

test('R3 WP2 renders opposing-control fronts separately from administrative borders', () => {
  assert.match(map, /deriveR3FrontSegments\(state\.territories, TERRITORIES\)/);
  assert.match(map, /r3FrontLineEndpoints\(from, to, 18 \* overlayScale\)/);
  assert.match(map, /className="r3-front-line-layer" aria-hidden="true"/);
  assert.match(map, /className="r3-front-line-underlay"/);
  assert.match(map, /className="r3-front-line-core"/);
  assert.match(css, /Administrative territory borders remain thin and continuous/i);
  assert.match(css, /\.r3-front-line-core[\s\S]*stroke-dasharray/);
  assert.match(css, /vector-effect: non-scaling-stroke/);
});

test('R3 WP2 leaves decorative theatre and R3 layers non-interactive and preserves original hit geometry', () => {
  assert.match(css, /\.future-theatre,[\s\S]*\.map-graticule[\s\S]*pointer-events: none/);
  assert.match(css, /\.r3-territory-depth-layer,[\s\S]*\.r3-front-line-layer[\s\S]*pointer-events: none/);
  assert.match(map, /className="territory-hit-target"/);
  assert.match(map, /onClick=\{\(\) => selectTerritory\(id\)\}/);
});

test('R3 WP2 supports mobile simplification and reduced motion', () => {
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none/);
  assert.match(css, /transition: none/);
});
