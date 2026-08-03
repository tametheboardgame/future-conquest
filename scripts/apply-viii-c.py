from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"Expected text not found in {path}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Enemy strategy engine
# ---------------------------------------------------------------------------
write('src/game/enemy-strategy.ts', r'''import { SLICE_IDS, TERRITORIES } from './data';
import { applyInfrastructureDamage } from './infrastructure-disruption';
import { STRATEGIC_ROUTES } from './strategic-network-data';
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

export function crisisLimitForDifficulty(difficulty: Difficulty): number {
  return difficulty === 'story' ? 5 : difficulty === 'hard' ? 3 : 4;
}

export function createEnemyStrategyState(difficulty: Difficulty): EnemyStrategyState {
  return {
    doctrine: 'containment',
    pressure: difficultyPressure[difficulty],
    momentum: 0,
    focusTerritory: undefined,
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
    focusTerritory: typeof candidate.focusTerritory === 'string' ? candidate.focusTerritory : undefined,
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
  const portalBonus = route.fromTerritoryId === state.portalTerritory || route.toTerritoryId === state.portalTerritory ? 34 : 0;
  const bottleneckBonus = state.logistics.bottleneckRouteIds.includes(route.id) ? 24 : 0;
  const frontierBonus = [route.fromTerritoryId, route.toTerritoryId].some(id => (
    state.territories[id]?.controller === 'player'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'enemy')
  )) ? 18 : 0;
  return playerEndpoints * 14
    + (flow?.utilisation ?? 0) * 0.45
    + route.supplyCapacity * 0.65
    + focusBonus
    + portalBonus
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
    + (territoryId === state.portalTerritory ? 36 : 0)
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
    + Math.max(0, state.turn - 1) * 0.42
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
  const portalFrontline = TERRITORIES[state.portalTerritory].neighbours.some(id => state.territories[id]?.controller === 'enemy');
  const networkThreat = Math.max(0, 70 - state.logistics.networkEfficiency)
    + state.logistics.bottleneckRouteIds.length * 8
    + state.logistics.starvedFormationIds.length * 10;
  const adjacentPower = focusTerritory
    ? adjacentEnemyFormations(state, focusTerritory).reduce((sum, formation) => sum + enemyFormationPower(formation), 0)
    : 0;
  const focusDefence = focusTerritory ? playerDefenceAt(state, focusTerritory) : Infinity;

  let doctrine: EnemyDoctrine = 'containment';
  if (pressure >= 79 || (portalFrontline && state.escalationStage >= 4)) doctrine = 'strategic-emergency';
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
    focusTerritory,
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
  const target = state.enemyStrategy.focusTerritory;
  if (!target || state.territories[target]?.controller !== 'player') return state;

  const candidates = adjacentEnemyFormations(state, target);
  if (!candidates.length) return state;
  const participantLimit = state.enemyStrategy.doctrine === 'strategic-emergency' || state.escalationStage >= 4 ? 3 : 2;
  const participants = candidates.slice(0, participantLimit);
  const combinedPower = participants.reduce((sum, formation) => sum + enemyFormationPower(formation), 0);
  const requiredRatio = state.difficulty === 'story' ? 1.14 : state.difficulty === 'hard' ? 0.72 : 0.88;
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
  if ((state.infrastructureIncidents ?? []).some(incident => incident.turn === state.turn && incident.cause === 'enemy-interdiction')) return state;
  const routeId = state.enemyStrategy.threatenedRouteIds[0];
  const chance = clamp(
    0.16
    + state.enemyStrategy.pressure / 260
    + (state.enemyStrategy.doctrine === 'strategic-emergency' ? 0.14 : 0)
    + difficultyAggression[state.difficulty],
    0.08,
    0.76
  );
  if (randomFor(state.seed, state.turn, saltFor(routeId) + 1709) >= chance) return state;
  const severity = Math.round(9 + state.enemyStrategy.pressure / 8 + randomFor(state.seed, state.turn, saltFor(routeId) + 1901) * 10);
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
  const portalFrontline = TERRITORIES[state.portalTerritory].neighbours.some(id => state.territories[id]?.controller === 'enemy');
  const indicators = [
    portalFrontline,
    state.logistics.networkEfficiency < 45,
    state.logistics.starvedFormationIds.length >= Math.max(2, Math.ceil(activeGroups / 2)),
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
    next = appendEvent(next, 'Operational crisis declared: the portal, supply network and remaining formations are under simultaneous pressure.', 'danger');
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
  pressureFor,
  routeThreatScore,
  selectFocusTerritory,
  threatenedRoutes,
  updateOperationalCrisis
};
''')

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
replace_once(
    'src/game/types.ts',
    "export type EnemyOrderType = 'reinforce' | 'reposition' | 'entrench' | 'counterattack' | 'withdraw';",
    "export type EnemyOrderType = 'reinforce' | 'reposition' | 'entrench' | 'counterattack' | 'withdraw' | 'concentrate' | 'interdict';\nexport type EnemyDoctrine = 'containment' | 'counteroffensive' | 'logistics-war' | 'strategic-emergency';"
)
replace_once(
    'src/game/types.ts',
    "  formationId?: string;\n  origin?: string;",
    "  formationId?: string;\n  supportFormationIds?: string[];\n  origin?: string;"
)
replace_once(
    'src/game/types.ts',
    "  kind: 'mobilisation' | 'order' | 'escalation';",
    "  kind: 'mobilisation' | 'order' | 'escalation' | 'strategy';"
)
replace_once(
    'src/game/types.ts',
    "export interface GameState {\n  version: 12;",
    "export interface EnemyStrategyState {\n  doctrine: EnemyDoctrine;\n  pressure: number;\n  momentum: number;\n  focusTerritory?: string;\n  threatenedRouteIds: string[];\n  operationalCrisisTurns: number;\n  lastDoctrineChangeTurn: number;\n}\n\nexport interface GameState {\n  version: 13;"
)
replace_once(
    'src/game/types.ts',
    "  intelligenceReports: IntelligenceReport[];\n  routeStates:",
    "  intelligenceReports: IntelligenceReport[];\n  enemyStrategy: EnemyStrategyState;\n  routeStates:"
)

