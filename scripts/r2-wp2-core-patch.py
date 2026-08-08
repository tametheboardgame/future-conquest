from pathlib import Path


def patch(path_str: str, replacements: list[tuple[str, str, str]]) -> None:
    path = Path(path_str)
    text = path.read_text(encoding='utf-8')
    for old, new, label in replacements:
        if old in text:
            if text.count(old) != 1:
                raise SystemExit(f'{path_str} {label}: expected one match, found {text.count(old)}')
            text = text.replace(old, new, 1)
        elif new not in text:
            raise SystemExit(f'{path_str} {label}: neither old nor new text found')
    path.write_text(text, encoding='utf-8')


patch('src/game/types.ts', [
    (
        "export type EngineeringAllocation = 25 | 50 | 75 | 100;\nexport type EngineeringProjectStatus = 'active' | 'completed' | 'cancelled';",
        "export type EngineeringAllocation = number;\nexport type EngineeringProjectKind = 'repair' | 'upgrade';\nexport type EngineeringProjectStatus = 'active' | 'completed' | 'cancelled';",
        'engineering allocation type'
    ),
    (
        "export interface StrategicRouteState {\n  status: StrategicRouteStatus;\n  condition: number;\n  capacityModifier: number;\n}",
        "export interface StrategicRouteState {\n  status: StrategicRouteStatus;\n  condition: number;\n  capacityModifier: number;\n  upgradeLevel: number;\n}",
        'route upgrade level'
    ),
    (
        "export interface EngineeringProject {\n  id: string;\n  routeId: string;\n  assignedTaskGroupId: string;\n  createdTurn: number;\n  startingCondition: number;\n  targetCondition: number;\n  progress: number;\n  allocation: EngineeringAllocation;\n  supplySpent: number;\n  status: EngineeringProjectStatus;\n  returnStatus: 'ready' | 'garrison';\n}",
        "export interface EngineeringProject {\n  id: string;\n  routeId: string;\n  kind: EngineeringProjectKind;\n  assignedTaskGroupId?: string;\n  createdTurn: number;\n  startingCondition: number;\n  targetCondition: number;\n  progress: number;\n  allocation: EngineeringAllocation;\n  supplySpent: number;\n  status: EngineeringProjectStatus;\n  returnStatus: 'ready' | 'garrison';\n  workCompleted: number;\n  workRequired: number;\n  materialCost: number;\n  materialSpent: number;\n}",
        'engineering project model'
    )
])

