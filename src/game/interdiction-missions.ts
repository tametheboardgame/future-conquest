import { applyInfrastructureDamage } from './infrastructure-disruption';
import { STRATEGIC_ROUTE_BY_ID, STRATEGIC_ROUTES } from './strategic-network-data';
import { refreshSupplyNetwork } from './supply-network';
import type {
  GameEvent,
  GameState,
  InterdictionIntensity,
  InterdictionMission,
  Operation,
  TaskGroup
} from './types';

export const INTERDICTION_INTENSITIES: InterdictionIntensity[] = [25, 50, 75, 100];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const randomFor = (seed: number, turn: number, salt: number) => {
  let value = (seed + turn * 99991 + salt * 7919) >>> 0;
  value = (value * 1664525 + 1013904223) >>> 0;
  return value / 4294967296;
};
const saltFor = (value: string) => [...value].reduce(
  (sum, character, index) => sum + character.charCodeAt(0) * (index + 1),
  0
);

function appendEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const event: GameEvent = {
    id: (state.events[0]?.id ?? 0) + 1,
    turn: state.turn,
    text,
    tone
  };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

function validIntensity(value: unknown): value is InterdictionIntensity {
  return value === 25 || value === 50 || value === 75 || value === 100;
}

export function interdictionMissionDemand(mission: Pick<InterdictionMission, 'intensity'>): number {
  return Math.max(5, Math.ceil(mission.intensity / 8));
}

export function normaliseInterdictionMissions(value: unknown): InterdictionMission[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): InterdictionMission[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const mission = candidate as Partial<InterdictionMission>;
    if (
      typeof mission.id !== 'string'
      || typeof mission.routeId !== 'string'
      || typeof mission.assignedTaskGroupId !== 'string'
      || typeof mission.createdTurn !== 'number'
      || typeof mission.progress !== 'number'
      || !validIntensity(mission.intensity)
      || typeof mission.supplySpent !== 'number'
      || typeof mission.casualties !== 'number'
      || typeof mission.damageInflicted !== 'number'
      || (mission.status !== 'active' && mission.status !== 'succeeded' && mission.status !== 'failed' && mission.status !== 'cancelled')
      || (mission.returnStatus !== 'ready' && mission.returnStatus !== 'garrison')
    ) return [];
    return [{
      id: mission.id,
      routeId: mission.routeId,
      assignedTaskGroupId: mission.assignedTaskGroupId,
      createdTurn: Math.max(1, Math.round(mission.createdTurn)),
      progress: clamp(Math.round(mission.progress), 0, 100),
      intensity: mission.intensity,
      supplySpent: Math.max(0, Math.round(mission.supplySpent)),
      casualties: Math.max(0, Math.round(mission.casualties)),
      damageInflicted: Math.max(0, Math.round(mission.damageInflicted)),
      status: mission.status,
      returnStatus: mission.returnStatus
    }];
  }).slice(0, 80);
}

function playerEndpointForRoute(state: GameState, routeId: string): string | null {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return null;
  const from = state.territories[route.fromTerritoryId];
  const to = state.territories[route.toTerritoryId];
  if (from?.controller === 'player' && to?.controller === 'enemy' && from.occupation !== 'unsecured') return route.fromTerritoryId;
  if (to?.controller === 'player' && from?.controller === 'enemy' && to.occupation !== 'unsecured') return route.toTerritoryId;
  return null;
}

function enemyEndpointForRoute(state: GameState, routeId: string): string | null {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return null;
  if (state.territories[route.fromTerritoryId]?.controller === 'enemy') return route.fromTerritoryId;
  if (state.territories[route.toTerritoryId]?.controller === 'enemy') return route.toTerritoryId;
  return null;
}

export function normaliseInterdictionState(
  value: unknown,
  taskGroups: Record<string, TaskGroup>,
  state: Pick<GameState, 'territories' | 'routeStates'>
): { missions: InterdictionMission[]; taskGroups: Record<string, TaskGroup> } {
  const missions = normaliseInterdictionMissions(value);
  const groups = structuredClone(taskGroups);
  for (const mission of missions) {
    if (mission.status !== 'active') continue;
    const routeState = state.routeStates[mission.routeId];
    const group = groups[mission.assignedTaskGroupId];
    const endpoint = playerEndpointForRoute({ ...state, taskGroups: groups } as GameState, mission.routeId);
    const validGroup = Boolean(group && !group.order && endpoint === group.location && (group.status === 'ready' || group.status === 'garrison' || group.status === 'interdicting'));
    if (!routeState || routeState.condition <= 0 || !validGroup) {
      mission.status = 'cancelled';
      if (group?.status === 'interdicting') group.status = mission.returnStatus;
      continue;
    }
    group.status = 'interdicting';
  }
  return { missions, taskGroups: groups };
}

