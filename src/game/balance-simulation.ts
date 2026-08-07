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
import {
  engineeringGroupsForRoute,
  repairableEngineeringRoutes,
  startEngineeringProject
} from './engineering-projects';
import { crisisLimitForDifficulty } from './enemy-strategy';
import { occupationRequirement, splitFormation } from './formation-organisation';
import { getAdjacentOrderTargets } from './order-targeting';
import {
  setFormationLogisticsPriority,
  setTerritoryLogisticsPriority
} from './supply-network';
import type { Difficulty, GameState, TaskGroup } from './types';

export type BalancePolicyId = 'aggressive' | 'balanced' | 'cautious' | 'managed';
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
  engineeringProjectsStarted: number;
  formationsSplit: number;
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
  averageEngineeringProjectsStarted: number;
  averageFormationsSplit: number;
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
  portalReserve: number;
  reinforcePortalAtEscalation: number;
  maxOperationParticipants: number;
  maxConcurrentOperations: number;
  minimumAttackDeliveryRatio: number;
  minimumAttackSupplyStock: number;
  requireStableStaging: boolean;
  specialistManagement: boolean;
}

interface ActionTelemetry {
  operationsStarted: number;
  operationsJoined: number;
  movesIssued: number;
  garrisonsAssigned: number;
  garrisonsReleased: number;
  portalReserveTurns: number;
  engineeringProjectsStarted: number;
  formationsSplit: number;
}

const STARTING_PERSONNEL = 10_000;
const STARTING_FUNCTIONAL_ARMOUR = 9_000;
const DEFAULT_DIFFICULTIES: Difficulty[] = ['story', 'standard', 'hard'];
const DEFAULT_POLICIES: BalancePolicyId[] = ['aggressive', 'balanced', 'cautious', 'managed'];
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
    reinforcePortalAtEscalation: 75,
    maxOperationParticipants: 4,
    maxConcurrentOperations: 3,
    minimumAttackDeliveryRatio: 0.2,
    minimumAttackSupplyStock: 22,
    requireStableStaging: false,
    specialistManagement: false
  },
  balanced: {
    attackRatio: 0.82,
    joinRatio: 0.64,
    garrisonResistance: 38,
    releaseResistance: 32,
    holdUntilAdministered: false,
    portalReserve: 1,
    reinforcePortalAtEscalation: 62,
    maxOperationParticipants: 2,
    maxConcurrentOperations: 2,
    minimumAttackDeliveryRatio: 0.55,
    minimumAttackSupplyStock: 48,
    requireStableStaging: false,
    specialistManagement: false
  },
  cautious: {
    attackRatio: 1.02,
    joinRatio: 0.82,
    garrisonResistance: 26,
    releaseResistance: 22,
    holdUntilAdministered: true,
    portalReserve: 1,
    reinforcePortalAtEscalation: 45,
    maxOperationParticipants: 2,
    maxConcurrentOperations: 1,
    minimumAttackDeliveryRatio: 0.7,
    minimumAttackSupplyStock: 62,
    requireStableStaging: false,
    specialistManagement: false
  },
  managed: {
    attackRatio: 0.96,
    joinRatio: 0.76,
    garrisonResistance: 24,
    releaseResistance: 20,
    holdUntilAdministered: true,
    portalReserve: 1,
    reinforcePortalAtEscalation: 45,
    maxOperationParticipants: 2,
    maxConcurrentOperations: 1,
    minimumAttackDeliveryRatio: 0.65,
    minimumAttackSupplyStock: 58,
    requireStableStaging: true,
    specialistManagement: true
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
const stableStaging = (state: GameState, territoryId: string) => (
  territoryId === state.portalTerritory
  || state.territories[territoryId]?.occupation === 'controlled'
  || state.territories[territoryId]?.occupation === 'administered'
);

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
  if (plannedPortalAttack || state.escalation >= profile.reinforcePortalAtEscalation) {
    reserveCount = Math.max(reserveCount, 1);
  }
  if ((policy === 'cautious' || policy === 'managed') && (plannedPortalAttack || state.escalation >= 65)) {
    reserveCount = 2;
  }
  if (reserveCount <= 0) return new Set<string>();

  const candidates = localGroups(state, state.portalTerritory)
    .filter(group => !group.order && (group.status === 'ready' || group.status === 'garrison'))
    .sort((first, second) => combatPower(first) - combatPower(second) || first.id.localeCompare(second.id));
  return new Set(candidates.slice(0, reserveCount).map(group => group.id));
}

