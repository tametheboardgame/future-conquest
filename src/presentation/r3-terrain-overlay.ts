import type {
  GameState,
  StrategicNodeDefinition,
  StrategicRouteDefinition
} from '../game/types';

interface GeoJSONFeatureLike {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry: unknown;
}

interface GeoJSONFeatureCollectionLike {
  type: 'FeatureCollection';
  features: GeoJSONFeatureLike[];
}

export type TerrainThreatStage = 'preparing' | 'imminent' | 'under-attack' | 'recent-combat';

export interface TerrainPoliticalOverlayContext {
  threatenedTerritories?: readonly { territoryId: string; stage: TerrainThreatStage }[];
  activeCombatTerritoryIds?: readonly string[];
}

export interface TerrainPoliticalFeatureProperties extends Record<string, unknown> {
  territory_id: string;
  controller: 'player' | 'enemy';
  supplied: boolean;
  occupation: string;
  selected: boolean;
  targeted: boolean;
  threat_stage: TerrainThreatStage | 'none';
  active_combat: boolean;
  recent_combat: boolean;
}

export interface TerrainFrontSegmentLike {
  id: string;
  fromTerritoryId: string;
  toTerritoryId: string;
}

const finitePoint = (value: unknown): readonly [number, number] | undefined => {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [longitude, latitude] = value;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return undefined;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
  return [longitude, latitude] as const;
};

const territoryCentres = (base: GeoJSONFeatureCollectionLike): Record<string, readonly [number, number]> => Object.fromEntries(
  base.features.flatMap(feature => {
    const territoryId = typeof feature.properties?.territory_id === 'string'
      ? feature.properties.territory_id
      : undefined;
    const centre = finitePoint(feature.properties?.centre);
    return territoryId && centre ? [[territoryId, centre]] : [];
  })
);

/**
 * Project authoritative campaign state onto the existing WGS84 political
 * geometry. This adapter is presentation-only: it copies features and annotates
 * them for MapLibre styling without changing game state or geographic geometry.
 * Threat state must be supplied by the existing player-visible operational
 * clarity helper rather than derived from hidden enemy formation strength.
 */
export function buildTerrainPoliticalGeoJSON(
  base: GeoJSONFeatureCollectionLike,
  state: Pick<GameState, 'territories' | 'selectedTerritory' | 'targetTerritory'>,
  context: TerrainPoliticalOverlayContext = {}
): GeoJSONFeatureCollectionLike {
  const threatByTerritory = new Map(
    (context.threatenedTerritories ?? []).map(threat => [threat.territoryId, threat.stage] as const)
  );
  const activeCombatTerritories = new Set(context.activeCombatTerritoryIds ?? []);

  return {
    type: 'FeatureCollection',
    features: base.features.flatMap(feature => {
      const territoryId = typeof feature.properties?.territory_id === 'string'
        ? feature.properties.territory_id
        : undefined;
      if (!territoryId) return [];
      const territory = state.territories[territoryId];
      if (!territory) return [];
      const threatStage = threatByTerritory.get(territoryId) ?? 'none';

      const properties: TerrainPoliticalFeatureProperties = {
        ...(feature.properties ?? {}),
        territory_id: territoryId,
        controller: territory.controller,
        supplied: territory.supplied,
        occupation: territory.occupation,
        selected: state.selectedTerritory === territoryId,
        targeted: state.targetTerritory === territoryId,
        threat_stage: threatStage,
        active_combat: activeCombatTerritories.has(territoryId),
        recent_combat: threatStage === 'recent-combat'
      };

      return [{
        ...feature,
        properties
      }];
    })
  };
}

/**
 * Convert the already-derived opposing-control adjacency segments used by the
 * SVG map into short WGS84 front marks. The marks remain presentation-only and
 * never replace administrative borders or become route/pathfinding geometry.
 */
export function buildTerrainFrontGeoJSON(
  base: GeoJSONFeatureCollectionLike,
  segments: readonly TerrainFrontSegmentLike[]
): GeoJSONFeatureCollectionLike {
  const centres = territoryCentres(base);
  return {
    type: 'FeatureCollection',
    features: segments.flatMap(segment => {
      const from = centres[segment.fromTerritoryId];
      const to = centres[segment.toTerritoryId];
      if (!from || !to) return [];
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const distance = Math.hypot(dx, dy);
      if (!Number.isFinite(distance) || distance <= 0) return [];
      const midpoint: readonly [number, number] = [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2
      ];
      const halfLength = Math.min(0.24, Math.max(0.08, distance * 0.12));
      const perpendicular: readonly [number, number] = [-dy / distance, dx / distance];
      const start: readonly [number, number] = [
        midpoint[0] - perpendicular[0] * halfLength,
        midpoint[1] - perpendicular[1] * halfLength
      ];
      const end: readonly [number, number] = [
        midpoint[0] + perpendicular[0] * halfLength,
        midpoint[1] + perpendicular[1] * halfLength
      ];
      return [{
        type: 'Feature' as const,
        properties: {
          front_id: segment.id,
          from_territory_id: segment.fromTerritoryId,
          to_territory_id: segment.toTerritoryId
        },
        geometry: {
          type: 'LineString',
          coordinates: [start, end]
        }
      }];
    })
  };
}

/** Build the static strategic network geometry with only player-visible route state attached. */
export function buildTerrainStrategicRouteGeoJSON(
  nodes: readonly StrategicNodeDefinition[],
  routes: readonly StrategicRouteDefinition[],
  state: Pick<GameState, 'routeStates' | 'logistics' | 'selectedTaskGroupId'>
): GeoJSONFeatureCollectionLike {
  const nodeById = new Map(nodes.map(node => [node.id, node] as const));
  const selectedRouteIds = new Set(
    state.logistics.formationAllocations[state.selectedTaskGroupId]?.path.routeIds ?? []
  );
  const bottleneckRouteIds = new Set(state.logistics.bottleneckRouteIds);

  return {
    type: 'FeatureCollection',
    features: routes.flatMap(route => {
      const from = nodeById.get(route.fromNodeId);
      const to = nodeById.get(route.toNodeId);
      if (!from || !to) return [];
      const routeState = state.routeStates[route.id];
      const flow = state.logistics.routeFlows[route.id];
      return [{
        type: 'Feature' as const,
        properties: {
          route_id: route.id,
          name: route.name,
          route_type: route.type,
          status: routeState?.status ?? 'open',
          bottleneck: bottleneckRouteIds.has(route.id),
          selected_supply_path: selectedRouteIds.has(route.id),
          supply_condition: flow?.condition ?? 'idle'
        },
        geometry: {
          type: 'LineString',
          coordinates: [from.position, to.position]
        }
      }];
    })
  };
}

/** Project strategic nodes without revealing any hidden enemy formation detail. */
export function buildTerrainStrategicNodeGeoJSON(
  nodes: readonly StrategicNodeDefinition[],
  state: Pick<GameState, 'territories'>
): GeoJSONFeatureCollectionLike {
  return {
    type: 'FeatureCollection',
    features: nodes.flatMap(node => {
      const territory = state.territories[node.territoryId];
      if (!territory) return [];
      return [{
        type: 'Feature' as const,
        properties: {
          node_id: node.id,
          territory_id: node.territoryId,
          name: node.name,
          node_type: node.type,
          importance: node.importance,
          controller: territory.controller
        },
        geometry: {
          type: 'Point',
          coordinates: node.position
        }
      }];
    })
  };
}
