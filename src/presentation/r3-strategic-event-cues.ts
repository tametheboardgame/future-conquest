import type { CombatReport, GameState } from '../game/types';

export interface ActiveAttackCue {
  readonly id: string;
  readonly kind: 'active-attack';
  readonly operationId: string;
  readonly groupId: string;
  readonly originTerritoryId: string;
  readonly targetTerritoryId: string;
  readonly progress: number;
  readonly turn: number;
  readonly age: 0;
}

export type RecentStrategicOutcomeKind =
  | 'recent-victory'
  | 'recent-withdrawal'
  | 'recent-counterattack-repelled'
  | 'recent-territory-lost'
  | 'recent-capture';

export interface RecentStrategicOutcomeCue {
  readonly id: string;
  readonly kind: RecentStrategicOutcomeKind;
  readonly territoryId: string;
  readonly turn: number;
  readonly age: number;
}

export type StrategicEventCue = ActiveAttackCue | RecentStrategicOutcomeCue;

export const R3_RECENT_STRATEGIC_EVENT_TURNS = 1;

const clampProgress = (progress: number) => Math.max(0, Math.min(100, progress));

const reportCueKind = (report: CombatReport): RecentStrategicOutcomeKind | undefined => {
  if (report.kind === 'offensive' && report.outcome === 'victory') return 'recent-victory';
  if (report.kind === 'offensive' && report.outcome === 'withdrawal') return 'recent-withdrawal';
  if (report.kind === 'counterattack' && report.outcome === 'repelled') return 'recent-counterattack-repelled';
  if (report.kind === 'counterattack' && report.outcome === 'territory-lost') return 'recent-territory-lost';
  return undefined;
};

const recentAge = (currentTurn: number, eventTurn: number) => currentTurn - eventTurn;
const isRecent = (age: number) => age >= 0 && age <= R3_RECENT_STRATEGIC_EVENT_TURNS;

// Presentation only: operation origins are captured by the engine when a group
// commits. Never substitute later marker positions or inspect enemy orders or
// formations to manufacture a direction the player has not legitimately seen.
export function deriveActiveAttackCues(
  state: Pick<GameState, 'operations' | 'turn'>
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
          turn: state.turn,
          age: 0 as const
        }];
      }));
}

export function deriveRecentStrategicOutcomeCues(
  state: Pick<GameState, 'combatReports' | 'territories' | 'turn'>
): readonly RecentStrategicOutcomeCue[] {
  const reportCues = (state.combatReports ?? []).flatMap(report => {
    const kind = reportCueKind(report);
    const age = recentAge(state.turn, report.turn);
    if (!kind || !isRecent(age)) return [];
    return [{
      id: `${kind}:${report.id}`,
      kind,
      territoryId: report.territoryId,
      turn: report.turn,
      age
    } satisfies RecentStrategicOutcomeCue];
  });

  const reportVictoryKeys = new Set(reportCues
    .filter(cue => cue.kind === 'recent-victory')
    .map(cue => `${cue.territoryId}:${cue.turn}`));

  const captureCues = Object.entries(state.territories).flatMap(([territoryId, territory]) => {
    if (territory.controller !== 'player' || territory.capturedTurn === undefined) return [];
    const age = recentAge(state.turn, territory.capturedTurn);
    if (!isRecent(age) || reportVictoryKeys.has(`${territoryId}:${territory.capturedTurn}`)) return [];
    return [{
      id: `recent-capture:${territoryId}:${territory.capturedTurn}`,
      kind: 'recent-capture' as const,
      territoryId,
      turn: territory.capturedTurn,
      age
    }];
  });

  return [...reportCues, ...captureCues].sort((a, b) => (
    b.turn - a.turn
    || a.territoryId.localeCompare(b.territoryId)
    || a.kind.localeCompare(b.kind)
    || a.id.localeCompare(b.id)
  ));
}

export function deriveStrategicEventCues(
  state: Pick<GameState, 'operations' | 'combatReports' | 'territories' | 'turn'>
): readonly StrategicEventCue[] {
  return [
    ...deriveActiveAttackCues(state),
    ...deriveRecentStrategicOutcomeCues(state)
  ];
}
