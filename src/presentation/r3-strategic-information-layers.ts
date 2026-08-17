import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  Map
} from 'maplibre-gl';
import { getEnemyContacts } from '../game/operational-clarity';
import { TERRITORY_RESOURCES, type TerritoryResourceState } from '../game/territory-resources';
import type { GameState } from '../game/types';

export type R3StrategicOverlay =
  | 'control'
  | 'strength'
  | 'readiness'
  | 'threat'
  | 'supply'
  | 'routes'
  | 'resources'
  | 'stockpiles'
  | 'occupation'
  | 'quality';

export type R3ResourceMetric = 'food' | 'industry' | 'energy' | 'transport' | 'medical' | 'militaryStores';

export const R3_STRATEGIC_OVERLAY_OPTIONS: ReadonlyArray<{ id: R3StrategicOverlay; label: string }> = [
  { id: 'control', label: 'Political control' },
  { id: 'strength', label: 'Friendly strength' },
  { id: 'readiness', label: 'Friendly readiness' },
  { id: 'threat', label: 'Assessed enemy threat' },
  { id: 'supply', label: 'Supply and network flow' },
  { id: 'routes', label: 'Route condition' },
  { id: 'resources', label: 'Resource potential' },
  { id: 'stockpiles', label: 'Local stockpiles' },
  { id: 'occupation', label: 'Occupation pressure' },
  { id: 'quality', label: 'Force quality' }
];

export const R3_RESOURCE_METRIC_OPTIONS: ReadonlyArray<{ id: R3ResourceMetric; label: string }> = [
  { id: 'food', label: 'Food' },
  { id: 'industry', label: 'Industry' },
  { id: 'energy', label: 'Energy' },
  { id: 'transport', label: 'Transport' },
  { id: 'medical', label: 'Medical' },
  { id: 'militaryStores', label: 'Military stores' }
];

interface GeoJSONFeatureLike {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry: unknown;
}

interface GeoJSONFeatureCollectionLike {
  type: 'FeatureCollection';
  features: GeoJSONFeatureLike[];
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

const TERRITORY_LAYER_ID = 'r3-wp5-strategic-territory-overlay';
const ROUTE_LAYER_ID = 'r3-wp5-strategic-route-overlay';
const HUB_LAYER_ID = 'r3-wp5-strategic-hub-overlay';
const transparent = 'rgba(0,0,0,0)';

type PaintExpression = unknown;

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

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

/** Add WP5 strategic metrics to already-projected political geometry without mutating game state. */
export function enrichR3StrategicPoliticalGeoJSON(
  base: GeoJSONFeatureCollectionLike,
  state: GameState
): GeoJSONFeatureCollectionLike {
  const friendlyByTerritory = friendlyAggregates(state);
  const contactByTerritory = new Map(getEnemyContacts(state).map(contact => [contact.territoryId, contact] as const));
  const resourceState = (state as ResourceCarrierView).territoryResources ?? {};

  return {
    type: 'FeatureCollection',
    features: base.features.map(feature => {
      const territoryId = typeof feature.properties?.territory_id === 'string'
        ? feature.properties.territory_id
        : undefined;
      if (!territoryId) return feature;
      const territory = state.territories[territoryId];
      if (!territory) return feature;
      const friendly = friendlyMetrics(friendlyByTerritory.get(territoryId));
      const contact = contactByTerritory.get(territoryId);
      const allocation = territory.controller === 'player' ? state.logistics.territoryAllocations[territoryId] : undefined;
      const resource = TERRITORY_RESOURCES[territoryId];
      const stock = resourceState[territoryId];

      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
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
        }
      };
    })
  };
}

/** Add resource-hub state to the existing strategic node source. */
export function enrichR3StrategicNodeGeoJSON(
  base: GeoJSONFeatureCollectionLike,
  state: GameState
): GeoJSONFeatureCollectionLike {
  const resourceState = (state as ResourceCarrierView).territoryResources ?? {};
  return {
    type: 'FeatureCollection',
    features: base.features.map(feature => {
      const territoryId = typeof feature.properties?.territory_id === 'string'
        ? feature.properties.territory_id
        : undefined;
      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          hub_level: territoryId ? resourceState[territoryId]?.hubLevel ?? 0 : 0
        }
      };
    })
  };
}

