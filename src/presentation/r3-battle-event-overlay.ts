import type { Map } from 'maplibre-gl';
import type { StrategicEventCue } from './r3-strategic-event-cues';

const SVG_NS = 'http://www.w3.org/2000/svg';

type GeoPoint = readonly [number, number];

interface BattleOverlayState {
  overlay?: SVGSVGElement;
  cues: readonly StrategicEventCue[];
  centres: Readonly<Record<string, GeoPoint>>;
  frame?: number;
  moving: boolean;
  visible: boolean;
  onMoveStart: () => void;
  onMoveEnd: () => void;
  onResize: () => void;
}

const states = new WeakMap<Map, BattleOverlayState>();

export const battleEventMotionPolicy = (reducedMotion: boolean) => ({
  animate: !reducedMotion,
  staticDirection: true,
  staticTarget: true,
  staticOutcome: true
} as const);

const ensureOverlay = (map: Map, state: BattleOverlayState) => {
  if (state.overlay?.isConnected) return state.overlay;
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.classList.add('r3-wp4-battle-events');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');
  Object.assign(overlay.style, {
    position: 'absolute',
    zIndex: '2',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none'
  });
  map.getContainer().appendChild(overlay);
  state.overlay = overlay;
  return overlay;
};

const svgNode = <K extends keyof SVGElementTagNameMap>(name: K) => document.createElementNS(SVG_NS, name);

const outcomeStyle = (kind: Exclude<StrategicEventCue['kind'], 'active-attack'>) => {
  switch (kind) {
    case 'recent-victory':
    case 'recent-capture':
      return { stroke: '#ffd166', fill: 'rgba(255, 209, 102, .13)', glyph: 'victory' as const };
    case 'recent-withdrawal':
      return { stroke: '#ff9f43', fill: 'rgba(255, 159, 67, .12)', glyph: 'withdrawal' as const };
    case 'recent-counterattack-repelled':
      return { stroke: '#ff7a2f', fill: 'rgba(255, 122, 47, .12)', glyph: 'repelled' as const };
    case 'recent-territory-lost':
      return { stroke: '#ff4d4d', fill: 'rgba(255, 77, 77, .14)', glyph: 'lost' as const };
  }
};

const appendOutcomeGlyph = (
  group: SVGGElement,
  x: number,
  y: number,
  size: number,
  stroke: string,
  glyph: ReturnType<typeof outcomeStyle>['glyph']
) => {
  if (glyph === 'victory') {
    const mark = svgNode('polyline');
    mark.setAttribute('points', `${x - size * .45},${y} ${x - size * .08},${y + size * .38} ${x + size * .58},${y - size * .45}`);
    mark.setAttribute('fill', 'none');
    mark.setAttribute('stroke', stroke);
    mark.setAttribute('stroke-width', '2.5');
    mark.setAttribute('stroke-linecap', 'round');
    mark.setAttribute('stroke-linejoin', 'round');
    group.appendChild(mark);
    return;
  }

  if (glyph === 'withdrawal') {
    const mark = svgNode('polyline');
    mark.setAttribute('points', `${x + size * .45},${y - size * .45} ${x - size * .25},${y} ${x + size * .45},${y + size * .45}`);
    mark.setAttribute('fill', 'none');
    mark.setAttribute('stroke', stroke);
    mark.setAttribute('stroke-width', '2.4');
    mark.setAttribute('stroke-linecap', 'round');
    mark.setAttribute('stroke-linejoin', 'round');
    group.appendChild(mark);
    return;
  }

  if (glyph === 'repelled') {
    const mark = svgNode('line');
    mark.setAttribute('x1', String(x - size * .48));
    mark.setAttribute('y1', String(y));
    mark.setAttribute('x2', String(x + size * .48));
    mark.setAttribute('y2', String(y));
    mark.setAttribute('stroke', stroke);
    mark.setAttribute('stroke-width', '2.6');
    mark.setAttribute('stroke-linecap', 'round');
    group.appendChild(mark);
    return;
  }

  for (const direction of [-1, 1]) {
    const mark = svgNode('line');
    mark.setAttribute('x1', String(x - size * .42));
    mark.setAttribute('y1', String(y + direction * size * .42));
    mark.setAttribute('x2', String(x + size * .42));
    mark.setAttribute('y2', String(y - direction * size * .42));
    mark.setAttribute('stroke', stroke);
    mark.setAttribute('stroke-width', '2.6');
    mark.setAttribute('stroke-linecap', 'round');
    group.appendChild(mark);
  }
};

