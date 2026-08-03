import { SLICE_IDS, TERRITORIES } from './data';
import { occupationRequirement } from './formation-organisation';
import { STRATEGIC_ROUTE_BY_ID } from './strategic-network-data';
import { createRouteStates } from './strategic-network';
import {
  chooseOperationalRoute,
  movementProgressForDay,
  routeConnectsTerritories,
  routeIsTraversable
} from './route-movement';
import { completeEnemyOrder, createStrategicState, getPlannedCounterattack, resolveStrategicResponse, upgradeStrategicState } from './strategic-response';
import type {
  Difficulty,
  EnemyFormation,
  GameEvent,
  GameState,
  Operation,
  TaskGroup,
  TerritoryState
} from './types';

const SAVE_KEY = 'future-conquest-slice-v0.7';
const LEGACY_V6_SAVE_KEY = 'future-conquest-slice-v0.6';
const LEGACY_V5_SAVE_KEY = 'future-conquest-slice-v0.5';
const LEGACY_V4_SAVE_KEY = 'future-conquest-slice-v0.4';
const LEGACY_V3_SAVE_KEY = 'future-conquest-slice-v0.3';
const LEGACY_V2_SAVE_KEY = 'future-conquest-slice-v0.2';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomFor = (seed: number, turn: number, salt: number) => {
  let value = (seed + turn * 99991 + salt * 7919) >>> 0;
  value = (value * 1664525 + 1013904223) >>> 0;
  return value / 4294967296;
};
const saltFor = (value: string) => [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

const difficultyRules: Record<Difficulty, { enemy: number; counter: number; recovery: number }> = {
  story: { enemy: 0.78, counter: 0.55, recovery: 1.3 },
  standard: { enemy: 1, counter: 1, recovery: 1 },
  hard: { enemy: 1.25, counter: 1.45, recovery: 0.78 }
};

const terrainDefence: Record<string, number> = {
  'open-lowland': 1,
  'mixed-lowland': 1.08,
  'mixed-upland': 1.2,
  mountainous: 1.42
};

function addEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const next = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone };
  return { ...state, events: [next, ...state.events].slice(0, 100) };
}

const deployableArmour = (group: TaskGroup) => Math.min(group.functionalArmour, group.personnel);

export function canIssueOperationalOrder(group: TaskGroup | undefined): boolean {
  return Boolean(group && group.personnel > 0 && !group.order && (group.status === 'ready' || group.status === 'garrison'));
}

export function getOperationForGroup(state: GameState, groupId: string): Operation | undefined {
  const operationId = state.taskGroups[groupId]?.order?.operationId;
  return operationId ? state.operations[operationId] : undefined;
}

export function getOperationAtTarget(state: GameState, territoryId: string): Operation | undefined {
  return Object.values(state.operations).find(operation => operation.target === territoryId);
}

function suppliedTerritories(state: GameState): Set<string> {
  const supplied = new Set<string>();
  if (state.territories[state.portalTerritory]?.controller !== 'player' || state.territories[state.portalTerritory]?.occupation === 'unsecured') return supplied;
  const queue = [state.portalTerritory];
  supplied.add(state.portalTerritory);
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbour of TERRITORIES[current].neighbours) {
      if (!supplied.has(neighbour) && state.territories[neighbour]?.controller === 'player' && state.territories[neighbour]?.occupation !== 'unsecured') {
        supplied.add(neighbour);
        queue.push(neighbour);
      }
    }
  }
  return supplied;
}

function refreshSupply(state: GameState): GameState {
  const connected = suppliedTerritories(state);
  const territories = structuredClone(state.territories);
  for (const [id, territory] of Object.entries(territories)) territory.supplied = connected.has(id);
  const personnel = Object.values(state.taskGroups).reduce((sum, group) => sum + group.personnel, 0);
  const capacity = [...connected].reduce((sum, id) => {
    const territory = territories[id];
    const occupationFactor = territory.occupation === 'unsecured' ? 0 : territory.occupation === 'administered' ? 1 : territory.occupation === 'controlled' ? 0.72 : 0.42;
    return sum + TERRITORIES[id].supply * occupationFactor;
  }, 0);
  const supply = clamp(Math.round((capacity * 1150) / Math.max(1, personnel) * 100), 12, 100);
  return { ...state, territories, supply };
}

