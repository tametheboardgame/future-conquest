from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"Expected marker not found in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, count))


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


# --- Types --------------------------------------------------------------------
replace(
    'src/game/types.ts',
    "export type SupplyCondition = 'sustained' | 'strained' | 'undersupplied' | 'critical' | 'cut-off';\n",
    "export type SupplyCondition = 'sustained' | 'strained' | 'undersupplied' | 'critical' | 'cut-off';\nexport type LogisticsPriority = 'critical' | 'high' | 'standard' | 'restricted';\n"
)
replace(
    'src/game/types.ts',
    "export type InterdictionMissionStatus = 'active' | 'succeeded' | 'failed' | 'cancelled';\n",
    "export type InterdictionMissionStatus = 'active' | 'succeeded' | 'failed' | 'cancelled';\n\nexport interface LogisticsPriorityState {\n  formationOverrides: Record<string, LogisticsPriority>;\n  territoryOverrides: Record<string, LogisticsPriority>;\n}\n"
)
replace(
    'src/game/types.ts',
    "export interface FormationSupplyAllocation {\n  groupId: string;\n  demand: number;\n  delivered: number;\n  ratio: number;\n  condition: SupplyCondition;\n  path: SupplyPath;\n}\n",
    "export interface FormationSupplyAllocation {\n  groupId: string;\n  demand: number;\n  delivered: number;\n  ratio: number;\n  condition: SupplyCondition;\n  priority: LogisticsPriority;\n  automaticPriority: boolean;\n  path: SupplyPath;\n}\n"
)
replace(
    'src/game/types.ts',
    "export interface TerritorySupplyAllocation {\n  territoryId: string;\n  demand: number;\n  delivered: number;\n  ratio: number;\n  condition: SupplyCondition;\n  routeIds: string[];\n}\n",
    "export interface TerritorySupplyAllocation {\n  territoryId: string;\n  demand: number;\n  delivered: number;\n  ratio: number;\n  condition: SupplyCondition;\n  administrationDemand: number;\n  administrationDelivered: number;\n  priority: LogisticsPriority;\n  automaticPriority: boolean;\n  routeIds: string[];\n}\n"
)
replace(
    'src/game/types.ts',
    "  formationAllocations: Record<string, FormationSupplyAllocation>;\n  bottleneckRouteIds: string[];\n",
    "  formationAllocations: Record<string, FormationSupplyAllocation>;\n  bottleneckRouteIds: string[];\n  starvedFormationIds: string[];\n  starvedTerritoryIds: string[];\n"
)
replace('src/game/types.ts', '  version: 11;\n', '  version: 12;\n')
replace(
    'src/game/types.ts',
    "  logistics: LogisticsState;\n  infrastructureIncidents?: InfrastructureIncident[];\n",
    "  logistics: LogisticsState;\n  logisticsPriorities: LogisticsPriorityState;\n  infrastructureIncidents?: InfrastructureIncident[];\n"
)

