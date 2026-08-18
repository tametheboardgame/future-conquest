import { audioManager, type MusicContext } from './audio-manager';

const ATTACK_ACTION = /begin operation|join operation|confirm operation|reinforce operation/i;
const MOVE_ACTION = /issue movement order/i;
const RESOLVE_ACTION = /resolve day|end day|accept risk and resolve/i;
const GARRISON_ACTION = /assign as garrison|release from garrison/i;

function buttonLabel(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  return target.closest('button')?.textContent?.trim() ?? '';
}

function afterActionCue(alert: Element): 'battle-victory' | 'battle-loss' {
  return alert.classList.contains('victory') || alert.classList.contains('repelled')
    ? 'battle-victory'
    : 'battle-loss';
}

/**
 * Presentation-only campaign audio bridge.
 *
 * The game simulation remains completely unaware of audio. This bridge reads
 * already-rendered command UI state and user actions, then asks AudioManager
 * for music/cues. If the DOM, Web Audio or music assets are unavailable the
 * campaign continues normally.
 */
export function installCampaignAudioDirector(): () => void {
  let lastAfterActionKey = '';
  let warningWasVisible = false;
  let heldContext: MusicContext | null = null;
  let holdUntil = 0;
  let lastRequestedContext: MusicContext = 'game';

  const requestContext = (context: MusicContext, holdMs = 0) => {
    if (holdMs > 0) {
      heldContext = context;
      holdUntil = Date.now() + holdMs;
    }
    if (context === lastRequestedContext && holdMs === 0) return;
    lastRequestedContext = context;
    audioManager.requestMusic(context, 550);
  };

  const scan = () => {
    const alert = document.querySelector('.combat-report-alert');
    const alertKey = alert?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (alert && alertKey && alertKey !== lastAfterActionKey) {
      lastAfterActionKey = alertKey;
      void audioManager.playSfx(afterActionCue(alert));
      requestContext('combat', 18_000);
    } else if (!alert) {
      lastAfterActionKey = '';
    }

    const warningVisible = Boolean(document.querySelector('.supply-warning-dialog'));
    if (warningVisible && !warningWasVisible) {
      void audioManager.playSfx('warning');
    }
    warningWasVisible = warningVisible;

    if (heldContext && Date.now() < holdUntil) {
      requestContext(heldContext);
      return;
    }
    heldContext = null;

    if (alert) {
      requestContext('combat');
      return;
    }

    if (warningVisible || document.querySelector('.priority-order-action.attack')) {
      requestContext('tension');
      return;
    }

    requestContext('game');
  };

  const onClick = (event: MouseEvent) => {
    const label = buttonLabel(event.target);
    if (!label) return;

    if (ATTACK_ACTION.test(label)) {
      void audioManager.playSfx('attack-order');
      requestContext('combat', 12_000);
    } else if (MOVE_ACTION.test(label)) {
      void audioManager.playSfx('order-issued');
    } else if (RESOLVE_ACTION.test(label)) {
      void audioManager.playSfx('movement-resolve');
      requestContext('tension', 7_000);
    } else if (GARRISON_ACTION.test(label)) {
      void audioManager.playSfx('ui-confirm');
    }
  };

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('click', onClick, true);
  const interval = window.setInterval(scan, 2_500);
  scan();

  return () => {
    observer.disconnect();
    document.removeEventListener('click', onClick, true);
    window.clearInterval(interval);
  };
}
