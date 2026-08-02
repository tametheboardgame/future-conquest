from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Could not find {label}")
    if text.count(old) != 1:
        raise RuntimeError(f"Expected one {label}, found {text.count(old)}")
    return text.replace(old, new, 1)


engine_path = Path('src/game/engine.ts')
engine = engine_path.read_text()
old_persistence = """type LegacyV3GameState = Omit<GameState, 'version'> & { version: 3 };

export function saveGame(state: GameState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const current = localStorage.getItem(SAVE_KEY);
  if (current) {
    const parsed = JSON.parse(current) as Partial<GameState>;
    if (parsed.version === 4 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) return parsed as GameState;
  }

  const prior = localStorage.getItem(LEGACY_V3_SAVE_KEY);
  if (prior) {
    const parsed = JSON.parse(prior) as Partial<LegacyV3GameState>;
    if (parsed.version === 3 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) {
      return { ...(parsed as LegacyV3GameState), version: 4 };
    }
  }

  const legacy = localStorage.getItem(LEGACY_V2_SAVE_KEY);
  if (!legacy) return null;
  const parsed = JSON.parse(legacy) as Partial<LegacyGameState>;
  if (parsed.version !== 2 || !parsed.taskGroups || !parsed.enemyFormations) return null;
  return migrateLegacyGame(parsed as LegacyGameState);
}
"""
new_persistence = """type LegacyV3GameState = Omit<GameState, 'version'> & { version: 3 };

export interface SaveMetadata {
  saveVersion: 4;
  savedAt: string;
  campaignDay: number;
  difficulty: Difficulty;
  territoryCount: number;
  formationCount: number;
}

export type SaveResult =
  | { ok: true; metadata: SaveMetadata }
  | { ok: false; code: 'storage-unavailable'; message: string };

export type LoadResult =
  | { ok: true; state: GameState; metadata: SaveMetadata; migratedFrom?: 2 | 3 | 'raw-v4' }
  | { ok: false; code: 'missing' | 'corrupt' | 'unsupported' | 'storage-unavailable'; message: string };

interface SaveEnvelope {
  format: 'future-conquest-save';
  formatVersion: 1;
  metadata: SaveMetadata;
  state: GameState;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isDifficulty = (value: unknown): value is Difficulty => value === 'story' || value === 'standard' || value === 'hard';

function hasCoreState(value: unknown): value is Record<string, unknown> {
  return Boolean(
    isRecord(value)
    && typeof value.turn === 'number'
    && typeof value.seed === 'number'
    && isDifficulty(value.difficulty)
    && isRecord(value.territories)
    && isRecord(value.taskGroups)
    && isRecord(value.enemyFormations)
    && isRecord(value.operations)
    && Array.isArray(value.events)
  );
}

function isCurrentGameState(value: unknown): value is GameState {
  return hasCoreState(value) && value.version === 4;
}

function isLegacyV3GameState(value: unknown): value is LegacyV3GameState {
  return hasCoreState(value) && value.version === 3;
}

function isLegacyV2GameState(value: unknown): value is LegacyGameState {
  return hasCoreState(value) && value.version === 2;
}

function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  return Boolean(
    isRecord(value)
    && value.format === 'future-conquest-save'
    && value.formatVersion === 1
    && isRecord(value.metadata)
    && 'state' in value
  );
}

function createSaveMetadata(state: GameState, savedAt = new Date().toISOString()): SaveMetadata {
  return {
    saveVersion: 4,
    savedAt,
    campaignDay: state.turn,
    difficulty: state.difficulty,
    territoryCount: Object.keys(state.territories).length,
    formationCount: Object.keys(state.taskGroups).length
  };
}

function normaliseMetadata(value: unknown, state: GameState): SaveMetadata {
  if (
    isRecord(value)
    && value.saveVersion === 4
    && typeof value.savedAt === 'string'
    && typeof value.campaignDay === 'number'
    && isDifficulty(value.difficulty)
    && typeof value.territoryCount === 'number'
    && typeof value.formationCount === 'number'
  ) return value as unknown as SaveMetadata;
  return createSaveMetadata(state);
}

function normaliseLoadedState(parsed: GameState): GameState {
  const state = structuredClone(parsed);
  const groupIds = Object.keys(state.taskGroups);
  if (!state.taskGroups[state.selectedTaskGroupId]) state.selectedTaskGroupId = groupIds[0] ?? '';
  if (!state.selectedTerritory || !state.territories[state.selectedTerritory]) {
    state.selectedTerritory = state.taskGroups[state.selectedTaskGroupId]?.location ?? state.portalTerritory;
  }
  if (state.targetTerritory && !state.territories[state.targetTerritory]) state.targetTerritory = null;
  return state;
}

export function saveGame(state: GameState, savedAt = new Date().toISOString()): SaveResult {
  if (typeof localStorage === 'undefined') {
    return { ok: false, code: 'storage-unavailable', message: 'Browser storage is unavailable.' };
  }
  try {
    const metadata = createSaveMetadata(state, savedAt);
    const envelope: SaveEnvelope = {
      format: 'future-conquest-save',
      formatVersion: 1,
      metadata,
      state
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
    return { ok: true, metadata };
  } catch {
    return {
      ok: false,
      code: 'storage-unavailable',
      message: 'The campaign could not be saved. Check browser storage and privacy settings.'
    };
  }
}

export function loadGameResult(): LoadResult {
  if (typeof localStorage === 'undefined') {
    return { ok: false, code: 'storage-unavailable', message: 'Browser storage is unavailable.' };
  }

  let corrupt = false;
  let unsupported = false;
  const read = (key: string): string | null | LoadResult => {
    try {
      return localStorage.getItem(key);
    } catch {
      return {
        ok: false,
        code: 'storage-unavailable',
        message: 'The saved campaign could not be read. Check browser storage and privacy settings.'
      };
    }
  };

  const current = read(SAVE_KEY);
  if (typeof current !== 'string' && current !== null) return current;
  if (current) {
    try {
      const parsed = JSON.parse(current) as unknown;
      if (isSaveEnvelope(parsed)) {
        if (isCurrentGameState(parsed.state)) {
          const state = normaliseLoadedState(parsed.state);
          return { ok: true, state, metadata: normaliseMetadata(parsed.metadata, state) };
        }
        unsupported = Boolean(isRecord(parsed.state) && typeof parsed.state.version === 'number');
        corrupt = !unsupported;
      } else if (isCurrentGameState(parsed)) {
        const state = normaliseLoadedState(parsed);
        return { ok: true, state, metadata: createSaveMetadata(state), migratedFrom: 'raw-v4' };
      } else if (isRecord(parsed) && typeof parsed.version === 'number') unsupported = true;
      else corrupt = true;
    } catch {
      corrupt = true;
    }
  }

  const prior = read(LEGACY_V3_SAVE_KEY);
  if (typeof prior !== 'string' && prior !== null) return prior;
  if (prior) {
    try {
      const parsed = JSON.parse(prior) as unknown;
      if (isLegacyV3GameState(parsed)) {
        const state = normaliseLoadedState({ ...parsed, version: 4 });
        return { ok: true, state, metadata: createSaveMetadata(state), migratedFrom: 3 };
      }
      unsupported = true;
    } catch {
      corrupt = true;
    }
  }

  const legacy = read(LEGACY_V2_SAVE_KEY);
  if (typeof legacy !== 'string' && legacy !== null) return legacy;
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as unknown;
      if (isLegacyV2GameState(parsed)) {
        const state = normaliseLoadedState(migrateLegacyGame(parsed));
        return { ok: true, state, metadata: createSaveMetadata(state), migratedFrom: 2 };
      }
      unsupported = true;
    } catch {
      corrupt = true;
    }
  }

  if (unsupported) return { ok: false, code: 'unsupported', message: 'The saved campaign uses an unsupported version.' };
  if (corrupt) return { ok: false, code: 'corrupt', message: 'The saved campaign is corrupted and could not be loaded.' };
  return { ok: false, code: 'missing', message: 'No saved campaign was found in this browser.' };
}

export function loadGame(): GameState | null {
  const result = loadGameResult();
  return result.ok ? result.state : null;
}
"""
engine = replace_once(engine, old_persistence, new_persistence, 'engine persistence block')
engine_path.write_text(engine)

