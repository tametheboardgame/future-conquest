import { upgradeStrategicState } from './strategic-response';
import type { Difficulty, GameState } from './types';

export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.11';
export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.11-metadata';
export const LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';
export const LEGACY_V9_SAVE_KEY = 'future-conquest-slice-v0.9';
export const LEGACY_V8_SAVE_KEY = 'future-conquest-slice-v0.8';
export const LEGACY_V7_SAVE_KEY = 'future-conquest-slice-v0.7';
export const LEGACY_V6_SAVE_KEY = 'future-conquest-slice-v0.6';
export const LEGACY_V5_SAVE_KEY = 'future-conquest-slice-v0.5';
export const LEGACY_V4_SAVE_KEY = 'future-conquest-slice-v0.4';
export const LEGACY_V3_SAVE_KEY = 'future-conquest-slice-v0.3';
export const LEGACY_V2_SAVE_KEY = 'future-conquest-slice-v0.2';

export interface SaveMetadata {
  saveVersion: 11;
  savedAt: string | null;
  campaignDay: number;
  difficulty: Difficulty;
  territoryCount: number;
  formationCount: number;
}

export type SaveInspection =
  | { ok: true; state: GameState; metadata: SaveMetadata; source: 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2' }
  | { ok: false; code: 'missing' | 'corrupt' | 'unsupported' | 'storage-unavailable'; message: string };

export type MetadataWriteResult =
  | { ok: true; metadata: SaveMetadata }
  | { ok: false; code: 'missing' | 'corrupt' | 'storage-unavailable'; message: string };

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type StrategicField =
  | 'escalationStage'
  | 'mobilisationPool'
  | 'mobilisations'
  | 'enemyOrders'
  | 'intelligenceReports';
type NetworkField = 'routeStates';
type LogisticsField = 'logistics';
type EngineeringField = 'engineeringProjects';
type InterdictionField = 'interdictionMissions';

type LegacyV10State = Omit<GameState, 'version' | InterdictionField> & { version: 10 };
type LegacyV9State = Omit<GameState, 'version' | EngineeringField | InterdictionField> & { version: 9 };
type LegacyV8State = Omit<GameState, 'version' | 'infrastructureIncidents' | EngineeringField | InterdictionField> & { version: 8 };
type LegacyV7State = Omit<GameState, 'version' | LogisticsField | 'infrastructureIncidents' | EngineeringField | InterdictionField> & { version: 7 };
type LegacyV6State = Omit<GameState, 'version' | LogisticsField | EngineeringField | InterdictionField> & { version: 6 };
type LegacyV5State = Omit<GameState, 'version' | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 5 };
type LegacyV4State = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 4 };
type LegacyV3State = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 3 };
type LegacyV2State = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & {
  version: 2;
  battle?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isDifficulty = (value: unknown): value is Difficulty => value === 'story' || value === 'standard' || value === 'hard';

function hasCoreCampaignState(value: unknown): value is Record<string, unknown> {
  return Boolean(
    isRecord(value)
    && typeof value.seed === 'number'
    && typeof value.turn === 'number'
    && isDifficulty(value.difficulty)
    && isRecord(value.territories)
    && isRecord(value.taskGroups)
    && isRecord(value.enemyFormations)
    && Array.isArray(value.events)
  );
}

function hasStrategicCollections(value: Record<string, unknown>): boolean {
  return isRecord(value.operations)
    && Array.isArray(value.mobilisations)
    && Array.isArray(value.enemyOrders)
    && Array.isArray(value.intelligenceReports);
}

function isV11State(value: unknown): value is GameState {
  return hasCoreCampaignState(value)
    && value.version === 11
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics)
    && Array.isArray(value.infrastructureIncidents)
    && Array.isArray(value.engineeringProjects)
    && Array.isArray(value.interdictionMissions);
}

function isV10State(value: unknown): value is LegacyV10State {
  return hasCoreCampaignState(value)
    && value.version === 10
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics)
    && Array.isArray(value.infrastructureIncidents)
    && Array.isArray(value.engineeringProjects);
}