# --- Priority-aware supply network --------------------------------------------
replace(
    'src/game/supply-network.ts',
    "  FormationSupplyAllocation,\n  GameState,\n  LogisticsState,\n",
    "  FormationSupplyAllocation,\n  GameState,\n  LogisticsPriority,\n  LogisticsPriorityState,\n  LogisticsState,\n"
)
replace(
    'src/game/supply-network.ts',
    "const formationPriority: Record<TaskGroup['status'], number> = {\n  ready: 1,\n  moving: 1.12,\n  attacking: 1.28,\n  garrison: 0.86,\n  recovering: 1.04,\n  engineering: 1.16,\n  interdicting: 1.22\n};\n",
    "export const LOGISTICS_PRIORITY_LABELS: Record<LogisticsPriority, string> = {\n  critical: 'Critical',\n  high: 'High',\n  standard: 'Standard',\n  restricted: 'Restricted'\n};\n\nexport const LOGISTICS_PRIORITY_OPTIONS: LogisticsPriority[] = ['critical', 'high', 'standard', 'restricted'];\n\nconst logisticsPriorityRank: Record<LogisticsPriority, number> = {\n  critical: 4,\n  high: 3,\n  standard: 2,\n  restricted: 1\n};\n\nconst automaticFormationPriority: Record<TaskGroup['status'], LogisticsPriority> = {\n  ready: 'standard',\n  moving: 'high',\n  attacking: 'critical',\n  garrison: 'standard',\n  recovering: 'high',\n  engineering: 'high',\n  interdicting: 'high'\n};\n\nconst automaticTerritoryPriority: Record<string, LogisticsPriority> = {\n  enemy: 'restricted',\n  unsecured: 'restricted',\n  contested: 'high',\n  controlled: 'standard',\n  administered: 'restricted'\n};\n\nconst isLogisticsPriority = (value: unknown): value is LogisticsPriority => LOGISTICS_PRIORITY_OPTIONS.includes(value as LogisticsPriority);\n\nexport function createEmptyLogisticsPriorities(): LogisticsPriorityState {\n  return { formationOverrides: {}, territoryOverrides: {} };\n}\n\nexport function normaliseLogisticsPriorities(\n  value: unknown,\n  taskGroups: GameState['taskGroups'],\n  territories: GameState['territories']\n): LogisticsPriorityState {\n  const raw = value && typeof value === 'object' ? value as Partial<LogisticsPriorityState> : {};\n  const formationOverrides: Record<string, LogisticsPriority> = {};\n  const territoryOverrides: Record<string, LogisticsPriority> = {};\n  if (raw.formationOverrides && typeof raw.formationOverrides === 'object') {\n    for (const [id, priority] of Object.entries(raw.formationOverrides)) {\n      if (taskGroups[id] && isLogisticsPriority(priority)) formationOverrides[id] = priority;\n    }\n  }\n  if (raw.territoryOverrides && typeof raw.territoryOverrides === 'object') {\n    for (const [id, priority] of Object.entries(raw.territoryOverrides)) {\n      if (territories[id] && isLogisticsPriority(priority)) territoryOverrides[id] = priority;\n    }\n  }\n  return { formationOverrides, territoryOverrides };\n}\n\nexport function effectiveFormationLogisticsPriority(state: GameState, groupId: string): LogisticsPriority {\n  const group = state.taskGroups[groupId];\n  return state.logisticsPriorities?.formationOverrides?.[groupId] ?? automaticFormationPriority[group?.status ?? 'ready'];\n}\n\nexport function effectiveTerritoryLogisticsPriority(state: GameState, territoryId: string): LogisticsPriority {\n  const territory = state.territories[territoryId];\n  return state.logisticsPriorities?.territoryOverrides?.[territoryId] ?? automaticTerritoryPriority[territory?.occupation ?? 'enemy'];\n}\n"
)
replace(
    'src/game/supply-network.ts',
    "  priority: number;\n  delivered: number;\n",
    "  priority: LogisticsPriority;\n  automaticPriority: boolean;\n  delivered: number;\n"
)
replace(
    'src/game/supply-network.ts',
    "    if (demand > 0) requests.push({\n      id: `ADMIN:${territoryId}`,\n      kind: 'administration',\n      targetTerritoryId: territoryId,\n      demand,\n      priority: 0.92,\n      delivered: 0,\n      pathCounts: new Map()\n    });\n",
    "    if (demand > 0) {\n      const priority = effectiveTerritoryLogisticsPriority(state, territoryId);\n      requests.push({\n        id: `ADMIN:${territoryId}`,\n        kind: 'administration',\n        targetTerritoryId: territoryId,\n        demand,\n        priority,\n        automaticPriority: !state.logisticsPriorities?.territoryOverrides?.[territoryId],\n        delivered: 0,\n        pathCounts: new Map()\n      });\n    }\n"
)
replace(
    'src/game/supply-network.ts',
    "    requests.push({\n      id: `GROUP:${group.id}`,\n      kind: 'formation',\n      targetTerritoryId: group.location,\n      demand: formationSupplyDemand(group) + engineeringDemand + interdictionDemand,\n      priority: engineeringProject ? Math.max(1.16, formationPriority[group.status]) : formationPriority[group.status],\n      delivered: 0,\n      pathCounts: new Map()\n    });\n",
    "    const priority = effectiveFormationLogisticsPriority(state, group.id);\n    requests.push({\n      id: `GROUP:${group.id}`,\n      kind: 'formation',\n      targetTerritoryId: group.location,\n      demand: formationSupplyDemand(group) + engineeringDemand + interdictionDemand,\n      priority,\n      automaticPriority: !state.logisticsPriorities?.formationOverrides?.[group.id],\n      delivered: 0,\n      pathCounts: new Map()\n    });\n"
)
replace(
    'src/game/supply-network.ts',
    "      .sort((a, b) => {\n        const aScore = a.delivered / Math.max(1, a.demand * a.priority);\n        const bScore = b.delivered / Math.max(1, b.demand * b.priority);\n        return aScore - bScore || b.priority - a.priority || a.id.localeCompare(b.id);\n      });\n",
    "      .sort((a, b) => {\n        const priorityDifference = logisticsPriorityRank[b.priority] - logisticsPriorityRank[a.priority];\n        if (priorityDifference) return priorityDifference;\n        const aScore = a.delivered / Math.max(1, a.demand);\n        const bScore = b.delivered / Math.max(1, b.demand);\n        return aScore - bScore || a.id.localeCompare(b.id);\n      });\n"
)
replace(
    'src/game/supply-network.ts',
    "    const ratio = demand > 0 ? delivered / demand : accessibleTerritory(state, territoryId) ? 1 : 0;\n    const routeIds = [...new Set(territoryRequests.flatMap(primaryPath))];\n    territoryAllocations[territoryId] = {\n      territoryId,\n      demand,\n      delivered,\n      ratio: round1(ratio * 100),\n      condition: supplyConditionForRatio(ratio),\n      routeIds\n    };\n",
    "    const ratio = demand > 0 ? delivered / demand : accessibleTerritory(state, territoryId) ? 1 : 0;\n    const administrationRequest = territoryRequests.find(request => request.id === `ADMIN:${territoryId}`);\n    const routeIds = [...new Set(territoryRequests.flatMap(primaryPath))];\n    territoryAllocations[territoryId] = {\n      territoryId,\n      demand,\n      delivered,\n      ratio: round1(ratio * 100),\n      condition: supplyConditionForRatio(ratio),\n      administrationDemand: administrationRequest?.demand ?? 0,\n      administrationDelivered: administrationRequest?.delivered ?? 0,\n      priority: administrationRequest?.priority ?? effectiveTerritoryLogisticsPriority(state, territoryId),\n      automaticPriority: administrationRequest?.automaticPriority ?? !state.logisticsPriorities?.territoryOverrides?.[territoryId],\n      routeIds\n    };\n"
)
replace(
    'src/game/supply-network.ts',
    "      ratio: round1(ratio * 100),\n      condition: supplyConditionForRatio(ratio),\n      path\n",
    "      ratio: round1(ratio * 100),\n      condition: supplyConditionForRatio(ratio),\n      priority: request?.priority ?? effectiveFormationLogisticsPriority(state, group.id),\n      automaticPriority: request?.automaticPriority ?? !state.logisticsPriorities?.formationOverrides?.[group.id],\n      path\n"
)
replace(
    'src/game/supply-network.ts',
    "  const bottleneckRouteIds = Object.values(routeFlows)\n    .filter(flow => flow.used > 0 && flow.utilisation >= 85)\n    .sort((a, b) => b.utilisation - a.utilisation || a.routeId.localeCompare(b.routeId))\n    .map(flow => flow.routeId);\n\n  return {\n",
    "  const bottleneckRouteIds = Object.values(routeFlows)\n    .filter(flow => flow.used > 0 && flow.utilisation >= 85)\n    .sort((a, b) => b.utilisation - a.utilisation || a.routeId.localeCompare(b.routeId))\n    .map(flow => flow.routeId);\n  const starvedFormationIds = Object.values(formationAllocations)\n    .filter(allocation => allocation.demand > 0 && allocation.ratio < 40)\n    .map(allocation => allocation.groupId);\n  const starvedTerritoryIds = Object.values(territoryAllocations)\n    .filter(allocation => allocation.administrationDemand > 0 && allocation.administrationDelivered / allocation.administrationDemand < 0.4)\n    .map(allocation => allocation.territoryId);\n\n  return {\n"
)
replace(
    'src/game/supply-network.ts',
    "    formationAllocations,\n    bottleneckRouteIds\n",
    "    formationAllocations,\n    bottleneckRouteIds,\n    starvedFormationIds,\n    starvedTerritoryIds\n"
)
replace(
    'src/game/supply-network.ts',
    "    formationAllocations: {},\n    bottleneckRouteIds: []\n",
    "    formationAllocations: {},\n    bottleneckRouteIds: [],\n    starvedFormationIds: [],\n    starvedTerritoryIds: []\n"
)