# ---------------------------------------------------------------------------
# Strategic state creation and migration
# ---------------------------------------------------------------------------
replace_once(
    'src/game/strategic-response.ts',
    "import { normaliseInterdictionState } from './interdiction-missions';",
    "import { normaliseInterdictionState } from './interdiction-missions';\nimport { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';"
)
replace_once(
    'src/game/strategic-response.ts',
    "    enemyOrders: [] as EnemyOrder[],\n    intelligenceReports:",
    "    enemyOrders: [] as EnemyOrder[],\n    enemyStrategy: createEnemyStrategyState(difficulty),\n    intelligenceReports:"
)
replace_once(
    'src/game/strategic-response.ts',
    "  | 'logisticsPriorities';",
    "  | 'logisticsPriorities'\n  | 'enemyStrategy';"
)
replace_once(
    'src/game/strategic-response.ts',
    "  logisticsPriorities?: GameState['logisticsPriorities'];\n};",
    "  logisticsPriorities?: GameState['logisticsPriorities'];\n  enemyStrategy?: GameState['enemyStrategy'];\n};"
)
replace_once(
    'src/game/strategic-response.ts',
    "    version: 12,",
    "    version: 13,"
)
replace_once(
    'src/game/strategic-response.ts',
    "    logisticsPriorities,\n    escalationStage:",
    "    logisticsPriorities,\n    enemyStrategy: normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty),\n    escalationStage:"
)

