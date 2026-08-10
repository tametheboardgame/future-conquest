import { SLICE_IDS, TERRITORIES } from './data';
import { applyInfrastructureDamage } from './infrastructure-disruption';
import { STRATEGIC_ROUTES } from './strategic-network-data';
import { territorySupplySourceCapacity } from './territory-resources';
import type {
  Difficulty,
  EnemyDoctrine,
  EnemyFormation,
  EnemyOrder,
  EnemyStrategyState,
  GameEvent,
  GameState,
  IntelligenceReport
} from './types';

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

export const ENEMY_DOCTRINE_LABELS: Record<EnemyDoctrine, string> = {
  containment: 'Containment',
  counteroffensive: 'Counteroffensive',
  'logistics-war': 'Logistics war',
  'strategic-emergency': 'Strategic emergency'
};

const difficultyPressure: Record<Difficulty, number> = {
  story: 6,
  standard: 13,
  hard: 21
};

const difficultyAggression: Record<Difficulty, number> = {
  story: -0.08,
  standard: 0,
  hard: 0.12
};

const turnPressureGrowth: Record<Difficulty, number> = {
  story: 0.24,
  standard: 0.32,
  hard: 0.42
};

const interdictionCooldownDays: Record<Difficulty, number> = {
  story: 3,
  standard: 2,
  hard: 1
};

const interdictionSeverityScale: Record<Difficulty, number> = {
  story: 0.82,
  standard: 1,
  hard: 1.15
};

export function crisisLimitForDifficulty(difficulty: Difficulty): number {
  return difficulty === 'story' ? 7 : difficulty === 'hard' ? 3 : 5;
}

export function createEnemyStrategyState(difficulty: Difficulty): EnemyStrategyState {
  return {
    doctrine: 'containment',
    pressure: difficultyPressure[difficulty],
    momentum: 0,
    threatenedRouteIds: [],
    operationalCrisisTurns: 0,
    lastDoctrineChangeTurn: 1
  };
}

export function normaliseEnemyStrategyState(value: unknown, difficulty: Difficulty): EnemyStrategyState {
  const defaults = createEnemyStrategyState(difficulty);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const candidate = value as Partial<EnemyStrategyState>;
  const doctrine: EnemyDoctrine = candidate.doctrine === 'containment'
    || candidate.doctrine === 'counteroffensive'
    || candidate.doctrine === 'logistics-war'
    || candidate.doctrine === 'strategic-emergency'
    ? candidate.doctrine
    : defaults.doctrine;
  return {
    doctrine,
    pressure: typeof candidate.pressure === 'number' && Number.isFinite(candidate.pressure)
      ? clamp(candidate.pressure, 0, 100)
      : defaults.pressure,
    momentum: typeof candidate.momentum === 'number' && Number.isFinite(candidate.momentum)
      ? clamp(candidate.momentum, -100, 100)
      : defaults.momentum,
    ...(typeof candidate.focusTerritory === 'string' ? { focusTerritory: candidate.focusTerritory } : {}),
    threatenedRouteIds: Array.isArray(candidate.threatenedRouteIds)
      ? candidate.threatenedRouteIds.filter((id): id is string => typeof id === 'string').slice(0, 3)
      : [],
    operationalCrisisTurns: typeof candidate.operationalCrisisTurns === 'number' && Number.isFinite(candidate.operationalCrisisTurns)
      ? clamp(Math.round(candidate.operationalCrisisTurns), 0, 9)
      : 0,
    lastDoctrineChangeTurn: typeof candidate.lastDoctrineChangeTurn === 'number' && Number.isFinite(candidate.lastDoctrineChangeTurn)
      ? Math.max(1, Math.round(candidate.lastDoctrineChangeTurn))
      : 1
  };
}

function appendEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const event: GameEvent = {
    id: (state.events[0]?.id ?? 0) + 1,
    turn: state.turn,
    text,
    tone
  };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