supply_path = Path('src/game/supply-network.ts')
supply_text = supply_path.read_text()
supply_text += r'''

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
'''
supply_path.write_text(supply_text)

# --- Persistence and migration -------------------------------------------------
replace(
    'src/game/strategic-response.ts',
    "import { refreshSupplyNetwork } from './supply-network';\n",
    "import { normaliseLogisticsPriorities, refreshSupplyNetwork } from './supply-network';\n"
)
replace(
    'src/game/strategic-response.ts',
    "  | 'interdictionMissions';\n",
    "  | 'interdictionMissions'\n  | 'logisticsPriorities';\n"
)
replace(
    'src/game/strategic-response.ts',
    "  interdictionMissions?: GameState['interdictionMissions'];\n",
    "  interdictionMissions?: GameState['interdictionMissions'];\n  logisticsPriorities?: GameState['logisticsPriorities'];\n"
)
replace(
    'src/game/strategic-response.ts',
    "  const interdiction = normaliseInterdictionState(state.interdictionMissions, engineering.taskGroups, { territories: state.territories, routeStates });\n  const upgraded = {\n",
    "  const interdiction = normaliseInterdictionState(state.interdictionMissions, engineering.taskGroups, { territories: state.territories, routeStates });\n  const logisticsPriorities = normaliseLogisticsPriorities(state.logisticsPriorities, interdiction.taskGroups, state.territories);\n  const upgraded = {\n"
)
replace(
    'src/game/strategic-response.ts',
    "    version: 11,\n    taskGroups: interdiction.taskGroups,\n",
    "    version: 12,\n    taskGroups: interdiction.taskGroups,\n"
)
replace(
    'src/game/strategic-response.ts',
    "    interdictionMissions: interdiction.missions,\n    escalationStage:",
    "    interdictionMissions: interdiction.missions,\n    logisticsPriorities,\n    escalationStage:"
)

replace(
    'src/game/engine.ts',
    "import { createEmptyLogisticsState, refreshSupplyNetwork } from './supply-network';\n",
    "import { createEmptyLogisticsPriorities, createEmptyLogisticsState, refreshSupplyNetwork } from './supply-network';\n"
)
replace(
    'src/game/engine.ts',
    "const SAVE_KEY = 'future-conquest-slice-v0.11';\nconst LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';\n",
    "const SAVE_KEY = 'future-conquest-slice-v0.12';\nconst LEGACY_V11_SAVE_KEY = 'future-conquest-slice-v0.11';\nconst LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';\n"
)
replace('src/game/engine.ts', '    version: 11,\n', '    version: 12,\n')
replace(
    'src/game/engine.ts',
    "    logistics: createEmptyLogisticsState(1),\n    infrastructureIncidents: [],\n",
    "    logistics: createEmptyLogisticsState(1),\n    logisticsPriorities: createEmptyLogisticsPriorities(),\n    infrastructureIncidents: [],\n"
)
replace(
    'src/game/engine.ts',
    "    logistics: structuredClone(state.logistics),\n    infrastructureIncidents:",
    "    logistics: structuredClone(state.logistics),\n    logisticsPriorities: structuredClone(state.logisticsPriorities),\n    infrastructureIncidents:"
)
replace(
    'src/game/engine.ts',
    "type InterdictionField = 'interdictionMissions';\n\ntype LegacyV10GameState = Omit<GameState, 'version' | InterdictionField> & { version: 10 };\ntype LegacyV9GameState = Omit<GameState, 'version' | EngineeringField | InterdictionField> & { version: 9 };\ntype LegacyV8GameState = Omit<GameState, 'version' | 'infrastructureIncidents' | EngineeringField | InterdictionField> & { version: 8 };\ntype LegacyV7GameState = Omit<GameState, 'version' | LogisticsField | 'infrastructureIncidents' | EngineeringField | InterdictionField> & { version: 7 };\ntype LegacyV6GameState = Omit<GameState, 'version' | LogisticsField | EngineeringField | InterdictionField> & { version: 6 };\ntype LegacyV5GameState = Omit<GameState, 'version' | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 5 };\ntype LegacyV4GameState = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 4 };\ntype LegacyV3GameState = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 3 };\ntype LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & {\n",
    "type InterdictionField = 'interdictionMissions';\ntype PriorityField = 'logisticsPriorities';\n\ntype LegacyV11GameState = Omit<GameState, 'version' | PriorityField> & { version: 11 };\ntype LegacyV10GameState = Omit<GameState, 'version' | InterdictionField | PriorityField> & { version: 10 };\ntype LegacyV9GameState = Omit<GameState, 'version' | EngineeringField | InterdictionField | PriorityField> & { version: 9 };\ntype LegacyV8GameState = Omit<GameState, 'version' | 'infrastructureIncidents' | EngineeringField | InterdictionField | PriorityField> & { version: 8 };\ntype LegacyV7GameState = Omit<GameState, 'version' | LogisticsField | 'infrastructureIncidents' | EngineeringField | InterdictionField | PriorityField> & { version: 7 };\ntype LegacyV6GameState = Omit<GameState, 'version' | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 6 };\ntype LegacyV5GameState = Omit<GameState, 'version' | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 5 };\ntype LegacyV4GameState = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 4 };\ntype LegacyV3GameState = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 3 };\ntype LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & {\n"
)
replace(
    'src/game/engine.ts',
    "  const current = localStorage.getItem(SAVE_KEY);\n  if (current) {\n    const parsed = JSON.parse(current) as Partial<GameState>;\n    if (\n      parsed.version === 11\n      && parsed.taskGroups\n      && parsed.enemyFormations\n      && parsed.operations\n      && parsed.mobilisations\n      && parsed.enemyOrders\n      && parsed.intelligenceReports\n      && parsed.routeStates\n      && parsed.infrastructureIncidents\n      && parsed.engineeringProjects\n      && parsed.interdictionMissions\n    ) return upgradeStrategicState(parsed as GameState);\n  }\n\n  const v10 = localStorage.getItem(LEGACY_V10_SAVE_KEY);\n",
    "  const current = localStorage.getItem(SAVE_KEY);\n  if (current) {\n    const parsed = JSON.parse(current) as Partial<GameState>;\n    if (\n      parsed.version === 12\n      && parsed.taskGroups\n      && parsed.enemyFormations\n      && parsed.operations\n      && parsed.mobilisations\n      && parsed.enemyOrders\n      && parsed.intelligenceReports\n      && parsed.routeStates\n      && parsed.infrastructureIncidents\n      && parsed.engineeringProjects\n      && parsed.interdictionMissions\n      && parsed.logisticsPriorities\n    ) return upgradeStrategicState(parsed as GameState);\n  }\n\n  const v11 = localStorage.getItem(LEGACY_V11_SAVE_KEY);\n  if (v11) {\n    const parsed = JSON.parse(v11) as Partial<LegacyV11GameState>;\n    if (\n      parsed.version === 11\n      && parsed.taskGroups\n      && parsed.enemyFormations\n      && parsed.operations\n      && parsed.mobilisations\n      && parsed.enemyOrders\n      && parsed.intelligenceReports\n      && parsed.routeStates\n      && parsed.logistics\n      && parsed.infrastructureIncidents\n      && parsed.engineeringProjects\n      && parsed.interdictionMissions\n    ) return upgradeStrategicState(parsed as LegacyV11GameState);\n  }\n\n  const v10 = localStorage.getItem(LEGACY_V10_SAVE_KEY);\n"
)

