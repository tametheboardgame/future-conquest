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

test('passive campaign alerts support persistent per-alert and global suppression and stay map scoped', () => {
  const source = read('src/r4-usability-hotfix.ts');
  const css = read('src/r4-usability-hotfix.css');
  assert.match(source, /future-conquest-alert-preferences-v1/);
  assert.match(source, /Don’t show this alert again/);
  assert.match(source, /Mute all alerts/);
  assert.match(source, /Alerts muted · restore/);
  assert.match(source, /\.combat-report-alert/);
  assert.match(source, /const hidden = !mapActive \|\| preferences\.muteAll \|\| suppressed \|\| episodeDismissed/);
  assert.match(css, /\.combat-report-alert\[hidden\][\s\S]*display:\s*none\s*!important/);
});

test('physical formations retain visible map selection targets including dynamically reconciled groups', () => {
  const source = read('src/r4-usability-hotfix.ts');
  const css = read('src/r4-usability-hotfix.css');
  const markers = read('src/presentation/r3-terrain-operational-markers-core.ts');
  assert.match(source, /\.r3-terrain-task-group-marker/);
  assert.match(source, /r4-formation-selector/);
  assert.match(css, /data-physical-formations='ready'[\s\S]*\.r3-terrain-task-group-marker\.r4-formation-selector[\s\S]*opacity:\s*\.92\s*!important/);
  assert.match(markers, /if \(!prior\) return new Marker/);
  assert.match(markers, /callbacks\.onSelectGroup\(group\.id\)/);
});

test('cut-off formations expose the supply threshold and direct recovery actions', () => {
  const source = read('src/r4-usability-hotfix.ts');
  assert.match(source, /SUPPLY DELIVERY BELOW 15%/);
  assert.match(source, /Restore a viable supply path/);
  assert.match(source, /Show supply routes/);
  assert.match(source, /Open Logistics diagnostics/);
  assert.match(source, /r4-cut-off/);
});
