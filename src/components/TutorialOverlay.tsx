import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TutorialStep } from '../game/operational-clarity';
import './tutorial-explanation.css';

interface Props {
  step?: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  anchorSelector?: string;
  onSkip: () => void;
}

type TutorialPlacement = 'above' | 'below' | 'left' | 'right' | 'floating';
type ExplanationTopic = 'logistics' | 'intelligence';

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OverlayPosition {
  top: number;
  left: number;
  placement: TutorialPlacement;
  ready: boolean;
  target?: TargetBox;
}

interface ExplanationProgress {
  topic: ExplanationTopic;
  phase: number;
}

interface ExplanationPhase {
  id: string;
  title: string;
  instruction: string;
  focusSelector: string;
  hint: string;
}

const EXPLANATION_PHASES: Record<ExplanationTopic, ExplanationPhase[]> = {
  logistics: [
    {
      id: 'logistics-network',
      title: 'Read network health',
      instruction: 'Demand served compares required throughput with what actually arrived. Source use shows pressure on the portal, while diagnostics identify disconnected territory, starved formations and damaged or saturated routes.',
      focusSelector: '.supply-diagnostics-panel',
      hint: 'Read the headline and diagnostics together: a healthy overall percentage can still conceal a local failure.'
    },
    {
      id: 'logistics-priorities',
      title: 'Understand supply priorities',
      instruction: 'Critical requests receive throughput first, followed by High, Standard and Restricted. Automatic priorities normally make attacks Critical; movement, recovery, engineering and interdiction High; ready formations Standard; and stable administration Restricted.',
      focusSelector: '.logistics-doctrine-panel',
      hint: 'Manual overrides are optional. Use them only when limited throughput requires a deliberate trade-off.'
    },
    {
      id: 'logistics-consequences',
      title: 'Recognise supply consequences',
      instruction: 'Compare requested and delivered throughput for each formation. Severe shortages reduce movement and combat effectiveness, block recovery and armour repair, damage morale and can undermine territorial administration.',
      focusSelector: '.formation-priority-panel',
      hint: 'You do not need to change a priority. The lesson is to recognise which formations and territories are at risk.'
    }
  ],
  intelligence: [
    {
      id: 'intelligence-situation',
      title: 'Read the strategic situation',
      instruction: 'Escalation shows how strongly the present-day world is responding. Mobilisation reserve and pending formations indicate future enemy growth, while theatre command describes the enemy doctrine and operational focus.',
      focusSelector: '.escalation-panel',
      hint: 'Escalation is not just a score: crossing thresholds changes the scale and coordination of the response.'
    },
    {
      id: 'intelligence-confidence',
      title: 'Interpret reconnaissance confidence',
      instruction: 'Confirmed contacts are recent and relatively precise. Estimated contacts use wider strength ranges. Activity reports indicate something is present without a reliable identity, while stale contacts may no longer describe the current position.',
      focusSelector: '.enemy-contact-table',
      hint: 'Enemy strength is intentionally expressed through confidence and ranges rather than universal exact values.'
    },
    {
      id: 'intelligence-decisions',
      title: 'Turn intelligence into orders',
      instruction: 'Use frontline threats, enemy intent and mobilisation timings to decide where to attack, reinforce or garrison. Protect supply corridors when enemy pressure or interdiction threatens the route network.',
      focusSelector: '.frontline-panel',
      hint: 'Intelligence supports decisions; it does not issue orders automatically.'
    }
  ]
};

const EXPLANATION_STORAGE_KEY = 'future-conquest-tutorial-explanation-v1';
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const CARD_GAP = 14;
const VIEWPORT_MARGIN = 10;
const MOBILE_BREAKPOINT = 760;
const EXPANDED_TOTAL_STEPS = 13;

