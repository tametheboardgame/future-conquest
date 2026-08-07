import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { audioManager } from '../audio/audio-manager';
import { BUILD_LABEL, BUILD_TIME } from '../generated/build-info';
import { TERRITORIES } from '../game/data';
import { loadGlobalSettings, saveGlobalSettings, type GlobalSettings } from '../game/global-settings';
import { INTRO_STORAGE_KEY } from '../game/intro-story';
import { formatSaveTime, inspectStoredCampaign, type SaveInspection } from '../game/persistence';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';
import { MotionComicIntro, type ArtworkStatus } from './MotionComicIntro';
import './prologue-build-stamp.css';
import './startup-launcher.css';

interface Props {
  children: ReactNode;
}

type StartupMode = 'launcher' | 'intro' | 'game';
type SuccessfulInspection = Extract<SaveInspection, { ok: true }>;
type IntroDestination = 'launcher' | 'campaign-setup';

function detectPortalTerritory(): string | undefined {
  const pageText = document.body.innerText;
  return Object.values(TERRITORIES).find(territory => (
    pageText.includes(`portal has opened near ${territory.centre}`)
    || pageText.includes(`Portal has opened near ${territory.centre}`)
  ))?.id;
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

function findButton(label: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find(button => button.textContent?.trim() === label);
}

function openCommandView(view: string) {
  document.querySelector<HTMLButtonElement>(`[data-command-view="${view}"]`)?.click();
}

export function StartupExperience({ children }: Props) {
  const [portalTerritory, setPortalTerritory] = useState<string>();
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
      audioManager.stopMusic();
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

  const openCampaignSetup = useCallback(() => {
    setMode('game');
    window.setTimeout(() => openCommandView('campaign'), 50);
  }, []);

  const beginCampaign = useCallback(() => {
    void audioManager.unlock();
    const storage = browserStorage();
    const introSeen = storage?.getItem(INTRO_STORAGE_KEY) === 'true';
    if (introSeen) {
      openCampaignSetup();
      return;
    }
    setIntroDestination('campaign-setup');
    setArtworkStatus('loading');
    refreshPortalTerritory();
    setMode('intro');
  }, [openCampaignSetup, refreshPortalTerritory]);

  const continueCampaign = useCallback(() => {
    if (!saveInspection.ok) return;
    void audioManager.unlock();
    setMode('game');
    window.setTimeout(() => {
      openCommandView('campaign');
      window.setTimeout(() => findButton('Load')?.click(), 60);
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
    if (introDestination === 'campaign-setup') openCampaignSetup();
    else setMode('launcher');
  }, [introDestination, openCampaignSetup]);

  const saved = saveInspection.ok ? saveInspection as SuccessfulInspection : null;
  const saveSummary = saved
    ? `Day ${String(saved.metadata.campaignDay).padStart(3, '0')} · ${saved.metadata.difficulty} · ${saved.metadata.formationCount} formations · ${formatSaveTime(saved.metadata.savedAt)}`
    : '';

  return <>
    <div
      className={`startup-game-shell ${mode !== 'game' ? 'launcher-covered' : ''}`}
      aria-hidden={mode !== 'game'}
      inert={mode !== 'game'}
    >{children}</div>

    {mode === 'launcher' && <section className="startup-launcher" aria-label="Future Conquest title screen">
      <div className="startup-launcher-panel">
        <p className="launcher-kicker">STRATEGIC COMMAND SIMULATION</p>
        <h1>FUTURE<br />CONQUEST</h1>
        <p className="launcher-tagline">Conquer Europe. Hold the network. Survive the response.</p>
        <div className="launcher-actions">
          {saved && <button type="button" className="launcher-primary launcher-continue" onClick={continueCampaign}>
            <span>CONTINUE CAMPAIGN</span><small>{saveSummary}</small>
          </button>}
          <button type="button" className="launcher-primary" onClick={beginCampaign}>BEGIN CAMPAIGN</button>
          <button type="button" className="launcher-secondary" onClick={() => { void audioManager.unlock(); setShowSettings(true); }}>SETTINGS</button>
        </div>
        {!saved && saveInspection.code !== 'missing' && <p className="launcher-save-warning">Saved campaign unavailable: {saveInspection.message}</p>}
        <div className="launcher-footer">
          <button type="button" onClick={replayPrologue}>Replay prologue</button>
          <span>{BUILD_LABEL}</span>
        </div>
      </div>
    </section>}

    {mode === 'game' && <button type="button" className="global-settings-toggle" onClick={() => setShowSettings(true)} aria-label="Open game settings" title="Settings">⚙</button>}

    {mode === 'intro' && <>
      <MotionComicIntro
        portalTerritory={portalTerritory}
        onComplete={finishIntro}
        onArtworkStatusChange={setArtworkStatus}
      />
      <div className={`motion-comic-build-stamp art-${artworkStatus}`} title={`Built ${BUILD_TIME}`}>
        {BUILD_LABEL} · {artworkStatusLabel(artworkStatus)}
      </div>
    </>}

    {showSettings && <GlobalSettingsPanel settings={settings} onChange={applySettings} onClose={() => setShowSettings(false)} />}
  </>;
}