# Persistence controller uses the same version chain.
replace(
    'src/game/persistence.ts',
    "export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.11';\nexport const SAVE_METADATA_KEY = 'future-conquest-slice-v0.11-metadata';\nexport const LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';\n",
    "export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.12';\nexport const SAVE_METADATA_KEY = 'future-conquest-slice-v0.12-metadata';\nexport const LEGACY_V11_SAVE_KEY = 'future-conquest-slice-v0.11';\nexport const LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';\n"
)
replace('src/game/persistence.ts', '  saveVersion: 11;\n', '  saveVersion: 12;\n')
replace(
    'src/game/persistence.ts',
    "source: 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'",
    "source: 'v12' | 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'"
)
replace(
    'src/game/persistence.ts',
    "type InterdictionField = 'interdictionMissions';\n\ntype LegacyV10State = Omit<GameState, 'version' | InterdictionField> & { version: 10 };\ntype LegacyV9State = Omit<GameState, 'version' | EngineeringField | InterdictionField> & { version: 9 };\ntype LegacyV8State = Omit<GameState, 'version' | 'infrastructureIncidents' | EngineeringField | InterdictionField> & { version: 8 };\ntype LegacyV7State = Omit<GameState, 'version' | LogisticsField | 'infrastructureIncidents' | EngineeringField | InterdictionField> & { version: 7 };\ntype LegacyV6State = Omit<GameState, 'version' | LogisticsField | EngineeringField | InterdictionField> & { version: 6 };\ntype LegacyV5State = Omit<GameState, 'version' | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 5 };\ntype LegacyV4State = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 4 };\ntype LegacyV3State = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & { version: 3 };\ntype LegacyV2State = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & {\n",
    "type InterdictionField = 'interdictionMissions';\ntype PriorityField = 'logisticsPriorities';\n\ntype LegacyV11State = Omit<GameState, 'version' | PriorityField> & { version: 11 };\ntype LegacyV10State = Omit<GameState, 'version' | InterdictionField | PriorityField> & { version: 10 };\ntype LegacyV9State = Omit<GameState, 'version' | EngineeringField | InterdictionField | PriorityField> & { version: 9 };\ntype LegacyV8State = Omit<GameState, 'version' | 'infrastructureIncidents' | EngineeringField | InterdictionField | PriorityField> & { version: 8 };\ntype LegacyV7State = Omit<GameState, 'version' | LogisticsField | 'infrastructureIncidents' | EngineeringField | InterdictionField | PriorityField> & { version: 7 };\ntype LegacyV6State = Omit<GameState, 'version' | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 6 };\ntype LegacyV5State = Omit<GameState, 'version' | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 5 };\ntype LegacyV4State = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 4 };\ntype LegacyV3State = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & { version: 3 };\ntype LegacyV2State = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField | PriorityField> & {\n"
)
replace(
    'src/game/persistence.ts',
    "function isV11State(value: unknown): value is GameState {\n  return hasCoreCampaignState(value)\n    && value.version === 11\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics)\n    && Array.isArray(value.infrastructureIncidents)\n    && Array.isArray(value.engineeringProjects)\n    && Array.isArray(value.interdictionMissions);\n}\n",
    "function isV12State(value: unknown): value is GameState {\n  return hasCoreCampaignState(value)\n    && value.version === 12\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics)\n    && isRecord(value.logisticsPriorities)\n    && Array.isArray(value.infrastructureIncidents)\n    && Array.isArray(value.engineeringProjects)\n    && Array.isArray(value.interdictionMissions);\n}\n\nfunction isV11State(value: unknown): value is LegacyV11State {\n  return hasCoreCampaignState(value)\n    && value.version === 11\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics)\n    && Array.isArray(value.infrastructureIncidents)\n    && Array.isArray(value.engineeringProjects)\n    && Array.isArray(value.interdictionMissions);\n}\n"
)
replace('src/game/persistence.ts', '    saveVersion: 11,\n', '    saveVersion: 12,\n')
replace('src/game/persistence.ts', '    && value.saveVersion === 11\n', '    && value.saveVersion === 12\n')
replace(
    'src/game/persistence.ts',
    "function inspectRaw(storage: StorageReader, raw: string, source: 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'): SaveInspection {\n",
    "function inspectRaw(storage: StorageReader, raw: string, source: 'v12' | 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'): SaveInspection {\n"
)
replace(
    'src/game/persistence.ts',
    "    if (source === 'v11' && isV11State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v10' && isV10State(parsed)) {\n",
    "    if (source === 'v12' && isV12State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v11' && isV11State(parsed)) {\n      const state = upgradeStrategicState(parsed);\n      return { ok: true, state, metadata: createSaveMetadata(state, null), source };\n    }\n    if (source === 'v10' && isV10State(parsed)) {\n"
)
replace(
    'src/game/persistence.ts',
    "  if (current) return inspectRaw(storage, current, 'v11');\n\n  const v10 = readRaw(storage, LEGACY_V10_SAVE_KEY);\n",
    "  if (current) return inspectRaw(storage, current, 'v12');\n\n  const v11 = readRaw(storage, LEGACY_V11_SAVE_KEY);\n  if (typeof v11 !== 'string' && v11 !== null) return v11;\n  if (v11) return inspectRaw(storage, v11, 'v11');\n\n  const v10 = readRaw(storage, LEGACY_V10_SAVE_KEY);\n"
)
replace('src/game/persistence.ts', '    if (!isV11State(parsed)) return', '    if (!isV12State(parsed)) return')