function initialTaskGroups(portalTerritory: string): Record<string, TaskGroup> {
  const groups: TaskGroup[] = [
    { id: 'TG-1', name: 'Vanguard Group', personnel: 2600, maxPersonnel: 2600, functionalArmour: 2500, damagedArmour: 250, morale: 86, supply: 100 },
    { id: 'TG-2', name: 'Spearhead Group', personnel: 2400, maxPersonnel: 2400, functionalArmour: 2600, damagedArmour: 250, morale: 84, supply: 100 },
    { id: 'TG-3', name: 'Security Group', personnel: 2500, maxPersonnel: 2500, functionalArmour: 1900, damagedArmour: 250, morale: 82, supply: 100 },
    { id: 'TG-4', name: 'Reserve Group', personnel: 2500, maxPersonnel: 2500, functionalArmour: 2000, damagedArmour: 250, morale: 80, supply: 100 }
  ].map(group => ({ ...group, location: portalTerritory, status: 'ready' as const }));
  return Object.fromEntries(groups.map(group => [group.id, group]));
}

function initialEnemyFormations(seed: number, portalTerritory: string, difficulty: Difficulty): Record<string, EnemyFormation> {
  const enemyMultiplier = difficultyRules[difficulty].enemy;
  let index = 0;
  const formations: EnemyFormation[] = [];
  for (const territoryId of SLICE_IDS) {
    if (territoryId === portalTerritory) continue;
    const definition = TERRITORIES[territoryId];
    const terrain = terrainDefence[definition.terrain];
    const roll = randomFor(seed, 1, 100 + index);
    const personnel = Math.round((720 + definition.supply * 145 + roll * 520) * terrain * enemyMultiplier);
    formations.push({
      id: `EF-${String(index + 1).padStart(2, '0')}`,
      name: `${definition.centre} Defence Command`,
      location: territoryId,
      personnel,
      armour: Math.round((35 + roll * 105 + definition.supply * 10) * enemyMultiplier),
      readiness: Math.round(58 + roll * 26),
      entrenchment: Math.round(20 + terrain * 18)
    });
    index += 1;
  }
  return Object.fromEntries(formations.map(formation => [formation.id, formation]));
}

export function newGame(seed = Math.floor(Math.random() * 999999), difficulty: Difficulty = 'standard'): GameState {
  const portalTerritory = SLICE_IDS[seed % SLICE_IDS.length];
  const territories = Object.fromEntries(SLICE_IDS.map(id => [id, {
    controller: id === portalTerritory ? 'player' : 'enemy',
    occupation: id === portalTerritory ? 'controlled' : 'enemy',
    legitimacy: id === portalTerritory ? 58 : 0,
    resistance: id === portalTerritory ? 22 : 0,
    supplied: id === portalTerritory,
    fortification: id === portalTerritory ? 12 : 0,
    capturedTurn: id === portalTerritory ? 1 : undefined
  }])) as Record<string, TerritoryState>;
  const initialEscalation = difficulty === 'hard' ? 8 : 3;
  const strategicState = createStrategicState(seed, difficulty, initialEscalation);
  const state: GameState = {
    version: 7,
    seed,
    difficulty,
    turn: 1,
    portalTerritory,
    selectedTerritory: portalTerritory,
    targetTerritory: null,
    selectedTaskGroupId: 'TG-1',
    territories,
    taskGroups: initialTaskGroups(portalTerritory),
    enemyFormations: initialEnemyFormations(seed, portalTerritory, difficulty),
    escalation: initialEscalation,
    ...strategicState,
    routeStates: createRouteStates(),
    supply: 100,
    woundedPool: 0,
    operations: {},
    status: 'playing',
    events: [{ id: 1, turn: 1, text: `The portal has opened near ${TERRITORIES[portalTerritory].centre}. Four task groups crossed with ten thousand soldiers.`, tone: 'warning' }]
  };
  return refreshSupply(state);
}

export function selectTaskGroup(state: GameState, id: string): GameState {
  if (!state.taskGroups[id]) return state;
  return { ...state, selectedTaskGroupId: id, selectedTerritory: state.taskGroups[id].location, targetTerritory: null };
}

export function selectTerritory(state: GameState, id: string): GameState {
  if (state.status !== 'playing') return state;
  const group = state.taskGroups[state.selectedTaskGroupId];
  if (!group || !state.territories[id]) return state;
  return {
    ...state,
    selectedTerritory: id,
    targetTerritory: id === group.location ? null : id
  };
}

export function issueMove(state: GameState, requestedRouteId?: string): GameState {
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
}

export function setGarrison(state: GameState): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  if (!canIssueOperationalOrder(group)) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const next = taskGroups[group.id];
  next.status = next.status === 'garrison' ? 'ready' : 'garrison';
  return addEvent({ ...state, taskGroups }, `${group.name} ${next.status === 'garrison' ? 'assigned to occupation and defensive duties' : 'released from garrison duty'} in ${TERRITORIES[group.location].centre}.`, 'neutral');
}

