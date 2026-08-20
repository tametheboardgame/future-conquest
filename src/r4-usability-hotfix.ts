type ManagedAlertKind = 'logistics' | 'adviser' | 'enemy-action' | 'after-action';

type ManagedAlertConfig = {
  selector: string;
  kind: ManagedAlertKind;
};

type AlertPreferences = {
  muteAll: boolean;
  suppressedKeys: string[];
};

const ALERT_PREFERENCES_KEY = 'future-conquest-alert-preferences-v1';
const MANAGED_ALERTS: ManagedAlertConfig[] = [
  { selector: '.operational-alert-strip', kind: 'logistics' },
  { selector: '.adviser-alert-strip', kind: 'adviser' },
  { selector: '.enemy-action-alert', kind: 'enemy-action' },
  { selector: '.combat-report-alert', kind: 'after-action' }
];

let observer: MutationObserver | null = null;
let syncQueued = false;

const normaliseText = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

function loadAlertPreferences(): AlertPreferences {
  try {
    const raw = window.localStorage.getItem(ALERT_PREFERENCES_KEY);
    if (!raw) return { muteAll: false, suppressedKeys: [] };
    const parsed = JSON.parse(raw) as Partial<AlertPreferences>;
    return {
      muteAll: parsed.muteAll === true,
      suppressedKeys: Array.isArray(parsed.suppressedKeys)
        ? [...new Set(parsed.suppressedKeys.filter((value): value is string => typeof value === 'string'))]
        : []
    };
  } catch {
    return { muteAll: false, suppressedKeys: [] };
  }
}

function saveAlertPreferences(preferences: AlertPreferences): AlertPreferences {
  const normalised = {
    muteAll: preferences.muteAll === true,
    suppressedKeys: [...new Set(preferences.suppressedKeys)]
  };
  try {
    window.localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(normalised));
  } catch {
    // Browser storage is optional. The current-session controls still work.
  }
  return normalised;
}

function semanticAlertKey(alert: HTMLElement, kind: ManagedAlertKind): string {
  if (kind === 'logistics') {
    const severity = ['critical', 'warning', 'danger'].find(value => alert.classList.contains(value)) ?? 'status';
    return `logistics:${severity}`;
  }

  if (kind === 'adviser') {
    const firstWarning = normaliseText(alert.querySelector('.adviser-warning-item strong')?.textContent);
    return `adviser:${firstWarning || 'strategic-risks'}`;
  }

  if (kind === 'enemy-action') {
    const heading = normaliseText(alert.querySelector('.enemy-action-copy strong')?.textContent) || 'enemy-action';
    const location = normaliseText(alert.querySelector('.enemy-action-copy > span')?.textContent).split('·')[0]?.trim();
    return `enemy-action:${heading}:${location || 'unknown'}`;
  }

  const heading = normaliseText(alert.querySelector(':scope > div > strong')?.textContent)
    || normaliseText(alert.querySelector('strong')?.textContent)
    || 'after-action';
  return `after-action:${heading}`;
}

function isMapViewActive(): boolean {
  return Boolean(document.querySelector('.command-map-workspace'));
}

function ensurePreferenceActions(alert: HTMLElement, kind: ManagedAlertKind, preferenceKey: string): void {
  let actions = alert.querySelector<HTMLElement>(':scope > .r4-alert-preference-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'r4-alert-preference-actions';

    const suppressLabel = document.createElement('label');
    suppressLabel.className = 'r4-alert-suppress';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const text = document.createElement('span');
    text.textContent = 'Don’t show this alert again';
    suppressLabel.append(checkbox, text);

    const muteButton = document.createElement('button');
    muteButton.type = 'button';
    muteButton.className = 'r4-alert-mute-all';
    muteButton.textContent = 'Mute all alerts';

    actions.append(suppressLabel, muteButton);
    alert.append(actions);
  }

  actions.dataset.alertKind = kind;
  actions.dataset.preferenceKey = preferenceKey;
  const checkbox = actions.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (checkbox) {
    checkbox.checked = loadAlertPreferences().suppressedKeys.includes(preferenceKey);
    checkbox.onchange = event => {
      event.stopPropagation();
      const current = loadAlertPreferences();
      const nextKeys = checkbox.checked
        ? [...current.suppressedKeys, preferenceKey]
        : current.suppressedKeys.filter(value => value !== preferenceKey);
      saveAlertPreferences({ ...current, suppressedKeys: nextKeys });
      queueSync();
    };
  }

  const muteButton = actions.querySelector<HTMLButtonElement>('.r4-alert-mute-all');
  if (muteButton) {
    muteButton.onclick = event => {
      event.stopPropagation();
      const current = loadAlertPreferences();
      saveAlertPreferences({ ...current, muteAll: true });
      queueSync();
    };
  }
}

function syncRestoreControl(preferences: AlertPreferences): void {
  const host = document.querySelector<HTMLElement>('.topbar-command-actions');
  let button = document.querySelector<HTMLButtonElement>('.r4-alert-restore-control');
  const active = preferences.muteAll || preferences.suppressedKeys.length > 0;

  if (!active || !host) {
    button?.remove();
    return;
  }

  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'r4-alert-restore-control';
    button.onclick = () => {
      saveAlertPreferences({ muteAll: false, suppressedKeys: [] });
      queueSync();
    };
    host.prepend(button);
  }

  const label = preferences.muteAll
    ? 'Alerts muted · restore'
    : `Alerts filtered (${preferences.suppressedKeys.length}) · restore`;
  if (button.textContent !== label) button.textContent = label;
  button.title = 'Restore all passive campaign alerts';
}