const territoryPaint = (overlay: R3StrategicOverlay, resource: R3ResourceMetric): {
  colour: PaintExpression;
  opacity: PaintExpression;
} => {
  if (overlay === 'control') {
    return {
      colour: ['case', ['==', ['get', 'controller'], 'player'], '#2db8a4', '#7c6669'],
      opacity: 0.24
    };
  }

  if (overlay === 'strength') {
    return {
      colour: ['case',
        ['<', ['get', 'friendly_strength'], 0], transparent,
        ['interpolate', ['linear'], ['get', 'friendly_strength'], 0, '#8d3f42', 45, '#c7774c', 70, '#d4c765', 100, '#55b982']
      ],
      opacity: ['case', ['<', ['get', 'friendly_strength'], 0], 0, 0.34]
    };
  }

  if (overlay === 'readiness') {
    return {
      colour: ['case',
        ['<', ['get', 'friendly_readiness'], 0], transparent,
        ['interpolate', ['linear'], ['get', 'friendly_readiness'], 0, '#7d3439', 40, '#bd5d47', 65, '#d1b65e', 85, '#62b677', 100, '#3db994']
      ],
      opacity: ['case', ['<', ['get', 'friendly_readiness'], 0], 0, 0.34]
    };
  }

  if (overlay === 'threat') {
    return {
      colour: ['case',
        ['<=', ['get', 'threat_estimated_max'], 0], transparent,
        ['interpolate', ['linear'], ['get', 'threat_estimated_max'], 500, '#d5c36d', 3000, '#d98b4f', 8000, '#c95145', 18000, '#8e2f38']
      ],
      opacity: ['case',
        ['<=', ['get', 'threat_estimated_max'], 0], 0,
        ['==', ['get', 'threat_confidence'], 'confirmed'], 0.42,
        ['==', ['get', 'threat_confidence'], 'estimated'], 0.34,
        ['==', ['get', 'threat_confidence'], 'stale'], 0.20,
        0.25
      ]
    };
  }

  if (overlay === 'supply') {
    return {
      colour: ['case',
        ['<', ['get', 'supply_ratio'], 0], transparent,
        ['interpolate', ['linear'], ['get', 'supply_ratio'], 0, '#7e343b', 40, '#bd5648', 70, '#d2b75f', 90, '#72b873', 100, '#3eb491']
      ],
      opacity: ['case', ['<', ['get', 'supply_ratio'], 0], 0, 0.32]
    };
  }

  if (overlay === 'resources') {
    const property = `resource_${resource}`;
    return {
      colour: ['interpolate', ['linear'], ['get', property], 1, '#514d46', 2, '#6e7455', 3, '#87965c', 4, '#a4b967', 5, '#c9d87a'],
      opacity: 0.34
    };
  }

  if (overlay === 'stockpiles') {
    const property = `stock_${resource}`;
    return {
      colour: ['case',
        ['<', ['get', property], 0], transparent,
        ['interpolate', ['linear'], ['get', property], 0, '#7c343b', 25, '#b05246', 60, '#c99656', 110, '#9ab66a', 180, '#54ad80', 250, '#37a995']
      ],
      opacity: ['case', ['<', ['get', property], 0], 0, 0.34]
    };
  }

  if (overlay === 'occupation') {
    return {
      colour: ['case',
        ['==', ['get', 'controller'], 'enemy'], transparent,
        ['interpolate', ['linear'], ['get', 'resistance'], 0, '#4ca67d', 25, '#91ac65', 50, '#d0b55c', 75, '#ca704a', 100, '#9a3940']
      ],
      opacity: ['case', ['==', ['get', 'controller'], 'enemy'], 0, 0.35]
    };
  }

  if (overlay === 'quality') {
    return {
      colour: ['case',
        ['<', ['get', 'force_quality'], 0], transparent,
        ['interpolate', ['linear'], ['get', 'force_quality'], 0, '#74353e', 40, '#b75b49', 65, '#c7a75b', 80, '#76ad6b', 100, '#42ab8f']
      ],
      opacity: ['case', ['<', ['get', 'force_quality'], 0], 0, 0.34]
    };
  }

  return { colour: transparent, opacity: 0 };
};

function ensureStrategicLayers(map: Map): boolean {
  if (!map.getSource('campaign-territories')) return false;

  if (!map.getLayer(TERRITORY_LAYER_ID)) {
    const layer: FillLayerSpecification = {
      id: TERRITORY_LAYER_ID,
      type: 'fill',
      source: 'campaign-territories',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': transparent,
        'fill-opacity': 0
      }
    };
    const before = map.getLayer('campaign-territory-state-wash') ? 'campaign-territory-state-wash' : undefined;
    map.addLayer(layer, before);
  }

  if (map.getSource('campaign-strategic-routes') && !map.getLayer(ROUTE_LAYER_ID)) {
    const layer: LineLayerSpecification = {
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: 'campaign-strategic-routes',
      minzoom: 4.2,
      layout: { visibility: 'none', 'line-cap': 'round' },
      paint: {
        'line-color': '#8ffff1',
        'line-opacity': 0,
        'line-width': 1
      }
    };
    map.addLayer(layer);
  }

  if (map.getSource('campaign-strategic-nodes') && !map.getLayer(HUB_LAYER_ID)) {
    const layer: CircleLayerSpecification = {
      id: HUB_LAYER_ID,
      type: 'circle',
      source: 'campaign-strategic-nodes',
      minzoom: 4.2,
      filter: ['>', ['get', 'hub_level'], 0],
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'hub_level'], 1, 4, 3, 8],
        'circle-color': '#8ffff1',
        'circle-stroke-color': '#132d35',
        'circle-stroke-width': 1.4,
        'circle-opacity': 0.92
      }
    };
    map.addLayer(layer);
  }

  return true;
}

