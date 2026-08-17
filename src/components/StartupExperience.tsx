import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { audioManager } from '../audio/audio-manager';
import { BUILD_LABEL, BUILD_TIME } from '../generated/build-info';
import { TERRITORIES } from '../game/data';
import { loadGlobalSettings, saveGlobalSettings, type GlobalSettings } from '../game/global-settings';
import { INTRO_STORAGE_KEY } from '../game/intro-story';
import { formatSaveTime, inspectStoredCampaign, type SaveInspection } from '../game/persistence';
import { CampaignDefeatScreen, VictoryEndingComic } from './CampaignEndingExperience';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';
import { MapUxFoundations } from './MapUxFoundations';
import { MotionComicIntro, type ArtworkStatus } from './MotionComicIntro';
import { PortalArrivalSequence } from './PortalArrivalSequence';
import './prologue-build-stamp.css';
import './startup-launcher.css';

interface Props {
  children: ReactNode;
}

const GlobalSettingsContext = createContext<GlobalSettings | null>(null);

export function useLiveGlobalSettings(): GlobalSettings {
  const settings = useContext(GlobalSettingsContext);
  if (!settings) throw new Error('useLiveGlobalSettings must be used within StartupExperience');
  return settings;
}

type CampaignEndingKind = 'victory' | 'defeat';
type StartupMode = 'launcher' | 'intro' | 'game' | CampaignEndingKind;
type SuccessfulInspection = Extract<SaveInspection, { ok: true }>;
type IntroDestination = 'launcher' | 'campaign-map';

const ARRIVAL_PRESENTATION_KEY = 'future-conquest:r3-wp39c-arrival-played';

function detectPortalTerritory(): string | undefined {
  const pageText = document.body.innerText;
  return Object.values(TERRITORIES).find(territory => (
    pageText.includes(`portal has opened near ${territory.centre}`)
    || pageText.includes(`Portal has opened near ${territory.centre}`)
  ))?.id;
}

function detectCampaignEnding(): CampaignEndingKind | undefined {
  if (document.querySelector('.command-outcome.victory')) return 'victory';
  if (document.querySelector('.command-outcome.defeat')) return 'defeat';
  return undefined;
}

function artworkStatusLabel(status: ArtworkStatus): string {
  if (status === 'loaded') return 'ART LOADED';
  if (status === 'error') return 'ART ERROR';
  return 'ART LOADING';
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find(button => button.textContent?.trim() === label);
}

function openCommandView(view: string) {
  document.querySelector<HTMLButtonElement>(`[data-command-view="${view}"]`)?.click();
}

