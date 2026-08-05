import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from 'react';
import { MOTION_COMIC_SPRITE } from '../assets/motion-comic-v2/sprite';
import { TERRITORIES } from '../game/data';
import {
  INTRO_PAGE_OVERVIEW_MS,
  INTRO_PANELS,
  INTRO_STORAGE_KEY,
  INTRO_TITLE_CARD,
  INTRO_TOTAL_STEPS,
  type IntroBeat
} from '../game/intro-story';
import './motion-comic-intro.css';

interface Props {
  onComplete: () => void;
  portalTerritory?: string;
  initialPanel?: number;
  autoplay?: boolean;
}

const clampStep = (index: number) => Math.max(0, Math.min(INTRO_TOTAL_STEPS - 1, index));

function latestVisibleBeat(beats: IntroBeat[], elapsedMs: number): IntroBeat | undefined {
  return beats
    .filter(beat => beat.delayMs <= elapsedMs)
    .sort((left, right) => right.delayMs - left.delayMs)[0];
}

function Beat({ beat }: { beat: IntroBeat }) {
  const style = {
    left: `${beat.x}%`,
    top: `${beat.y}%`,
    maxWidth: `${beat.maxWidth}%`
  } as CSSProperties;

  return (
    <div className={`motion-comic-beat beat-${beat.kind}`} style={style}>
      {beat.speaker && <strong>{beat.speaker}</strong>}
      <span>{beat.text}</span>
    </div>
  );
}

