from pathlib import Path
import re

path = Path('src/game/balance-simulation.ts')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


def replace_regex(pattern: str, replacement: str, label: str) -> None:
    global text
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    text = updated

replace_once(
    "import { occupationRequirement, splitFormation } from './formation-organisation';\n",
    "import { occupationRequirement, splitFormation } from './formation-organisation';\nimport { TERRITORY_RESOURCES } from './territory-resources';\n",
    'territory resource import'
)

replace_once(
    "export type DefeatCause = 'portal-lost' | 'personnel-collapse' | 'operational-crisis' | 'unknown';",
    "export type DefeatCause = 'personnel-collapse' | 'unknown';",
    'defeat causes'
)

# Public report terminology: the insertion point is a start condition, not a permanent strategic portal objective.
text = text.replace('portalReserveTurns: number;', 'reserveTurns: number;')
text = text.replace('averagePortalReserveTurns: number;', 'averageReserveTurns: number;')
text = text.replace('export interface PortalBalanceSummary', 'export interface StartBalanceSummary')
text = text.replace('portalSummaries: PortalBalanceSummary[];', 'startSummaries: StartBalanceSummary[];')
# Two report-interface fields use this identifier. Engine state.portalTerritory is deliberately retained only at result capture.
text = text.replace('  portalTerritory: string;\n', '  startTerritory: string;\n')
text = text.replace('  portalReserve: number;\n', '  strategicReserve: number;\n')
text = text.replace('  portalReserveTurns: number;\n', '  reserveTurns: number;\n')

# Profile values. Managed already creates small dedicated security detachments, so it should not immobilise 25% of the army as a permanent reserve.
text = text.replace('    portalReserve: 0,', '    strategicReserve: 0,')
text = text.replace('    portalReserve: 1,', '    strategicReserve: 1,', 2)
# The fourth profile is managed and also formerly used one portal reserve.
managed_marker = "  managed: {\n    attackRatio: 0.88,\n    joinRatio: 0.7,\n    portalReserve: 1,"
if managed_marker in text:
    text = text.replace(managed_marker, "  managed: {\n    attackRatio: 0.88,\n    joinRatio: 0.7,\n    strategicReserve: 0,", 1)
elif "  managed: {\n    attackRatio: 0.88,\n    joinRatio: 0.7,\n    strategicReserve: 1," in text:
    text = text.replace("  managed: {\n    attackRatio: 0.88,\n    joinRatio: 0.7,\n    strategicReserve: 1,", "  managed: {\n    attackRatio: 0.88,\n    joinRatio: 0.7,\n    strategicReserve: 0,", 1)
else:
    raise SystemExit('managed reserve profile not found')

replace_once(
"""const isSecurityDetachment = (group: TaskGroup) => /Guard|Security/i.test(group.name) && group.personnel <= 1500;
const stableStaging = (state: GameState, territoryId: string) => (
  territoryId === state.portalTerritory
  || state.territories[territoryId]?.occupation === 'controlled'
  || state.territories[territoryId]?.occupation === 'administered'
);""",
"""const isSecurityDetachment = (group: TaskGroup) => /Guard|Security/i.test(group.name) && group.personnel <= 1500;
const territoryStrategicValue = (territoryId: string) => {
  const profile = TERRITORY_RESOURCES[territoryId];
  if (!profile) return TERRITORIES[territoryId]?.supply ?? 0;
  return profile.industry * 2
    + profile.transport * 2
    + profile.energy
    + profile.militaryStores * 1.5
    + profile.medical * 0.5
    + profile.food * 0.5
    + (TERRITORIES[territoryId]?.supply ?? 0);
};
const stableStaging = (state: GameState, territoryId: string) => {
  const territory = state.territories[territoryId];
  return Boolean(
    territory
    && territory.controller === 'player'
    && territory.supplied
    && (territory.occupation === 'controlled' || territory.occupation === 'administered')
  );
};""",
    'strategic value and staging'
)

