import { useEffect, useMemo, useState } from 'react';
import { INTRO_PANELS, INTRO_STORAGE_KEY } from '../game/intro-story';
import './motion-comic-intro.css';

interface Props {
  onComplete: () => void;
  portalTerritory?: string;
  initialPanel?: number;
  autoplay?: boolean;
}

const assets = import.meta.glob('../assets/motion-comic/*.webp', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const clampPanel = (index: number) => Math.max(0, Math.min(INTRO_PANELS.length - 1, index));
const assetKey = (file: string) => `../assets/motion-comic/${file}`;

function resolveAsset(file: string, portalTerritory?: string): string {
  if (file === 'panel-07-arrival-default.webp' && portalTerritory) {
    const territoryVariant = assets[assetKey(`panel-07-arrival-${portalTerritory}.webp`)];
    if (territoryVariant) return territoryVariant;
  }
  return assets[assetKey(file)];
}

export function MotionComicIntro({ onComplete, portalTerritory, initialPanel = 0, autoplay = true }: Props) {
  const [panelIndex, setPanelIndex] = useState(() => clampPanel(initialPanel));
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [reducedMotion, setReducedMotion] = useState(false);
  const panel = INTRO_PANELS[panelIndex];
  const imageUrl = resolveAsset(panel.assetFile, portalTerritory);
  const isLastPanel = panelIndex === INTRO_PANELS.length - 1;

  const finishIntro = () => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    onComplete();
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const next = INTRO_PANELS[panelIndex + 1];
    if (!next) return;
    const preload = new Image();
    preload.src = resolveAsset(next.assetFile, portalTerritory);
  }, [panelIndex, portalTerritory]);

  useEffect(() => {
    if (!isPlaying) return;
    const duration = reducedMotion ? Math.max(5000, panel.durationMs) : panel.durationMs;
    const timer = window.setTimeout(() => {
      if (isLastPanel) {
        setIsPlaying(false);
        return;
      }
      setPanelIndex(current => clampPanel(current + 1));
    }, duration);
    return () => window.clearTimeout(timer);
  }, [isLastPanel, isPlaying, panel.durationMs, panel.id, reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setPanelIndex(current => clampPanel(current + 1));
      if (event.key === 'ArrowLeft') setPanelIndex(current => clampPanel(current - 1));
      if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying(current => !current);
      }
      if (event.key === 'Escape') finishIntro();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const progress = useMemo(() => ((panelIndex + 1) / INTRO_PANELS.length) * 100, [panelIndex]);

  const advance = () => {
    if (isLastPanel) {
      finishIntro();
      return;
    }
    setPanelIndex(current => clampPanel(current + 1));
  };

  return <section className={`motion-comic ${reducedMotion ? 'reduced-motion' : ''}`} aria-label="Future Conquest story introduction">
    <div className={`motion-comic-panel mood-${panel.mood}`} key={`${panel.id}-${portalTerritory ?? 'default'}`}>
      {imageUrl
        ? <img className={`motion-comic-image motion-${panel.motion}`} src={imageUrl} alt={panel.alt} />
        : <div className="motion-comic-missing" role="img" aria-label={panel.alt}>Panel asset unavailable</div>}
      <div className="motion-comic-vignette" aria-hidden="true" />
      <p className="motion-comic-transcript">{panel.transcript}</p>
      <div className="motion-comic-frame-number" aria-hidden="true">
        {String(panel.sequence).padStart(2, '0')} / {String(INTRO_PANELS.length).padStart(2, '0')}
      </div>
    </div>

    <div className="motion-comic-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>

    <nav className="motion-comic-controls" aria-label="Introduction controls">
      <button type="button" onClick={() => setPanelIndex(current => clampPanel(current - 1))} disabled={panelIndex === 0}>Previous</button>
      <button type="button" onClick={() => setIsPlaying(current => !current)}>{isPlaying ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={advance}>{isLastPanel ? 'Enter command' : 'Next'}</button>
      <button type="button" className="motion-comic-skip" onClick={finishIntro}>Skip intro</button>
    </nav>
  </section>;
}
