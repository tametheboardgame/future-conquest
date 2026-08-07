export const GLOBAL_SETTINGS_STORAGE_KEY = 'future-conquest-global-settings-v1';

export interface GlobalSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  masterVolume: 0.8,
  musicVolume: 0.72,
  sfxVolume: 0.8,
  muted: false
};

const clampVolume = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback
);

export function normaliseGlobalSettings(value: Partial<GlobalSettings> | undefined): GlobalSettings {
  return {
    masterVolume: clampVolume(value?.masterVolume, DEFAULT_GLOBAL_SETTINGS.masterVolume),
    musicVolume: clampVolume(value?.musicVolume, DEFAULT_GLOBAL_SETTINGS.musicVolume),
    sfxVolume: clampVolume(value?.sfxVolume, DEFAULT_GLOBAL_SETTINGS.sfxVolume),
    muted: typeof value?.muted === 'boolean' ? value.muted : DEFAULT_GLOBAL_SETTINGS.muted
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