# ---------------------------------------------------------------------------
# Engine integration, coordinated combat and save migration
# ---------------------------------------------------------------------------
replace_once(
    'src/game/engine.ts',
    "import { completeEnemyOrder, createStrategicState, getPlannedCounterattack, resolveStrategicResponse, upgradeStrategicState } from './strategic-response';",
    "import { completeEnemyOrder, createStrategicState, getPlannedCounterattack, resolveStrategicResponse, upgradeStrategicState } from './strategic-response';\nimport { crisisLimitForDifficulty, resolveEnemyStrategy } from './enemy-strategy';"
)
replace_once(
    'src/game/engine.ts',
    "const SAVE_KEY = 'future-conquest-slice-v0.12';\nconst LEGACY_V11_SAVE_KEY",
    "const SAVE_KEY = 'future-conquest-slice-v0.13';\nconst LEGACY_V12_SAVE_KEY = 'future-conquest-slice-v0.12';\nconst LEGACY_V11_SAVE_KEY"
)
replace_once('src/game/engine.ts', '    version: 12,', '    version: 13,')
replace_once(
    'src/game/engine.ts',
    "    logisticsPriorities: structuredClone(state.logisticsPriorities),\n    infrastructureIncidents:",
    "    logisticsPriorities: structuredClone(state.logisticsPriorities),\n    enemyStrategy: structuredClone(state.enemyStrategy),\n    infrastructureIncidents:"
)
replace_once(
    'src/game/engine.ts',
    "  next = resolveOccupationAndLogistics(next);\n  next = resolveStrategicResponse(next);",
    "  next = resolveOccupationAndLogistics(next);\n  next = resolveEnemyStrategy(next);\n  next = resolveStrategicResponse(next);"
)
replace_once(
    'src/game/engine.ts',
    "  else if (personnel < 1200 || next.territories[next.portalTerritory].controller !== 'player') next = addEvent({ ...next, status: 'defeat' }, 'The expedition has lost operational cohesion or access to the portal.', 'danger');",
    "  else if (personnel < 1200 || next.territories[next.portalTerritory].controller !== 'player' || next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty)) next = addEvent({ ...next, status: 'defeat' }, next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty) ? 'The expedition has remained in operational crisis too long. Command cohesion and portal access can no longer be sustained.' : 'The expedition has lost operational cohesion or access to the portal.', 'danger');"
)