function releaseGarrison(
  state: GameState,
  group: TaskGroup,
  profile: PolicyProfile,
  reserved: Set<string>
): boolean {
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

function formationCanAttack(state: GameState, group: TaskGroup, profile: PolicyProfile): boolean {
  const allocation = state.logistics.formationAllocations[group.id];
  const deliveryRatio = allocation ? allocation.ratio / 100 : 1;
  if (profile.requireStableStaging && !stableStaging(state, group.location)) return false;
  return group.supply >= profile.minimumAttackSupplyStock
    && deliveryRatio >= profile.minimumAttackDeliveryRatio;
}

function attackTarget(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const profile = POLICY[policy];
  if (!formationCanAttack(state, group, profile)) return undefined;

  const candidates = getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'enemy')
    .map(id => {
      const operation = getOperationAtTarget(state, id);
      if (operation && operation.participantGroupIds.length >= profile.maxOperationParticipants) return null;
      if (!operation && Object.keys(state.operations).length >= profile.maxConcurrentOperations) return null;
      const ratio = (combatPower(group) + operationPower(state, id)) / Math.max(1, enemyStrengthAt(state, id).power);
      const threshold = (operation ? profile.joinRatio : profile.attackRatio)
        + (TERRAIN_CAUTION[TERRITORIES[id].terrain] ?? 0);
      const score = ratio + TERRITORIES[id].supply * 0.06 + (operation ? 0.22 : 0);
      return { id, ratio, threshold, score };
    })
    .filter((candidate): candidate is { id: string; ratio: number; threshold: number; score: number } => Boolean(candidate))
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

function moveTarget(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const profile = POLICY[policy];
  if (profile.requireStableStaging && !stableStaging(state, group.location)) return undefined;
  const allocation = state.logistics.formationAllocations[group.id];
  const currentDelivery = allocation ? allocation.ratio / 100 : 1;
  const underPressure = group.supply < profile.minimumAttackSupplyStock
    || currentDelivery < profile.minimumAttackDeliveryRatio;

  const candidates = getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'player')
    .map(id => {
      const territory = state.territories[id];
      const distance = distanceToFront(state, id);
      const supplyAllocation = state.logistics.territoryAllocations[id];
      const delivery = supplyAllocation?.ratio ?? (territory.supplied ? 100 : 0);
      const supplyScore = delivery / 100 * (underPressure ? 2.2 : 0.7);
      const occupation = territory.occupation === 'unsecured' ? 0.55 : territory.occupation === 'contested' ? 0.25 : 0;
      const frontScore = Number.isFinite(distance) ? -distance * (underPressure ? 0.25 : 1) : -99;
      const portalRecovery = underPressure && id === state.portalTerritory ? 1.2 : 0;
      return {
        id,
        score: frontScore + supplyScore + occupation + portalRecovery + TERRITORIES[id].supply * 0.03
      };
    })
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
  return candidates[0]?.id;
}

function splitManagedGarrison(
  state: GameState,
  source: TaskGroup,
  name: string,
  personnel: number,
  telemetry: ActionTelemetry
): GameState {
  const size = Math.min(personnel, Math.max(0, source.personnel - 800));
  if (size < 250) return state;
  const functionalArmour = Math.min(source.functionalArmour, Math.round(size * 0.68));
  const damagedArmour = Math.min(source.damagedArmour, Math.round(size * 0.06));
  const beforeCount = Object.keys(state.taskGroups).length;
  let next = splitFormation(state, {
    sourceId: source.id,
    name,
    personnel: size,
    functionalArmour,
    damagedArmour
  });
  if (Object.keys(next.taskGroups).length <= beforeCount) return state;
  telemetry.formationsSplit += 1;
  next = setGarrison(next);
  telemetry.garrisonsAssigned += 1;
  return next;
}