function addReport(state: GameState, report: Omit<IntelligenceReport, 'id' | 'turn'>): GameState {
  const entry: IntelligenceReport = {
    id: `INT-${state.turn}-STRATEGY-${saltFor(report.title)}-${state.intelligenceReports.length + 1}`,
    turn: state.turn,
    ...report
  };
  return { ...state, intelligenceReports: [entry, ...state.intelligenceReports].slice(0, 40) };
}

function frontlinePlayerTerritories(state: GameState): string[] {
  return SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'player'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'enemy')
  ));
}

function frontlineEnemyTerritories(state: GameState): string[] {
  return SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'enemy'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player')
  ));
}

function playerDefenceAt(state: GameState, territoryId: string): number {
  const formationPower = Object.values(state.taskGroups)
    .filter(group => group.location === territoryId && group.personnel > 0)
    .reduce((sum, group) => (
      sum
      + group.personnel
      + Math.min(group.functionalArmour, group.personnel) * 0.34
      + group.morale * 9
      + group.supply * 6
    ), 0);
  return formationPower + state.territories[territoryId].fortification * 85;
}

function enemyFormationPower(formation: EnemyFormation): number {
  return formation.personnel + formation.armour * 4.2 + formation.readiness * 12 + formation.entrenchment * 14;
}

function adjacentEnemyFormations(state: GameState, territoryId: string): EnemyFormation[] {
  const origins = TERRITORIES[territoryId].neighbours.filter(id => state.territories[id]?.controller === 'enemy');
  return Object.values(state.enemyFormations)
    .filter(formation => origins.includes(formation.location) && formation.personnel > 250)
    .sort((first, second) => enemyFormationPower(second) - enemyFormationPower(first));
}

function routeThreatScore(state: GameState, routeId: string, focusTerritory?: string): number {
  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);
  const routeState = state.routeStates[routeId];
  if (!route || !routeState || routeState.status === 'destroyed') return -Infinity;
  const from = state.territories[route.fromTerritoryId];
  const to = state.territories[route.toTerritoryId];
  if (!from || !to) return -Infinity;
  const playerEndpoints = [from, to].filter(territory => territory.controller === 'player').length;
  if (!playerEndpoints) return -Infinity;
  const flow = state.logistics.routeFlows[route.id];
  const focusBonus = focusTerritory && (route.fromTerritoryId === focusTerritory || route.toTerritoryId === focusTerritory) ? 28 : 0;
  const sourceBonus = Math.max(
    territorySupplySourceCapacity(state, route.fromTerritoryId),
    territorySupplySourceCapacity(state, route.toTerritoryId)
  ) * 0.45;
  const bottleneckBonus = state.logistics.bottleneckRouteIds.includes(route.id) ? 24 : 0;
  const frontierBonus = [route.fromTerritoryId, route.toTerritoryId].some(id => (
    state.territories[id]?.controller === 'player'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'enemy')
  )) ? 18 : 0;
  return playerEndpoints * 14
    + (flow?.utilisation ?? 0) * 0.45
    + route.supplyCapacity * 0.65
    + focusBonus
    + sourceBonus
    + bottleneckBonus
    + frontierBonus
    - (100 - routeState.condition) * 0.2;
}

function threatenedRoutes(state: GameState, focusTerritory?: string): string[] {
  return STRATEGIC_ROUTES
    .map(route => ({ id: route.id, score: routeThreatScore(state, route.id, focusTerritory) }))
    .filter(candidate => Number.isFinite(candidate.score))
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))
    .slice(0, 3)
    .map(candidate => candidate.id);
}

function focusScore(state: GameState, territoryId: string): number {
  const allocation = state.logistics.territoryAllocations[territoryId];
  const defenders = playerDefenceAt(state, territoryId);
  const enemyPower = adjacentEnemyFormations(state, territoryId).reduce((sum, formation) => sum + enemyFormationPower(formation), 0);
  const territory = state.territories[territoryId];
  return enemyPower * 0.0016
    - defenders * 0.0013
    + TERRITORIES[territoryId].supply * 8
    + territorySupplySourceCapacity(state, territoryId) * 0.55
    + (territory.occupation === 'unsecured' ? 25 : territory.occupation === 'contested' ? 14 : 0)
    + Math.max(0, 70 - (allocation?.ratio ?? 100)) * 0.55
    + territory.resistance * 0.18;
}

