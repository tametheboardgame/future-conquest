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
  { selector: '.enemy-action-alert', kind: 'enemy-action' },
  { selector: '.adviser-alert-strip', kind: 'adviser' },
  { selector: '.combat-report-alert', kind: 'after-action' }
];

let observer: MutationObserver | null = null;
let syncQueued = false;

const normaliseText = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

function setText(node: Element | null, value: string): void {
  if (node && node.textContent !== value) node.textContent = value;
}

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
  const normalised: AlertPreferences = {
    muteAll: preferences.muteAll === true,
    suppressedKeys: [...new Set(preferences.suppressedKeys)]
  };
  try {
    window.localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(normalised));
  } catch {
    // Storage is optional. Controls still work for the current page lifetime.
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

function queueSync(): void {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(sync);
}

function ensurePreferenceActions(alert: HTMLElement, kind: ManagedAlertKind, preferenceKey: string): void {
  let actions = alert.querySelector<HTMLElement>(':scope > .r4-alert-preference-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'r4-alert-preference-actions';

    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'r4-alert-details';

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

    actions.append(detailsButton, suppressLabel, muteButton);
    alert.append(actions);
  }

  actions.dataset.alertKind = kind;
  actions.dataset.preferenceKey = preferenceKey;

  const detailsButton = actions.querySelector<HTMLButtonElement>('.r4-alert-details');
  if (detailsButton) {
    const expanded = alert.dataset.r4Expanded === 'true';
    setText(detailsButton, expanded ? 'Collapse' : 'Details');
    const ariaExpanded = String(expanded);
    if (detailsButton.getAttribute('aria-expanded') !== ariaExpanded) {
      detailsButton.setAttribute('aria-expanded', ariaExpanded);
    }
    detailsButton.onclick = event => {
      event.stopPropagation();
      alert.dataset.r4Expanded = alert.dataset.r4Expanded === 'true' ? 'false' : 'true';
      queueSync();
    };
  }

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

function syncAlertSettingsControl(preferences: AlertPreferences): void {
  const host = document.querySelector<HTMLElement>('.topbar-command-actions');
  if (!host) return;

  document.querySelector('.r4-alert-restore-control')?.remove();

  let settings = host.querySelector<HTMLDetailsElement>('.r4-alert-settings');
  if (!settings) {
    settings = document.createElement('details');
    settings.className = 'r4-alert-settings';

    const summary = document.createElement('summary');
    const panel = document.createElement('div');
    panel.className = 'r4-alert-settings-panel';

    const muteLabel = document.createElement('label');
    const muteInput = document.createElement('input');
    muteInput.type = 'checkbox';
    const muteText = document.createElement('span');
    muteText.textContent = 'Mute all passive alerts';
    muteLabel.append(muteInput, muteText);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Show all alerts again';

    const note = document.createElement('small');
    note.textContent = 'Controls logistics, adviser, enemy-action and after-action pop-ups.';

    panel.append(muteLabel, reset, note);
    settings.append(summary, panel);
    host.prepend(settings);
  }

  const summary = settings.querySelector('summary');
  const summaryText = preferences.muteAll
    ? 'Alerts off'
    : preferences.suppressedKeys.length > 0
      ? `Alerts · ${preferences.suppressedKeys.length} hidden`
      : 'Alerts';
  setText(summary, summaryText);

  const muteInput = settings.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (muteInput) {
    muteInput.checked = preferences.muteAll;
    muteInput.onchange = () => {
      const current = loadAlertPreferences();
      saveAlertPreferences({ ...current, muteAll: muteInput.checked });
      queueSync();
    };
  }

  const reset = settings.querySelector<HTMLButtonElement>('button');
  if (reset) {
    reset.disabled = !preferences.muteAll && preferences.suppressedKeys.length === 0;
    reset.onclick = () => {
      saveAlertPreferences({ muteAll: false, suppressedKeys: [] });
      queueSync();
    };
  }
}

function syncAlerts(): void {
  const preferences = loadAlertPreferences();
  const mapActive = isMapViewActive();
  const commandView = mapActive ? 'map' : 'other';
  if (document.body.dataset.r4CommandView !== commandView) document.body.dataset.r4CommandView = commandView;

  let stackIndex = 0;
  for (const config of MANAGED_ALERTS) {
    document.querySelectorAll<HTMLElement>(config.selector).forEach(alert => {
      const preferenceKey = semanticAlertKey(alert, config.kind);
      ensurePreferenceActions(alert, config.kind, preferenceKey);
      const suppressed = preferences.suppressedKeys.includes(preferenceKey);
      const episodeDismissed = alert.dataset.wp6Dismissed === 'true';
      const hidden = !mapActive || preferences.muteAll || suppressed || episodeDismissed;
      if (alert.hidden !== hidden) alert.hidden = hidden;
      alert.dataset.r4AlertManaged = 'true';
      alert.dataset.r4PreferenceKey = preferenceKey;
      alert.dataset.r4ViewHidden = !mapActive ? 'true' : 'false';
      alert.dataset.r4PreferenceHidden = preferences.muteAll || suppressed ? 'true' : 'false';
      if (!hidden) {
        const index = String(stackIndex);
        if (alert.style.getPropertyValue('--r4-alert-stack-index') !== index) {
          alert.style.setProperty('--r4-alert-stack-index', index);
        }
        stackIndex += 1;
      }
    });
  }

  syncAlertSettingsControl(preferences);
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
    if (selectorsEnabled) {
      if (marker.hidden) marker.hidden = false;
      marker.dataset.r4FormationSelectable = 'true';
      if (marker.style.pointerEvents !== 'auto') marker.style.pointerEvents = 'auto';
      const label = marker.getAttribute('aria-label');
      if (label) {
        const title = `Select ${label}`;
        if (marker.title !== title && marker.dataset.r4CutOffTitle !== 'true') marker.title = title;
      }
    } else {
      delete marker.dataset.r4FormationSelectable;
      if (marker.style.pointerEvents) marker.style.removeProperty('pointer-events');
    }
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

function selectedFormationName(card: HTMLElement): string {
  return normaliseText(card.querySelector('h2')?.textContent) || 'Selected formation';
}

function selectedFormationThroughput(card: HTMLElement): string {
  const rows = [...card.querySelectorAll('dl > div')];
  const row = rows.find(candidate => normaliseText(candidate.querySelector('dt')?.textContent) === 'Delivered throughput');
  return normaliseText(row?.querySelector('dd')?.textContent);
}

function ensureCutOffExplainer(card: HTMLElement): void {
  let explainer = card.querySelector<HTMLElement>(':scope > .r4-cut-off-explainer');
  if (!explainer) {
    explainer = document.createElement('aside');
    explainer.className = 'r4-cut-off-explainer';

    const heading = document.createElement('strong');
    heading.textContent = 'CUT OFF · SUPPLY DELIVERY BELOW 15%';
    const copy = document.createElement('p');
    copy.textContent = 'Cut off means this formation is receiving less than 15% of its supply demand. It is a logistics condition, not automatically the reason a specific order control is disabled. Active orders, recovery state, blocked corridors or an out-of-range target can separately prevent an order.';
    const steps = document.createElement('ol');
    steps.innerHTML = '<li>Show strategic routes and trace a path back through controlled territory.</li><li>Secure any unsecured territory on that path.</li><li>Repair or reopen blocked and destroyed routes in Infrastructure.</li><li>If the network is overloaded, raise this formation’s logistics priority or improve hub/source capacity.</li>';

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

    explainer.append(heading, copy, steps, actions);
    const condition = card.querySelector('.supply-condition.cut-off');
    const row = condition?.closest('div');
    if (row) row.insertAdjacentElement('afterend', explainer);
    else card.append(explainer);
  }
}

function syncCutOffMapBanner(card: HTMLElement | null, cutOff: boolean): void {
  const mapPanel = document.querySelector<HTMLElement>('.command-map-workspace .map-panel');
  let banner = document.querySelector<HTMLElement>('.r4-cut-off-map-banner');

  if (!mapPanel || !card || !cutOff) {
    banner?.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement('aside');
    banner.className = 'r4-cut-off-map-banner';
    banner.setAttribute('role', 'status');

    const copy = document.createElement('div');
    copy.innerHTML = '<small>FORMATION LOGISTICS</small><strong></strong><span></span>';

    const actions = document.createElement('div');
    const routesButton = document.createElement('button');
    routesButton.type = 'button';
    routesButton.textContent = 'Show supply routes';
    routesButton.onclick = showStrategicRoutes;
    const logisticsButton = document.createElement('button');
    logisticsButton.type = 'button';
    logisticsButton.textContent = 'Fix in Logistics';
    logisticsButton.onclick = openLogistics;
    actions.append(routesButton, logisticsButton);

    banner.append(copy, actions);
    mapPanel.append(banner);
  }

  const name = selectedFormationName(card);
  const throughput = selectedFormationThroughput(card);
  const heading = banner.querySelector('strong');
  const detail = banner.querySelector('span');
  setText(heading, `CUT OFF · ${name}`);
  setText(detail, throughput && throughput !== '—'
    ? `Delivered throughput ${throughput}. Less than 15% of required supply is reaching this formation. Use the route view to find the break or bottleneck.`
    : 'Less than 15% of required supply is reaching this formation. Use the route view to find the break or bottleneck.');
}

function syncCutOffClarity(): void {
  const selectedCard = document.querySelector<HTMLElement>('.selected-group.selected-formation-card');
  const cutOff = Boolean(selectedCard?.querySelector('.supply-condition.cut-off'));
  const title = 'CUT OFF: less than 15% of required supply is being delivered. Select for recovery guidance.';

  document.querySelectorAll<HTMLElement>('.r3-terrain-task-group-marker').forEach(marker => {
    const shouldMarkCutOff = cutOff && marker.classList.contains('selected');
    marker.classList.toggle('r4-cut-off', shouldMarkCutOff);

    if (shouldMarkCutOff) {
      if (marker.title !== title) marker.title = title;
      marker.dataset.r4CutOffTitle = 'true';
      if (marker.getAttribute('aria-description') !== 'Cut off. Less than fifteen percent of required supply is being delivered.') {
        marker.setAttribute('aria-description', 'Cut off. Less than fifteen percent of required supply is being delivered.');
      }
    } else {
      if (marker.dataset.r4CutOffTitle === 'true') {
        marker.removeAttribute('title');
        delete marker.dataset.r4CutOffTitle;
      }
      if (marker.hasAttribute('aria-description')) marker.removeAttribute('aria-description');
    }
  });

  if (selectedCard && cutOff) ensureCutOffExplainer(selectedCard);
  const explainer = selectedCard?.querySelector<HTMLElement>('.r4-cut-off-explainer');
  if (explainer && explainer.hidden === cutOff) explainer.hidden = !cutOff;
  syncCutOffMapBanner(selectedCard, cutOff);
}

function sync(): void {
  syncQueued = false;
  syncAlerts();
  syncFormationSelectors();
  syncCutOffClarity();
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
    attributeFilter: ['class', 'hidden', 'data-declutter', 'data-physical-formations']
  });
}
