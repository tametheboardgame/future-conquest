import { STRATEGIC_ROUTE_BY_ID, STRATEGIC_ROUTES } from './strategic-network-data';
import { routeCapacityModifierForCondition, routeStatusForCondition } from './infrastructure-disruption';
import { refreshSupplyNetwork } from './supply-network';
import { territoryRepairCapability } from './territory-resources';
import type {
  EngineeringAllocation,
  EngineeringProject,
  EngineeringProjectKind,
  GameEvent,
  GameState,
  StrategicRouteState,
  TaskGroup
} from './types';

export const ENGINEERING_ALLOCATIONS: EngineeringAllocation[] = [0, 25, 50, 75, 100];
export const MAX_ROUTE_UPGRADE_LEVEL = 2;

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

function appendEvent(state: GameState, text: string, tone: GameEvent['tone'], engineeringProjectId?: string): GameState {
  const event: GameEvent = {
    id: (state.events[0]?.id ?? 0) + 1,
    turn: state.turn,
    text,
    tone,
    engineeringProjectId
  };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

function validAllocation(value: unknown): value is EngineeringAllocation {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function validKind(value: unknown): value is EngineeringProjectKind {
  return value === 'repair' || value === 'upgrade';
}

export function engineeringProjectDemand(project: Pick<EngineeringProject, 'kind' | 'startingCondition' | 'materialCost'>): number {
  if (project.kind === 'upgrade') return 9;
  const damage = Math.max(0, 100 - project.startingCondition);
  return Math.max(3, Math.min(8, 3 + Math.ceil(damage / 25)));
}

export function engineeringSupportDemand(project: Pick<EngineeringProject, 'allocation' | 'assignedTaskGroupId'>): number {
  if (!project.assignedTaskGroupId || project.allocation <= 0) return 0;
  return Math.max(1, Math.ceil(project.allocation / 20));
}

export function engineeringSupportPercentForGroup(state: GameState, groupId: string): number {
  const project = state.engineeringProjects.find(candidate => (
    candidate.status === 'active'
    && candidate.assignedTaskGroupId === groupId
    && candidate.allocation > 0
  ));
  return project ? clamp(project.allocation, 0, 100) : 0;
}

export function engineeringOperationalFactor(state: GameState, groupId: string): number {
  const support = engineeringSupportPercentForGroup(state, groupId) / 100;
  return clamp(1 - support * 0.8, 0.2, 1);
}

export function engineeringMovementFactor(state: GameState, groupId: string): number {
  const support = engineeringSupportPercentForGroup(state, groupId) / 100;
  return clamp(1 - support * 0.45, 0.55, 1);
}

export function engineeringOperationalPersonnel(state: GameState, group: TaskGroup): number {
  return Math.max(0, Math.floor(group.personnel * engineeringOperationalFactor(state, group.id)));
}

export function engineeringLocalCapability(state: GameState, routeId: string): number {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return 0;
  const from = state.territories[route.fromTerritoryId];
  const to = state.territories[route.toTerritoryId];
  if (
    !from
    || !to
    || from.controller !== 'player'
    || to.controller !== 'player'
    || from.occupation === 'unsecured'
    || to.occupation === 'unsecured'
  ) return 0;
  const endpointCapability = (
    territoryRepairCapability(state, route.fromTerritoryId)
    + territoryRepairCapability(state, route.toTerritoryId)
  ) / 2;
  const security = clamp(1 - (from.resistance + to.resistance) / 500, 0.55, 1);
  return round1(endpointCapability * security);
}

export function engineeringCivilSupplyRatio(state: GameState, routeId: string): number {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return 0;
  const ratios = [route.fromTerritoryId, route.toTerritoryId]
    .map(id => state.logistics.territoryAllocations[id]?.ratio)
    .filter((value): value is number => typeof value === 'number');
  if (!ratios.length) return 0.35;
  return clamp(ratios.reduce((sum, value) => sum + value, 0) / ratios.length / 100, 0, 1);
}

export function engineeringSupportDeliveryRatio(state: GameState, project: EngineeringProject): number {
  if (!project.assignedTaskGroupId || project.allocation <= 0) return 0;
  return clamp((state.logistics.formationAllocations[project.assignedTaskGroupId]?.ratio ?? 0) / 100, 0, 1);
}

export function engineeringDailyWork(state: GameState, project: EngineeringProject): number {
  const localCapability = engineeringLocalCapability(state, project.routeId);
  if (localCapability <= 0) return 0;
  const civilSupply = engineeringCivilSupplyRatio(state, project.routeId);
  const civilWork = localCapability * (0.7 + civilSupply * 1.05);

  let militaryWork = 0;
  if (project.assignedTaskGroupId && project.allocation > 0) {
    const group = state.taskGroups[project.assignedTaskGroupId];
    if (group && group.personnel > 0) {
      const delivery = engineeringSupportDeliveryRatio(state, project);
      const supportScale = project.allocation / 100;
      const manpowerScale = 0.8 + Math.min(3000, group.personnel) / 1500;
      militaryWork = supportScale * manpowerScale * (0.45 + delivery * 0.85);
    }
  }

  const kindFactor = project.kind === 'upgrade' ? 0.82 : 1;
  return round1(Math.max(0, (civilWork + militaryWork) * kindFactor));
}

export function engineeringMaterialDelivery(state: GameState, project: EngineeringProject): number {
  const supply = engineeringCivilSupplyRatio(state, project.routeId);
  const local = engineeringLocalCapability(state, project.routeId);
  return round1(engineeringProjectDemand(project) * clamp(0.35 + supply * 0.65, 0.35, 1) * clamp(0.65 + local * 0.22, 0.65, 1.25));
}

export function engineeringProjectEta(state: GameState, project: EngineeringProject): number | null {
  const dailyWork = engineeringDailyWork(state, project);
  const dailyMaterials = engineeringMaterialDelivery(state, project);
  if (dailyWork <= 0 || dailyMaterials <= 0) return null;
  const workRemaining = project.kind === 'repair'
    ? Math.max(0, project.targetCondition - (state.routeStates[project.routeId]?.condition ?? project.startingCondition))
    : Math.max(0, project.workRequired - project.workCompleted);
  const materialRemaining = Math.max(0, project.materialCost - project.materialSpent);
  return Math.max(1, Math.ceil(Math.max(workRemaining / dailyWork, materialRemaining / dailyMaterials)));
}

export function normaliseEngineeringProjects(value: unknown): EngineeringProject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): EngineeringProject[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const project = candidate as Partial<EngineeringProject> & { allocation?: unknown };
    if (
      typeof project.id !== 'string'
      || typeof project.routeId !== 'string'
      || typeof project.createdTurn !== 'number'
      || typeof project.startingCondition !== 'number'
      || typeof project.targetCondition !== 'number'
      || typeof project.progress !== 'number'
      || !validAllocation(project.allocation)
      || typeof project.supplySpent !== 'number'
      || (project.status !== 'active' && project.status !== 'completed' && project.status !== 'cancelled')
    ) return [];

    const kind: EngineeringProjectKind = validKind(project.kind) ? project.kind : 'repair';
    const startingCondition = clamp(project.startingCondition, 0, 100);
    const targetCondition = clamp(project.targetCondition, 1, 100);
    const defaultWorkRequired = kind === 'upgrade' ? 60 : Math.max(1, targetCondition - startingCondition);
    const workRequired = typeof project.workRequired === 'number' && Number.isFinite(project.workRequired)
      ? Math.max(1, project.workRequired)
      : defaultWorkRequired;
    const workCompleted = typeof project.workCompleted === 'number' && Number.isFinite(project.workCompleted)
      ? clamp(project.workCompleted, 0, workRequired)
      : kind === 'upgrade'
        ? clamp(project.progress / 100 * workRequired, 0, workRequired)
        : clamp(project.progress / 100 * workRequired, 0, workRequired);
    const materialCost = typeof project.materialCost === 'number' && Number.isFinite(project.materialCost)
      ? Math.max(1, project.materialCost)
      : kind === 'upgrade'
        ? 90
        : Math.max(12, Math.round((100 - startingCondition) * 0.45));
    const materialSpent = typeof project.materialSpent === 'number' && Number.isFinite(project.materialSpent)
      ? clamp(project.materialSpent, 0, materialCost)
      : Math.min(materialCost, Math.max(0, project.supplySpent));

    return [{
      id: project.id,
      routeId: project.routeId,
      kind,
      assignedTaskGroupId: typeof project.assignedTaskGroupId === 'string' ? project.assignedTaskGroupId : undefined,
      createdTurn: Math.max(1, Math.round(project.createdTurn)),
      startingCondition,
      targetCondition,
      progress: clamp(Math.round(project.progress), 0, 100),
      allocation: clamp(Math.round(project.allocation), 0, 100),
      supplySpent: Math.max(0, round1(project.supplySpent)),
      status: project.status,
      returnStatus: project.returnStatus === 'garrison' ? 'garrison' : 'ready',
      workCompleted: round1(workCompleted),
      workRequired: round1(workRequired),
      materialCost: round1(materialCost),
      materialSpent: round1(materialSpent)
    }];
  }).slice(0, 100);
}