function selectFocusTerritory(state: GameState): string | undefined {
  return frontlinePlayerTerritories(state)
    .map(id => ({ id, score: focusScore(state, id) }))
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))[0]?.id;
}

function pressureFor(state: GameState): number {
  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const unsecured = Object.values(state.territories).filter(territory => territory.occupation === 'unsecured').length;
  const severeShortfalls = state.logistics.starvedFormationIds.length + state.logistics.starvedTerritoryIds.length;
  return clamp(
    difficultyPressure[state.difficulty]
    + Math.max(0, controlled - 1) * 4.2
    + state.escalationStage * 6.4
    + Math.max(0, state.turn - 1) * turnPressureGrowth[state.difficulty]
    + Math.max(0, 72 - state.logistics.networkEfficiency) * 0.38
    + severeShortfalls * 4.5
    + Object.keys(state.operations).length * 3.4
    + unsecured * 1.8,
    0,
    100
  );
}

export function assessEnemyStrategy(state: GameState): EnemyStrategyState {
  const previous = normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty);
  const focusTerritory = selectFocusTerritory(state);
  const pressure = pressureFor(state);
  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const criticalSourceFrontline = frontlinePlayerTerritories(state).some(id => territorySupplySourceCapacity(state, id) >= 28);
  const networkThreat = Math.max(0, 70 - state.logistics.networkEfficiency)
    + state.logistics.bottleneckRouteIds.length * 8
    + state.logistics.starvedFormationIds.length * 10;
  const adjacentPower = focusTerritory
    ? adjacentEnemyFormations(state, focusTerritory).reduce((sum, formation) => sum + enemyFormationPower(formation), 0)
    : 0;
  const focusDefence = focusTerritory ? playerDefenceAt(state, focusTerritory) : Infinity;

  let doctrine: EnemyDoctrine = 'containment';
  if (pressure >= 79 || (criticalSourceFrontline && state.escalationStage >= 4)) doctrine = 'strategic-emergency';
  else if (state.escalationStage >= 2 && networkThreat >= 38) doctrine = 'logistics-war';
  else if (state.escalationStage >= 2 && focusTerritory && adjacentPower >= focusDefence * (0.88 - difficultyAggression[state.difficulty])) doctrine = 'counteroffensive';

  const momentum = clamp(
    Math.max(0, controlled - 1) * 9
    + Object.keys(state.operations).length * 6
    + Math.max(0, 62 - state.logistics.networkEfficiency) * 0.5
    - frontlineEnemyTerritories(state).length * 1.5,
    -100,
    100
  );

  return {
    ...previous,
    doctrine,
    pressure,
    momentum,
    ...(focusTerritory ? { focusTerritory } : {}),
    threatenedRouteIds: threatenedRoutes(state, focusTerritory),
    lastDoctrineChangeTurn: doctrine === previous.doctrine ? previous.lastDoctrineChangeTurn : state.turn
  };
}

function nextEnemyStep(state: GameState, origin: string, target: string): string | undefined {
  if (origin === target) return origin;
  const queue: Array<{ id: string; first: string }> = [];
  const visited = new Set([origin]);
  for (const neighbour of TERRITORIES[origin].neighbours) {
    if (state.territories[neighbour]?.controller === 'enemy') {
      queue.push({ id: neighbour, first: neighbour });
      visited.add(neighbour);
    }
  }
  while (queue.length) {
    const current = queue.shift()!;
    if (current.id === target) return current.first;
    for (const neighbour of TERRITORIES[current.id].neighbours) {
      if (!visited.has(neighbour) && state.territories[neighbour]?.controller === 'enemy') {
        visited.add(neighbour);
        queue.push({ id: neighbour, first: current.first });
      }
    }
  }
  return undefined;
}

