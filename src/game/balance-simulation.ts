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
import { setFormationLogisticsPriority, setTerritoryLogisticsPriority } from './supply-network';
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
  portalReserve: number;
  maxOperationParticipants: number;
  maxConcurrentOperations: number;
  minimumAttackDeliveryRatio: number;
  minimumAttackSupplyStock: number;
  occupationHold: 'minimal' | 'controlled' | 'administered';
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
    portalReserve: 0,
    maxOperationParticipants: 4,
    maxConcurrentOperations: 3,
    minimumAttackDeliveryRatio: 0.2,
    minimumAttackSupplyStock: 22,
    occupationHold: 'minimal',
    specialistManagement: false
  },
  balanced: {
    attackRatio: 0.82,
    joinRatio: 0.64,
    portalReserve: 1,
    maxOperationParticipants: 2,
    maxConcurrentOperations: 2,
    minimumAttackDeliveryRatio: 0.52,
    minimumAttackSupplyStock: 46,
    occupationHold: 'controlled',
    specialistManagement: false
  },
  cautious: {
    attackRatio: 1.0,
    joinRatio: 0.8,
    portalReserve: 1,
    maxOperationParticipants: 2,
    maxConcurrentOperations: 1,
    minimumAttackDeliveryRatio: 0.68,
    minimumAttackSupplyStock: 58,
    occupationHold: 'administered',
    specialistManagement: false
  },
  managed: {
    attackRatio: 0.92,
    joinRatio: 0.72,
    portalReserve: 1,
    maxOperationParticipants: 2,
    maxConcurrentOperations: 1,
    minimumAttackDeliveryRatio: 0.62,
    minimumAttackSupplyStock: 54,
    occupationHold: 'administered',
    specialistManagement: true
  }
};

const totalPersonnel = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.personnel, 0);
const totalFunctionalArmour = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.functionalArmour, 0);
const totalDamagedArmour = (state: GameState) => Object.values(state.taskGroups)
  .reduce((sum, group) => sum + group.damagedArmour, 0);
const groupsAt = (state: GameState, territoryId: string) => Object.values(state.taskGroups)
  .filter(group => group.location === territoryId && group.personnel > 0);
const isFrontier = (state: GameState, territoryId: string) => state.territories[territoryId]?.controller === 'player'
  && TERRITORIES[territoryId].neighbours.some(id => state.territories[id]?.controller === 'enemy');
const isSecurityDetachment = (group: TaskGroup) => /Guard|Security/i.test(group.name) && group.personnel <= 1500;
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
  const profile = POLICY[policy];
  if (profile.portalReserve <= 0 || !isFrontier(state, state.portalTerritory)) return new Set<string>();
  const candidates = groupsAt(state, state.portalTerritory)
    .filter(group => !group.order && (group.status === 'ready' || group.status === 'garrison') && !isSecurityDetachment(group))
    .sort((first, second) => combatPower(first) - combatPower(second) || first.id.localeCompare(second.id));
  const fallback = candidates.length ? candidates : groupsAt(state, state.portalTerritory)
    .filter(group => !group.order && (group.status === 'ready' || group.status === 'garrison'))
    .sort((first, second) => combatPower(second) - combatPower(first) || first.id.localeCompare(second.id));
  return new Set(fallback.slice(0, profile.portalReserve).map(group => group.id));
}

function shouldHoldGarrison(state: GameState, group: TaskGroup, policy: BalancePolicyId, reserved: Set<string>): boolean {
  if (reserved.has(group.id)) return true;
  const territory = state.territories[group.location];
  if (!territory || territory.controller !== 'player') return false;
  if (group.location === state.portalTerritory && isSecurityDetachment(group)) return true;
  if (isSecurityDetachment(group)) {
    return isFrontier(state, group.location)
      || territory.occupation === 'unsecured'
      || territory.occupation === 'contested';
  }
  const hold = POLICY[policy].occupationHold;
  if (hold === 'minimal') return territory.occupation === 'unsecured';
  if (hold === 'controlled') return territory.occupation === 'unsecured' || territory.occupation === 'contested';
  return territory.occupation !== 'administered';
}