function createManagedGarrisonDetachments(state: GameState, telemetry: ActionTelemetry): GameState {
  let next = state;

  if (frontier(next, next.portalTerritory)) {
    const portalGroups = localGroups(next, next.portalTerritory);
    const hasPortalGarrison = portalGroups.some(group => group.status === 'garrison');
    if (!hasPortalGarrison) {
      const source = portalGroups
        .filter(group => group.status === 'ready' && !group.order && group.personnel >= 1700)
        .sort((first, second) => combatPower(first) - combatPower(second) || first.id.localeCompare(second.id))[0];
      if (source) next = splitManagedGarrison(next, source, `Portal Guard ${next.turn}`, 900, telemetry);
    }
  }

  for (const territoryId of Object.keys(next.territories).sort()) {
    if (territoryId === next.portalTerritory) continue;
    const territory = next.territories[territoryId];
    if (territory.controller !== 'player' || territory.occupation === 'administered') continue;
    if (localGroups(next, territoryId).some(group => group.status === 'garrison')) continue;
    const source = localGroups(next, territoryId)
      .filter(group => group.status === 'ready' && !group.order && group.personnel >= 1500)
      .sort((first, second) => second.personnel - first.personnel || first.id.localeCompare(second.id))[0];
    if (!source) continue;
    const desired = Math.min(1100, Math.max(750, Math.round(occupationRequirement(territoryId) * 0.7)));
    next = splitManagedGarrison(next, source, `${TERRITORIES[territoryId].centre} Security ${next.turn}`, desired, telemetry);
  }
  return next;
}

function applyManagedPriorities(state: GameState): GameState {
  let next = state;
  for (const territoryId of Object.keys(next.territories).sort()) {
    const territory = next.territories[territoryId];
    if (territory.controller !== 'player') continue;
    const desired = territoryId === next.portalTerritory
      ? 'critical'
      : frontier(next, territoryId) || territory.occupation === 'contested'
        ? 'high'
        : territory.occupation === 'administered'
          ? 'restricted'
          : 'standard';
    next = setTerritoryLogisticsPriority(next, territoryId, desired);
  }
  for (const groupId of Object.keys(next.taskGroups).sort()) {
    const group = next.taskGroups[groupId];
    if (!group || group.personnel <= 0) continue;
    const desired = group.location === next.portalTerritory
      ? 'high'
      : group.status === 'garrison' && frontier(next, group.location)
        ? 'high'
        : 'automatic';
    next = setFormationLogisticsPriority(next, groupId, desired);
  }
  return next;
}

function startManagedEngineering(state: GameState, telemetry: ActionTelemetry): GameState {
  if (state.engineeringProjects.some(project => project.status === 'active')) return state;
  const candidates = repairableEngineeringRoutes(state)
    .filter(route => (
      state.routeStates[route.id].condition <= 72
      || state.logistics.bottleneckRouteIds.includes(route.id)
    ))
    .map(route => {
      const routeState = state.routeStates[route.id];
      const portalRoute = route.fromTerritoryId === state.portalTerritory || route.toTerritoryId === state.portalTerritory;
      const score = (100 - routeState.condition)
        + (state.logistics.bottleneckRouteIds.includes(route.id) ? 42 : 0)
        + (portalRoute ? 30 : 0);
      return { route, score };
    })
    .sort((first, second) => second.score - first.score || first.route.id.localeCompare(second.route.id));
  const selected = candidates[0]?.route;
  if (!selected) return state;

  const groups = engineeringGroupsForRoute(state, selected.id)
    .sort((first, second) => {
      const firstFrontlineGarrison = first.status === 'garrison' && frontier(state, first.location) ? 1 : 0;
      const secondFrontlineGarrison = second.status === 'garrison' && frontier(state, second.location) ? 1 : 0;
      return firstFrontlineGarrison - secondFrontlineGarrison
        || combatPower(first) - combatPower(second)
        || first.id.localeCompare(second.id);
    });
  const group = groups[0];
  if (!group) return state;
  const allocation = state.logistics.networkEfficiency >= 70 ? 75 : 50;
  const next = startEngineeringProject(state, selected.id, group.id, allocation);
  if (next !== state) telemetry.engineeringProjectsStarted += 1;
  return next;
}