patch('src/game/supply-network.ts', [
    (
        "const routeStatusFactor: Record<string, number> = {\n  open: 1,\n  damaged: 0.62,\n  blocked: 0,\n  destroyed: 0\n};",
        "const routeStatusFactor: Record<string, number> = {\n  open: 1,\n  damaged: 0.82,\n  blocked: 0,\n  destroyed: 0\n};",
        'route supply status factor'
    ),
    (
        "export function effectiveRouteSupplyCapacity(state: GameState, routeId: string): number {\n  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);\n  if (!route) return 0;\n  const routeState = state.routeStates[route.id];\n  const statusFactor = routeStatusFactor[routeState?.status ?? 'open'] ?? 0;\n  if (statusFactor <= 0) return 0;\n  const conditionFactor = clamp((routeState?.condition ?? 100) / 100, 0.2, 1);\n  const capacityModifier = clamp(routeState?.capacityModifier ?? 1, 0, 1.5);\n  const endpointBonus = Math.min(nodeSupplyById[route.fromNodeId] ?? 0, nodeSupplyById[route.toNodeId] ?? 0) * 2;\n  return Math.max(0, Math.floor((route.supplyCapacity * 18 + endpointBonus) * statusFactor * conditionFactor * capacityModifier));\n}",
        "export function effectiveRouteSupplyCapacity(state: GameState, routeId: string): number {\n  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);\n  if (!route) return 0;\n  const routeState = state.routeStates[route.id];\n  const statusFactor = routeStatusFactor[routeState?.status ?? 'open'] ?? 0;\n  if (statusFactor <= 0) return 0;\n  const condition = clamp((routeState?.condition ?? 100) / 100, 0, 1);\n  const conditionFactor = clamp(0.38 + condition * 0.62, 0.38, 1);\n  const capacityModifier = clamp(routeState?.capacityModifier ?? 1, 0, 1.5);\n  const upgradeFactor = 1 + (routeState?.upgradeLevel ?? 0) * 0.15;\n  const endpointBonus = Math.min(nodeSupplyById[route.fromNodeId] ?? 0, nodeSupplyById[route.toNodeId] ?? 0) * 2;\n  return Math.max(0, Math.floor((route.supplyCapacity * 18 + endpointBonus) * statusFactor * conditionFactor * capacityModifier * upgradeFactor));\n}",
        'effective route supply capacity'
    ),
    (
        "  for (const territoryId of Object.keys(state.territories).sort()) {\n    const demand = administrationSupplyDemand(state, territoryId);\n    if (demand > 0) {",
        "  for (const territoryId of Object.keys(state.territories).sort()) {\n    const projectDemand = state.engineeringProjects\n      .filter(project => project.status === 'active')\n      .reduce((sum, project) => {\n        const route = STRATEGIC_ROUTES.find(candidate => candidate.id === project.routeId);\n        if (!route || (route.fromTerritoryId !== territoryId && route.toTerritoryId !== territoryId)) return sum;\n        const civilDemand = project.kind === 'upgrade'\n          ? 9\n          : Math.max(3, Math.min(8, 3 + Math.ceil(Math.max(0, 100 - project.startingCondition) / 25)));\n        return sum + Math.ceil(civilDemand / 2);\n      }, 0);\n    const demand = administrationSupplyDemand(state, territoryId) + projectDemand;\n    if (demand > 0) {",
        'civil engineering logistics demand'
    ),
    (
        "    const engineeringProject = state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === group.id);\n    const engineeringDemand = engineeringProject ? Math.max(3, Math.ceil(engineeringProject.allocation / 8)) : 0;",
        "    const engineeringProject = state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === group.id && project.allocation > 0);\n    const engineeringDemand = engineeringProject ? Math.max(1, Math.ceil(engineeringProject.allocation / 20)) : 0;",
        'military support logistics demand'
    )
])

patch('src/game/engine.ts', [
    (
        "import { resolveEngineeringProjects } from './engineering-projects';",
        "import { engineeringMovementFactor, engineeringOperationalPersonnel, resolveEngineeringProjects } from './engineering-projects';",
        'engineering helpers import'
    ),
    (
        "const deployableArmour = (group: TaskGroup) => Math.min(group.functionalArmour, group.personnel);",
        "const deployableArmour = (state: GameState, group: TaskGroup) => Math.min(group.functionalArmour, engineeringOperationalPersonnel(state, group));",
        'state-aware deployable armour'
    ),
    (
        "    order.progress += movementProgressForDay(route, state.routeStates[route.id], group);",
        "    order.progress += Math.max(1, Math.round(movementProgressForDay(route, state.routeStates[route.id], group) * engineeringMovementFactor(state, group.id)));",
        'engineering movement penalty'
    ),
    (
        "    const individualPowers = participants.map((group, index) => (\n      (group.personnel / 1000 * 4.1 + deployableArmour(group) / 1000 * 1.9)",
        "    const individualPowers = participants.map((group, index) => (\n      (engineeringOperationalPersonnel(next, group) / 1000 * 4.1 + deployableArmour(next, group) / 1000 * 1.9)",
        'offensive engineering penalty'
    ),
    (
        "      const exposedArmour = deployableArmour(group);",
        "      const exposedArmour = deployableArmour(next, group);",
        'combat exposed armour'
    ),
    (
        "      remainingArmour += deployableArmour(group);",
        "      remainingArmour += deployableArmour(next, group);",
        'combat remaining armour'
    ),
    (
        "  return defenders.reduce((sum, group) => sum + group.personnel / 1000 * 4 + deployableArmour(group) / 1000 * 1.5 + (group.status === 'garrison' ? 2.5 : 0), 0)",
        "  return defenders.reduce((sum, group) => sum + engineeringOperationalPersonnel(state, group) / 1000 * 4 + deployableArmour(state, group) / 1000 * 1.5 + (group.status === 'garrison' ? 2.5 : 0), 0)",
        'counterattack engineering penalty'
    )
])

print('R2-WP2 core patch applied')