engine = read('src/game/engine.ts')
start = engine.index('function resolveCounterattack(state: GameState, forced = false): GameState {')
end = engine.index('\nexport function endTurn', start)
new_counterattack = r'''function resolveCounterattack(state: GameState, forced = false): GameState {
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
  const available = Object.values(state.enemyFormations).filter(formation => origins.includes(formation.location) && formation.personnel > 250);
  if (!available.length) return plannedCounterattack ? completeEnemyOrder(state, plannedCounterattack.id) : state;
  available.sort((a, b) => (b.personnel + b.armour * 4) - (a.personnel + a.armour * 4));

  const requestedIds = plannedCounterattack
    ? [plannedCounterattack.formationId, ...(plannedCounterattack.supportFormationIds ?? [])].filter((id): id is string => Boolean(id))
    : [];
  const selectedAttackers = requestedIds.length
    ? requestedIds.flatMap(id => {
        const formation = state.enemyFormations[id];
        return formation && available.some(candidate => candidate.id === id) ? [formation] : [];
      })
    : [available[0]];
  const attackers = selectedAttackers.length ? selectedAttackers : [available[0]];
  const defenders = Object.values(state.taskGroups).filter(group => group.location === target);
  const defenderPower = defenders.reduce((sum, group) => sum + group.personnel / 1000 * 4 + deployableArmour(group) / 1000 * 1.5 + (group.status === 'garrison' && group.personnel > 0 ? 2.5 : 0), 0) + state.territories[target].fortification / 7 + 1.5;
  const attackerPower = attackers.reduce((sum, attacker) => (
    sum + (attacker.personnel / 1000 * 3.6 + attacker.armour / 100 * 0.8) * (0.7 + attacker.readiness / 150)
  ), 0) * difficultyRules[state.difficulty].enemy * Math.max(0.88, 1 - (attackers.length - 1) * 0.035);
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
      const combatLosses = Math.min(group.personnel, Math.max(20, Math.round(group.personnel * (0.05 + attackers.length * 0.008))));
      group.personnel -= combatLosses;
      next.woundedPool += Math.round(combatLosses * 0.55);
      if (retreatOptions.length) {
        group.location = retreatOptions[0];
        group.morale = clamp(group.morale - 12 - attackers.length, 5, 100);
        group.status = 'recovering';
        group.order = undefined;
      } else {
        destroyed.push(group.name);
        delete taskGroups[group.id];
      }
    }
    territories[target] = { controller: 'enemy', occupation: 'enemy', legitimacy: 0, resistance: 0, supplied: false, fortification: 8 };
    for (const attacker of attackers) {
      enemyFormations[attacker.id].location = target;
      enemyFormations[attacker.id].readiness = clamp(enemyFormations[attacker.id].readiness - 7 - attackers.length, 15, 100);
    }
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
    next = addEvent(next, `${attackers.length} enemy formation${attackers.length === 1 ? '' : 's'} retook ${TERRITORIES[target].centre}. ${retreatText}`, 'danger');
  } else {
    let totalLosses = 0;
    for (const attacker of attackers) {
      const losses = Math.max(25, Math.round(attacker.personnel * (0.034 + attackers.length * 0.004)));
      enemyFormations[attacker.id].personnel = Math.max(0, enemyFormations[attacker.id].personnel - losses);
      enemyFormations[attacker.id].readiness = clamp(enemyFormations[attacker.id].readiness - 6, 15, 100);
      totalLosses += losses;
    }
    for (const defender of defenders) {
      const group = taskGroups[defender.id];
      const defenderLosses = Math.max(4, Math.round(group.personnel * 0.009 * Math.max(1, attackers.length * 0.8)));
      group.personnel -= defenderLosses;
      next.woundedPool += Math.round(defenderLosses * 0.6);
    }
    next = addEvent(next, `${TERRITORIES[target].centre} repelled a coordinated enemy counterattack. The attacking force lost roughly ${totalLosses} personnel.`, 'good');
  }
  if (plannedCounterattack) next = completeEnemyOrder(next, plannedCounterattack.id);
  return pruneOperations(refreshSupply(next));
}
'''
write('src/game/engine.ts', engine[:start] + new_counterattack + engine[end:])

# Legacy type definitions and localStorage loader.
replace_once(
    'src/game/engine.ts',
    "type PriorityField = 'logisticsPriorities';\n\ntype LegacyV11GameState",
    "type PriorityField = 'logisticsPriorities';\ntype StrategyField = 'enemyStrategy';\n\ntype LegacyV12GameState = Omit<GameState, 'version' | StrategyField> & { version: 12 };\ntype LegacyV11GameState"
)
engine = read('src/game/engine.ts').replace(' | PriorityField> & { version:', ' | PriorityField | StrategyField> & { version:')
engine = engine.replace(" | PriorityField> & {\n  version: 2;", " | PriorityField | StrategyField> & {\n  version: 2;")
write('src/game/engine.ts', engine)
replace_once(
    'src/game/engine.ts',
    "      parsed.version === 12\n      && parsed.taskGroups",
    "      parsed.version === 13\n      && parsed.taskGroups"
)
replace_once(
    'src/game/engine.ts',
    "      && parsed.logisticsPriorities\n    ) return upgradeStrategicState(parsed as GameState);\n  }\n\n  const v11",
    "      && parsed.logisticsPriorities\n      && parsed.enemyStrategy\n    ) return upgradeStrategicState(parsed as GameState);\n  }\n\n  const v12 = localStorage.getItem(LEGACY_V12_SAVE_KEY);\n  if (v12) {\n    const parsed = JSON.parse(v12) as Partial<LegacyV12GameState>;\n    if (\n      parsed.version === 12\n      && parsed.taskGroups\n      && parsed.enemyFormations\n      && parsed.operations\n      && parsed.mobilisations\n      && parsed.enemyOrders\n      && parsed.intelligenceReports\n      && parsed.routeStates\n      && parsed.logistics\n      && parsed.infrastructureIncidents\n      && parsed.engineeringProjects\n      && parsed.interdictionMissions\n      && parsed.logisticsPriorities\n    ) return upgradeStrategicState(parsed as LegacyV12GameState);\n  }\n\n  const v11"
)