replace_regex(
    r"function portalReserveIds\(state: GameState, policy: BalancePolicyId\): Set<string> \{.*?\n\}\n\nfunction shouldHoldGarrison",
"""function strategicReserveIds(state: GameState, policy: BalancePolicyId): Set<string> {
  const profile = POLICY[policy];
  if (profile.strategicReserve <= 0) return new Set<string>();
  const candidates = Object.values(state.taskGroups)
    .filter(group => (
      group.personnel > 0
      && !group.order
      && (group.status === 'ready' || group.status === 'garrison')
      && !isSecurityDetachment(group)
      && state.territories[group.location]?.controller === 'player'
    ))
    .map(group => {
      const territory = state.territories[group.location];
      const delivery = state.logistics.formationAllocations[group.id]?.ratio ?? (territory.supplied ? 100 : 0);
      const adjacentEnemyPower = TERRITORIES[group.location].neighbours
        .filter(id => state.territories[id]?.controller === 'enemy')
        .reduce((sum, id) => sum + enemyStrengthAt(state, id).power, 0);
      const exposure = adjacentEnemyPower / Math.max(1, combatPower(group));
      const depth = isFrontier(state, group.location) ? 0 : 1.2;
      const occupation = territory.occupation === 'administered' ? 1 : territory.occupation === 'controlled' ? 0.6 : 0;
      const strategicValue = territoryStrategicValue(group.location) / 50;
      return { group, score: depth + occupation + delivery / 100 + strategicValue - exposure * 0.6 };
    })
    .sort((first, second) => second.score - first.score || first.group.id.localeCompare(second.group.id));
  return new Set(candidates.slice(0, profile.strategicReserve).map(candidate => candidate.group.id));
}

function shouldHoldGarrison""",
    'dynamic strategic reserve'
)

replace_regex(
    r"function shouldHoldGarrison\(state: GameState, group: TaskGroup, policy: BalancePolicyId, reserved: Set<string>\): boolean \{.*?\n\}",
"""function shouldHoldGarrison(state: GameState, group: TaskGroup, policy: BalancePolicyId, reserved: Set<string>): boolean {
  if (reserved.has(group.id)) return true;
  const territory = state.territories[group.location];
  if (!territory || territory.controller !== 'player') return false;
  if (isSecurityDetachment(group)) {
    return isFrontier(state, group.location)
      || territory.occupation === 'unsecured'
      || territory.occupation === 'contested';
  }
  const hold = POLICY[policy].occupationHold;
  if (hold === 'minimal') return territory.occupation === 'unsecured';
  if (hold === 'controlled') return territory.occupation === 'unsecured' || territory.occupation === 'contested';
  return territory.occupation !== 'administered';
}""",
    'garrison hold rules'
)

replace_once(
    "  if (group.location === state.portalTerritory || group.status !== 'ready') return false;",
    "  if (group.status !== 'ready') return false;",
    'whole garrison start special-case'
)

replace_regex(
    r"function reconnectValue\(state: GameState, targetId: string\): number \{.*?\n\}",
"""function reconnectValue(state: GameState, targetId: string): number {
  const suppliedLinks = TERRITORIES[targetId].neighbours.filter(neighbour => {
    const territory = state.territories[neighbour];
    return territory?.controller === 'player'
      && territory.supplied
      && territory.occupation !== 'unsecured';
  }).length;
  return suppliedLinks * 1.5 + territoryStrategicValue(targetId) / 35;
}""",
    'breakout reconnection value'
)

replace_once(
    "  const breakout = isCutOff(state, group.id) && group.location !== state.portalTerritory;",
    "  const breakout = isCutOff(state, group.id);",
    'breakout portal exclusion'
)