export function applyR3StrategicInformationOverlay(
  map: Map,
  overlay: R3StrategicOverlay,
  resource: R3ResourceMetric
): boolean {
  if (!map.isStyleLoaded() || !ensureStrategicLayers(map)) return false;
  const paint = territoryPaint(overlay, resource);
  map.setLayoutProperty(TERRITORY_LAYER_ID, 'visibility', overlay === 'routes' ? 'none' : 'visible');
  map.setPaintProperty(TERRITORY_LAYER_ID, 'fill-color', paint.colour);
  map.setPaintProperty(TERRITORY_LAYER_ID, 'fill-opacity', paint.opacity);

  const showRoutes = overlay === 'routes' || overlay === 'supply';
  if (map.getLayer(ROUTE_LAYER_ID)) {
    map.setLayoutProperty(ROUTE_LAYER_ID, 'visibility', showRoutes ? 'visible' : 'none');
    if (overlay === 'supply') {
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-color', [
        'case',
        ['==', ['get', 'flow_condition'], 'overloaded'], '#df5a4e',
        ['==', ['get', 'flow_condition'], 'strained'], '#e1a458',
        ['==', ['get', 'flow_condition'], 'active'], '#70c8a0',
        '#76817b'
      ]);
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-opacity', ['case', ['<=', ['get', 'flow_used'], 0], 0.12, 0.82]);
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-width', ['interpolate', ['linear'], ['get', 'flow_utilisation'], 0, 1.1, 50, 2.0, 85, 3.0, 100, 4.0]);
    } else {
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-color', [
        'case',
        ['==', ['get', 'status'], 'destroyed'], '#6e2c34',
        ['==', ['get', 'status'], 'blocked'], '#a33f43',
        ['==', ['get', 'status'], 'damaged'], '#c68b50',
        ['interpolate', ['linear'], ['get', 'route_condition'], 0, '#a33f43', 50, '#c7a05a', 80, '#7db678', 100, '#57b99a']
      ]);
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-opacity', 0.82);
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-width', ['case', ['boolean', ['get', 'bottleneck'], false], 3.2, 2.1]);
    }
  }

  const showHubs = overlay === 'supply' || overlay === 'resources' || overlay === 'stockpiles';
  if (map.getLayer(HUB_LAYER_ID)) {
    map.setLayoutProperty(HUB_LAYER_ID, 'visibility', showHubs ? 'visible' : 'none');
  }
  return true;
}

export function r3StrategicOverlayLegend(
  overlay: R3StrategicOverlay,
  resource: R3ResourceMetric
): { title: string; detail: string } {
  const resourceLabel = R3_RESOURCE_METRIC_OPTIONS.find(option => option.id === resource)?.label ?? resource;
  const legends: Record<R3StrategicOverlay, { title: string; detail: string }> = {
    control: { title: 'Political control', detail: 'Teal: player control · muted red: enemy control.' },
    strength: { title: 'Friendly strength', detail: 'Formation personnel remaining as a share of authorised strength. Empty territory remains clear.' },
    readiness: { title: 'Friendly readiness', detail: 'Personnel-weighted morale and carried supply. Red is depleted; green is ready.' },
    threat: { title: 'Assessed enemy threat', detail: 'Uses player-visible contact estimates only. Darker red means a larger assessed upper range; opacity reflects confidence.' },
    supply: { title: 'Supply and network flow', detail: 'Territory delivery ratio plus route utilisation. Thick red/orange routes are strained or overloaded.' },
    routes: { title: 'Route condition', detail: 'Healthy routes trend green; damaged, blocked and destroyed links trend amber/red. Bottlenecks are thicker.' },
    resources: { title: `${resourceLabel} potential`, detail: 'Relative local campaign resource rating from 1 to 5. Logistics hubs remain marked.' },
    stockpiles: { title: `${resourceLabel} stockpiles`, detail: 'Current local stock level. Territories without an established stock record remain clear.' },
    occupation: { title: 'Occupation pressure', detail: 'Controlled territory is shaded by current resistance. Enemy-held territory remains clear.' },
    quality: { title: 'Force quality', detail: 'Personnel-weighted morale and functional-armour availability for friendly formations.' }
  };
  return legends[overlay];
}
