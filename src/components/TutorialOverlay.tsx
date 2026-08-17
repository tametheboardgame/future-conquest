import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TutorialStep } from '../game/operational-clarity';
import './tutorial-explanation.css';

interface Props {
  step?: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  anchorSelector?: string;
  onSkip: () => void;
  onBack: () => void;
  onForward: () => void;
}

type TutorialPlacement = 'above' | 'below' | 'left' | 'right' | 'floating' | 'docked-top' | 'docked-bottom';
type ExplanationTopic = 'forces' | 'operations' | 'defence' | 'logistics' | 'intelligence' | 'infrastructure';

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
  forces: [
    {
      id: 'forces-organisation',
      title: 'Understand force organisation',
      instruction: 'The Forces page is where you inspect and reorganise the expedition. Split creates a new independent formation, Transfer moves personnel or armour between formations in the same location, Merge combines compatible formations, and Rename changes a formation label. These tools are optional and are unavailable while a formation is committed to movement, combat, recovery, engineering or interdiction.',
      focusSelector: '.force-organisation',
      hint: 'You do not need to reorganise anything now. The purpose is to know where these controls live before you need them.'
    }
  ],
  operations: [
    {
      id: 'operations-tempo',
      title: 'Operations take time',
      instruction: 'An attack is a multi-day operation, not an instant territory flip. The formation remains committed while progress, casualties, armour damage and defender strength change each day. You may still issue orders to other available formations before resolving the day.',
      focusSelector: '[data-tutorial="formation-orders"]',
      hint: 'Resolve all orders advances every active movement and operation by one campaign day. Later, Operations stores the resulting after-action report.'
    }
  ],
  defence: [
    {
      id: 'defence-command',
      title: 'Holding ground is a separate job',
      instruction: 'Capturing a territory does not automatically make it safe. A garrison establishes local control; the Defence assessment then shows attack risk, local strength, fortification and nearby assessed enemy mass. Entrench, Prepare defence, Reinforce and Prioritise supply are deliberate defensive tools rather than automatic bonuses.',
      focusSelector: '.territory-defence-section',
      hint: 'You do not need to use every defence action now. The important distinction is between taking ground and making it defensible.'
    }
  ],
  logistics: [
    {
      id: 'logistics-network',
      title: 'Supply has three layers',
      instruction: 'Controlled territories generate distributed source capacity. Strategic routes deliver that capacity across the controlled network, and formations carry their own operational stocks as a buffer. Source use therefore describes how much territorial supply capacity is committed, not pressure on the closed insertion portal.',
      focusSelector: '[data-tutorial="logistics-flow"]',
      hint: 'A formation can temporarily survive poor delivery by consuming carried stock, but prolonged shortage still matters.'
    },
    {
      id: 'logistics-priorities',
      title: 'Priority allocates scarcity',
      instruction: 'Critical requests receive throughput first, followed by High, Standard and Restricted. Automatic priorities normally make attacks Critical; movement, recovery, engineering and interdiction High; ready formations Standard; and stable administration Restricted.',
      focusSelector: '[data-tutorial="logistics-doctrine"]',
      hint: 'Priority cannot repair a destroyed route or create source capacity. It only decides who receives scarce throughput first.'
    },
    {
      id: 'logistics-consequences',
      title: 'Read delivery and carried stock together',
      instruction: 'Daily delivery tells you whether the network is meeting current demand. Carried stock tells you how much resilience remains if it is not. Diagnostics should be used before changing priorities because the real problem may be a broken corridor, a bottleneck or exhausted source capacity.',
      focusSelector: '[data-tutorial="logistics-reserves"]',
      hint: 'You do not need to change a priority now. Learn to distinguish a prioritisation problem from a physical network problem.'
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
      instruction: 'Use frontline threats, counterattack warnings, enemy intent and mobilisation timings to decide where to attack, reinforce or garrison. Protect supply corridors when enemy pressure or interdiction threatens the route network.',
      focusSelector: '.frontline-panel',
      hint: 'Intelligence supports decisions; it does not issue orders automatically.'
    }
  ],
  infrastructure: [
    {
      id: 'infrastructure-repair',
      title: 'Repair the friendly network',
      instruction: 'Repair commits an eligible formation at a secured endpoint to restore a damaged controlled corridor towards 100% condition. The order preview shows its current logistics delivery, repair rate, network demand and estimated completion before you commit.',
      focusSelector: '[data-tutorial="infrastructure-repair"]',
      hint: 'A repair project can stall if its assigned formation receives less than 15% of daily logistics demand.'
    },
    {
      id: 'infrastructure-interdict',
      title: 'Disrupt the enemy network',
      instruction: 'Interdiction is an offensive frontier mission. Higher intensity can damage enemy infrastructure faster, but it consumes more supply, exposes the assigned formation to greater risk and raises escalation. Enemy security remains deliberately uncertain.',
      focusSelector: '[data-tutorial="infrastructure-interdict"]',
      hint: 'Interdiction is an option, not a prerequisite for basic campaign survival.'
    },
    {
      id: 'infrastructure-eligibility',
      title: 'Know why an order is unavailable',
      instruction: 'Infrastructure actions depend on route control, security, frontier geometry, formation position and logistics. The Infrastructure Overview states those rules explicitly, and unavailable-order panels tell you what must change before the action becomes possible.',
      focusSelector: '[data-tutorial="infrastructure-rules"]',
      hint: 'This is the final guided step. Continue returns you to full command; the tutorial can be replayed later from Campaign.'
    }
  ]
};

