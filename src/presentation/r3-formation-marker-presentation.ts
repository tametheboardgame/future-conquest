import type { Marker } from 'maplibre-gl';
import { TERRITORIES } from '../game/data';
import type { GameState } from '../game/types';
import {
  formationPresentationPath,
  formationPresentationPosition,
  type FormationGeoPoint
} from './r3-formation-movement';

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));
const MOVEMENT_ANIMATION_MS = 520;
const renderedPositions = new WeakMap<Marker, FormationGeoPoint>();
const animationFrames = new WeakMap<Marker, number>();

const cancelMarkerAnimation = (marker: Marker) => {
  const frame = animationFrames.get(marker);
  if (frame !== undefined) cancelAnimationFrame(frame);
  animationFrames.delete(marker);
};

const reducedMotionRequested = () => (
  typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const setMarkerPresentationPosition = (
  marker: Marker,
  target: FormationGeoPoint,
  animate: boolean
) => {
  const previous = renderedPositions.get(marker);
  cancelMarkerAnimation(marker);
  if (!animate || !previous || reducedMotionRequested()) {
    marker.setLngLat([target[0], target[1]]);
    renderedPositions.set(marker, target);
    return;
  }

  marker.setLngLat([previous[0], previous[1]]);
  const startedAt = performance.now();
  const frame = (now: number) => {
    if (!marker.getElement().isConnected) {
      animationFrames.delete(marker);
      return;
    }
    const t = Math.max(0, Math.min(1, (now - startedAt) / MOVEMENT_ANIMATION_MS));
    const eased = 1 - Math.pow(1 - t, 3);
    const point: FormationGeoPoint = [
      previous[0] + (target[0] - previous[0]) * eased,
      previous[1] + (target[1] - previous[1]) * eased
    ];
    marker.setLngLat([point[0], point[1]]);
    renderedPositions.set(marker, point);
    if (t < 1) animationFrames.set(marker, requestAnimationFrame(frame));
    else animationFrames.delete(marker);
  };
  animationFrames.set(marker, requestAnimationFrame(frame));
};

export function applyMovingFormationMarkers(
  markers: readonly Marker[],
  state: GameState,
  territoryCentres: Readonly<Record<string, FormationGeoPoint>>,
  animate = false
) {
  for (const marker of markers) {
    const element = marker.getElement();
    const groupId = element.dataset.groupId;
    if (!groupId) continue;
    const group = state.taskGroups[groupId];
    const moving = group?.status === 'moving' && group.order?.type === 'move';
    if (!group || !moving) {
      cancelMarkerAnimation(marker);
      if (group) {
        const settled = territoryCentres[group.location];
        if (settled) renderedPositions.set(marker, settled);
      }
      delete element.dataset.movementProgress;
      delete element.dataset.movementTarget;
      delete element.dataset.movementRouteId;
      delete element.dataset.movementPath;
      continue;
    }

    const progress = clampProgress(group.order!.progress);
    const path = formationPresentationPath(group, territoryCentres);
    const position = formationPresentationPosition(group, territoryCentres);
    if (position) setMarkerPresentationPosition(marker, position, animate);

    const scale = 1 - progress / 100;
    const originalX = Number(element.dataset.r3MarkerOffsetX ?? 0);
    const originalY = Number(element.dataset.r3MarkerOffsetY ?? 0);
    const offsetX = originalX * scale;
    const offsetY = originalY * scale;
    element.dataset.r3MarkerOffsetX = String(offsetX);
    element.dataset.r3MarkerOffsetY = String(offsetY);
    marker.setOffset([offsetX, offsetY]);

    element.dataset.movementProgress = String(progress);
    element.dataset.movementTarget = group.order!.target;
    if (path?.length) element.dataset.movementPath = JSON.stringify(path);
    if (group.order!.routeId) element.dataset.movementRouteId = group.order!.routeId;
    const targetName = TERRITORIES[group.order!.target]?.centre ?? group.order!.target;
    element.setAttribute(
      'aria-label',
      `${group.name}, ${group.personnel} active personnel, moving ${Math.round(progress)} percent towards ${targetName}`
    );
  }
  return markers;
}

export function withIndependentMovingFormationClusters(
  markers: readonly Marker[],
  layout: () => void
) {
  const restored: Array<{ element: HTMLElement; territoryId: string }> = [];
  for (const marker of markers) {
    const element = marker.getElement();
    const territoryId = element.dataset.territoryId;
    if (!element.dataset.groupId || !element.dataset.movementProgress || !territoryId) continue;
    restored.push({ element, territoryId });
    element.dataset.territoryId = `moving:${element.dataset.groupId}`;
  }
  try {
    layout();
  } finally {
    for (const entry of restored) entry.element.dataset.territoryId = entry.territoryId;
  }
}