export function enemyStrengthAt(state: GameState, territoryId: string): { formations: number; personnel: number; armour: number; power: number } {
  const formations = Object.values(state.enemyFormations).filter(formation => formation.location === territoryId && formation.personnel > 0);
  const personnel = formations.reduce((sum, formation) => sum + formation.personnel, 0);
  const armour = formations.reduce((sum, formation) => sum + formation.armour, 0);
  const readiness = formations.length ? formations.reduce((sum, formation) => sum + formation.readiness, 0) / formations.length : 40;
  const entrenchment = formations.length ? formations.reduce((sum, formation) => sum + formation.entrenchment, 0) / formations.length : 10;
  const terrain = terrainDefence[TERRITORIES[territoryId].terrain];
  const power = Math.max(1, (personnel / 1000 * 3.4 + armour / 100 * 0.75) * (0.65 + readiness / 170) * (1 + entrenchment / 180) * terrain);
  return { formations: formations.length, personnel, armour, power };
}

function nextOperationId(state: GameState, target: string): string {
  let suffix = 1;
  let id = `OP-${state.turn}-${target}-${suffix}`;
  while (state.operations[id]) {
    suffix += 1;
    id = `OP-${state.turn}-${target}-${suffix}`;
  }
  return id;
}

export function beginOperation(state: GameState, requestedRouteId?: string): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (!target || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'enemy') return state;
  const route = chooseOperationalRoute(state.routeStates, group.location, target, group, requestedRouteId);
  if (!route) return state;

  const taskGroups = structuredClone(state.taskGroups);
  const operations = structuredClone(state.operations);
  const existing = getOperationAtTarget(state, target);
  const defenders = Object.values(state.enemyFormations).filter(formation => formation.location === target && formation.personnel > 0);
  const strength = enemyStrengthAt(state, target);
  const operationId = existing?.id ?? nextOperationId(state, target);
  const operation: Operation = existing
    ? operations[existing.id]
    : {
        id: operationId,
        target,
        participantGroupIds: [],
        origins: {},
        progress: 0,
        days: 0,
        enemyFormationIds: defenders.map(formation => formation.id),
        enemyPower: strength.power
      };
  operations[operationId] = operation;

  if (!operation.participantGroupIds.includes(group.id)) operation.participantGroupIds.push(group.id);
  operation.origins[group.id] = group.location;
  taskGroups[group.id].status = 'attacking';
  taskGroups[group.id].order = {
    type: 'attack',
    target,
    progress: operation.progress,
    days: 0,
    routeId: route.id,
    operationId
  };

  const verb = existing ? 'joined the operation' : 'launched an operation';
  return addEvent(
    { ...state, taskGroups, operations, targetTerritory: null },
    `${group.name} ${verb} from ${TERRITORIES[group.location].centre} towards ${TERRITORIES[target].centre} via ${route.name}.`,
    'warning'
  );
}

function resolveMovement(state: GameState): GameState {
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
}

function distributeEnemyLosses(formations: Record<string, EnemyFormation>, ids: string[], personnelLosses: number, armourLosses: number) {
  const active = ids.map(id => formations[id]).filter((formation): formation is EnemyFormation => Boolean(formation && formation.personnel > 0));
  const totalPersonnel = active.reduce((sum, formation) => sum + formation.personnel, 0);
  const totalArmour = active.reduce((sum, formation) => sum + formation.armour, 0);
  for (const formation of active) {
    const personnelShare = totalPersonnel ? formation.personnel / totalPersonnel : 1 / active.length;
    const armourShare = totalArmour ? formation.armour / totalArmour : 1 / active.length;
    formation.personnel = Math.max(0, formation.personnel - Math.round(personnelLosses * personnelShare));
    formation.armour = Math.max(0, formation.armour - Math.round(armourLosses * armourShare));
    formation.readiness = clamp(formation.readiness - 4, 15, 100);
  }
}

function retreatEnemyFormations(state: GameState, target: string, ids: string[]): GameState {
  const enemyFormations = structuredClone(state.enemyFormations);
  const retreatOptions = TERRITORIES[target].neighbours
    .filter(id => state.territories[id].controller === 'enemy')
    .sort((a, b) => TERRITORIES[b].supply - TERRITORIES[a].supply);
  for (const id of ids) {
    const formation = enemyFormations[id];
    if (!formation || formation.personnel <= 0) {
      delete enemyFormations[id];
      continue;
    }
    if (!retreatOptions.length) {
      delete enemyFormations[id];
      continue;
    }
    formation.location = retreatOptions[0];
    formation.entrenchment = Math.max(5, formation.entrenchment - 14);
    formation.readiness = Math.max(20, formation.readiness - 12);
  }
  return { ...state, enemyFormations };
}

