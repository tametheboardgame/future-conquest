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
  medianActivePersonnel: number;
  medianPermanentLossEstimate: number;
  medianFunctionalArmourPercentOfStart: number;
  medianMaxEscalation: number;
  medianMinNetworkEfficiency: number;
  averageEnemyRecaptures: number;
  averageInfrastructureIncidents: number;
  averageCutOffFormationDays: number;
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
  options: Required<Pick<BalanceSimulationOptions, 'runsPerStart' | 'maxTurns' | 'seedOffset'>> & {
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
  protectPortalAtEscalation: number;
}

interface ActionTelemetry {
  operationsStarted: number;
  operationsJoined: number;
  movesIssued: number;
  garrisonsAssigned: number;
  garrisonsReleased: number;
}

const STARTING_PERSONNEL = 10_000;
const STARTING_FUNCTIONAL_ARMOUR = 9_000;
const TERRAIN_ATTACK_CAUTION: Record<string, number> = {
  'open-lowland': 0,
  'mixed-lowland': 0.03,
  'mixed-upland': 0.08,
  mountainous: 0.16
};

const POLICY_PROFILES: Record<BalancePolicyId, PolicyProfile> = {
  aggressive: {
    attackRatio: 0.58,
    joinRatio: 0.45,
    garrisonResistance: 72,
    releaseResistance: 62,
    holdUntilAdministered: false,
    protectPortalAtEscalation: 88
  },
  balanced: {
    attackRatio: 0.82,
    joinRatio: 0.64,
    garrisonResistance: 46,
    releaseResistance: 36,
    holdUntilAdministered: false,
    protectPortalAtEscalation: 58
  },
  cautious: {
    attackRatio: 1.02,
    joinRatio: 0.82,
    garrisonResistance: 30,
    releaseResistance: 24,
    holdUntilAdministered: true,
    protectPortalAtEscalation: 42
  }
};

const totalPersonnel = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.personnel, 0);

const totalFunctionalArmour = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.functionalArmour, 0);

const totalDamagedArmour = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.damagedArmour, 0);

const groupCombatPower = (group: TaskGroup) => {
  const deployableArmour = Math.min(group.functionalArmour, group.personnel);
  return (
    (group.personnel / 1000 * 4.1 + deployableArmour / 1000 * 1.9)
    * (0.58 + group.morale / 150)
    * (0.55 + group.supply / 190)
  );
};

const localFriendlyGroups = (state: GameState, territoryId: string) => Object.values(state.taskGroups)
  .filter(group => group.location === territoryId && group.personnel > 0);

const frontierTerritory = (state: GameState, territoryId: string) => (
  state.territories[territoryId]?.controller === 'player'
  && TERRITORIES[territoryId].neighbours.some(id => state.territories[id]?.controller === 'enemy')
);

function shouldReleaseGarrison(state: GameState, group: TaskGroup, profile: PolicyProfile): boolean {
  if (group.status !== 'garrison') return false;
  const territory = state.territories[group.location];
  if (!territory) return false;

  if (group.location === state.portalTerritory) {
    const otherPortalGarrison = localFriendlyGroups(state, group.location)
      .some(candidate => candidate.id !== group.id && candidate.status === 'garrison');
    if (!otherPortalGarrison && state.escalation >= profile.protectPortalAtEscalation) return false;
  }

  if (profile.holdUntilAdministered) {
    return territory.occupation === 'administered' && territory.resistance <= profile.releaseResistance;
  }
  return (
    territory.occupation !== 'unsecured'
    && territory.resistance <= profile.releaseResistance
    && (!frontierTerritory(state, group.location) || localFriendlyGroups(state, group.location).length > 1)
  );
}

function shouldAssignGarrison(state: GameState, group: TaskGroup, profile: PolicyProfile): boolean {
  if (group.status !== 'ready') return false;
  const territory = state.territories[group.location];
  if (!territory || territory.controller !== 'player') return false;
  const existingGarrison = localFriendlyGroups(state, group.location)
    .some(candidate => candidate.id !== group.id && candidate.status === 'garrison');
  if (existingGarrison) return false;

  if (group.location === state.portalTerritory) {
    const controlled = Object.values(state.territories).filter(candidate => candidate.controller === 'player').length;
    return controlled >= 4 && state.escalation >= profile.protectPortalAtEscalation;
  }

  if (territory.occupation === 'unsecured') return true;
  if (profile.holdUntilAdministered && territory.occupation !== 'administered') {
    return territory.resistance >= profile.garrisonResistance;
  }
  return territory.occupation === 'contested' && territory.resistance >= profile.garrisonResistance;
}

