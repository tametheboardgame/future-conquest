import type { Map, Marker } from 'maplibre-gl';
import type { GameState } from '../game/types';
import {
  applyMovingFormationMarkers,
  withIndependentMovingFormationClusters
} from './r3-formation-marker-presentation';
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
  return applyMovingFormationMarkers(
    buildCoreTerrainOperationalMarkers(map, state, callbacks),
    state,
    terrainOperationalTerritoryCentres,
    false
  ) as Marker[];
}

export function reconcileTerrainOperationalMarkers(
  map: Map,
  previous: readonly Marker[],
  state: GameState,
  callbacks: MarkerCallbacks
): Marker[] {
  return applyMovingFormationMarkers(
    reconcileCoreTerrainOperationalMarkers(map, previous, state, callbacks),
    state,
    terrainOperationalTerritoryCentres,
    true
  ) as Marker[];
}

export function applyTerrainOperationalMarkerLayout(
  map: Map,
  markers: readonly Marker[],
  layers: TerrainOperationalLayers
) {
  withIndependentMovingFormationClusters(markers, () => {
    applyCoreTerrainOperationalMarkerLayout(map, markers, layers);
  });
}
