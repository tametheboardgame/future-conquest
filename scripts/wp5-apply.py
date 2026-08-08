from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    source = file.read_text()
    if old not in source:
        raise RuntimeError(f"Expected block not found in {path}: {old[:120]!r}")
    file.write_text(source.replace(old, new, 1))


replace_once(
    'src/game/types.ts',
    '''export interface Operation {
  id: string;
  target: string;
  participantGroupIds: string[];
  origins: Record<string, string>;
  progress: number;
  days: number;
  enemyFormationIds: string[];
  enemyPower: number;
}''',
    '''export interface OperationCombatLedger {
  startedTurn: number;
  committedPersonnel: number;
  committedFunctionalArmour: number;
  playerKilled: number;
  playerWounded: number;
  armourDamaged: number;
  enemyStartingPersonnel: number;
  enemyStartingArmour: number;
  enemyPersonnelLosses: number;
  enemyArmourLosses: number;
}

export interface Operation {
  id: string;
  target: string;
  participantGroupIds: string[];
  origins: Record<string, string>;
  progress: number;
  days: number;
  enemyFormationIds: string[];
  enemyPower: number;
  combat?: OperationCombatLedger;
}

export interface CombatReport {
  id: string;
  turn: number;
  kind: 'offensive' | 'counterattack';
  outcome: 'victory' | 'withdrawal' | 'repelled' | 'territory-lost';
  territoryId: string;
  startedTurn: number;
  durationDays: number;
  participantNames: string[];
  playerStartingPersonnel: number;
  playerEndingPersonnel: number;
  playerKilled: number;
  playerWounded: number;
  playerReturnedToDuty: number;
  playerOtherLosses: number;
  playerStartingFunctionalArmour: number;
  playerEndingFunctionalArmour: number;
  playerArmourDamaged: number;
  playerArmourRepaired: number;
  enemyStartingPersonnel: number;
  enemyEndingPersonnel: number;
  enemyPersonnelLosses: number;
  enemyStartingArmour: number;
  enemyEndingArmour: number;
  enemyArmourLosses: number;
  note: string;
}'''
)

replace_once(
    'src/game/types.ts',
    '''  operations: Record<string, Operation>;
  events: GameEvent[];''',
    '''  operations: Record<string, Operation>;
  combatReports?: CombatReport[];
  events: GameEvent[];'''
)

replace_once(
    'src/game/engine.ts',
    "import { recommendedReinforcementForTerritory } from './defence';",
    "import { recommendedReinforcementForTerritory } from './defence';\nimport { addCommittedFormationToLedger, appendCombatReport, buildOffensiveCombatReport, ensureOperationCombatLedger, recordOperationCombatDay } from './combat-reports';"
)

replace_once(
    'src/game/engine.ts',
    '''  Difficulty,
  EnemyFormation,''',
    '''  CombatReport,
  Difficulty,
  EnemyFormation,'''
)

replace_once(
    'src/game/engine.ts',
    '''    woundedPool: 0,
    operations: {},
    status: 'playing',''',
    '''    woundedPool: 0,
    operations: {},
    combatReports: [],
    status: 'playing','''
)

replace_once(
    'src/game/engine.ts',
    '''  operations[operationId] = operation;

  if (!operation.participantGroupIds.includes(group.id)) operation.participantGroupIds.push(group.id);''',
    '''  operations[operationId] = operation;
  ensureOperationCombatLedger(state, operation);

  if (!operation.participantGroupIds.includes(group.id)) {
    addCommittedFormationToLedger(state, operation, group);
    operation.participantGroupIds.push(group.id);
  }'''
)

replace_once(
    'src/game/engine.ts',
    '''    let totalKilled = 0;
    let totalWounded = 0;
    let remainingPersonnel = 0;''',
    '''    let totalKilled = 0;
    let totalWounded = 0;
    let totalArmourDamage = 0;
    let remainingPersonnel = 0;'''
)

replace_once(
    'src/game/engine.ts',
    '''      group.functionalArmour -= armourDamage;
      group.damagedArmour += armourDamage;
      remainingPersonnel += group.personnel;''',
    '''      group.functionalArmour -= armourDamage;
      group.damagedArmour += armourDamage;
      totalArmourDamage += armourDamage;
      remainingPersonnel += group.personnel;'''
)

replace_once(
    'src/game/engine.ts',
    '''    distributeEnemyLosses(enemyFormations, operation.enemyFormationIds, enemyPersonnelLosses, enemyArmourLosses);

    next = resolveOperationCombatDamage(next, operation, participants, defender.personnel);''',
    '''    distributeEnemyLosses(enemyFormations, operation.enemyFormationIds, enemyPersonnelLosses, enemyArmourLosses);
    recordOperationCombatDay(next, operation, {
      playerKilled: totalKilled,
      playerWounded: totalWounded,
      armourDamaged: totalArmourDamage,
      enemyPersonnelLosses,
      enemyArmourLosses
    });

    next = resolveOperationCombatDamage(next, operation, participants, defender.personnel);'''
)

