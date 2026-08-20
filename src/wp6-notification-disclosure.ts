const MANAGED_ALERTS = [
  { selector: '.operational-alert-strip', label: 'logistics warning' },
  { selector: '.adviser-alert-strip', label: 'adviser warning' },
  { selector: '.enemy-action-alert', label: 'enemy action warning' }
] as const;

const dismissedSignatures = new Set<string>();
let observer: MutationObserver | null = null;
let syncQueued = false;
let delegatedDismissInstalled = false;

function normaliseText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function alertSignature(alert: HTMLElement): string {
  const clone = alert.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.wp6-alert-dismiss, .r4-alert-preference-actions').forEach(node => node.remove());
  return `${alert.className}|${normaliseText(clone.textContent)}`;
}

function addDismissControl(alert: HTMLElement, label: string): void {
  let button = alert.querySelector<HTMLButtonElement>(':scope > .wp6-alert-dismiss');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'wp6-alert-dismiss';
    button.textContent = '×';
    alert.append(button);
  }

  button.setAttribute('aria-label', `Dismiss ${label}`);
  button.title = 'Dismiss until this warning changes';
}

function keepDismissed(alert: HTMLElement): void {
  if (alert.dataset.wp6Dismissed !== 'true') alert.dataset.wp6Dismissed = 'true';
  if (!alert.hidden) alert.hidden = true;
}

function dismissAlertEpisode(alert: HTMLElement): void {
  const signature = alertSignature(alert);
  dismissedSignatures.add(signature);
  alert.dataset.wp6DismissedSignature = signature;
  keepDismissed(alert);
}

function installDelegatedDismissHandler(): void {
  if (delegatedDismissInstalled) return;
  delegatedDismissInstalled = true;
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('.wp6-alert-dismiss');
    if (!button) return;
    const alert = button.parentElement;
    if (!(alert instanceof HTMLElement)) return;
    if (!MANAGED_ALERTS.some(config => alert.matches(config.selector))) return;
    dismissAlertEpisode(alert);
  }, true);
}

function reconcileAlert(alert: HTMLElement, label: string): string {
  const signature = alertSignature(alert);
  const previousSignature = alert.dataset.wp6AlertSignature;
  const episodeSignature = alert.dataset.wp6DismissedSignature;

  if (episodeSignature && episodeSignature !== signature) {
    dismissedSignatures.delete(episodeSignature);
    delete alert.dataset.wp6DismissedSignature;
    if (alert.dataset.wp6Dismissed === 'true') delete alert.dataset.wp6Dismissed;
  }

  const currentEpisodeSignature = alert.dataset.wp6DismissedSignature;
  if (currentEpisodeSignature === signature || dismissedSignatures.has(signature)) {
    alert.dataset.wp6DismissedSignature = signature;
    dismissedSignatures.add(signature);
    keepDismissed(alert);
  } else if (previousSignature !== signature) {
    alert.dataset.wp6AlertSignature = signature;
    if (alert.dataset.wp6Dismissed === 'true') delete alert.dataset.wp6Dismissed;
    if (alert.hidden) alert.hidden = false;
  }

  if (alert.dataset.wp6AlertSignature !== signature) alert.dataset.wp6AlertSignature = signature;
  alert.dataset.wp6NotificationManaged = 'true';
  addDismissControl(alert, label);
  return signature;
}

function reconcileNotifications(): void {
  syncQueued = false;
  const presentSignatures = new Set<string>();

  for (const config of MANAGED_ALERTS) {
    document.querySelectorAll<HTMLElement>(config.selector).forEach(alert => {
      presentSignatures.add(reconcileAlert(alert, config.label));
    });
  }

  // Dismissal belongs to one continuous warning episode, not forever. If the
  // condition actually disappears from the DOM, an identical warning that
  // returns later is a new episode and deserves the player's attention again.
  for (const signature of dismissedSignatures) {
    if (!presentSignatures.has(signature)) dismissedSignatures.delete(signature);
  }
}

function queueReconcile(): void {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(reconcileNotifications);
}

export function installWp6NotificationDisclosure(): void {
  if (observer || typeof document === 'undefined') return;

  installDelegatedDismissHandler();
  reconcileNotifications();
  observer = new MutationObserver(queueReconcile);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'data-wp6-dismissed']
  });
}
