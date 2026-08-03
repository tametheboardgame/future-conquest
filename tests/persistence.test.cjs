const test = require('node:test');
const assert = require('node:assert/strict');
const { newGame } = require('../.test-dist/engine.js');
const {
  CURRENT_SAVE_KEY,
  LEGACY_V2_SAVE_KEY,
  LEGACY_V3_SAVE_KEY,
  LEGACY_V4_SAVE_KEY,
  LEGACY_V6_SAVE_KEY,
  LEGACY_V7_SAVE_KEY,
  SAVE_METADATA_KEY,
  createSaveMetadata,
  inspectStoredCampaign,
  storageIsWritable,
  writeMetadataForCurrentSave
} = require('../.test-dist/persistence.js');

function installStorage(entries = []) {
  const values = new Map(entries);
  return {
    values,
    storage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    }
  };
}

test('save metadata records the current campaign summary and timestamp', () => {
  const state = newGame(2, 'hard');
  const metadata = createSaveMetadata(state, '2026-08-02T05:15:00.000Z');

  assert.deepEqual(metadata, {
    saveVersion: 9,
    savedAt: '2026-08-02T05:15:00.000Z',
    campaignDay: state.turn,
    difficulty: 'hard',
    territoryCount: Object.keys(state.territories).length,
    formationCount: Object.keys(state.taskGroups).length
  });
});

test('a current version 9 save is inspected with its matching metadata', () => {
  const state = newGame(2);
  const serialisedState = JSON.parse(JSON.stringify(state));
  const metadata = createSaveMetadata(state, '2026-08-02T05:16:00.000Z');
  const { storage } = installStorage([
    [CURRENT_SAVE_KEY, JSON.stringify(state)],
    [SAVE_METADATA_KEY, JSON.stringify(metadata)]
  ]);

  const result = inspectStoredCampaign(storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v9');
  assert.deepEqual(result.state, serialisedState);
  assert.deepEqual(result.metadata, metadata);
});

test('a version 7 save migrates through the legacy key through version 8 into version 9 logistics', () => {
  const legacy = newGame(2);
  legacy.version = 7;
  delete legacy.logistics;
  const setup = installStorage([[LEGACY_V7_SAVE_KEY, JSON.stringify(legacy)]]);
  const result = inspectStoredCampaign(setup.storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v7');
  assert.equal(result.state.version, 9);
  assert.ok(result.state.logistics.totalDemand > 0);
});

test('a version 6 save migrates through the legacy key into version 9', () => {
  const legacy = newGame(2);
  legacy.version = 6;
  delete legacy.logistics;
  const setup = installStorage([[LEGACY_V6_SAVE_KEY, JSON.stringify(legacy)]]);
  const result = inspectStoredCampaign(setup.storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v6');
  assert.equal(result.state.version, 9);
});

test('missing, corrupted and unsupported saves produce explicit failures', () => {
  let setup = installStorage();
  assert.equal(inspectStoredCampaign(setup.storage).code, 'missing');

  setup = installStorage([[CURRENT_SAVE_KEY, '{not-json']]);
  assert.equal(inspectStoredCampaign(setup.storage).code, 'corrupt');

  setup = installStorage([[CURRENT_SAVE_KEY, JSON.stringify({ version: 99 })]]);
  assert.equal(inspectStoredCampaign(setup.storage).code, 'unsupported');
});

test('version 4, version 3 and version 2 saves migrate into version 9', () => {
  const version4 = newGame(2);
  version4.version = 4;
  delete version4.escalationStage;
  delete version4.mobilisationPool;
  delete version4.mobilisations;
  delete version4.enemyOrders;
  delete version4.intelligenceReports;
  delete version4.logistics;
  let setup = installStorage([[LEGACY_V4_SAVE_KEY, JSON.stringify(version4)]]);
  let result = inspectStoredCampaign(setup.storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v4');
  assert.equal(result.state.version, 9);

  const version3 = { ...version4, version: 3 };
  setup = installStorage([[LEGACY_V3_SAVE_KEY, JSON.stringify(version3)]]);
  result = inspectStoredCampaign(setup.storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v3');
  assert.equal(result.state.version, 9);

  const version2 = { ...version4, version: 2 };
  delete version2.operations;
  version2.battle = null;
  setup = installStorage([[LEGACY_V2_SAVE_KEY, JSON.stringify(version2)]]);
  result = inspectStoredCampaign(setup.storage);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'v2');
  assert.equal(result.state.version, 9);
});

test('metadata is written only after a valid current save exists', () => {
  const state = newGame(2);
  const setup = installStorage([[CURRENT_SAVE_KEY, JSON.stringify(state)]]);
  const result = writeMetadataForCurrentSave(setup.storage, '2026-08-02T05:17:00.000Z');

  assert.equal(result.ok, true);
  assert.equal(result.metadata.campaignDay, state.turn);
  assert.deepEqual(JSON.parse(setup.values.get(SAVE_METADATA_KEY)), result.metadata);

  const missing = writeMetadataForCurrentSave(installStorage().storage);
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'missing');
});

test('blocked browser storage is detected without throwing', () => {
  const blocked = {
    getItem: () => null,
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => {}
  };
  assert.equal(storageIsWritable(blocked), false);
});