replace_once(
    'src/game/engine.ts',
    '''      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });
      delete operations[operationId];
      next = addEvent(''',
    '''      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });
      next = appendCombatReport(next, buildOffensiveCombatReport(
        next,
        operation,
        participants,
        'victory',
        secured
          ? `${TERRITORIES[operation.target].centre} was secured and surviving defenders withdrew.`
          : `${TERRITORIES[operation.target].centre} was seized, but the surviving force is below the occupation requirement and the territory remains unsecured.`
      ));
      delete operations[operationId];
      next = addEvent('''
)

replace_once(
    'src/game/engine.ts',
    '''      delete operations[operationId];
      next = addEvent(
        next,
        `${participants.map(group => group.name).join(' and ')} abandoned the operation towards ${TERRITORIES[operation.target].centre} after ${operation.days} days.`,''',
    '''      next = appendCombatReport(next, buildOffensiveCombatReport(
        next,
        operation,
        participants,
        'withdrawal',
        `${participants.map(group => group.name).join(' and ')} broke contact and withdrew after ${operation.days} days without securing the objective.`
      ));
      delete operations[operationId];
      next = addEvent(
        next,
        `${participants.map(group => group.name).join(' and ')} abandoned the operation towards ${TERRITORIES[operation.target].centre} after ${operation.days} days.`,'''
)

replace_once(
    'src/game/engine.ts',
    '''        `Operation ${TERRITORIES[operation.target].centre}: ${operation.progress}% progress after ${operation.days} day${operation.days === 1 ? '' : 's'}. ${totalKilled} killed, ${totalWounded} wounded; defenders lost about ${enemyPersonnelLosses}.`,''',
    '''        `Operation ${TERRITORIES[operation.target].centre}: ${operation.progress}% progress after ${operation.days} day${operation.days === 1 ? '' : 's'}. Friendly active strength ${remainingPersonnel} from ${operation.combat?.committedPersonnel ?? remainingPersonnel} committed. Today: ${totalKilled} killed and ${totalWounded} wounded (${totalKilled + totalWounded} removed from active strength; wounded enter the recovery pool). Defenders lost about ${enemyPersonnelLosses}.`,'''
)

replace_once(
    'src/game/engine.ts',
    '''  const defenders = Object.values(state.taskGroups).filter(group => group.location === target);
  const defenderPower = counterattackDefencePower(state, target);''',
    '''  const defenders = Object.values(state.taskGroups).filter(group => group.location === target);
  const defenderIds = defenders.map(group => group.id);
  const defenderStartingPersonnel = defenders.reduce((sum, group) => sum + group.personnel, 0);
  const defenderStartingArmour = defenders.reduce((sum, group) => sum + group.functionalArmour, 0);
  const attackerStartingPersonnel = attackers.reduce((sum, formation) => sum + formation.personnel, 0);
  const attackerStartingArmour = attackers.reduce((sum, formation) => sum + formation.armour, 0);
  let counterPlayerKilled = 0;
  let counterPlayerWounded = 0;
  let counterEnemyPersonnelLosses = 0;
  let counterOutcome: CombatReport['outcome'] = 'repelled';
  let counterNote = '';
  const defenderPower = counterattackDefencePower(state, target);'''
)

replace_once(
    'src/game/engine.ts',
    '''      group.personnel -= combatLosses;
      next.woundedPool += Math.round(combatLosses * 0.55);''',
    '''      group.personnel -= combatLosses;
      const wounded = Math.round(combatLosses * 0.55);
      const killed = combatLosses - wounded;
      next.woundedPool += wounded;
      counterPlayerKilled += killed;
      counterPlayerWounded += wounded;'''
)

replace_once(
    'src/game/engine.ts',
    '''    next = addEvent(next, `${attackers.length} enemy formation${attackers.length === 1 ? '' : 's'} retook ${TERRITORIES[target].centre}. ${retreatText}`, 'danger');
  } else {''',
    '''    counterOutcome = 'territory-lost';
    counterNote = retreatText;
    next = addEvent(next, `${attackers.length} enemy formation${attackers.length === 1 ? '' : 's'} retook ${TERRITORIES[target].centre}. ${retreatText}`, 'danger');
  } else {'''
)

replace_once(
    'src/game/engine.ts',
    '''      totalLosses += losses;
    }
    for (const defender of defenders) {''',
    '''      totalLosses += losses;
    }
    counterEnemyPersonnelLosses = totalLosses;
    for (const defender of defenders) {'''
)

replace_once(
    'src/game/engine.ts',
    '''      group.personnel -= defenderLosses;
      next.woundedPool += Math.round(defenderLosses * 0.6);''',
    '''      group.personnel -= defenderLosses;
      const wounded = Math.round(defenderLosses * 0.6);
      const killed = defenderLosses - wounded;
      next.woundedPool += wounded;
      counterPlayerKilled += killed;
      counterPlayerWounded += wounded;'''
)

