import { TERRITORIES } from './data';
import { routesBetween } from './strategic-network';
import { availableRoutesBetween, recommendRoute } from './route-movement';
import type { GameState } from './types';

export type OrderTargetKind = 'current' | 'move' | 'attack' | 'route-blocked' | 'out-of-range' | 'unavailable';

export interface OrderTargetInfo {
  kind: OrderTargetKind;
  adjacent: boolean;
  territoryId: string;
  routeIds: string[];
  availableRouteIds: string[];
  recommendedRouteId?: string;
}

const unavailableTarget = (territoryId: string): OrderTargetInfo => ({
  kind: 'unavailable',
  adjacent: false,
  territoryId,
  routeIds: [],
  availableRouteIds: []
});

export function getAdjacentOrderTargets(state: GameState, groupId = state.selectedTaskGroupId): string[] {
  const group = state.taskGroups[groupId];
  if (!group) return [];
  return TERRITORIES[group.location].neighbours.filter(territoryId => (
    availableRoutesBetween(state.routeStates, group.location, territoryId).length > 0
  ));
}

export function getOrderTargetInfo(
  state: GameState,
  territoryId: string,
  groupId = state.selectedTaskGroupId
): OrderTargetInfo {
  const group = state.taskGroups[groupId];
  if (!group || !state.territories[territoryId]) return unavailableTarget(territoryId);
  if (territoryId === group.location) {
    return {
      kind: 'current',
      adjacent: false,
      territoryId,
      routeIds: [],
      availableRouteIds: []
    };
  }

  const routes = routesBetween(group.location, territoryId);
  if (!routes.length) {
    return {
      kind: 'out-of-range',
      adjacent: false,
      territoryId,
      routeIds: [],
      availableRouteIds: []
    };
  }

  const available = availableRoutesBetween(state.routeStates, group.location, territoryId);
  const recommended = recommendRoute(state.routeStates, group.location, territoryId, group);
  if (!available.length) {
    return {
      kind: 'route-blocked',
      adjacent: true,
      territoryId,
      routeIds: routes.map(route => route.id),
      availableRouteIds: []
    };
  }

  return {
    kind: state.territories[territoryId].controller === 'enemy' ? 'attack' : 'move',
    adjacent: true,
    territoryId,
    routeIds: routes.map(route => route.id),
    availableRouteIds: available.map(route => route.id),
    recommendedRouteId: recommended?.id
  };
}
