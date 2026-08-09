import { TERRITORIES } from './data';
import { STRATEGIC_NODES, STRATEGIC_ROUTES } from './strategic-network-data';
import { territorySupplySourceCapacity } from './territory-resources';
import type {
  FormationSupplyAllocation,
  GameState,
  LogisticsPriority,
  LogisticsPriorityState,
  LogisticsState,
  RouteSupplyFlow,
  SupplyCondition,
  SupplyPath,
  TaskGroup,
  TerritorySupplyAllocation
} from './types';

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

export const SUPPLY_CONDITION_LABELS: Record<SupplyCondition, string> = {
  sustained: 'Sustained',
  strained: 'Strained',
  undersupplied: 'Undersupplied',
  critical: 'Critical',
  'cut-off': 'Cut off'
};

const routeStatusFactor: Record<string, number> = {
  open: 1,
  damaged: 0.82,
  blocked: 0,
  destroyed: 0
};

const occupationThroughputFactor: Record<string, number> = {
  enemy: 0,
  unsecured: 0,
  contested: 0.62,
  controlled: 0.82,
  administered: 1
};

const formationStatusDemand: Record<TaskGroup['status'], number> = {
  ready: 1,
  moving: 1.18,
  attacking: 1.55,
  garrison: 0.78,
  recovering: 1.2,
  engineering: 1.32,
  interdicting: 1.38
};

export const LOGISTICS_PRIORITY_LABELS: Record<LogisticsPriority, string> = {
  critical: 'Critical',
  high: 'High',
  standard: 'Standard',
  restricted: 'Restricted'
};

export const LOGISTICS_PRIORITY_OPTIONS: LogisticsPriority[] = ['critical', 'high', 'standard', 'restricted'];

const logisticsPriorityRank: Record<LogisticsPriority, number> = {
  critical: 4,
  high: 3,
  standard: 2,
  restricted: 1
};

const automaticFormationPriority: Record<TaskGroup['status'], LogisticsPriority> = {
  ready: 'standard',
  moving: 'high',
  attacking: 'critical',
  garrison: 'standard',
  recovering: 'high',
  engineering: 'high',
  interdicting: 'high'
};

const automaticTerritoryPriority: Record<string, LogisticsPriority> = {
  enemy: 'restricted',
  unsecured: 'restricted',
  contested: 'high',
  controlled: 'standard',
  administered: 'restricted'
};

const isLogisticsPriority = (value: unknown): value is LogisticsPriority => LOGISTICS_PRIORITY_OPTIONS.includes(value as LogisticsPriority);

export function createEmptyLogisticsPriorities(): LogisticsPriorityState {
  return { formationOverrides: {}, territoryOverrides: {} };
}

export function normaliseLogisticsPriorities(
  value: unknown,
  taskGroups: GameState['taskGroups'],
  territories: GameState['territories']
): LogisticsPriorityState {
  const raw = value && typeof value === 'object' ? value as Partial<LogisticsPriorityState> : {};
  const formationOverrides: Record<string, LogisticsPriority> = {};
  const territoryOverrides: Record<string, LogisticsPriority> = {};
  if (raw.formationOverrides && typeof raw.formationOverrides === 'object') {
    for (const [id, priority] of Object.entries(raw.formationOverrides)) {
      if (taskGroups[id] && isLogisticsPriority(priority)) formationOverrides[id] = priority;
    }
  }
  if (raw.territoryOverrides && typeof raw.territoryOverrides === 'object') {
    for (const [id, priority] of Object.entries(raw.territoryOverrides)) {
      if (territories[id] && isLogisticsPriority(priority)) territoryOverrides[id] = priority;
    }
  }
  return { formationOverrides, territoryOverrides };
}

export function effectiveFormationLogisticsPriority(state: GameState, groupId: string): LogisticsPriority {
  const group = state.taskGroups[groupId];
  return state.logisticsPriorities?.formationOverrides?.[groupId] ?? automaticFormationPriority[group?.status ?? 'ready'];
}

export function effectiveTerritoryLogisticsPriority(state: GameState, territoryId: string): LogisticsPriority {
  const territory = state.territories[territoryId];
  return state.logisticsPriorities?.territoryOverrides?.[territoryId] ?? automaticTerritoryPriority[territory?.occupation ?? 'enemy'];
}

