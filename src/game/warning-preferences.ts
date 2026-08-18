export const WARNING_PREFERENCES_STORAGE_KEY = 'future-conquest-warning-preferences-v1';

export const WARNING_MODE_OPTIONS = [
  { id: 'default', label: 'Default warnings' },
  { id: 'reduced-advisory', label: 'Reduced advisory warnings' }
] as const;

export type WarningMode = typeof WARNING_MODE_OPTIONS[number]['id'];
export type WarningSeverity = 'advisory' | 'important' | 'critical';

export interface WarningDefinition {
  id: WarningId;
  label: string;
  severity: WarningSeverity;
  suppressible: boolean;
}

export const WARNING_DEFINITIONS = {
  'supply-source-capacity': {
    id: 'supply-source-capacity',
    label: 'Supply source capacity',
    severity: 'advisory',
    suppressible: true
  },
  'end-turn-logistics': {
    id: 'end-turn-logistics',
    label: 'Operational logistics failures',
    severity: 'important',
    suppressible: false
  },
  'end-turn-logistics-critical': {
    id: 'end-turn-logistics-critical',
    label: 'Critical logistics failures',
    severity: 'critical',
    suppressible: false
  }
} as const;

export type WarningId = keyof typeof WARNING_DEFINITIONS;

export interface WarningPreferences {
  warningMode: WarningMode;
  suppressedWarningIds: WarningId[];
}

export const DEFAULT_WARNING_PREFERENCES: WarningPreferences = {
  warningMode: 'default',
  suppressedWarningIds: []
};

const isWarningId = (value: unknown): value is WarningId => (
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(WARNING_DEFINITIONS, value)
);

export function normaliseWarningPreferences(value: Partial<WarningPreferences> | undefined): WarningPreferences {
  const warningMode = WARNING_MODE_OPTIONS.some(option => option.id === value?.warningMode)
    ? value!.warningMode as WarningMode
    : DEFAULT_WARNING_PREFERENCES.warningMode;
  const suppressedWarningIds = Array.isArray(value?.suppressedWarningIds)
    ? [...new Set(value.suppressedWarningIds.filter(isWarningId))]
      .filter(id => WARNING_DEFINITIONS[id].suppressible && WARNING_DEFINITIONS[id].severity !== 'critical')
    : [];
  return { warningMode, suppressedWarningIds };
}

export function loadWarningPreferences(
  storage: Pick<Storage, 'getItem'> = window.localStorage
): WarningPreferences {
  try {
    const raw = storage.getItem(WARNING_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WARNING_PREFERENCES, suppressedWarningIds: [] };
    return normaliseWarningPreferences(JSON.parse(raw) as Partial<WarningPreferences>);
  } catch {
    return { ...DEFAULT_WARNING_PREFERENCES, suppressedWarningIds: [] };
  }
}

export function saveWarningPreferences(
  preferences: WarningPreferences,
  storage: Pick<Storage, 'setItem'> = window.localStorage
): WarningPreferences {
  const normalised = normaliseWarningPreferences(preferences);
  try {
    storage.setItem(WARNING_PREFERENCES_STORAGE_KEY, JSON.stringify(normalised));
  } catch {
    // Preferences remain fail-open if browser storage is unavailable.
  }
  return normalised;
}

export function getWarningDefinition(id: WarningId): WarningDefinition {
  return WARNING_DEFINITIONS[id];
}

export function shouldSuppressWarning(preferences: WarningPreferences, id: WarningId): boolean {
  const definition = getWarningDefinition(id);
  if (!definition.suppressible || definition.severity === 'critical') return false;
  if (preferences.warningMode === 'reduced-advisory' && definition.severity === 'advisory') return true;
  return preferences.suppressedWarningIds.includes(id);
}
