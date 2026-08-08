import { STRATEGIC_ROUTE_BY_ID } from './strategic-network-data';
import { routeEffectiveCapacity, routesBetween } from './strategic-network';
import type {
  StrategicRouteDefinition,
  StrategicRouteState,
  TaskGroup,
  TaskGroupOrder
} from './types';

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

type RouteStateMap = Record<string, StrategicRouteState>;

export function routeConnectsTerritories(
  route: StrategicRouteDefinition,
  firstTerritoryId: string,
  secondTerritoryId: string
): boolean {
  return (
    route.fromTerritoryId === firstTerritoryId && route.toTerritoryId === secondTerritoryId
  ) || (
    route.fromTerritoryId === secondTerritoryId && route.toTerritoryId === firstTerritoryId
  );
}

export function routeIsTraversable(
  route: StrategicRouteDefinition,
  routeState: StrategicRouteState | undefined
): boolean {
  return Boolean(
    routeState
    && (routeState.status === 'open' || routeState.status === 'damaged')
    && routeState.condition > 0
    && routeEffectiveCapacity(route, routeState) > 0
  );
}

export function availableRoutesBetween(
  routeStates: RouteStateMap,
  firstTerritoryId: string,
  secondTerritoryId: string
): StrategicRouteDefinition[] {
  return routesBetween(firstTerritoryId, secondTerritoryId)
    .filter(route => routeIsTraversable(route, routeStates[route.id]));
}

export function movementProgressForDay(
  route: StrategicRouteDefinition,
  routeState: StrategicRouteState | undefined,
  group: Pick<TaskGroup, 'functionalArmour' | 'supply'>
): number {
  if (!routeIsTraversable(route, routeState)) return 0;

  const conditionFactor = clamp(0.38 + (routeState!.condition / 100) * 0.62, 0.38, 1);
  const capacityFactor = clamp(0.45 + routeState!.capacityModifier * 0.55, 0.45, 1);
  const statusFactor = routeState!.status === 'damaged' ? 0.82 : 1;
  const supplyFactor = group.supply < 40 ? 0.65 : group.supply < 70 ? 0.85 : 1;
  const heavyEquipmentFactor = !route.heavyArmour && group.functionalArmour > 0 ? 0.78 : 1;
  const upgradeFactor = 1 + (routeState!.upgradeLevel ?? 0) * 0.08;
  const baseProgress = 100 / Math.max(1, route.movementDays);

  return Math.max(3, Math.round(
    baseProgress
    * conditionFactor
    * capacityFactor
    * statusFactor
    * supplyFactor
    * heavyEquipmentFactor
    * upgradeFactor
  ));
}

export function estimateRouteMovementDays(
  route: StrategicRouteDefinition,
  routeState: StrategicRouteState | undefined,
  group: Pick<TaskGroup, 'functionalArmour' | 'supply'>
): number {
  const progress = movementProgressForDay(route, routeState, group);
  return progress > 0 ? Math.ceil(100 / progress) : Number.POSITIVE_INFINITY;
}

export function recommendRoute(
  routeStates: RouteStateMap,
  firstTerritoryId: string,
  secondTerritoryId: string,
  group: Pick<TaskGroup, 'functionalArmour' | 'supply'>
): StrategicRouteDefinition | undefined {
  return availableRoutesBetween(routeStates, firstTerritoryId, secondTerritoryId)
    .sort((first, second) => {
      const firstDays = estimateRouteMovementDays(first, routeStates[first.id], group);
      const secondDays = estimateRouteMovementDays(second, routeStates[second.id], group);
      return firstDays - secondDays
        || routeEffectiveCapacity(second, routeStates[second.id]) - routeEffectiveCapacity(first, routeStates[first.id])
        || first.name.localeCompare(second.name);
    })[0];
}

export function chooseOperationalRoute(
  routeStates: RouteStateMap,
  firstTerritoryId: string,
  secondTerritoryId: string,
  group: Pick<TaskGroup, 'functionalArmour' | 'supply'>,
  requestedRouteId?: string
): StrategicRouteDefinition | undefined {
  const requested = requestedRouteId ? STRATEGIC_ROUTE_BY_ID[requestedRouteId] : undefined;
  if (
    requested
    && routeConnectsTerritories(requested, firstTerritoryId, secondTerritoryId)
    && routeIsTraversable(requested, routeStates[requested.id])
  ) return requested;

  return recommendRoute(routeStates, firstTerritoryId, secondTerritoryId, group);
}

export function normaliseTaskGroupOrderRoutes(
  taskGroups: Record<string, TaskGroup>,
  routeStates: RouteStateMap,
  preserveExistingSelection: boolean
): Record<string, TaskGroup> {
  const normalised = structuredClone(taskGroups);

  for (const group of Object.values(normalised)) {
    const order = group.order;
    if (!order) continue;

    const existing = order.routeId ? STRATEGIC_ROUTE_BY_ID[order.routeId] : undefined;
    const existingConnects = Boolean(existing && routeConnectsTerritories(existing, group.location, order.target));
    if (existingConnects && (preserveExistingSelection || routeIsTraversable(existing!, routeStates[existing!.id]))) continue;

    const recommended = recommendRoute(routeStates, group.location, order.target, group);
    const replacement: TaskGroupOrder = { ...order };
    if (recommended) replacement.routeId = recommended.id;
    else delete replacement.routeId;
    group.order = replacement;
  }

  return normalised;
}
