from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


# Engine: route-aware orders, timing and save migration.
replace_once(
    'src/game/engine.ts',
    "import { createRouteStates } from './strategic-network';",
    """import { STRATEGIC_ROUTE_BY_ID } from './strategic-network-data';
import { createRouteStates } from './strategic-network';
import {
  chooseOperationalRoute,
  movementProgressForDay,
  routeConnectsTerritories,
  routeIsTraversable
} from './route-movement';"""
)
replace_once(
    'src/game/engine.ts',
    """const SAVE_KEY = 'future-conquest-slice-v0.6';
const LEGACY_V5_SAVE_KEY = 'future-conquest-slice-v0.5';""",
    """const SAVE_KEY = 'future-conquest-slice-v0.7';
const LEGACY_V6_SAVE_KEY = 'future-conquest-slice-v0.6';
const LEGACY_V5_SAVE_KEY = 'future-conquest-slice-v0.5';"""
)
replace_once('src/game/engine.ts', '    version: 6,', '    version: 7,')
replace_once(
    'src/game/engine.ts',
    """export function issueMove(state: GameState): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (!target || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'player') return state;
  if (!TERRITORIES[group.location].neighbours.includes(target)) return state;
  const taskGroups = structuredClone(state.taskGroups);
  taskGroups[group.id].status = 'moving';
  taskGroups[group.id].order = { type: 'move', target, progress: 0, days: 0 };
  return addEvent({ ...state, taskGroups, targetTerritory: null }, `${group.name} ordered to move from ${TERRITORIES[group.location].centre} to ${TERRITORIES[target].centre}.`, 'neutral');
}""",
    """export function issueMove(state: GameState, requestedRouteId?: string): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (!target || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'player') return state;
  const route = chooseOperationalRoute(state.routeStates, group.location, target, group, requestedRouteId);
  if (!route) return state;
  const taskGroups = structuredClone(state.taskGroups);
  taskGroups[group.id].status = 'moving';
  taskGroups[group.id].order = { type: 'move', target, progress: 0, days: 0, routeId: route.id };
  return addEvent(
    { ...state, taskGroups, targetTerritory: null },
    `${group.name} ordered to move from ${TERRITORIES[group.location].centre} to ${TERRITORIES[target].centre} via ${route.name}.`,
    'neutral'
  );
}"""
)
replace_once(
    'src/game/engine.ts',
    """export function beginOperation(state: GameState): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (!target || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'enemy') return state;
  if (!TERRITORIES[group.location].neighbours.includes(target)) return state;

  const taskGroups = structuredClone(state.taskGroups);""",
    """export function beginOperation(state: GameState, requestedRouteId?: string): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (!target || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'enemy') return state;
  const route = chooseOperationalRoute(state.routeStates, group.location, target, group, requestedRouteId);
  if (!route) return state;

  const taskGroups = structuredClone(state.taskGroups);"""
)
replace_once(
    'src/game/engine.ts',
    """    progress: operation.progress,
    days: 0,
    operationId
  };""",
    """    progress: operation.progress,
    days: 0,
    routeId: route.id,
    operationId
  };"""
)
replace_once(
    'src/game/engine.ts',
    """    `${group.name} ${verb} from ${TERRITORIES[group.location].centre} towards ${TERRITORIES[target].centre}.`,""",
    """    `${group.name} ${verb} from ${TERRITORIES[group.location].centre} towards ${TERRITORIES[target].centre} via ${route.name}.`,"""
)
replace_once(
    'src/game/engine.ts',
    """function resolveMovement(state: GameState): GameState {
  const taskGroups = structuredClone(state.taskGroups);
  let next = { ...state, taskGroups };
  for (const group of Object.values(taskGroups)) {
    if (group.status !== 'moving' || group.order?.type !== 'move') continue;
    group.order.days += 1;
    const targetTerrain = TERRITORIES[group.order.target].terrain;
    const pace = targetTerrain === 'mountainous' ? 58 : targetTerrain === 'mixed-upland' ? 75 : 100;
    group.order.progress += group.supply < 40 ? Math.round(pace * 0.65) : pace;
    if (group.order.progress >= 100) {
      group.location = group.order.target;
      group.status = 'ready';
      group.order = undefined;
      next = addEvent(next, `${group.name} arrived in ${TERRITORIES[group.location].centre}.`, 'good');
    }
  }
  return next;
}""",
    """function resolveMovement(state: GameState): GameState {
  const taskGroups = structuredClone(state.taskGroups);
  let next = { ...state, taskGroups };
  for (const group of Object.values(taskGroups)) {
    if (group.status !== 'moving' || group.order?.type !== 'move') continue;
    const order = group.order;
    const selectedRoute = order.routeId ? STRATEGIC_ROUTE_BY_ID[order.routeId] : undefined;
    const route = selectedRoute && routeConnectsTerritories(selectedRoute, group.location, order.target)
      ? selectedRoute
      : chooseOperationalRoute(state.routeStates, group.location, order.target, group);

    if (!route || !routeIsTraversable(route, state.routeStates[route.id])) {
      const routeName = route?.name ?? 'the assigned strategic corridor';
      group.status = 'ready';
      group.order = undefined;
      next = addEvent(next, `${group.name} movement halted at ${TERRITORIES[group.location].centre}: ${routeName} is unavailable.`, 'warning');
      continue;
    }

    order.routeId = route.id;
    order.days += 1;
    order.progress += movementProgressForDay(route, state.routeStates[route.id], group);
    if (order.progress >= 100) {
      group.location = order.target;
      group.status = 'ready';
      group.order = undefined;
      next = addEvent(next, `${group.name} arrived in ${TERRITORIES[group.location].centre} via ${route.name}.`, 'good');
    }
  }
  return next;
}"""
)
replace_once(
    'src/game/engine.ts',
    """type NetworkField = 'routeStates';

type LegacyV5GameState = Omit<GameState, 'version' | NetworkField> & { version: 5 };""",
    """type NetworkField = 'routeStates';

type LegacyV6GameState = Omit<GameState, 'version'> & { version: 6 };
type LegacyV5GameState = Omit<GameState, 'version' | NetworkField> & { version: 5 };"""
)
replace_once(
    'src/game/engine.ts',
    """      parsed.version === 6
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
    ) return upgradeStrategicState(parsed as GameState);
  }

  const v5 = localStorage.getItem(LEGACY_V5_SAVE_KEY);""",
    """      parsed.version === 7
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
    ) return upgradeStrategicState(parsed as GameState);
  }

  const v6 = localStorage.getItem(LEGACY_V6_SAVE_KEY);
  if (v6) {
    const parsed = JSON.parse(v6) as Partial<LegacyV6GameState>;
    if (
      parsed.version === 6
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
    ) return upgradeStrategicState(parsed as LegacyV6GameState);
  }

  const v5 = localStorage.getItem(LEGACY_V5_SAVE_KEY);"""
)
replace_once(
    'src/game/engine.ts',
    """  deployableArmour,
  refreshSupply,
  resolveOperations,""",
    """  deployableArmour,
  refreshSupply,
  resolveMovement,
  resolveOperations,"""
)