interface SupplyRequest {
  id: string;
  kind: 'formation' | 'administration';
  targetTerritoryId: string;
  demand: number;
  priority: LogisticsPriority;
  automaticPriority: boolean;
  delivered: number;
  pathCounts: Map<string, number>;
}

interface CandidatePath {
  sourceTerritoryId: string;
  routeIds: string[];
  territoryIds: string[];
  cost: number;
}

const nodeSupplyByTerritory = STRATEGIC_NODES.reduce<Record<string, number>>((result, node) => {
  result[node.territoryId] = (result[node.territoryId] ?? 0) + node.supplyCapacity;
  return result;
}, {});

const nodeSupplyById = Object.fromEntries(STRATEGIC_NODES.map(node => [node.id, node.supplyCapacity])) as Record<string, number>;

export function supplyConditionForRatio(ratio: number): SupplyCondition {
  if (ratio >= 0.9) return 'sustained';
  if (ratio >= 0.65) return 'strained';
  if (ratio >= 0.4) return 'undersupplied';
  if (ratio >= 0.15) return 'critical';
  return 'cut-off';
}

export function estimatedFormationStockDays(group: TaskGroup): number {
  return round1(clamp(group.supply, 0, 100) / 17);
}

export function formationSupplyDemand(group: TaskGroup): number {
  const personnelDemand = group.personnel / 300;
  const armourDemand = Math.min(group.functionalArmour, group.personnel) / 450;
  return Math.max(1, Math.ceil((personnelDemand + armourDemand) * formationStatusDemand[group.status]));
}

export function administrationSupplyDemand(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  if (!territory || territory.controller !== 'player' || territory.occupation === 'unsecured') return 0;
  const occupationDemand = territory.occupation === 'administered' ? 2 : territory.occupation === 'controlled' ? 3 : 5;
  const resistanceDemand = Math.ceil(territory.resistance / 35);
  return Math.max(2, occupationDemand + resistanceDemand);
}

export function effectiveRouteSupplyCapacity(state: GameState, routeId: string): number {
  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);
  if (!route) return 0;
  const routeState = state.routeStates[route.id];
  const statusFactor = routeStatusFactor[routeState?.status ?? 'open'] ?? 0;
  if (statusFactor <= 0) return 0;
  const condition = clamp((routeState?.condition ?? 100) / 100, 0, 1);
  const conditionFactor = clamp(0.38 + condition * 0.62, 0.38, 1);
  const capacityModifier = clamp(routeState?.capacityModifier ?? 1, 0, 1.5);
  const upgradeFactor = 1 + (routeState?.upgradeLevel ?? 0) * 0.15;
  const endpointBonus = Math.min(nodeSupplyById[route.fromNodeId] ?? 0, nodeSupplyById[route.toNodeId] ?? 0) * 2;
  return Math.max(0, Math.floor((route.supplyCapacity * 18 + endpointBonus) * statusFactor * conditionFactor * capacityModifier * upgradeFactor));
}

export function effectiveTerritoryThroughput(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  if (!territory || territory.controller !== 'player') return 0;
  const factor = occupationThroughputFactor[territory.occupation] ?? 0;
  if (factor <= 0) return 0;
  const definition = TERRITORIES[territoryId];
  const infrastructure = nodeSupplyByTerritory[territoryId] ?? 0;
  return Math.max(0, Math.floor((25 + definition.supply * 10 + infrastructure * 5) * factor));
}

function accessibleTerritory(state: GameState, territoryId: string): boolean {
  const territory = state.territories[territoryId];
  return Boolean(territory && territory.controller === 'player' && territory.occupation !== 'unsecured');
}

function routeOtherEnd(routeId: string, territoryId: string): string | null {
  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);
  if (!route) return null;
  if (route.fromTerritoryId === territoryId) return route.toTerritoryId;
  if (route.toTerritoryId === territoryId) return route.fromTerritoryId;
  return null;
}