function operationParticipants(state: GameState, operation: Operation): TaskGroup[] {
  return operation.participantGroupIds
    .map(id => state.taskGroups[id])
    .filter((group): group is TaskGroup => Boolean(
      group &&
      group.personnel > 0 &&
      group.status === 'attacking' &&
      group.order?.type === 'attack' &&
      group.order.operationId === operation.id
    ));
}

function syncOperationDefenders(state: GameState): GameState {
  const operations = structuredClone(state.operations);
  for (const operation of Object.values(operations)) {
    const defenders = Object.values(state.enemyFormations)
      .filter(formation => formation.location === operation.target && formation.personnel > 0);
    operation.enemyFormationIds = defenders.map(formation => formation.id);
    operation.enemyPower = enemyStrengthAt(state, operation.target).power;
  }
  return { ...state, operations };
}

function resolveOperations(state: GameState): GameState {
  if (!Object.keys(state.operations).length) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const enemyFormations = structuredClone(state.enemyFormations);
  const territories = structuredClone(state.territories);
  const operations = structuredClone(state.operations);
  let next: GameState = { ...state, taskGroups, enemyFormations, territories, operations };
  const victories: Array<{ target: string; enemyFormationIds: string[] }> = [];

  for (const operationId of Object.keys(operations).sort()) {
    const operation = operations[operationId];
    operation.enemyFormationIds = Object.values(enemyFormations)
      .filter(formation => formation.location === operation.target && formation.personnel > 0)
      .map(formation => formation.id);
    const participants = operationParticipants(next, operation);
    if (!participants.length) {
      delete operations[operationId];
      continue;
    }
    operation.participantGroupIds = participants.map(group => group.id);
    operation.days += 1;
    for (const group of participants) {
      if (group.order) {
        group.order.days += 1;
        group.order.progress = operation.progress;
      }
    }

    const defender = enemyStrengthAt(next, operation.target);
    operation.enemyPower = defender.power;
    const individualPowers = participants.map((group, index) => (
      (group.personnel / 1000 * 4.1 + deployableArmour(group) / 1000 * 1.9)
      * (0.58 + group.morale / 150)
      * (0.55 + group.supply / 190)
      * (0.9 + randomFor(next.seed, next.turn, saltFor(operation.id) + index * 17) * 0.22)
    ));
    const coordinationFactor = Math.max(0.82, 1 - (participants.length - 1) * 0.04);
    const attackPower = individualPowers.reduce((sum, power) => sum + power, 0) * coordinationFactor;
    const ratio = attackPower / Math.max(1, defender.power);
    operation.progress += clamp(Math.round((ratio - 1) * 31 + 18), -28, 48);

    let totalKilled = 0;
    let totalWounded = 0;
    let remainingPersonnel = 0;
    let remainingArmour = 0;
    for (const [index, group] of participants.entries()) {
      const casualtyRate = clamp(
        (0.012 / Math.max(0.55, ratio))
        * (0.82 + randomFor(next.seed, next.turn, saltFor(operation.id) + 101 + index * 23) * 0.38),
        0.004,
        0.035
      );
      const casualties = Math.min(group.personnel, Math.max(4, Math.round(group.personnel * casualtyRate)));
      const wounded = Math.round(casualties * 0.61);
      const killed = casualties - wounded;
      group.personnel = Math.max(0, group.personnel - casualties);
      group.morale = clamp(group.morale - (ratio < 0.8 ? 6 : 2), 10, 100);
      next.woundedPool += wounded;
      totalKilled += killed;
      totalWounded += wounded;

      const exposedArmour = deployableArmour(group);
      const armourDamage = Math.min(
        group.functionalArmour,
        Math.max(exposedArmour > 0 ? 1 : 0, Math.round(exposedArmour * (ratio < 1 ? 0.018 : 0.009)))
      );
      group.functionalArmour -= armourDamage;
      group.damagedArmour += armourDamage;
      remainingPersonnel += group.personnel;
      remainingArmour += deployableArmour(group);
      if (group.order) group.order.progress = operation.progress;
    }

    const enemyPersonnelLosses = Math.round(remainingPersonnel * clamp(0.009 * ratio, 0.005, 0.04));
    const enemyArmourLosses = Math.round(Math.max(1, remainingArmour * 0.004 * ratio));
    distributeEnemyLosses(enemyFormations, operation.enemyFormationIds, enemyPersonnelLosses, enemyArmourLosses);

    const remainingDefenders = operation.enemyFormationIds.reduce((sum, id) => sum + (enemyFormations[id]?.personnel ?? 0), 0);
    if (operation.progress >= 100 || remainingDefenders < 220) {
      const territory = territories[operation.target];
      const requiredPresence = occupationRequirement(operation.target);
      const secured = remainingPersonnel >= requiredPresence;
      territory.controller = 'player';
      territory.occupation = secured ? 'contested' : 'unsecured';
      territory.legitimacy = secured ? 46 : 18;
      territory.resistance = secured ? 42 : 72;
      territory.fortification = 0;
      territory.supplied = false;
      territory.capturedTurn = next.turn;
      for (const group of participants) {
        group.location = operation.target;
        group.status = 'ready';
        group.order = undefined;
      }
      next.escalation = clamp(next.escalation + 3.2, 0, 100);
      next.selectedTerritory = operation.target;
      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });
      delete operations[operationId];
      next = addEvent(
        next,
        secured
          ? `${TERRITORIES[operation.target].centre} has fallen to ${participants.map(group => group.name).join(' and ')}. Remaining defenders withdrew; occupation is unstable.`
          : `${TERRITORIES[operation.target].centre} has been seized by ${participants.map(group => group.name).join(' and ')}. Only ${remainingPersonnel} personnel remain against an occupation requirement of ${requiredPresence}; the province is unsecured.`,
        secured ? 'good' : 'warning'
      );
    } else if (operation.progress <= -70 || operation.days >= 8 || remainingPersonnel < 420) {
      for (const group of participants) {
        group.location = operation.origins[group.id] ?? group.location;
        group.status = 'recovering';
        group.order = undefined;
      }
      delete operations[operationId];
      next = addEvent(
        next,
        `${participants.map(group => group.name).join(' and ')} abandoned the operation towards ${TERRITORIES[operation.target].centre} after ${operation.days} days.`,
        'danger'
      );
    } else {
      next = addEvent(
        next,
        `Operation ${TERRITORIES[operation.target].centre}: ${operation.progress}% progress after ${operation.days} day${operation.days === 1 ? '' : 's'}. ${totalKilled} killed, ${totalWounded} wounded; defenders lost about ${enemyPersonnelLosses}.`,
        ratio >= 1 ? 'neutral' : 'warning'
      );
    }
  }

  for (const victory of victories) next = retreatEnemyFormations(next, victory.target, victory.enemyFormationIds);
  return syncOperationDefenders(next);
}