# Strategic-state migration: version 6 orders gain route IDs; version 7 preserves selected corridors.
replace_once(
    'src/game/strategic-response.ts',
    "import { normaliseRouteStates } from './strategic-network';",
    """import { normaliseRouteStates } from './strategic-network';
import { normaliseTaskGroupOrderRoutes } from './route-movement';"""
)
replace_once(
    'src/game/strategic-response.ts',
    """export function upgradeStrategicState(state: LegacyStrategicState | GameState): GameState {
  const defaults = createStrategicState(state.seed, state.difficulty, state.escalation);
  return {
    ...state,
    version: 6,
    routeStates: normaliseRouteStates(state.routeStates),
    escalationStage: state.escalationStage ?? defaults.escalationStage,
    mobilisationPool: typeof state.mobilisationPool === 'number' && Number.isFinite(state.mobilisationPool)
      ? Math.max(0, state.mobilisationPool)
      : defaults.mobilisationPool,
    mobilisations: Array.isArray(state.mobilisations) ? state.mobilisations : defaults.mobilisations,
    enemyOrders: Array.isArray(state.enemyOrders) ? state.enemyOrders : defaults.enemyOrders,
    intelligenceReports: Array.isArray(state.intelligenceReports) && state.intelligenceReports.length
      ? state.intelligenceReports
      : defaults.intelligenceReports
  } as GameState;
}""",
    """export function upgradeStrategicState(state: LegacyStrategicState | GameState): GameState {
  const defaults = createStrategicState(state.seed, state.difficulty, state.escalation);
  const previousVersion = state.version;
  const routeStates = normaliseRouteStates(state.routeStates);
  const taskGroups = normaliseTaskGroupOrderRoutes(state.taskGroups, routeStates, previousVersion >= 7);
  return {
    ...state,
    version: 7,
    taskGroups,
    routeStates,
    escalationStage: state.escalationStage ?? defaults.escalationStage,
    mobilisationPool: typeof state.mobilisationPool === 'number' && Number.isFinite(state.mobilisationPool)
      ? Math.max(0, state.mobilisationPool)
      : defaults.mobilisationPool,
    mobilisations: Array.isArray(state.mobilisations) ? state.mobilisations : defaults.mobilisations,
    enemyOrders: Array.isArray(state.enemyOrders) ? state.enemyOrders : defaults.enemyOrders,
    intelligenceReports: Array.isArray(state.intelligenceReports) && state.intelligenceReports.length
      ? state.intelligenceReports
      : defaults.intelligenceReports
  } as GameState;
}"""
)