export function normaliseEngineeringState(
  value: unknown,
  taskGroups: Record<string, TaskGroup>,
  routeStates: Record<string, StrategicRouteState>
): { projects: EngineeringProject[]; taskGroups: Record<string, TaskGroup> } {
  const projects = normaliseEngineeringProjects(value);
  const groups = structuredClone(taskGroups);
  for (const group of Object.values(groups)) {
    if (group.status === 'engineering') group.status = 'ready';
  }
  for (const project of projects) {
    if (project.status !== 'active') continue;
    const routeState = routeStates[project.routeId];
    if (!routeState) {
      project.status = 'cancelled';
      continue;
    }
    if (project.kind === 'repair' && routeState.condition >= project.targetCondition) {
      project.status = 'completed';
      project.progress = 100;
      continue;
    }
    if (project.assignedTaskGroupId && !groups[project.assignedTaskGroupId]) {
      project.assignedTaskGroupId = undefined;
      project.allocation = 0;
    }
  }
  return { projects, taskGroups: groups };
}

function groupAssignedElsewhere(state: GameState, groupId: string, projectId?: string): boolean {
  return state.engineeringProjects.some(project => (
    project.status === 'active'
    && project.id !== projectId
    && project.assignedTaskGroupId === groupId
    && project.allocation > 0
  ));
}

