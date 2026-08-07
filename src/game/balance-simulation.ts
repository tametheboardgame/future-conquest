import { SLICE_IDS, TERRITORIES } from './data';
import {
  beginOperation,
  canIssueOperationalOrder,
  endTurn,
  enemyStrengthAt,
  getOperationAtTarget,
  issueMove,
  newGame,
  selectTaskGroup,
  selectTerritory,
  setGarrison
} from './engine';
import { crisisLimitForDifficulty } from './enemy-strategy';
import { getAdjacentOrderTargets } from './order-targeting';
import type { Difficulty, GameState, TaskGroup } from './types';

export type BalancePolicyId = 'aggressive' | 'balanced' | 'cautious';
export type BalanceOutcome = 'victory' | 'defeat' | 'timeout';
export type DefeatCause = 'portal-lost' | 'personnel-collapse' | 'operational-crisis' | 'unknown';

export interface BalanceSimulationOptions {
  runsPerStart: number;
  maxTurns: number;
  difficulties?: Difficulty[];
  policies?: BalancePolicyId[];
  seedOffset?: number;
}

export interface CampaignBalanceResult {
  seed: number;
  portalTerritory: string;
  difficulty: Difficulty;
  policy: BalancePolicyId;
  outcome: BalanceOutcome;
  defeatCause?: DefeatCause;
  finalTurn: number;
  controlledTerritories: number;
  administeredTerritories: number;
  unsecuredTerritories: number;
  activePersonnel: number;
  woundedPool: number;
  permanentLossEstimate: number;
  functionalArmour: number;
  damagedArmour: number;
  functionalArmourPercentOfStart: number;
  maxEscalation: number;
  minNetworkEfficiency: number;
  maxOperationalCrisisTurns: number;
  captures: number;
  enemyRecaptures: number;
  infrastructureIncidents: number;
  cutOffFormationDays: number;
  criticalSupplyFormationDays: number;
  operationsStarted: number;
  operationsJoined: number;
  movesIssued: number;
  garrisonsAssigned: number;
  garrisonsReleased: number;
  portalReserveTurns: number;
}

export interface BalanceGroupSummary {
  difficulty: Difficulty;
  policy: BalancePolicyId;
  campaigns: number;
  victories: number;
  defeats: number;
  timeouts: number;
  victoryRate: number;
  defeatRate: number;
  timeoutRate: number;
  medianVictoryTurn: number | null;
  medianFinalTurn: number;
  medianControlledTerritories: number;
  medianActivePersonnel: number;
  medianPermanentLossEstimate: number;
  medianFunctionalArmourPercentOfStart: number;
  medianMaxEscalation: number;
  medianMinNetworkEfficiency: number;
  averageEnemyRecaptures: number;
  averageInfrastructureIncidents: number;
  averageCutOffFormationDays: number;
  averagePortalReserveTurns: number;
  defeatCauses: Record<DefeatCause, number>;
}

export interface PortalBalanceSummary {
  difficulty: Difficulty;
  policy: BalancePolicyId;
  portalTerritory: string;
  campaigns: number;
  victoryRate: number;
  medianFinalTurn: number;
  medianActivePersonnel: number;
  averageEnemyRecaptures: number;
}

export interface CurrentEngineBalanceReport {
  engineSaveVersion: number;
  territoryCount: number;
  options: {
    runsPerStart: number;
    maxTurns: number;
    seedOffset: number;
    difficulties: Difficulty[];
    policies: BalancePolicyId[];
  };
  campaigns: number;
  summaries: BalanceGroupSummary[];
  portalSummaries: PortalBalanceSummary[];
  results: CampaignBalanceResult[];
}

interface PolicyProfile {
  attackRatio: number;
  joinRatio: number;
  garrisonResistance: number;
  releaseResistance: number;
  holdUntilAdministered: boolean;
  portalReserve: 0 | 1;
  reinforcePortalAtEscalation: number;
}

interface ActionTelemetry {
  operationsStarted: number;
  operationsJoined: number;
  movesIssued: number;
  garrisonsAssigned: number;
  garrisonsReleased: number;
  portalReserveTurns: number;
}