function syncAlerts(): void {
  const preferences = loadAlertPreferences();
  const mapActive = isMapViewActive();

  for (const config of MANAGED_ALERTS) {
    document.querySelectorAll<HTMLElement>(config.selector).forEach(alert => {
      const preferenceKey = semanticAlertKey(alert, config.kind);
      ensurePreferenceActions(alert, config.kind, preferenceKey);
      const suppressed = preferences.suppressedKeys.includes(preferenceKey);
      const episodeDismissed = alert.dataset.wp6Dismissed === 'true';
      const hidden = !mapActive || preferences.muteAll || suppressed || episodeDismissed;
      alert.hidden = hidden;
      alert.dataset.r4AlertManaged = 'true';
      alert.dataset.r4PreferenceKey = preferenceKey;
      alert.dataset.r4ViewHidden = !mapActive ? 'true' : 'false';
      alert.dataset.r4PreferenceHidden = preferences.muteAll || suppressed ? 'true' : 'false';
    });
  }

  syncRestoreControl(preferences);
}

function findLayerCheckbox(labelText: string): HTMLInputElement | null {
  const labels = [...document.querySelectorAll<HTMLLabelElement>('.r3-terrain-layer-control .map-layer-options label')];
  const label = labels.find(candidate => normaliseText(candidate.textContent) === labelText);
  return label?.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? null;
}

function syncFormationSelectors(): void {
  const mapActive = isMapViewActive();
  const formationLayer = findLayerCheckbox('Friendly formations');
  const selectorsEnabled = mapActive && (formationLayer?.checked ?? true);

  document.querySelectorAll<HTMLElement>('.r3-terrain-task-group-marker').forEach(marker => {
    marker.classList.toggle('r4-formation-selector', selectorsEnabled);
  });
}

function showStrategicRoutes(): void {
  const control = document.querySelector<HTMLDetailsElement>('.r3-terrain-layer-control');
  if (control) control.open = true;
  const checkbox = findLayerCheckbox('Strategic routes');
  if (checkbox && !checkbox.checked) checkbox.click();
}

function openLogistics(): void {
  document.querySelector<HTMLButtonElement>('[data-command-view="logistics"]')?.click();
}

function ensureCutOffExplainer(card: HTMLElement): void {
  let explainer = card.querySelector<HTMLElement>(':scope > .r4-cut-off-explainer');
  if (!explainer) {
    explainer = document.createElement('aside');
    explainer.className = 'r4-cut-off-explainer';
    explainer.innerHTML = '<strong>CUT OFF · SUPPLY DELIVERY BELOW 15%</strong><p>This formation is receiving less than 15% of its supply demand. Restore a viable supply path by securing the route chain, reopening or repairing blocked routes, increasing network/source capacity, or raising this formation’s logistics priority.</p>';

    const actions = document.createElement('div');
    const routesButton = document.createElement('button');
    routesButton.type = 'button';
    routesButton.textContent = 'Show supply routes';
    routesButton.onclick = showStrategicRoutes;
    const logisticsButton = document.createElement('button');
    logisticsButton.type = 'button';
    logisticsButton.textContent = 'Open Logistics diagnostics';
    logisticsButton.onclick = openLogistics;
    actions.append(routesButton, logisticsButton);
    explainer.append(actions);

    const condition = card.querySelector('.supply-condition.cut-off');
    const row = condition?.closest('div');
    if (row) row.insertAdjacentElement('afterend', explainer);
    else card.append(explainer);
  }
}

function syncCutOffClarity(): void {
  const selectedCard = document.querySelector<HTMLElement>('.selected-group.selected-formation-card');
  const cutOff = Boolean(selectedCard?.querySelector('.supply-condition.cut-off'));

  document.querySelectorAll<HTMLElement>('.r3-terrain-task-group-marker.selected').forEach(marker => {
    marker.classList.toggle('r4-cut-off', cutOff);
    if (cutOff) {
      marker.title = 'CUT OFF: supply delivery is below 15%. Select for recovery guidance.';
      marker.setAttribute('aria-description', 'Cut off. Supply delivery is below fifteen percent.');
    } else {
      marker.removeAttribute('aria-description');
    }
  });

  if (selectedCard && cutOff) ensureCutOffExplainer(selectedCard);
  selectedCard?.querySelector<HTMLElement>('.r4-cut-off-explainer')?.toggleAttribute('hidden', !cutOff);
}

function sync(): void {
  syncQueued = false;
  syncAlerts();
  syncFormationSelectors();
  syncCutOffClarity();
}

function queueSync(): void {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(sync);
}

export function installR4UsabilityHotfix(): void {
  if (observer || typeof document === 'undefined') return;

  sync();
  document.addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement && event.target.closest('.r3-terrain-layer-control')) queueSync();
  });
  observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class']
  });
}