function shouldAssignWholeGarrison(state: GameState, group: TaskGroup, policy: BalancePolicyId): boolean {
  if (POLICY[policy].specialistManagement) return false;
  if (group.location === state.portalTerritory || group.status !== 'ready') return false;
  const territory = state.territories[group.location];
  if (!territory || territory.controller !== 'player') return false;
  if (groupsAt(state, group.location).some(candidate => candidate.id !== group.id && candidate.status === 'garrison')) return false;
  const hold = POLICY[policy].occupationHold;
  if (territory.occupation === 'unsecured') return true;
  if (hold === 'controlled') return territory.occupation === 'contested';
  if (hold === 'administered') return territory.occupation !== 'administered';
  return false;
}

function operationPower(state: GameState, targetId: string): number {
  const operation = getOperationAtTarget(state, targetId);
  if (!operation) return 0;
  return operation.participantGroupIds.reduce((sum, groupId) => {
    const group = state.taskGroups[groupId];
    return sum + (group ? combatPower(group) : 0);
  }, 0);
}

function formationCanAttack(state: GameState, group: TaskGroup, policy: BalancePolicyId): boolean {
  const profile = POLICY[policy];
  const allocation = state.logistics.formationAllocations[group.id];
  const deliveryRatio = allocation ? allocation.ratio / 100 : 1;
  if (profile.specialistManagement && !stableStaging(state, group.location)) return false;
  if (profile.specialistManagement && isSecurityDetachment(group)) return false;
  return group.supply >= profile.minimumAttackSupplyStock && deliveryRatio >= profile.minimumAttackDeliveryRatio;
}

function chooseAttack(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
  const profile = POLICY[policy];
  if (!formationCanAttack(state, group, policy)) return undefined;
  return getAdjacentOrderTargets(state, group.id)
    .filter(id => state.territories[id]?.controller === 'enemy')
    .map(id => {
      const operation = getOperationAtTarget(state, id);
      if (operation && operation.participantGroupIds.length >= profile.maxOperationParticipants) return null;
      if (!operation && Object.keys(state.operations).length >= profile.maxConcurrentOperations) return null;
      const ratio = (combatPower(group) + operationPower(state, id)) / Math.max(1, enemyStrengthAt(state, id).power);
      const threshold = (operation ? profile.joinRatio : profile.attackRatio)
        + (TERRAIN_CAUTION[TERRITORIES[id].terrain] ?? 0);
      return {
        id,
        ratio,
        threshold,
        score: ratio + TERRITORIES[id].supply * 0.06 + (operation ? 0.2 : 0)
      };
    })
    .filter((candidate): candidate is { id: string; ratio: number; threshold: number; score: number } => Boolean(candidate))
    .filter(candidate => candidate.ratio >= candidate.threshold)
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))[0]?.id;
}

function distanceToFront(state: GameState, startId: string): number {
  if (isFrontier(state, startId)) return 0;
  const visited = new Set<string>([startId]);
  const queue: Array<{ id: string; distance: number }> = [{ id: startId, distance: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const neighbour of TERRITORIES[current.id].neighbours) {
      if (visited.has(neighbour) || state.territories[neighbour]?.controller !== 'player') continue;
      if (isFrontier(state, neighbour)) return current.distance + 1;
      visited.add(neighbour);
      queue.push({ id: neighbour, distance: current.distance + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}

function chooseMove(state: GameState, group: TaskGroup, policy: BalancePolicyId): string | undefined {
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
      const supplyScore = delivery / 100 * (underPressure ? 2.4 : 0.6);
      const portalRecovery = underPressure && id === state.portalTerritory ? 1.4 : 0;
      return { id, score: frontScore + supplyScore + portalRecovery + TERRITORIES[id].supply * 0.03 };
    })
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))[0]?.id;
}

