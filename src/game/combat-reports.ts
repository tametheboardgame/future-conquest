import type {
  CombatReport,
  GameState,
  Operation,
  OperationCombatLedger,
  TaskGroup
} from './types';

const sumPersonnel = (groups: TaskGroup[]) => groups.reduce((sum, group) => sum + group.personnel, 0);
const sumFunctionalArmour = (groups: TaskGroup[]) => groups.reduce((sum, group) => sum + group.functionalArmour, 0);

export function createOperationCombatLedger(state: GameState, operation: Operation): OperationCombatLedger {
  const committed = operation.participantGroupIds
    .map(id => state.taskGroups[id])
    .filter((group): group is TaskGroup => Boolean(group));
  const defenders = operation.enemyFormationIds
    .map(id => state.enemyFormations[id])
    .filter(formation => Boolean(formation));
  return {
    startedTurn: state.turn,
    committedPersonnel: sumPersonnel(committed),
    committedFunctionalArmour: sumFunctionalArmour(committed),
    playerKilled: 0,
    playerWounded: 0,
    armourDamaged: 0,
    enemyStartingPersonnel: defenders.reduce((sum, formation) => sum + formation.personnel, 0),
    enemyStartingArmour: defenders.reduce((sum, formation) => sum + formation.armour, 0),
    enemyPersonnelLosses: 0,
    enemyArmourLosses: 0
  };
}

export function ensureOperationCombatLedger(state: GameState, operation: Operation): OperationCombatLedger {
  operation.combat ??= createOperationCombatLedger(state, operation);
  return operation.combat;
}

export function addCommittedFormationToLedger(state: GameState, operation: Operation, group: TaskGroup): void {
  const ledger = ensureOperationCombatLedger(state, operation);
  ledger.committedPersonnel += group.personnel;
  ledger.committedFunctionalArmour += group.functionalArmour;
}

export function recordOperationCombatDay(
  state: GameState,
  operation: Operation,
  losses: {
    playerKilled: number;
    playerWounded: number;
    armourDamaged: number;
    enemyPersonnelLosses: number;
    enemyArmourLosses: number;
  }
): void {
  const ledger = ensureOperationCombatLedger(state, operation);
  ledger.playerKilled += losses.playerKilled;
  ledger.playerWounded += losses.playerWounded;
  ledger.armourDamaged += losses.armourDamaged;
  ledger.enemyPersonnelLosses += losses.enemyPersonnelLosses;
  ledger.enemyArmourLosses += losses.enemyArmourLosses;
}

export function operationCurrentFriendlyStrength(state: GameState, operation: Operation): { personnel: number; functionalArmour: number } {
  const groups = operation.participantGroupIds
    .map(id => state.taskGroups[id])
    .filter((group): group is TaskGroup => Boolean(group && group.personnel > 0));
  return {
    personnel: sumPersonnel(groups),
    functionalArmour: sumFunctionalArmour(groups)
  };
}

export function buildOffensiveCombatReport(
  state: GameState,
  operation: Operation,
  participants: TaskGroup[],
  outcome: 'victory' | 'withdrawal',
  note: string
): CombatReport {
  const ledger = ensureOperationCombatLedger(state, operation);
  const endingPersonnel = sumPersonnel(participants);
  const endingFunctionalArmour = sumFunctionalArmour(participants);
  const returnedToDuty = Math.max(
    0,
    endingPersonnel + ledger.playerKilled + ledger.playerWounded - ledger.committedPersonnel
  );
  const otherPersonnelLosses = Math.max(
    0,
    ledger.committedPersonnel + returnedToDuty - endingPersonnel - ledger.playerKilled - ledger.playerWounded
  );
  const armourRepaired = Math.max(
    0,
    endingFunctionalArmour + ledger.armourDamaged - ledger.committedFunctionalArmour
  );
  const enemyEndingPersonnel = Math.max(0, ledger.enemyStartingPersonnel - ledger.enemyPersonnelLosses);
  const enemyEndingArmour = Math.max(0, ledger.enemyStartingArmour - ledger.enemyArmourLosses);

  return {
    id: `AAR-${state.turn}-${operation.id}`,
    turn: state.turn,
    kind: 'offensive',
    outcome,
    territoryId: operation.target,
    startedTurn: ledger.startedTurn,
    durationDays: operation.days,
    participantNames: participants.map(group => group.name),
    playerStartingPersonnel: ledger.committedPersonnel,
    playerEndingPersonnel: endingPersonnel,
    playerKilled: ledger.playerKilled,
    playerWounded: ledger.playerWounded,
    playerReturnedToDuty: returnedToDuty,
    playerOtherLosses: otherPersonnelLosses,
    playerStartingFunctionalArmour: ledger.committedFunctionalArmour,
    playerEndingFunctionalArmour: endingFunctionalArmour,
    playerArmourDamaged: ledger.armourDamaged,
    playerArmourRepaired: armourRepaired,
    enemyStartingPersonnel: ledger.enemyStartingPersonnel,
    enemyEndingPersonnel,
    enemyPersonnelLosses: ledger.enemyPersonnelLosses,
    enemyStartingArmour: ledger.enemyStartingArmour,
    enemyEndingArmour,
    enemyArmourLosses: ledger.enemyArmourLosses,
    note
  };
}

export function appendCombatReport(state: GameState, report: CombatReport): GameState {
  const previous = state.combatReports ?? [];
  return { ...state, combatReports: [report, ...previous.filter(item => item.id !== report.id)].slice(0, 30) };
}

export function estimateCombatFigure(value: number): number {
  if (value <= 0) return 0;
  if (value < 250) return Math.round(value / 10) * 10;
  return Math.round(value / 25) * 25;
}