const EXPLANATION_STORAGE_KEY = 'future-conquest-tutorial-explanation-v2';
const TUTORIAL_SEEN_STORAGE_KEY = 'future-conquest-tutorial-seen-v1';
const TUTORIAL_REPLAY_STORAGE_KEY = 'future-conquest-tutorial-replay-v1';
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const CARD_GAP = 14;
const VIEWPORT_MARGIN = 10;
const MOBILE_BREAKPOINT = 760;
const EXPANDED_TOTAL_STEPS = 19;

function readFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    if (value) window.localStorage.setItem(key, 'true');
    else window.localStorage.removeItem(key);
  } catch {
    // Storage is optional; campaign tutorial state remains the fallback.
  }
}

function isExplanationTopic(value: unknown): value is ExplanationTopic {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EXPLANATION_PHASES, value);
}

function readStoredExplanation(): ExplanationProgress | null {
  try {
    const stored = window.localStorage.getItem(EXPLANATION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<ExplanationProgress>;
    if (!isExplanationTopic(parsed.topic) || typeof parsed.phase !== 'number') return null;
    const maximumPhase = EXPLANATION_PHASES[parsed.topic].length - 1;
    return { topic: parsed.topic, phase: clamp(Math.round(parsed.phase), 0, maximumPhase) };
  } catch {
    return null;
  }
}

function expandedStepNumber(step: TutorialStep, fallback: number) {
  const mapping: Record<string, number> = {
    formation: 1,
    operation: 3,
    occupation: 5,
    movement: 7,
    logistics: 8,
    intelligence: 12,
    engineering: 16
  };
  return mapping[step.id] ?? fallback;
}

function explanationStepNumber(topic: ExplanationTopic, phase: number): number {
  if (topic === 'forces') return 2;
  if (topic === 'operations') return 4;
  if (topic === 'defence') return 6;
  if (topic === 'logistics') return 9 + phase;
  if (topic === 'intelligence') return 13 + phase;
  return 17 + phase;
}

export function TutorialOverlay({ step, stepNumber, totalSteps, anchorSelector, onSkip, onBack, onForward }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const previousStepId = useRef(step?.id);
  const [explanation, setExplanation] = useState<ExplanationProgress | null>(() => readStoredExplanation());
  const [reviewPhase, setReviewPhase] = useState<number | null>(null);
  const [tutorialSeen, setTutorialSeen] = useState(() => readFlag(TUTORIAL_SEEN_STORAGE_KEY));
  const [replayRequested, setReplayRequested] = useState(() => readFlag(TUTORIAL_REPLAY_STORAGE_KEY));
  const [portalArrivalActive, setPortalArrivalActive] = useState(() => (
    typeof document !== 'undefined' && Boolean(document.querySelector('.startup-game-shell.portal-arrival-active'))
  ));
  const [position, setPosition] = useState<OverlayPosition>({
    top: VIEWPORT_MARGIN,
    left: VIEWPORT_MARGIN,
    placement: 'floating',
    ready: false
  });

  const finishTutorialExperience = useCallback(() => {
    writeFlag(TUTORIAL_SEEN_STORAGE_KEY, true);
    writeFlag(TUTORIAL_REPLAY_STORAGE_KEY, false);
    setTutorialSeen(true);
    setReplayRequested(false);
    setExplanation(null);
    setReviewPhase(null);
  }, []);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.startup-game-shell');
    if (!shell) {
      setPortalArrivalActive(false);
      return;
    }
    const syncPortalArrival = () => setPortalArrivalActive(shell.classList.contains('portal-arrival-active'));
    syncPortalArrival();
    const observer = new MutationObserver(syncPortalArrival);
    observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onCampaignAction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (button?.textContent?.trim() !== 'Restart tutorial') return;

      writeFlag(TUTORIAL_REPLAY_STORAGE_KEY, true);
      setReplayRequested(true);
      setExplanation(null);
      setReviewPhase(null);
    };

    document.addEventListener('click', onCampaignAction, true);
    return () => document.removeEventListener('click', onCampaignAction, true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('tutorial-seen', tutorialSeen);
    return () => document.documentElement.classList.remove('tutorial-seen');
  }, [tutorialSeen]);

  useEffect(() => {
    if (portalArrivalActive || !step || !tutorialSeen || replayRequested) return;
    onSkip();
  }, [onSkip, portalArrivalActive, replayRequested, step, tutorialSeen]);

  useLayoutEffect(() => {
    if (portalArrivalActive) return;
    const previous = previousStepId.current;
    const current = step?.id;

    if (previous === 'formation' && current === 'operation') {
      setExplanation({ topic: 'forces', phase: 0 });
      setReviewPhase(null);
    } else if (previous === 'operation' && current === 'occupation') {
      setExplanation({ topic: 'operations', phase: 0 });
      setReviewPhase(null);
    } else if (previous === 'occupation' && current === 'movement') {
      setExplanation({ topic: 'defence', phase: 0 });
      setReviewPhase(null);
    } else if (previous === 'logistics' && current === 'intelligence') {
      setExplanation({ topic: 'logistics', phase: 0 });
      setReviewPhase(null);
    } else if (previous === 'intelligence' && current === 'engineering') {
      setExplanation({ topic: 'intelligence', phase: 0 });
      setReviewPhase(null);
    } else if (previous === 'engineering' && current === undefined) {
      setExplanation({ topic: 'infrastructure', phase: 0 });
      setReviewPhase(null);
    } else if (current === 'formation') {
      setExplanation(null);
      setReviewPhase(null);
    }

    previousStepId.current = current;
  }, [portalArrivalActive, step?.id]);

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
  const suppressAutomaticTutorial = portalArrivalActive || Boolean(step && tutorialSeen && !replayRequested);

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
    const cardWidth = Math.min(cardRect.width || 390, viewportWidth - VIEWPORT_MARGIN * 2);
    const cardHeight = Math.min(cardRect.height || 230, viewportHeight - safeBottom - VIEWPORT_MARGIN * 2);
    const target = findTarget();

    if (!target) {
      setPosition({
        top: Math.max(viewportTop + VIEWPORT_MARGIN, viewportBottom - cardHeight),
        left: clamp(viewportLeft + (viewportWidth - cardWidth) / 2, viewportLeft + VIEWPORT_MARGIN, viewportRight - cardWidth - VIEWPORT_MARGIN),
        placement: 'floating',
        ready: true
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const targetBox = {
      top: rect.top - 6,
      left: rect.left - 6,
      width: rect.width + 12,
      height: rect.height + 12
    };

    if (mobile) {
      const targetCentre = rect.top + rect.height / 2;
      const viewportCentre = viewportTop + (viewportBottom - viewportTop) / 2;
      const dockTop = viewportTop + VIEWPORT_MARGIN;
      const dockBottom = Math.max(dockTop, viewportBottom - cardHeight);
      const dockAboveTarget = targetCentre >= viewportCentre;
      setPosition({
        top: dockAboveTarget ? dockTop : dockBottom,
        left: clamp(viewportLeft + (viewportWidth - cardWidth) / 2, viewportLeft + VIEWPORT_MARGIN, viewportRight - cardWidth - VIEWPORT_MARGIN),
        placement: dockAboveTarget ? 'docked-top' : 'docked-bottom',
        ready: true,
        target: targetBox
      });
      return;
    }

    type DirectionalPlacement = 'above' | 'below' | 'left' | 'right';
    const spaces: Record<DirectionalPlacement, number> = {
      above: rect.top - viewportTop - VIEWPORT_MARGIN,
      below: viewportBottom - rect.bottom - VIEWPORT_MARGIN,
      left: rect.left - viewportLeft - VIEWPORT_MARGIN,
      right: viewportRight - rect.right - VIEWPORT_MARGIN
    };
    const required: Record<DirectionalPlacement, number> = {
      above: cardHeight + CARD_GAP,
      below: cardHeight + CARD_GAP,
      left: cardWidth + CARD_GAP,
      right: cardWidth + CARD_GAP
    };
    const preferred: DirectionalPlacement[] = ['right', 'left', 'below', 'above'];
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
      target: targetBox
    });
  }, [findTarget]);

  useEffect(() => {
    if ((!step && !currentExplanationPhase) || suppressAutomaticTutorial) return;
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
  }, [displayId, findTarget, step, currentExplanationPhase, suppressAutomaticTutorial, updatePosition]);

  useLayoutEffect(() => {
    if ((!step && !currentExplanationPhase) || suppressAutomaticTutorial) return;
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
  }, [displayId, findTarget, step, currentExplanationPhase, suppressAutomaticTutorial, updatePosition]);

  if (suppressAutomaticTutorial || (!step && !currentExplanationPhase)) return null;

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
    const finishedTopic = explanation.topic;
    setExplanation(null);
    setReviewPhase(null);
    if (finishedTopic === 'infrastructure') finishTutorialExperience();
  };

  const reviewPreviousExplanation = () => {
    if (!explanation) return;
    const visiblePhase = reviewPhase ?? explanation.phase;
    if (visiblePhase > 0) setReviewPhase(visiblePhase - 1);
  };

  const skip = () => {
    finishTutorialExperience();
    onSkip();
  };

  const title = currentExplanationPhase?.title ?? step?.title ?? 'Guided campaign';
  const instruction = currentExplanationPhase?.instruction ?? step?.instruction ?? '';
  const hint = currentExplanationPhase?.hint ?? 'Waiting for the highlighted action. The tutorial advances only after the game confirms it.';
  const visibleExplanationPhase = explanation ? (reviewPhase ?? explanation.phase) : 0;
  const visibleStepNumber = explanation
    ? explanationStepNumber(explanation.topic, visibleExplanationPhase)
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
      {!explanationMode && step && <div className="tutorial-action-brief" data-wp8-action-context="true">
        <div><span>WHY IT MATTERS</span><p>{step.why}</p></div>
        <div><span>COMPLETE WHEN</span><p>{step.completion}</p></div>
      </div>}
      <div className="tutorial-hint"><span aria-hidden="true">◎</span><strong>{hint}</strong></div>
      <div className="tutorial-actions">
        {explanationMode && visibleExplanationPhase > 0 && <button type="button" onClick={reviewPreviousExplanation}>Back</button>}
        {explanationMode && <button type="button" className="primary" onClick={advanceExplanation}>{explanation?.topic === 'infrastructure' && visibleExplanationPhase === EXPLANATION_PHASES.infrastructure.length - 1 ? 'Finish tutorial' : 'Continue'}</button>}
        {!explanationMode && <button type="button" onClick={onBack} disabled={stepNumber <= 1}>Back</button>}
        {!explanationMode && <button type="button" onClick={onForward} disabled={stepNumber >= totalSteps}>Forward</button>}
        <button type="button" onClick={skip}>Skip tutorial</button>
      </div>
    </aside>
  </div>;
}