# --- Logistics command interface ----------------------------------------------
write('src/components/LogisticsCommand.tsx', r'''import { TERRITORIES } from '../game/data';
import { STRATEGIC_ROUTE_BY_ID } from '../game/strategic-network-data';
import {
  LOGISTICS_PRIORITY_LABELS,
  LOGISTICS_PRIORITY_OPTIONS,
  SUPPLY_CONDITION_LABELS,
  setFormationLogisticsPriority,
  setTerritoryLogisticsPriority,
  type LogisticsPrioritySelection
} from '../game/supply-network';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onChange: (state: GameState) => void;
  onOpenGroup: (groupId: string) => void;
  onOpenTerritory: (territoryId: string) => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);

function PrioritySelect({ value, effective, onChange, label }: {
  value: LogisticsPrioritySelection;
  effective: keyof typeof LOGISTICS_PRIORITY_LABELS;
  onChange: (value: LogisticsPrioritySelection) => void;
  label: string;
}) {
  return <label className="logistics-priority-select">
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value as LogisticsPrioritySelection)}>
      <option value="automatic">Automatic · {LOGISTICS_PRIORITY_LABELS[effective]}</option>
      {LOGISTICS_PRIORITY_OPTIONS.map(priority => <option key={priority} value={priority}>{LOGISTICS_PRIORITY_LABELS[priority]}</option>)}
    </select>
  </label>;
}

export function LogisticsCommand({ state, onChange, onOpenGroup, onOpenTerritory }: Props) {
  const groups = Object.values(state.taskGroups)
    .filter(group => group.personnel > 0)
    .sort((a, b) => {
      const aAllocation = state.logistics.formationAllocations[a.id];
      const bAllocation = state.logistics.formationAllocations[b.id];
      return (aAllocation?.ratio ?? 0) - (bAllocation?.ratio ?? 0) || a.name.localeCompare(b.name);
    });
  const territories = Object.keys(state.territories)
    .filter(id => state.territories[id].controller === 'player' && (state.logistics.territoryAllocations[id]?.administrationDemand ?? 0) > 0)
    .sort((a, b) => TERRITORIES[a].centre.localeCompare(TERRITORIES[b].centre));
  const bottlenecks = state.logistics.bottleneckRouteIds.flatMap(id => STRATEGIC_ROUTE_BY_ID[id] ? [STRATEGIC_ROUTE_BY_ID[id]] : []);
  const shortfalls = state.logistics.starvedFormationIds.length + state.logistics.starvedTerritoryIds.length;

  return <section className="command-view logistics-priority-view">
    <header className="command-view-header">
      <div><p className="panel-label">LOGISTICS</p><h2>Supply priority command</h2></div>
      <p>Automatic priorities handle normal operations. Override them only when limited throughput requires a deliberate choice.</p>
    </header>

    <div className="logistics-priority-summary">
      <div><span>Source use</span><strong>{state.logistics.sourceUsed} / {state.logistics.sourceCapacity}</strong></div>
      <div><span>Demand served</span><strong>{state.logistics.totalDelivered} / {state.logistics.totalDemand}</strong></div>
      <div><span>Network efficiency</span><strong>{state.logistics.networkEfficiency}%</strong></div>
      <div className={shortfalls ? 'warning' : ''}><span>Severe shortfalls</span><strong>{shortfalls}</strong></div>
    </div>

    <section className="view-panel logistics-doctrine-panel">
      <div><p className="panel-label">ALLOCATION DOCTRINE</p><h3>Critical → High → Standard → Restricted</h3></div>
      <p>Higher tiers receive available throughput before lower tiers. Requests within the same tier are balanced proportionally. Automatic defaults make attacks Critical; movement, recovery, engineering and interdiction High; normal formations Standard; and stable administered territory Restricted.</p>
    </section>

    <div className="logistics-priority-grid">
      <section className="view-panel formation-priority-panel">
        <div className="view-panel-heading"><p className="panel-label">FORMATION PRIORITIES</p><strong>{groups.length}</strong></div>
        <div className="logistics-priority-list">{groups.map(group => {
          const allocation = state.logistics.formationAllocations[group.id];
          const override = state.logisticsPriorities.formationOverrides[group.id];
          const starved = state.logistics.starvedFormationIds.includes(group.id);
          return <article key={group.id} className={`logistics-priority-card ${allocation?.priority ?? 'standard'} ${starved ? 'starved' : ''}`}>
            <header>
              <button type="button" onClick={() => onOpenGroup(group.id)}><strong>{group.name}</strong><span>{TERRITORIES[group.location].centre} · {group.status}</span></button>
              <b>{allocation?.ratio ?? 0}%</b>
            </header>
            <div className="logistics-throughput-row">
              <span>Requested <strong>{allocation?.demand ?? 0}</strong></span>
              <span>Delivered <strong>{allocation?.delivered ?? 0}</strong></span>
              <span className={`supply-condition ${allocation?.condition ?? 'cut-off'}`}>{SUPPLY_CONDITION_LABELS[allocation?.condition ?? 'cut-off']}</span>
            </div>
            <PrioritySelect
              label="Formation priority"
              value={override ?? 'automatic'}
              effective={allocation?.priority ?? 'standard'}
              onChange={value => onChange(setFormationLogisticsPriority(state, group.id, value))}
            />
            {starved && <p className="priority-starvation-warning">Below 40% of daily demand. Movement, combat, repair and morale may deteriorate.</p>}
          </article>;
        })}</div>
      </section>

      <section className="view-panel administration-priority-panel">
        <div className="view-panel-heading"><p className="panel-label">ADMINISTRATION PRIORITIES</p><strong>{territories.length}</strong></div>
        <p className="panel-copy">These controls govern civil administration and occupation demand. Formation supply in the same territory remains separately prioritised.</p>
        <div className="logistics-priority-list compact">{territories.map(territoryId => {
          const allocation = state.logistics.territoryAllocations[territoryId];
          const override = state.logisticsPriorities.territoryOverrides[territoryId];
          const starved = state.logistics.starvedTerritoryIds.includes(territoryId);
          return <article key={territoryId} className={`logistics-priority-card ${allocation.priority} ${starved ? 'starved' : ''}`}>
            <header>
              <button type="button" onClick={() => onOpenTerritory(territoryId)}><strong>{TERRITORIES[territoryId].name}</strong><span>{state.territories[territoryId].occupation} · resistance {Math.round(state.territories[territoryId].resistance)}</span></button>
              <b>{allocation.administrationDemand ? Math.round(allocation.administrationDelivered / allocation.administrationDemand * 100) : 100}%</b>
            </header>
            <div className="logistics-throughput-row">
              <span>Requested <strong>{allocation.administrationDemand}</strong></span>
              <span>Delivered <strong>{allocation.administrationDelivered}</strong></span>
              <span>{formatNumber(Object.values(state.taskGroups).filter(group => group.location === territoryId).reduce((sum, group) => sum + group.personnel, 0))} personnel</span>
            </div>
            <PrioritySelect
              label="Administration priority"
              value={override ?? 'automatic'}
              effective={allocation.priority}
              onChange={value => onChange(setTerritoryLogisticsPriority(state, territoryId, value))}
            />
            {starved && <p className="priority-starvation-warning">Administration is below 40% of demand. Legitimacy and resistance control are at risk.</p>}
          </article>;
        })}</div>
      </section>

      <section className="view-panel logistics-bottleneck-panel">
        <div className="view-panel-heading"><p className="panel-label">NETWORK BOTTLENECKS</p><strong>{bottlenecks.length}</strong></div>
        {bottlenecks.length ? <div className="logistics-bottleneck-list">{bottlenecks.map(route => {
          const flow = state.logistics.routeFlows[route.id];
          return <button type="button" key={route.id} onClick={() => onOpenTerritory(route.toTerritoryId)}>
            <span><strong>{route.name}</strong><small>{flow.used} / {flow.capacity} throughput · {flow.condition}</small></span>
            <b>{Math.round(flow.utilisation)}%</b>
          </button>;
        })}</div> : <p className="empty-state">No strategic corridor is currently operating above 85% of capacity.</p>}
      </section>
    </div>
  </section>;
}
''')

