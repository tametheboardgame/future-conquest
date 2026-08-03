import { STRATEGIC_ROUTE_BY_ID, STRATEGIC_ROUTES } from './strategic-network-data';
import { routeCapacityModifierForCondition, routeStatusForCondition } from './infrastructure-disruption';
import { refreshSupplyNetwork } from './supply-network';
import type {
  EngineeringAllocation,
  EngineeringProject,
  GameEvent,
  GameState,
  StrategicRouteState,
  TaskGroup
} from './types';

export const ENGINEERING_ALLOCATIONS: EngineeringAllocation[] = [25, 50, 75, 100];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function appendEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const event: GameEvent = {
    id: (state.events[0]?.id ?? 0) + 1,
    turn: state.turn,
    text,
    tone
  };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

function validAllocation(value: unknown): value is EngineeringAllocation {
  return value === 25 || value === 50 || value === 75 || value === 100;
}

export function engineeringProjectDemand(project: Pick<EngineeringProject, 'allocation'>): number {
  return Math.max(3, Math.ceil(project.allocation / 8));
}

export function normaliseEngineeringProjects(value: unknown): EngineeringProject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): EngineeringProject[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const project = candidate as Partial<EngineeringProject>;
    if (
      typeof project.id !== 'string'
      || typeof project.routeId !== 'string'
      || typeof project.assignedTaskGroupId !== 'string'
      || typeof project.createdTurn !== 'number'
      || typeof project.startingCondition !== 'number'
      || typeof project.targetCondition !== 'number'
      || typeof project.progress !== 'number'
      || !validAllocation(project.allocation)
      || typeof project.supplySpent !== 'number'
      || (project.status !== 'active' && project.status !== 'completed' && project.status !== 'cancelled')
      || (project.returnStatus !== 'ready' && project.returnStatus !== 'garrison')
    ) return [];
    return [{
      id: project.id,
      routeId: project.routeId,
      assignedTaskGroupId: project.assignedTaskGroupId,
      createdTurn: Math.max(1, Math.round(project.createdTurn)),
      startingCondition: clamp(Math.round(project.startingCondition), 0, 100),
      targetCondition: clamp(Math.round(project.targetCondition), 1, 100),
      progress: clamp(Math.round(project.progress), 0, 100),
      allocation: project.allocation,
      supplySpent: Math.max(0, Math.round(project.supplySpent)),
      status: project.status,
      returnStatus: project.returnStatus
    }];
  }).slice(0, 80);
}

export function normaliseEngineeringState(
  value: unknown,
  taskGroups: Record<string, TaskGroup>,
  routeStates: Record<string, StrategicRouteState>
): { projects: EngineeringProject[]; taskGroups: Record<string, TaskGroup> } {
  const projects = normaliseEngineeringProjects(value);
  const groups = structuredClone(taskGroups);
  for (const project of projects) {
    if (project.status !== 'active') continue;
    const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
    const routeState = routeStates[project.routeId];
    const group = groups[project.assignedTaskGroupId];
    const validGroup = Boolean(group && !group.order && (group.status === 'ready' || group.status === 'garrison' || group.status === 'engineering'));
    if (!route || !routeState || routeState.condition >= project.targetCondition || !validGroup) {
      project.status = routeState?.condition >= project.targetCondition ? 'completed' : 'cancelled';
      if (group?.status === 'engineering') group.status = project.returnStatus;
      continue;
    }
    group.status = 'engineering';
  }
  return { projects, taskGroups: groups };
}

