import { SLICE_IDS, TERRITORIES } from './data';
import { normaliseRouteStates } from './strategic-network';
import { normaliseTaskGroupOrderRoutes } from './route-movement';
import { refreshSupplyNetwork } from './supply-network';
import { normaliseInfrastructureIncidents } from './infrastructure-disruption';
import { normaliseEngineeringState } from './engineering-projects';
import { normaliseInterdictionState } from './interdiction-missions';
import type {
  Difficulty,
  EnemyFormation,
  EnemyOrder,
  EscalationStageId,
  GameEvent,
  GameState,
  IntelligenceConfidence,
  IntelligenceReport,
  MobilisationProject
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

export interface EscalationStageDefinition {
  id: EscalationStageId;
  threshold: number;
  label: string;
  description: string;
  nextThreshold: number | null;
}

export const ESCALATION_STAGES: EscalationStageDefinition[] = [
  {
    id: 1,
    threshold: 0,
    label: 'Local response',
    description: 'Police, local security forces and nearby military commands are reacting independently.',
    nextThreshold: 15
  },
  {
    id: 2,
    threshold: 15,
    label: 'National mobilisation',
    description: 'National reserves are activating and defensive formations are concentrating around threatened regions.',
    nextThreshold: 30
  },
  {
    id: 3,
    threshold: 30,
    label: 'Alliance coordination',
    description: 'Allied intelligence, equipment and operational planning are being combined against the invasion.',
    nextThreshold: 50
  },
  {
    id: 4,
    threshold: 50,
    label: 'Coalition intervention',
    description: 'External coalition formations are entering the theatre under a shared command structure.',
    nextThreshold: 72
  },
  {
    id: 5,
    threshold: 72,
    label: 'Strategic emergency',
    description: 'The wider world is committing major forces and considering catastrophic-response options.',
    nextThreshold: null
  }
];

interface MobilisationTemplate {
  id: string;
  stage: EscalationStageId;
  name: string;
  source: string;
  personnel: number;
  armour: number;
  readiness: number;
  delay: number;
}

const MOBILISATION_TEMPLATES: MobilisationTemplate[] = [
  {
    id: 'NATIONAL-RESERVE',
    stage: 2,
    name: 'National Reserve Brigade',
    source: 'National mobilisation',
    personnel: 1650,
    armour: 90,
    readiness: 66,
    delay: 3
  },
  {
    id: 'ALLIED-ARMOURED',
    stage: 3,
    name: 'Allied Armoured Group',
    source: 'Alliance coordination',
    personnel: 2200,
    armour: 230,
    readiness: 74,
    delay: 4
  },
  {
    id: 'COALITION-DIVISION',
    stage: 4,
    name: 'Coalition Intervention Division',
    source: 'Coalition intervention',
    personnel: 3250,
    armour: 370,
    readiness: 82,
    delay: 4
  },
  {
    id: 'STRATEGIC-CORPS',
    stage: 5,
    name: 'Strategic Reaction Corps',
    source: 'Strategic emergency',
    personnel: 4300,
    armour: 500,
    readiness: 88,
    delay: 3
  }
];

const difficultyScale: Record<Difficulty, number> = {
  story: 0.82,
  standard: 1,
  hard: 1.18
};

const mobilisationDelay: Record<Difficulty, number> = {
  story: 1,
  standard: 0,
  hard: -1
};

const initialPool: Record<Difficulty, number> = {
  story: 9000,
  standard: 13000,
  hard: 17000
};

export function getEscalationStage(value: number): EscalationStageDefinition {
  return [...ESCALATION_STAGES].reverse().find(stage => value >= stage.threshold) ?? ESCALATION_STAGES[0];
}

export function createStrategicState(seed: number, difficulty: Difficulty, escalation: number) {
  const stage = getEscalationStage(escalation);
  return {
    escalationStage: stage.id,
    mobilisationPool: initialPool[difficulty],
    mobilisations: [] as MobilisationProject[],
    enemyOrders: [] as EnemyOrder[],
    intelligenceReports: [{
      id: `INT-1-${seed}-INITIAL`,
      turn: 1,
      kind: 'escalation' as const,
      title: 'Fragmented regional response',
      detail: 'Local commands are reacting independently. No coordinated theatre plan has been detected.',
      confidence: 'high' as const
    }]
  };
}

type StrategicField =
  | 'escalationStage'
  | 'mobilisationPool'
  | 'mobilisations'
  | 'enemyOrders'
  | 'intelligenceReports'
  | 'routeStates'
  | 'logistics'
  | 'infrastructureIncidents'
  | 'engineeringProjects'
  | 'interdictionMissions';

type LegacyStrategicState = Omit<GameState, 'version' | StrategicField> & {
  version: number;
  escalationStage?: EscalationStageId;
  mobilisationPool?: number;
  mobilisations?: MobilisationProject[];
  enemyOrders?: EnemyOrder[];
  intelligenceReports?: IntelligenceReport[];
  routeStates?: GameState['routeStates'];
  logistics?: GameState['logistics'];
  infrastructureIncidents?: GameState['infrastructureIncidents'];
  engineeringProjects?: GameState['engineeringProjects'];
  interdictionMissions?: GameState['interdictionMissions'];
};

export function upgradeStrategicState(state: LegacyStrategicState | GameState): GameState {
  const defaults = createStrategicState(state.seed, state.difficulty, state.escalation);
  const previousVersion = state.version;
  const routeStates = normaliseRouteStates(state.routeStates);
  const routedTaskGroups = normaliseTaskGroupOrderRoutes(state.taskGroups, routeStates, previousVersion >= 7);
  const engineering = normaliseEngineeringState(state.engineeringProjects, routedTaskGroups, routeStates);
  const interdiction = normaliseInterdictionState(state.interdictionMissions, engineering.taskGroups, { territories: state.territories, routeStates });
  const upgraded = {
    ...state,
    version: 11,
    taskGroups: interdiction.taskGroups,
    routeStates,
    infrastructureIncidents: normaliseInfrastructureIncidents(state.infrastructureIncidents),
    engineeringProjects: engineering.projects,
    interdictionMissions: interdiction.missions,
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
  return refreshSupplyNetwork(upgraded);
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

function confidenceFor(state: GameState, salt: number): IntelligenceConfidence {
  const score = 90 - (state.escalationStage - 1) * 7 + randomFor(state.seed, state.turn, salt) * 12;
  return score >= 78 ? 'high' : score >= 58 ? 'moderate' : 'low';
}

function estimateRange(value: number, confidence: IntelligenceConfidence): [number, number] {
  const spread = confidence === 'high' ? 0.12 : confidence === 'moderate' ? 0.24 : 0.38;
  return [
    Math.max(0, Math.round(value * (1 - spread) / 50) * 50),
    Math.max(50, Math.round(value * (1 + spread) / 50) * 50)
  ];
}

function addReport(
  state: GameState,
  report: Omit<IntelligenceReport, 'id' | 'turn'>
): GameState {
  const id = `INT-${state.turn}-${state.intelligenceReports.length + 1}-${saltFor(report.title)}`;
  const intelligenceReports = [{ id, turn: state.turn, ...report }, ...state.intelligenceReports].slice(0, 40);
  return { ...state, intelligenceReports };
}

function chooseEntryTerritory(state: GameState): string | undefined {
  return SLICE_IDS
    .filter(id => state.territories[id]?.controller === 'enemy')
    .sort((first, second) => {
      const firstFront = TERRITORIES[first].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player') ? 1 : 0;
      const secondFront = TERRITORIES[second].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player') ? 1 : 0;
      return firstFront - secondFront || TERRITORIES[second].supply - TERRITORIES[first].supply;
    })[0];
}

function calculateEscalation(state: GameState): number {
  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const unsecured = Object.values(state.territories).filter(territory => territory.occupation === 'unsecured').length;
  const recentCaptures = Object.values(state.territories).filter(territory => territory.capturedTurn === state.turn).length;
  const strategicCaptures = SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'player' && TERRITORIES[id].supply >= 7
  )).length;
  const floor = 3 + Math.max(0, controlled - 1) * 3.35 + Math.max(0, state.turn - 1) * 0.42;
  const dailyPressure = 0.22
    + Object.keys(state.operations).length * 0.38
    + recentCaptures * 1.35
    + strategicCaptures * 0.08
    + unsecured * 0.06;
  return clamp(Math.max(floor, state.escalation + dailyPressure), 0, 100);
}

function scheduleMobilisations(state: GameState): GameState {
  const mobilisations = structuredClone(state.mobilisations);
  let mobilisationPool = state.mobilisationPool;
  let next = { ...state, mobilisations, mobilisationPool };

  for (const template of MOBILISATION_TEMPLATES) {
    if (state.escalationStage < template.stage || mobilisations.some(project => project.id === template.id)) continue;
    const scale = difficultyScale[state.difficulty];
    const personnel = Math.min(mobilisationPool, Math.round(template.personnel * scale));
    if (personnel < 400) continue;
    const project: MobilisationProject = {
      id: template.id,
      name: template.name,
      source: template.source,
      stage: template.stage,
      personnel,
      armour: Math.round(template.armour * scale),
      readiness: template.readiness,
      arrivalTurn: state.turn + Math.max(2, template.delay + mobilisationDelay[state.difficulty]),
      status: 'preparing',
      entryTerritory: chooseEntryTerritory(state)
    };
    mobilisations.push(project);
    mobilisationPool = Math.max(0, mobilisationPool - personnel);
    next = { ...next, mobilisations, mobilisationPool };
    next = appendEvent(
      next,
      `${project.source} has begun. ${project.name} is expected within ${project.arrivalTurn - state.turn} days.`,
      'warning'
    );
    const confidence = confidenceFor(next, saltFor(project.id));
    const [estimatedMin, estimatedMax] = estimateRange(project.personnel, confidence);
    next = addReport(next, {
      kind: 'mobilisation',
      title: `${project.name} mobilising`,
      detail: `${project.source} is assembling approximately ${project.personnel.toLocaleString('en-GB')} personnel for theatre deployment.`,
      confidence,
      estimatedMin,
      estimatedMax,
      territoryId: project.entryTerritory
    });
  }

  return next;
}

function deployMobilisations(state: GameState): GameState {
  const mobilisations = structuredClone(state.mobilisations);
  const enemyFormations = structuredClone(state.enemyFormations);
  let next: GameState = { ...state, mobilisations, enemyFormations };

  for (const project of mobilisations) {
    if (project.status !== 'preparing' || project.arrivalTurn > state.turn) continue;
    const entry = project.entryTerritory && state.territories[project.entryTerritory]?.controller === 'enemy'
      ? project.entryTerritory
      : chooseEntryTerritory(state);
    if (!entry) continue;
    const formationId = `EF-M-${project.id}`;
    if (!enemyFormations[formationId]) {
      enemyFormations[formationId] = {
        id: formationId,
        name: project.name,
        location: entry,
        personnel: project.personnel,
        armour: project.armour,
        readiness: project.readiness,
        entrenchment: 8
      };
    }
    project.status = 'deployed';
    project.entryTerritory = entry;
    next = { ...next, mobilisations, enemyFormations };
    next = appendEvent(next, `${project.name} deployed to ${TERRITORIES[entry].centre}.`, 'danger');
    const [estimatedMin, estimatedMax] = estimateRange(project.personnel, 'high');
    next = addReport(next, {
      kind: 'mobilisation',
      title: `${project.name} entered the theatre`,
      detail: `The formation has reached ${TERRITORIES[entry].centre} and is available to the enemy command.`,
      confidence: 'high',
      estimatedMin,
      estimatedMax,
      territoryId: entry
    });
  }

  return next;
}

function frontlineEnemyTerritories(state: GameState): string[] {
  return SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'enemy'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player')
  ));
}