export function MotionComicIntro({ onComplete, portalTerritory, initialPanel = 0, autoplay = true }: Props) {
  const [stepIndex, setStepIndex] = useState(() => clampStep(initialPanel));
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [cameraStyle, setCameraStyle] = useState<CSSProperties>({});
  const stageRef = useRef<HTMLDivElement>(null);

  const isTitleCard = stepIndex === INTRO_PANELS.length;
  const activePanel = isTitleCard ? undefined : INTRO_PANELS[stepIndex];
  const activePage = activePanel?.page;
  const overviewMs = activePanel && (activePanel.sequence === 1 || activePanel.sequence === 7)
    ? INTRO_PAGE_OVERVIEW_MS
    : 0;
  const isPageOverview = Boolean(activePanel && elapsedMs < overviewMs);
  const sceneElapsedMs = Math.max(0, elapsedMs - overviewMs);
  const stepDurationMs = isTitleCard
    ? INTRO_TITLE_CARD.durationMs
    : (activePanel?.durationMs ?? 0) + overviewMs;
  const arrivalLocation = portalTerritory ? TERRITORIES[portalTerritory]?.centre : undefined;

  const finishIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const goToStep = useCallback((nextIndex: number) => {
    setStepIndex(clampStep(nextIndex));
    setElapsedMs(0);
  }, []);

  const advance = useCallback(() => {
    if (isTitleCard) {
      finishIntro();
      return;
    }
    goToStep(stepIndex + 1);
  }, [finishIntro, goToStep, isTitleCard, stepIndex]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => setElapsedMs(current => current + 100), 100);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || elapsedMs < stepDurationMs) return;
    if (isTitleCard) {
      setIsPlaying(false);
      return;
    }
    goToStep(stepIndex + 1);
  }, [elapsedMs, goToStep, isPlaying, isTitleCard, stepDurationMs, stepIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goToStep(stepIndex + 1);
      if (event.key === 'ArrowLeft') goToStep(stepIndex - 1);
      if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying(current => !current);
      }
      if (event.key === 'Escape') finishIntro();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishIntro, goToStep, stepIndex]);

  useLayoutEffect(() => {
    if (!activePanel || !stageRef.current) return;

    const updateCamera = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const { width: stageWidth, height: stageHeight } = stage.getBoundingClientRect();
      const pageRatio = 16 / 9;
      let pageWidth = stageWidth * 0.94;
      let pageHeight = pageWidth / pageRatio;
      if (pageHeight > stageHeight * 0.94) {
        pageHeight = stageHeight * 0.94;
        pageWidth = pageHeight * pageRatio;
      }

      const baseX = (stageWidth - pageWidth) / 2;
      const baseY = (stageHeight - pageHeight) / 2;

      if (isPageOverview || reducedMotion) {
        setCameraStyle({
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          transform: `translate3d(${baseX}px, ${baseY}px, 0) scale(1)`
        });
        return;
      }

      const panelWidth = pageWidth * activePanel.width / 100;
      const panelHeight = pageHeight * activePanel.height / 100;
      const scale = Math.min(
        Math.max(1.35, Math.min(stageWidth * 0.84 / panelWidth, stageHeight * 0.78 / panelHeight)),
        3.15
      );
      const centreX = pageWidth * (activePanel.x + activePanel.width / 2) / 100;
      const centreY = pageHeight * (activePanel.y + activePanel.height / 2) / 100;
      const translateX = stageWidth / 2 - centreX * scale;
      const translateY = stageHeight / 2 - centreY * scale;

      setCameraStyle({
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`
      });
    };

    updateCamera();
    const observer = new ResizeObserver(updateCamera);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [activePanel, isPageOverview, reducedMotion]);

  const currentBeats = isTitleCard ? INTRO_TITLE_CARD.beats : activePanel?.beats ?? [];
  const visibleBeats = useMemo(
    () => currentBeats.filter(beat => beat.delayMs <= sceneElapsedMs),
    [currentBeats, sceneElapsedMs]
  );
  const subtitleBeat = useMemo(
    () => latestVisibleBeat(currentBeats, sceneElapsedMs),
    [currentBeats, sceneElapsedMs]
  );
  const progress = ((stepIndex + Math.min(1, elapsedMs / Math.max(stepDurationMs, 1))) / INTRO_TOTAL_STEPS) * 100;
  const spriteStyle = { '--motion-comic-sprite': `url("${MOTION_COMIC_SPRITE}")` } as CSSProperties;

  return (
    <section
      className={`motion-comic-v2 ${reducedMotion ? 'reduced-motion' : ''}`}
      style={spriteStyle}
      aria-label="Future Conquest story introduction"
    >
      <div className="motion-comic-stage" ref={stageRef}>
        {isTitleCard ? (
          <div className="motion-comic-title-card" role="img" aria-label={INTRO_TITLE_CARD.alt}>
            <div className="motion-comic-title-art" />
            <div className="title-card-atmosphere" aria-hidden="true" />
            {visibleBeats.map(beat => <Beat key={beat.id} beat={beat} />)}
            <button type="button" className="motion-comic-begin" onClick={finishIntro}>Begin campaign</button>
          </div>
        ) : (
          <div
            className={`motion-comic-page page-${activePage} ${isPageOverview ? 'is-overview' : 'is-focused'}`}
            style={cameraStyle}
          >
            <div className="motion-comic-page-art" role="img" aria-label={activePanel?.alt} />
            {INTRO_PANELS.filter(panel => panel.page === activePage).map(panel => {
              const active = panel.id === activePanel?.id;
              const panelStyle = {
                left: `${panel.x}%`,
                top: `${panel.y}%`,
                width: `${panel.width}%`,
                height: `${panel.height}%`
              } as CSSProperties;

              return (
                <article
                  className={`comic-page-panel mood-${panel.mood} ${active ? 'is-active' : ''}`}
                  style={panelStyle}
                  key={panel.id}
                  aria-current={active ? 'step' : undefined}
                  aria-label={active ? panel.alt : undefined}
                >
                  <div className="comic-panel-shade" aria-hidden="true" />
                  {active && <div className="comic-panel-effect" aria-hidden="true" />}
                  {active && panel.sequence === 9 && arrivalLocation && (
                    <div className="motion-comic-location">Arrival zone · {arrivalLocation}</div>
                  )}
                  {active && !isPageOverview && visibleBeats.map(beat => <Beat key={beat.id} beat={beat} />)}
                  <span className="comic-panel-number" aria-hidden="true">{panel.sequence}</span>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showSubtitles && subtitleBeat && !isPageOverview && (
        <div className="motion-comic-subtitle" aria-live="polite">
          {subtitleBeat.speaker && <strong>{subtitleBeat.speaker}:</strong>} {subtitleBeat.text}
        </div>
      )}

      <div className="motion-comic-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, progress)}%` }} /></div>

      <nav className="motion-comic-controls" aria-label="Introduction controls">
        <button type="button" onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0}>Previous</button>
        <button type="button" onClick={() => setIsPlaying(current => !current)}>{isPlaying ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={advance}>{isTitleCard ? 'Enter command' : 'Next'}</button>
        <button type="button" className={showSubtitles ? 'is-selected' : ''} onClick={() => setShowSubtitles(current => !current)}>
          Subtitles
        </button>
        <span className="motion-comic-counter">{String(stepIndex + 1).padStart(2, '0')} / {String(INTRO_TOTAL_STEPS).padStart(2, '0')}</span>
        <button type="button" className="motion-comic-skip" onClick={finishIntro}>Skip intro</button>
      </nav>

      <p className="motion-comic-transcript">
        {isTitleCard ? INTRO_TITLE_CARD.transcript : activePanel?.transcript}
      </p>
    </section>
  );
}