app_path = Path('src/App.tsx')
app = app_path.read_text()
app = replace_once(app, "import { useMemo, useState } from 'react';", "import { useEffect, useMemo, useState } from 'react';", 'React import')
app = replace_once(app, "  loadGame,\n  newGame,", "  loadGameResult,\n  newGame,", 'load import')
app = replace_once(
    app,
    "const operationTitle = (operation: Operation) => `Operation ${TERRITORIES[operation.target].centre}`;",
    """const operationTitle = (operation: Operation) => `Operation ${TERRITORIES[operation.target].centre}`;
type Notice = { id: number; tone: 'success' | 'error' | 'info'; message: string } | null;
const formatSavedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
};""",
    'notice types'
)
app = replace_once(
    app,
    "  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('standard');",
    "  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('standard');\n  const [notice, setNotice] = useState<Notice>(null);",
    'notice state'
)
app = replace_once(
    app,
    "  const canAttack = Boolean(selectedGroup && targetInfo?.kind === 'attack' && canOrderSelected && state.status === 'playing');\n\n  const instruction = useMemo(() => {",
    """  const canAttack = Boolean(selectedGroup && targetInfo?.kind === 'attack' && canOrderSelected && state.status === 'playing');

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const showNotice = (tone: NonNullable<Notice>['tone'], message: string) => {
    setNotice({ id: Date.now(), tone, message });
  };

  const instruction = useMemo(() => {""",
    'notice lifecycle'
)
app = replace_once(
    app,
    """  const load = () => {
    const saved = loadGame();
    if (saved) setState(saved);
  };
""",
    """  const save = () => {
    const result = saveGame(state);
    if (result.ok) {
      showNotice('success', `Game saved · day ${String(result.metadata.campaignDay).padStart(3, '0')} · ${formatSavedAt(result.metadata.savedAt)}`);
    } else showNotice('error', result.message);
  };

  const load = () => {
    const result = loadGameResult();
    if (result.ok) {
      setState(result.state);
      const migration = result.migratedFrom ? ' · save upgraded' : '';
      showNotice('success', `Game loaded · day ${String(result.metadata.campaignDay).padStart(3, '0')} · ${formatSavedAt(result.metadata.savedAt)}${migration}`);
    } else showNotice('error', result.message);
  };

  const resolveDay = () => {
    const next = endTurn(state);
    if (next === state) return;
    setState(next);
    const result = saveGame(next);
    if (result.ok) {
      showNotice('info', `Autosaved · day ${String(result.metadata.campaignDay).padStart(3, '0')} · ${formatSavedAt(result.metadata.savedAt)}`);
    } else showNotice('error', `Day resolved, but autosave failed. ${result.message}`);
  };
""",
    'save and load handlers'
)
app = replace_once(
    app,
    "  return <main className=\"app-shell\">\n    <header className=\"topbar\">",
    """  return <main className="app-shell">
    {notice && <div key={notice.id} className={`save-notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'} aria-live="polite">{notice.message}</div>}
    <header className="topbar">""",
    'notice rendering'
)
app = replace_once(
    app,
    """          <button className="end-turn" onClick={() => setState(endTurn)} disabled={state.status !== 'playing'}>Resolve all orders · day {state.turn}</button>
          <div><button onClick={() => saveGame(state)}>Save</button><button onClick={load}>Load</button></div>""",
    """          <button className="end-turn" onClick={resolveDay} disabled={state.status !== 'playing'}>Resolve all orders · day {state.turn}</button>
          <div><button onClick={save}>Save</button><button onClick={load}>Load</button></div>""",
    'control handlers'
)
app_path.write_text(app)

