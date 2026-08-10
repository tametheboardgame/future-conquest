const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ASSISTANCE_LEVELS,
  DEFAULT_GLOBAL_SETTINGS,
  GLOBAL_SETTINGS_STORAGE_KEY,
  loadGlobalSettings,
  saveGlobalSettings
} = require('../.test-dist/global-settings.js');

test('player preferences expose exactly the approved assistance levels', () => {
  assert.deepEqual(ASSISTANCE_LEVELS, ['Full Guidance', 'Recommended', 'Critical Only', 'Off']);
});

test('autosave and assistance preferences survive reload independently of campaigns', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  saveGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, autosaveEnabled: false, assistanceLevel: 'Critical Only' }, storage);
  values.set('future-conquest-slice-v0.14', JSON.stringify({ unrelated: 'campaign data' }));
  assert.equal(loadGlobalSettings(storage).autosaveEnabled, false);
  assert.equal(loadGlobalSettings(storage).assistanceLevel, 'Critical Only');
  assert.ok(values.has(GLOBAL_SETTINGS_STORAGE_KEY));
});

test('older and malformed preference records migrate to safe WP4 defaults', () => {
  const storage = { getItem: () => JSON.stringify({ masterVolume: 0.5, assistanceLevel: 'Verbose' }) };
  const settings = loadGlobalSettings(storage);
  assert.equal(settings.masterVolume, 0.5);
  assert.equal(settings.autosaveEnabled, true);
  assert.equal(settings.assistanceLevel, 'Recommended');
});