function concentrationDestination(state: GameState, focusTerritory: string): string | undefined {
  return TERRITORIES[focusTerritory].neighbours
    .filter(id => state.territories[id]?.controller === 'enemy')
    .sort((first, second) => (
      enemyFormationPower(Object.values(state.enemyFormations).find(formation => formation.location === second) ?? {
        id: '', name: '', location: second, personnel: 0, armour: 0, readiness: 0, entrenchment: 0
      })
      - enemyFormationPower(Object.values(state.enemyFormations).find(formation => formation.location === first) ?? {
        id: '', name: '', location: first, personnel: 0, armour: 0, readiness: 0, entrenchment: 0
      })
    ))[0];
}

function concentrateForces(state: GameState): GameState {
  const focus = state.enemyStrategy.focusTerritory;
  if (!focus || (state.enemyStrategy.doctrine !== 'counteroffensive' && state.enemyStrategy.doctrine !== 'strategic-emergency' && state.enemyStrategy.doctrine !== 'logistics-war')) return state;
  const destination = concentrationDestination(state, focus);
  if (!destination) return state;
  const enemyFront = new Set(frontlineEnemyTerritories(state));
  const moveLimit = state.enemyStrategy.doctrine === 'strategic-emergency' ? 2 : 1;
  const candidates = Object.values(state.enemyFormations)
    .filter(formation => formation.personnel > 450 && !enemyFront.has(formation.location) && formation.location !== destination)
    .sort((first, second) => enemyFormationPower(second) - enemyFormationPower(first));
  if (!candidates.length) return state;

  const enemyFormations = structuredClone(state.enemyFormations);
  const orders = [...state.enemyOrders];
  let moved = 0;
  for (const candidate of candidates) {
    if (moved >= moveLimit) break;
    const formation = enemyFormations[candidate.id];
    const origin = formation.location;
    const step = nextEnemyStep(state, origin, destination);
    if (!step || step === origin) continue;
    formation.location = step;
    formation.readiness = clamp(formation.readiness - 2.5, 15, 100);
    const order: EnemyOrder = {
      id: `EO-${state.turn}-CONCENTRATE-${formation.id}-${step}`,
      turn: state.turn,
      type: 'concentrate',
      formationId: formation.id,
      origin,
      target: step,
      status: 'completed',
      priority: 82,
      summary: `${formation.name} concentrating towards ${TERRITORIES[focus].centre}`
    };
    orders.unshift(order);
    moved += 1;
  }
  if (!moved) return state;
  return appendEvent(
    { ...state, enemyFormations, enemyOrders: orders.slice(0, 24) },
    `Enemy formations are concentrating towards ${TERRITORIES[focus].centre}.`,
    'warning'
  );
}

