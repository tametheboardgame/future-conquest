import { TERRITORIES } from './data';
import { STRATEGIC_NODES, STRATEGIC_ROUTES } from './strategic-network-data';
import type {
  FormationSupplyAllocation,
  GameState,
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
  damaged: 0.62,
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
  recovering: 1.2
};

const formationPriority: Record<TaskGroup['status'], number> = {
  ready: 1,
  moving: 1.12,
  attacking: 1.28,
  garrison: 0.86,
  recovering: 1.04
};

interface SupplyRequest {
  id: string;
  kind: 'formation' | 'administration';
  targetTerritoryId: string;
  demand: number;
  priority: number;
  delivered: number;
  pathCounts: Map<string, number>;
}

interface CandidatePath {
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
  const conditionFactor = clamp((routeState?.condition ?? 100) / 100, 0.2, 1);
  const capacityModifier = clamp(routeState?.capacityModifier ?? 1, 0, 1.5);
  const endpointBonus = Math.min(nodeSupplyById[route.fromNodeId] ?? 0, nodeSupplyById[route.toNodeId] ?? 0) * 2;
  return Math.max(0, Math.floor((route.supplyCapacity * 18 + endpointBonus) * statusFactor * conditionFactor * capacityModifier));
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

export function portalSupplyCapacity(state: GameState): number {
  const localThroughput = effectiveTerritoryThroughput(state, state.portalTerritory);
  const portalInfrastructure = nodeSupplyByTerritory[state.portalTerritory] ?? 0;
  return Math.max(180, Math.floor(145 + localThroughput * 0.72 + portalInfrastructure * 5));
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
  territoryRemaining: Record<string, number>
): CandidatePath | null {
  if (!accessibleTerritory(state, targetTerritoryId)) return null;
  if (targetTerritoryId === state.portalTerritory) return { routeIds: [], territoryIds: [], cost: 0 };

  const distances = new Map<string, number>([[state.portalTerritory, 0]]);
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
      }
    }
  }

  if (!previous.has(targetTerritoryId)) return null;
  const routeIds: string[] = [];
  const territoryIds: string[] = [];
  let cursor = targetTerritoryId;
  while (cursor !== state.portalTerritory) {
    const step = previous.get(cursor);
    if (!step) return null;
    routeIds.unshift(step.routeId);
    territoryIds.unshift(cursor);
    cursor = step.territoryId;
  }
  return { routeIds, territoryIds, cost: distances.get(targetTerritoryId) ?? 0 };
}

function createRequests(state: GameState): SupplyRequest[] {
  const requests: SupplyRequest[] = [];
  for (const territoryId of Object.keys(state.territories).sort()) {
    const demand = administrationSupplyDemand(state, territoryId);
    if (demand > 0) requests.push({
      id: `ADMIN:${territoryId}`,
      kind: 'administration',
      targetTerritoryId: territoryId,
      demand,
      priority: 0.92,
      delivered: 0,
      pathCounts: new Map()
    });
  }
  for (const group of Object.values(state.taskGroups).sort((a, b) => a.id.localeCompare(b.id))) {
    if (group.personnel <= 0) continue;
    requests.push({
      id: `GROUP:${group.id}`,
      kind: 'formation',
      targetTerritoryId: group.location,
      demand: formationSupplyDemand(group),
      priority: formationPriority[group.status],
      delivered: 0,
      pathCounts: new Map()
    });
  }
  return requests;
}

function primaryPath(request: SupplyRequest): string[] {
  let selected = '';
  let count = -1;
  for (const [signature, uses] of request.pathCounts) {
    if (uses > count || (uses === count && signature < selected)) {
      selected = signature;
      count = uses;
    }
  }
  return selected ? selected.split('|').filter(Boolean) : [];
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
  const sourceCapacity = portalSupplyCapacity(state);
  let sourceRemaining = sourceCapacity;
  const unavailable = new Set<string>();

  while (sourceRemaining >= 1) {
    const candidates = requests
      .filter(request => request.delivered < request.demand && !unavailable.has(request.id))
      .sort((a, b) => {
        const aScore = a.delivered / Math.max(1, a.demand * a.priority);
        const bScore = b.delivered / Math.max(1, b.demand * b.priority);
        return aScore - bScore || b.priority - a.priority || a.id.localeCompare(b.id);
      });
    if (!candidates.length) break;

    let allocated = false;
    for (const request of candidates) {
      const path = findCandidatePath(state, request.targetTerritoryId, routeRemaining, routeCapacity, territoryRemaining);
      if (!path) {
        unavailable.add(request.id);
        continue;
      }
      request.delivered += 1;
      sourceRemaining -= 1;
      for (const routeId of path.routeIds) {
        routeRemaining[routeId] = Math.max(0, routeRemaining[routeId] - 1);
        routeUsed[routeId] += 1;
      }
      for (const territoryId of path.territoryIds) territoryRemaining[territoryId] = Math.max(0, territoryRemaining[territoryId] - 1);
      const signature = path.routeIds.join('|');
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
    const routeIds = [...new Set(territoryRequests.flatMap(primaryPath))];
    territoryAllocations[territoryId] = {
      territoryId,
      demand,
      delivered,
      ratio: round1(ratio * 100),
      condition: supplyConditionForRatio(ratio),
      routeIds
    };
  }

  const formationAllocations: Record<string, FormationSupplyAllocation> = {};
  for (const group of Object.values(state.taskGroups)) {
    const request = requests.find(candidate => candidate.id === `GROUP:${group.id}`);
    const demand = request?.demand ?? 0;
    const delivered = request?.delivered ?? 0;
    const ratio = demand > 0 ? delivered / demand : 0;
    const routeIds = request ? primaryPath(request) : [];
    const path: SupplyPath = {
      sourceTerritoryId: state.portalTerritory,
      targetTerritoryId: group.location,
      routeIds
    };
    formationAllocations[group.id] = {
      groupId: group.id,
      demand,
      delivered,
      ratio: round1(ratio * 100),
      condition: supplyConditionForRatio(ratio),
      path
    };
  }

  const totalDemand = requests.reduce((sum, request) => sum + request.demand, 0);
  const totalDelivered = requests.reduce((sum, request) => sum + request.delivered, 0);
  const bottleneckRouteIds = Object.values(routeFlows)
    .filter(flow => flow.used > 0 && flow.utilisation >= 85)
    .sort((a, b) => b.utilisation - a.utilisation || a.routeId.localeCompare(b.routeId))
    .map(flow => flow.routeId);

  return {
    turn: state.turn,
    sourceCapacity,
    sourceUsed: sourceCapacity - sourceRemaining,
    totalDemand,
    totalDelivered,
    networkEfficiency: totalDemand > 0 ? Math.round(totalDelivered / totalDemand * 100) : 100,
    routeFlows,
    territoryAllocations,
    formationAllocations,
    bottleneckRouteIds
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
    bottleneckRouteIds: []
  };
}
