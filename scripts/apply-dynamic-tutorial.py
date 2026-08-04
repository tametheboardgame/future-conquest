from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise RuntimeError(f'Pattern not found in {path}: {old[:160]!r}')
    file.write_text(content.replace(old, new, count))


Path('src/components/TutorialOverlay.tsx').write_text("""import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
""")

replace(
    'src/components/FormationRoster.tsx',
    '  return <section className="task-groups formation-roster">',
    '  return <section className="task-groups formation-roster" data-tutorial="formation-roster">'
)

app = Path('src/App.tsx')
content = app.read_text()
content = content.replace(
    "  const availableGroups = groups.filter(group => canIssueOperationalOrder(group));\n",
    """  const availableGroups = groups.filter(group => canIssueOperationalOrder(group));
  const tutorialAnchorSelector = (() => {
    if (!tutorialStep) return undefined;
    if (tutorialStep.id === 'formation') {
      return currentView === 'forces' ? '[data-tutorial=\"formation-roster\"]' : '[data-command-view=\"forces\"]';
    }
    if (tutorialStep.id === 'operation') {
      if (currentView !== 'map') return '[data-command-view=\"map\"]';
      return canAttack && target ? '[data-tutorial=\"attack-action\"]' : '[data-tutorial=\"command-map\"]';
    }
    if (tutorialStep.id === 'occupation') {
      if (currentView !== 'map') return '[data-command-view=\"map\"]';
      const capturedGroundReady = Boolean(
        selectedGroup
        && !selectedOperation
        && !target
        && selectedGroup.location !== state.portalTerritory
        && state.territories[selectedGroup.location]?.controller === 'player'
        && selectedGroup.status !== 'garrison'
        && canOrderSelected
      );
      if (capturedGroundReady) return '[data-tutorial=\"garrison-action\"]';
      if (operations.length > 0) return '[data-tutorial=\"resolve-day\"]';
      return '[data-tutorial=\"command-map\"]';
    }
    if (tutorialStep.id === 'movement') {
      if (currentView !== 'map') return '[data-command-view=\"map\"]';
      return canMove && target ? '[data-tutorial=\"move-action\"]' : '[data-tutorial=\"command-map\"]';
    }
    if (tutorialStep.id === 'logistics') return '[data-command-view=\"logistics\"]';
    if (tutorialStep.id === 'intelligence') return '[data-command-view=\"intelligence\"]';
    return '[data-command-view=\"engineering\"]';
  })();
"""
)
content = content.replace(
    '<button type="button" className={isAttack ? \'primary danger-action\' : \'primary\'} disabled={!canExecute} onClick={execute}>{actionLabel}</button>',
    '<button type="button" data-tutorial={isAttack ? \'attack-action\' : \'move-action\'} className={isAttack ? \'primary danger-action\' : \'primary\'} disabled={!canExecute} onClick={execute}>{actionLabel}</button>',
    1
)
content = content.replace(
    '<button className="primary" disabled={!canMove} onClick={() => setState(current => issueMove(current, chosenRouteId || undefined))}>{canMove ? \'Issue movement order\' : targetInfo?.kind === \'route-blocked\' ? \'Corridor blocked\' : \'Out of operational range\'}</button>',
    '<button className="primary" data-tutorial="move-action" disabled={!canMove} onClick={() => setState(current => issueMove(current, chosenRouteId || undefined))}>{canMove ? \'Issue movement order\' : targetInfo?.kind === \'route-blocked\' ? \'Corridor blocked\' : \'Out of operational range\'}</button>',
    1
)
content = content.replace(
    '<button className="primary danger-action" disabled={!canAttack} onClick={() => setState(current => beginOperation(current, chosenRouteId || undefined))}>{canAttack ? (targetOperation ? \'Join operation\' : \'Begin operation\') : targetInfo?.kind === \'route-blocked\' ? \'Corridor blocked\' : \'Out of operational range\'}</button>',
    '<button className="primary danger-action" data-tutorial="attack-action" disabled={!canAttack} onClick={() => setState(current => beginOperation(current, chosenRouteId || undefined))}>{canAttack ? (targetOperation ? \'Join operation\' : \'Begin operation\') : targetInfo?.kind === \'route-blocked\' ? \'Corridor blocked\' : \'Out of operational range\'}</button>',
    1
)
content = content.replace(
    '<button className="secondary" disabled={!canOrderSelected || state.status !== \'playing\'} onClick={() => setState(setGarrison)}>{selectedGroup.status === \'garrison\' ? \'Release from garrison\' : \'Assign as garrison\'}</button>',
    '<button className="secondary" data-tutorial="garrison-action" disabled={!canOrderSelected || state.status !== \'playing\'} onClick={() => setState(setGarrison)}>{selectedGroup.status === \'garrison\' ? \'Release from garrison\' : \'Assign as garrison\'}</button>',
    1
)
content = content.replace(
    '<button className="global-resolve" onClick={resolveDay} disabled={state.status !== \'playing\'}>Resolve all orders · day {state.turn}</button>',
    '<button className="global-resolve" data-tutorial="resolve-day" onClick={resolveDay} disabled={state.status !== \'playing\'}>Resolve all orders · day {state.turn}</button>',
    1
)
content = content.replace(
    '<div className="map-panel">',
    '<div className="map-panel" data-tutorial="command-map">',
    1
)
content = content.replace(
    '<TutorialOverlay step={tutorialStep} stepNumber={state.tutorial.step + 1} totalSteps={TUTORIAL_STEPS.length} onSkip={() => setState(skipTutorial)} onOpenView={changeView} />',
    '<TutorialOverlay step={tutorialStep} stepNumber={state.tutorial.step + 1} totalSteps={TUTORIAL_STEPS.length} anchorSelector={tutorialAnchorSelector} onSkip={() => setState(skipTutorial)} />',
    1
)
app.write_text(content)

