const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const css = fs.readFileSync('src/r3-wp6-5-interface-polish.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const tutorial = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
const terrain = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

function occursAfter(haystack, later, earlier) {
  return haystack.lastIndexOf(later) > haystack.lastIndexOf(earlier);
}

test('WP6.5 stylesheet is the final command-interface override', () => {
  assert.match(main, /import '\.\/r3-wp6-5-interface-polish\.css';/);
  assert.ok(occursAfter(main, "./r3-wp6-5-interface-polish.css", "./r3-wp6-accessibility.css"));
});

test('action tutorial remains action-driven without a visible Forward control', () => {
  assert.match(tutorial, /advances only after the game confirms it/);
  assert.match(css, /tutorial-overlay\[data-mode='action'\][\s\S]*button:nth-child\(2\)[\s\S]*display:\s*none/);
  assert.match(css, /max-height:\s*none/);
  assert.match(css, /max-height:\s*calc\(100dvh - 20px\)/);
});

test('terrain keeps one visible attribution treatment and compacts the ready HUD', () => {
  assert.match(terrain, /attributionControl:\s*\{\}/);
  assert.match(terrain, /r3-terrain-prototype-attribution/);
  assert.match(css, /\.r3-terrain-prototype-attribution\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /data-status='ready'[\s\S]*r3-terrain-prototype-toolbar\s*>\s*span[\s\S]*display:\s*none/);
});

test('sidebar, settings, telemetry and primary rail have bounded geometry', () => {
  assert.match(css, /map-ux-sidebar-toggle[\s\S]*transform:\s*translateX\(-100%\)/);
  assert.match(css, /global-settings-toggle[\s\S]*--wp65-header-control/);
  assert.match(css, /button\.network-supply-metric[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/);
  assert.match(css, /--wp65-rail-tile:\s*56px/);
  assert.match(css, /command-nav-items button[\s\S]*max-height:\s*var\(--wp65-rail-tile\)/);
});

test('WP6.5 is presentation-only by construction', () => {
  const forbidden = ['src/game/', 'save-schema', 'route-topology', 'combat-resolution'];
  for (const token of forbidden) assert.equal(css.includes(token), false, `presentation stylesheet contains forbidden authority token: ${token}`);
});