export function engineeringGroupsForRoute(state: GameState, routeId: string, projectId?: string): TaskGroup[] {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return [];
  const endpoints = [route.fromTerritoryId, route.toTerritoryId];
  return Object.values(state.taskGroups)
    .filter(group => (
      group.personnel > 0
      && endpoints.includes(group.location)
      && !group.order
      && !groupAssignedElsewhere(state, group.id, projectId)
      && (group.status === 'ready' || group.status === 'garrison')
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function routeUnderActiveProject(state: GameState, routeId: string): boolean {
  return state.engineeringProjects.some(project => project.status === 'active' && project.routeId === routeId);
}

function controlledSecuredRoute(state: GameState, routeId: string): boolean {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return false;
  const from = state.territories[route.fromTerritoryId];
  const to = state.territories[route.toTerritoryId];
  return Boolean(
    from?.controller === 'player'
    && to?.controller === 'player'
    && from.occupation !== 'unsecured'
    && to.occupation !== 'unsecured'
  );
}

export function repairableEngineeringRoutes(state: GameState) {
  return STRATEGIC_ROUTES.filter(route => {
    const routeState = state.routeStates[route.id];
    return Boolean(
      routeState
      && routeState.condition < 100
      && !routeUnderActiveProject(state, route.id)
      && controlledSecuredRoute(state, route.id)
      && engineeringLocalCapability(state, route.id) > 0
    );
  }).sort((a, b) => (state.routeStates[a.id].condition - state.routeStates[b.id].condition) || a.name.localeCompare(b.name));
}

export function upgradeableEngineeringRoutes(state: GameState) {
  return STRATEGIC_ROUTES.filter(route => {
    const routeState = state.routeStates[route.id];
    return Boolean(
      routeState
      && routeState.condition >= 85
      && (routeState.upgradeLevel ?? 0) < MAX_ROUTE_UPGRADE_LEVEL
      && !routeUnderActiveProject(state, route.id)
      && controlledSecuredRoute(state, route.id)
      && engineeringLocalCapability(state, route.id) > 0
    );
  }).sort((a, b) => (state.routeStates[a.id].upgradeLevel ?? 0) - (state.routeStates[b.id].upgradeLevel ?? 0) || a.name.localeCompare(b.name));
}

function nextProjectId(state: GameState, routeId: string, kind: EngineeringProjectKind): string {
  let suffix = 1;
  let id = `ENG-${kind.toUpperCase()}-${state.turn}-${routeId}-${suffix}`;
  while (state.engineeringProjects.some(project => project.id === id)) {
    suffix += 1;
    id = `ENG-${kind.toUpperCase()}-${state.turn}-${routeId}-${suffix}`;
  }
  return id;
}

function supportGroupEligible(state: GameState, routeId: string, groupId: string, projectId?: string): boolean {
  return engineeringGroupsForRoute(state, routeId, projectId).some(group => group.id === groupId);
}

export function startEngineeringProject(
  state: GameState,
  routeId: string,
  groupId = '',
  allocation: EngineeringAllocation = 0,
  kind: EngineeringProjectKind = 'repair'
): GameState {
  if (state.status !== 'playing' || !validAllocation(allocation) || !validKind(kind)) return state;
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  const routeState = state.routeStates[routeId];
  if (!route || !routeState || routeUnderActiveProject(state, routeId) || !controlledSecuredRoute(state, routeId)) return state;
  if (kind === 'repair' && routeState.condition >= 100) return state;
  if (kind === 'upgrade' && (routeState.condition < 85 || (routeState.upgradeLevel ?? 0) >= MAX_ROUTE_UPGRADE_LEVEL)) return state;
  if (groupId && allocation > 0 && !supportGroupEligible(state, routeId, groupId)) return state;

  const startingCondition = routeState.condition;
  const workRequired = kind === 'upgrade' ? 60 : Math.max(1, 100 - startingCondition);
  const materialCost = kind === 'upgrade'
    ? 90 + (routeState.upgradeLevel ?? 0) * 30
    : Math.max(12, Math.round((100 - startingCondition) * 0.45));
  const group = groupId ? state.taskGroups[groupId] : undefined;
  const project: EngineeringProject = {
    id: nextProjectId(state, routeId, kind),
    routeId,
    kind,
    assignedTaskGroupId: groupId && allocation > 0 ? groupId : undefined,
    createdTurn: state.turn,
    startingCondition,
    targetCondition: 100,
    progress: 0,
    allocation: groupId && allocation > 0 ? clamp(Math.round(allocation), 0, 100) : 0,
    supplySpent: 0,
    status: 'active',
    returnStatus: group?.status === 'garrison' ? 'garrison' : 'ready',
    workCompleted: 0,
    workRequired,
    materialCost,
    materialSpent: 0
  };
  const projects = [project, ...state.engineeringProjects].slice(0, 100);
  const supportText = project.assignedTaskGroupId
    ? ` ${group?.name ?? project.assignedTaskGroupId} is contributing ${project.allocation}% engineering support while remaining operational.`
    : ' Local civil engineering teams are carrying the work without military support.';
  return refreshSupplyNetwork(appendEvent(
    { ...state, engineeringProjects: projects },
    `${kind === 'upgrade' ? 'Infrastructure upgrade' : 'Civil repair work'} began on ${route.name}.${supportText}`,
    'neutral'
  ));
}

export function startEngineeringUpgrade(
  state: GameState,
  routeId: string,
  groupId = '',
  allocation: EngineeringAllocation = 0
): GameState {
  return startEngineeringProject(state, routeId, groupId, allocation, 'upgrade');
}

export function assignEngineeringSupport(
  state: GameState,
  projectId: string,
  groupId: string,
  allocation: EngineeringAllocation = 25
): GameState {
  if (!validAllocation(allocation) || allocation <= 0) return state;
  const projects = structuredClone(state.engineeringProjects);
  const project = projects.find(candidate => candidate.id === projectId && candidate.status === 'active');
  if (!project || !supportGroupEligible(state, project.routeId, groupId, projectId)) return state;
  project.assignedTaskGroupId = groupId;
  project.allocation = clamp(Math.round(allocation), 1, 100);
  const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
  const group = state.taskGroups[groupId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, engineeringProjects: projects },
    `${group?.name ?? groupId} assigned ${project.allocation}% engineering support to ${route?.name ?? project.routeId}. The remaining formation stays available for operations at reduced effectiveness.`,
    'neutral'
  ));
}

export function setEngineeringAllocation(state: GameState, projectId: string, allocation: EngineeringAllocation): GameState {
  if (!validAllocation(allocation)) return state;
  if (allocation <= 0) return withdrawEngineeringSupport(state, projectId);
  const projects = structuredClone(state.engineeringProjects);
  const project = projects.find(candidate => candidate.id === projectId && candidate.status === 'active');
  if (!project?.assignedTaskGroupId || project.allocation === allocation) return state;
  project.allocation = clamp(Math.round(allocation), 1, 100);
  const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, engineeringProjects: projects },
    `${route?.name ?? project.routeId} military engineering support changed to ${project.allocation}%.`,
    'neutral'
  ));
}