function resolveOccupationAndLogistics(state: GameState): GameState {
  const territories = structuredClone(state.territories);
  const taskGroups = structuredClone(state.taskGroups);
  let next: GameState = { ...state, territories, taskGroups };
  for (const [id, territory] of Object.entries(territories)) {
    if (territory.controller !== 'player') continue;
    const age = next.turn - (territory.capturedTurn ?? next.turn);
    const garrisonPower = Object.values(taskGroups)
      .filter(group => group.location === id && group.status === 'garrison')
      .reduce((sum, group) => sum + group.personnel / 1000, 0);
    const localPresence = Object.values(taskGroups)
      .filter(group => group.location === id && group.status !== 'moving' && group.status !== 'attacking')
      .reduce((sum, group) => sum + group.personnel, 0);
    if (territory.occupation === 'unsecured') {
      const requiredPresence = occupationRequirement(id);
      if (localPresence >= requiredPresence) {
        territory.occupation = 'contested';
        territory.capturedTurn = next.turn;
        territory.legitimacy = Math.max(territory.legitimacy, 34);
        territory.resistance = Math.min(territory.resistance, 58);
        next = addEvent(next, `${TERRITORIES[id].centre} now has ${localPresence} personnel against an occupation requirement of ${requiredPresence}; territorial control is being established.`, 'good');
      } else {
        territory.legitimacy = clamp(territory.legitimacy - 1.2, 0, 100);
        territory.resistance = clamp(territory.resistance + 1.5, 0, 100);
        territory.fortification = 0;
        if ((next.turn - (territory.capturedTurn ?? next.turn)) % 3 === 0) {
          next = addEvent(next, `${TERRITORIES[id].centre} remains unsecured: ${localPresence} personnel present, ${requiredPresence} required.`, 'warning');
        }
        continue;
      }
    }
    territory.legitimacy = clamp(territory.legitimacy + (territory.supplied ? 0.45 : -0.4) + garrisonPower * 0.4, 0, 100);
    territory.resistance = clamp(territory.resistance - (territory.supplied ? 0.32 : -0.8) - garrisonPower * 0.7, 0, 100);
    territory.fortification = clamp(territory.fortification + garrisonPower * 0.55, 0, 45);
    if ((age >= 8 && territory.legitimacy >= 55) || (territory.legitimacy >= 68 && territory.resistance <= 18)) territory.occupation = 'administered';
    else if (age >= 3 && territory.occupation === 'contested') territory.occupation = 'controlled';
    if (randomFor(next.seed, next.turn, id.charCodeAt(id.length - 1)) < territory.resistance / 1300) {
      territory.resistance = clamp(territory.resistance + 5, 0, 100);
      territory.legitimacy = clamp(territory.legitimacy - 2, 0, 100);
      next.escalation = clamp(next.escalation + 0.5, 0, 100);
      next = addEvent(next, `Resistance cells disrupted administration in ${TERRITORIES[id].name}.`, 'warning');
    }
  }

  next = refreshSupply(next);
  for (const group of Object.values(next.taskGroups)) {
    const connected = next.territories[group.location].supplied;
    group.supply = clamp(group.supply + (connected ? Math.max(3, Math.round(next.supply / 14)) : -16), 0, 100);
    group.morale = clamp(group.morale + (connected && group.status !== 'attacking' ? 1 : group.supply < 30 ? -4 : 0), 5, 100);
    if (!connected && group.supply < 20) {
      const attrition = Math.max(2, Math.round(group.personnel * 0.0025));
      group.personnel = Math.max(0, group.personnel - attrition);
      next = addEvent(next, `${group.name} is isolated in ${TERRITORIES[group.location].centre}; ${attrition} personnel lost to attrition and desertion.`, 'danger');
    }
    if (group.status === 'recovering' && connected) group.status = 'ready';
    const repair = connected ? Math.min(group.damagedArmour, Math.max(2, Math.round((next.supply + TERRITORIES[group.location].supply * 8) / 12))) : 0;
    group.damagedArmour -= repair;
    group.functionalArmour += repair;
  }

  const administered = Object.values(next.territories).filter(territory => territory.occupation === 'administered').length;
  const recovery = Math.min(next.woundedPool, Math.round((18 + administered * 7 + next.supply * 0.22) * difficultyRules[next.difficulty].recovery));
  if (recovery > 0) {
    const candidates = Object.values(next.taskGroups).filter(group => next.territories[group.location].supplied && group.personnel < group.maxPersonnel);
    candidates.sort((a, b) => a.personnel / a.maxPersonnel - b.personnel / b.maxPersonnel);
    let remaining = recovery;
    for (const group of candidates) {
      const restored = Math.min(remaining, group.maxPersonnel - group.personnel);
      group.personnel += restored;
      remaining -= restored;
      if (!remaining) break;
    }
    next.woundedPool -= recovery - remaining;
  }
  return next;
}

