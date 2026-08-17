import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import './portal-arrival.css';

type ArrivalPhase = 'waiting' | 'opening' | 'materialising' | 'closing';

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

type ArrivalWindowBridge = typeof window & {
  __r3TerrainMap?: ArrivalMapBridge;
  __r3TerritoryCentres?: Record<string, readonly [number, number]>;
  __r3FormationMiniatures?: {
    pieces: Array<{ id: string; target: readonly [number, number] }>;
  };
  __r3PortalArrival?: {
    active: boolean;
    phase: ArrivalPhase;
    reducedMotion: boolean;
    portalTerritory?: string;
    portal: { x: number; y: number };
    formations: ArrivalPoint[];
  };
};

interface Props {
  active: boolean;
  portalTerritory?: string;
  onStarted?: () => void;
  onComplete: () => void;
}

const READY_TIMEOUT_MS = 5000;
const POSITION_REFRESH_MS = 80;
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

function setFormationWithheld(withheld: boolean) {
  if (withheld) document.documentElement.dataset[FORMATION_WITHHOLD_DATASET_KEY] = 'true';
  else delete document.documentElement.dataset[FORMATION_WITHHOLD_DATASET_KEY];
  bridge().__r3TerrainMap?.triggerRepaint?.();
}

function projectArrivalFrame(portalTerritory?: string): ArrivalFrame | undefined {
  const runtime = bridge();
  const map = runtime.__r3TerrainMap;
  const pieces = runtime.__r3FormationMiniatures?.pieces;
  if (!map || !pieces?.length) return undefined;

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

function rendererUnavailable() {
  const params = new URLSearchParams(window.location.search);
  return params.get('terrain') === '0'
    || Boolean(document.querySelector('[data-physical-formations="fallback"], .r3-terrain-compact-fallback'));
}

function awaitingFreshCampaignState() {
  return Boolean(document.querySelector('.command-outcome.victory, .command-outcome.defeat'));
}

export function PortalArrivalSequence({ active, portalTerritory, onStarted, onComplete }: Props) {
  const [phase, setPhase] = useState<ArrivalPhase>('waiting');
  const [frame, setFrame] = useState<ArrivalFrame>();
  const [reducedMotion, setReducedMotion] = useState(false);

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

    const startedAt = performance.now();
    let sequenceStarted = false;
    let presentationConsumed = false;
    let completed = false;
    const timeouts: number[] = [];

    const consumePresentation = () => {
      if (presentationConsumed) return;
      presentationConsumed = true;
      onStarted?.();
    };

    const finish = () => {
      if (completed) return;
      setFormationWithheld(false);
      consumePresentation();
      completed = true;
      delete bridge().__r3PortalArrival;
      onComplete();
    };

    const beginSequence = (nextFrame: ArrivalFrame) => {
      if (sequenceStarted) return;
      sequenceStarted = true;
      consumePresentation();
      setFrame(nextFrame);
      setPhase('opening');
      const timing = reduced ? REDUCED_SEQUENCE : FULL_SEQUENCE;
      timeouts.push(window.setTimeout(() => {
        setFormationWithheld(false);
        setPhase('materialising');
      }, timing.materialise));
      timeouts.push(window.setTimeout(() => setPhase('closing'), timing.closing));
      timeouts.push(window.setTimeout(finish, timing.complete));
    };

    const refresh = () => {
      if (completed) return;
      if (awaitingFreshCampaignState()) return;
      if (rendererUnavailable()) {
        finish();
        return;
      }
      const nextFrame = projectArrivalFrame(portalTerritory);
      if (nextFrame) {
        setFrame(nextFrame);
        beginSequence(nextFrame);
        return;
      }
      if (performance.now() - startedAt >= READY_TIMEOUT_MS) finish();
    };

    refresh();
    const interval = window.setInterval(refresh, POSITION_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      for (const timeout of timeouts) window.clearTimeout(timeout);
      delete bridge().__r3PortalArrival;
    };
  }, [active, onComplete, onStarted, portalTerritory]);

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

  if (!active) return null;

  const mapStyle: CSSProperties = frame ? {
    left: frame.map.left,
    top: frame.map.top,
    width: frame.map.width,
    height: frame.map.height
  } : { inset: 0 };

  return <div
    className="r3-portal-arrival"
    data-phase={phase}
    data-reduced-motion={reducedMotion ? 'true' : 'false'}
    role="status"
    aria-live="polite"
    aria-label={phase === 'waiting' ? 'Acquiring arrival corridor' : 'Future formations arriving through temporal insertion gate'}
  >
    <div className="r3-portal-map-field" style={mapStyle} aria-hidden="true" />

    {frame && <>
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
    </>}

    {!frame && <div className="r3-arrival-waiting-readout">
      <small>TEMPORAL INSERTION</small>
      <strong>ACQUIRING TERRAIN LOCK</strong>
    </div>}
  </div>;
}