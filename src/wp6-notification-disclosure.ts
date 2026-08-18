const MANAGED_ALERTS = [
  { selector: '.operational-alert-strip', label: 'logistics warning' },
  { selector: '.adviser-alert-strip', label: 'adviser warning' },
  { selector: '.enemy-action-alert', label: 'enemy action warning' }
] as const;

const dismissedSignatures = new Set<string>();
let observer: MutationObserver | null = null;
let syncQueued = false;

function normaliseText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function alertSignature(alert: HTMLElement): string {
  const clone = alert.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.wp6-alert-dismiss').forEach(node => node.remove());
  return `${alert.className}|${normaliseText(clone.textContent)}`;
}

function addDismissControl(alert: HTMLElement, label: string, signature: string): void {
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
  button.onclick = () => {
    dismissedSignatures.add(signature);
    alert.hidden = true;
    alert.dataset.wp6Dismissed = 'true';
  };
}

function reconcileAlert(alert: HTMLElement, label: string): string {
  const signature = alertSignature(alert);
  const previousSignature = alert.dataset.wp6AlertSignature;

  if (previousSignature !== signature) {
    alert.dataset.wp6AlertSignature = signature;
    const dismissed = dismissedSignatures.has(signature);
    alert.hidden = dismissed;
    if (dismissed) alert.dataset.wp6Dismissed = 'true';
    else delete alert.dataset.wp6Dismissed;
  }

  alert.dataset.wp6NotificationManaged = 'true';
  addDismissControl(alert, label, signature);
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

  reconcileNotifications();
  observer = new MutationObserver(queueReconcile);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class']
  });
}
