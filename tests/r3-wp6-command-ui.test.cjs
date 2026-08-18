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

test('WP6 map-first styles load last and reclaim the complete command stage', () => {
  const main = read('src/main.tsx');
  const css = read('src/r3-wp6-command-ui.css');
  const refinements = read('src/r3-wp6-command-ui-refinements.css');
  const secondary = read('src/r3-wp6-secondary-ui.css');
  const notifications = read('src/r3-wp6-notification-disclosure.css');
  assert.ok(main.indexOf("./r3-wp6-command-ui.css") > main.indexOf("./responsive-command-fit.css"));
  assert.ok(main.indexOf("./r3-wp6-command-ui-refinements.css") > main.indexOf("./r3-wp6-pictorial-details.css"));
  assert.ok(main.indexOf("./r3-wp6-secondary-ui.css") > main.indexOf("./r3-wp6-command-ui-refinements.css"));
  assert.ok(main.indexOf("./r3-wp6-notification-disclosure.css") > main.indexOf("./r3-wp6-secondary-ui.css"));
  assert.match(css, /--wp6-rail-width:\s*70px/);
  assert.match(css, /\.command-topbar[\s\S]*height:\s*48px/);
  assert.match(css, /\.command-topbar \.eyebrow[\s\S]*display:\s*none/);
  assert.match(css, /\.map-heading[\s\S]*position:\s*absolute/);
  assert.match(css, /\.command-workspace[\s\S]*grid-template-columns:\s*var\(--wp6-rail-width\)/);
  assert.match(refinements, /\.map-panel[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\)/);
  assert.match(refinements, /\.map-panel > \.r3-terrain-prototype-shell[\s\S]*height:\s*100%/);
  assert.match(secondary, /secondary command-surface pass/);
  assert.match(notifications, /notification disclosure/);
});

test('WP6 alert cards no longer consume desktop document flow', () => {
  const css = read('src/r3-wp6-command-ui.css');
  const refinements = read('src/r3-wp6-command-ui-refinements.css');
  const reports = read('src/components/CombatReports.tsx');
  assert.match(css, /\.operational-alert-strip,[\s\S]*\.combat-report-alert[\s\S]*position:\s*fixed/);
  assert.match(css, /:focus-within/);
  assert.match(refinements, /:has\(\.command-map-workspace\)[\s\S]*right:\s*365px/);
  assert.match(refinements, /\.supply-diagnostic-copy[\s\S]*display:\s*none/);
  assert.match(reports, /data-wp6-popup="after-action"/);
  assert.match(reports, /aria-label="Dismiss after-action report"/);
  assert.match(reports, /setDismissedReportId\(report\.id\)/);
});

test('WP6 operational warnings dismiss until their underlying content changes', () => {
  const main = read('src/main.tsx');
  const disclosure = read('src/wp6-notification-disclosure.ts');
  const css = read('src/r3-wp6-notification-disclosure.css');
  assert.match(main, /installWp6NotificationDisclosure/);
  assert.match(disclosure, /dismissedSignatures/);
  assert.match(disclosure, /alertSignature/);
  assert.match(disclosure, /Dismiss until this warning changes/);
  assert.match(disclosure, /MutationObserver/);
  assert.match(disclosure, /characterData:\s*true/);
  assert.match(disclosure, /alert\.hidden = dismissed/);
  assert.match(disclosure, /Dismiss \$\{label\}/);
  assert.match(css, /\.wp6-alert-dismiss/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\[hidden\][\s\S]*display:\s*none !important/);
});

test('WP6 formation surfaces use canon-derived schematics and visual damage state', () => {
  const roster = read('src/components/FormationRoster.tsx');
  const detailCss = read('src/r3-wp6-pictorial-details.css');
  const refinements = read('src/r3-wp6-command-ui-refinements.css');
  assert.doesNotMatch(roster, /canon-armour-and-male-general\.webp/);
  assert.doesNotMatch(detailCss, /canon-armour-and-male-general\.webp/);
  assert.match(roster, /function FormationPortrait/);
  assert.match(roster, /formation-armour-miniature/);
  assert.match(roster, /sensor-optic/);
  assert.match(roster, /armour-damage/);
  assert.match(roster, /formation-condition-line/);
  assert.match(detailCss, /data:image\/svg\+xml/);
  assert.match(detailCss, /\.selected-formation-card::before/);
  assert.match(detailCss, /\.map-context-panel \.selected-group::before/);
  assert.match(refinements, /\.formation-armour-miniature/);
});

test('WP6 infrastructure cards have pictorial project and action treatments', () => {
  const css = read('src/r3-wp6-command-ui.css');
  const refinements = read('src/r3-wp6-command-ui-refinements.css');
  assert.match(css, /\.infrastructure-active-card::before/);
  assert.match(css, /data:image\/svg\+xml/);
  assert.match(refinements, /\.repair-choice::before[\s\S]*data:image\/svg\+xml/);
  assert.match(refinements, /\.build-choice::before[\s\S]*data:image\/svg\+xml/);
  assert.match(refinements, /\.interdict-choice::before[\s\S]*data:image\/svg\+xml/);
});

test('WP6 specialist menus are icon-first without removing visible labels', () => {
  const secondary = read('src/r3-wp6-secondary-ui.css');
  const logistics = read('src/components/LogisticsCommand.tsx');
  const infrastructure = read('src/components/InfrastructureCommand.tsx');
  assert.match(secondary, /\.logistics-tabs,[\s\S]*\.infrastructure-tabs/);
  assert.match(secondary, /\.logistics-tabs button::before,[\s\S]*\.infrastructure-tabs button::before/);
  assert.match(secondary, /--wp6-icon-formation:/);
  assert.match(secondary, /--wp6-icon-territory:/);
  assert.match(secondary, /--wp6-icon-repair:/);
  assert.match(secondary, /--wp6-icon-interdict:/);
  assert.match(logistics, /<nav className="logistics-tabs" aria-label="Logistics sections">/);
  assert.match(logistics, /<span>\{tab\.label\}<\/span>/);
  assert.match(infrastructure, /<nav className="infrastructure-tabs" aria-label="Infrastructure command modes">/);
  assert.match(infrastructure, /<span>\{tab\.label\}<\/span>/);
});

test('WP6 secondary workspaces have pictorial recognition cues', () => {
  const secondary = read('src/r3-wp6-secondary-ui.css');
  assert.match(secondary, /\.logistics-health-panel::before/);
  assert.match(secondary, /\.operation-command-card::before/);
  assert.match(secondary, /\.territory-command-card::before/);
  assert.match(secondary, /\.intelligence-command-grid > \.view-panel::before/);
  assert.match(secondary, /\.campaign-controls-panel::before/);
  assert.match(secondary, /\.logistics-flow-steps article:nth-child\(1\) > b/);
});

test('WP6 reduced-motion behaviour disables new disclosure animation', () => {
  const css = read('src/r3-wp6-command-ui.css');
  const secondary = read('src/r3-wp6-secondary-ui.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition:\s*none !important/);
  assert.match(secondary, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(secondary, /transition:\s*none !important/);
});