write('src/logistics-priorities.css', r'''.logistics-priority-view {
  min-height: 754px;
}

.logistics-priority-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 14px;
  border: 1px solid #294552;
  background: #294552;
}

.logistics-priority-summary > div {
  display: grid;
  gap: 5px;
  padding: 13px 15px;
  background: #0d222c;
}

.logistics-priority-summary span,
.logistics-throughput-row span,
.logistics-priority-select span,
.panel-copy {
  color: #78919c;
  font: 500 8px IBM Plex Mono, monospace;
  letter-spacing: .05em;
  text-transform: uppercase;
}

.logistics-priority-summary strong {
  color: #effffc;
  font: 600 24px Barlow Condensed, sans-serif;
}

.logistics-priority-summary .warning strong {
  color: #ff998f;
}

.logistics-doctrine-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 14px;
}

.logistics-doctrine-panel h3 {
  margin: 3px 0 0;
  color: #effffc;
  font: 600 22px Barlow Condensed, sans-serif;
  letter-spacing: .04em;
}

.logistics-doctrine-panel > p {
  max-width: 760px;
  margin: 0;
  color: #9db1b9;
  font-size: 12px;
  line-height: 1.55;
}

.logistics-priority-grid {
  display: grid;
  grid-template-columns: minmax(440px, 1.15fr) minmax(360px, .85fr);
  gap: 14px;
  align-items: start;
}

.logistics-bottleneck-panel {
  grid-column: 1 / -1;
}

.logistics-priority-list {
  display: grid;
  gap: 9px;
  margin-top: 10px;
}

.logistics-priority-list.compact {
  max-height: 700px;
  overflow-y: auto;
}

.logistics-priority-card {
  padding: 11px;
  border: 1px solid #294552;
  border-left-width: 4px;
  background: #0d222c;
}

.logistics-priority-card.critical { border-left-color: #ff7168; }
.logistics-priority-card.high { border-left-color: #f0ad62; }
.logistics-priority-card.standard { border-left-color: #70d7d0; }
.logistics-priority-card.restricted { border-left-color: #617984; }
.logistics-priority-card.starved { background: linear-gradient(90deg, rgba(110, 35, 31, .42), #0d222c 38%); }

.logistics-priority-card header,
.logistics-throughput-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.logistics-priority-card header > button {
  display: grid;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.logistics-priority-card header > button strong {
  color: #effffc;
  font: 600 16px Barlow Condensed, sans-serif;
}

.logistics-priority-card header > button span,
.logistics-priority-card header > b {
  color: #8aa0aa;
  font: 500 9px IBM Plex Mono, monospace;
  text-transform: uppercase;
}

.logistics-priority-card header > b {
  color: #8ff9ed;
  font-size: 12px;
}

.logistics-throughput-row {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin: 9px 0;
  padding: 8px 0;
  border-top: 1px solid #1f3944;
  border-bottom: 1px solid #1f3944;
}

.logistics-throughput-row strong {
  color: #dbe8ee;
}

.logistics-priority-select {
  display: grid;
  grid-template-columns: minmax(130px, .55fr) minmax(180px, 1fr);
  align-items: center;
  gap: 10px;
}

.logistics-priority-select select {
  width: 100%;
  border: 1px solid #35515e;
  background: #102832;
  color: #dbe8ee;
  padding: 8px;
  font: 500 9px IBM Plex Mono, monospace;
  text-transform: uppercase;
}

.priority-starvation-warning {
  margin: 9px 0 0;
  padding: 7px 8px;
  border: 1px solid #7a453f;
  background: rgba(100, 39, 33, .35);
  color: #ffb4aa;
  font: 500 9px IBM Plex Mono, monospace;
  line-height: 1.45;
  text-transform: uppercase;
}

.panel-copy {
  margin: 8px 0 0;
  line-height: 1.5;
  text-transform: none;
}

.logistics-bottleneck-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.logistics-bottleneck-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border: 1px solid #294552;
  background: #0d222c;
  color: #dbe8ee;
  text-align: left;
  cursor: pointer;
}

.logistics-bottleneck-list button span {
  display: grid;
  gap: 3px;
}

.logistics-bottleneck-list small {
  color: #78919c;
  font: 500 8px IBM Plex Mono, monospace;
  text-transform: uppercase;
}

.logistics-bottleneck-list b {
  color: #f0ad62;
  font: 600 14px IBM Plex Mono, monospace;
}

@media (min-width: 901px) {
  .command-nav-items button { min-height: 78px; }
  .command-navigation { overflow-y: auto; }
}

@media (max-width: 900px) {
  .logistics-priority-grid,
  .logistics-priority-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .logistics-doctrine-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .logistics-bottleneck-panel {
    grid-column: auto;
  }

  .logistics-bottleneck-list {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 540px) {
  .logistics-priority-select {
    grid-template-columns: minmax(0, 1fr);
  }
}
''')

