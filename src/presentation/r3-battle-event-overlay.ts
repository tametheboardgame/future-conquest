import type { Map } from 'maplibre-gl';
import type { ActiveAttackCue } from './r3-strategic-event-cues';
import type { FormationGeoPoint } from './r3-formation-movement';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface BattleOverlayState {
  overlay?: SVGSVGElement;
  cues: readonly ActiveAttackCue[];
  centres: Readonly<Record<string, FormationGeoPoint>>;
  frame?: number;
  moving: boolean;
  onMoveStart: () => void;
  onMoveEnd: () => void;
  onResize: () => void;
}

const states = new WeakMap<Map, BattleOverlayState>();

export const battleEventMotionPolicy = (reducedMotion: boolean) => ({
  animate: !reducedMotion,
  staticDirection: true,
  staticTarget: true
} as const);

const ensureOverlay = (map: Map, state: BattleOverlayState) => {
  if (state.overlay?.isConnected) return state.overlay;
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.classList.add('r3-wp4-battle-events');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');
  Object.assign(overlay.style, {
    position: 'absolute', zIndex: '2', inset: '0', width: '100%', height: '100%',
    overflow: 'hidden', pointerEvents: 'none'
  });
  map.getContainer().appendChild(overlay);
  state.overlay = overlay;
  return overlay;
};

const svgNode = (name: 'line' | 'polyline' | 'circle') => document.createElementNS(SVG_NS, name);

const render = (map: Map, state: BattleOverlayState) => {
  const drawable = state.cues.flatMap(cue => {
    const origin = state.centres[cue.originTerritoryId];
    const target = state.centres[cue.targetTerritoryId];
    return origin && target ? [{ cue, origin, target }] : [];
  });
  if (!drawable.length) {
    state.overlay?.replaceChildren();
    if (state.overlay) state.overlay.style.display = 'none';
    return;
  }
  const overlay = ensureOverlay(map, state);
  const rect = map.getContainer().getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
  overlay.style.display = '';

  const host = map.getContainer().closest('.r3-terrain-prototype') as HTMLElement | null;
  const theatre = host?.dataset.overlayLod === 'theatre';
  const selected = host?.dataset.overlayLod === 'selected';
  const nextIds = new Set(drawable.map(({ cue }) => cue.id));
  for (const child of [...overlay.children]) {
    if (!nextIds.has((child as SVGElement).dataset.cueId ?? '')) child.remove();
  }

  for (const { cue, origin, target } of drawable) {
    const from = map.project([origin[0], origin[1]]);
    const to = map.project([target[0], target[1]]);
    let group = [...overlay.children].find(child => (child as SVGElement).dataset.cueId === cue.id) as SVGGElement | undefined;
    if (!group) {
      group = document.createElementNS(SVG_NS, 'g');
      group.dataset.cueId = cue.id;
      group.classList.add('r3-wp4-active-attack');
      const line = svgNode('line');
      line.classList.add('r3-wp4-attack-direction');
      const chevron = svgNode('polyline');
      chevron.classList.add('r3-wp4-attack-chevron');
      const targetRing = svgNode('circle');
      targetRing.classList.add('r3-wp4-attack-target');
      group.append(line, chevron, targetRing);
      overlay.appendChild(group);
    }
    const line = group.children[0];
    line.setAttribute('x1', String(from.x)); line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x)); line.setAttribute('y2', String(to.y));
    line.setAttribute('stroke', '#ff7a2f');
    line.setAttribute('stroke-width', theatre ? '2.5' : selected ? '4' : '3.25');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', theatre ? '.72' : '.9');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = theatre ? 7 : selected ? 12 : 10;
    const backX = to.x - Math.cos(angle) * (size + 4);
    const backY = to.y - Math.sin(angle) * (size + 4);
    const left = [backX + Math.cos(angle + Math.PI / 2) * size, backY + Math.sin(angle + Math.PI / 2) * size];
    const right = [backX + Math.cos(angle - Math.PI / 2) * size, backY + Math.sin(angle - Math.PI / 2) * size];
    const chevron = group.children[1];
    chevron.setAttribute('points', `${left[0]},${left[1]} ${to.x},${to.y} ${right[0]},${right[1]}`);
    chevron.setAttribute('fill', 'none'); chevron.setAttribute('stroke', '#ffb14e');
    chevron.setAttribute('stroke-width', theatre ? '2.5' : '3.5');
    chevron.setAttribute('stroke-linecap', 'round'); chevron.setAttribute('stroke-linejoin', 'round');
    const ring = group.children[2];
    ring.setAttribute('cx', String(to.x)); ring.setAttribute('cy', String(to.y));
    ring.setAttribute('r', theatre ? '6' : selected ? '12' : '9');
    ring.setAttribute('fill', 'rgba(255, 74, 35, .16)'); ring.setAttribute('stroke', '#ff4a23');
    ring.setAttribute('stroke-width', theatre ? '2' : '2.5');
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
  cues: readonly ActiveAttackCue[],
  centres: Readonly<Record<string, FormationGeoPoint>>
) {
  let state = states.get(map);
  if (!state) {
    state = {
      cues, centres, moving: false,
      onMoveStart: () => {
        const current = states.get(map);
        if (!current) return;
        current.moving = true;
        if (current.overlay) current.overlay.style.visibility = 'hidden';
      },
      onMoveEnd: () => { const current = states.get(map); if (current) { current.moving = false; schedule(map, current); } },
      onResize: () => { const current = states.get(map); if (current) schedule(map, current); }
    };
    states.set(map, state);
    map.on('movestart', state.onMoveStart);
    map.on('moveend', state.onMoveEnd);
    map.on('resize', state.onResize);
  }
  state.cues = cues;
  state.centres = centres;
  if (map.isMoving()) state.onMoveStart(); else schedule(map, state);
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