export function interdictionGroupsForRoute(state: GameState, routeId: string): TaskGroup[] {
  const endpoint = playerEndpointForRoute(state, routeId);
  if (!endpoint) return [];
  const assigned = new Set([
    ...state.engineeringProjects.filter(project => project.status === 'active').map(project => project.assignedTaskGroupId),
    ...state.interdictionMissions.filter(mission => mission.status === 'active').map(mission => mission.assignedTaskGroupId)
  ]);
  return Object.values(state.taskGroups)
    .filter(group => (
      group.personnel > 0
      && group.location === endpoint
      && !group.order
      && !assigned.has(group.id)
      && (group.status === 'ready' || group.status === 'garrison')
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function frontierInterdictionRoutes(state: GameState) {
  const activeRoutes = new Set(state.interdictionMissions.filter(mission => mission.status === 'active').map(mission => mission.routeId));
  return STRATEGIC_ROUTES.filter(route => (
    state.routeStates[route.id]?.condition > 0
    && !activeRoutes.has(route.id)
    && playerEndpointForRoute(state, route.id)
    && enemyEndpointForRoute(state, route.id)
    && interdictionGroupsForRoute(state, route.id).length > 0
  )).sort((a, b) => {
    const aEnemy = enemyEndpointForRoute(state, a.id);
    const bEnemy = enemyEndpointForRoute(state, b.id);
    const aSupply = aEnemy ? state.territories[aEnemy]?.fortification ?? 0 : 0;
    const bSupply = bEnemy ? state.territories[bEnemy]?.fortification ?? 0 : 0;
    return bSupply - aSupply || a.name.localeCompare(b.name);
  });
}

function nextMissionId(state: GameState, routeId: string): string {
  let suffix = 1;
  let id = `INTD-${state.turn}-${routeId}-${suffix}`;
  while (state.interdictionMissions.some(mission => mission.id === id)) {
    suffix += 1;
    id = `INTD-${state.turn}-${routeId}-${suffix}`;
  }
  return id;
}

export function startInterdictionMission(
  state: GameState,
  routeId: string,
  groupId: string,
  intensity: InterdictionIntensity = 50
): GameState {
  if (state.status !== 'playing' || !validIntensity(intensity)) return state;
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  const routeState = state.routeStates[routeId];
  const group = state.taskGroups[groupId];
  if (!route || !routeState || routeState.condition <= 0 || !group) return state;
  if (state.interdictionMissions.some(mission => mission.status === 'active' && (mission.routeId === routeId || mission.assignedTaskGroupId === groupId))) return state;
  if (!interdictionGroupsForRoute(state, routeId).some(candidate => candidate.id === groupId)) return state;

  const taskGroups = structuredClone(state.taskGroups);
  const returnStatus = group.status === 'garrison' ? 'garrison' : 'ready';
  taskGroups[groupId].status = 'interdicting';
  const mission: InterdictionMission = {
    id: nextMissionId(state, routeId),
    routeId,
    assignedTaskGroupId: groupId,
    createdTurn: state.turn,
    progress: 0,
    intensity,
    supplySpent: 0,
    casualties: 0,
    damageInflicted: 0,
    status: 'active',
    returnStatus
  };
  return refreshSupplyNetwork(appendEvent(
    { ...state, taskGroups, interdictionMissions: [mission, ...state.interdictionMissions].slice(0, 80) },
    `${group.name} began an interdiction mission against ${route.name} at ${intensity}% intensity.`,
    'warning'
  ));
}

export function setInterdictionIntensity(state: GameState, missionId: string, intensity: InterdictionIntensity): GameState {
  if (!validIntensity(intensity)) return state;
  const missions = structuredClone(state.interdictionMissions);
  const mission = missions.find(candidate => candidate.id === missionId && candidate.status === 'active');
  if (!mission || mission.intensity === intensity) return state;
  mission.intensity = intensity;
  const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, interdictionMissions: missions },
    `${route?.name ?? mission.routeId} interdiction intensity changed to ${intensity}%.`,
    'neutral'
  ));
}

export function cancelInterdictionMission(state: GameState, missionId: string): GameState {
  const missions = structuredClone(state.interdictionMissions);
  const mission = missions.find(candidate => candidate.id === missionId && candidate.status === 'active');
  if (!mission) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const group = taskGroups[mission.assignedTaskGroupId];
  if (group?.status === 'interdicting') group.status = mission.returnStatus;
  mission.status = 'cancelled';
  const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, taskGroups, interdictionMissions: missions },
    `Interdiction activity against ${route?.name ?? mission.routeId} was cancelled.`,
    'neutral'
  ));
}