const render = (map: Map, state: BattleOverlayState) => {
  if (!state.visible || state.cues.length === 0) {
    state.overlay?.replaceChildren();
    if (state.overlay) state.overlay.style.display = 'none';
    return;
  }

  const overlay = ensureOverlay(map, state);
  const rect = map.getContainer().getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
  overlay.style.display = '';
  overlay.replaceChildren();

  const host = map.getContainer().closest('.r3-terrain-prototype') as HTMLElement | null;
  const theatre = host?.dataset.overlayLod === 'theatre';
  const selected = host?.dataset.overlayLod === 'selected';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  overlay.dataset.motion = battleEventMotionPolicy(reducedMotion).animate ? 'standard' : 'reduced';

  for (const cue of state.cues) {
    if (cue.kind === 'active-attack') {
      const origin = state.centres[cue.originTerritoryId];
      const target = state.centres[cue.targetTerritoryId];
      if (!origin || !target) continue;
      const from = map.project([origin[0], origin[1]]);
      const to = map.project([target[0], target[1]]);
      const group = svgNode('g');
      group.dataset.cueId = cue.id;
      group.classList.add('r3-wp4-active-attack');

      const line = svgNode('line');
      line.classList.add('r3-wp4-attack-direction');
      line.setAttribute('x1', String(from.x));
      line.setAttribute('y1', String(from.y));
      line.setAttribute('x2', String(to.x));
      line.setAttribute('y2', String(to.y));
      line.setAttribute('stroke', '#ff7a2f');
      line.setAttribute('stroke-width', theatre ? '2.5' : selected ? '4' : '3.25');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', theatre ? '.72' : '.9');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      line.style.filter = 'drop-shadow(0 1px 2px rgba(0, 0, 0, .8))';

      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const size = theatre ? 7 : selected ? 12 : 10;
      const backX = to.x - Math.cos(angle) * (size + 4);
      const backY = to.y - Math.sin(angle) * (size + 4);
      const left = [backX + Math.cos(angle + Math.PI / 2) * size, backY + Math.sin(angle + Math.PI / 2) * size];
      const right = [backX + Math.cos(angle - Math.PI / 2) * size, backY + Math.sin(angle - Math.PI / 2) * size];
      const chevron = svgNode('polyline');
      chevron.classList.add('r3-wp4-attack-chevron');
      chevron.setAttribute('points', `${left[0]},${left[1]} ${to.x},${to.y} ${right[0]},${right[1]}`);
      chevron.setAttribute('fill', 'none');
      chevron.setAttribute('stroke', '#ffb14e');
      chevron.setAttribute('stroke-width', theatre ? '2.5' : '3.5');
      chevron.setAttribute('stroke-linecap', 'round');
      chevron.setAttribute('stroke-linejoin', 'round');

      const targetRing = svgNode('circle');
      targetRing.classList.add('r3-wp4-attack-target');
      targetRing.setAttribute('cx', String(to.x));
      targetRing.setAttribute('cy', String(to.y));
      targetRing.setAttribute('r', theatre ? '6' : selected ? '12' : '9');
      targetRing.setAttribute('fill', 'rgba(255, 74, 35, .16)');
      targetRing.setAttribute('stroke', '#ff4a23');
      targetRing.setAttribute('stroke-width', theatre ? '2' : '2.5');
      targetRing.setAttribute('vector-effect', 'non-scaling-stroke');

      group.append(line, chevron, targetRing);
      overlay.appendChild(group);
      continue;
    }

    const centre = state.centres[cue.territoryId];
    if (!centre) continue;
    const point = map.project([centre[0], centre[1]]);
    const style = outcomeStyle(cue.kind);
    const baseRadius = theatre ? 7 : selected ? 14 : 10;
    const radius = Math.max(5, baseRadius - cue.age * 2);
    const opacity = cue.age === 0 ? .95 : .62;
    const group = svgNode('g');
    group.dataset.cueId = cue.id;
    group.classList.add('r3-wp4-recent-outcome', `r3-wp4-${cue.kind}`);
    group.setAttribute('opacity', String(opacity));

    const ring = svgNode('circle');
    ring.setAttribute('cx', String(point.x));
    ring.setAttribute('cy', String(point.y));
    ring.setAttribute('r', String(radius));
    ring.setAttribute('fill', style.fill);
    ring.setAttribute('stroke', style.stroke);
    ring.setAttribute('stroke-width', theatre ? '2' : '2.5');
    ring.setAttribute('vector-effect', 'non-scaling-stroke');
    group.appendChild(ring);
    appendOutcomeGlyph(group, point.x, point.y, radius * .7, style.stroke, style.glyph);
    overlay.appendChild(group);
  }
};

const schedule = (map: Map, state: BattleOverlayState) => {
  if (state.frame !== undefined) return;
  state.frame = requestAnimationFrame(() => {
    state.frame = undefined;
    if (map.isMoving() || state.moving) return;
    render(map, state);
    if (state.overlay) state.overlay.style.visibility = '';
  });
};

export function syncBattleEventOverlay(
  map: Map,
  cues: readonly StrategicEventCue[],
  centres: Readonly<Record<string, GeoPoint>>,
  visible = true
) {
  let state = states.get(map);
  if (!state) {
    state = {
      cues,
      centres,
      moving: false,
      visible,
      onMoveStart: () => {
        const current = states.get(map);
        if (!current) return;
        current.moving = true;
        if (current.overlay) current.overlay.style.visibility = 'hidden';
      },
      onMoveEnd: () => {
        const current = states.get(map);
        if (!current) return;
        current.moving = false;
        schedule(map, current);
      },
      onResize: () => {
        const current = states.get(map);
        if (current) schedule(map, current);
      }
    };
    states.set(map, state);
    map.on('movestart', state.onMoveStart);
    map.on('moveend', state.onMoveEnd);
    map.on('resize', state.onResize);
  }
  state.cues = cues;
  state.centres = centres;
  state.visible = visible;
  if (map.isMoving()) state.onMoveStart();
  else schedule(map, state);
}

export function setBattleEventOverlayVisible(map: Map, visible: boolean) {
  const state = states.get(map);
  if (!state) return;
  state.visible = visible;
  schedule(map, state);
}

export function removeBattleEventOverlay(map: Map) {
  const state = states.get(map);
  if (!state) return;
  if (state.frame !== undefined) cancelAnimationFrame(state.frame);
  map.off('movestart', state.onMoveStart);
  map.off('moveend', state.onMoveEnd);
  map.off('resize', state.onResize);
  state.overlay?.remove();
  states.delete(map);
}