replace_once(
    'src/game/engine.ts',
    '''    next = addEvent(next, `${TERRITORIES[target].centre} repelled an enemy counterattack coordinated by ${attackers.length} formation${attackers.length === 1 ? '' : 's'}. The attacking force lost roughly ${totalLosses} personnel.`, 'good');
  }
  if (plannedCounterattack) next = completeEnemyOrder(next, plannedCounterattack.id);''',
    '''    counterNote = `${TERRITORIES[target].centre} held against ${attackers.length} attacking formation${attackers.length === 1 ? '' : 's'}.`;
    next = addEvent(next, `${TERRITORIES[target].centre} repelled an enemy counterattack coordinated by ${attackers.length} formation${attackers.length === 1 ? '' : 's'}. The attacking force lost roughly ${totalLosses} personnel.`, 'good');
  }
  const endingDefenders = defenderIds.flatMap(id => taskGroups[id] ? [taskGroups[id]] : []);
  const defenderEndingPersonnel = endingDefenders.reduce((sum, group) => sum + group.personnel, 0);
  const defenderEndingArmour = endingDefenders.reduce((sum, group) => sum + group.functionalArmour, 0);
  const otherPersonnelLosses = Math.max(0, defenderStartingPersonnel - defenderEndingPersonnel - counterPlayerKilled - counterPlayerWounded);
  const counterReport: CombatReport = {
    id: `AAR-${state.turn}-COUNTER-${target}`,
    turn: state.turn,
    kind: 'counterattack',
    outcome: counterOutcome,
    territoryId: target,
    startedTurn: state.turn,
    durationDays: 1,
    participantNames: defenders.map(group => group.name),
    playerStartingPersonnel: defenderStartingPersonnel,
    playerEndingPersonnel: defenderEndingPersonnel,
    playerKilled: counterPlayerKilled,
    playerWounded: counterPlayerWounded,
    playerReturnedToDuty: 0,
    playerOtherLosses: otherPersonnelLosses,
    playerStartingFunctionalArmour: defenderStartingArmour,
    playerEndingFunctionalArmour: defenderEndingArmour,
    playerArmourDamaged: 0,
    playerArmourRepaired: 0,
    enemyStartingPersonnel: attackerStartingPersonnel,
    enemyEndingPersonnel: Math.max(0, attackerStartingPersonnel - counterEnemyPersonnelLosses),
    enemyPersonnelLosses: counterEnemyPersonnelLosses,
    enemyStartingArmour: attackerStartingArmour,
    enemyEndingArmour: attackerStartingArmour,
    enemyArmourLosses: 0,
    note: counterNote
  };
  next = appendCombatReport(next, counterReport);
  if (plannedCounterattack) next = completeEnemyOrder(next, plannedCounterattack.id);'''
)

replace_once(
    'src/game/engine.ts',
    '''    operations: structuredClone(state.operations),
    routeStates: structuredClone(state.routeStates),''',
    '''    operations: structuredClone(state.operations),
    combatReports: structuredClone(state.combatReports ?? []),
    routeStates: structuredClone(state.routeStates),'''
)

replace_once(
    'src/App.tsx',
    "import { DefencePanel } from './components/DefencePanel';",
    "import { DefencePanel } from './components/DefencePanel';\nimport { CombatAfterActionAlert, CombatReportsPanel } from './components/CombatReports';"
)

replace_once(
    'src/App.tsx',
    '''  const operations = Object.values(state.operations).sort((a, b) => a.target.localeCompare(b.target));
  const territoryDefinitions''',
    '''  const operations = Object.values(state.operations).sort((a, b) => a.target.localeCompare(b.target));
  const combatReports = state.combatReports ?? [];
  const latestCombatReport = combatReports[0];
  const territoryDefinitions'''
)

replace_once(
    'src/App.tsx',
    '''PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING · PLAYTEST 1 / WP4 DEFENCE AND THREAT CLARITY''',
    '''PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING · PLAYTEST 1 / WP4 DEFENCE AND THREAT CLARITY · WP5 COMBAT REPORTING'''
)

replace_once(
    'src/App.tsx',
    '''    })()}

    {state.status !== 'playing' &&''',
    '''    })()}

    {latestCombatReport?.turn === state.turn && <CombatAfterActionAlert report={latestCombatReport} onReview={() => setCurrentView('operations')} />}

    {state.status !== 'playing' &&'''
)

replace_once(
    'src/App.tsx',
    '''            <section className="view-panel operational-reports">''',
    '''            <CombatReportsPanel state={state} onOpenTerritory={openTerritoryOnMap} />

            <section className="view-panel operational-reports">'''
)

replace_once(
    'src/App.tsx',
    '''                <div><dt>Wounded pool</dt><dd>{formatNumber(state.woundedPool)}</dd></div>''',
    '''                <div><dt>Wounded pool</dt><dd>{formatNumber(state.woundedPool)}</dd></div>
                <div><dt>After-action reports</dt><dd>{combatReports.length}</dd></div>'''
)

replace_once(
    'src/main.tsx',
    "import './defence.css';",
    "import './defence.css';\nimport './combat-reports.css';"
)

print('WP5 combat reporting integration applied.')
