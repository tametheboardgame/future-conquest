import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import './portal-arrival.css';

type ArrivalPhase = 'waiting' | 'opening' | 'materialising' | 'closing';
type ArrivalCompletionReason = 'completed' | 'renderer-unavailable' | 'renderer-lost' | 'no-formations';

type ArrivalPoint = {
  id: string;
  x: number;
  y: number;
};

type ArrivalFrame = {
  map: { left: number; top: number; width: number; height: number };
  portal: { x: number; y: number };
  formations: ArrivalPoint[];
};

type ArrivalMapBridge = {
  project: (point: [number, number]) => { x: number; y: number };
  getContainer: () => HTMLElement;
  triggerRepaint?: () => void;
};

type FormationTargetBridge = {
  pieces: Array<{ id: string; target: readonly [number, number] }>;
};

type ArrivalLifecycleEvidence = {
  schemaVersion: 1;
  status: 'running' | 'completed' | 'aborted';
  reason?: ArrivalCompletionReason;
  reducedMotion: boolean;
  portalTerritory?: string;
  formationCount: number;
  startedAt: number;
  materialisingAt?: number;
  closingAt?: number;
  completedAt?: number;
  withheldAtStart: boolean;
  withheldAtMaterialisingBoundary?: boolean;
  withheldAfterMaterialisingBoundary?: boolean;
  withheldAtCompletion?: boolean;
};

type ArrivalWindowBridge = typeof window & {
  __r3TerrainMap?: ArrivalMapBridge;
  __r3TerritoryCentres?: Record<string, readonly [number, number]>;
  __r3FormationPortalTargets?: FormationTargetBridge;
  __r3FormationMiniatures?: FormationTargetBridge;
  __r3PortalArrival?: {
    active: boolean;
    phase: ArrivalPhase;
    reducedMotion: boolean;
    portalTerritory?: string;
    portal: { x: number; y: number };
    formations: ArrivalPoint[];
  };
  __r3PortalArrivalLifecycle?: ArrivalLifecycleEvidence;
};

interface Props {
  active: boolean;
  portalTerritory?: string;
  onStarted?: () => void;
  onComplete: () => void;
}

const POSITION_REFRESH_MS = 80;
const READY_WITHOUT_FORMATIONS_GRACE_MS = 1500;
const RENDERER_LOSS_GRACE_MS = 1000;
const FORMATION_WITHHOLD_DATASET_KEY = 'r3WithholdFormations';
const FULL_SEQUENCE = {
  materialise: 720,
  closing: 2140,
  complete: 3260
} as const;
const REDUCED_SEQUENCE = {
  materialise: 40,
  closing: 190,
  complete: 380
} as const;

function bridge(): ArrivalWindowBridge {
  return window as ArrivalWindowBridge;
}

function formationsWithheld() {
  return document.documentElement.dataset[FORMATION_WITHHOLD_DATASET_KEY] === 'true';
}

function setFormationWithheld(withheld: boolean) {
  if (withheld) document.documentElement.dataset[FORMATION_WITHHOLD_DATASET_KEY] = 'true';
  else delete document.documentElement.dataset[FORMATION_WITHHOLD_DATASET_KEY];
  bridge().__r3TerrainMap?.triggerRepaint?.();
}

function projectArrivalFrame(portalTerritory?: string): ArrivalFrame | undefined {
  const runtime = bridge();
  const map = runtime.__r3TerrainMap;
  const renderedPieces = runtime.__r3FormationMiniatures?.pieces;
  if (!map || !renderedPieces?.length) return undefined;

  const pieces = runtime.__r3FormationPortalTargets?.pieces ?? renderedPieces;
  const rect = map.getContainer().getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;

  const project = (point: readonly [number, number]) => {
    const projected = map.project([point[0], point[1]]);
    return { x: rect.left + projected.x, y: rect.top + projected.y };
  };

  const portalAnchor = (portalTerritory ? runtime.__r3TerritoryCentres?.[portalTerritory] : undefined)
    ?? pieces[0]?.target;
  if (!portalAnchor) return undefined;

  return {
    map: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    portal: project(portalAnchor),
    formations: pieces.map(piece => ({ id: piece.id, ...project(piece.target) }))
  };
}