export function withdrawEngineeringSupport(state: GameState, projectId: string): GameState {
  const projects = structuredClone(state.engineeringProjects);
  const project = projects.find(candidate => candidate.id === projectId && candidate.status === 'active');
  if (!project || !project.assignedTaskGroupId) return state;
  const group = state.taskGroups[project.assignedTaskGroupId];
  const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
  project.assignedTaskGroupId = undefined;
  project.allocation = 0;
  return refreshSupplyNetwork(appendEvent(
    { ...state, engineeringProjects: projects },
    `${group?.name ?? 'Military'} engineering support was withdrawn from ${route?.name ?? project.routeId}. Civil work continues at local capability.`,
    'neutral',
    project.id
  ));
}

export function cancelEngineeringProject(state: GameState, projectId: string): GameState {
  const projects = structuredClone(state.engineeringProjects);
  const project = projects.find(candidate => candidate.id === projectId && candidate.status === 'active');
  if (!project) return state;
  project.status = 'cancelled';
  project.assignedTaskGroupId = undefined;
  project.allocation = 0;
  const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, engineeringProjects: projects },
    `${project.kind === 'upgrade' ? 'Infrastructure upgrade' : 'Repair work'} on ${route?.name ?? project.routeId} was cancelled.`,
    'warning'
  ));
}

