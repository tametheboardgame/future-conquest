import type { GameState } from '../game/types';

export interface ActiveAttackCue {
  readonly id: string;
  readonly kind: 'active-attack';
  readonly operationId: string;
  readonly groupId: string;
  readonly originTerritoryId: string;
  readonly targetTerritoryId: string;
  readonly progress: number;
  readonly active: true;
}

const clampProgress = (progress: number) => Math.max(0, Math.min(100, progress));

// Presentation only: operation origins are captured by the engine when a group
// commits. In particular, do not substitute its later marker position or inspect
// enemy formations/orders to manufacture a direction.
export function deriveActiveAttackCues(
  state: Pick<GameState, 'operations'>
): readonly ActiveAttackCue[] {
  return Object.values(state.operations)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap(operation => [...operation.participantGroupIds]
      .sort((a, b) => a.localeCompare(b))
      .flatMap(groupId => {
        const originTerritoryId = operation.origins[groupId];
        if (!originTerritoryId || !operation.target) return [];
        return [{
          id: `active-attack:${operation.id}:${groupId}`,
          kind: 'active-attack' as const,
          operationId: operation.id,
          groupId,
          originTerritoryId,
          targetTerritoryId: operation.target,
          progress: clampProgress(operation.progress),
          active: true as const
        }];
      }));
}