function prepareSpecialists(state: GameState, policy: BalancePolicyId, telemetry: ActionTelemetry): GameState {
  if (!POLICY[policy].specialistManagement) return state;
  let next = createManagedGarrisonDetachments(state, telemetry);
  next = applyManagedPriorities(next);
  if (next.turn >= 5) next = startManagedEngineering(next, telemetry);
  return next;
}

function issueOrders(state: GameState, policy: BalancePolicyId, telemetry: ActionTelemetry): GameState {
  let next = prepareSpecialists(state, policy, telemetry);
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

    if (group.status === 'garrison') {
      if (releaseGarrison(next, group, POLICY[policy], reserved)) {
        next = setGarrison(next);
        telemetry.garrisonsReleased += 1;
        group = next.taskGroups[groupId];
      } else {
        continue;
      }
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

    const move = moveTarget(next, group, policy);
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
    portalReserveTurns: 0,
    engineeringProjectsStarted: 0,
    formationsSplit: 0
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
    averageEngineeringProjectsStarted: round1(average(results.map(result => result.engineeringProjectsStarted))),
    averageFormationsSplit: round1(average(results.map(result => result.formationsSplit))),
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
    '| Difficulty | Policy | Runs | Victory | Defeat | Timeout | Portal loss | Crisis loss | Median victory day | Median territory control | Median personnel | Functional armour | Median minimum network | Avg recaptures | Avg engineering | Avg splits |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];

  for (const summary of report.summaries) {
    lines.push(`| ${summary.difficulty} | ${summary.policy} | ${summary.campaigns} | ${summary.victoryRate}% | ${summary.defeatRate}% | ${summary.timeoutRate}% | ${summary.defeatCauses['portal-lost']} | ${summary.defeatCauses['operational-crisis']} | ${summary.medianVictoryTurn ?? 'n/a'} | ${summary.medianControlledTerritories} | ${summary.medianActivePersonnel} | ${summary.medianFunctionalArmourPercentOfStart}% | ${summary.medianMinNetworkEfficiency}% | ${summary.averageEnemyRecaptures} | ${summary.averageEngineeringProjectsStarted} | ${summary.averageFormationsSplit} |`);
  }

  const starts = report.portalSummaries
    .filter(summary => summary.difficulty === 'standard' && summary.policy === 'managed')
    .sort((first, second) => first.victoryRate - second.victoryRate || second.medianFinalTurn - first.medianFinalTurn);
  if (starts.length) {
    lines.push(
      '',
      '## Standard / managed portal sensitivity',
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
    '- Aggressive play accepts an exposed portal and severe logistics risk; balanced play holds a reserve and limits stacking; cautious play limits itself to one operation at a time; managed play additionally creates reusable garrison detachments, waits for stable occupation, sets logistics priorities and repairs damaged controlled corridors.',
    '- Garrisons remain on defensive duty until their doctrine explicitly releases them; the harness does not silently recycle a garrison into an attack.',
    '- They are comparative balance probes, not predictions of human win rate.',
    '- Player interdiction is deliberately excluded because it is an offensive option rather than a prerequisite for basic campaign viability.',
    '- If managed play still cannot progress, the next step is to inspect specific campaign traces before changing game balance.'
  );
  return `${lines.join('\n')}\n`;
}
