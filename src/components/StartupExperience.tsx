import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BUILD_LABEL, BUILD_TIME } from '../generated/build-info';
import { TERRITORIES } from '../game/data';
import { INTRO_STORAGE_KEY } from '../game/intro-story';
import { MotionComicIntro, type ArtworkStatus } from './MotionComicIntro';
import './prologue-build-stamp.css';

interface Props {
  children: ReactNode;
}

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

export function StartupExperience({ children }: Props) {
  const [portalTerritory, setPortalTerritory] = useState<string>();
  const [showIntro, setShowIntro] = useState(() => window.localStorage.getItem(INTRO_STORAGE_KEY) !== 'true');
  const [artworkStatus, setArtworkStatus] = useState<ArtworkStatus>('loading');

  const refreshPortalTerritory = useCallback(() => {
    const detected = detectPortalTerritory();
    if (detected) setPortalTerritory(detected);
    return detected;
  }, []);

  const openIntro = useCallback(() => {
    setArtworkStatus('loading');
    refreshPortalTerritory();
    setShowIntro(true);
  }, [refreshPortalTerritory]);

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
    const onCampaignAction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (button?.textContent?.trim() !== 'New campaign') return;

      window.localStorage.removeItem(INTRO_STORAGE_KEY);
      window.setTimeout(openIntro, 100);
    };

    document.addEventListener('click', onCampaignAction, true);
    return () => document.removeEventListener('click', onCampaignAction, true);
  }, [openIntro]);

  return <>
    {children}
    {!showIntro && <button type="button" className="motion-comic-replay" onClick={openIntro}>Replay prologue</button>}
    {showIntro && <>
      <MotionComicIntro
        portalTerritory={portalTerritory}
        onComplete={() => setShowIntro(false)}
        onArtworkStatusChange={setArtworkStatus}
      />
      <div
        className={`motion-comic-build-stamp art-${artworkStatus}`}
        title={`Built ${BUILD_TIME}`}
      >
        {BUILD_LABEL} · {artworkStatusLabel(artworkStatus)}
      </div>
    </>}
  </>;
}