main_path = Path('src/main.tsx')
main = main_path.read_text()
main = replace_once(main, "import './formation-organisation.css';", "import './formation-organisation.css';\nimport './save-load.css';", 'save load stylesheet import')
main_path.write_text(main)

Path('src/save-load.css').write_text(""".save-notice {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  max-width: min(32rem, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-left-width: 0.35rem;
  border-radius: 0.35rem;
  background: rgba(12, 20, 31, 0.97);
  box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.38);
  color: #f4f7fb;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  animation: save-notice-in 160ms ease-out;
}

.save-notice.success { border-left-color: #68d391; }
.save-notice.info { border-left-color: #63b3ed; }
.save-notice.error { border-left-color: #fc8181; }

@keyframes save-notice-in {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 720px) {
  .save-notice { left: 1rem; right: 1rem; max-width: none; }
}
""")

Path('tests/save-load.test.cjs').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const { beginOperation, loadGame, loadGameResult, newGame, saveGame } = require('../.test-dist/engine.js');
const { splitFormation } = require('../.test-dist/formation-organisation.js');

const SAVE_KEY = 'future-conquest-slice-v0.4';

function installStorage(entries = []) {
  const storage = new Map(entries);
  global.localStorage = {
    setItem: (key, value) => storage.set(key, value),
    getItem: key => storage.get(key) ?? null,
    removeItem: key => storage.delete(key),
    clear: () => storage.clear()
  };
  return storage;
}