replace_regex(
    r"function chooseMove\(state: GameState, group: TaskGroup, policy: BalancePolicyId\): string \| undefined \{.*?\n\}\n\nfunction splitSecurity",
"""function chooseMove(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const profile = POLICY[policy];
  const allocation = state.logistics.formationAllocations[group.id];
  const deliveryRatio = allocation ? allocation.ratio / 100 : 1;
  const underPressure = group.supply < profile.minimumAttackSupplyStock || deliveryRatio < profile.minimumAttackDeliveryRatio;

  if (!underPressure && isFrontier(state, group.location)) return undefined;
  if (profile.specialistManagement && !isSecurityDetachment(group) && !stableStaging(state, group.location)) return undefined;

  return getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'player')
    .map(id => {
      const territory = state.territories[id];
      const distance = distanceToFront(state, id);
      const allocationAtTarget = state.logistics.territoryAllocations[id];
      const delivery = allocationAtTarget?.ratio ?? (territory.supplied ? 100 : 0);
      const frontScore = Number.isFinite(distance) ? -distance * (underPressure ? 0.2 : 1) : -99;
      const supplyScore = delivery / 100 * (underPressure ? 2.6 : 0.6);
      const secureStaging = stableStaging(state, id) ? (underPressure ? 1.2 : 0.4) : 0;
      const strategicValue = territoryStrategicValue(id) / 55;
      return { id, score: frontScore + supplyScore + secureStaging + strategicValue };
    })
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))[0]?.id;
}

function splitSecurity""",
    'movement recovery logic'
)

replace_regex(
    r"function createManagedSecurity\(state: GameState, telemetry: ActionTelemetry\): GameState \{.*?\n\}\n\nfunction applyManagedPriorities",
"""function createManagedSecurity(state: GameState, telemetry: ActionTelemetry): GameState {
  let next = state;
  for (const territoryId of Object.keys(next.territories).sort()) {
    const territory = next.territories[territoryId];
    if (territory.controller !== 'player') continue;
    const exposed = isFrontier(next, territoryId);
    if (!exposed && territory.occupation === 'administered') continue;
    if (groupsAt(next, territoryId).some(group => group.status === 'garrison' && isSecurityDetachment(group))) continue;
    const source = groupsAt(next, territoryId)
      .filter(group => group.status === 'ready' && !group.order && !isSecurityDetachment(group) && group.personnel >= 1800)
      .sort((first, second) => second.personnel - first.personnel || first.id.localeCompare(second.id))[0];
    if (!source) continue;
    const desired = Math.min(1050, Math.max(700, Math.round(occupationRequirement(territoryId) * 0.65)));
    next = splitSecurity(next, source, `${TERRITORIES[territoryId].centre} Security ${next.turn}`, desired, telemetry);
  }
  return next;
}

function applyManagedPriorities""",
    'managed security doctrine'
)

replace_regex(
    r"function applyManagedPriorities\(state: GameState\): GameState \{.*?\n\}\n\nfunction startManagedEngineering",
"""function applyManagedPriorities(state: GameState): GameState {
  let next = state;
  for (const territoryId of Object.keys(next.territories).sort()) {
    const territory = next.territories[territoryId];
    if (territory.controller !== 'player') continue;
    const frontier = isFrontier(next, territoryId);
    const priority = frontier && (territory.occupation === 'unsecured' || territory.occupation === 'contested')
      ? 'critical'
      : frontier || territory.occupation === 'contested' || territory.occupation === 'unsecured'
        ? 'high'
        : territory.occupation === 'administered'
          ? 'restricted'
          : 'standard';
    next = setTerritoryLogisticsPriority(next, territoryId, priority);
  }
  for (const groupId of Object.keys(next.taskGroups).sort()) {
    const group = next.taskGroups[groupId];
    if (!group || group.personnel <= 0) continue;
    const priority = group.status === 'attacking'
      || group.status === 'moving'
      || group.status === 'recovering'
      || group.status === 'engineering'
      || group.status === 'interdicting'
      || (group.status === 'garrison' && isFrontier(next, group.location))
      ? 'high'
      : 'automatic';
    next = setFormationLogisticsPriority(next, groupId, priority);
  }
  return next;
}

function startManagedEngineering""",
    'managed logistics priorities'
)