css = Path('src/operational-clarity.css')
content = css.read_text()
old = """.tutorial-overlay {
  position: fixed;
  z-index: 220;
  right: 20px;
  bottom: 20px;
  width: min(420px, calc(100vw - 40px));
  padding: 18px;
  border: 1px solid rgba(113,214,255,.55);
  background: rgba(9,20,31,.97);
  box-shadow: 0 18px 60px rgba(0,0,0,.48), 0 0 24px rgba(74,185,255,.12);
}
.tutorial-progress { display: flex; justify-content: space-between; color: #7ed9ff; font-size: .72rem; letter-spacing: .1em; }
.tutorial-overlay h2 { margin: 8px 0; }
.tutorial-overlay p { color: #c3d0dc; line-height: 1.45; }
.tutorial-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.tutorial-step-forces .forces-view,
.tutorial-step-map .command-map-workspace,
.tutorial-step-operations .operations-view,
.tutorial-step-logistics .logistics-command,
.tutorial-step-intelligence .intelligence-view,
.tutorial-step-engineering .infrastructure-command-stack {
  outline: 2px solid rgba(91,204,255,.7);
  outline-offset: -2px;
}
"""
new = """.tutorial-guide {
  position: fixed;
  inset: 0;
  z-index: 220;
  pointer-events: none;
}
.tutorial-spotlight {
  position: fixed;
  z-index: 0;
  border: 3px solid #76d7ff;
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(2,7,12,.5), 0 0 26px rgba(74,185,255,.7);
  pointer-events: none;
  transition: top .18s ease, left .18s ease, width .18s ease, height .18s ease;
  animation: tutorialSpotlightPulse 1.5s ease-in-out infinite;
}
@keyframes tutorialSpotlightPulse { 50% { border-color: #d0f4ff; box-shadow: 0 0 0 9999px rgba(2,7,12,.5), 0 0 38px rgba(74,185,255,.9); } }
.tutorial-overlay {
  position: fixed;
  z-index: 1;
  width: min(390px, calc(100vw - 20px));
  max-height: min(48vh, 360px);
  overflow: auto;
  padding: 18px;
  border: 1px solid rgba(113,214,255,.7);
  border-radius: 8px;
  background: rgba(9,20,31,.98);
  box-shadow: 0 18px 60px rgba(0,0,0,.58), 0 0 24px rgba(74,185,255,.18);
  pointer-events: auto;
  transition: top .18s ease, left .18s ease;
}
.tutorial-overlay::after {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: 9px solid transparent;
}
.tutorial-overlay[data-placement='above']::after { left: calc(50% - 9px); bottom: -18px; border-top-color: #76d7ff; }
.tutorial-overlay[data-placement='below']::after { left: calc(50% - 9px); top: -18px; border-bottom-color: #76d7ff; }
.tutorial-overlay[data-placement='left']::after { top: calc(50% - 9px); right: -18px; border-left-color: #76d7ff; }
.tutorial-overlay[data-placement='right']::after { top: calc(50% - 9px); left: -18px; border-right-color: #76d7ff; }
.tutorial-progress { display: flex; justify-content: space-between; color: #7ed9ff; font-size: .72rem; letter-spacing: .1em; }
.tutorial-overlay h2 { margin: 8px 0; }
.tutorial-overlay p { color: #c3d0dc; line-height: 1.45; }
.tutorial-hint { display: flex; gap: 8px; align-items: center; margin-top: 12px; color: #9fe4ff; font-size: .78rem; }
.tutorial-hint span { font-size: 1.05rem; }
.tutorial-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
"""
if old not in content:
    raise RuntimeError('tutorial css block not found')
