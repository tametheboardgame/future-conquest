import { useEffect, useState, type CSSProperties } from 'react';
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

type FormationLayerImplementationBridge = {
  visible?: boolean;
};

type CustomStyleLayerBridge = {
  implementation?: FormationLayerImplementationBridge;
};

type ArrivalMapBridge = {
  project: (point: [number, number]) => { x: number; y: number };
  getContainer: () => HTMLElement;
  getLayer?: (id: string) => CustomStyleLayerBridge | undefined;
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
const FORMATION_WITHHOLD_SETTLE_MS = 48;
const R3_FORMATION_MINIATURE_LAYER_ID = 'r3-wp3-5-formation-miniatures';
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

function formationLayerImplementation(): FormationLayerImplementationBridge | undefined {
  const map = bridge().__r3TerrainMap as unknown as ArrivalMapBridge | undefined;
  return map?.getLayer?.(R3_FORMATION_MINIATURE_LAYER_ID)?.implementation;
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
    let sequenceScheduled = false;
    let formationsReleased = false;
    let presentationConsumed = false;
    let completed = false;
    let controlledFormationLayer: FormationLayerImplementationBridge | undefined;
    let originalFormationVisibility: boolean | undefined;
    const timeouts: number[] = [];

    const withholdFormationVisibility = () => {
      const layer = formationLayerImplementation();
      if (!layer || typeof layer.visible !== 'boolean') return false;
      if (controlledFormationLayer !== layer) {
        controlledFormationLayer = layer;
        originalFormationVisibility = layer.visible;
      }
      layer.visible = false;
      bridge().__r3TerrainMap?.triggerRepaint?.();
      return true;
    };

    const restoreFormationVisibility = () => {
      if (!controlledFormationLayer || originalFormationVisibility === undefined) return;
      controlledFormationLayer.visible = originalFormationVisibility;
      bridge().__r3TerrainMap?.triggerRepaint?.();
      controlledFormationLayer = undefined;
      originalFormationVisibility = undefined;
    };

    const consumePresentation = () => {
      if (presentationConsumed) return;
      presentationConsumed = true;
      onStarted?.();
    };

    const finish = () => {
      if (completed) return;
      restoreFormationVisibility();
      consumePresentation();
      completed = true;
      delete bridge().__r3PortalArrival;
      onComplete();
    };

    const beginSequence = (nextFrame: ArrivalFrame) => {
      if (sequenceStarted || completed) return;
      sequenceStarted = true;
      consumePresentation();
      setFrame(nextFrame);
      setPhase('opening');
      const timing = reduced ? REDUCED_SEQUENCE : FULL_SEQUENCE;
      timeouts.push(window.setTimeout(() => {
        formationsReleased = true;
        restoreFormationVisibility();
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
        if (sequenceStarted) {
          if (!formationsReleased) withholdFormationVisibility();
          return;
        }
        if (!sequenceScheduled && withholdFormationVisibility()) {
          sequenceScheduled = true;
          // Keep the waiting veil up for one rendered terrain frame after the
          // Three.js formation layer is suppressed. The portal therefore opens
          // onto an empty arrival zone rather than revealing already-landed troops.
          timeouts.push(window.setTimeout(() => {
            if (completed) return;
            withholdFormationVisibility();
            beginSequence(nextFrame);
          }, reduced ? 16 : FORMATION_WITHHOLD_SETTLE_MS));
        }
        return;
      }
      if (performance.now() - startedAt >= READY_TIMEOUT_MS) finish();
    };

    refresh();
    const interval = window.setInterval(refresh, POSITION_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      for (const timeout of timeouts) window.clearTimeout(timeout);
      restoreFormationVisibility();
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
  const mapFieldStyle: CSSProperties = phase === 'waiting'
    ? { ...mapStyle, background: 'rgba(2, 10, 14, 0.985)', opacity: 1 }
    : mapStyle;

  return <div
    className="r3-portal-arrival"
    data-phase={phase}
    data-reduced-motion={reducedMotion ? 'true' : 'false'}
    role="status"
    aria-live="polite"
    aria-label={phase === 'waiting' ? 'Acquiring arrival corridor' : 'Future formations arriving through temporal insertion gate'}
  >
    <div className="r3-portal-map-field" style={mapFieldStyle} aria-hidden="true" />

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