# ---------------------------------------------------------------------------
# Persistence controller version 13
# ---------------------------------------------------------------------------
persistence = read('src/game/persistence.ts')
persistence = persistence.replace("export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.12';", "export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.13';")
persistence = persistence.replace("export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.12-metadata';", "export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.13-metadata';")
persistence = persistence.replace("export const LEGACY_V11_SAVE_KEY", "export const LEGACY_V12_SAVE_KEY = 'future-conquest-slice-v0.12';\nexport const LEGACY_V11_SAVE_KEY", 1)
persistence = persistence.replace('  saveVersion: 12;', '  saveVersion: 13;')
persistence = persistence.replace("source: 'v12' | 'v11'", "source: 'v13' | 'v12' | 'v11'")
persistence = persistence.replace("type PriorityField = 'logisticsPriorities';", "type PriorityField = 'logisticsPriorities';\ntype StrategyField = 'enemyStrategy';")
persistence = persistence.replace("type LegacyV11State", "type LegacyV12State = Omit<GameState, 'version' | StrategyField> & { version: 12 };\ntype LegacyV11State", 1)
persistence = persistence.replace(' | PriorityField> & { version:', ' | PriorityField | StrategyField> & { version:')
persistence = persistence.replace(" | PriorityField> & {\n  version: 2;", " | PriorityField | StrategyField> & {\n  version: 2;")
persistence = persistence.replace('function isV12State(value: unknown): value is GameState {', 'function isV13State(value: unknown): value is GameState {', 1)
persistence = persistence.replace('    && value.version === 12\n    && hasStrategicCollections(value)', '    && value.version === 13\n    && hasStrategicCollections(value)', 1)
persistence = persistence.replace('    && isRecord(value.logisticsPriorities)\n    && Array.isArray(value.infrastructureIncidents)', '    && isRecord(value.logisticsPriorities)\n    && isRecord(value.enemyStrategy)\n    && Array.isArray(value.infrastructureIncidents)', 1)
needle = "function isV11State(value: unknown): value is LegacyV11State {"
insert = r'''function isV12State(value: unknown): value is LegacyV12State {
  return hasCoreCampaignState(value)
    && value.version === 12
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics)
    && isRecord(value.logisticsPriorities)
    && Array.isArray(value.infrastructureIncidents)
    && Array.isArray(value.engineeringProjects)
    && Array.isArray(value.interdictionMissions);
}

'''
if needle not in persistence:
    raise RuntimeError('persistence v11 guard not found')
persistence = persistence.replace(needle, insert + needle, 1)
persistence = persistence.replace('    saveVersion: 12,', '    saveVersion: 13,')
persistence = persistence.replace('    && value.saveVersion === 12', '    && value.saveVersion === 13')
persistence = persistence.replace("function inspectRaw(storage: StorageReader, raw: string, source: 'v12' |", "function inspectRaw(storage: StorageReader, raw: string, source: 'v13' | 'v12' |")
persistence = persistence.replace("    if (source === 'v12' && isV12State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }", "    if (source === 'v13' && isV13State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v12' && isV12State(parsed)) {\n      const state = upgradeStrategicState(parsed);\n      return { ok: true, state, metadata: createSaveMetadata(state, null), source };\n    }")
persistence = persistence.replace("  if (current) return inspectRaw(storage, current, 'v12');", "  if (current) return inspectRaw(storage, current, 'v13');")
persistence = persistence.replace("  const v11 = readRaw(storage, LEGACY_V11_SAVE_KEY);", "  const v12 = readRaw(storage, LEGACY_V12_SAVE_KEY);\n  if (typeof v12 !== 'string' && v12 !== null) return v12;\n  if (v12) return inspectRaw(storage, v12, 'v12');\n\n  const v11 = readRaw(storage, LEGACY_V11_SAVE_KEY);", 1)
persistence = persistence.replace('if (!isV12State(parsed))', 'if (!isV13State(parsed))')
write('src/game/persistence.ts', persistence)

