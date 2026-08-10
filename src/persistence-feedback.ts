import {
  formatSaveTime,
  inspectStoredCampaign,
  storageIsWritable,
  writeMetadataForCurrentSave,
  type SaveInspection,
  type SaveMetadata
} from './game/persistence';

declare global {
  interface Window {
    __futureConquestPersistenceFeedback?: boolean;
  }
}

type SuccessfulInspection = Extract<SaveInspection, { ok: true }>;
type NoticeTone = 'success' | 'info' | 'error';

let noticeTimer: number | null = null;
let pendingLoad: SuccessfulInspection | null = null;

export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buttonFromEvent(event: Event): HTMLButtonElement | null {
  return event.target instanceof Element ? event.target.closest('button') : null;
}

function buttonLabel(button: HTMLButtonElement): string {
  return button.textContent?.trim() ?? '';
}

function formatMessage(prefix: string, metadata: SaveMetadata): string {
  return `${prefix} · day ${String(metadata.campaignDay).padStart(3, '0')} · ${formatSaveTime(metadata.savedAt)}`;
}

function showNotice(tone: NoticeTone, message: string): void {
  let notice = document.getElementById('save-load-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'save-load-notice';
    document.body.appendChild(notice);
  }
  notice.className = `save-notice ${tone}`;
  notice.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  notice.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
  notice.textContent = message;
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => notice?.remove(), 3500);
}

/** Show persistence failures initiated outside the manual save/load controls. */
export function showPersistenceFailure(message: string): void {
  showNotice('error', message);
}

function stopButtonAction(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function preflightSave(event: Event): void {
  const storage = getBrowserStorage();
  if (storage && storageIsWritable(storage)) return;
  stopButtonAction(event);
  showNotice('error', 'The campaign could not be saved. Browser storage is unavailable.');
}

function preflightLoad(event: Event): void {
  const storage = getBrowserStorage();
  if (!storage) {
    stopButtonAction(event);
    showNotice('error', 'The saved campaign could not be read. Browser storage is unavailable.');
    return;
  }
  const inspection = inspectStoredCampaign(storage);
  if (!inspection.ok) {
    stopButtonAction(event);
    showNotice('error', inspection.message);
    return;
  }
  pendingLoad = inspection;
}

function finishSave(): void {
  const storage = getBrowserStorage();
  if (!storage) {
    showNotice('error', 'The campaign could not be saved. Browser storage is unavailable.');
    return;
  }
  const result = writeMetadataForCurrentSave(storage);
  if (!result.ok) {
    showNotice('error', result.message);
    return;
  }
  showNotice('success', formatMessage('Manual campaign saved', result.metadata));
}

function finishLoad(): void {
  if (!pendingLoad) return;
  const loaded = pendingLoad;
  pendingLoad = null;
  const suffix = loaded.source === 'v5' ? '' : ' · save upgraded';
  showNotice('success', `${formatMessage('Game loaded', loaded.metadata)}${suffix}`);
}

function onDocumentCapture(event: Event): void {
  const button = buttonFromEvent(event);
  if (!button || button.disabled) return;
  const label = buttonLabel(button);
  if (label === 'Manual Save') preflightSave(event);
  else if (label === 'Load Manual Save') preflightLoad(event);
}

function onDocumentBubble(event: Event): void {
  const button = buttonFromEvent(event);
  if (!button || button.disabled) return;
  const label = buttonLabel(button);
  if (label === 'Manual Save') window.setTimeout(finishSave, 0);
  else if (label === 'Load Manual Save') window.setTimeout(finishLoad, 0);
}

export function installPersistenceFeedback(): void {
  if (window.__futureConquestPersistenceFeedback) return;
  window.__futureConquestPersistenceFeedback = true;
  document.addEventListener('click', onDocumentCapture, true);
  document.addEventListener('click', onDocumentBubble);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') installPersistenceFeedback();
