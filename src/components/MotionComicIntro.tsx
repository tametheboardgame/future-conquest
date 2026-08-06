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
import { BUILD_SHA } from '../generated/build-info';
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
import './motion-comic-image-element.css';
import './motion-comic-responsive.css';

export type ArtworkStatus = 'loading' | 'loaded' | 'error';
type LayoutMode = 'wide' | 'compact' | 'narrow';
type BeatTailSide = 'top' | 'right' | 'bottom' | 'left';

interface Props {
  onComplete: () => void;
  portalTerritory?: string;
  initialPanel?: number;
  autoplay?: boolean;
  onArtworkStatusChange?: (status: ArtworkStatus) => void;
}

interface CameraMetrics {
  stageWidth: number;
  stageHeight: number;
  panelLeft: number;
  panelTop: number;
  panelWidth: number;
  panelHeight: number;
}

interface BeatProps {
  beat: IntroBeat;
  style?: CSSProperties;
  viewport?: boolean;
  tailSide?: BeatTailSide;
}

interface ViewportBeatPlacement {
  style: CSSProperties;
  tailSide?: BeatTailSide;
}

const clampStep = (index: number) => Math.max(0, Math.min(INTRO_TOTAL_STEPS - 1, index));
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function latestVisibleBeat(beats: IntroBeat[], elapsedMs: number): IntroBeat | undefined {
  return beats
    .filter(beat => beat.delayMs <= elapsedMs)
    .sort((left, right) => right.delayMs - left.delayMs)[0];
}

function layoutModeFor(width: number, height: number): LayoutMode {
  if (width < 900 || height < 610) return 'narrow';
  if (width < 1500 || height < 820) return 'compact';
  return 'wide';
}

function Beat({ beat, style, viewport = false, tailSide }: BeatProps) {
  const defaultStyle = {
    left: `${beat.x}%`,
    top: `${beat.y}%`,
    maxWidth: `${beat.maxWidth}%`
  } as CSSProperties;

  return (
    <div
      className={[
        'motion-comic-beat',
        `beat-${beat.kind}`,
        viewport ? 'motion-comic-viewport-beat' : '',
        tailSide ? `beat-tail-${tailSide}` : 'beat-tail-none'
      ].filter(Boolean).join(' ')}
      style={style ?? defaultStyle}
    >
      {beat.speaker && <strong>{beat.speaker}</strong>}
      <span>{beat.text}</span>
    </div>
  );
}