function splitSecurity(
  state: GameState,
  source: TaskGroup,
  name: string,
  requestedPersonnel: number,
  telemetry: ActionTelemetry
): GameState {
  const personnel = Math.min(requestedPersonnel, Math.max(0, source.personnel - 1000));
  if (personnel < 450) return state;
  const before = Object.keys(state.taskGroups).length;
  let next = splitFormation(state, {
    sourceId: source.id,
    name,
    personnel,
    functionalArmour: Math.min(source.functionalArmour, Math.round(personnel * 0.68)),
    damagedArmour: Math.min(source.damagedArmour, Math.round(personnel * 0.05))
  });
  if (Object.keys(next.taskGroups).length <= before) return state;
  telemetry.formationsSplit += 1;
  next = setGarrison(next);
  telemetry.garrisonsAssigned += 1;
  return next;
}

function createManagedSecurity(state: GameState, telemetry: ActionTelemetry): GameState {
  let next = state;
  if (isFrontier(next, next.portalTerritory) && !groupsAt(next, next.portalTerritory).some(group => group.status === 'garrison' && isSecurityDetachment(group))) {
    const source = groupsAt(next, next.portalTerritory)
      .filter(group => group.status === 'ready' && !group.order && !isSecurityDetachment(group) && group.personnel >= 1900)
      .sort((first, second) => combatPower(first) - combatPower(second) || first.id.localeCompare(second.id))[0];
    if (source) next = splitSecurity(next, source, `Portal Guard ${next.turn}`, 1050, telemetry);
  }

  for (const territoryId of Object.keys(next.territories).sort()) {
    if (territoryId === next.portalTerritory) continue;
    const territory = next.territories[territoryId];
    if (territory.controller !== 'player' || territory.occupation === 'administered') continue;
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

function applyManagedPriorities(state: GameState): GameState {
  let next = state;
  for (const territoryId of Object.keys(next.territories).sort()) {
    const territory = next.territories[territoryId];
    if (territory.controller !== 'player') continue;
    const priority = territoryId === next.portalTerritory
      ? 'critical'
      : isFrontier(next, territoryId) || territory.occupation === 'contested'
        ? 'high'
        : territory.occupation === 'administered'
          ? 'restricted'
          : 'standard';
    next = setTerritoryLogisticsPriority(next, territoryId, priority);
  }
  for (const groupId of Object.keys(next.taskGroups).sort()) {
    const group = next.taskGroups[groupId];
    if (!group || group.personnel <= 0) continue;
    const priority = group.location === next.portalTerritory || group.status === 'attacking' || group.status === 'moving'
      ? 'high'
      : group.status === 'garrison' && isFrontier(next, group.location)
        ? 'high'
        : 'automatic';
    next = setFormationLogisticsPriority(next, groupId, priority);
  }
  return next;
}

function startManagedEngineering(state: GameState, telemetry: ActionTelemetry): GameState {
  if (state.engineeringProjects.some(project => project.status === 'active')) return state;
  const selected = repairableEngineeringRoutes(state)
    .filter(route => state.routeStates[route.id].condition <= 72 || state.logistics.bottleneckRouteIds.includes(route.id))
    .map(route => ({
      route,
      score: (100 - state.routeStates[route.id].condition)
        + (state.logistics.bottleneckRouteIds.includes(route.id) ? 42 : 0)
        + (route.fromTerritoryId === state.portalTerritory || route.toTerritoryId === state.portalTerritory ? 30 : 0)
    }))
    .sort((first, second) => second.score - first.score || first.route.id.localeCompare(second.route.id))[0]?.route;
  if (!selected) return state;
  const group = engineeringGroupsForRoute(state, selected.id)
    .filter(candidate => !isSecurityDetachment(candidate) || !isFrontier(state, candidate.location))
    .sort((first, second) => combatPower(first) - combatPower(second) || first.id.localeCompare(second.id))[0];
  if (!group) return state;
  const next = startEngineeringProject(state, selected.id, group.id, state.logistics.networkEfficiency >= 70 ? 75 : 50);
  if (next !== state) telemetry.engineeringProjectsStarted += 1;
  return next;
}

function prepareManaged(state: GameState, telemetry: ActionTelemetry): GameState {
  let next = createManagedSecurity(state, telemetry);
  next = applyManagedPriorities(next);
  if (next.turn >= 5) next = startManagedEngineering(next, telemetry);
  return next;
}

function issueOrders(state: GameState, policy: BalancePolicyId, telemetry: ActionTelemetry): GameState {
  let next = POLICY[policy].specialistManagement ? prepareManaged(state, telemetry) : state;
  const reserved = portalReserveIds(next, policy);
  if (reserved.size) telemetry.portalReserveTurns += 1;

  for (const groupId of Object.keys(next.taskGroups).sort()) {
    if (next.status !== 'playing') break;
    if (!next.taskGroups[groupId]) continue;
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
      if (shouldHoldGarrison(next, group, policy, reserved)) continue;
      next = setGarrison(next);
      telemetry.garrisonsReleased += 1;
      group = next.taskGroups[groupId];
    }

    if (!canIssueOperationalOrder(group)) continue;

    if (POLICY[policy].specialistManagement && isSecurityDetachment(group)) {
      if (group.location === next.portalTerritory || isFrontier(next, group.location) || next.territories[group.location].occupation !== 'administered') {
        if (group.status === 'ready') {
          next = setGarrison(next);
          telemetry.garrisonsAssigned += 1;
        }
        continue;
      }
      const securityMove = chooseMove(next, group, policy);
      if (securityMove && securityMove !== group.location) {
        next = selectTerritory(next, securityMove);
        next = issueMove(next);
        if (next.taskGroups[groupId]?.order?.type === 'move') telemetry.movesIssued += 1;
      }
      continue;
    }

    if (shouldAssignWholeGarrison(next, group, policy)) {
      next = setGarrison(next);
      telemetry.garrisonsAssigned += 1;
      continue;
    }

    const attack = chooseAttack(next, group, policy);
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

    const move = chooseMove(next, group, policy);
    if (move && move !== group.location) {
      next = selectTerritory(next, move);
      next = issueMove(next);
      if (next.taskGroups[groupId]?.order?.type === 'move') telemetry.movesIssued += 1;
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
    const controllers = Object.fromEntries(Object.entries(state.territories).map(([id, territory]) => [id, territory.controller]));
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
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function groupSummary(results: CampaignBalanceResult[], difficulty: Difficulty, policy: BalancePolicyId): BalanceGroupSummary {
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

function portalSummary(results: CampaignBalanceResult[], difficulty: Difficulty, policy: BalancePolicyId, portalTerritory: string): PortalBalanceSummary {
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
  const portalSummaries = difficulties.flatMap(difficulty => policies.flatMap(policy => SLICE_IDS.map(portalTerritory => portalSummary(
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
    lines.push('', '## Standard / managed portal sensitivity', '', '| Portal | Victory | Median final day | Median personnel | Avg enemy recaptures |', '| --- | ---: | ---: | ---: | ---: |');
    for (const summary of starts) {
      lines.push(`| ${TERRITORIES[summary.portalTerritory].centre} (${summary.portalTerritory}) | ${summary.victoryRate}% | ${summary.medianFinalTurn} | ${summary.medianActivePersonnel} | ${summary.averageEnemyRecaptures} |`);
    }
  }
  lines.push(
    '',
    '## Interpretation boundary',
    '',
    '- These are deterministic heuristic player doctrines driving the real current playable engine through its public order functions.',
    '- Aggressive play accepts severe strategic risk. Balanced play keeps one full-sized portal reserve and releases whole-formation occupation duties once local control is established. Cautious play consolidates longer. Managed play adds dedicated security detachments, logistics priorities and engineering.',
    '- Managed security detachments remain defensive while a territory is exposed; small detached security units are never used as assault formations.',
    '- Formations already on a viable frontline do not shuttle between safe territories merely because no attack meets the doctrine threshold.',
    '- They are comparative balance probes, not predictions of human win rate. Player interdiction remains excluded because it should be an offensive choice, not a prerequisite for basic campaign viability.',
    '- If managed play still cannot progress after these doctrine safeguards, representative traces should be inspected before changing game balance.'
  );
  return `${lines.join('\n')}\n`;
}