function findCandidatePath(
  state: GameState,
  targetTerritoryId: string,
  routeRemaining: Record<string, number>,
  routeCapacity: Record<string, number>,
  territoryRemaining: Record<string, number>,
  sourceRemaining: Record<string, number>
): CandidatePath | null {
  if ((sourceRemaining[targetTerritoryId] ?? 0) >= 1) {
    return { sourceTerritoryId: targetTerritoryId, routeIds: [], territoryIds: [], cost: 0 };
  }
  if (!accessibleTerritory(state, targetTerritoryId)) return null;

  const sourceIds = Object.keys(sourceRemaining).filter(id => (
    (sourceRemaining[id] ?? 0) >= 1 && accessibleTerritory(state, id)
  ));
  if (!sourceIds.length) return null;

  const distances = new Map<string, number>();
  const sourceFor = new Map<string, string>();
  for (const sourceId of sourceIds) {
    distances.set(sourceId, 0);
    sourceFor.set(sourceId, sourceId);
  }
  const previous = new Map<string, { territoryId: string; routeId: string }>();
  const unvisited = new Set(Object.keys(state.territories).filter(id => accessibleTerritory(state, id)));

  while (unvisited.size) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const territoryId of unvisited) {
      const distance = distances.get(territoryId) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        current = territoryId;
        currentDistance = distance;
      }
    }
    if (!current || !Number.isFinite(currentDistance)) break;
    unvisited.delete(current);
    if (current === targetTerritoryId) break;

    for (const route of STRATEGIC_ROUTES) {
      if (route.fromTerritoryId !== current && route.toTerritoryId !== current) continue;
      if ((routeRemaining[route.id] ?? 0) < 1) continue;
      const next = routeOtherEnd(route.id, current);
      if (!next || !unvisited.has(next) || !accessibleTerritory(state, next) || (territoryRemaining[next] ?? 0) < 1) continue;
      const capacity = Math.max(1, routeCapacity[route.id] ?? 1);
      const utilisation = 1 - (routeRemaining[route.id] ?? 0) / capacity;
      const territoryCapacity = Math.max(1, effectiveTerritoryThroughput(state, next));
      const territoryUtilisation = 1 - (territoryRemaining[next] ?? 0) / territoryCapacity;
      const cost = currentDistance + 1 + utilisation * 4 + territoryUtilisation * 2 + 8 / capacity;
      if (cost < (distances.get(next) ?? Number.POSITIVE_INFINITY)) {
        distances.set(next, cost);
        previous.set(next, { territoryId: current, routeId: route.id });
        sourceFor.set(next, sourceFor.get(current) ?? current);
      }
    }
  }

  const sourceTerritoryId = sourceFor.get(targetTerritoryId);
  if (!sourceTerritoryId) return null;
  const routeIds: string[] = [];
  const territoryIds: string[] = [];
  let cursor = targetTerritoryId;
  while (cursor !== sourceTerritoryId) {
    const step = previous.get(cursor);
    if (!step) return null;
    routeIds.unshift(step.routeId);
    territoryIds.unshift(cursor);
    cursor = step.territoryId;
  }
  return { sourceTerritoryId, routeIds, territoryIds, cost: distances.get(targetTerritoryId) ?? 0 };
}

function createRequests(state: GameState): SupplyRequest[] {
  const requests: SupplyRequest[] = [];
  for (const territoryId of Object.keys(state.territories).sort()) {
    const projectDemand = state.engineeringProjects
      .filter(project => project.status === 'active')
      .reduce((sum, project) => {
        const route = STRATEGIC_ROUTES.find(candidate => candidate.id === project.routeId);
        if (!route || (route.fromTerritoryId !== territoryId && route.toTerritoryId !== territoryId)) return sum;
        const civilDemand = project.kind === 'upgrade'
          ? 9
          : Math.max(3, Math.min(8, 3 + Math.ceil(Math.max(0, 100 - project.startingCondition) / 25)));
        return sum + Math.ceil(civilDemand / 2);
      }, 0);
    const demand = administrationSupplyDemand(state, territoryId) + projectDemand;
    if (demand > 0) {
      const priority = effectiveTerritoryLogisticsPriority(state, territoryId);
      requests.push({
        id: `ADMIN:${territoryId}`,
        kind: 'administration',
        targetTerritoryId: territoryId,
        demand,
        priority,
        automaticPriority: !state.logisticsPriorities?.territoryOverrides?.[territoryId],
        delivered: 0,
        pathCounts: new Map()
      });
    }
  }
  for (const group of Object.values(state.taskGroups).sort((a, b) => a.id.localeCompare(b.id))) {
    if (group.personnel <= 0) continue;
    const engineeringProject = state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === group.id && project.allocation > 0);
    const engineeringDemand = engineeringProject ? Math.max(1, Math.ceil(engineeringProject.allocation / 20)) : 0;
    const interdictionMission = state.interdictionMissions.find(mission => mission.status === 'active' && mission.assignedTaskGroupId === group.id);
    const interdictionDemand = interdictionMission ? Math.max(5, Math.ceil(interdictionMission.intensity / 8)) : 0;
    const priority = effectiveFormationLogisticsPriority(state, group.id);
    requests.push({
      id: `GROUP:${group.id}`,
      kind: 'formation',
      targetTerritoryId: group.location,
      demand: formationSupplyDemand(group) + engineeringDemand + interdictionDemand,
      priority,
      automaticPriority: !state.logisticsPriorities?.formationOverrides?.[group.id],
      delivered: 0,
      pathCounts: new Map()
    });
  }
  return requests;
}

