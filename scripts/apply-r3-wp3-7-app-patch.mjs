import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/App.tsx';
let source = readFileSync(path, 'utf8');

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`WP3.7 patch anchor missing: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`WP3.7 patch anchor is not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'React useRef import',
  "import { lazy, Suspense, useEffect, useMemo, useState } from 'react';",
  "import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';"
);

replaceOnce(
  'movement resolution constants',
  "const operationTitle = (operation: Operation) => `Operation ${TERRITORIES[operation.target].centre}`;",
  "const operationTitle = (operation: Operation) => `Operation ${TERRITORIES[operation.target].centre}`;\nconst MOVEMENT_RESOLUTION_BEAT_MS = 1750;\nconst MOVEMENT_RESOLUTION_REDUCED_MS = 120;\ntype MovementResolutionState = { phase: 'arming' | 'playing'; next: GameState; reducedMotion: boolean };"
);

replaceOnce(
  'movement resolution state',
  "  const [navigationContext, setNavigationContext] = useState<ResolvedContextualTarget | null>(null);",
  "  const [navigationContext, setNavigationContext] = useState<ResolvedContextualTarget | null>(null);\n  const [movementResolution, setMovementResolution] = useState<MovementResolutionState | null>(null);\n  const movementResolutionLockRef = useRef(false);"
);

replaceOnce(
  'movement resolution lifecycle',
  "  useEffect(() => {\n    setNavigationContext(current => revalidateNavigationContext(state, current));\n  }, [state]);",
  "  useEffect(() => {\n    setNavigationContext(current => revalidateNavigationContext(state, current));\n  }, [state]);\n\n  useEffect(() => {\n    if (!movementResolution) return;\n    if (movementResolution.phase === 'arming') {\n      const frame = window.requestAnimationFrame(() => {\n        setMovementResolution(current => current?.phase === 'arming' ? { ...current, phase: 'playing' } : current);\n      });\n      return () => window.cancelAnimationFrame(frame);\n    }\n    const delay = movementResolution.reducedMotion ? MOVEMENT_RESOLUTION_REDUCED_MS : MOVEMENT_RESOLUTION_BEAT_MS;\n    const timeout = window.setTimeout(() => {\n      setState(movementResolution.next);\n      setMovementResolution(null);\n    }, delay);\n    return () => window.clearTimeout(timeout);\n  }, [movementResolution]);\n\n  useEffect(() => {\n    if (!movementResolution) movementResolutionLockRef.current = false;\n  }, [state.turn, movementResolution]);\n\n  const movementMapState: GameState = movementResolution?.phase === 'playing'\n    ? { ...state, taskGroups: movementResolution.next.taskGroups }\n    : state;"
);

replaceOnce(
  'movement resolution entry point',
  "  const openTerritoryOnMap = (id: string) => {",
  "  const beginMovementResolution = (current: GameState) => {\n    if (movementResolutionLockRef.current) return;\n    movementResolutionLockRef.current = true;\n    const next = advanceDay(current);\n    const hasVisibleMovement = Object.values(current.taskGroups).some(group => {\n      const resolved = next.taskGroups[group.id];\n      const order = group.order;\n      if (!resolved || !order) return false;\n      if (order.type === 'move') {\n        return resolved.location !== group.location || resolved.order?.progress !== order.progress;\n      }\n      if (order.type === 'attack' && order.days === 0) {\n        return resolved.location !== group.location || resolved.order?.days !== order.days || resolved.order?.type !== 'attack';\n      }\n      return false;\n    });\n    if (!hasVisibleMovement) {\n      setState(next);\n      return;\n    }\n    setNavigationContext(null);\n    setCurrentView('map');\n    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n    setMovementResolution({ phase: 'arming', next, reducedMotion });\n  };\n\n  const openTerritoryOnMap = (id: string) => {"
);

replaceOnce(
  'normal resolve path',
  "    setState(advanceDay(state));",
  "    beginMovementResolution(state);"
);

replaceOnce(
  'supply override resolve path',
  "    setState(advanceDay(markSupplyWarningAcknowledged(state)));",
  "    beginMovementResolution(markSupplyWarningAcknowledged(state));"
);

replaceOnce(
  'busy app shell',
  "  return <main className={`app-shell command-app-shell ${tutorialStep ? `tutorial-step-${tutorialStep.target}` : ''}`}>",
  "  return <main aria-busy={Boolean(movementResolution)} className={`app-shell command-app-shell ${movementResolution ? 'movement-resolution-active ' : ''}${tutorialStep ? `tutorial-step-${tutorialStep.target}` : ''}`}>"
);

replaceOnce(
  'resolve button lock',
  "disabled={state.status !== 'playing' || collapseDecisionPending}",
  "disabled={state.status !== 'playing' || collapseDecisionPending || Boolean(movementResolution)}"
);

replaceOnce(
  'terrain staged state',
  "              <TerrainMapPrototype\n                state={state}",
  "              <TerrainMapPrototype\n                state={movementMapState}"
);

replaceOnce(
  'fallback staged state',
  "            </Suspense> : <MapView\n              state={state}",
  "            </Suspense> : <MapView\n              state={movementMapState}"
);

replaceOnce(
  'movement resolution visual lock',
  "    <TutorialOverlay step={tutorialStep}",
  "    {movementResolution && <div\n      className=\"r3-movement-resolution-lock\"\n      role=\"status\"\n      aria-live=\"polite\"\n      data-phase={movementResolution.phase}\n      data-from-turn={state.turn}\n      data-to-turn={movementResolution.next.turn}\n      style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'auto', background: 'transparent' }}\n    >\n      <div style={{ position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)', width: 'min(540px, calc(100vw - 32px))', padding: '14px 18px', border: '1px solid rgba(143,255,241,0.7)', borderRadius: 10, background: 'rgba(8,18,21,0.94)', boxShadow: '0 14px 36px rgba(0,0,0,0.42)', textAlign: 'center' }}>\n        <small style={{ display: 'block', letterSpacing: '0.14em', opacity: 0.78 }}>END-OF-DAY OPERATIONAL MOVEMENT</small>\n        <strong style={{ display: 'block', marginTop: 4, fontSize: '1.05rem' }}>{movementResolution.phase === 'arming' ? 'Orders locked' : 'Movement resolution'}</strong>\n        <span style={{ display: 'block', marginTop: 3, opacity: 0.82 }}>Day {String(state.turn).padStart(3, '0')} → {String(movementResolution.next.turn).padStart(3, '0')} · ordered formations resolving concurrently</span>\n      </div>\n    </div>}\n\n    <TutorialOverlay step={tutorialStep}"
);

writeFileSync(path, source);
console.log('Applied R3-WP3.7 App movement-resolution staging patch.');
