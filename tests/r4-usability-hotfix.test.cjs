const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('R4 usability hotfix is installed after the existing warning disclosure layers', () => {
  const main = read('src/main.tsx');
  assert.match(main, /import '\.\/r4-usability-hotfix\.css';/);
  assert.match(main, /installR4UsabilityHotfix/);
  assert.ok(main.indexOf('installR4UsabilityHotfix();') > main.indexOf('installWp66WarningPreferences();'));
});

test('passive campaign alerts are composed rather than clipped and expose persistent suppression controls', () => {
  const source = read('src/r4-usability-hotfix.ts');
  const css = read('src/r4-usability-hotfix.css');
  assert.match(source, /future-conquest-alert-preferences-v1/);
  assert.match(source, /Don’t show this alert again/);
  assert.match(source, /Mute all alerts/);
  assert.match(source, /Mute all passive alerts/);
  assert.match(source, /Show all alerts again/);
  assert.match(source, /r4-alert-details/);
  assert.match(source, /const commandView = mapActive \? 'map' : 'other'/);
  assert.match(source, /document\.body\.dataset\.r4CommandView !== commandView/);
  assert.match(source, /const hidden = !mapActive \|\| preferences\.muteAll \|\| suppressed \|\| episodeDismissed/);
  assert.match(source, /if \(alert\.hidden !== hidden\) alert\.hidden = hidden/);
  assert.match(source, /function setText\(/);
  assert.match(css, /max-height:\s*none\s*!important/);
  assert.match(css, /body\[data-r4-command-view='other'\][\s\S]*\.combat-report-alert/);
  assert.match(css, /\.r4-alert-preference-actions\s*\{[\s\S]*display:\s*flex\s*!important/);
});

test('physical formations retain visible pointer targets even when map decluttering hides a newly reconciled group', () => {
  const source = read('src/r4-usability-hotfix.ts');
  const css = read('src/r4-usability-hotfix.css');
  const markers = read('src/presentation/r3-terrain-operational-markers-core.ts');
  assert.match(source, /if \(marker\.hidden\) marker\.hidden = false/);
  assert.match(source, /marker\.style\.pointerEvents = 'auto'/);
  assert.match(source, /attributeFilter: \['class', 'hidden', 'data-declutter', 'data-physical-formations'\]/);
  assert.match(css, /r4-formation-selector\[hidden\][\s\S]*display:\s*grid\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.match(markers, /if \(!prior\) return new Marker/);
  assert.match(markers, /callbacks\.onSelectGroup\(group\.id\)/);
});

test('cut-off formations expose an immediate map warning and concrete recovery path', () => {
  const source = read('src/r4-usability-hotfix.ts');
  const css = read('src/r4-usability-hotfix.css');
  assert.match(source, /CUT OFF · SUPPLY DELIVERY BELOW 15%/);
  assert.match(source, /logistics condition, not automatically the reason a specific order control is disabled/);
  assert.match(source, /trace a path back through controlled territory/);
  assert.match(source, /Secure any unsecured territory/);
  assert.match(source, /Repair or reopen blocked and destroyed routes/);
  assert.match(source, /raise this formation’s logistics priority/);
  assert.match(source, /Show supply routes/);
  assert.match(source, /Fix in Logistics/);
  assert.match(source, /r4-cut-off-map-banner/);
  assert.match(source, /classList\.toggle\('r4-cut-off', shouldMarkCutOff\)/);
  assert.match(css, /\.r4-cut-off-map-banner\s*\{/);
  assert.match(css, /\.r3-terrain-task-group-marker\.r4-cut-off::after[\s\S]*content:\s*'CUT OFF'/);
});
