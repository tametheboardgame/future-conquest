import { getEnemyContacts } from '../game/operational-clarity';
import { TERRITORY_RESOURCES, type TerritoryResourceState } from '../game/territory-resources';
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
  friendly_personnel: number;
  friendly_strength: number;
  friendly_readiness: number;
  force_quality: number;
  garrison_personnel: number;
  threat_estimated_min: number;
  threat_estimated_max: number;
  threat_confidence: string;
  supply_ratio: number;
  supply_condition: string;
  resistance: number;
  legitimacy: number;
  hub_level: number;
  resource_food: number;
  resource_industry: number;
  resource_energy: number;
  resource_transport: number;
  resource_medical: number;
  resource_militaryStores: number;
  stock_food: number;
  stock_industry: number;
  stock_energy: number;
  stock_transport: number;
  stock_medical: number;
  stock_militaryStores: number;
}

export interface TerrainFrontSegmentLike {
  id: string;
  fromTerritoryId: string;
  toTerritoryId: string;
}

type ResourceCarrierView = GameState & {
  territoryResources?: Record<string, TerritoryResourceState>;
};

interface FriendlyAggregate {
  personnel: number;
  maxPersonnel: number;
  moraleWeighted: number;
  supplyWeighted: number;
  functionalArmour: number;
  damagedArmour: number;
  garrisonPersonnel: number;
}

const finitePoint = (value: unknown): readonly [number, number] | undefined => {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [longitude, latitude] = value;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return undefined;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
  return [longitude, latitude] as const;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

const territoryCentres = (base: GeoJSONFeatureCollectionLike): Record<string, readonly [number, number]> => Object.fromEntries(
  base.features.flatMap(feature => {
    const territoryId = typeof feature.properties?.territory_id === 'string'
      ? feature.properties.territory_id
      : undefined;
    const centre = finitePoint(feature.properties?.centre);
    return territoryId && centre ? [[territoryId, centre]] : [];
  })
);

function friendlyAggregates(state: GameState): Map<string, FriendlyAggregate> {
  const byTerritory = new Map<string, FriendlyAggregate>();
  for (const group of Object.values(state.taskGroups)) {
    if (group.personnel <= 0) continue;
    const current = byTerritory.get(group.location) ?? {
      personnel: 0,
      maxPersonnel: 0,
      moraleWeighted: 0,
      supplyWeighted: 0,
      functionalArmour: 0,
      damagedArmour: 0,
      garrisonPersonnel: 0
    };
    current.personnel += group.personnel;
    current.maxPersonnel += group.maxPersonnel;
    current.moraleWeighted += group.morale * group.personnel;
    current.supplyWeighted += group.supply * group.personnel;
    current.functionalArmour += group.functionalArmour;
    current.damagedArmour += group.damagedArmour;
    if (group.status === 'garrison') current.garrisonPersonnel += group.personnel;
    byTerritory.set(group.location, current);
  }
  return byTerritory;
}

function friendlyMetrics(aggregate: FriendlyAggregate | undefined): {
  personnel: number;
  strength: number;
  readiness: number;
  quality: number;
  garrison: number;
} {
  if (!aggregate || aggregate.personnel <= 0) {
    return { personnel: 0, strength: -1, readiness: -1, quality: -1, garrison: 0 };
  }
  const morale = aggregate.moraleWeighted / aggregate.personnel;
  const supply = aggregate.supplyWeighted / aggregate.personnel;
  const totalArmour = aggregate.functionalArmour + aggregate.damagedArmour;
  const armourAvailability = totalArmour > 0 ? aggregate.functionalArmour / totalArmour * 100 : morale;
  return {
    personnel: aggregate.personnel,
    strength: aggregate.maxPersonnel > 0 ? clampPercent(aggregate.personnel / aggregate.maxPersonnel * 100) : 100,
    readiness: clampPercent((morale + supply) / 2),
    quality: clampPercent((morale + armourAvailability) / 2),
    garrison: aggregate.garrisonPersonnel
  };
}

/**
 * Project authoritative campaign state onto the existing WGS84 political
 * geometry. This adapter is presentation-only: it copies features and annotates
 * them for MapLibre styling without changing game state or geographic geometry.
 * Enemy strength is sourced only from the existing player-visible contact helper.
 */
export function buildTerrainPoliticalGeoJSON(
  base: GeoJSONFeatureCollectionLike,
  state: GameState,
  context: TerrainPoliticalOverlayContext = {}
): GeoJSONFeatureCollectionLike {
  const threatByTerritory = new Map(
    (context.threatenedTerritories ?? []).map(threat => [threat.territoryId, threat.stage] as const)
  );
  const activeCombatTerritories = new Set(context.activeCombatTerritoryIds ?? []);
  const friendlyByTerritory = friendlyAggregates(state);
  const contactByTerritory = new Map(getEnemyContacts(state).map(contact => [contact.territoryId, contact] as const));
  const resourceState = (state as ResourceCarrierView).territoryResources ?? {};

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
      const friendly = friendlyMetrics(friendlyByTerritory.get(territoryId));
      const contact = contactByTerritory.get(territoryId);
      const allocation = territory.controller === 'player' ? state.logistics.territoryAllocations[territoryId] : undefined;
      const resource = TERRITORY_RESOURCES[territoryId];
      const stock = resourceState[territoryId];

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
        recent_combat: threatStage === 'recent-combat',
        friendly_personnel: friendly.personnel,
        friendly_strength: friendly.strength,
        friendly_readiness: friendly.readiness,
        force_quality: friendly.quality,
        garrison_personnel: friendly.garrison,
        threat_estimated_min: contact?.estimatedMin ?? 0,
        threat_estimated_max: contact?.estimatedMax ?? 0,
        threat_confidence: contact?.confidence ?? 'none',
        supply_ratio: allocation?.ratio ?? (territory.controller === 'player' ? (territory.supplied ? 100 : 0) : -1),
        supply_condition: allocation?.condition ?? (territory.supplied ? 'sustained' : 'cut-off'),
        resistance: territory.resistance,
        legitimacy: territory.legitimacy,
        hub_level: stock?.hubLevel ?? 0,
        resource_food: resource?.food ?? 1,
        resource_industry: resource?.industry ?? 1,
        resource_energy: resource?.energy ?? 1,
        resource_transport: resource?.transport ?? 1,
        resource_medical: resource?.medical ?? 1,
        resource_militaryStores: resource?.militaryStores ?? 1,
        stock_food: stock?.stocks.food ?? -1,
        stock_industry: stock?.stocks.industry ?? -1,
        stock_energy: stock?.stocks.energy ?? -1,
        stock_transport: stock?.stocks.transport ?? -1,
        stock_medical: stock?.stocks.medical ?? -1,
        stock_militaryStores: stock?.stocks.militaryStores ?? -1
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
          route_condition: routeState?.condition ?? 100,
          bottleneck: bottleneckRouteIds.has(route.id),
          selected_supply_path: selectedRouteIds.has(route.id),
          supply_condition: flow?.condition ?? 'idle',
          flow_condition: flow?.condition ?? 'idle',
          flow_utilisation: flow?.utilisation ?? 0,
          flow_used: flow?.used ?? 0,
          flow_capacity: flow?.capacity ?? 0
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
  state: GameState
): GeoJSONFeatureCollectionLike {
  const resourceState = (state as ResourceCarrierView).territoryResources ?? {};
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
          controller: territory.controller,
          hub_level: resourceState[node.territoryId]?.hubLevel ?? 0
        },
        geometry: {
          type: 'Point',
          coordinates: node.position
        }
      }];
    })
  };
}