function isV9State(value: unknown): value is LegacyV9State {
  return hasCoreCampaignState(value)
    && value.version === 9
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics)
    && Array.isArray(value.infrastructureIncidents);
}

function isV8State(value: unknown): value is LegacyV8State {
  return hasCoreCampaignState(value)
    && value.version === 8
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics);
}

function isV7State(value: unknown): value is LegacyV7State {
  return hasCoreCampaignState(value)
    && value.version === 7
    && hasStrategicCollections(value)
    && isRecord(value.routeStates);
}

function isV6State(value: unknown): value is LegacyV6State {
  return hasCoreCampaignState(value)
    && value.version === 6
    && hasStrategicCollections(value)
    && isRecord(value.routeStates);
}

function isV5State(value: unknown): value is LegacyV5State {
  return hasCoreCampaignState(value)
    && value.version === 5
    && hasStrategicCollections(value);
}

function isV4State(value: unknown): value is LegacyV4State {
  return hasCoreCampaignState(value) && value.version === 4 && isRecord(value.operations);
}

function isV3State(value: unknown): value is LegacyV3State {
  return hasCoreCampaignState(value) && value.version === 3 && isRecord(value.operations);
}

function isV2State(value: unknown): value is LegacyV2State {
  return hasCoreCampaignState(value) && value.version === 2;
}

function stateFromStoredValue(value: unknown): unknown {
  if (isRecord(value) && value.format === 'future-conquest-save' && 'state' in value) return value.state;
  return value;
}

export function createSaveMetadata(state: GameState, savedAt: string | null = new Date().toISOString()): SaveMetadata {
  return {
    saveVersion: 11,
    savedAt,
    campaignDay: state.turn,
    difficulty: state.difficulty,
    territoryCount: Object.keys(state.territories).length,
    formationCount: Object.keys(state.taskGroups).length
  };
}

function metadataMatchesState(value: unknown, state: GameState): value is SaveMetadata {
  return Boolean(
    isRecord(value)
    && value.saveVersion === 11
    && (typeof value.savedAt === 'string' || value.savedAt === null)
    && value.campaignDay === state.turn
    && value.difficulty === state.difficulty
    && value.territoryCount === Object.keys(state.territories).length
    && value.formationCount === Object.keys(state.taskGroups).length
  );
}

function readMetadata(storage: StorageReader, state: GameState): SaveMetadata {
  try {
    const raw = storage.getItem(SAVE_METADATA_KEY);
    if (!raw) return createSaveMetadata(state, null);
    const parsed = JSON.parse(raw) as unknown;
    return metadataMatchesState(parsed, state) ? parsed : createSaveMetadata(state, null);
  } catch {
    return createSaveMetadata(state, null);
  }
}

function readRaw(storage: StorageReader, key: string): string | null | SaveInspection {
  try {
    return storage.getItem(key);
  } catch {
    return {
      ok: false,
      code: 'storage-unavailable',
      message: 'Browser storage is unavailable. Check the browser privacy and storage settings.'
    };
  }
}

function inspectRaw(storage: StorageReader, raw: string, source: 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'): SaveInspection {
  try {
    const parsed = stateFromStoredValue(JSON.parse(raw) as unknown);
    if (source === 'v11' && isV11State(parsed)) {
      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };
    }
    if (source === 'v10' && isV10State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v9' && isV9State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v8' && isV8State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v7' && isV7State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v6' && isV6State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v5' && isV5State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v4' && isV4State(parsed)) {
      const state = upgradeStrategicState(parsed);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v3' && isV3State(parsed)) {
      const state = upgradeStrategicState({ ...parsed, version: 4 } as LegacyV4State);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (source === 'v2' && isV2State(parsed)) {
      const state = upgradeStrategicState({ ...parsed, version: 4, operations: {} } as unknown as LegacyV4State);
      return { ok: true, state, metadata: createSaveMetadata(state, null), source };
    }
    if (isRecord(parsed) && typeof parsed.version === 'number') {
      return { ok: false, code: 'unsupported', message: 'The saved campaign uses an unsupported version.' };
    }
    return { ok: false, code: 'corrupt', message: 'The saved campaign is corrupted and could not be loaded.' };
  } catch {
    return { ok: false, code: 'corrupt', message: 'The saved campaign is corrupted and could not be loaded.' };
  }
}