replace_once(
"""      score: (100 - state.routeStates[route.id].condition)
        + (state.logistics.bottleneckRouteIds.includes(route.id) ? 42 : 0)
        + (route.fromTerritoryId === state.portalTerritory || route.toTerritoryId === state.portalTerritory ? 30 : 0)""",
"""      score: (100 - state.routeStates[route.id].condition)
        + (state.logistics.bottleneckRouteIds.includes(route.id) ? 42 : 0)
        + (territoryStrategicValue(route.fromTerritoryId) + territoryStrategicValue(route.toTerritoryId)) * 0.8""",
    'engineering strategic value'
)

text = text.replace('const reserved = portalReserveIds(next, policy);', 'const reserved = strategicReserveIds(next, policy);')
text = text.replace('telemetry.portalReserveTurns += 1;', 'telemetry.reserveTurns += 1;')
text = text.replace('    portalReserveTurns: 0,', '    reserveTurns: 0,')

replace_regex(
    r"function defeatCause\(state: GameState\): DefeatCause \| undefined \{.*?\n\}",
"""function defeatCause(state: GameState): DefeatCause | undefined {
  if (state.status !== 'defeat') return undefined;
  if (totalPersonnel(state) < 1200) return 'personnel-collapse';
  return 'unknown';
}""",
    'defeat cause classification'
)

replace_once(
    '    portalTerritory: state.portalTerritory,',
    '    startTerritory: state.portalTerritory,',
    'result start territory'
)

# Replace the reporting tail wholesale so obsolete portal terminology cannot leak through summaries.
tail_start = text.find('function groupSummary(')
if tail_start < 0:
    raise SystemExit('reporting tail start not found')