function primaryPath(request: SupplyRequest): { sourceTerritoryId: string; routeIds: string[] } {
  let selected = '';
  let count = -1;
  for (const [signature, uses] of request.pathCounts) {
    if (uses > count || (uses === count && signature < selected)) {
      selected = signature;
      count = uses;
    }
  }
  if (!selected) return { sourceTerritoryId: request.targetTerritoryId, routeIds: [] };
  const separator = selected.indexOf('::');
  if (separator < 0) return { sourceTerritoryId: request.targetTerritoryId, routeIds: selected.split('|').filter(Boolean) };
  return {
    sourceTerritoryId: selected.slice(0, separator) || request.targetTerritoryId,
    routeIds: selected.slice(separator + 2).split('|').filter(Boolean)
  };
}

function routeFlowCondition(utilisation: number, used: number): RouteSupplyFlow['condition'] {
  if (used <= 0) return 'idle';
  if (utilisation >= 0.9) return 'overloaded';
  if (utilisation >= 0.65) return 'strained';
  return 'active';
}

export function calculateSupplyNetwork(state: GameState): LogisticsState {
  const requests = createRequests(state);
  const routeCapacity = Object.fromEntries(STRATEGIC_ROUTES.map(route => [route.id, effectiveRouteSupplyCapacity(state, route.id)]));
  const routeRemaining = { ...routeCapacity };
  const routeUsed = Object.fromEntries(STRATEGIC_ROUTES.map(route => [route.id, 0])) as Record<string, number>;
  const territoryRemaining = Object.fromEntries(Object.keys(state.territories).map(id => [id, effectiveTerritoryThroughput(state, id)]));
  const sourceCapacityByTerritory = Object.fromEntries(Object.keys(state.territories).map(id => [id, territorySupplySourceCapacity(state, id)]));
  const sourceRemaining = { ...sourceCapacityByTerritory };
  const sourceCapacity = Object.values(sourceCapacityByTerritory).reduce((sum, capacity) => sum + capacity, 0);
  const unavailable = new Set<string>();

  while (Object.values(sourceRemaining).some(remaining => remaining >= 1)) {
    const candidates = requests
      .filter(request => request.delivered < request.demand && !unavailable.has(request.id))
      .sort((a, b) => {
        const priorityDifference = logisticsPriorityRank[b.priority] - logisticsPriorityRank[a.priority];
        if (priorityDifference) return priorityDifference;
        const aScore = a.delivered / Math.max(1, a.demand);
        const bScore = b.delivered / Math.max(1, b.demand);
        return aScore - bScore || a.id.localeCompare(b.id);
      });
    if (!candidates.length) break;

    let allocated = false;
    for (const request of candidates) {
      const path = findCandidatePath(state, request.targetTerritoryId, routeRemaining, routeCapacity, territoryRemaining, sourceRemaining);
      if (!path) {
        unavailable.add(request.id);
        continue;
      }
      request.delivered += 1;
      sourceRemaining[path.sourceTerritoryId] = Math.max(0, (sourceRemaining[path.sourceTerritoryId] ?? 0) - 1);
      for (const routeId of path.routeIds) {
        routeRemaining[routeId] = Math.max(0, routeRemaining[routeId] - 1);
        routeUsed[routeId] += 1;
      }
      for (const territoryId of path.territoryIds) territoryRemaining[territoryId] = Math.max(0, territoryRemaining[territoryId] - 1);
      const signature = `${path.sourceTerritoryId}::${path.routeIds.join('|')}`;
      request.pathCounts.set(signature, (request.pathCounts.get(signature) ?? 0) + 1);
      allocated = true;
      break;
    }
    if (!allocated) break;
  }

  const routeFlows = Object.fromEntries(STRATEGIC_ROUTES.map(route => {
    const capacity = routeCapacity[route.id] ?? 0;
    const used = routeUsed[route.id] ?? 0;
    const utilisation = capacity > 0 ? used / capacity : 0;
    const flow: RouteSupplyFlow = {
      routeId: route.id,
      capacity,
      used,
      utilisation: round1(utilisation * 100),
      condition: routeFlowCondition(utilisation, used)
    };
    return [route.id, flow];
  }));

  const territoryAllocations: Record<string, TerritorySupplyAllocation> = {};
  for (const territoryId of Object.keys(state.territories)) {
    const territoryRequests = requests.filter(request => request.targetTerritoryId === territoryId);
    const demand = territoryRequests.reduce((sum, request) => sum + request.demand, 0);
    const delivered = territoryRequests.reduce((sum, request) => sum + request.delivered, 0);
    const ratio = demand > 0 ? delivered / demand : accessibleTerritory(state, territoryId) ? 1 : 0;
    const administrationRequest = territoryRequests.find(request => request.id === `ADMIN:${territoryId}`);
    const routeIds = [...new Set(territoryRequests.flatMap(request => primaryPath(request).routeIds))];
    territoryAllocations[territoryId] = {
      territoryId,
      demand,
      delivered,
      ratio: round1(ratio * 100),
      condition: supplyConditionForRatio(ratio),
      administrationDemand: administrationRequest?.demand ?? 0,
      administrationDelivered: administrationRequest?.delivered ?? 0,
      priority: administrationRequest?.priority ?? effectiveTerritoryLogisticsPriority(state, territoryId),
      automaticPriority: administrationRequest?.automaticPriority ?? !state.logisticsPriorities?.territoryOverrides?.[territoryId],
      routeIds
    };
  }

  const formationAllocations: Record<string, FormationSupplyAllocation> = {};
  for (const group of Object.values(state.taskGroups)) {
    const request = requests.find(candidate => candidate.id === `GROUP:${group.id}`);
    const demand = request?.demand ?? 0;
    const delivered = request?.delivered ?? 0;
    const ratio = demand > 0 ? delivered / demand : 0;
    const primary = request ? primaryPath(request) : { sourceTerritoryId: group.location, routeIds: [] };
    const path: SupplyPath = {
      sourceTerritoryId: primary.sourceTerritoryId,
      targetTerritoryId: group.location,
      routeIds: primary.routeIds
    };
    formationAllocations[group.id] = {
      groupId: group.id,
      demand,
      delivered,
      ratio: round1(ratio * 100),
      condition: supplyConditionForRatio(ratio),
      priority: request?.priority ?? effectiveFormationLogisticsPriority(state, group.id),
      automaticPriority: request?.automaticPriority ?? !state.logisticsPriorities?.formationOverrides?.[group.id],
      path
    };
  }

  const totalDemand = requests.reduce((sum, request) => sum + request.demand, 0);
  const totalDelivered = requests.reduce((sum, request) => sum + request.delivered, 0);
  const bottleneckRouteIds = Object.values(routeFlows)
    .filter(flow => flow.used > 0 && flow.utilisation >= 85)
    .sort((a, b) => b.utilisation - a.utilisation || a.routeId.localeCompare(b.routeId))
    .map(flow => flow.routeId);
  const starvedFormationIds = Object.values(formationAllocations)
    .filter(allocation => allocation.demand > 0 && allocation.ratio < 40)
    .map(allocation => allocation.groupId);
  const starvedTerritoryIds = Object.values(territoryAllocations)
    .filter(allocation => allocation.administrationDemand > 0 && allocation.administrationDelivered / allocation.administrationDemand < 0.4)
    .map(allocation => allocation.territoryId);

  return {
    turn: state.turn,
    sourceCapacity,
    sourceUsed: Object.entries(sourceCapacityByTerritory).reduce((sum, [id, capacity]) => sum + capacity - (sourceRemaining[id] ?? 0), 0),
    totalDemand,
    totalDelivered,
    networkEfficiency: totalDemand > 0 ? Math.round(totalDelivered / totalDemand * 100) : 100,
    routeFlows,
    territoryAllocations,
    formationAllocations,
    bottleneckRouteIds,
    starvedFormationIds,
    starvedTerritoryIds
  };
}

