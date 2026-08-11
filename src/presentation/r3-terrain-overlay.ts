import type { GameState } from '../game/types';

interface GeoJSONFeatureLike {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry: unknown;
}

interface GeoJSONFeatureCollectionLike {
  type: 'FeatureCollection';
  features: GeoJSONFeatureLike[];
}

export interface TerrainPoliticalFeatureProperties extends Record<string, unknown> {
  territory_id: string;
  controller: 'player' | 'enemy';
  supplied: boolean;
  occupation: string;
  selected: boolean;
  targeted: boolean;
}

/**
 * Project authoritative campaign state onto the existing WGS84 political
 * geometry. This adapter is presentation-only: it copies features and annotates
 * them for MapLibre styling without changing game state or geographic geometry.
 */
export function buildTerrainPoliticalGeoJSON(
  base: GeoJSONFeatureCollectionLike,
  state: Pick<GameState, 'territories' | 'selectedTerritory' | 'targetTerritory'>
): GeoJSONFeatureCollectionLike {
  return {
    type: 'FeatureCollection',
    features: base.features.flatMap(feature => {
      const territoryId = typeof feature.properties?.territory_id === 'string'
        ? feature.properties.territory_id
        : undefined;
      if (!territoryId) return [];
      const territory = state.territories[territoryId];
      if (!territory) return [];

      const properties: TerrainPoliticalFeatureProperties = {
        ...(feature.properties ?? {}),
        territory_id: territoryId,
        controller: territory.controller,
        supplied: territory.supplied,
        occupation: territory.occupation,
        selected: state.selectedTerritory === territoryId,
        targeted: state.targetTerritory === territoryId
      };

      return [{
        ...feature,
        properties
      }];
    })
  };
}