# Command interface: expose route selection and blocked-corridor feedback.
replace_once(
    'src/App.tsx',
    """import { TERRAIN_LABELS, TERRITORIES } from './game/data';
import { NODE_TYPE_LABELS, nodesForTerritory, routeStatusLabel, routesForTerritory } from './game/strategic-network';""",
    """import { TERRAIN_LABELS, TERRITORIES } from './game/data';
import { STRATEGIC_ROUTE_BY_ID } from './game/strategic-network-data';
import { NODE_TYPE_LABELS, ROUTE_TYPE_LABELS, nodesForTerritory, routeStatusLabel, routesForTerritory } from './game/strategic-network';
import { estimateRouteMovementDays } from './game/route-movement';"""
)
replace_once(
    'src/App.tsx',
    """  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('standard');
  const [currentView, setCurrentView] = useState<CommandView>('map');""",
    """  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('standard');
  const [currentView, setCurrentView] = useState<CommandView>('map');
  const [selectedRouteId, setSelectedRouteId] = useState('');"""
)
replace_once(
    'src/App.tsx',
    """  const targetInfo = selectedGroup && target ? getOrderTargetInfo(state, target.id, selectedGroup.id) : null;
  const adjacentTargetNames = selectedGroup""",
    """  const targetInfo = selectedGroup && target ? getOrderTargetInfo(state, target.id, selectedGroup.id) : null;
  const routeOptions = targetInfo?.availableRouteIds.flatMap(id => {
    const route = STRATEGIC_ROUTE_BY_ID[id];
    return route ? [route] : [];
  }) ?? [];
  const recommendedRouteId = targetInfo?.recommendedRouteId ?? '';
  const chosenRouteId = routeOptions.some(route => route.id === selectedRouteId) ? selectedRouteId : recommendedRouteId;
  const chosenRoute = chosenRouteId ? STRATEGIC_ROUTE_BY_ID[chosenRouteId] : undefined;
  const chosenRouteDays = selectedGroup && chosenRoute
    ? estimateRouteMovementDays(chosenRoute, state.routeStates[chosenRoute.id], selectedGroup)
    : null;
  const adjacentTargetNames = selectedGroup"""
)
replace_once(
    'src/App.tsx',
    """    if (targetInfo?.kind === 'out-of-range' && target) return `${target.centre} is outside ${selectedGroup.name}'s operational reach from ${TERRITORIES[selectedGroup.location].centre}. Available adjacent targets are marked ATTACK or MOVE.`;
    if (targetInfo?.kind === 'move' && target) return `Movement route selected: ${TERRITORIES[selectedGroup.location].centre} → ${target.centre}.`;
    if (targetInfo?.kind === 'attack' && targetOperation && target) return `${target.centre} already has an active operation. Review it and select Join operation to reinforce it.`;
    if (targetInfo?.kind === 'attack' && target) return `Attack target selected: ${target.centre}. Review the defenders and select Begin operation.`;
    return 'Issue independent orders to each task group, then resolve the day. Several movements and operations can run simultaneously.';
  }, [selectedGroup, selectedOperation, target, targetInfo, targetOperation]);""",
    """    if (targetInfo?.kind === 'route-blocked' && target) return `${target.centre} is adjacent, but every strategic corridor from ${TERRITORIES[selectedGroup.location].centre} is blocked or destroyed.`;
    if (targetInfo?.kind === 'out-of-range' && target) return `${target.centre} is outside ${selectedGroup.name}'s operational reach from ${TERRITORIES[selectedGroup.location].centre}. Available route-connected targets are marked ATTACK or MOVE.`;
    if (targetInfo?.kind === 'move' && target) return `Movement corridor selected: ${chosenRoute?.name ?? `${TERRITORIES[selectedGroup.location].centre} → ${target.centre}`}.`;
    if (targetInfo?.kind === 'attack' && targetOperation && target) return `${target.centre} already has an active operation. Review it and select Join operation to reinforce it via ${chosenRoute?.name ?? 'an available corridor'}.`;
    if (targetInfo?.kind === 'attack' && target) return `Attack target selected via ${chosenRoute?.name ?? 'an available corridor'}. Review the defenders and select Begin operation.`;
    return 'Issue independent orders to each task group, then resolve the day. Several movements and operations can run simultaneously.';
  }, [chosenRoute, selectedGroup, selectedOperation, target, targetInfo, targetOperation]);"""
)
replace_once(
    'src/App.tsx',
    """      <p>{selectedGroup.name} is moving to {TERRITORIES[selectedGroup.order.target].centre}. Other task groups remain available for separate orders.</p>
      <div className=\"forecast\"><span>Progress</span><strong>{selectedGroup.order.progress}%</strong></div>""",
    """      <p>{selectedGroup.name} is moving to {TERRITORIES[selectedGroup.order.target].centre}{selectedGroup.order.routeId ? ` via ${STRATEGIC_ROUTE_BY_ID[selectedGroup.order.routeId]?.name ?? 'the assigned corridor'}` : ''}. Other task groups remain available for separate orders.</p>
      <div className=\"forecast\"><span>Progress</span><strong>{selectedGroup.order.progress}%</strong></div>
      <div className=\"forecast\"><span>Days travelling</span><strong>{selectedGroup.order.days}</strong></div>"""
)
replace_once(
    'src/App.tsx',
    """      {targetInfo?.kind === 'out-of-range' ? <>
        <p>This province is not adjacent to {TERRITORIES[selectedGroup.location].centre}. Move the task group through controlled territory first.</p>
        <div className=\"forecast\"><span>Available now</span><strong>{adjacentTargetNames}</strong></div>
      </> : <p>Movement occupies only this formation. Other task groups can move or attack during the same day.</p>}
      <button className=\"primary\" disabled={!canMove} onClick={() => setState(issueMove)}>{canMove ? 'Issue movement order' : 'Out of operational range'}</button>""",
    """      {targetInfo?.kind === 'route-blocked' ? <p>All strategic corridors into this province are blocked or destroyed. The formation cannot enter until a route is restored.</p> : targetInfo?.kind === 'out-of-range' ? <>
        <p>This province has no direct strategic route from {TERRITORIES[selectedGroup.location].centre}. Move the task group through controlled territory first.</p>
        <div className=\"forecast\"><span>Available now</span><strong>{adjacentTargetNames}</strong></div>
      </> : <p>Movement occupies only this formation. Other task groups can move or attack during the same day.</p>}
      {routeOptions.length > 0 && <label>Operational corridor
        <select value={chosenRouteId} onChange={event => setSelectedRouteId(event.target.value)}>
          {routeOptions.map(route => {
            const days = estimateRouteMovementDays(route, state.routeStates[route.id], selectedGroup);
            return <option key={route.id} value={route.id}>{route.name} · {ROUTE_TYPE_LABELS[route.type]} · ~{days} day{days === 1 ? '' : 's'}</option>;
          })}
        </select>
      </label>}
      {chosenRoute && <div className=\"forecast\"><span>Estimated travel</span><strong>{chosenRouteDays} day{chosenRouteDays === 1 ? '' : 's'}</strong></div>}
      <button className=\"primary\" disabled={!canMove} onClick={() => setState(current => issueMove(current, chosenRouteId || undefined))}>{canMove ? 'Issue movement order' : targetInfo?.kind === 'route-blocked' ? 'Corridor blocked' : 'Out of operational range'}</button>"""
)
replace_once(
    'src/App.tsx',
    """      {targetInfo?.kind === 'out-of-range' ? <>
        <p>This enemy province is not adjacent to the selected task group. Select a province marked ATTACK or move closer through controlled territory.</p>
        <div className=\"forecast\"><span>Available now</span><strong>{adjacentTargetNames}</strong></div>
      </> : targetOperation ? <>""",
    """      {targetInfo?.kind === 'route-blocked' ? <p>Every strategic corridor into this enemy province is blocked or destroyed. No operation can be launched from the current position.</p> : targetInfo?.kind === 'out-of-range' ? <>
        <p>This enemy province has no direct strategic route from the selected task group. Select a province marked ATTACK or move closer through controlled territory.</p>
        <div className=\"forecast\"><span>Available now</span><strong>{adjacentTargetNames}</strong></div>
      </> : targetOperation ? <>"""
)
replace_once(
    'src/App.tsx',
    """      <div className=\"forecast\"><span>Enemy armour</span><strong>{formatNumber(enemyAtTarget.armour)}</strong></div>
      <button className=\"primary danger-action\" disabled={!canAttack} onClick={() => setState(beginOperation)}>{canAttack ? (targetOperation ? 'Join operation' : 'Begin operation') : 'Out of operational range'}</button>""",
    """      <div className=\"forecast\"><span>Enemy armour</span><strong>{formatNumber(enemyAtTarget.armour)}</strong></div>
      {routeOptions.length > 0 && <label>Operational corridor
        <select value={chosenRouteId} onChange={event => setSelectedRouteId(event.target.value)}>
          {routeOptions.map(route => <option key={route.id} value={route.id}>{route.name} · {ROUTE_TYPE_LABELS[route.type]}</option>)}
        </select>
      </label>}
      <button className=\"primary danger-action\" disabled={!canAttack} onClick={() => setState(current => beginOperation(current, chosenRouteId || undefined))}>{canAttack ? (targetOperation ? 'Join operation' : 'Begin operation') : targetInfo?.kind === 'route-blocked' ? 'Corridor blocked' : 'Out of operational range'}</button>"""
)
replace_once('src/App.tsx', 'PHASE VIII-B1 / STRATEGIC NETWORK', 'PHASE VIII-B2 / ROUTE MOVEMENT')

print('Phase VIII-B2 source patches applied.')