content = content.replace(old, new, 1)
content = content.replace(
    "  .tutorial-overlay { right: 10px; bottom: 10px; width: calc(100vw - 20px); }",
    "  .tutorial-overlay { width: min(360px, calc(100vw - 16px)); max-height: 38vh; padding: 14px; }\n  .tutorial-overlay h2 { font-size: 1.05rem; }\n  .tutorial-overlay p { margin-block: 7px; font-size: .9rem; }\n  .tutorial-actions { margin-top: 10px; }"
)
css.write_text(content)

Path('tests/dynamic-tutorial.test.cjs').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('guided tutorial anchors to the actionable control instead of a fixed mobile card', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const css = fs.readFileSync('src/operational-clarity.css', 'utf8');

  assert.match(overlay, /document\.querySelector<HTMLElement>\(anchorSelector\)/);
  assert.match(overlay, /getBoundingClientRect\(\)/);
  assert.match(overlay, /scrollIntoView\(\{ block: 'center'/);
  assert.match(overlay, /ResizeObserver/);
  assert.match(overlay, /visualViewport/);
  assert.match(app, /tutorialAnchorSelector/);
  assert.match(app, /data-tutorial=\"garrison-action\"/);
  assert.match(app, /data-tutorial=\"resolve-day\"/);
  assert.match(app, /data-tutorial=\"command-map\"/);
  assert.match(app, /anchorSelector=\{tutorialAnchorSelector\}/);
  assert.match(css, /\.tutorial-guide[\s\S]*pointer-events:\s*none/);
  assert.match(css, /\.tutorial-overlay[\s\S]*pointer-events:\s*auto/);
  assert.match(css, /data-placement='above'/);
});

test('occupation guidance resolves combat before spotlighting the garrison action', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /if \(capturedGroundReady\) return '\[data-tutorial=\\\"garrison-action\\\"\]'/);
  assert.match(app, /if \(operations\.length > 0\) return '\[data-tutorial=\\\"resolve-day\\\"\]'/);
  assert.match(app, /selectedGroup\.location !== state\.portalTerritory/);
});
""")