function pruneOperations(state: GameState): GameState {
  const operations = structuredClone(state.operations);
  for (const [operationId, operation] of Object.entries(operations)) {
    operation.participantGroupIds = operation.participantGroupIds.filter(groupId => {
      const group = state.taskGroups[groupId];
      return Boolean(group && group.personnel > 0 && group.status === 'attacking' && group.order?.operationId === operationId);
    });
    for (const groupId of Object.keys(operation.origins)) {
      if (!operation.participantGroupIds.includes(groupId)) delete operation.origins[groupId];
    }
    if (!operation.participantGroupIds.length) delete operations[operationId];
  }
  return { ...state, operations };
}

function resolveCounterattack(state: GameState, forced = false): GameState {
  const plannedCounterattack = getPlannedCounterattack(state);
  if (state.turn < 4 && !plannedCounterattack) return state;
  const chance = (0.055 + state.escalation / 620) * difficultyRules[state.difficulty].counter;
  if (!forced && !plannedCounterattack && randomFor(state.seed, state.turn, 907) >= chance) return state;
  const frontier = SLICE_IDS.filter(id => state.territories[id].controller === 'player' && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour].controller === 'enemy'));
  if (!frontier.length) return plannedCounterattack ? completeEnemyOrder(state, plannedCounterattack.id) : state;
  frontier.sort((a, b) => {
    const defence = (id: string) => Object.values(state.taskGroups).filter(group => group.location === id).reduce((sum, group) => sum + group.personnel + deployableArmour(group) * 0.25, 0) + state.territories[id].fortification * 80;
    return defence(a) - defence(b);
  });
  if (plannedCounterattack && !frontier.some(id => id === plannedCounterattack.target)) {
    return completeEnemyOrder(state, plannedCounterattack.id);
  }
  const target = plannedCounterattack && frontier.some(id => id === plannedCounterattack.target)
    ? plannedCounterattack.target
    : frontier[0];
  const origins = TERRITORIES[target].neighbours.filter(id => state.territories[id].controller === 'enemy');
  const formations = Object.values(state.enemyFormations).filter(formation => origins.includes(formation.location) && formation.personnel > 250);
  if (!formations.length) return plannedCounterattack ? completeEnemyOrder(state, plannedCounterattack.id) : state;
  formations.sort((a, b) => (b.personnel + b.armour * 4) - (a.personnel + a.armour * 4));
  const plannedFormation = plannedCounterattack?.formationId ? state.enemyFormations[plannedCounterattack.formationId] : undefined;
  const attacker = plannedFormation && formations.some(formation => formation.id === plannedFormation.id)
    ? plannedFormation
    : formations[0];
  const defenders = Object.values(state.taskGroups).filter(group => group.location === target);
  const defenderPower = defenders.reduce((sum, group) => sum + group.personnel / 1000 * 4 + deployableArmour(group) / 1000 * 1.5 + (group.status === 'garrison' && group.personnel > 0 ? 2.5 : 0), 0) + state.territories[target].fortification / 7 + 1.5;
  const attackerPower = (attacker.personnel / 1000 * 3.6 + attacker.armour / 100 * 0.8) * (0.7 + attacker.readiness / 150) * difficultyRules[state.difficulty].enemy;
  const roll = 0.84 + randomFor(state.seed, state.turn, 919) * 0.34;
  const enemyFormations = structuredClone(state.enemyFormations);
  const taskGroups = structuredClone(state.taskGroups);
  const territories = structuredClone(state.territories);
  let next: GameState = { ...state, enemyFormations, taskGroups, territories };
  if (attackerPower * roll > defenderPower) {
    const retreatOptions = TERRITORIES[target].neighbours
      .filter(id => territories[id].controller === 'player' && territories[id].supplied)
      .sort((a, b) => TERRITORIES[b].supply - TERRITORIES[a].supply);
    const destroyed: string[] = [];
    for (const defender of defenders) {
      const group = taskGroups[defender.id];
      const combatLosses = Math.min(group.personnel, Math.max(20, Math.round(group.personnel * 0.055)));
      group.personnel -= combatLosses;
      next.woundedPool += Math.round(combatLosses * 0.55);
      if (retreatOptions.length) {
        group.location = retreatOptions[0];
        group.morale = clamp(group.morale - 12, 5, 100);
        group.status = 'recovering';
        group.order = undefined;
      } else {
        destroyed.push(group.name);
        delete taskGroups[group.id];
      }
    }
    territories[target] = { controller: 'enemy', occupation: 'enemy', legitimacy: 0, resistance: 0, supplied: false, fortification: 8 };
    enemyFormations[attacker.id].location = target;
    enemyFormations[attacker.id].readiness = clamp(enemyFormations[attacker.id].readiness - 8, 15, 100);
    const survivingIds = Object.keys(taskGroups);
    if (!taskGroups[next.selectedTaskGroupId]) {
      next.selectedTaskGroupId = survivingIds[0] ?? '';
      next.selectedTerritory = survivingIds[0] ? taskGroups[survivingIds[0]].location : target;
      next.targetTerritory = null;
    }
    next.escalation = clamp(next.escalation + 1.8, 0, 100);
    const retreatText = !defenders.length
      ? 'The territory had no task group garrison and fell without an organised retreat.'
      : retreatOptions.length
        ? 'Local task groups withdrew under pressure.'
        : `${destroyed.join(', ')} became encircled and ceased to exist as coherent formations.`;
    next = addEvent(next, `Enemy forces retook ${TERRITORIES[target].centre}. ${retreatText}`, 'danger');
  } else {
    const losses = Math.max(30, Math.round(attacker.personnel * 0.045));
    enemyFormations[attacker.id].personnel = Math.max(0, enemyFormations[attacker.id].personnel - losses);
    for (const defender of defenders) {
      const group = taskGroups[defender.id];
      const defenderLosses = Math.max(4, Math.round(group.personnel * 0.009));
      group.personnel -= defenderLosses;
      next.woundedPool += Math.round(defenderLosses * 0.6);
    }
    next = addEvent(next, `${TERRITORIES[target].centre} repelled an enemy counterattack. The attacking formation lost roughly ${losses} personnel.`, 'good');
  }
  if (plannedCounterattack) next = completeEnemyOrder(next, plannedCounterattack.id);
  return pruneOperations(refreshSupply(next));
}