export function StartupExperience({ children }: Props) {
  const [portalTerritory, setPortalTerritory] = useState<string>();
  const [arrivalRequested, setArrivalRequested] = useState(false);
  const [mode, setMode] = useState<StartupMode>('launcher');
  const [introDestination, setIntroDestination] = useState<IntroDestination>('launcher');
  const [showSettings, setShowSettings] = useState(false);
  const [artworkStatus, setArtworkStatus] = useState<ArtworkStatus>('loading');
  const [saveInspection, setSaveInspection] = useState<SaveInspection>(() => {
    const storage = browserStorage();
    return storage
      ? inspectStoredCampaign(storage)
      : { ok: false, code: 'storage-unavailable', message: 'Browser storage is unavailable.' };
  });
  const [settings, setSettings] = useState<GlobalSettings>(() => loadGlobalSettings());
  const suppressedEndingRef = useRef<CampaignEndingKind | null>(null);

  const refreshSaveInspection = useCallback(() => {
    const storage = browserStorage();
    const inspection: SaveInspection = storage
      ? inspectStoredCampaign(storage)
      : { ok: false, code: 'storage-unavailable', message: 'Browser storage is unavailable.' };
    setSaveInspection(inspection);
    return inspection;
  }, []);

  const refreshPortalTerritory = useCallback(() => {
    const detected = detectPortalTerritory();
    if (detected) setPortalTerritory(detected);
    return detected;
  }, []);

  const applySettings = useCallback((next: GlobalSettings) => {
    const saved = saveGlobalSettings(next);
    setSettings(saved);
    audioManager.setSettings(saved);
  }, []);

  const requestPortalArrival = useCallback((freshCampaign = false) => {
    const storage = browserSessionStorage();
    if (freshCampaign) storage?.removeItem(ARRIVAL_PRESENTATION_KEY);
    if (storage?.getItem(ARRIVAL_PRESENTATION_KEY) === 'true') {
      setArrivalRequested(false);
      return;
    }
    setArrivalRequested(true);
  }, []);

  const markPortalArrivalPlayed = useCallback(() => {
    browserSessionStorage()?.setItem(ARRIVAL_PRESENTATION_KEY, 'true');
  }, []);

  const completePortalArrival = useCallback(() => {
    setArrivalRequested(false);
  }, []);

  useEffect(() => {
    audioManager.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (mode === 'launcher') {
      refreshSaveInspection();
      audioManager.requestMusic('title');
    } else if (mode === 'intro') {
      audioManager.requestMusic('prologue');
    } else {
      audioManager.requestMusic('game');
    }
  }, [mode, refreshSaveInspection]);

  useEffect(() => {
    const initialDetection = window.setTimeout(refreshPortalTerritory, 50);
    const observer = new MutationObserver(refreshPortalTerritory);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      window.clearTimeout(initialDetection);
      observer.disconnect();
    };
  }, [refreshPortalTerritory]);

  useEffect(() => {
    if (mode !== 'game') return;
    const captureCampaignFileAction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      const label = button?.textContent?.trim();
      if (label === 'New campaign') requestPortalArrival(true);
      if (label === 'Load Manual Save' || label === 'Load Autosave') setArrivalRequested(false);
    };
    document.addEventListener('click', captureCampaignFileAction, true);
    return () => document.removeEventListener('click', captureCampaignFileAction, true);
  }, [mode, requestPortalArrival]);

  useEffect(() => {
    if (mode !== 'game') return;
    const detect = () => {
      const ending = detectCampaignEnding();
      if (!ending) {
        suppressedEndingRef.current = null;
        return;
      }
      if (suppressedEndingRef.current === ending) return;
      refreshSaveInspection();
      setArrivalRequested(false);
      setShowSettings(false);
      setMode(ending);
    };
    const initialDetection = window.setTimeout(detect, 40);
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      window.clearTimeout(initialDetection);
      observer.disconnect();
    };
  }, [mode, refreshSaveInspection]);

  const openCampaignMap = useCallback(() => {
    setMode('game');
    // App already owns the authoritative campaign state and defaults new/load
    // flows to Map. This only corrects the title/prologue destination so no
    // campaign state is recreated or mutated by the launcher.
    window.setTimeout(() => openCommandView('map'), 50);
  }, []);

  const beginCampaign = useCallback(() => {
    void audioManager.unlock();
    requestPortalArrival(true);
    const storage = browserStorage();
    const introSeen = storage?.getItem(INTRO_STORAGE_KEY) === 'true';
    if (introSeen) {
      openCampaignMap();
      return;
    }
    setIntroDestination('campaign-map');
    setArtworkStatus('loading');
    refreshPortalTerritory();
    setMode('intro');
  }, [openCampaignMap, refreshPortalTerritory, requestPortalArrival]);

  const continueCampaign = useCallback(() => {
    if (!saveInspection.ok) return;
    void audioManager.unlock();
    setArrivalRequested(false);
    setMode('game');
    window.setTimeout(() => {
      openCommandView('campaign');
      window.setTimeout(() => findButton('Load Manual Save')?.click(), 60);
    }, 40);
  }, [saveInspection]);

  const replayPrologue = useCallback(() => {
    void audioManager.unlock();
    setIntroDestination('launcher');
    setArtworkStatus('loading');
    refreshPortalTerritory();
    setMode('intro');
  }, [refreshPortalTerritory]);

  const finishIntro = useCallback(() => {
    if (introDestination === 'campaign-map') openCampaignMap();
    else setMode('launcher');
  }, [introDestination, openCampaignMap]);

  const openSettings = useCallback(() => {
    void audioManager.unlock();
    setShowSettings(true);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    applySettings({ ...settings, muted });
  }, [applySettings, settings]);

  const previewEnding = useCallback((ending: CampaignEndingKind) => {
    void audioManager.unlock();
    setArrivalRequested(false);
    setShowSettings(false);
    setMode(ending);
  }, []);

  const reviewCampaign = useCallback((ending: CampaignEndingKind) => {
    suppressedEndingRef.current = ending;
    setArrivalRequested(false);
    setShowSettings(false);
    setMode('game');
  }, []);

  const returnToTitle = useCallback(() => {
    setArrivalRequested(false);
    setShowSettings(false);
    setMode('launcher');
  }, []);

  const reloadLastSave = useCallback(() => {
    const inspection = refreshSaveInspection();
    if (!inspection.ok) return;
    suppressedEndingRef.current = 'defeat';
    setArrivalRequested(false);
    setShowSettings(false);
    setMode('game');
    window.setTimeout(() => {
      openCommandView('campaign');
      window.setTimeout(() => findButton('Load Manual Save')?.click(), 70);
    }, 50);
  }, [refreshSaveInspection]);

  const startNewCampaignFromDefeat = useCallback(() => {
    suppressedEndingRef.current = 'defeat';
    requestPortalArrival(true);
    setShowSettings(false);
    setMode('game');
    window.setTimeout(() => {
      openCommandView('campaign');
      window.setTimeout(() => findButton('New campaign')?.click(), 80);
    }, 50);
  }, [requestPortalArrival]);

  const saved = saveInspection.ok ? saveInspection as SuccessfulInspection : null;
  const saveFailure = !saveInspection.ok ? saveInspection : null;
  const saveSummary = saved
    ? `Day ${String(saved.metadata.campaignDay).padStart(3, '0')} · ${saved.metadata.difficulty} · ${saved.metadata.formationCount} formations · ${formatSaveTime(saved.metadata.savedAt)}`
    : '';

  return <>
    <div
      className={`startup-game-shell ${mode !== 'game' ? 'launcher-covered' : ''}${mode === 'game' && arrivalRequested ? ' portal-arrival-active' : ''}`}
      aria-hidden={mode !== 'game'}
      inert={mode !== 'game'}
    ><GlobalSettingsContext.Provider value={settings}>{children}<MapUxFoundations active={mode === 'game'} /></GlobalSettingsContext.Provider></div>

    <PortalArrivalSequence
      active={mode === 'game' && arrivalRequested}
      portalTerritory={portalTerritory}
      onStarted={markPortalArrivalPlayed}
      onComplete={completePortalArrival}
    />

    {mode === 'launcher' && <section className="startup-launcher" aria-label="Future Conquest title screen">
      <div className="startup-launcher-panel">
        <p className="launcher-kicker">COMMAND ACCESS</p>
        <div className="launcher-actions">
          {saved && <button type="button" className="launcher-primary launcher-continue" onClick={continueCampaign}>
            <span>CONTINUE CAMPAIGN</span><small>{saveSummary}</small>
          </button>}
          <button type="button" className="launcher-primary" onClick={beginCampaign}>BEGIN CAMPAIGN</button>
          <button type="button" className="launcher-secondary" onClick={openSettings}>SETTINGS</button>
        </div>
        {saveFailure && saveFailure.code !== 'missing' && <p className="launcher-save-warning">Saved campaign unavailable: {saveFailure.message}</p>}
        <div className="launcher-footer">
          <button type="button" onClick={replayPrologue}>Replay prologue</button>
          <span>{BUILD_LABEL}</span>
        </div>
      </div>
    </section>}

    {mode === 'game' && <button type="button" className="global-settings-toggle" onClick={openSettings} aria-label="Open game settings" title="Settings">⚙</button>}

    {mode === 'intro' && <>
      <MotionComicIntro
        portalTerritory={portalTerritory}
        muted={settings.muted}
        onMutedChange={setMuted}
        onOpenSettings={openSettings}
        onComplete={finishIntro}
        onArtworkStatusChange={setArtworkStatus}
      />
      <div className={`motion-comic-build-stamp art-${artworkStatus}`} title={`Built ${BUILD_TIME}`}>
        {BUILD_LABEL} · {artworkStatusLabel(artworkStatus)}
      </div>
    </>}

    {mode === 'victory' && <VictoryEndingComic
      muted={settings.muted}
      onMutedChange={setMuted}
      onOpenSettings={openSettings}
      onReviewCampaign={() => reviewCampaign('victory')}
      onReturnToTitle={returnToTitle}
    />}

    {mode === 'defeat' && <CampaignDefeatScreen
      muted={settings.muted}
      onMutedChange={setMuted}
      onOpenSettings={openSettings}
      canReload={saveInspection.ok}
      onReloadSave={reloadLastSave}
      onNewCampaign={startNewCampaignFromDefeat}
      onReturnToTitle={returnToTitle}
    />}

    {showSettings && <GlobalSettingsPanel
      settings={settings}
      onChange={applySettings}
      onClose={() => setShowSettings(false)}
      onPreviewVictory={() => previewEnding('victory')}
      onPreviewDefeat={() => previewEnding('defeat')}
      onReturnToTitle={mode === 'game' ? returnToTitle : undefined}
    />}
  </>;
}