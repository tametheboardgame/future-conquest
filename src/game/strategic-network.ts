import { STRATEGIC_NODES, STRATEGIC_ROUTES } from './strategic-network-data';
import type {
  StrategicNodeDefinition,
  StrategicRouteDefinition,
  StrategicRouteState,
  StrategicRouteStatus
} from './types';

const validStatuses = new Set<StrategicRouteStatus>(['open', 'damaged', 'blocked', 'destroyed']);
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export const NODE_TYPE_LABELS: Record<StrategicNodeDefinition['type'], string> = {
  capital: 'National capital',
  city: 'Major city',
  port: 'Port',
  airport: 'Airport or air hub',
  'rail-hub': 'Rail hub',
  crossing: 'Strategic crossing',
  logistics: 'Logistics hub'
};

export const ROUTE_TYPE_LABELS: Record<StrategicRouteDefinition['type'], string> = {
  road: 'Road corridor',
  rail: 'Rail corridor',
  ferry: 'Ferry route',
  tunnel: 'Tunnel',
  'mountain-pass': 'Mountain crossing',
  'river-crossing': 'Major river crossing'
};

export function createRouteStates(): Record<string, StrategicRouteState> {
  return Object.fromEntries(STRATEGIC_ROUTES.map(route => [route.id, {
    status: 'open' as const,
    condition: 100,
    capacityModifier: 1
  }]));
}

export function normaliseRouteStates(value: unknown): Record<string, StrategicRouteState> {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const defaults = createRouteStates();

  for (const route of STRATEGIC_ROUTES) {
    const candidate = source[route.id];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    const status = validStatuses.has(record.status as StrategicRouteStatus)
      ? record.status as StrategicRouteStatus
      : defaults[route.id].status;
    const condition = typeof record.condition === 'number' && Number.isFinite(record.condition)
      ? clamp(record.condition, 0, 100)
      : defaults[route.id].condition;
    const capacityModifier = typeof record.capacityModifier === 'number' && Number.isFinite(record.capacityModifier)
      ? clamp(record.capacityModifier, 0, 1)
      : defaults[route.id].capacityModifier;
    defaults[route.id] = { status, condition, capacityModifier };
  }

  return defaults;
}

export function nodesForTerritory(territoryId: string): StrategicNodeDefinition[] {
  return STRATEGIC_NODES
    .filter(node => node.territoryId === territoryId)
    .sort((first, second) => second.importance - first.importance || first.name.localeCompare(second.name));
}

export function routesForTerritory(territoryId: string): StrategicRouteDefinition[] {
  return STRATEGIC_ROUTES
    .filter(route => route.fromTerritoryId === territoryId || route.toTerritoryId === territoryId)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function routesBetween(firstTerritoryId: string, secondTerritoryId: string): StrategicRouteDefinition[] {
  return STRATEGIC_ROUTES.filter(route => (
    route.fromTerritoryId === firstTerritoryId && route.toTerritoryId === secondTerritoryId
  ) || (
    route.fromTerritoryId === secondTerritoryId && route.toTerritoryId === firstTerritoryId
  ));
}

export function routeEffectiveCapacity(
  route: StrategicRouteDefinition,
  state: StrategicRouteState | undefined
): number {
  if (!state || state.status === 'destroyed' || state.status === 'blocked') return 0;
  const damageFactor = state.status === 'damaged' ? 0.55 : 1;
  return Math.max(0, Math.round(route.capacity * state.capacityModifier * damageFactor * 10) / 10);
}

export function routeStatusLabel(state: StrategicRouteState | undefined): string {
  if (!state) return 'unavailable';
  return state.status;
}