function planCoordinatedCounterattack(state: GameState): GameState {
  if (state.enemyStrategy.doctrine !== 'counteroffensive' && state.enemyStrategy.doctrine !== 'strategic-emergency') return state;
  if (state.escalationStage < 2) return state;
  if (state.enemyOrders.some(order => order.type === 'counterattack' && order.status !== 'completed')) return state;
  const recoveryDays = state.difficulty === 'story' ? 4 : 3;
  if (state.enemyOrders.some(order => (
    order.type === 'counterattack'
    && order.status === 'completed'
    && state.turn - order.turn < recoveryDays
  ))) return state;
  const target = state.enemyStrategy.focusTerritory;
  if (!target || state.territories[target]?.controller !== 'player') return state;

  const candidates = adjacentEnemyFormations(state, target);
  if (!candidates.length) return state;
  const participantLimit = state.enemyStrategy.doctrine === 'strategic-emergency' || state.escalationStage >= 4 ? 3 : 2;
  const participants = candidates.slice(0, participantLimit);
  const combinedPower = participants.reduce((sum, formation) => sum + enemyFormationPower(formation), 0);
  const requiredRatio = state.difficulty === 'story' ? 2.1 : 1.8;
  if (combinedPower < playerDefenceAt(state, target) * requiredRatio) return state;

  const primary = participants[0];
  const order: EnemyOrder = {
    id: `EO-${state.turn}-COORDINATED-${target}`,
    turn: state.turn,
    type: 'counterattack',
    formationId: primary.id,
    supportFormationIds: participants.slice(1).map(formation => formation.id),
    origin: primary.location,
    target,
    executeTurn: state.turn + 1,
    status: 'planned',
    priority: 110,
    summary: `Coordinated counterattack forming against ${TERRITORIES[target].centre}`
  };
  let next = { ...state, enemyOrders: [order, ...state.enemyOrders].slice(0, 24) };
  next = appendEvent(next, `${participants.length} enemy formations are preparing to strike ${TERRITORIES[target].centre}.`, 'danger');
  next = addReport(next, {
    kind: 'strategy',
    title: order.summary,
    detail: `${participants.length} formations are assessed to be coordinating for an attack on day ${order.executeTurn}.`,
    confidence: state.escalationStage >= 4 ? 'high' : 'moderate',
    estimatedMin: Math.round(participants.reduce((sum, formation) => sum + formation.personnel, 0) * 0.82 / 50) * 50,
    estimatedMax: Math.round(participants.reduce((sum, formation) => sum + formation.personnel, 0) * 1.18 / 50) * 50,
    territoryId: target
  });
  return next;
}

function executeStrategicInterdiction(state: GameState): GameState {
  if (state.enemyStrategy.doctrine !== 'logistics-war' && state.enemyStrategy.doctrine !== 'strategic-emergency') return state;
  if (state.escalationStage < 2 || !state.enemyStrategy.threatenedRouteIds.length) return state;
  const cooldown = interdictionCooldownDays[state.difficulty];
  if ((state.infrastructureIncidents ?? []).some(incident => (
    incident.cause === 'enemy-interdiction'
    && state.turn - incident.turn < cooldown
  ))) return state;
  const routeId = state.enemyStrategy.threatenedRouteIds[0];
  const chance = clamp(
    0.12
    + state.enemyStrategy.pressure / 300
    + (state.enemyStrategy.doctrine === 'strategic-emergency' ? 0.12 : 0)
    + difficultyAggression[state.difficulty],
    0.06,
    0.68
  );
  if (randomFor(state.seed, state.turn, saltFor(routeId) + 1709) >= chance) return state;
  const baseSeverity = 9 + state.enemyStrategy.pressure / 8 + randomFor(state.seed, state.turn, saltFor(routeId) + 1901) * 10;
  const severity = Math.max(6, Math.round(baseSeverity * interdictionSeverityScale[state.difficulty]));
  let next = applyInfrastructureDamage(state, routeId, severity, 'enemy-interdiction');
  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);
  if (!route) return next;
  const order: EnemyOrder = {
    id: `EO-${state.turn}-INTERDICT-${routeId}`,
    turn: state.turn,
    type: 'interdict',
    target: route.toTerritoryId,
    status: 'completed',
    priority: 105,
    summary: `Enemy interdiction struck ${route.name}`
  };
  next = { ...next, enemyOrders: [order, ...next.enemyOrders].slice(0, 24) };
  next = addReport(next, {
    kind: 'strategy',
    title: `Logistics attack on ${route.name}`,
    detail: `Enemy command selected a heavily used or strategically important corridor for deliberate interdiction.`,
    confidence: 'high',
    territoryId: route.toTerritoryId
  });
  return next;
}