# ---------------------------------------------------------------------------
# Intelligence UI and styling
# ---------------------------------------------------------------------------
replace_once(
    'src/App.tsx',
    'PHASE VIII-B4D / LOGISTICS PRIORITIES',
    'PHASE VIII-C / ENEMY STRATEGY AND CAMPAIGN BALANCE'
)
replace_once(
    'src/App.tsx',
    "</section>\n            <section className=\"view-panel enemy-summary-panel\">",
    "</section>\n            <section className={`view-panel enemy-strategy-panel ${state.enemyStrategy.doctrine}`}>\n              <div className=\"view-panel-heading\"><p className=\"panel-label\">ENEMY THEATRE COMMAND</p><strong>{Math.round(state.enemyStrategy.pressure)}%</strong></div>\n              <h3>{state.enemyStrategy.doctrine.replace('-', ' ')}</h3>\n              <div className=\"enemy-strategy-meter\"><i style={{ width: `${state.enemyStrategy.pressure}%` }} /></div>\n              <dl>\n                <div><dt>Operational focus</dt><dd>{state.enemyStrategy.focusTerritory ? TERRITORIES[state.enemyStrategy.focusTerritory].centre : 'No single focus'}</dd></div>\n                <div><dt>Invasion momentum</dt><dd>{Math.round(state.enemyStrategy.momentum)}</dd></div>\n                <div><dt>Threatened corridors</dt><dd>{state.enemyStrategy.threatenedRouteIds.length}</dd></div>\n                <div><dt>Operational crisis</dt><dd>{state.enemyStrategy.operationalCrisisTurns} / {state.difficulty === 'story' ? 5 : state.difficulty === 'hard' ? 3 : 4} days</dd></div>\n              </dl>\n              <p>Doctrine reacts to frontline strength, logistics weakness, portal exposure and campaign momentum. Stabilising those conditions reduces pressure and crisis risk.</p>\n            </section>\n            <section className=\"view-panel enemy-summary-panel\">"
)
replace_once(
    'src/App.tsx',
    "<div><dt>Status</dt><dd>{state.status}</dd></div><div><dt>Escalation stage</dt>",
    "<div><dt>Status</dt><dd>{state.status}</dd></div><div><dt>Enemy doctrine</dt><dd>{state.enemyStrategy.doctrine}</dd></div><div><dt>Operational crisis</dt><dd>{state.enemyStrategy.operationalCrisisTurns}</dd></div><div><dt>Escalation stage</dt>"
)
replace_once(
    'src/main.tsx',
    "import './strategic-response.css';",
    "import './strategic-response.css';\nimport './enemy-strategy.css';"
)
write('src/enemy-strategy.css', r'''.enemy-strategy-panel {
  display: grid;
  align-content: start;
  gap: 10px;
  border-color: #42616d;
  background: linear-gradient(145deg, rgba(18, 47, 59, .98), rgba(10, 28, 37, .98));
}

.enemy-strategy-panel h3 {
  margin: 0;
  color: #e9f5f7;
  font: 700 27px Barlow Condensed, sans-serif;
  letter-spacing: .05em;
  text-transform: uppercase;
}

.enemy-strategy-panel > p {
  margin: 0;
  color: #8fa9b4;
  font: 500 10px/1.55 IBM Plex Mono, monospace;
}

.enemy-strategy-panel.counteroffensive,
.enemy-strategy-panel.logistics-war {
  border-color: #b47750;
}

.enemy-strategy-panel.strategic-emergency {
  border-color: #d85e56;
  box-shadow: inset 0 0 30px rgba(181, 58, 50, .13);
}

.enemy-strategy-meter {
  height: 7px;
  overflow: hidden;
  border: 1px solid #35515e;
  background: #071920;
}

.enemy-strategy-meter i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #4f9e9a, #d57b50 68%, #e45850);
}

.enemy-strategy-panel dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  background: #294552;
}

.enemy-strategy-panel dl > div {
  display: grid;
  gap: 4px;
  padding: 10px;
  background: #0d222c;
}

.enemy-strategy-panel dt {
  color: #708b96;
  font: 500 8px IBM Plex Mono, monospace;
  text-transform: uppercase;
}

.enemy-strategy-panel dd {
  margin: 0;
  color: #edf8fa;
  font: 600 14px Barlow Condensed, sans-serif;
  text-transform: uppercase;
}

@media (max-width: 540px) {
  .enemy-strategy-panel dl {
    grid-template-columns: minmax(0, 1fr);
  }
}
''')

