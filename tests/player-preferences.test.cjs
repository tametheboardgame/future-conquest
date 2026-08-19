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

test('autosave, assistance and display preferences survive reload independently of campaigns', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  saveGlobalSettings({
    ...DEFAULT_GLOBAL_SETTINGS,
    autosaveEnabled: false,
    assistanceLevel: 'Critical Only',
    reducedMotion: true,
    motionScale: 0.4,
    colourBlindAssist: true
  }, storage);
  values.set('future-conquest-slice-v0.14', JSON.stringify({ unrelated: 'campaign data' }));
  const settings = loadGlobalSettings(storage);
  assert.equal(settings.autosaveEnabled, false);
  assert.equal(settings.assistanceLevel, 'Critical Only');
  assert.equal(settings.reducedMotion, true);
  assert.equal(settings.motionScale, 0.4);
  assert.equal(settings.colourBlindAssist, true);
  assert.ok(values.has(GLOBAL_SETTINGS_STORAGE_KEY));
});

test('older and malformed preference records migrate to safe defaults', () => {
  const storage = { getItem: () => JSON.stringify({ masterVolume: 0.5, assistanceLevel: 'Verbose' }) };
  const settings = loadGlobalSettings(storage);
  assert.equal(settings.masterVolume, 0.5);
  assert.equal(settings.autosaveEnabled, true);
  assert.equal(settings.assistanceLevel, 'Recommended');
  assert.equal(settings.reducedMotion, false);
  assert.equal(settings.motionScale, 1);
  assert.equal(settings.colourBlindAssist, false);
});

test('motion intensity is normalised to a safe zero-to-one range', () => {
  const high = { getItem: () => JSON.stringify({ motionScale: 12 }) };
  const low = { getItem: () => JSON.stringify({ motionScale: -3 }) };
  assert.equal(loadGlobalSettings(high).motionScale, 1);
  assert.equal(loadGlobalSettings(low).motionScale, 0);
});