export function endTurn(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  let next: GameState = {
    ...state,
    turn: state.turn + 1,
    territories: structuredClone(state.territories),
    taskGroups: structuredClone(state.taskGroups),
    enemyFormations: structuredClone(state.enemyFormations),
    operations: structuredClone(state.operations),
    routeStates: structuredClone(state.routeStates),
    events: [...state.events]
  };
  next = resolveMovement(next);
  next = resolveOperations(next);
  next = resolveOccupationAndLogistics(next);
  next = resolveStrategicResponse(next);
  next = resolveCounterattack(next);
  next = pruneOperations(next);
  next = syncOperationDefenders(next);
  next = refreshSupply(next);
  const controlled = Object.values(next.territories).filter(territory => territory.controller === 'player').length;
  const unsecured = Object.values(next.territories).filter(territory => territory.occupation === 'unsecured').length;
  const personnel = Object.values(next.taskGroups).reduce((sum, group) => sum + group.personnel, 0);
  if (controlled === SLICE_IDS.length && unsecured === 0) next = addEvent({ ...next, status: 'victory' }, 'All fifteen territories are occupied and under future control. Regional victory achieved.', 'good');
  else if (personnel < 1200 || next.territories[next.portalTerritory].controller !== 'player') next = addEvent({ ...next, status: 'defeat' }, 'The expedition has lost operational cohesion or access to the portal.', 'danger');
  return next;
}