function combinedOperationPower(state: GameState, targetId: string): number {
  const operation = getOperationAtTarget(state, targetId);
  if (!operation) return 0;
  return operation.participantGroupIds.reduce((sum, groupId) => {
    const group = state.taskGroups[groupId];
    return sum + (group ? groupCombatPower(group) : 0);
  }, 0);
}

function chooseAttackTarget(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const profile = POLICY_PROFILES[policy];
  const candidates = getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'enemy');
  if (!candidates.length) return undefined;

  const scored = candidates.map(id => {
    const defenderPower = enemyStrengthAt(state, id).power;
    const existingPower = combinedOperationPower(state, id);
    const totalAttackPower = groupCombatPower(group) + existingPower;
    const ratio = totalAttackPower / Math.max(1, defenderPower);
    const operation = getOperationAtTarget(state, id);
    const terrainCaution = TERRAIN_ATTACK_CAUTION[TERRITORIES[id].terrain] ?? 0;
    const threshold = (operation ? profile.joinRatio : profile.attackRatio) + terrainCaution;
    const strategicValue = TERRITORIES[id].supply * 0.06;
    const operationBonus = operation ? 0.35 : 0;
    return { id, ratio, threshold, score: ratio + strategicValue + operationBonus };
  }).filter(candidate => candidate.ratio >= candidate.threshold);

  scored.sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
  return scored[0]?.id;
}

