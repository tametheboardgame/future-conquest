import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ENDING_SUBTITLE_STORAGE_KEY, VICTORY_ENDING_PANELS, VICTORY_ENDING_TOTAL_MS, type EndingBeat, type EndingMotion } from '../game/ending-story';
import './motion-comic-intro.css';
import './motion-comic-responsive.css';
import './motion-comic-final-polish.css';
import './campaign-ending.css';

interface SharedAudioProps {
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onOpenSettings: () => void;
}

interface VictoryProps extends SharedAudioProps {
  onReviewCampaign: () => void;
  onReturnToTitle: () => void;
}

interface DefeatProps extends SharedAudioProps {
  canReload: boolean;
  onReloadSave: () => void;
  onNewCampaign: () => void;
  onReturnToTitle: () => void;
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const panelOffsets = VICTORY_ENDING_PANELS.map((_, index) => VICTORY_ENDING_PANELS.slice(0, index).reduce((sum, panel) => sum + panel.durationMs, 0));

function loadSubtitlePreference() {
  try {
    return window.localStorage.getItem(ENDING_SUBTITLE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveSubtitlePreference(value: boolean) {
  try {
    window.localStorage.setItem(ENDING_SUBTITLE_STORAGE_KEY, String(value));
  } catch {
    // Keep the session preference when storage is unavailable.
  }
}

function endingAssetUrl(fileName: string) {
  return `${import.meta.env.BASE_URL}generated/endings/v1/${fileName}`;
}

function latestVisibleBeat(beats: EndingBeat[], elapsedMs: number) {
  return beats.filter(beat => beat.delayMs <= elapsedMs).sort((left, right) => right.delayMs - left.delayMs)[0];
}

function imageTransform(motion: EndingMotion, progress: number) {
  const p = clamp(progress, 0, 1);
  if (motion === 'push-in') return `scale(${1.015 + p * 0.07})`;
  if (motion === 'pan-left') return `scale(1.07) translate3d(${-2.8 * p}%, 0, 0)`;
  if (motion === 'pan-right') return `scale(1.07) translate3d(${2.8 * p}%, 0, 0)`;
  if (motion === 'drift-up') return `scale(1.06) translate3d(0, ${-2.4 * p}%, 0)`;
  return 'scale(1.025)';
}

export function VictoryEndingComic({ muted, onMutedChange, onOpenSettings, onReviewCampaign, onReturnToTitle }: VictoryProps) {
  const [panelIndex, setPanelIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(() => loadSubtitlePreference());
  const [showFinalActions, setShowFinalActions] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 700);
  const scrubbingRef = useRef(false);
  const wasPlayingBeforeScrubRef = useRef(false);
  const panel = VICTORY_ENDING_PANELS[panelIndex];
  const activeBeat = useMemo(() => latestVisibleBeat(panel.beats, elapsedMs), [elapsedMs, panel.beats]);
  const timelineMs = Math.min(VICTORY_ENDING_TOTAL_MS, (panelOffsets[panelIndex] ?? 0) + Math.min(elapsedMs, panel.durationMs));
  const progress = timelineMs / Math.max(1, VICTORY_ENDING_TOTAL_MS) * 100;
  const panelProgress = elapsedMs / Math.max(1, panel.durationMs);

  useEffect(() => {
    const update = () => setNarrow(window.innerWidth <= 700);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const goToPanel = useCallback((nextIndex: number, nextElapsed = 0) => {
    const clamped = clamp(nextIndex, 0, VICTORY_ENDING_PANELS.length - 1);
    setPanelIndex(clamped);
    setElapsedMs(nextElapsed);
    setShowFinalActions(false);
  }, []);

  const seekTimeline = useCallback((requestedMs: number) => {
    let remaining = clamp(requestedMs, 0, VICTORY_ENDING_TOTAL_MS);
    let nextIndex = 0;
    while (nextIndex < VICTORY_ENDING_PANELS.length - 1 && remaining >= VICTORY_ENDING_PANELS[nextIndex].durationMs) {
      remaining -= VICTORY_ENDING_PANELS[nextIndex].durationMs;
      nextIndex += 1;
    }
    goToPanel(nextIndex, Math.min(remaining, VICTORY_ENDING_PANELS[nextIndex].durationMs));
  }, [goToPanel]);

  const next = useCallback(() => {
    if (panelIndex >= VICTORY_ENDING_PANELS.length - 1) {
      setElapsedMs(panel.durationMs);
      setIsPlaying(false);
      setShowFinalActions(true);
      return;
    }
    goToPanel(panelIndex + 1);
  }, [goToPanel, panel.durationMs, panelIndex]);

  const previous = useCallback(() => goToPanel(panelIndex - 1), [goToPanel, panelIndex]);

  useEffect(() => {
    if (!isPlaying || showFinalActions) return;
    const timer = window.setInterval(() => setElapsedMs(current => current + 100), 100);
    return () => window.clearInterval(timer);
  }, [isPlaying, showFinalActions]);

  useEffect(() => {
    if (!isPlaying || elapsedMs < panel.durationMs) return;
    next();
  }, [elapsedMs, isPlaying, next, panel.durationMs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'range') return;
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
      if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying(current => !current);
      }
      if (event.key === 'Escape') onReviewCampaign();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, onReviewCampaign, previous]);

  const beginScrub = () => {
    if (scrubbingRef.current) return;
    scrubbingRef.current = true;
    wasPlayingBeforeScrubRef.current = isPlaying;
    setIsPlaying(false);
  };

  const finishScrub = () => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    if (wasPlayingBeforeScrubRef.current) setIsPlaying(true);
  };

  const toggleSubtitles = () => {
    setShowSubtitles(current => {
      const nextValue = !current;
      saveSubtitlePreference(nextValue);
      return nextValue;
    });
  };

  const beatX = activeBeat ? (narrow ? activeBeat.narrowX ?? activeBeat.x : activeBeat.x) : 0;
  const beatY = activeBeat ? (narrow ? activeBeat.narrowY ?? activeBeat.y : activeBeat.y) : 0;

  return <section className="motion-comic-v2 campaign-ending victory-ending" aria-label="Future Conquest victory epilogue" data-ending-panel={panel.id}>
    <div className="campaign-ending-stage">
      <img
        key={panel.imageFile}
        className="campaign-ending-art"
        src={endingAssetUrl(panel.imageFile)}
        alt={panel.alt}
        draggable={false}
        style={{ transform: imageTransform(panel.motion, panelProgress) }}
      />
      <div className="campaign-ending-grade" aria-hidden="true" />
      {activeBeat && <div
        className={`campaign-ending-beat ending-beat-${activeBeat.kind} ${activeBeat.id === 'v6-final' ? 'ending-final-beat' : ''}`}
        data-ending-beat={activeBeat.id}
        style={{ left: `${beatX}%`, top: `${beatY}%`, maxWidth: `${activeBeat.maxWidth}%` } as CSSProperties}
      >
        {activeBeat.speaker && <strong>{activeBeat.speaker}</strong>}
        <span>{activeBeat.text}</span>
      </div>}
      {showSubtitles && activeBeat && <div className="motion-comic-subtitle"><strong>{activeBeat.speaker ?? 'Epilogue'}</strong><span>{activeBeat.text}</span></div>}
      {showFinalActions && <div className="campaign-ending-actions victory-actions">
        <p>MISSION COMPLETE</p>
        <h2>The catalyst was the intervention.</h2>
        <div><button type="button" className="launcher-primary" onClick={onReviewCampaign}>Review campaign</button><button type="button" className="launcher-secondary" onClick={onReturnToTitle}>Return to title</button></div>
      </div>}
    </div>

    <div className="motion-comic-progress" aria-label="Victory epilogue progress">
      <i style={{ width: `${progress}%` }} />
      <input
        type="range"
        min="0"
        max={VICTORY_ENDING_TOTAL_MS}
        step="100"
        value={timelineMs}
        aria-label="Victory epilogue timeline"
        onPointerDown={beginScrub}
        onPointerUp={finishScrub}
        onPointerCancel={finishScrub}
        onBlur={finishScrub}
        onChange={event => seekTimeline(Number(event.target.value))}
      />
    </div>
    <div className="motion-comic-controls campaign-ending-controls">
      <button type="button" className="motion-comic-previous" disabled={panelIndex === 0} onClick={previous}>Previous</button>
      <button type="button" className="motion-comic-play" onClick={() => { setShowFinalActions(false); setIsPlaying(current => !current); }}>{isPlaying ? 'Pause' : 'Play'}</button>
      <button type="button" className="motion-comic-next" onClick={next}>Next</button>
      <button type="button" className="motion-comic-audio-toggle" aria-pressed={muted} onClick={() => onMutedChange(!muted)}>{muted ? 'Unmute' : 'Mute'}</button>
      <button type="button" className="motion-comic-settings" onClick={onOpenSettings}>Settings</button>
      <button type="button" className="motion-comic-subtitles" aria-pressed={showSubtitles} onClick={toggleSubtitles}>Subtitles {showSubtitles ? 'on' : 'off'}</button>
      <span className="motion-comic-counter">EPILOGUE {panelIndex + 1}/{VICTORY_ENDING_PANELS.length}</span>
      <button type="button" className="motion-comic-skip" onClick={() => { goToPanel(VICTORY_ENDING_PANELS.length - 1, VICTORY_ENDING_PANELS.at(-1)?.durationMs ?? 0); setIsPlaying(false); setShowFinalActions(true); }}>Skip to ending</button>
    </div>
  </section>;
}

export function CampaignDefeatScreen({ muted, onMutedChange, onOpenSettings, canReload, onReloadSave, onNewCampaign, onReturnToTitle }: DefeatProps) {
  return <section className="campaign-defeat-screen" aria-label="Campaign failed">
    <img className="campaign-defeat-art" src={endingAssetUrl('defeat-campaign-failed.webp')} alt="A ruined command centre displays the failed European campaign." draggable={false} />
    <div className="campaign-defeat-grade" aria-hidden="true" />
    <div className="campaign-defeat-copy">
      <p className="launcher-kicker">EXPEDITION STATUS</p>
      <h1>CAMPAIGN FAILED</h1>
      <p>The expedition can no longer sustain the campaign. The timeline remains unchanged.</p>
      <div className="campaign-defeat-actions">
        <button type="button" className="launcher-primary" disabled={!canReload} onClick={onReloadSave}>{canReload ? 'Reload last save' : 'No save available'}</button>
        <button type="button" className="launcher-secondary" onClick={onNewCampaign}>Start new campaign</button>
        <button type="button" className="launcher-secondary" onClick={onReturnToTitle}>Return to title</button>
      </div>
      <div className="campaign-defeat-utilities">
        <button type="button" onClick={() => onMutedChange(!muted)}>{muted ? 'Unmute' : 'Mute'}</button>
        <button type="button" onClick={onOpenSettings}>Settings</button>
      </div>
    </div>
  </section>;
}