replace(
    'src/components/CommandNavigation.tsx',
    "export type CommandView = 'map' | 'forces' | 'operations' | 'territories' | 'engineering' | 'intelligence' | 'campaign';\n",
    "export type CommandView = 'map' | 'forces' | 'operations' | 'territories' | 'engineering' | 'logistics' | 'intelligence' | 'campaign';\n"
)
replace(
    'src/components/CommandNavigation.tsx',
    "  { id: 'engineering', code: 'ENG', label: 'Engineering' },\n  { id: 'intelligence', code: 'INT', label: 'Intelligence' },\n",
    "  { id: 'engineering', code: 'ENG', label: 'Engineering' },\n  { id: 'logistics', code: 'LOG', label: 'Logistics' },\n  { id: 'intelligence', code: 'INT', label: 'Intelligence' },\n"
)
replace(
    'src/App.tsx',
    "import { InterdictionCommand } from './components/InterdictionCommand';\n",
    "import { InterdictionCommand } from './components/InterdictionCommand';\nimport { LogisticsCommand } from './components/LogisticsCommand';\n"
)
replace('src/App.tsx', 'PHASE VIII-B4C / INTERDICTION AND COMBAT DAMAGE', 'PHASE VIII-B4D / LOGISTICS PRIORITIES')
replace(
    'src/App.tsx',
    "badges={{ forces: groups.length, operations: operations.length, territories: `${controlled}/${territoryDefinitions.length}`, engineering: state.engineeringProjects.filter(project => project.status === 'active').length + state.interdictionMissions.filter(mission => mission.status === 'active').length, intelligence: frontlineTerritories.length }}",
    "badges={{ forces: groups.length, operations: operations.length, territories: `${controlled}/${territoryDefinitions.length}`, engineering: state.engineeringProjects.filter(project => project.status === 'active').length + state.interdictionMissions.filter(mission => mission.status === 'active').length, logistics: state.logistics.starvedFormationIds.length + state.logistics.starvedTerritoryIds.length, intelligence: frontlineTerritories.length }}"
)
replace(
    'src/App.tsx',
    "        {currentView === 'engineering' && <div className=\"infrastructure-command-stack\">\n          <EngineeringCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n          <InterdictionCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n        </div>}\n\n        {currentView === 'intelligence'",
    "        {currentView === 'engineering' && <div className=\"infrastructure-command-stack\">\n          <EngineeringCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n          <InterdictionCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n        </div>}\n\n        {currentView === 'logistics' && <LogisticsCommand state={state} onChange={setState} onOpenGroup={openGroupOnMap} onOpenTerritory={openTerritoryOnMap} />}\n\n        {currentView === 'intelligence'"
)
replace(
    'src/main.tsx',
    "import './interdiction.css';\n",
    "import './interdiction.css';\nimport './logistics-priorities.css';\n"
)
replace(
    'src/command-interface.css',
    "  .command-nav-items {\n    grid-template-columns: repeat(6, minmax(0, 1fr));\n  }\n",
    "  .command-nav-items {\n    grid-template-columns: repeat(8, minmax(70px, 1fr));\n    overflow-x: auto;\n  }\n"
)

# --- Design document -----------------------------------------------------------
write('docs/design/phase-08b4d-logistics-priorities.md', r'''# Phase VIII-B4D — Manual Logistics Priorities

Version 12 gives the player direct control over how scarce throughput is distributed without requiring constant logistics micromanagement.

## Priority doctrine

Every formation and controlled territory receives an automatic logistics priority:

- **Critical** — active attacks.
- **High** — movement, recovery, engineering and interdiction.
- **Standard** — ready formations, garrisons and controlled territory.
- **Restricted** — stable administered territory.

The player may override any automatic priority or return it to automatic control.

## Allocation behaviour

Available source, route and territory throughput is allocated by tier. Critical requests are served before High, followed by Standard and Restricted. Requests within the same tier share available capacity proportionally.

This means a deliberate Critical allocation can preserve an offensive or repair project, but may leave lower-tier formations or administration below their daily requirement.

## Consequences and warnings

The logistics view displays requested and delivered supply for every formation and administration request. A severe shortfall is recorded below 40% delivery.

Changing a priority recalculates the network immediately. If the change creates a new severe shortfall, the command log names the affected formations or territories.

## Interface

A dedicated Logistics command view provides:

- network capacity, demand and efficiency;
- automatic or manual formation priorities;
- automatic or manual administration priorities;
- requested-versus-delivered throughput;
- severe-shortfall warnings;
- current route bottlenecks.

## Persistence

Campaign saves advance to version 12. Version 11 and all earlier supported campaigns migrate with empty override maps, preserving the automatic behaviour.

## Scope boundary

Enemy logistics strategy and campaign balance remain for Phase VIII-C.
''')

# --- Regression updates and focused tests -------------------------------------
for test_file in Path('tests').glob('*.test.cjs'):
    text = test_file.read_text()
    text = re.sub(r"(assert\.equal\([^\n,]*\.version,\s*)11(\s*\))", r"\g<1>12\2", text)
    text = re.sub(r"(assert\.equal\([^\n,]*\.saveVersion,\s*)11(\s*\))", r"\g<1>12\2", text)
    text = text.replace('saveVersion: 11,', 'saveVersion: 12,')
    text = text.replace(r'saveVersion:\s*11', r'saveVersion:\s*12')
    text = text.replace('PHASE VIII-B4C \\/ INTERDICTION AND COMBAT DAMAGE', 'PHASE VIII-B4D \\/ LOGISTICS PRIORITIES')
    text = text.replace('PHASE VIII-B4C / INTERDICTION AND COMBAT DAMAGE', 'PHASE VIII-B4D / LOGISTICS PRIORITIES')
    test_file.write_text(text)

command_test = Path('tests/command-interface-vii-a.test.cjs')
text = command_test.read_text()
text = text.replace("test('the command shell exposes six persistent command views'", "test('the command shell exposes eight persistent command views'")
text = text.replace("['map', 'forces', 'operations', 'territories', 'intelligence', 'campaign']", "['map', 'forces', 'operations', 'territories', 'engineering', 'logistics', 'intelligence', 'campaign']")
text = text.replace(r'repeat\(6', r'repeat\(8')
text = text.replace("  assert.match(app, /Strategic picture/);", "  assert.match(app, /Supply priority command/);\n  assert.match(app, /Strategic picture/);")
command_test.write_text(text)

