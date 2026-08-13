import type { Marker } from 'maplibre-gl';
import { TERRITORIES } from '../game/data';
import type { GameState } from '../game/types';
import { formationPresentationPosition, type FormationGeoPoint } from './r3-formation-movement';

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

export function applyMovingFormationMarkers(
  markers: readonly Marker[],
  state: GameState,
  territoryCentres: Readonly<Record<string, FormationGeoPoint>>
) {
  for (const marker of markers) {
    const element = marker.getElement();
    const groupId = element.dataset.groupId;
    if (!groupId) continue;
    const group = state.taskGroups[groupId];
    if (group?.status !== 'moving' || group.order?.type !== 'move') continue;

    const progress = clampProgress(group.order.progress);
    const position = formationPresentationPosition(group, territoryCentres);
    if (position) marker.setLngLat([position[0], position[1]]);

    const scale = 1 - progress / 100;
    const originalX = Number(element.dataset.r3MarkerOffsetX ?? 0);
    const originalY = Number(element.dataset.r3MarkerOffsetY ?? 0);
    const offsetX = originalX * scale;
    const offsetY = originalY * scale;
    element.dataset.r3MarkerOffsetX = String(offsetX);
    element.dataset.r3MarkerOffsetY = String(offsetY);
    marker.setOffset([offsetX, offsetY]);

    element.dataset.movementProgress = String(progress);
    element.dataset.movementTarget = group.order.target;
    if (group.order.routeId) element.dataset.movementRouteId = group.order.routeId;
    const targetName = TERRITORIES[group.order.target]?.centre ?? group.order.target;
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
