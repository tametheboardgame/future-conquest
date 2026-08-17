import type { Map, Marker } from 'maplibre-gl';
import type { GameState } from '../game/types';
import {
  applyMovingFormationMarkers,
  withIndependentMovingFormationClusters
} from './r3-formation-marker-presentation';
import { syncFormationMovementRouteOverlay } from './r3-formation-route-overlay';
import {
  setBattleEventOverlayVisible,
  syncBattleEventOverlay
} from './r3-battle-event-overlay';
import { deriveStrategicEventCues } from './r3-strategic-event-cues';
import {
  applyTerrainOperationalMarkerLayout as applyCoreTerrainOperationalMarkerLayout,
  buildTerrainOperationalMarkers as buildCoreTerrainOperationalMarkers,
  reconcileTerrainOperationalMarkers as reconcileCoreTerrainOperationalMarkers,
  removeTerrainOperationalMarkers,
  terrainOperationalTerritoryCentres,
  type TerrainOperationalLayers
} from './r3-terrain-operational-markers-core';

export { removeTerrainOperationalMarkers, terrainOperationalTerritoryCentres };
export type { TerrainOperationalLayers };

interface MarkerCallbacks {
  onSelectTerritory: (territoryId: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

export function buildTerrainOperationalMarkers(map: Map, state: GameState, callbacks: MarkerCallbacks): Marker[] {
  const markers = applyMovingFormationMarkers(
    buildCoreTerrainOperationalMarkers(map, state, callbacks),
    state,
    terrainOperationalTerritoryCentres,
    false
  ) as Marker[];
  syncFormationMovementRouteOverlay(map, markers);
  syncBattleEventOverlay(map, deriveStrategicEventCues(state), terrainOperationalTerritoryCentres);
  return markers;
}

export function reconcileTerrainOperationalMarkers(
  map: Map,
  previous: readonly Marker[],
  state: GameState,
  callbacks: MarkerCallbacks
): Marker[] {
  const markers = applyMovingFormationMarkers(
    reconcileCoreTerrainOperationalMarkers(map, previous, state, callbacks),
    state,
    terrainOperationalTerritoryCentres,
    true
  ) as Marker[];
  syncFormationMovementRouteOverlay(map, markers);
  syncBattleEventOverlay(map, deriveStrategicEventCues(state), terrainOperationalTerritoryCentres);
  return markers;
}

export function applyTerrainOperationalMarkerLayout(
  map: Map,
  markers: readonly Marker[],
  layers: TerrainOperationalLayers
) {
  withIndependentMovingFormationClusters(markers, () => {
    applyCoreTerrainOperationalMarkerLayout(map, markers, layers);
  });
  syncFormationMovementRouteOverlay(map, markers);
  setBattleEventOverlayVisible(map, layers.operations);
}