text = text[:tail_start] + r'''function groupSummary(results: CampaignBalanceResult[], difficulty: Difficulty, policy: BalancePolicyId): BalanceGroupSummary {
  const victories = results.filter(result => result.outcome === 'victory');
  const defeats = results.filter(result => result.outcome === 'defeat');
  const timeouts = results.filter(result => result.outcome === 'timeout');
  const defeatCauses: Record<DefeatCause, number> = {
    'personnel-collapse': 0,
    unknown: 0
  };
  for (const result of defeats) defeatCauses[result.defeatCause ?? 'unknown'] += 1;
  return {
    difficulty,
    policy,
    campaigns: results.length,
    victories: victories.length,
    defeats: defeats.length,
    timeouts: timeouts.length,
    victoryRate: round1(victories.length / Math.max(1, results.length) * 100),
    defeatRate: round1(defeats.length / Math.max(1, results.length) * 100),
    timeoutRate: round1(timeouts.length / Math.max(1, results.length) * 100),
    medianVictoryTurn: victories.length ? round1(median(victories.map(result => result.finalTurn))) : null,
    medianFinalTurn: round1(median(results.map(result => result.finalTurn))),
    medianControlledTerritories: round1(median(results.map(result => result.controlledTerritories))),
    medianActivePersonnel: Math.round(median(results.map(result => result.activePersonnel))),
    medianPermanentLossEstimate: Math.round(median(results.map(result => result.permanentLossEstimate))),
    medianFunctionalArmourPercentOfStart: round1(median(results.map(result => result.functionalArmourPercentOfStart))),
    medianMaxEscalation: round1(median(results.map(result => result.maxEscalation))),
    medianMinNetworkEfficiency: round1(median(results.map(result => result.minNetworkEfficiency))),
    averageEnemyRecaptures: round1(average(results.map(result => result.enemyRecaptures))),
    averageInfrastructureIncidents: round1(average(results.map(result => result.infrastructureIncidents))),
    averageCutOffFormationDays: round1(average(results.map(result => result.cutOffFormationDays))),
    averageReserveTurns: round1(average(results.map(result => result.reserveTurns))),
    averageEngineeringProjectsStarted: round1(average(results.map(result => result.engineeringProjectsStarted))),
    averageFormationsSplit: round1(average(results.map(result => result.formationsSplit))),
    averageCoordinatedAssaults: round1(average(results.map(result => result.coordinatedAssaults))),
    averageBreakoutOperations: round1(average(results.map(result => result.breakoutOperations))),
    defeatCauses
  };
}

function startSummary(results: CampaignBalanceResult[], difficulty: Difficulty, policy: BalancePolicyId, startTerritory: string): StartBalanceSummary {
  return {
    difficulty,
    policy,
    startTerritory,
    campaigns: results.length,
    victoryRate: round1(results.filter(result => result.outcome === 'victory').length / Math.max(1, results.length) * 100),
    medianFinalTurn: round1(median(results.map(result => result.finalTurn))),
    medianActivePersonnel: Math.round(median(results.map(result => result.activePersonnel))),
    averageEnemyRecaptures: round1(average(results.map(result => result.enemyRecaptures)))
  };
}

export function runCurrentEngineBalanceSimulation(options: BalanceSimulationOptions): CurrentEngineBalanceReport {
  const runsPerStart = Math.max(1, Math.round(options.runsPerStart));
  const maxTurns = Math.max(10, Math.round(options.maxTurns));
  const seedOffset = Math.max(0, Math.round(options.seedOffset ?? 1));
  const difficulties: Difficulty[] = options.difficulties?.length ? [...options.difficulties] : [...DEFAULT_DIFFICULTIES];
  const policies: BalancePolicyId[] = options.policies?.length ? [...options.policies] : [...DEFAULT_POLICIES];
  const results: CampaignBalanceResult[] = [];

  for (const difficulty of difficulties) {
    for (const policy of policies) {
      for (let startIndex = 0; startIndex < SLICE_IDS.length; startIndex += 1) {
        for (let run = 0; run < runsPerStart; run += 1) {
          const seed = startIndex + SLICE_IDS.length * (seedOffset + run);
          results.push(simulateCurrentEngineCampaign(seed, difficulty, policy, maxTurns));
        }
      }
    }
  }

  const summaries = difficulties.flatMap(difficulty => policies.map(policy => groupSummary(
    results.filter(result => result.difficulty === difficulty && result.policy === policy),
    difficulty,
    policy
  )));
  const startSummaries = difficulties.flatMap(difficulty => policies.flatMap(policy => SLICE_IDS.map(startTerritory => startSummary(
    results.filter(result => result.difficulty === difficulty && result.policy === policy && result.startTerritory === startTerritory),
    difficulty,
    policy,
    startTerritory
  ))));
  return {
    engineSaveVersion: 14,
    territoryCount: SLICE_IDS.length,
    options: { runsPerStart, maxTurns, seedOffset, difficulties, policies },
    campaigns: results.length,
    summaries,
    startSummaries,
    results
  };
}

export function renderCurrentEngineBalanceMarkdown(report: CurrentEngineBalanceReport): string {
  const lines = [
    '# Future Conquest current-engine balance simulation',
    '',
    `Campaigns: ${report.campaigns} across ${report.territoryCount} insertion starts. Maximum campaign day: ${report.options.maxTurns}.`,
    '',
    '## Difficulty and policy summary',
    '',
    '| Difficulty | Policy | Runs | Victory | Defeat | Timeout | Personnel collapse | Other defeat | Median victory day | Median territory control | Median personnel | Functional armour | Median minimum network | Avg recaptures | Avg coordinated | Avg breakouts |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];
  for (const summary of report.summaries) {
    lines.push(`| ${summary.difficulty} | ${summary.policy} | ${summary.campaigns} | ${summary.victoryRate}% | ${summary.defeatRate}% | ${summary.timeoutRate}% | ${summary.defeatCauses['personnel-collapse']} | ${summary.defeatCauses.unknown} | ${summary.medianVictoryTurn ?? 'n/a'} | ${summary.medianControlledTerritories} | ${summary.medianActivePersonnel} | ${summary.medianFunctionalArmourPercentOfStart}% | ${summary.medianMinNetworkEfficiency}% | ${summary.averageEnemyRecaptures} | ${summary.averageCoordinatedAssaults} | ${summary.averageBreakoutOperations} |`);
  }
  const starts = report.startSummaries
    .filter(summary => summary.difficulty === 'standard' && summary.policy === 'managed')
    .sort((first, second) => first.victoryRate - second.victoryRate || second.medianFinalTurn - first.medianFinalTurn);
  if (starts.length) {
    lines.push('', '## Standard / managed start sensitivity', '', '| Start | Victory | Median final day | Median personnel | Avg enemy recaptures |', '| --- | ---: | ---: | ---: | ---: |');
    for (const summary of starts) {
      lines.push(`| ${TERRITORIES[summary.startTerritory].centre} (${summary.startTerritory}) | ${summary.victoryRate}% | ${summary.medianFinalTurn} | ${summary.medianActivePersonnel} | ${summary.averageEnemyRecaptures} |`);
    }
  }
  lines.push(
    '',
    '## Interpretation boundary',
    '',
    '- These are deterministic heuristic player doctrines driving the real current playable engine through its public order functions.',
    '- The original insertion territory is treated only as the campaign start condition. It receives no permanent reserve, supply, engineering, movement or defeat privilege.',
    '- Aggressive play accepts severe strategic risk. Balanced and cautious play keep one dynamic strategic reserve when possible. Managed play instead uses smaller dedicated security detachments, logistics priorities and engineering.',
    '- Managed and cautious doctrines can deliberately form two-formation assaults when no single group has enough power to justify the attack alone.',
    '- Cut-off full-sized formations may attempt a lower-threshold breakout against an adjacent enemy corridor, prioritising targets that reconnect to any supplied friendly network.',
    '- Managed security detachments remain defensive while a territory is exposed; small detached security units are never used as assault formations.',
    '- They are comparative balance probes, not predictions of human win rate. Player interdiction remains excluded because it should be an offensive choice, not a prerequisite for basic campaign viability.',
    '- Strategic-collapse decisions are automatically continued by the harness so a collapse threshold is measured as pressure, not counted as an automatic defeat.'
  );
  return `${lines.join('\n')}\n`;
}
'''