function readStoredExplanation(): ExplanationProgress | null {
  try {
    const stored = window.localStorage.getItem(EXPLANATION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<ExplanationProgress>;
    if ((parsed.topic !== 'logistics' && parsed.topic !== 'intelligence') || typeof parsed.phase !== 'number') return null;
    const maximumPhase = EXPLANATION_PHASES[parsed.topic].length - 1;
    return { topic: parsed.topic, phase: clamp(Math.round(parsed.phase), 0, maximumPhase) };
  } catch {
    return null;
  }
}

function expandedStepNumber(step: TutorialStep, fallback: number) {
  const mapping: Record<string, number> = {
    formation: 1,
    operation: 2,
    occupation: 3,
    movement: 4,
    logistics: 5,
    intelligence: 9,
    engineering: 13
  };
  return mapping[step.id] ?? fallback;
}

export function TutorialOverlay({ step, stepNumber, totalSteps, anchorSelector, onSkip }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const previousStepId = useRef(step?.id);
  const [explanation, setExplanation] = useState<ExplanationProgress | null>(() => readStoredExplanation());
  const [reviewPhase, setReviewPhase] = useState<number | null>(null);
  const [position, setPosition] = useState<OverlayPosition>({
    top: VIEWPORT_MARGIN,
    left: VIEWPORT_MARGIN,
    placement: 'floating',
    ready: false
  });

  useLayoutEffect(() => {
    const previous = previousStepId.current;
    const current = step?.id;

    if (previous === 'logistics' && current === 'intelligence') {
      setExplanation({ topic: 'logistics', phase: 0 });
      setReviewPhase(null);
    } else if (previous === 'intelligence' && current === 'engineering') {
      setExplanation({ topic: 'intelligence', phase: 0 });
      setReviewPhase(null);
    } else if (current === 'formation') {
      setExplanation(null);
      setReviewPhase(null);
    }

    previousStepId.current = current;
  }, [step?.id]);

  useEffect(() => {
    try {
      if (explanation) window.localStorage.setItem(EXPLANATION_STORAGE_KEY, JSON.stringify(explanation));
      else window.localStorage.removeItem(EXPLANATION_STORAGE_KEY);
    } catch {
      // The tutorial remains functional when storage is unavailable.
    }
  }, [explanation]);

  const currentExplanationPhase = explanation
    ? EXPLANATION_PHASES[explanation.topic][reviewPhase ?? explanation.phase]
    : undefined;
  const displayId = currentExplanationPhase?.id ?? step?.id;
  const resolvedSelector = currentExplanationPhase?.focusSelector ?? anchorSelector;
  const explanationMode = Boolean(currentExplanationPhase);

  const findTarget = useCallback(() => (
    resolvedSelector ? document.querySelector<HTMLElement>(resolvedSelector) : null
  ), [resolvedSelector]);

  const updatePosition = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const mobile = viewportWidth <= MOBILE_BREAKPOINT;
    const safeBottom = mobile ? 78 : VIEWPORT_MARGIN;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight - safeBottom;
    const cardRect = card.getBoundingClientRect();
    const cardWidth = Math.min(cardRect.width || 380, viewportWidth - VIEWPORT_MARGIN * 2);
    const cardHeight = Math.min(cardRect.height || 210, viewportHeight - safeBottom - VIEWPORT_MARGIN * 2);
    const target = findTarget();

    if (!target) {
      setPosition({
        top: clamp(viewportBottom - cardHeight, viewportTop + VIEWPORT_MARGIN, viewportBottom - cardHeight),
        left: clamp(viewportLeft + (viewportWidth - cardWidth) / 2, viewportLeft + VIEWPORT_MARGIN, viewportRight - cardWidth - VIEWPORT_MARGIN),
        placement: 'floating',
        ready: true
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const spaces: Record<Exclude<TutorialPlacement, 'floating'>, number> = {
      above: rect.top - viewportTop - VIEWPORT_MARGIN,
      below: viewportBottom - rect.bottom - VIEWPORT_MARGIN,
      left: rect.left - viewportLeft - VIEWPORT_MARGIN,
      right: viewportRight - rect.right - VIEWPORT_MARGIN
    };
    const required: Record<Exclude<TutorialPlacement, 'floating'>, number> = {
      above: cardHeight + CARD_GAP,
      below: cardHeight + CARD_GAP,
      left: cardWidth + CARD_GAP,
      right: cardWidth + CARD_GAP
    };
    const preferred: Array<Exclude<TutorialPlacement, 'floating'>> = mobile
      ? ['above', 'below', 'right', 'left']
      : ['right', 'left', 'below', 'above'];
    const placement = preferred.find(candidate => spaces[candidate] >= required[candidate])
      ?? preferred.reduce((best, candidate) => spaces[candidate] > spaces[best] ? candidate : best, preferred[0]);

    let top = rect.top;
    let left = rect.left;
    if (placement === 'above') {
      top = rect.top - cardHeight - CARD_GAP;
      left = rect.left + rect.width / 2 - cardWidth / 2;
    } else if (placement === 'below') {
      top = rect.bottom + CARD_GAP;
      left = rect.left + rect.width / 2 - cardWidth / 2;
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = rect.left - cardWidth - CARD_GAP;
    } else {
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = rect.right + CARD_GAP;
    }

    setPosition({
      top: clamp(top, viewportTop + VIEWPORT_MARGIN, Math.max(viewportTop + VIEWPORT_MARGIN, viewportBottom - cardHeight)),
      left: clamp(left, viewportLeft + VIEWPORT_MARGIN, Math.max(viewportLeft + VIEWPORT_MARGIN, viewportRight - cardWidth - VIEWPORT_MARGIN)),
      placement,
      ready: true,
      target: {
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12
      }
    });
  }, [findTarget]);

  useEffect(() => {
    if (!step && !currentExplanationPhase) return;
    const target = findTarget();
    if (target) {
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const visible = rect.top >= 12 && rect.bottom <= viewportHeight - 86;
      if (!visible) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
    const frame = window.requestAnimationFrame(updatePosition);
    const settle = window.setTimeout(updatePosition, 360);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [displayId, findTarget, step, currentExplanationPhase, updatePosition]);

  useLayoutEffect(() => {
    if (!step && !currentExplanationPhase) return;
    const target = findTarget();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (cardRef.current) observer?.observe(cardRef.current);
    if (target) observer?.observe(target);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    updatePosition();
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [displayId, findTarget, step, currentExplanationPhase, updatePosition]);

  if (!step && !currentExplanationPhase) return null;

  const focusControl = () => {
    const target = findTarget();
    if (!target) return;
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
      updatePosition();
    }, 320);
  };

  const advanceExplanation = () => {
    if (!explanation) return;
    const phases = EXPLANATION_PHASES[explanation.topic];
    const visiblePhase = reviewPhase ?? explanation.phase;
    if (visiblePhase < explanation.phase) {
      setReviewPhase(visiblePhase + 1);
      return;
    }
    if (explanation.phase < phases.length - 1) {
      setExplanation(current => current ? { ...current, phase: current.phase + 1 } : current);
      setReviewPhase(null);
      return;
    }
    setExplanation(null);
    setReviewPhase(null);
  };

  const reviewPreviousExplanation = () => {
    if (!explanation) return;
    const visiblePhase = reviewPhase ?? explanation.phase;
    if (visiblePhase > 0) setReviewPhase(visiblePhase - 1);
  };

  const skip = () => {
    setExplanation(null);
    setReviewPhase(null);
    onSkip();
  };

  const title = currentExplanationPhase?.title ?? step?.title ?? 'Guided campaign';
  const instruction = currentExplanationPhase?.instruction ?? step?.instruction ?? '';
  const hint = currentExplanationPhase?.hint ?? 'The highlighted control is your next action.';
  const visibleExplanationPhase = explanation ? (reviewPhase ?? explanation.phase) : 0;
  const visibleStepNumber = explanation
    ? (explanation.topic === 'logistics' ? 6 : 10) + visibleExplanationPhase
    : step ? expandedStepNumber(step, stepNumber) : stepNumber;
  const visibleTotalSteps = Math.max(EXPANDED_TOTAL_STEPS, totalSteps);

  return <div className={`tutorial-guide ${explanationMode ? 'explanation' : 'action'}`} aria-live="polite" aria-label="Guided campaign tutorial">
    {position.target && <div
      className={`tutorial-spotlight ${explanationMode ? 'explanation' : 'action'}`}
      aria-hidden="true"
      style={{
        top: position.target.top,
        left: position.target.left,
        width: position.target.width,
        height: position.target.height
      }}
    />}
    <aside
      ref={cardRef}
      className="tutorial-overlay"
      data-placement={position.placement}
      data-mode={explanationMode ? 'explanation' : 'action'}
      style={{ top: position.top, left: position.left, visibility: position.ready ? 'visible' : 'hidden' }}
    >
      <div className="tutorial-progress"><span>GUIDED CAMPAIGN</span><strong>{visibleStepNumber} / {visibleTotalSteps}</strong></div>
      <h2>{title}</h2>
      <p>{instruction}</p>
      <div className="tutorial-hint"><span aria-hidden="true">◎</span><strong>{hint}</strong></div>
      <div className="tutorial-actions">
        {explanationMode && visibleExplanationPhase > 0 && <button type="button" onClick={reviewPreviousExplanation}>Back</button>}
        {explanationMode
          ? <button type="button" className="primary" onClick={advanceExplanation}>Continue</button>
          : <button type="button" className="primary" onClick={focusControl}>Find highlighted control</button>}
        <button type="button" onClick={skip}>Skip tutorial</button>
      </div>
    </aside>
  </div>;
}
