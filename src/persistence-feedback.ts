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
let autosavePending = false;

function browserStorage(): Storage | null {
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

function findButton(label: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find(button => buttonLabel(button) === label);
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

function stopButtonAction(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function preflightSave(event: Event): void {
  const storage = browserStorage();
  if (storage && storageIsWritable(storage)) return;
  stopButtonAction(event);
  autosavePending = false;
  showNotice('error', 'The campaign could not be saved. Browser storage is unavailable.');
}

function preflightLoad(event: Event): void {
  const storage = browserStorage();
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
  const storage = browserStorage();
  if (!storage) {
    autosavePending = false;
    showNotice('error', 'The campaign could not be saved. Browser storage is unavailable.');
    return;
  }
  const result = writeMetadataForCurrentSave(storage);
  if (!result.ok) {
    autosavePending = false;
    showNotice('error', result.message);
    return;
  }
  const prefix = autosavePending ? 'Autosaved' : 'Game saved';
  autosavePending = false;
  showNotice(prefix === 'Autosaved' ? 'info' : 'success', formatMessage(prefix, result.metadata));
}

function finishLoad(): void {
  if (!pendingLoad) return;
  const loaded = pendingLoad;
  pendingLoad = null;
  const suffix = loaded.source === 'v5' ? '' : ' · save upgraded';
  showNotice('success', `${formatMessage('Game loaded', loaded.metadata)}${suffix}`);
}

function triggerAutosave(): void {
  const saveButton = findButton('Save');
  if (!saveButton || saveButton.disabled) {
    showNotice('error', 'Day resolved, but the autosave control was unavailable.');
    return;
  }
  autosavePending = true;
  saveButton.click();
}

function onDocumentCapture(event: Event): void {
  const button = buttonFromEvent(event);
  if (!button || button.disabled) return;
  const label = buttonLabel(button);
  if (label === 'Save') preflightSave(event);
  else if (label === 'Load') preflightLoad(event);
}

function onDocumentBubble(event: Event): void {
  const button = buttonFromEvent(event);
  if (!button || button.disabled) return;
  const label = buttonLabel(button);
  if (label === 'Save') window.setTimeout(finishSave, 0);
  else if (label === 'Load') window.setTimeout(finishLoad, 0);
  else if (label.startsWith('Resolve all orders')) window.setTimeout(triggerAutosave, 25);
}

export function installPersistenceFeedback(): void {
  if (window.__futureConquestPersistenceFeedback) return;
  window.__futureConquestPersistenceFeedback = true;
  document.addEventListener('click', onDocumentCapture, true);
  document.addEventListener('click', onDocumentBubble);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') installPersistenceFeedback();