export function refreshSupplyNetwork(state: GameState): GameState {
  const logistics = calculateSupplyNetwork(state);
  const territories = structuredClone(state.territories);
  for (const [territoryId, territory] of Object.entries(territories)) {
    const allocation = logistics.territoryAllocations[territoryId];
    territory.supplied = territory.controller === 'player' && territory.occupation !== 'unsecured' && (allocation?.ratio ?? 0) >= 50;
  }
  return {
    ...state,
    territories,
    logistics,
    supply: logistics.networkEfficiency
  };
}

export function createEmptyLogisticsState(turn = 1): LogisticsState {
  return {
    turn,
    sourceCapacity: 0,
    sourceUsed: 0,
    totalDemand: 0,
    totalDelivered: 0,
    networkEfficiency: 100,
    routeFlows: {},
    territoryAllocations: {},
    formationAllocations: {},
    bottleneckRouteIds: [],
    starvedFormationIds: [],
    starvedTerritoryIds: []
  };
}


export type LogisticsPrioritySelection = LogisticsPriority | 'automatic';

function appendPriorityEvent(state: GameState, text: string, tone: 'neutral' | 'warning'): GameState {
  const event = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone } as const;
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

function starvationDescription(before: GameState, after: GameState): string {
  const priorGroups = new Set(before.logistics.starvedFormationIds ?? []);
  const priorTerritories = new Set(before.logistics.starvedTerritoryIds ?? []);
  const groups = (after.logistics.starvedFormationIds ?? [])
    .filter(id => !priorGroups.has(id))
    .map(id => after.taskGroups[id]?.name ?? id);
  const territories = (after.logistics.starvedTerritoryIds ?? [])
    .filter(id => !priorTerritories.has(id))
    .map(id => TERRITORIES[id]?.centre ?? id);
  return [...groups, ...territories].join(', ');
}

