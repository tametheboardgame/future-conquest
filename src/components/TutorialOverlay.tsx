import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TutorialStep } from '../game/operational-clarity';

interface Props {
  step?: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  anchorSelector?: string;
  onSkip: () => void;
}

type TutorialPlacement = 'above' | 'below' | 'left' | 'right' | 'floating';

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

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const CARD_GAP = 14;
const VIEWPORT_MARGIN = 10;
const MOBILE_BREAKPOINT = 760;

export function TutorialOverlay({ step, stepNumber, totalSteps, anchorSelector, onSkip }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<OverlayPosition>({
    top: VIEWPORT_MARGIN,
    left: VIEWPORT_MARGIN,
    placement: 'floating',
    ready: false
  });

  const findTarget = useCallback(() => (
    anchorSelector ? document.querySelector<HTMLElement>(anchorSelector) : null
  ), [anchorSelector]);

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
    if (!step) return;
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
  }, [anchorSelector, findTarget, step?.id, updatePosition]);

  useLayoutEffect(() => {
    if (!step) return;
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
  }, [anchorSelector, findTarget, step, updatePosition]);

  if (!step) return null;

  const focusControl = () => {
    const target = findTarget();
    if (!target) return;
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
      updatePosition();
    }, 320);
  };

  return <div className="tutorial-guide" aria-live="polite" aria-label="Guided campaign tutorial">
    {position.target && <div
      className="tutorial-spotlight"
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
      style={{ top: position.top, left: position.left, visibility: position.ready ? 'visible' : 'hidden' }}
    >
      <div className="tutorial-progress"><span>GUIDED CAMPAIGN</span><strong>{stepNumber} / {totalSteps}</strong></div>
      <h2>{step.title}</h2>
      <p>{step.instruction}</p>
      <div className="tutorial-hint"><span aria-hidden="true">◎</span><strong>The highlighted control is your next action.</strong></div>
      <div className="tutorial-actions">
        <button type="button" className="primary" onClick={focusControl}>Show control</button>
        <button type="button" onClick={onSkip}>Skip tutorial</button>
      </div>
    </aside>
  </div>;
}