# Interface/schema consistency after tail replacement.
text = text.replace('  portalSummaries: StartBalanceSummary[];', '  startSummaries: StartBalanceSummary[];')
text = text.replace('  portalSummaries: PortalBalanceSummary[];', '  startSummaries: StartBalanceSummary[];')
text = text.replace('  portalTerritory: string;', '  startTerritory: string;')
text = text.replace('  averagePortalReserveTurns: number;', '  averageReserveTurns: number;')
text = text.replace('  portalReserveTurns: number;', '  reserveTurns: number;')
text = text.replace('  portalReserve: number;', '  strategicReserve: number;')

# Hard guard: after WP2, the only valid reference to engine portalTerritory in the balance harness is recording the initial start id.
if text.count('state.portalTerritory') != 1:
    raise SystemExit(f'expected exactly one state.portalTerritory reference, found {text.count("state.portalTerritory")}')
for forbidden in ('portalReserve', 'Portal Guard', 'portalRecovery', 'portal-lost', 'portal sensitivity', 'portal starts'):
    if forbidden in text:
        raise SystemExit(f'obsolete portal doctrine remains: {forbidden}')

path.write_text(text, encoding='utf-8')

trace = Path('scripts/trace-current-engine-balance.mjs')
trace_text = trace.read_text(encoding='utf-8')
trace_text = trace_text.replace('portalReserveTurns: result.portalReserveTurns', 'reserveTurns: result.reserveTurns')
trace.write_text(trace_text, encoding='utf-8')

print('WP11 modernised balance harness doctrine and reporting.')
