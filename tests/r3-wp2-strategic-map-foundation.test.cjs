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

test('R3 WP2 leaves decorative theatre layers non-interactive and preserves original hit geometry', () => {
  assert.match(css, /\.future-theatre,[\s\S]*\.map-graticule[\s\S]*pointer-events: none/);
  assert.match(map, /className="territory-hit-target"/);
  assert.match(map, /onClick=\{\(\) => selectTerritory\(id\)\}/);
});

test('R3 WP2 supports mobile simplification and reduced motion', () => {
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none/);
  assert.match(css, /transition: none/);
});
