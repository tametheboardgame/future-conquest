const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('WP6 icon rail keeps visible labels and hover titles', () => {
  const nav = read('src/components/CommandNavigation.tsx');
  assert.match(nav, /function CommandIcon/);
  assert.match(nav, /<svg/);
  assert.match(nav, /title=\{item\.label\}/);
  assert.match(nav, /command-nav-label/);
  assert.match(nav, /aria-current=/);
});

test('WP6 map-first stylesheet is loaded after the established command fit layer', () => {
  const main = read('src/main.tsx');
  const css = read('src/r3-wp6-command-ui.css');
  assert.ok(main.indexOf("./r3-wp6-command-ui.css") > main.indexOf("./responsive-command-fit.css"));
  assert.match(css, /--wp6-rail-width:\s*70px/);
  assert.match(css, /\.command-topbar[\s\S]*height:\s*48px/);
  assert.match(css, /\.command-topbar \.eyebrow[\s\S]*display:\s*none/);
  assert.match(css, /\.map-heading[\s\S]*position:\s*absolute/);
  assert.match(css, /\.command-workspace[\s\S]*grid-template-columns:\s*var\(--wp6-rail-width\)/);
});

test('WP6 alert cards no longer consume desktop document flow', () => {
  const css = read('src/r3-wp6-command-ui.css');
  const reports = read('src/components/CombatReports.tsx');
  assert.match(css, /\.operational-alert-strip,[\s\S]*\.combat-report-alert[\s\S]*position:\s*fixed/);
  assert.match(css, /:focus-within/);
  assert.match(reports, /data-wp6-popup="after-action"/);
  assert.match(reports, /aria-label="Dismiss after-action report"/);
  assert.match(reports, /setDismissedReportId\(report\.id\)/);
});

test('WP6 formation surfaces use canonical armour art and visual condition state', () => {
  const main = read('src/main.tsx');
  const roster = read('src/components/FormationRoster.tsx');
  const detailCss = read('src/r3-wp6-pictorial-details.css');
  assert.match(roster, /canon-armour-and-male-general\.webp/);
  assert.match(roster, /function armourCondition/);
  assert.match(roster, /formation-roster-portrait/);
  assert.match(roster, /formation-condition-line/);
  assert.ok(main.indexOf("./r3-wp6-pictorial-details.css") > main.indexOf("./r3-wp6-command-ui.css"));
  assert.match(detailCss, /canon-armour-and-male-general\.webp/);
  assert.match(detailCss, /\.selected-formation-card::before/);
  assert.match(detailCss, /\.map-context-panel \.selected-group::before/);
});

test('WP6 infrastructure cards have a pictorial project treatment', () => {
  const css = read('src/r3-wp6-command-ui.css');
  assert.match(css, /\.infrastructure-active-card::before/);
  assert.match(css, /data:image\/svg\+xml/);
});

test('WP6 reduced-motion behaviour disables new disclosure animation', () => {
  const css = read('src/r3-wp6-command-ui.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition:\s*none !important/);
});
