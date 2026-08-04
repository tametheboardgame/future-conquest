import { useEffect, useMemo, useState } from 'react';
import { INTRO_PANELS, INTRO_STORAGE_KEY } from '../game/intro-story';
import './motion-comic-intro.css';

interface Props {
  onComplete: () => void;
  initialPanel?: number;
  autoplay?: boolean;
}

const clampPanel = (index: number) => Math.max(0, Math.min(INTRO_PANELS.length - 1, index));

export function MotionComicIntro({ onComplete, initialPanel = 0, autoplay = true }: Props) {
  const [panelIndex, setPanelIndex] = useState(() => clampPanel(initialPanel));
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [reducedMotion, setReducedMotion] = useState(false);
  const panel = INTRO_PANELS[panelIndex];
  const isLastPanel = panelIndex === INTRO_PANELS.length - 1;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const duration = reducedMotion ? Math.max(4500, panel.durationMs) : panel.durationMs;
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

  const finishIntro = () => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    onComplete();
  };

  const advance = () => {
    if (isLastPanel) {
      finishIntro();
      return;
    }
    setPanelIndex(current => clampPanel(current + 1));
  };

  return <section className={`motion-comic ${reducedMotion ? 'reduced-motion' : ''}`} aria-label="Future Conquest story introduction">
    <div className={`motion-comic-panel mood-${panel.mood}`} key={panel.id}>
      <div className="motion-comic-art" role="img" aria-label={panel.visualDescription}>
        <div className="motion-comic-sky" />
        <div className="motion-comic-horizon" />
        <div className="motion-comic-grid" />
        <div className="motion-comic-portal" />
        <div className="motion-comic-figure figure-one" />
        <div className="motion-comic-figure figure-two" />
        <div className="motion-comic-particles" />
        <div className="motion-comic-vignette" />
      </div>

      <div className="motion-comic-copy" aria-live="polite">
        {panel.eyebrow && <p className="motion-comic-eyebrow">{panel.eyebrow}</p>}
        <h1>{panel.caption}</h1>
        {panel.narration && <p className="motion-comic-narration">{panel.narration}</p>}
      </div>

      <div className="motion-comic-frame-number" aria-hidden="true">
        {String(panel.sequence).padStart(2, '0')} / {String(INTRO_PANELS.length).padStart(2, '0')}
      </div>
    </div>

    <div className="motion-comic-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>

    <nav className="motion-comic-controls" aria-label="Introduction controls">
      <button type="button" onClick={() => setPanelIndex(current => clampPanel(current - 1))} disabled={panelIndex === 0}>Previous</button>
      <button type="button" onClick={() => setIsPlaying(current => !current)}>{isPlaying ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={advance}>{isLastPanel ? 'Begin campaign' : 'Next'}</button>
      <button type="button" className="motion-comic-skip" onClick={finishIntro}>Skip intro</button>
    </nav>
  </section>;
}