function distanceToEnemyFront(state: GameState, startId: string): number {
  if (state.territories[startId]?.controller !== 'player') return Number.POSITIVE_INFINITY;
  if (frontierTerritory(state, startId)) return 0;
  const visited = new Set([startId]);
  const queue: Array<{ id: string; distance: number }> = [{ id: startId, distance: 0 }];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbour of TERRITORIES[current.id].neighbours) {
      if (visited.has(neighbour) || state.territories[neighbour]?.controller !== 'player') continue;
      if (frontierTerritory(state, neighbour)) return current.distance + 1;
      visited.add(neighbour);
      queue.push({ id: neighbour, distance: current.distance + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}

function chooseMoveTarget(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const candidates = getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'player');
  if (!candidates.length) return undefined;

  const scored = candidates.map(id => {
    const distance = distanceToEnemyFront(state, id);
    const territory = state.territories[id];
    const supplyBonus = territory.supplied ? 0.4 : -0.3;
    const occupationBonus = territory.occupation === 'unsecured' ? 0.5 : territory.occupation === 'contested' ? 0.25 : 0;
    const portalPenalty = id === state.portalTerritory && state.escalation >= POLICY_PROFILES[policy].protectPortalAtEscalation ? -0.6 : 0;
    return {
      id,
      score: (Number.isFinite(distance) ? -distance : -99) + supplyBonus + occupationBonus + portalPenalty + TERRITORIES[id].supply * 0.03
    };
  });
  scored.sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
  return scored[0]?.id;
}

function issueAutomatedOrders(state: GameState, policy: BalancePolicyId, telemetry: ActionTelemetry): GameState {
  let next = state;
  const groupIds = Object.keys(next.taskGroups).sort();

  for (const groupId of groupIds) {
    if (next.status !== 'playing') break;
    if (!next.taskGroups[groupId]) continue;
    next = selectTaskGroup(next, groupId);
    let group = next.taskGroups[groupId];
    if (!group) continue;

    if (shouldReleaseGarrison(next, group, POLICY_PROFILES[policy])) {
      next = setGarrison(next);
      telemetry.garrisonsReleased += 1;
      group = next.taskGroups[groupId];
    }

    if (!canIssueOperationalOrder(group)) continue;

    if (shouldAssignGarrison(next, group, POLICY_PROFILES[policy])) {
      next = setGarrison(next);
      telemetry.garrisonsAssigned += 1;
      continue;
    }

    const attackTarget = chooseAttackTarget(next, group, policy);
    if (attackTarget) {
      const joining = Boolean(getOperationAtTarget(next, attackTarget));
      next = selectTerritory(next, attackTarget);
      const beforeOperationCount = Object.keys(next.operations).length;
      next = beginOperation(next);
      const afterOperationCount = Object.keys(next.operations).length;
      if (joining) telemetry.operationsJoined += 1;
      else if (afterOperationCount > beforeOperationCount) telemetry.operationsStarted += 1;
      continue;
    }

    const moveTarget = chooseMoveTarget(next, group, policy);
    if (moveTarget && moveTarget !== group.location) {
      next = selectTerritory(next, moveTarget);
      const beforeOrder = next.taskGroups[groupId]?.order;
      next = issueMove(next);
      if (!beforeOrder && next.taskGroups[groupId]?.order?.type === 'move') telemetry.movesIssued += 1;
    }
  }

  return next;
}

function defeatCauseFor(state: GameState): DefeatCause | undefined {
  if (state.status !== 'defeat') return undefined;
  if (state.territories[state.portalTerritory]?.controller !== 'player') return 'portal-lost';
  if (totalPersonnel(state) < 1200) return 'personnel-collapse';
  if (state.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(state.difficulty)) return 'operational-crisis';
  return 'unknown';
}

function countSupplyDays(state: GameState) {
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
    garrisonsReleased: 0
  };

  while (state.status === 'playing' && state.turn < maxTurns) {
    state = issueAutomatedOrders(state, policy, telemetry);
    const controllersBefore = Object.fromEntries(Object.entries(state.territories).map(([id, territory]) => [id, territory.controller]));
    state = endTurn(state);

    for (const [id, territory] of Object.entries(state.territories)) {
      if (controllersBefore[id] === 'enemy' && territory.controller === 'player') captures += 1;
      if (controllersBefore[id] === 'player' && territory.controller === 'enemy') enemyRecaptures += 1;
    }

    const supplyDays = countSupplyDays(state);
    cutOffFormationDays += supplyDays.cutOff;
    criticalSupplyFormationDays += supplyDays.critical;
    maxEscalation = Math.max(maxEscalation, state.escalation);
    minNetworkEfficiency = Math.min(minNetworkEfficiency, state.logistics.networkEfficiency);
    maxOperationalCrisisTurns = Math.max(maxOperationalCrisisTurns, state.enemyStrategy.operationalCrisisTurns);
  }

  const activePersonnel = totalPersonnel(state);
  const woundedPool = state.woundedPool;
  const permanentLossEstimate = Math.max(0, STARTING_PERSONNEL - activePersonnel - woundedPool);
  const functionalArmour = totalFunctionalArmour(state);
  const damagedArmour = totalDamagedArmour(state);
  const controlledTerritories = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const administeredTerritories = Object.values(state.territories).filter(territory => territory.occupation === 'administered').length;
  const unsecuredTerritories = Object.values(state.territories).filter(territory => territory.occupation === 'unsecured').length;
  const outcome: BalanceOutcome = state.status === 'playing' ? 'timeout' : state.status;

  return {
    seed,
    portalTerritory: state.portalTerritory,
    difficulty,
    policy,
    outcome,
    defeatCause: defeatCauseFor(state),
    finalTurn: state.turn,
    controlledTerritories,
    administeredTerritories,
    unsecuredTerritories,
    activePersonnel,
    woundedPool,
    permanentLossEstimate,
    functionalArmour,
    damagedArmour,
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

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const average = (values: number[]): number => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;

const round1 = (value: number) => Math.round(value * 10) / 10;

function summariseGroup(results: CampaignBalanceResult[], difficulty: Difficulty, policy: BalancePolicyId): BalanceGroupSummary {
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
    medianActivePersonnel: Math.round(median(results.map(result => result.activePersonnel))),
    medianPermanentLossEstimate: Math.round(median(results.map(result => result.permanentLossEstimate))),
    medianFunctionalArmourPercentOfStart: round1(median(results.map(result => result.functionalArmourPercentOfStart))),
    medianMaxEscalation: round1(median(results.map(result => result.maxEscalation))),
    medianMinNetworkEfficiency: round1(median(results.map(result => result.minNetworkEfficiency))),
    averageEnemyRecaptures: round1(average(results.map(result => result.enemyRecaptures))),
    averageInfrastructureIncidents: round1(average(results.map(result => result.infrastructureIncidents))),
    averageCutOffFormationDays: round1(average(results.map(result => result.cutOffFormationDays))),
    defeatCauses
  };
}

function summarisePortal(results: CampaignBalanceResult[], difficulty: Difficulty, policy: BalancePolicyId, portalTerritory: string): PortalBalanceSummary {
  const victories = results.filter(result => result.outcome === 'victory').length;
  return {
    difficulty,
    policy,
    portalTerritory,
    campaigns: results.length,
    victoryRate: round1(victories / Math.max(1, results.length) * 100),
    medianFinalTurn: round1(median(results.map(result => result.finalTurn))),
    medianActivePersonnel: Math.round(median(results.map(result => result.activePersonnel))),
    averageEnemyRecaptures: round1(average(results.map(result => result.enemyRecaptures)))
  };
}

export function runCurrentEngineBalanceSimulation(options: BalanceSimulationOptions): CurrentEngineBalanceReport {
  const runsPerStart = Math.max(1, Math.round(options.runsPerStart));
  const maxTurns = Math.max(10, Math.round(options.maxTurns));
  const seedOffset = Math.max(0, Math.round(options.seedOffset ?? 1));
  const difficulties = options.difficulties?.length ? [...options.difficulties] : ['story', 'standard', 'hard'];
  const policies = options.policies?.length ? [...options.policies] : ['aggressive', 'balanced', 'cautious'];
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

  const summaries = difficulties.flatMap(difficulty => policies.map(policy => summariseGroup(
    results.filter(result => result.difficulty === difficulty && result.policy === policy),
    difficulty,
    policy
  )));

  const portalSummaries = difficulties.flatMap(difficulty => policies.flatMap(policy => SLICE_IDS.map(portalTerritory => summarisePortal(
    results.filter(result => result.difficulty === difficulty && result.policy === policy && result.portalTerritory === portalTerritory),
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
  const lines: string[] = [
    '# Future Conquest current-engine balance simulation',
    '',
    `Campaigns: ${report.campaigns} across ${report.territoryCount} portal starts. Maximum campaign day: ${report.options.maxTurns}.`,
    '',
    '## Difficulty and policy summary',
    '',
    '| Difficulty | Policy | Runs | Victory | Defeat | Timeout | Median victory day | Median personnel | Functional armour | Median minimum network | Avg enemy recaptures |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];

  for (const summary of report.summaries) {
    lines.push(`| ${summary.difficulty} | ${summary.policy} | ${summary.campaigns} | ${summary.victoryRate}% | ${summary.defeatRate}% | ${summary.timeoutRate}% | ${summary.medianVictoryTurn ?? 'n/a'} | ${summary.medianActivePersonnel} | ${summary.medianFunctionalArmourPercentOfStart}% | ${summary.medianMinNetworkEfficiency}% | ${summary.averageEnemyRecaptures} |`);
  }

  const standardBalanced = report.portalSummaries
    .filter(summary => summary.difficulty === 'standard' && summary.policy === 'balanced')
    .sort((first, second) => first.victoryRate - second.victoryRate || second.medianFinalTurn - first.medianFinalTurn);
  if (standardBalanced.length) {
    lines.push('', '## Standard / balanced portal sensitivity', '', '| Portal | Victory | Median final day | Median personnel | Avg enemy recaptures |', '| --- | ---: | ---: | ---: | ---: |');
    for (const summary of standardBalanced) {
      lines.push(`| ${TERRITORIES[summary.portalTerritory].centre} (${summary.portalTerritory}) | ${summary.victoryRate}% | ${summary.medianFinalTurn} | ${summary.medianActivePersonnel} | ${summary.averageEnemyRecaptures} |`);
    }
  }

  lines.push(
    '',
    '## Interpretation boundary',
    '',
    '- These are deterministic heuristic player doctrines driving the real current playable engine through its public order functions.',
    '- They are comparative balance probes, not predictions of human win rate.',
    '- The bots currently use movement, attack and garrison orders. Manual engineering, interdiction and logistics-priority optimisation are deliberately excluded from this first baseline.',
    '- A result that is trivial for every doctrine is strong evidence of an overly forgiving engine. A result that defeats even cautious play frequently is strong evidence of excessive pressure.'
  );

  return `${lines.join('\n')}\n`;
}