interface LegacyBattle {
  id: string;
  attackerGroupId: string;
  origin: string;
  target: string;
  progress: number;
  days: number;
  enemyFormationIds: string[];
  enemyPower: number;
}

type StrategicField =
  | 'escalationStage'
  | 'mobilisationPool'
  | 'mobilisations'
  | 'enemyOrders'
  | 'intelligenceReports';
type NetworkField = 'routeStates';

type LegacyV6GameState = Omit<GameState, 'version'> & { version: 6 };
type LegacyV5GameState = Omit<GameState, 'version' | NetworkField> & { version: 5 };
type LegacyV4GameState = Omit<GameState, 'version' | StrategicField | NetworkField> & { version: 4 };
type LegacyV3GameState = Omit<GameState, 'version' | StrategicField | NetworkField> & { version: 3 };
type LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField> & {
  version: 2;
  battle: LegacyBattle | null;
};

function migrateLegacyGame(parsed: LegacyGameState): GameState {
  const taskGroups = structuredClone(parsed.taskGroups);
  const operations: Record<string, Operation> = {};
  if (parsed.battle) {
    const operationId = `OP-MIGRATED-${parsed.battle.id}`;
    operations[operationId] = {
      id: operationId,
      target: parsed.battle.target,
      participantGroupIds: [parsed.battle.attackerGroupId],
      origins: { [parsed.battle.attackerGroupId]: parsed.battle.origin },
      progress: parsed.battle.progress,
      days: parsed.battle.days,
      enemyFormationIds: [...parsed.battle.enemyFormationIds],
      enemyPower: parsed.battle.enemyPower
    };
    const group = taskGroups[parsed.battle.attackerGroupId];
    if (group?.order?.type === 'attack') group.order.operationId = operationId;
  }
  const { battle: _battle, ...withoutBattle } = parsed;
  return upgradeStrategicState({
    ...withoutBattle,
    version: 4,
    taskGroups,
    operations
  } as LegacyV4GameState);
}

export function saveGame(state: GameState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const current = localStorage.getItem(SAVE_KEY);
  if (current) {
    const parsed = JSON.parse(current) as Partial<GameState>;
    if (
      parsed.version === 7
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

  const v5 = localStorage.getItem(LEGACY_V5_SAVE_KEY);
  if (v5) {
    const parsed = JSON.parse(v5) as Partial<LegacyV5GameState>;
    if (
      parsed.version === 5
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
    ) return upgradeStrategicState(parsed as LegacyV5GameState);
  }

  const v4 = localStorage.getItem(LEGACY_V4_SAVE_KEY);
  if (v4) {
    const parsed = JSON.parse(v4) as Partial<LegacyV4GameState>;
    if (parsed.version === 4 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) {
      return upgradeStrategicState(parsed as LegacyV4GameState);
    }
  }

  const prior = localStorage.getItem(LEGACY_V3_SAVE_KEY);
  if (prior) {
    const parsed = JSON.parse(prior) as Partial<LegacyV3GameState>;
    if (parsed.version === 3 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) {
      return upgradeStrategicState({ ...(parsed as LegacyV3GameState), version: 4 } as LegacyV4GameState);
    }
  }

  const legacy = localStorage.getItem(LEGACY_V2_SAVE_KEY);
  if (!legacy) return null;
  const parsed = JSON.parse(legacy) as Partial<LegacyGameState>;
  if (parsed.version !== 2 || !parsed.taskGroups || !parsed.enemyFormations) return null;
  return migrateLegacyGame(parsed as LegacyGameState);
}

export const __testOnly = {
  deployableArmour,
  refreshSupply,
  resolveMovement,
  resolveOperations,
  pruneOperations,
  resolveCounterattack: (state: GameState) => resolveCounterattack(state, true)
};