function frontlinePlayerTerritories(state: GameState): string[] {
  return SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'player'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'enemy')
  ));
}

function enemyPowerAt(state: GameState, territoryId: string): number {
  return Object.values(state.enemyFormations)
    .filter(formation => formation.location === territoryId && formation.personnel > 0)
    .reduce((sum, formation) => sum + formation.personnel + formation.armour * 4 + formation.entrenchment * 18, 0);
}

function playerPowerAt(state: GameState, territoryId: string): number {
  return Object.values(state.taskGroups)
    .filter(group => group.location === territoryId && group.personnel > 0)
    .reduce((sum, group) => sum + group.personnel + Math.min(group.functionalArmour, group.personnel) * 0.35, 0)
    + state.territories[territoryId].fortification * 70;
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

function orderReport(state: GameState, order: EnemyOrder, formation?: EnemyFormation): GameState {
  const confidence = confidenceFor(state, saltFor(order.id));
  const [estimatedMin, estimatedMax] = estimateRange(formation?.personnel ?? 0, confidence);
  return addReport(state, {
    kind: 'order',
    title: order.summary,
    detail: order.type === 'counterattack'
      ? `Enemy communications indicate preparations against ${TERRITORIES[order.target].centre}. The operation is assessed for day ${order.executeTurn ?? state.turn}.`
      : `Enemy activity suggests a ${order.type} order affecting ${TERRITORIES[order.target].centre}.`,
    confidence,
    estimatedMin: formation ? estimatedMin : undefined,
    estimatedMax: formation ? estimatedMax : undefined,
    territoryId: order.target
  });
}

function planEnemyOrders(state: GameState): GameState {
  const enemyFormations = structuredClone(state.enemyFormations);
  const retainedOrders = state.enemyOrders
    .filter(order => order.status !== 'completed' || state.turn - order.turn <= 3)
    .slice(0, 12);
  const planned: EnemyOrder[] = [];
  let next: GameState = { ...state, enemyFormations, enemyOrders: retainedOrders };
  const enemyFront = frontlineEnemyTerritories(next);
  const playerFront = frontlinePlayerTerritories(next);
  const orderLimit = next.escalationStage === 1 ? 1 : next.escalationStage <= 3 ? 2 : 3;
  const availableOrderSlots = Math.max(0, orderLimit - retainedOrders.filter(order => order.status !== 'completed').length);

  const weakFormation = Object.values(enemyFormations)
    .filter(formation => enemyFront.includes(formation.location) && formation.personnel > 0 && formation.personnel < 500)
    .sort((first, second) => first.personnel - second.personnel)[0];
  if (weakFormation && planned.length < availableOrderSlots) {
    const retreat = TERRITORIES[weakFormation.location].neighbours
      .filter(id => next.territories[id]?.controller === 'enemy')
      .sort((first, second) => TERRITORIES[second].supply - TERRITORIES[first].supply)[0];
    if (retreat) {
      const origin = weakFormation.location;
      weakFormation.location = retreat;
      weakFormation.readiness = clamp(weakFormation.readiness - 4, 15, 100);
      planned.push({
        id: `EO-${next.turn}-WITHDRAW-${weakFormation.id}`,
        turn: next.turn,
        type: 'withdraw',
        formationId: weakFormation.id,
        origin,
        target: retreat,
        status: 'completed',
        priority: 90,
        summary: `${weakFormation.name} withdrew towards ${TERRITORIES[retreat].centre}`
      });
    }
  }

  const pendingCounterattack = retainedOrders.some(order => order.type === 'counterattack' && order.status !== 'completed');
  if (next.escalationStage >= 2 && playerFront.length && !pendingCounterattack && planned.length < availableOrderSlots) {
    const target = [...playerFront].sort((first, second) => playerPowerAt(next, first) - playerPowerAt(next, second))[0];
    const formation = Object.values(enemyFormations)
      .filter(candidate => candidate.personnel > 250 && TERRITORIES[target].neighbours.includes(candidate.location))
      .sort((first, second) => (second.personnel + second.armour * 4) - (first.personnel + first.armour * 4))[0];
    if (formation) {
      planned.push({
        id: `EO-${next.turn}-COUNTER-${formation.id}-${target}`,
        turn: next.turn,
        type: 'counterattack',
        formationId: formation.id,
        origin: formation.location,
        target,
        executeTurn: next.turn + 1,
        status: 'planned',
        priority: 100,
        summary: `Counterattack preparations detected against ${TERRITORIES[target].centre}`
      });
    }
  }

  if (enemyFront.length && planned.length < availableOrderSlots) {
    const target = [...enemyFront].sort((first, second) => enemyPowerAt(next, first) - enemyPowerAt(next, second))[0];
    const formation = Object.values(enemyFormations)
      .filter(candidate => candidate.location === target && candidate.personnel > 0)
      .sort((first, second) => first.entrenchment - second.entrenchment)[0];
    if (formation) {
      formation.entrenchment = clamp(formation.entrenchment + 2 + next.escalationStage * 1.2, 0, 75);
      formation.readiness = clamp(formation.readiness + 1.5, 15, 100);
      planned.push({
        id: `EO-${next.turn}-ENTRENCH-${formation.id}`,
        turn: next.turn,
        type: 'entrench',
        formationId: formation.id,
        target,
        status: 'completed',
        priority: 60,
        summary: `${formation.name} strengthened ${TERRITORIES[target].centre}`
      });
    }
  }

  if (enemyFront.length && planned.length < availableOrderSlots) {
    const target = [...enemyFront].sort((first, second) => enemyPowerAt(next, first) - enemyPowerAt(next, second))[0];
    const rear = Object.values(enemyFormations)
      .filter(candidate => candidate.personnel > 500 && !enemyFront.includes(candidate.location))
      .sort((first, second) => (second.personnel + second.armour * 4) - (first.personnel + first.armour * 4))[0];
    if (rear) {
      const origin = rear.location;
      const step = nextEnemyStep(next, origin, target);
      if (step && step !== origin) {
        rear.location = step;
        rear.readiness = clamp(rear.readiness - 3, 15, 100);
        planned.push({
          id: `EO-${next.turn}-REPOSITION-${rear.id}`,
          turn: next.turn,
          type: 'reposition',
          formationId: rear.id,
          origin,
          target: step,
          status: 'completed',
          priority: 70,
          summary: `${rear.name} repositioning towards ${TERRITORIES[target].centre}`
        });
      }
    }
  }

  next = { ...next, enemyFormations, enemyOrders: [...planned, ...retainedOrders].slice(0, 18) };
  for (const order of planned) {
    const formation = order.formationId ? enemyFormations[order.formationId] : undefined;
    next = orderReport(next, order, formation);
  }
  return next;
}

export function resolveStrategicResponse(state: GameState): GameState {
  const previousStage = state.escalationStage;
  const escalation = calculateEscalation(state);
  const stage = getEscalationStage(escalation);
  let next: GameState = {
    ...state,
    escalation,
    escalationStage: stage.id,
    mobilisations: structuredClone(state.mobilisations),
    enemyOrders: structuredClone(state.enemyOrders),
    intelligenceReports: [...state.intelligenceReports]
  };

  if (stage.id > previousStage) {
    next = appendEvent(next, `Escalation Stage ${stage.id}: ${stage.label}. ${stage.description}`, 'danger');
    next = addReport(next, {
      kind: 'escalation',
      title: `Escalation Stage ${stage.id}: ${stage.label}`,
      detail: stage.description,
      confidence: 'high'
    });
  }

  next = scheduleMobilisations(next);
  next = deployMobilisations(next);
  next = planEnemyOrders(next);
  return next;
}

export function getPlannedCounterattack(state: GameState): EnemyOrder | undefined {
  return [...state.enemyOrders]
    .sort((first, second) => (first.executeTurn ?? first.turn) - (second.executeTurn ?? second.turn))
    .find(order => (
      order.type === 'counterattack'
      && (order.status === 'planned' || order.status === 'executing')
      && (order.executeTurn ?? order.turn) <= state.turn
    ));
}

export function completeEnemyOrder(state: GameState, orderId: string): GameState {
  const enemyOrders = state.enemyOrders.map(order => (
    order.id === orderId ? { ...order, status: 'completed' as const } : order
  ));
  return { ...state, enemyOrders };
}

export const __testOnly = {
  calculateEscalation,
  chooseEntryTerritory,
  deployMobilisations,
  planEnemyOrders,
  scheduleMobilisations
};