const STARTING_PERSONNEL = 10_000;
const STARTING_FUNCTIONAL_ARMOUR = 9_000;
const DEFAULT_DIFFICULTIES: Difficulty[] = ['story', 'standard', 'hard'];
const DEFAULT_POLICIES: BalancePolicyId[] = ['aggressive', 'balanced', 'cautious'];
const TERRAIN_CAUTION: Record<string, number> = {
  'open-lowland': 0,
  'mixed-lowland': 0.03,
  'mixed-upland': 0.08,
  mountainous: 0.16
};

const POLICY: Record<BalancePolicyId, PolicyProfile> = {
  aggressive: {
    attackRatio: 0.58,
    joinRatio: 0.45,
    garrisonResistance: 72,
    releaseResistance: 62,
    holdUntilAdministered: false,
    portalReserve: 0,
    reinforcePortalAtEscalation: 75
  },
  balanced: {
    attackRatio: 0.82,
    joinRatio: 0.64,
    garrisonResistance: 46,
    releaseResistance: 36,
    holdUntilAdministered: false,
    portalReserve: 1,
    reinforcePortalAtEscalation: 62
  },
  cautious: {
    attackRatio: 1.02,
    joinRatio: 0.82,
    garrisonResistance: 30,
    releaseResistance: 24,
    holdUntilAdministered: true,
    portalReserve: 1,
    reinforcePortalAtEscalation: 45
  }
};

const totalPersonnel = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.personnel, 0);
const totalFunctionalArmour = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.functionalArmour, 0);
const totalDamagedArmour = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.damagedArmour, 0);
const localGroups = (state: GameState, territoryId: string) => Object.values(state.taskGroups)
  .filter(group => group.location === territoryId && group.personnel > 0);
const frontier = (state: GameState, territoryId: string) => state.territories[territoryId]?.controller === 'player'
  && TERRITORIES[territoryId].neighbours.some(id => state.territories[id]?.controller === 'enemy');

const combatPower = (group: TaskGroup) => {
  const deployableArmour = Math.min(group.functionalArmour, group.personnel);
  return (group.personnel / 1000 * 4.1 + deployableArmour / 1000 * 1.9)
    * (0.58 + group.morale / 150)
    * (0.55 + group.supply / 190);
};

function portalReserveIds(state: GameState, policy: BalancePolicyId): Set<string> {
  if (!frontier(state, state.portalTerritory)) return new Set<string>();
  const profile = POLICY[policy];
  const plannedPortalAttack = state.enemyOrders.some(order => (
    order.type === 'counterattack'
    && order.target === state.portalTerritory
    && order.status !== 'completed'
  ));

  let reserveCount = profile.portalReserve;
  if (plannedPortalAttack || state.escalation >= profile.reinforcePortalAtEscalation) reserveCount = Math.max(reserveCount, 1) as 0 | 1;
  if (policy === 'cautious' && (plannedPortalAttack || state.escalation >= 65)) reserveCount = 2 as never;
  if (!reserveCount) return new Set<string>();

  const candidates = localGroups(state, state.portalTerritory)
    .filter(group => !group.order && (group.status === 'ready' || group.status === 'garrison'))
    .sort((first, second) => combatPower(first) - combatPower(second) || first.id.localeCompare(second.id));
  return new Set(candidates.slice(0, reserveCount).map(group => group.id));
}

function releaseGarrison(state: GameState, group: TaskGroup, profile: PolicyProfile, reserved: Set<string>): boolean {
  if (group.status !== 'garrison' || reserved.has(group.id)) return false;
  const territory = state.territories[group.location];
  if (!territory) return false;
  if (profile.holdUntilAdministered) {
    return territory.occupation === 'administered' && territory.resistance <= profile.releaseResistance;
  }
  return territory.occupation !== 'unsecured'
    && territory.resistance <= profile.releaseResistance
    && (!frontier(state, group.location) || localGroups(state, group.location).length > 1);
}

function assignGarrison(state: GameState, group: TaskGroup, profile: PolicyProfile): boolean {
  if (group.status !== 'ready' || group.location === state.portalTerritory) return false;
  const territory = state.territories[group.location];
  if (!territory || territory.controller !== 'player') return false;
  if (localGroups(state, group.location).some(candidate => candidate.id !== group.id && candidate.status === 'garrison')) return false;
  if (territory.occupation === 'unsecured') return true;
  if (profile.holdUntilAdministered && territory.occupation !== 'administered') {
    return territory.resistance >= profile.garrisonResistance;
  }
  return territory.occupation === 'contested' && territory.resistance >= profile.garrisonResistance;
}