export function inspectStoredCampaign(storage: StorageReader): SaveInspection {
  const current = readRaw(storage, CURRENT_SAVE_KEY);
  if (typeof current !== 'string' && current !== null) return current;
  if (current) return inspectRaw(storage, current, 'v11');

  const v10 = readRaw(storage, LEGACY_V10_SAVE_KEY);
  if (typeof v10 !== 'string' && v10 !== null) return v10;
  if (v10) return inspectRaw(storage, v10, 'v10');

  const v9 = readRaw(storage, LEGACY_V9_SAVE_KEY);
  if (typeof v9 !== 'string' && v9 !== null) return v9;
  if (v9) return inspectRaw(storage, v9, 'v9');

  const v8 = readRaw(storage, LEGACY_V8_SAVE_KEY);
  if (typeof v8 !== 'string' && v8 !== null) return v8;
  if (v8) return inspectRaw(storage, v8, 'v8');

  const v7 = readRaw(storage, LEGACY_V7_SAVE_KEY);
  if (typeof v7 !== 'string' && v7 !== null) return v7;
  if (v7) return inspectRaw(storage, v7, 'v7');

  const v6 = readRaw(storage, LEGACY_V6_SAVE_KEY);
  if (typeof v6 !== 'string' && v6 !== null) return v6;
  if (v6) return inspectRaw(storage, v6, 'v6');

  const v5 = readRaw(storage, LEGACY_V5_SAVE_KEY);
  if (typeof v5 !== 'string' && v5 !== null) return v5;
  if (v5) return inspectRaw(storage, v5, 'v5');

  const v4 = readRaw(storage, LEGACY_V4_SAVE_KEY);
  if (typeof v4 !== 'string' && v4 !== null) return v4;
  if (v4) return inspectRaw(storage, v4, 'v4');

  const previous = readRaw(storage, LEGACY_V3_SAVE_KEY);
  if (typeof previous !== 'string' && previous !== null) return previous;
  if (previous) return inspectRaw(storage, previous, 'v3');

  const legacy = readRaw(storage, LEGACY_V2_SAVE_KEY);
  if (typeof legacy !== 'string' && legacy !== null) return legacy;
  if (legacy) return inspectRaw(storage, legacy, 'v2');

  return { ok: false, code: 'missing', message: 'No saved campaign was found in this browser.' };
}

export function storageIsWritable(storage: StorageWriter): boolean {
  const key = 'future-conquest-storage-probe';
  try {
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function writeMetadataForCurrentSave(storage: StorageWriter, savedAt = new Date().toISOString()): MetadataWriteResult {
  try {
    const raw = storage.getItem(CURRENT_SAVE_KEY);
    if (!raw) return { ok: false, code: 'missing', message: 'The campaign was not written to browser storage.' };
    const parsed = stateFromStoredValue(JSON.parse(raw) as unknown);
    if (!isV11State(parsed)) return { ok: false, code: 'corrupt', message: 'The campaign save could not be verified.' };
    const metadata = createSaveMetadata(parsed, savedAt);
    storage.setItem(SAVE_METADATA_KEY, JSON.stringify(metadata));
    return { ok: true, metadata };
  } catch {
    return {
      ok: false,
      code: 'storage-unavailable',
      message: 'The campaign could not be saved. Check the browser privacy and storage settings.'
    };
  }
}

export function formatSaveTime(savedAt: string | null): string {
  if (!savedAt) return 'legacy save';
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return 'saved time unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