export function resolveEngineeringProjects(state: GameState): GameState {
  if (!state.engineeringProjects.some(project => project.status === 'active')) return state;
  const projects = structuredClone(state.engineeringProjects);
  const routeStates = structuredClone(state.routeStates);
  let next: GameState = { ...state, engineeringProjects: projects, routeStates };

  for (const project of projects.filter(candidate => candidate.status === 'active').sort((a, b) => a.id.localeCompare(b.id))) {
    const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
    const routeState = routeStates[project.routeId];
    if (!route || !routeState || !controlledSecuredRoute(next, project.routeId)) {
      project.status = 'cancelled';
      project.assignedTaskGroupId = undefined;
      project.allocation = 0;
      next = appendEvent(next, `Engineering project ${project.id} was abandoned because local control of the corridor was lost.`, 'warning');
      continue;
    }

    if (project.assignedTaskGroupId) {
      const supportGroup = next.taskGroups[project.assignedTaskGroupId];
      if (!supportGroup || supportGroup.personnel <= 0) {
        project.assignedTaskGroupId = undefined;
        project.allocation = 0;
        next = appendEvent(next, `${route.name} lost its assigned military engineering support. Civil work continues.`, 'warning');
      }
    }

    if (project.kind === 'upgrade' && routeState.condition < 75) {
      if (next.turn % 3 === 0) next = appendEvent(next, `${route.name} upgrade work is paused because fresh damage has reduced the corridor below 75% condition. Repair the route before construction resumes.`, 'warning');
      continue;
    }

    const work = engineeringDailyWork(next, project);
    const materials = engineeringMaterialDelivery(next, project);
    if (work <= 0 || materials <= 0) {
      if (next.turn % 3 === 0) next = appendEvent(next, `${route.name} engineering work is stalled by local capability or material throughput.`, 'warning');
      continue;
    }

    project.supplySpent = round1(project.supplySpent + engineeringProjectDemand(project) + engineeringSupportDemand(project));
    project.materialSpent = round1(Math.min(project.materialCost, project.materialSpent + materials));

    if (project.kind === 'repair') {
      const before = routeState.condition;
      routeState.condition = clamp(round1(routeState.condition + work), 0, project.targetCondition);
      routeState.status = routeStatusForCondition(routeState.condition);
      routeState.capacityModifier = routeCapacityModifierForCondition(routeState.condition);
      project.workCompleted = round1(Math.min(project.workRequired, project.workCompleted + Math.max(0, routeState.condition - before)));
      const conditionProgress = (routeState.condition - project.startingCondition) / Math.max(1, project.targetCondition - project.startingCondition);
      const materialProgress = project.materialSpent / Math.max(1, project.materialCost);
      project.progress = clamp(Math.round(Math.min(conditionProgress, materialProgress) * 100), 0, 100);
      if (routeState.condition >= project.targetCondition && project.materialSpent >= project.materialCost) {
        project.status = 'completed';
        project.progress = 100;
        project.assignedTaskGroupId = undefined;
        project.allocation = 0;
        next = appendEvent(next, `Civil and military engineering teams completed repairs on ${route.name}. The corridor is fully operational.`, 'good');
      }
    } else {
      project.workCompleted = round1(Math.min(project.workRequired, project.workCompleted + work));
      const workProgress = project.workCompleted / Math.max(1, project.workRequired);
      const materialProgress = project.materialSpent / Math.max(1, project.materialCost);
      project.progress = clamp(Math.round(Math.min(workProgress, materialProgress) * 100), 0, 100);
      if (project.workCompleted >= project.workRequired && project.materialSpent >= project.materialCost) {
        routeState.upgradeLevel = clamp(Math.round((routeState.upgradeLevel ?? 0) + 1), 0, MAX_ROUTE_UPGRADE_LEVEL);
        project.status = 'completed';
        project.progress = 100;
        project.assignedTaskGroupId = undefined;
        project.allocation = 0;
        next = appendEvent(next, `${route.name} corridor upgrade completed. Persistent infrastructure level is now ${routeState.upgradeLevel}/${MAX_ROUTE_UPGRADE_LEVEL}, increasing route capacity and resilience.`, 'good');
      }
    }
  }

  return refreshSupplyNetwork(next);
}