function operationPower(state: GameState, targetId: string): number {
  const operation = getOperationAtTarget(state, targetId);
  if (!operation) return 0;
  return operation.participantGroupIds.reduce((sum, groupId) => {
    const group = state.taskGroups[groupId];
    return sum + (group ? combatPower(group) : 0);
  }, 0);
}

function attackTarget(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const profile = POLICY[policy];
  const candidates = getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'enemy')
    .map(id => {
      const operation = getOperationAtTarget(state, id);
      const ratio = (combatPower(group) + operationPower(state, id)) / Math.max(1, enemyStrengthAt(state, id).power);
      const threshold = (operation ? profile.joinRatio : profile.attackRatio) + (TERRAIN_CAUTION[TERRITORIES[id].terrain] ?? 0);
      const score = ratio + TERRITORIES[id].supply * 0.06 + (operation ? 0.35 : 0);
      return { id, ratio, threshold, score };
    })
    .filter(candidate => candidate.ratio >= candidate.threshold)
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
  return candidates[0]?.id;
}

function distanceToFront(state: GameState, startId: string): number {
  if (frontier(state, startId)) return 0;
  const visited = new Set<string>([startId]);
  const queue: Array<{ id: string; distance: number }> = [{ id: startId, distance: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const neighbour of TERRITORIES[current.id].neighbours) {
      if (visited.has(neighbour) || state.territories[neighbour]?.controller !== 'player') continue;
      if (frontier(state, neighbour)) return current.distance + 1;
      visited.add(neighbour);
      queue.push({ id: neighbour, distance: current.distance + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}

function moveTarget(state: GameState, group: TaskGroup): string | undefined {
  const candidates = getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'player')
    .map(id => {
      const territory = state.territories[id];
      const distance = distanceToFront(state, id);
      const supply = territory.supplied ? 0.4 : -0.3;
      const occupation = territory.occupation === 'unsecured' ? 0.5 : territory.occupation === 'contested' ? 0.25 : 0;
      return { id, score: (Number.isFinite(distance) ? -distance : -99) + supply + occupation + TERRITORIES[id].supply * 0.03 };
    })
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
  return candidates[0]?.id;
}

function issueOrders(state: GameState, policy: BalancePolicyId, telemetry: ActionTelemetry): GameState {
  let next = state;
  const reserved = portalReserveIds(next, policy);
  if (reserved.size) telemetry.portalReserveTurns += 1;

  for (const groupId of Object.keys(next.taskGroups).sort()) {
    if (!next.taskGroups[groupId] || next.status !== 'playing') continue;
    next = selectTaskGroup(next, groupId);
    let group = next.taskGroups[groupId];
    if (!group) continue;

    if (reserved.has(groupId)) {
      if (group.status === 'ready') {
        next = setGarrison(next);
        telemetry.garrisonsAssigned += 1;
      }
      continue;
    }

    if (releaseGarrison(next, group, POLICY[policy], reserved)) {
      next = setGarrison(next);
      telemetry.garrisonsReleased += 1;
      group = next.taskGroups[groupId];
    }
    if (!canIssueOperationalOrder(group)) continue;

    if (assignGarrison(next, group, POLICY[policy])) {
      next = setGarrison(next);
      telemetry.garrisonsAssigned += 1;
      continue;
    }

    const attack = attackTarget(next, group, policy);
    if (attack) {
      const joining = Boolean(getOperationAtTarget(next, attack));
      next = selectTerritory(next, attack);
      const before = Object.keys(next.operations).length;
      next = beginOperation(next);
      const after = Object.keys(next.operations).length;
      if (joining) telemetry.operationsJoined += 1;
      else if (after > before) telemetry.operationsStarted += 1;
      continue;
    }

    const move = moveTarget(next, group);
    if (move && move !== group.location) {
      next = selectTerritory(next, move);
      const before = next.taskGroups[groupId]?.order;
      next = issueMove(next);
      if (!before && next.taskGroups[groupId]?.order?.type === 'move') telemetry.movesIssued += 1;
    }
  }
  return next;
}

function defeatCause(state: GameState): DefeatCause | undefined {
  if (state.status !== 'defeat') return undefined;
  if (state.territories[state.portalTerritory]?.controller !== 'player') return 'portal-lost';
  if (totalPersonnel(state) < 1200) return 'personnel-collapse';
  if (state.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(state.difficulty)) return 'operational-crisis';
  return 'unknown';
}

function supplyExposure(state: GameState) {
  let cutOff = 0;
  let critical = 0;
  for (const allocation of Object.values(state.logistics.formationAllocations)) {
    if (allocation.condition === 'cut-off') cutOff += 1;
    if (allocation.condition === 'critical' || allocation.condition === 'cut-off') critical += 1;
  }
  return { cutOff, critical };
}

export function simulateCurrentEngineCampaign(
  seed: number,
  difficulty: Difficulty,
  policy: BalancePolicyId,
  maxTurns = 120
): CampaignBalanceResult {
  let state = newGame(seed, difficulty, false);
  let maxEscalation = state.escalation;
  let minNetworkEfficiency = state.logistics.networkEfficiency;
  let maxOperationalCrisisTurns = state.enemyStrategy.operationalCrisisTurns;
  let captures = 0;
  let enemyRecaptures = 0;
  let cutOffFormationDays = 0;
  let criticalSupplyFormationDays = 0;
  const telemetry: ActionTelemetry = {
    operationsStarted: 0,
    operationsJoined: 0,
    movesIssued: 0,
    garrisonsAssigned: 0,
    garrisonsReleased: 0,
    portalReserveTurns: 0
  };

  while (state.status === 'playing' && state.turn < maxTurns) {
    state = issueOrders(state, policy, telemetry);
    const controllers = Object.fromEntries(
      Object.entries(state.territories).map(([id, territory]) => [id, territory.controller])
    );
    state = endTurn(state);
    for (const [id, territory] of Object.entries(state.territories)) {
      if (controllers[id] === 'enemy' && territory.controller === 'player') captures += 1;
      if (controllers[id] === 'player' && territory.controller === 'enemy') enemyRecaptures += 1;
    }
    const exposure = supplyExposure(state);
    cutOffFormationDays += exposure.cutOff;
    criticalSupplyFormationDays += exposure.critical;
    maxEscalation = Math.max(maxEscalation, state.escalation);
    minNetworkEfficiency = Math.min(minNetworkEfficiency, state.logistics.networkEfficiency);
    maxOperationalCrisisTurns = Math.max(maxOperationalCrisisTurns, state.enemyStrategy.operationalCrisisTurns);
  }

  const activePersonnel = totalPersonnel(state);
  const woundedPool = state.woundedPool;
  const functionalArmour = totalFunctionalArmour(state);
  const outcome: BalanceOutcome = state.status === 'playing' ? 'timeout' : state.status;

  return {
    seed,
    portalTerritory: state.portalTerritory,
    difficulty,
    policy,
    outcome,
    defeatCause: defeatCause(state),
    finalTurn: state.turn,
    controlledTerritories: Object.values(state.territories).filter(territory => territory.controller === 'player').length,
    administeredTerritories: Object.values(state.territories).filter(territory => territory.occupation === 'administered').length,
    unsecuredTerritories: Object.values(state.territories).filter(territory => territory.occupation === 'unsecured').length,
    activePersonnel,
    woundedPool,
    permanentLossEstimate: Math.max(0, STARTING_PERSONNEL - activePersonnel - woundedPool),
    functionalArmour,
    damagedArmour: totalDamagedArmour(state),
    functionalArmourPercentOfStart: Math.round(functionalArmour / STARTING_FUNCTIONAL_ARMOUR * 1000) / 10,
    maxEscalation: Math.round(maxEscalation * 10) / 10,
    minNetworkEfficiency,
    maxOperationalCrisisTurns,
    captures,
    enemyRecaptures,
    infrastructureIncidents: state.infrastructureIncidents?.length ?? 0,
    cutOffFormationDays,
    criticalSupplyFormationDays,
    ...telemetry
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const average = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function groupSummary(
  results: CampaignBalanceResult[],
  difficulty: Difficulty,
  policy: BalancePolicyId
): BalanceGroupSummary {
  const victories = results.filter(result => result.outcome === 'victory');
  const defeats = results.filter(result => result.outcome === 'defeat');
  const timeouts = results.filter(result => result.outcome === 'timeout');
  const defeatCauses: Record<DefeatCause, number> = {
    'portal-lost': 0,
    'personnel-collapse': 0,
    'operational-crisis': 0,
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
    averagePortalReserveTurns: round1(average(results.map(result => result.portalReserveTurns))),
    defeatCauses
  };
}

function portalSummary(
  results: CampaignBalanceResult[],
  difficulty: Difficulty,
  policy: BalancePolicyId,
  portalTerritory: string
): PortalBalanceSummary {
  return {
    difficulty,
    policy,
    portalTerritory,
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
  const difficulties: Difficulty[] = options.difficulties?.length
    ? [...options.difficulties]
    : [...DEFAULT_DIFFICULTIES];
  const policies: BalancePolicyId[] = options.policies?.length
    ? [...options.policies]
    : [...DEFAULT_POLICIES];
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
  const portalSummaries = difficulties.flatMap(difficulty => policies.flatMap(policy => SLICE_IDS.map(portalTerritory => portalSummary(
    results.filter(result => (
      result.difficulty === difficulty
      && result.policy === policy
      && result.portalTerritory === portalTerritory
    )),
    difficulty,
    policy,
    portalTerritory
  ))));

  return {
    engineSaveVersion: 14,
    territoryCount: SLICE_IDS.length,
    options: { runsPerStart, maxTurns, seedOffset, difficulties, policies },
    campaigns: results.length,
    summaries,
    portalSummaries,
    results
  };
}

export function renderCurrentEngineBalanceMarkdown(report: CurrentEngineBalanceReport): string {
  const lines = [
    '# Future Conquest current-engine balance simulation',
    '',
    `Campaigns: ${report.campaigns} across ${report.territoryCount} portal starts. Maximum campaign day: ${report.options.maxTurns}.`,
    '',
    '## Difficulty and policy summary',
    '',
    '| Difficulty | Policy | Runs | Victory | Defeat | Timeout | Portal loss | Crisis loss | Median victory day | Median territory control | Median personnel | Functional armour | Median minimum network | Avg enemy recaptures |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];

  for (const summary of report.summaries) {
    lines.push(`| ${summary.difficulty} | ${summary.policy} | ${summary.campaigns} | ${summary.victoryRate}% | ${summary.defeatRate}% | ${summary.timeoutRate}% | ${summary.defeatCauses['portal-lost']} | ${summary.defeatCauses['operational-crisis']} | ${summary.medianVictoryTurn ?? 'n/a'} | ${summary.medianControlledTerritories} | ${summary.medianActivePersonnel} | ${summary.medianFunctionalArmourPercentOfStart}% | ${summary.medianMinNetworkEfficiency}% | ${summary.averageEnemyRecaptures} |`);
  }

  const starts = report.portalSummaries
    .filter(summary => summary.difficulty === 'standard' && summary.policy === 'balanced')
    .sort((first, second) => first.victoryRate - second.victoryRate || second.medianFinalTurn - first.medianFinalTurn);
  if (starts.length) {
    lines.push(
      '',
      '## Standard / balanced portal sensitivity',
      '',
      '| Portal | Victory | Median final day | Median personnel | Avg enemy recaptures |',
      '| --- | ---: | ---: | ---: | ---: |'
    );
    for (const summary of starts) {
      lines.push(`| ${TERRITORIES[summary.portalTerritory].centre} (${summary.portalTerritory}) | ${summary.victoryRate}% | ${summary.medianFinalTurn} | ${summary.medianActivePersonnel} | ${summary.averageEnemyRecaptures} |`);
    }
  }

  lines.push(
    '',
    '## Interpretation boundary',
    '',
    '- These are deterministic heuristic player doctrines driving the real current playable engine through its public order functions.',
    '- Aggressive play accepts an exposed portal unless an explicit attack is already forming; balanced play holds one portal reserve; cautious play can hold two under high pressure.',
    '- They are comparative balance probes, not predictions of human win rate.',
    '- The bots currently use movement, attack and garrison orders. Manual engineering, interdiction and logistics-priority optimisation are deliberately excluded from this first baseline.',
    '- If every sensible doctrine wins easily, the campaign is probably too forgiving. If cautious play loses frequently, pressure is probably too high.'
  );
  return `${lines.join('\n')}\n`;
}