export function resolveInterdictionMissions(state: GameState): GameState {
  if (!state.interdictionMissions.some(mission => mission.status === 'active')) return state;
  const missions = structuredClone(state.interdictionMissions);
  const taskGroups = structuredClone(state.taskGroups);
  let next: GameState = { ...state, interdictionMissions: missions, taskGroups };

  for (const mission of missions.filter(candidate => candidate.status === 'active').sort((a, b) => a.id.localeCompare(b.id))) {
    const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
    const group = taskGroups[mission.assignedTaskGroupId];
    const playerEndpoint = playerEndpointForRoute(next, mission.routeId);
    const enemyEndpoint = enemyEndpointForRoute(next, mission.routeId);
    if (!route || !group || group.status !== 'interdicting' || group.order || group.location !== playerEndpoint || !enemyEndpoint || next.routeStates[mission.routeId]?.condition <= 0) {
      mission.status = 'cancelled';
      if (group?.status === 'interdicting') group.status = mission.returnStatus;
      next = appendEvent(next, `Interdiction mission ${mission.id} was abandoned after the target corridor or assigned formation became unavailable.`, 'warning');
      continue;
    }

    const deliveryRatio = clamp((state.logistics.formationAllocations[group.id]?.ratio ?? 0) / 100, 0, 1);
    const dailyProgress = deliveryRatio >= 0.15 ? Math.max(6, Math.floor((13 + mission.intensity / 3.5) * deliveryRatio)) : 0;
    mission.supplySpent += Math.round(interdictionMissionDemand(mission) * deliveryRatio);
    if (dailyProgress <= 0) {
      if (state.turn % 3 === 0) next = appendEvent(next, `${group.name}'s interdiction mission against ${route.name} is stalled by inadequate logistics.`, 'warning');
      continue;
    }
    mission.progress = clamp(mission.progress + dailyProgress, 0, 100);
    if (mission.progress < 100) continue;

    const defenders = Object.values(next.enemyFormations).filter(formation => formation.location === enemyEndpoint && formation.personnel > 0);
    const defenderPersonnel = defenders.reduce((sum, formation) => sum + formation.personnel, 0);
    const defenderReadiness = defenders.length ? defenders.reduce((sum, formation) => sum + formation.readiness, 0) / defenders.length : 35;
    const protection = Math.min(0.34, defenderPersonnel / 15000 + defenderReadiness / 650 + (next.territories[enemyEndpoint]?.fortification ?? 0) / 350);
    const successChance = clamp(0.38 + mission.intensity / 190 + group.morale / 650 + deliveryRatio * 0.16 - protection, 0.16, 0.9);
    const successRoll = randomFor(next.seed, next.turn, saltFor(mission.id) + 1701);
    const casualtyRoll = randomFor(next.seed, next.turn, saltFor(mission.id) + 2111);
    const succeeded = successRoll < successChance;
    const casualtyRate = succeeded
      ? 0.0015 + casualtyRoll * (0.003 + mission.intensity / 40000)
      : 0.008 + casualtyRoll * (0.014 + mission.intensity / 15000);
    const casualties = Math.min(group.personnel, Math.max(succeeded ? 1 : 8, Math.round(group.personnel * casualtyRate)));
    const wounded = Math.round(casualties * 0.62);
    group.personnel = Math.max(0, group.personnel - casualties);
    group.morale = clamp(group.morale + (succeeded ? -1 : -7), 5, 100);
    group.status = mission.returnStatus;
    mission.casualties += casualties;
    next.woundedPool += wounded;

    if (succeeded) {
      const severity = 8 + Math.floor(mission.intensity / 7) + Math.floor(randomFor(next.seed, next.turn, saltFor(mission.id) + 2609) * 9);
      mission.status = 'succeeded';
      mission.damageInflicted = severity;
      next = applyInfrastructureDamage(next, route.id, severity, 'player-interdiction');
      next.escalation = clamp(next.escalation + 0.45 + mission.intensity / 80, 0, 100);
      next = appendEvent(next, `${group.name} completed a successful interdiction mission against ${route.name}, inflicting ${severity} condition damage at the cost of ${casualties} casualties.`, 'good');
    } else {
      mission.status = 'failed';
      next.escalation = clamp(next.escalation + 0.25 + mission.intensity / 220, 0, 100);
      next = appendEvent(next, `${group.name}'s interdiction mission against ${route.name} failed under enemy security pressure. ${casualties} personnel became casualties.`, 'danger');
    }
  }

  return next;
}

export function resolveOperationCombatDamage(
  state: GameState,
  operation: Operation,
  participants: TaskGroup[],
  defenderPersonnel: number
): GameState {
  const routeCounts = new Map<string, number>();
  for (const group of participants) {
    const routeId = group.order?.routeId;
    if (routeId) routeCounts.set(routeId, (routeCounts.get(routeId) ?? 0) + 1);
  }
  const selected = [...routeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (!selected) return state;
  const route = STRATEGIC_ROUTE_BY_ID[selected[0]];
  if (!route || !state.routeStates[route.id] || state.routeStates[route.id].condition <= 0) return state;

  const engagedPersonnel = participants.reduce((sum, group) => sum + group.personnel, 0) + defenderPersonnel;
  const intensity = clamp(engagedPersonnel / 9000 + operation.days / 12, 0, 1);
  const chance = clamp(0.12 + intensity * 0.34, 0.12, 0.48);
  const roll = randomFor(state.seed, state.turn, saltFor(operation.id) + 3203);
  if (roll >= chance) return state;
  const severity = 3 + Math.floor(intensity * 6) + Math.floor(randomFor(state.seed, state.turn, saltFor(operation.id) + 3911) * 7);
  return applyInfrastructureDamage(state, route.id, severity, 'combat');
}
