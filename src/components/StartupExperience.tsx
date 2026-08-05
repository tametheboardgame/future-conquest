import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BUILD_LABEL, BUILD_TIME } from '../generated/build-info';
import { TERRITORIES } from '../game/data';
import { INTRO_STORAGE_KEY } from '../game/intro-story';
import { MotionComicIntro } from './MotionComicIntro';
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

export function StartupExperience({ children }: Props) {
  const [portalTerritory, setPortalTerritory] = useState<string>();
  const [showIntro, setShowIntro] = useState(() => window.localStorage.getItem(INTRO_STORAGE_KEY) !== 'true');

  const refreshPortalTerritory = useCallback(() => {
    const detected = detectPortalTerritory();
    if (detected) setPortalTerritory(detected);
    return detected;
  }, []);

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
      window.setTimeout(() => {
        refreshPortalTerritory();
        setShowIntro(true);
      }, 100);
    };

    document.addEventListener('click', onCampaignAction, true);
    return () => document.removeEventListener('click', onCampaignAction, true);
  }, [refreshPortalTerritory]);

  return <>
    {children}
    {!showIntro && <button type="button" className="motion-comic-replay" onClick={() => {
      refreshPortalTerritory();
      setShowIntro(true);
    }}>Replay prologue</button>}
    {showIntro && <>
      <MotionComicIntro portalTerritory={portalTerritory} onComplete={() => setShowIntro(false)} />
      <div className="motion-comic-build-stamp" title={`Built ${BUILD_TIME}`}>{BUILD_LABEL}</div>
    </>}
  </>;
}