export function engineeringGroupsForRoute(state: GameState, routeId: string): TaskGroup[] {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return [];
  const endpoints = [route.fromTerritoryId, route.toTerritoryId];
  const assigned = new Set(state.engineeringProjects.filter(project => project.status === 'active').map(project => project.assignedTaskGroupId));
  return Object.values(state.taskGroups)
    .filter(group => (
      group.personnel > 0
      && endpoints.includes(group.location)
      && !group.order
      && !assigned.has(group.id)
      && (group.status === 'ready' || group.status === 'garrison')
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function repairableEngineeringRoutes(state: GameState) {
  const activeRoutes = new Set(state.engineeringProjects.filter(project => project.status === 'active').map(project => project.routeId));
  return STRATEGIC_ROUTES.filter(route => {
    const routeState = state.routeStates[route.id];
    const from = state.territories[route.fromTerritoryId];
    const to = state.territories[route.toTerritoryId];
    return Boolean(
      routeState
      && routeState.condition < 100
      && !activeRoutes.has(route.id)
      && from?.controller === 'player'
      && to?.controller === 'player'
      && from.occupation !== 'unsecured'
      && to.occupation !== 'unsecured'
      && engineeringGroupsForRoute(state, route.id).length
    );
  }).sort((a, b) => (state.routeStates[a.id].condition - state.routeStates[b.id].condition) || a.name.localeCompare(b.name));
}

function nextProjectId(state: GameState, routeId: string): string {
  let suffix = 1;
  let id = `ENG-${state.turn}-${routeId}-${suffix}`;
  while (state.engineeringProjects.some(project => project.id === id)) {
    suffix += 1;
    id = `ENG-${state.turn}-${routeId}-${suffix}`;
  }
  return id;
}

export function startEngineeringProject(
  state: GameState,
  routeId: string,
  groupId: string,
  allocation: EngineeringAllocation = 50
): GameState {
  if (state.status !== 'playing' || !validAllocation(allocation)) return state;
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  const routeState = state.routeStates[routeId];
  const group = state.taskGroups[groupId];
  if (!route || !routeState || routeState.condition >= 100 || !group) return state;
  if (state.engineeringProjects.some(project => project.status === 'active' && (project.routeId === routeId || project.assignedTaskGroupId === groupId))) return state;
  const from = state.territories[route.fromTerritoryId];
  const to = state.territories[route.toTerritoryId];
  if (
    from?.controller !== 'player'
    || to?.controller !== 'player'
    || from.occupation === 'unsecured'
    || to.occupation === 'unsecured'
    || !engineeringGroupsForRoute(state, routeId).some(candidate => candidate.id === groupId)
  ) return state;

  const taskGroups = structuredClone(state.taskGroups);
  const returnStatus = group.status === 'garrison' ? 'garrison' : 'ready';
  taskGroups[groupId].status = 'engineering';
  const project: EngineeringProject = {
    id: nextProjectId(state, routeId),
    routeId,
    assignedTaskGroupId: groupId,
    createdTurn: state.turn,
    startingCondition: routeState.condition,
    targetCondition: 100,
    progress: 0,
    allocation,
    supplySpent: 0,
    status: 'active',
    returnStatus
  };
  const projects = [project, ...state.engineeringProjects].slice(0, 80);
  return refreshSupplyNetwork(appendEvent(
    { ...state, taskGroups, engineeringProjects: projects },
    `${group.name} began engineering work on ${route.name} at ${allocation}% allocation.`,
    'neutral'
  ));
}

export function setEngineeringAllocation(state: GameState, projectId: string, allocation: EngineeringAllocation): GameState {
  if (!validAllocation(allocation)) return state;
  const projects = structuredClone(state.engineeringProjects);
  const project = projects.find(candidate => candidate.id === projectId && candidate.status === 'active');
  if (!project || project.allocation === allocation) return state;
  project.allocation = allocation;
  const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, engineeringProjects: projects },
    `${route?.name ?? project.routeId} engineering allocation changed to ${allocation}%.`,
    'neutral'
  ));
}

export function cancelEngineeringProject(state: GameState, projectId: string): GameState {
  const projects = structuredClone(state.engineeringProjects);
  const project = projects.find(candidate => candidate.id === projectId && candidate.status === 'active');
  if (!project) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const group = taskGroups[project.assignedTaskGroupId];
  if (group?.status === 'engineering') group.status = project.returnStatus;
  project.status = 'cancelled';
  const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, taskGroups, engineeringProjects: projects },
    `Engineering work on ${route?.name ?? project.routeId} was cancelled.`,
    'warning'
  ));
}

export function resolveEngineeringProjects(state: GameState): GameState {
  if (!state.engineeringProjects.some(project => project.status === 'active')) return state;
  const projects = structuredClone(state.engineeringProjects);
  const taskGroups = structuredClone(state.taskGroups);
  const routeStates = structuredClone(state.routeStates);
  let next: GameState = { ...state, engineeringProjects: projects, taskGroups, routeStates };

  for (const project of projects.filter(candidate => candidate.status === 'active').sort((a, b) => a.id.localeCompare(b.id))) {
    const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
    const routeState = routeStates[project.routeId];
    const group = taskGroups[project.assignedTaskGroupId];
    const from = route ? state.territories[route.fromTerritoryId] : undefined;
    const to = route ? state.territories[route.toTerritoryId] : undefined;
    const valid = Boolean(
      route
      && routeState
      && group
      && group.status === 'engineering'
      && !group.order
      && (group.location === route.fromTerritoryId || group.location === route.toTerritoryId)
      && from?.controller === 'player'
      && to?.controller === 'player'
      && from.occupation !== 'unsecured'
      && to.occupation !== 'unsecured'
    );
    if (!valid) {
      project.status = 'cancelled';
      if (group?.status === 'engineering') group.status = project.returnStatus;
      next = appendEvent(next, `Engineering project ${project.id} was abandoned after the assigned corridor or formation became unavailable.`, 'warning');
      continue;
    }

    const deliveryRatio = clamp((state.logistics.formationAllocations[group.id]?.ratio ?? 0) / 100, 0, 1);
    const maximumWork = project.allocation / 10;
    const work = deliveryRatio >= 0.15 ? Math.max(1, Math.floor(maximumWork * deliveryRatio)) : 0;
    project.supplySpent += Math.round(engineeringProjectDemand(project) * deliveryRatio);
    if (work <= 0) {
      if (state.turn % 3 === 0) next = appendEvent(next, `${route.name} repair work is stalled by inadequate logistics throughput.`, 'warning');
      continue;
    }

    routeState.condition = clamp(routeState.condition + work, 0, project.targetCondition);
    routeState.status = routeStatusForCondition(routeState.condition);
    routeState.capacityModifier = routeCapacityModifierForCondition(routeState.condition);
    const totalWork = Math.max(1, project.targetCondition - project.startingCondition);
    project.progress = clamp(Math.round((routeState.condition - project.startingCondition) / totalWork * 100), 0, 100);

    if (routeState.condition >= project.targetCondition) {
      project.status = 'completed';
      project.progress = 100;
      group.status = project.returnStatus;
      next = appendEvent(next, `${group.name} completed repairs on ${route.name}. The corridor is fully operational.`, 'good');
    }
  }

  return next;
}