function applyPriorityChange(state: GameState, priorities: LogisticsPriorityState, description: string): GameState {
  const refreshed = refreshSupplyNetwork({ ...state, logisticsPriorities: priorities });
  const starved = starvationDescription(state, refreshed);
  return appendPriorityEvent(
    refreshed,
    starved ? `${description} The change leaves ${starved} below 40% of daily logistics demand.` : description,
    starved ? 'warning' : 'neutral'
  );
}

export function setFormationLogisticsPriority(
  state: GameState,
  groupId: string,
  selection: LogisticsPrioritySelection
): GameState {
  if (!state.taskGroups[groupId] || (selection !== 'automatic' && !isLogisticsPriority(selection))) return state;
  const priorities = normaliseLogisticsPriorities(state.logisticsPriorities, state.taskGroups, state.territories);
  const existing = priorities.formationOverrides[groupId];
  if ((selection === 'automatic' && existing === undefined) || existing === selection) return state;
  if (selection === 'automatic') delete priorities.formationOverrides[groupId];
  else priorities.formationOverrides[groupId] = selection;
  const label = selection === 'automatic'
    ? `automatic ${LOGISTICS_PRIORITY_LABELS[automaticFormationPriority[state.taskGroups[groupId].status]].toLowerCase()}`
    : LOGISTICS_PRIORITY_LABELS[selection].toLowerCase();
  return applyPriorityChange(state, priorities, `${state.taskGroups[groupId].name} logistics priority set to ${label}.`);
}

export function setTerritoryLogisticsPriority(
  state: GameState,
  territoryId: string,
  selection: LogisticsPrioritySelection
): GameState {
  const territory = state.territories[territoryId];
  if (!territory || territory.controller !== 'player' || (selection !== 'automatic' && !isLogisticsPriority(selection))) return state;
  const priorities = normaliseLogisticsPriorities(state.logisticsPriorities, state.taskGroups, state.territories);
  const existing = priorities.territoryOverrides[territoryId];
  if ((selection === 'automatic' && existing === undefined) || existing === selection) return state;
  if (selection === 'automatic') delete priorities.territoryOverrides[territoryId];
  else priorities.territoryOverrides[territoryId] = selection;
  const label = selection === 'automatic'
    ? `automatic ${LOGISTICS_PRIORITY_LABELS[automaticTerritoryPriority[territory.occupation]].toLowerCase()}`
    : LOGISTICS_PRIORITY_LABELS[selection].toLowerCase();
  return applyPriorityChange(state, priorities, `${TERRITORIES[territoryId].centre} administration logistics priority set to ${label}.`);
}