# ---------------------------------------------------------------------------
# Regression tests
# ---------------------------------------------------------------------------
write('tests/enemy-strategy-viii-c.test.cjs', r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame, endTurn, __testOnly: engineTest } = require('../.test-dist/engine.js');
const {
  assessEnemyStrategy,
  createEnemyStrategyState,
  crisisLimitForDifficulty,
  resolveEnemyStrategy,
  __testOnly
} = require('../.test-dist/enemy-strategy.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

function exposeFront(state) {
  const origin = state.portalTerritory;
  const target = Object.keys(state.territories).find(id => id !== origin && state.territories[id].controller === 'enemy' && require('../.test-dist/data.js').TERRITORIES[origin].neighbours.includes(id));
  assert.ok(target);
  state.territories[target].controller = 'player';
  state.territories[target].occupation = 'contested';
  state.territories[target].supplied = true;
  for (const group of Object.values(state.taskGroups)) group.location = target;
  return target;
}

test('new campaigns initialise version 13 enemy strategy state', () => {
  const state = newGame(301, 'standard');
  assert.equal(state.version, 13);
  assert.deepEqual(state.enemyStrategy, createEnemyStrategyState('standard'));
  assert.equal(crisisLimitForDifficulty('story'), 5);
  assert.equal(crisisLimitForDifficulty('standard'), 4);
  assert.equal(crisisLimitForDifficulty('hard'), 3);
});

test('strategy assessment escalates into logistics war when the network is failing', () => {
  const state = newGame(302, 'standard');
  state.escalation = 48;
  state.escalationStage = 3;
  state.logistics.networkEfficiency = 31;
  state.logistics.bottleneckRouteIds = Object.keys(state.logistics.routeFlows).slice(0, 2);
  state.logistics.starvedFormationIds = Object.keys(state.taskGroups).slice(0, 2);
  const assessment = assessEnemyStrategy(state);
  assert.ok(assessment.doctrine === 'logistics-war' || assessment.doctrine === 'strategic-emergency');
  assert.ok(assessment.pressure >= 45);
  assert.ok(assessment.threatenedRouteIds.length >= 1);
});

test('counteroffensive doctrine creates a warned multi-formation plan when sufficient enemy power is adjacent', () => {
  const state = newGame(303, 'hard');
  const target = exposeFront(state);
  state.escalation = 60;
  state.escalationStage = 4;
  for (const group of Object.values(state.taskGroups)) {
    group.personnel = 200;
    group.functionalArmour = 100;
    group.morale = 45;
  }
  const next = resolveEnemyStrategy(state);
  const order = next.enemyOrders.find(candidate => candidate.type === 'counterattack' && candidate.status === 'planned');
  assert.ok(order);
  assert.equal(order.target, target);
  assert.ok((order.supportFormationIds ?? []).length >= 1);
  assert.equal(order.executeTurn, state.turn + 1);
  assert.ok(next.intelligenceReports.some(report => report.kind === 'strategy'));
});

test('coordinated counterattack resolution uses supporting formations', () => {
  let state = newGame(304, 'hard');
  const target = exposeFront(state);
  state.turn = 5;
  state.escalation = 70;
  state.escalationStage = 4;
  const adjacent = Object.values(state.enemyFormations).filter(formation => require('../.test-dist/data.js').TERRITORIES[target].neighbours.includes(formation.location));
  assert.ok(adjacent.length >= 2);
  state.enemyOrders = [{
    id: 'EO-TEST-COORDINATED',
    turn: 4,
    type: 'counterattack',
    formationId: adjacent[0].id,
    supportFormationIds: [adjacent[1].id],
    origin: adjacent[0].location,
    target,
    executeTurn: 5,
    status: 'planned',
    priority: 110,
    summary: 'Test coordinated attack'
  }];
  for (const group of Object.values(state.taskGroups)) {
    group.personnel = 1;
    group.functionalArmour = 0;
    group.morale = 5;
  }
  const next = engineTest.resolveCounterattack(state);
  assert.equal(next.enemyOrders.find(order => order.id === 'EO-TEST-COORDINATED').status, 'completed');
  assert.equal(next.territories[target].controller, 'enemy');
  assert.equal(next.enemyFormations[adjacent[0].id].location, target);
  assert.equal(next.enemyFormations[adjacent[1].id].location, target);
});

test('operational crisis rises only under several simultaneous failures and can recover', () => {
  let state = newGame(305, 'standard');
  exposeFront(state);
  state.enemyStrategy.pressure = 90;
  state.logistics.networkEfficiency = 20;
  state.logistics.starvedFormationIds = Object.keys(state.taskGroups);
  for (const group of Object.values(state.taskGroups)) group.personnel = 600;
  const crisis = __testOnly.updateOperationalCrisis(state);
  assert.equal(crisis.enemyStrategy.operationalCrisisTurns, 1);
  crisis.logistics.networkEfficiency = 100;
  crisis.logistics.starvedFormationIds = [];
  for (const group of Object.values(crisis.taskGroups)) group.personnel = 2500;
  const recovered = __testOnly.updateOperationalCrisis(crisis);
  assert.equal(recovered.enemyStrategy.operationalCrisisTurns, 0);
});

test('version 12 campaigns migrate to version 13 with normalised strategy state', () => {
  const current = newGame(306, 'standard');
  const { enemyStrategy, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 12 });
  assert.equal(migrated.version, 13);
  assert.equal(migrated.enemyStrategy.doctrine, 'containment');
});