function terrainRendererStatus() {
  return document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') ?? null;
}

function terrainRendererStable() {
  const status = terrainRendererStatus();
  return status === 'ready' || status === 'warning';
}

function physicalFormationStatus() {
  return document.querySelector('[data-physical-formations]')?.getAttribute('data-physical-formations') ?? null;
}

function rendererUnavailable() {
  const params = new URLSearchParams(window.location.search);
  return params.get('terrain') === '0'
    || physicalFormationStatus() === 'fallback'
    || Boolean(document.querySelector('.r3-terrain-compact-fallback, .r3-terrain-fallback-notice'));
}

function awaitingFreshCampaignState() {
  return Boolean(document.querySelector('.command-outcome.victory, .command-outcome.defeat'));
}

export function PortalArrivalSequence({ active, portalTerritory, onStarted, onComplete }: Props) {
  const [phase, setPhase] = useState<ArrivalPhase>('waiting');
  const [frame, setFrame] = useState<ArrivalFrame>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const portalTerritoryRef = useRef(portalTerritory);
  const onStartedRef = useRef(onStarted);
  const onCompleteRef = useRef(onComplete);
  portalTerritoryRef.current = portalTerritory;
  onStartedRef.current = onStarted;
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    if (!active) {
      setFormationWithheld(false);
      return;
    }
    setFormationWithheld(true);
    return () => setFormationWithheld(false);
  }, [active]);

  useEffect(() => {
    if (!active) {
      setPhase('waiting');
      setFrame(undefined);
      delete bridge().__r3PortalArrival;
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduced);
    setPhase('waiting');
    setFrame(undefined);

    let sequenceStarted = false;
    let presentationConsumed = false;
    let completed = false;
    let readyWithoutFormationsSince: number | undefined;
    let rendererLostSince: number | undefined;
    const timeouts: number[] = [];

    const consumePresentation = () => {
      if (presentationConsumed) return;
      presentationConsumed = true;
      onStartedRef.current?.();
    };

    const finish = (reason: ArrivalCompletionReason) => {
      if (completed) return;
      setFormationWithheld(false);
      const lifecycle = bridge().__r3PortalArrivalLifecycle;
      if (lifecycle?.status === 'running') {
        lifecycle.status = reason === 'completed' ? 'completed' : 'aborted';
        lifecycle.reason = reason;
        lifecycle.completedAt = performance.now();
        lifecycle.withheldAtCompletion = formationsWithheld();
      }
      consumePresentation();
      completed = true;
      delete bridge().__r3PortalArrival;
      onCompleteRef.current();
    };

    const beginSequence = (nextFrame: ArrivalFrame) => {
      if (sequenceStarted) return;
      sequenceStarted = true;
      consumePresentation();
      const timing = reduced ? REDUCED_SEQUENCE : FULL_SEQUENCE;
      bridge().__r3PortalArrivalLifecycle = {
        schemaVersion: 1,
        status: 'running',
        reducedMotion: reduced,
        portalTerritory: portalTerritoryRef.current,
        formationCount: nextFrame.formations.length,
        startedAt: performance.now(),
        withheldAtStart: formationsWithheld()
      };
      setFrame(nextFrame);
      setPhase('opening');
      timeouts.push(window.setTimeout(() => {
        const lifecycle = bridge().__r3PortalArrivalLifecycle;
        if (lifecycle?.status === 'running') {
          lifecycle.materialisingAt = performance.now();
          lifecycle.withheldAtMaterialisingBoundary = formationsWithheld();
        }
        setFormationWithheld(false);
        if (lifecycle?.status === 'running') lifecycle.withheldAfterMaterialisingBoundary = formationsWithheld();
        setPhase('materialising');
      }, timing.materialise));
      timeouts.push(window.setTimeout(() => {
        const lifecycle = bridge().__r3PortalArrivalLifecycle;
        if (lifecycle?.status === 'running') lifecycle.closingAt = performance.now();
        setPhase('closing');
      }, timing.closing));
      timeouts.push(window.setTimeout(() => finish('completed'), timing.complete));
    };

    const refresh = () => {
      if (completed) return;
      if (awaitingFreshCampaignState()) return;
      if (rendererUnavailable()) {
        finish('renderer-unavailable');
        return;
      }

      if (sequenceStarted) {
        const refreshedFrame = terrainRendererStable() ? projectArrivalFrame(portalTerritoryRef.current) : undefined;
        if (refreshedFrame) {
          rendererLostSince = undefined;
          setFrame(refreshedFrame);
          return;
        }
        rendererLostSince ??= performance.now();
        if (performance.now() - rendererLostSince >= RENDERER_LOSS_GRACE_MS) finish('renderer-lost');
        return;
      }

      const formationStatus = physicalFormationStatus();
      if (!terrainRendererStable()) {
        readyWithoutFormationsSince = undefined;
        return;
      }

      const nextFrame = projectArrivalFrame(portalTerritoryRef.current);
      if (nextFrame) {
        readyWithoutFormationsSince = undefined;
        setFrame(nextFrame);
        beginSequence(nextFrame);
        return;
      }

      if (formationStatus === null) {
        readyWithoutFormationsSince = undefined;
        return;
      }

      if (formationStatus === 'ready') {
        readyWithoutFormationsSince ??= performance.now();
        if (performance.now() - readyWithoutFormationsSince >= READY_WITHOUT_FORMATIONS_GRACE_MS) finish('no-formations');
      }
    };

    refresh();
    const interval = window.setInterval(refresh, POSITION_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      for (const timeout of timeouts) window.clearTimeout(timeout);
      delete bridge().__r3PortalArrival;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !frame) return;
    bridge().__r3PortalArrival = {
      active: true,
      phase,
      reducedMotion,
      portalTerritory,
      portal: frame.portal,
      formations: frame.formations
    };
  }, [active, frame, phase, portalTerritory, reducedMotion]);

  if (!active || !frame) return null;

  const mapStyle: CSSProperties = {
    left: frame.map.left,
    top: frame.map.top,
    width: frame.map.width,
    height: frame.map.height
  };

  return <div
    className="r3-portal-arrival"
    data-phase={phase}
    data-reduced-motion={reducedMotion ? 'true' : 'false'}
    role="status"
    aria-live="polite"
    aria-label="Future formations arriving through temporal insertion gate"
  >
    <div className="r3-portal-map-field" style={mapStyle} aria-hidden="true" />

    <div className="r3-arrival-portal" style={{ left: frame.portal.x, top: frame.portal.y }} aria-hidden="true">
      <span className="portal-halo" />
      <span className="portal-ring portal-ring-outer" />
      <span className="portal-ring portal-ring-mid" />
      <span className="portal-ring portal-ring-inner" />
      <span className="portal-core" />
      <span className="portal-axis portal-axis-a" />
      <span className="portal-axis portal-axis-b" />
    </div>

    <div className="r3-arrival-readout" style={{ left: frame.portal.x, top: frame.portal.y }}>
      <small>TEMPORAL INSERTION GATE</small>
      <strong>{phase === 'opening' ? 'CORRIDOR STABLE' : phase === 'materialising' ? 'FORMATIONS MATERIALISING' : 'GATE COLLAPSING'}</strong>
      <span>{portalTerritory ? `ANCHOR ${portalTerritory}` : 'FIELD ANCHOR LOCKED'}</span>
    </div>

    {frame.formations.map((formation, index) => <div
      key={formation.id}
      className="r3-arrival-materialisation"
      data-formation-id={formation.id}
      style={{ left: formation.x, top: formation.y, '--arrival-delay': `${index * 45}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <i className="materialisation-ring" />
      <i className="materialisation-column" />
      <b>{formation.id}</b>
    </div>)}
  </div>;
}