persistence_test = Path('tests/persistence.test.cjs')
text = persistence_test.read_text()
text = text.replace("test('a current version 11 save is inspected with its matching metadata'", "test('a current version 12 save is inspected with its matching metadata'", 1)
text = text.replace("assert.equal(result.source, 'v11');", "assert.equal(result.source, 'v12');", 1)
persistence_test.write_text(text)

write('tests/logistics-priorities-viii-b4d.test.cjs', r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame } = require('../.test-dist/engine.js');
const {
  calculateSupplyNetwork,
  effectiveFormationLogisticsPriority,
  effectiveTerritoryLogisticsPriority,
  formationSupplyDemand,
  portalSupplyCapacity,
  refreshSupplyNetwork,
  setFormationLogisticsPriority,
  setTerritoryLogisticsPriority
} = require('../.test-dist/supply-network.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

function overloadedState(seed = 91) {
  const state = newGame(seed);
  const template = state.taskGroups['TG-1'];
  const demand = formationSupplyDemand(template);
  const capacity = portalSupplyCapacity(state);
  const count = Math.ceil(capacity / demand) + 12;
  state.taskGroups = {};
  for (let index = 0; index < count; index += 1) {
    const id = `TG-P-${String(index + 1).padStart(2, '0')}`;
    state.taskGroups[id] = { ...structuredClone(template), id, name: `Priority Group ${index + 1}`, status: 'ready', order: undefined };
  }
  state.selectedTaskGroupId = 'TG-P-01';
  state.logisticsPriorities = { formationOverrides: {}, territoryOverrides: {} };
  return refreshSupplyNetwork(state);
}

test('new campaigns initialise version 12 priority state and automatic defaults', () => {
  const state = newGame(44);
  assert.equal(state.version, 12);
  assert.deepEqual(state.logisticsPriorities, { formationOverrides: {}, territoryOverrides: {} });
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-1'), 'standard');
  assert.equal(effectiveTerritoryLogisticsPriority(state, state.portalTerritory), 'standard');
  assert.equal(state.logistics.formationAllocations['TG-1'].automaticPriority, true);
});

test('automatic operational priorities reflect formation activity', () => {
  const state = newGame(45);
  state.taskGroups['TG-1'].status = 'attacking';
  state.taskGroups['TG-2'].status = 'moving';
  state.taskGroups['TG-3'].status = 'recovering';
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-1'), 'critical');
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-2'), 'high');
  assert.equal(effectiveFormationLogisticsPriority(state, 'TG-3'), 'high');
});

test('critical requests are served ahead of restricted requests during a shortage', () => {
  const state = overloadedState();
  const ids = Object.keys(state.taskGroups);
  state.logisticsPriorities.formationOverrides[ids[0]] = 'critical';
  state.logisticsPriorities.formationOverrides[ids[1]] = 'restricted';
  const logistics = calculateSupplyNetwork(state);
  assert.equal(logistics.formationAllocations[ids[0]].priority, 'critical');
  assert.equal(logistics.formationAllocations[ids[1]].priority, 'restricted');
  assert.ok(logistics.formationAllocations[ids[0]].delivered > logistics.formationAllocations[ids[1]].delivered);
});

test('manual formation and administration priorities can return to automatic control', () => {
  const state = newGame(46);
  const formation = setFormationLogisticsPriority(state, 'TG-1', 'critical');
  assert.equal(formation.logisticsPriorities.formationOverrides['TG-1'], 'critical');
  assert.equal(formation.logistics.formationAllocations['TG-1'].automaticPriority, false);
  const resetFormation = setFormationLogisticsPriority(formation, 'TG-1', 'automatic');
  assert.equal(resetFormation.logisticsPriorities.formationOverrides['TG-1'], undefined);

  const territory = setTerritoryLogisticsPriority(resetFormation, state.portalTerritory, 'high');
  assert.equal(territory.logisticsPriorities.territoryOverrides[state.portalTerritory], 'high');
  assert.equal(territory.logistics.territoryAllocations[state.portalTerritory].automaticPriority, false);
  const resetTerritory = setTerritoryLogisticsPriority(territory, state.portalTerritory, 'automatic');
  assert.equal(resetTerritory.logisticsPriorities.territoryOverrides[state.portalTerritory], undefined);
});

test('priority changes warn when lower tiers fall below forty percent delivery', () => {
  let state = overloadedState(94);
  const ids = Object.keys(state.taskGroups);
  const demand = formationSupplyDemand(state.taskGroups[ids[0]]);
  const capacity = portalSupplyCapacity(state);
  let transition = null;
  for (let criticalCount = 0; criticalCount < ids.length - 1; criticalCount += 1) {
    const beforeLower = (capacity - criticalCount * demand) / Math.max(1, (ids.length - criticalCount) * demand);
    const afterLower = (capacity - (criticalCount + 1) * demand) / Math.max(1, (ids.length - criticalCount - 1) * demand);
    if (beforeLower >= 0.4 && afterLower < 0.4) {
      transition = criticalCount;
      break;
    }
  }
  assert.notEqual(transition, null, 'expected a calculable starvation transition');
  for (let index = 0; index < transition; index += 1) state.logisticsPriorities.formationOverrides[ids[index]] = 'critical';
  state = refreshSupplyNetwork(state);
  const next = setFormationLogisticsPriority(state, ids[transition], 'critical');
  assert.ok(next.logistics.starvedFormationIds.length > state.logistics.starvedFormationIds.length);
  assert.match(next.events[0].text, /below 40% of daily logistics demand/);
  assert.equal(next.events[0].tone, 'warning');
});

test('version 11 campaigns migrate to version 12 with automatic priority maps', () => {
  const current = newGame(47);
  const { logisticsPriorities, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 11 });
  assert.equal(migrated.version, 12);
  assert.deepEqual(migrated.logisticsPriorities, { formationOverrides: {}, territoryOverrides: {} });
  assert.ok(migrated.logistics.totalDemand > 0);
});

test('the command interface exposes Phase VIII-B4D logistics controls', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const navigation = fs.readFileSync('src/components/CommandNavigation.tsx', 'utf8');
  const component = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(app, /PHASE VIII-B4D \/ LOGISTICS PRIORITIES/);
  assert.match(app, /<LogisticsCommand/);
  assert.match(navigation, /id: 'logistics'/);
  assert.match(component, /Critical → High → Standard → Restricted/);
  assert.match(component, /Automatic ·/);
  assert.match(component, /Requested/);
  assert.match(component, /Delivered/);
  assert.match(main, /logistics-priorities\.css/);
});
''')
