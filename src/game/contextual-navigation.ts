import { TERRITORIES } from './data';
import { STRATEGIC_ROUTE_BY_ID } from './strategic-network-data';
import type { GameState } from './types';

export type ContextualTarget =
  | { kind: 'route'; id: string; reason: string }
  | { kind: 'formation'; id: string; reason: string }
  | { kind: 'territory'; id: string; reason: string; section?: 'defence' | 'logistics' | 'intelligence' }
  | { kind: 'operation'; id: string; reason: string }
  | { kind: 'logistics'; reason: string }
  | { kind: 'infrastructure'; reason: string };

export interface ResolvedContextualTarget {
  target: ContextualTarget;
  valid: boolean;
  message: string;
}

/** Validation is deliberately pure: following a link cannot run an engine mutator. */
export function resolveContextualTarget(state: GameState, target: ContextualTarget): ResolvedContextualTarget {
  if (target.kind === 'route') {
    const route = STRATEGIC_ROUTE_BY_ID[target.id];
    return route
      ? { target, valid: true, message: `${target.reason} · Route: ${route.name}` }
      : { target: { kind: 'infrastructure', reason: target.reason }, valid: false, message: `${target.reason} · The referenced route is no longer available. Infrastructure overview opened instead.` };
  }
  if (target.kind === 'formation') {
    const group = state.taskGroups[target.id];
    return group
      ? { target, valid: true, message: `${target.reason} · Formation: ${group.name}` }
      : { target: { kind: 'logistics', reason: target.reason }, valid: false, message: `${target.reason} · The referenced formation is no longer available. Logistics overview opened instead.` };
  }
  if (target.kind === 'territory') {
    return TERRITORIES[target.id] && state.territories[target.id]
      ? { target, valid: true, message: `${target.reason} · Territory: ${TERRITORIES[target.id].centre}` }
      : { target: { kind: 'logistics', reason: target.reason }, valid: false, message: `${target.reason} · The referenced territory is no longer available. Logistics overview opened instead.` };
  }
  if (target.kind === 'operation') {
    const operation = state.operations[target.id];
    return operation
      ? { target, valid: true, message: `${target.reason} · Operation: ${TERRITORIES[operation.target]?.centre ?? operation.id}` }
      : { target: { kind: 'logistics', reason: target.reason }, valid: false, message: `${target.reason} · The referenced operation has ended. Operations overview opened instead.` };
  }
  return { target, valid: true, message: target.reason };
}

/** Removes the two selection fields which navigation is explicitly allowed to change. */
export function campaignSimulationSnapshot(state: GameState): string {
  const { selectedTaskGroupId: _group, selectedTerritory: _territory, targetTerritory: _target, ...simulation } = state;
  return JSON.stringify(simulation);
}
