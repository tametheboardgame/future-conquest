const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const {
  DEFAULT_WARNING_PREFERENCES,
  WARNING_DEFINITIONS,
  WARNING_PREFERENCES_STORAGE_KEY,
  loadWarningPreferences,
  saveWarningPreferences,
  shouldSuppressWarning
} = require('../.test-dist/warning-preferences.js');

const css = fs.readFileSync('src/r3-wp6-6-command-shell-follow-up.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const mapUx = fs.readFileSync('src/components/MapUxFoundations.tsx', 'utf8');
const mapUxCss = fs.readFileSync('src/components/map-ux-foundations.css', 'utf8');
const settingsPanel = fs.readFileSync('src/components/GlobalSettingsPanel.tsx', 'utf8');
const bridge = fs.readFileSync('src/wp66-warning-preferences.ts', 'utf8');

function occursAfter(haystack, later, earlier) {
  return haystack.lastIndexOf(later) > haystack.lastIndexOf(earlier);
}

test('WP6.6 is the final command-shell override and widens the desktop rail', () => {
  assert.match(main, /import '\.\/r3-wp6-6-command-shell-follow-up\.css';/);
  assert.ok(occursAfter(main, './r3-wp6-6-command-shell-follow-up.css', './r3-wp6-5-interface-polish.css'));
  assert.match(css, /--wp6-rail-width:\s*100px/);
  assert.match(css, /--wp66-rail-control-width:\s*84px/);
});

test('How Supply Works cards have bounded icon and text geometry', () => {
  assert.match(css, /logistics-flow-steps article[\s\S]*grid-template-columns:\s*38px minmax\(0, 1fr\)/);
  assert.match(css, /logistics-flow-steps article > b[\s\S]*width:\s*36px[\s\S]*height:\s*36px/);
  assert.match(css, /logistics-flow-steps article > div[\s\S]*min-width:\s*0/);
  assert.match(css, /logistics-flow-steps p[\s\S]*overflow-wrap:\s*anywhere/);
});

test('context sidebar toggle is structurally portalled into the panel header', () => {
  assert.match(mapUx, /createPortal/);
  assert.match(mapUx, /querySelector<HTMLElement>\('\.quick-command-heading'\)/);
  assert.doesNotMatch(mapUx, /getBoundingClientRect/);
  assert.doesNotMatch(mapUxCss, /position:\s*fixed/);
  assert.match(mapUxCss, /map-context-panel\.wp39a-sidebar-collapsed > \.quick-command/);
});

test('warning definitions explicitly protect critical and operational warnings', () => {
  assert.equal(WARNING_DEFINITIONS['supply-source-capacity'].suppressible, true);
  assert.equal(WARNING_DEFINITIONS['supply-source-capacity'].severity, 'advisory');
  assert.equal(WARNING_DEFINITIONS['end-turn-logistics'].suppressible, false);
  assert.equal(WARNING_DEFINITIONS['end-turn-logistics-critical'].severity, 'critical');
  assert.equal(WARNING_DEFINITIONS['end-turn-logistics-critical'].suppressible, false);
});

test('warning preferences persist outside campaign saves and fail open when malformed', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  saveWarningPreferences({ warningMode: 'default', suppressedWarningIds: ['supply-source-capacity'] }, storage);
  values.set('future-conquest-slice-v0.14', JSON.stringify({ unrelated: 'campaign state' }));
  const loaded = loadWarningPreferences(storage);
  assert.ok(values.has(WARNING_PREFERENCES_STORAGE_KEY));
  assert.equal(shouldSuppressWarning(loaded, 'supply-source-capacity'), true);
  assert.equal(shouldSuppressWarning(loaded, 'end-turn-logistics-critical'), false);

  const corrupt = { getItem: () => '{not-json' };
  const failOpen = loadWarningPreferences(corrupt);
  assert.deepEqual(failOpen, DEFAULT_WARNING_PREFERENCES);
  assert.equal(shouldSuppressWarning(failOpen, 'supply-source-capacity'), false);
});

test('warning modal and settings expose reversible preference controls', () => {
  assert.match(main, /installWp66WarningPreferences\(\)/);
  assert.match(bridge, /Don’t show this warning again/);
  assert.match(bridge, /Warning settings/);
  assert.match(bridge, /dataset\.warningId/);
  assert.match(bridge, /data-wp66-auto-resolving/);
  assert.match(settingsPanel, /id="warning-preferences-settings"/);
  assert.match(settingsPanel, /Reset warning preferences/);
  assert.match(settingsPanel, /Critical and operationally mandatory warnings always remain enabled/);
});