export function MotionComicIntro({
  onComplete,
  portalTerritory,
  initialPanel = 0,
  autoplay = true,
  onArtworkStatusChange
}: Props) {
  const [stepIndex, setStepIndex] = useState(() => clampStep(initialPanel));
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [cameraStyle, setCameraStyle] = useState<CSSProperties>({});
  const [cameraMetrics, setCameraMetrics] = useState<CameraMetrics>();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('wide');
  const [artworkStatus, setArtworkStatus] = useState<ArtworkStatus>('loading');
  const stageRef = useRef<HTMLDivElement>(null);

  const artworkUrl = useMemo(() => {
    const url = new URL(MOTION_COMIC_SPRITE, document.baseURI);
    url.searchParams.set('build', BUILD_SHA);
    return url.href;
  }, []);

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

  useEffect(() => {
    onArtworkStatusChange?.(artworkStatus);
  }, [artworkStatus, onArtworkStatusChange]);

  useEffect(() => {
    let active = true;
    const image = new Image();

    setArtworkStatus('loading');
    image.onload = () => {
      if (active) setArtworkStatus('loaded');
    };
    image.onerror = () => {
      if (active) setArtworkStatus('error');
    };
    image.src = artworkUrl;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [artworkUrl]);

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
    const stage = stageRef.current;
    if (!stage) return;

    const updateCamera = () => {
      const { width: stageWidth, height: stageHeight } = stage.getBoundingClientRect();
      const nextLayoutMode = layoutModeFor(stageWidth, stageHeight);
      setLayoutMode(current => current === nextLayoutMode ? current : nextLayoutMode);

      if (!activePanel) {
        setCameraMetrics({
          stageWidth,
          stageHeight,
          panelLeft: 0,
          panelTop: 0,
          panelWidth: stageWidth,
          panelHeight: stageHeight
        });
        return;
      }

      const pageRatio = 16 / 9;
      const pageMargin = nextLayoutMode === 'wide' ? 0.94 : nextLayoutMode === 'compact' ? 0.97 : 1;
      let pageWidth = stageWidth * pageMargin;
      let pageHeight = pageWidth / pageRatio;
      if (pageHeight > stageHeight * pageMargin) {
        pageHeight = stageHeight * pageMargin;
        pageWidth = pageHeight * pageRatio;
      }

      const baseX = (stageWidth - pageWidth) / 2;
      const baseY = (stageHeight - pageHeight) / 2;
      let scale = 1;
      let translateX = baseX;
      let translateY = baseY;

      if (!isPageOverview && !reducedMotion) {
        const panelWidth = pageWidth * activePanel.width / 100;
        const panelHeight = pageHeight * activePanel.height / 100;
        const targetWidth = nextLayoutMode === 'wide' ? 0.84 : nextLayoutMode === 'compact' ? 0.91 : 0.97;
        const targetHeight = nextLayoutMode === 'wide' ? 0.78 : nextLayoutMode === 'compact' ? 0.87 : 0.93;
        const minimumScale = nextLayoutMode === 'wide' ? 1.35 : nextLayoutMode === 'compact' ? 1.6 : 1.9;
        const maximumScale = nextLayoutMode === 'wide' ? 3.15 : nextLayoutMode === 'compact' ? 4 : 4.8;

        scale = Math.min(
          Math.max(minimumScale, Math.min(stageWidth * targetWidth / panelWidth, stageHeight * targetHeight / panelHeight)),
          maximumScale
        );

        const centreX = pageWidth * (activePanel.x + activePanel.width / 2) / 100;
        const centreY = pageHeight * (activePanel.y + activePanel.height / 2) / 100;
        translateX = stageWidth / 2 - centreX * scale;
        translateY = stageHeight / 2 - centreY * scale;
      }

      const panelLeft = translateX + pageWidth * activePanel.x / 100 * scale;
      const panelTop = translateY + pageHeight * activePanel.y / 100 * scale;
      const panelWidth = pageWidth * activePanel.width / 100 * scale;
      const panelHeight = pageHeight * activePanel.height / 100 * scale;

      setCameraMetrics({ stageWidth, stageHeight, panelLeft, panelTop, panelWidth, panelHeight });
      setCameraStyle({
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
        '--camera-inverse-scale': `${1 / scale}`
      } as CSSProperties);
    };

    updateCamera();
    const observer = new ResizeObserver(updateCamera);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [activePanel, isPageOverview, reducedMotion]);

  const currentBeats = isTitleCard ? INTRO_TITLE_CARD.beats : activePanel?.beats ?? [];
  const activeBeat = useMemo(
    () => latestVisibleBeat(currentBeats, sceneElapsedMs),
    [currentBeats, sceneElapsedMs]
  );
  const progress = ((stepIndex + Math.min(1, elapsedMs / Math.max(stepDurationMs, 1))) / INTRO_TOTAL_STEPS) * 100;

  const viewportBeatPlacement = useMemo<ViewportBeatPlacement | undefined>(() => {
    if (!activeBeat || !cameraMetrics || isTitleCard || isPageOverview) return undefined;

    const {
      stageWidth,
      stageHeight,
      panelLeft,
      panelTop,
      panelWidth,
      panelHeight
    } = cameraMetrics;

    const viewportWidthLimit = layoutMode === 'wide' ? 0.42 : layoutMode === 'compact' ? 0.56 : 0.82;
    const shortBeat = activeBeat.text.length < 18;
    const minimumWidth = shortBeat ? 140 : layoutMode === 'narrow' ? 180 : 210;
    const requestedWidth = panelWidth * activeBeat.maxWidth / 100;
    const width = clamp(requestedWidth, minimumWidth, Math.min(540, stageWidth * viewportWidthLimit));
    const horizontalPadding = layoutMode === 'narrow' ? 12 : 20;
    const topPadding = activePanel?.sequence === 9 && arrivalLocation ? 58 : 18;
    const subtitlesVisibleInViewport = showSubtitles && layoutMode !== 'narrow';
    const bottomPadding = subtitlesVisibleInViewport ? 98 : 22;
    const charactersPerLine = Math.max(18, Math.floor(width / (layoutMode === 'narrow' ? 8 : 9)));
    const contentLength = activeBeat.text.length + (activeBeat.speaker?.length ?? 0);
    const estimatedLines = Math.max(1, Math.ceil(contentLength / charactersPerLine));
    const lineHeight = layoutMode === 'narrow' ? 17 : 20;
    const estimatedHeight = 24 + (activeBeat.speaker ? 20 : 0) + estimatedLines * lineHeight;

    const preferredX = layoutMode === 'narrow' ? activeBeat.narrowX ?? activeBeat.x : activeBeat.x;
    const preferredY = layoutMode === 'narrow' ? activeBeat.narrowY ?? activeBeat.y : activeBeat.y;
    let left = panelLeft + panelWidth * preferredX / 100;
    let top = panelTop + panelHeight * preferredY / 100;

    left = clamp(left, horizontalPadding, Math.max(horizontalPadding, stageWidth - width - horizontalPadding));
    top = clamp(top, topPadding, Math.max(topPadding, stageHeight - estimatedHeight - bottomPadding));

    const style = {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      maxWidth: 'none'
    } as CSSProperties & { '--beat-tail-offset'?: string };

    let tailSide: BeatTailSide | undefined;
    if (
      activeBeat.kind === 'dialogue'
      && activeBeat.targetX !== undefined
      && activeBeat.targetY !== undefined
    ) {
      const targetLeft = panelLeft + panelWidth * activeBeat.targetX / 100;
      const targetTop = panelTop + panelHeight * activeBeat.targetY / 100;
      const right = left + width;
      const bottom = top + estimatedHeight;

      if (targetTop < top - 6) {
        tailSide = 'top';
      } else if (targetTop > bottom + 6) {
        tailSide = 'bottom';
      } else if (targetLeft < left) {
        tailSide = 'left';
      } else if (targetLeft > right) {
        tailSide = 'right';
      } else {
        const edgeDistances: Array<[BeatTailSide, number]> = [
          ['top', Math.abs(targetTop - top)],
          ['right', Math.abs(targetLeft - right)],
          ['bottom', Math.abs(targetTop - bottom)],
          ['left', Math.abs(targetLeft - left)]
        ];
        tailSide = edgeDistances.sort((first, second) => first[1] - second[1])[0][0];
      }

      const offset = tailSide === 'top' || tailSide === 'bottom'
        ? clamp(targetLeft - left, 20, Math.max(20, width - 26))
        : clamp(targetTop - top, 18, Math.max(18, estimatedHeight - 22));
      style['--beat-tail-offset'] = `${offset}px`;
    }

    return { style, tailSide };
  }, [
    activeBeat,
    activePanel?.sequence,
    arrivalLocation,
    cameraMetrics,
    isPageOverview,
    isTitleCard,
    layoutMode,
    showSubtitles
  ]);

  return (
    <section
      className={`motion-comic-v2 ${reducedMotion ? 'reduced-motion' : ''}`}
      data-layout={layoutMode}
      aria-label="Future Conquest story introduction"
    >
      <div className="motion-comic-stage" ref={stageRef}>
        {isTitleCard ? (
          <div className="motion-comic-title-card" role="img" aria-label={INTRO_TITLE_CARD.alt}>
            <div className="motion-comic-title-art">
              <img
                className="motion-comic-sprite-image motion-comic-title-sprite"
                src={artworkUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </div>
            <div className="title-card-atmosphere" aria-hidden="true" />
            {activeBeat && <Beat key={activeBeat.id} beat={activeBeat} />}
            <button type="button" className="motion-comic-begin" onClick={finishIntro}>Begin campaign</button>
          </div>
        ) : (
          <div
            className={`motion-comic-page page-${activePage} ${isPageOverview ? 'is-overview' : 'is-focused'}`}
            style={cameraStyle}
          >
            <div className="motion-comic-page-art" role="img" aria-label={activePanel?.alt}>
              <img
                className={`motion-comic-sprite-image motion-comic-page-sprite sprite-page-${activePage}`}
                src={artworkUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </div>
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
                  data-panel-id={panel.id}
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
                  <span className="comic-panel-number" aria-hidden="true">{panel.sequence}</span>
                </article>
              );
            })}
          </div>
        )}

        {!isTitleCard && activeBeat && viewportBeatPlacement && (
          <div className="motion-comic-beat-layer" aria-live="polite">
            <Beat
              key={activeBeat.id}
              beat={activeBeat}
              style={viewportBeatPlacement.style}
              tailSide={viewportBeatPlacement.tailSide}
              viewport
            />
          </div>
        )}
      </div>

      {artworkStatus === 'error' && (
        <div className="motion-comic-artwork-error" role="alert">
          Prologue artwork failed to load. Asset: {artworkUrl}
        </div>
      )}

      {showSubtitles && activeBeat && !isPageOverview && (
        <div className="motion-comic-subtitle" aria-live="polite">
          {activeBeat.speaker && <strong>{activeBeat.speaker}:</strong>} {activeBeat.text}
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