test('the interface exposes Phase VIII-C enemy strategy and crisis information', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  const module = fs.readFileSync('src/game/enemy-strategy.ts', 'utf8');
  assert.match(app, /PHASE VIII-C \/ ENEMY STRATEGY AND CAMPAIGN BALANCE/);
  assert.match(app, /ENEMY THEATRE COMMAND/);
  assert.match(app, /Operational crisis/);
  assert.match(module, /Coordinated counterattack forming/);
  assert.match(module, /applyInfrastructureDamage/);
  assert.match(main, /enemy-strategy\.css/);
});
''')

# Existing current-version assertions now resolve to the latest campaign schema.
for path in Path('tests').glob('*.test.cjs'):
    content = path.read_text()
    content = content.replace('assert.equal(state.version, 12);', 'assert.equal(state.version, 13);')
    content = content.replace('assert.equal(migrated.version, 12);', 'assert.equal(migrated.version, 13);')
    content = content.replace('assert.equal(result.state.version, 12);', 'assert.equal(result.state.version, 13);')
    content = content.replace('assert.equal(metadata.saveVersion, 12);', 'assert.equal(metadata.saveVersion, 13);')
    content = content.replace("version 12 save is inspected", "version 13 save is inspected")
    content = content.replace("version 12 priority state", "version 13 priority state")
    path.write_text(content)