test('manual save writes metadata and restores the complete current campaign', () => {
  const storage = installStorage();
  let state = newGame(2);
  state = splitFormation(state, {
    sourceId: 'TG-2',
    name: 'Needle Detachment',
    personnel: 2,
    functionalArmour: 1,
    damagedArmour: 0
  });
  state.selectedTaskGroupId = 'TG-1';
  state.selectedTerritory = 'FR-01';
  state.targetTerritory = 'FR-01';
  state = beginOperation(state);
  state.territories['BE-01'].controller = 'player';
  state.territories['BE-01'].occupation = 'unsecured';

  const savedAt = '2026-08-02T04:55:00.000Z';
  const saved = saveGame(state, savedAt);
  assert.equal(saved.ok, true);
  assert.equal(saved.metadata.savedAt, savedAt);
  assert.equal(saved.metadata.campaignDay, state.turn);
  assert.equal(saved.metadata.difficulty, state.difficulty);
  assert.equal(saved.metadata.territoryCount, Object.keys(state.territories).length);
  assert.equal(saved.metadata.formationCount, Object.keys(state.taskGroups).length);

  const envelope = JSON.parse(storage.get(SAVE_KEY));
  assert.equal(envelope.format, 'future-conquest-save');
  assert.equal(envelope.formatVersion, 1);

  const loaded = loadGameResult();
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.state, state);
  assert.deepEqual(loadGame(), state);
});

test('raw version 4 saves remain loadable and are identified for upgrade', () => {
  const state = newGame(2);
  installStorage([[SAVE_KEY, JSON.stringify(state)]]);
  const loaded = loadGameResult();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.migratedFrom, 'raw-v4');
  assert.equal(loaded.state.version, 4);
});

test('load repairs a stale selected formation identifier', () => {
  const state = newGame(2);
  state.selectedTaskGroupId = 'REMOVED-GROUP';
  installStorage([[SAVE_KEY, JSON.stringify(state)]]);
  const loaded = loadGameResult();
  assert.equal(loaded.ok, true);
  assert.ok(loaded.state.taskGroups[loaded.state.selectedTaskGroupId]);
});

test('missing, corrupted and unsupported saves return explicit failures', () => {
  installStorage();
  assert.equal(loadGameResult().code, 'missing');

  installStorage([[SAVE_KEY, '{not-json']]);
  assert.equal(loadGameResult().code, 'corrupt');
  assert.equal(loadGame(), null);

  installStorage([[SAVE_KEY, JSON.stringify({ version: 99 })]]);
  assert.equal(loadGameResult().code, 'unsupported');
});

test('storage write failures are reported rather than thrown', () => {
  global.localStorage = {
    setItem: () => { throw new Error('blocked'); },
    getItem: () => null,
    removeItem: () => {},
    clear: () => {}
  };
  const result = saveGame(newGame(2));
  assert.equal(result.ok, false);
  assert.equal(result.code, 'storage-unavailable');
});
""")

Path('tests/save-load-ui.test.cjs').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const css = fs.readFileSync('src/save-load.css', 'utf8');

test('save and load controls expose visible success and failure feedback', () => {
  assert.match(app, /loadGameResult/);
  assert.match(app, /Game saved/);
  assert.match(app, /Game loaded/);
  assert.match(app, /role=\{notice\.tone === 'error' \? 'alert' : 'status'\}/);
  assert.match(app, /save-notice/);
});

test('resolving a day performs an autosave and reports its result', () => {
  assert.match(app, /const resolveDay = \(\) =>/);
  assert.match(app, /const result = saveGame\(next\)/);
  assert.match(app, /Autosaved/);
  assert.match(app, /onClick=\{resolveDay\}/);
});

test('save notification styling loads after the existing interface styles', () => {
  const formationIndex = main.indexOf("import './formation-organisation.css';");
  const saveIndex = main.indexOf("import './save-load.css';");
  assert.ok(formationIndex >= 0 && saveIndex > formationIndex);
  assert.match(css, /position: fixed/);
  assert.match(css, /z-index: 1000/);
});
""")
