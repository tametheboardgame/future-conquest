export const GLOBAL_SETTINGS_STORAGE_KEY = 'future-conquest-global-settings-v1';
export const DEFAULT_MUSIC_TRACK_ID = 'black-protocol-dawn';
export const MUSIC_MODES = ['adaptive', 'manual'] as const;
export type MusicMode = typeof MUSIC_MODES[number];

export interface GlobalSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  musicTrackId: string;
  musicMode: MusicMode;
  autosaveEnabled: boolean;
  assistanceLevel: AssistanceLevel;
}

export const ASSISTANCE_LEVELS = ['Full Guidance', 'Recommended', 'Critical Only', 'Off'] as const;
export type AssistanceLevel = typeof ASSISTANCE_LEVELS[number];

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  masterVolume: 0.8,
  musicVolume: 0.72,
  sfxVolume: 0.8,
  muted: false,
  musicTrackId: DEFAULT_MUSIC_TRACK_ID,
  musicMode: 'adaptive',
  autosaveEnabled: true,
  assistanceLevel: 'Recommended'
};

const clampVolume = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback
);

export function normaliseGlobalSettings(value: Partial<GlobalSettings> | undefined): GlobalSettings {
  const musicTrackId = typeof value?.musicTrackId === 'string' && value.musicTrackId.trim()
    ? value.musicTrackId
    : DEFAULT_GLOBAL_SETTINGS.musicTrackId;
  const migratedMusicMode: MusicMode = musicTrackId !== DEFAULT_MUSIC_TRACK_ID ? 'manual' : DEFAULT_GLOBAL_SETTINGS.musicMode;

  return {
    masterVolume: clampVolume(value?.masterVolume, DEFAULT_GLOBAL_SETTINGS.masterVolume),
    musicVolume: clampVolume(value?.musicVolume, DEFAULT_GLOBAL_SETTINGS.musicVolume),
    sfxVolume: clampVolume(value?.sfxVolume, DEFAULT_GLOBAL_SETTINGS.sfxVolume),
    muted: typeof value?.muted === 'boolean' ? value.muted : DEFAULT_GLOBAL_SETTINGS.muted,
    musicTrackId,
    musicMode: MUSIC_MODES.includes(value?.musicMode as MusicMode)
      ? value?.musicMode as MusicMode
      : migratedMusicMode,
    autosaveEnabled: typeof value?.autosaveEnabled === 'boolean' ? value.autosaveEnabled : DEFAULT_GLOBAL_SETTINGS.autosaveEnabled,
    assistanceLevel: ASSISTANCE_LEVELS.includes(value?.assistanceLevel as AssistanceLevel)
      ? value?.assistanceLevel as AssistanceLevel
      : DEFAULT_GLOBAL_SETTINGS.assistanceLevel
  };
}

export function loadGlobalSettings(storage: Pick<Storage, 'getItem'> = window.localStorage): GlobalSettings {
  try {
    const raw = storage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_GLOBAL_SETTINGS;
    return normaliseGlobalSettings(JSON.parse(raw) as Partial<GlobalSettings>);
  } catch {
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

export function saveGlobalSettings(
  settings: GlobalSettings,
  storage: Pick<Storage, 'setItem'> = window.localStorage
): GlobalSettings {
  const normalised = normaliseGlobalSettings(settings);
  try {
    storage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(normalised));
  } catch {
    // Settings remain active for this session when browser storage is unavailable.
  }
  return normalised;
}