function updateOperationalCrisis(state: GameState): GameState {
  const strategy = normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty);
  const activePersonnel = Object.values(state.taskGroups).reduce((sum, group) => sum + group.personnel, 0);
  const activeGroups = Object.values(state.taskGroups).filter(group => group.personnel > 0).length;
  const activeFormations = Object.values(state.taskGroups).filter(group => group.personnel > 0);
  const averageSupplyStock = activeFormations.length
    ? activeFormations.reduce((sum, group) => sum + group.supply, 0) / activeFormations.length
    : 0;
  const criticalSourceFrontline = frontlinePlayerTerritories(state).some(id => territorySupplySourceCapacity(state, id) >= 28);
  const indicators = [
    criticalSourceFrontline,
    state.logistics.networkEfficiency < 45 && averageSupplyStock < 35,
    state.logistics.starvedFormationIds.length >= Math.max(2, Math.ceil(activeGroups / 2)) && averageSupplyStock < 50,
    activePersonnel < 4500,
    Object.values(state.territories).filter(territory => territory.controller === 'player').length <= 2 && state.escalationStage >= 4
  ].filter(Boolean).length;
  const inCrisis = indicators >= 3 && strategy.pressure >= 65;
  const operationalCrisisTurns = inCrisis
    ? Math.min(9, strategy.operationalCrisisTurns + 1)
    : Math.max(0, strategy.operationalCrisisTurns - 1);
  if (operationalCrisisTurns === strategy.operationalCrisisTurns) return state;
  let next: GameState = { ...state, enemyStrategy: { ...strategy, operationalCrisisTurns } };
  if (operationalCrisisTurns === 1) {
    next = appendEvent(next, 'Operational crisis declared: key supply areas, the logistics network and remaining formations are under simultaneous pressure.', 'danger');
  } else if (operationalCrisisTurns === 0 && strategy.operationalCrisisTurns > 0) {
    next = appendEvent(next, 'Operational crisis conditions have eased. Campaign cohesion is recovering.', 'good');
  } else if (inCrisis) {
    next = appendEvent(next, `Operational crisis continues for day ${operationalCrisisTurns} of ${crisisLimitForDifficulty(state.difficulty)}.`, 'danger');
  }
  return next;
}

export function resolveEnemyStrategy(state: GameState): GameState {
  const previous = normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty);
  const assessment = assessEnemyStrategy(state);
  let next: GameState = {
    ...state,
    enemyStrategy: assessment,
    enemyFormations: structuredClone(state.enemyFormations),
    enemyOrders: structuredClone(state.enemyOrders),
    intelligenceReports: [...state.intelligenceReports]
  };
  if (assessment.doctrine !== previous.doctrine) {
    next = appendEvent(
      next,
      `Enemy doctrine changed to ${ENEMY_DOCTRINE_LABELS[assessment.doctrine]}${assessment.focusTerritory ? ` with ${TERRITORIES[assessment.focusTerritory].centre} as the operational focus` : ''}.`,
      assessment.doctrine === 'containment' ? 'neutral' : assessment.doctrine === 'counteroffensive' ? 'warning' : 'danger'
    );
    next = addReport(next, {
      kind: 'strategy',
      title: `${ENEMY_DOCTRINE_LABELS[assessment.doctrine]} doctrine assessed`,
      detail: assessment.focusTerritory
        ? `Enemy command is prioritising ${TERRITORIES[assessment.focusTerritory].centre}. Pressure is assessed at ${Math.round(assessment.pressure)}%.`
        : `Enemy command is reassessing the theatre. Pressure is assessed at ${Math.round(assessment.pressure)}%.`,
      confidence: assessment.pressure >= 75 ? 'high' : 'moderate',
      territoryId: assessment.focusTerritory
    });
  }
  next = concentrateForces(next);
  next = planCoordinatedCounterattack(next);
  next = executeStrategicInterdiction(next);
  next = updateOperationalCrisis(next);
  return next;
}

export const __testOnly = {
  adjacentEnemyFormations,
  focusScore,
  planCoordinatedCounterattack,
  pressureFor,
  routeThreatScore,
  selectFocusTerritory,
  threatenedRoutes,
  updateOperationalCrisis
};
