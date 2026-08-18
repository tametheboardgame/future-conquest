import {
  getWarningDefinition,
  loadWarningPreferences,
  saveWarningPreferences,
  shouldSuppressWarning,
  type WarningId
} from './game/warning-preferences';

const SOURCE_CAPACITY_TITLE = 'Territorial source capacity is nearly exhausted';
const ENHANCEMENT_CLASS = 'wp66-warning-preference-actions';

function resolveSupplyWarningId(dialog: HTMLElement): WarningId {
  if (document.querySelector('.network-supply-metric.critical, .operational-alert-strip.critical')) {
    return 'end-turn-logistics-critical';
  }
  const diagnosticTitles = [...dialog.querySelectorAll<HTMLElement>('li strong')]
    .map(item => item.textContent?.trim())
    .filter((value): value is string => Boolean(value));
  if (diagnosticTitles.length === 1 && diagnosticTitles[0] === SOURCE_CAPACITY_TITLE) {
    return 'supply-source-capacity';
  }
  return 'end-turn-logistics';
}

function findDialogButton(dialog: HTMLElement, label: string): HTMLButtonElement | undefined {
  return [...dialog.querySelectorAll<HTMLButtonElement>('button')]
    .find(button => button.textContent?.trim() === label);
}

function focusWarningSettings() {
  const section = document.getElementById('warning-preferences-settings');
  if (!section) return;
  section.scrollIntoView({ block: 'center' });
  section.querySelector<HTMLElement>('select, button, input')?.focus();
}

function openWarningSettings(dialog: HTMLElement) {
  findDialogButton(dialog, 'Return to command')?.click();
  window.setTimeout(() => {
    document.querySelector<HTMLButtonElement>('.global-settings-toggle')?.click();
    window.setTimeout(focusWarningSettings, 40);
  }, 0);
}

function enhanceSupplyWarning(dialog: HTMLElement) {
  const warningId = resolveSupplyWarningId(dialog);
  const definition = getWarningDefinition(warningId);
  dialog.dataset.warningId = warningId;
  dialog.dataset.warningSeverity = definition.severity;
  dialog.dataset.warningSuppressible = String(definition.suppressible);

  if (!dialog.dataset.wp66Presented) {
    dialog.dataset.wp66Presented = 'true';
    const preferences = loadWarningPreferences();
    if (shouldSuppressWarning(preferences, warningId)) {
      const backdrop = dialog.closest<HTMLElement>('.supply-warning-backdrop');
      backdrop?.setAttribute('data-wp66-auto-resolving', 'true');
      window.setTimeout(() => findDialogButton(dialog, 'Resolve anyway')?.click(), 0);
      return;
    }
  }

  if (dialog.querySelector(`.${ENHANCEMENT_CLASS}`)) return;
  const actions = dialog.querySelector<HTMLElement>('.supply-warning-actions');
  if (!actions) return;

  const preferenceActions = document.createElement('div');
  preferenceActions.className = ENHANCEMENT_CLASS;

  if (definition.suppressible) {
    const suppressButton = document.createElement('button');
    suppressButton.type = 'button';
    suppressButton.className = 'wp66-warning-suppress';
    suppressButton.textContent = 'Don’t show this warning again';
    suppressButton.addEventListener('click', () => {
      const current = loadWarningPreferences();
      const next = saveWarningPreferences({
        ...current,
        suppressedWarningIds: [...new Set([...current.suppressedWarningIds, warningId])]
      });
      suppressButton.textContent = next.suppressedWarningIds.includes(warningId)
        ? 'Suppressed for future turns'
        : 'Warning remains enabled';
      suppressButton.disabled = next.suppressedWarningIds.includes(warningId);
      window.dispatchEvent(new CustomEvent('future-conquest:warning-preferences-changed'));
    });
    preferenceActions.append(suppressButton);
  } else {
    const protectedCopy = document.createElement('span');
    protectedCopy.className = 'wp66-warning-protected';
    protectedCopy.textContent = definition.severity === 'critical'
      ? 'Critical warning · always shown'
      : 'Operational warning · always shown';
    preferenceActions.append(protectedCopy);
  }

  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'wp66-warning-settings';
  settingsButton.textContent = 'Warning settings';
  settingsButton.addEventListener('click', () => openWarningSettings(dialog));
  preferenceActions.append(settingsButton);
  actions.insertAdjacentElement('beforebegin', preferenceActions);
}

export function installWp66WarningPreferences() {
  const scan = () => {
    document.querySelectorAll<HTMLElement>('.supply-warning-dialog').forEach(enhanceSupplyWarning);
  };
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}
