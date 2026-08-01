import { TERRITORIES } from './data';
import type { GameState } from './types';

export type OrderTargetKind = 'current' | 'move' | 'attack' | 'out-of-range' | 'unavailable';

export interface OrderTargetInfo {
  kind: OrderTargetKind;
  adjacent: boolean;
  territoryId: string;
}

export function getAdjacentOrderTargets(state: GameState, groupId = state.selectedTaskGroupId): string[] {
  const group = state.taskGroups[groupId];
  return group ? [...TERRITORIES[group.location].neighbours] : [];
}

export function getOrderTargetInfo(
  state: GameState,
  territoryId: string,
  groupId = state.selectedTaskGroupId
): OrderTargetInfo {
  const group = state.taskGroups[groupId];
  if (!group || !state.territories[territoryId]) {
    return { kind: 'unavailable', adjacent: false, territoryId };
  }
  if (territoryId === group.location) {
    return { kind: 'current', adjacent: false, territoryId };
  }
  const adjacent = TERRITORIES[group.location].neighbours.includes(territoryId);
  if (!adjacent) {
    return { kind: 'out-of-range', adjacent: false, territoryId };
  }
  return {
    kind: state.territories[territoryId].controller === 'enemy' ? 'attack' : 'move',
    adjacent: true,
    territoryId
  };
}
