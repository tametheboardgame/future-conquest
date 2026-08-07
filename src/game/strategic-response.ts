import { SLICE_IDS, TERRITORIES } from './data';
import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';
import type {
  Difficulty,
  EnemyFormation,
  EnemyOrder,
  EscalationStage,
  GameEvent,
  GameState,
  IntelConfidence,
  IntelligenceReport,
  MobilisationProject
} from './types';

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export const ESCALATION_STAGES: EscalationStage[] = [
  {
    id: 1,
    label: 'Local response',
    threshold: 0,
    description: 'Local security and military forces are containing the breach.'
  },
  {
    id: 2,
    label: 'National mobilisation',
    threshold: 15,
    description: 'National reserves and domestic reinforcement networks are activating.'
  },
  {
    id: 3,
    label: 'Alliance coordination',
    threshold: 30,
    description: 'Allied commands are pooling intelligence, logistics and reinforcement plans.'
  },
  {
    id: 4,
    label: 'Coalition intervention',
    threshold: 50,
    description: 'A coordinated multinational intervention is entering the theatre.'
  },
  {
    id: 5,
    label: 'Strategic emergency',
    threshold: 72,
    description: 'Strategic reserves and emergency command authorities are being committed.'
  }
];

const MOBILISATION_TEMPLATES = [
  {
    id: 'NATIONAL-RESERVE',
    stage: 2,
    name: 'National Reinforcement Brigade',
    personnel: 1650,
    armour: 90,
    readiness: 66,
    delay: 3,
    source: 'National mobilisation'
  },
  {
    id: 'ALLIED-ARMOURED',
    stage: 3,
    name: 'Allied Armoured Brigade',
    personnel: 2200,
    armour: 230,
    readiness: 74,
    delay: 4,
    source: 'Alliance mobilisation'
  },
  {
    id: 'COALITION-DIVISION',
    stage: 4,
    name: 'Coalition Intervention Division',
    personnel: 3250,
    armour: 370,
    readiness: 82,
    delay: 4,
    source: 'Coalition deployment'
  },
  {
    id: 'STRATEGIC-CORPS',
    stage: 5,
    name: 'Strategic Reserve Corps',
    personnel: 4300,
    armour: 500,
    readiness: 88,
    delay: 3,
    source: 'Emergency mobilisation'
  }
] as const;

const difficultyScale: Record<Difficulty, number> = {
  story: 0.82,
  standard: 1,
  hard: 1.18
};

const mobilisationDelay: Record<Difficulty, number> = {
  story: 3,
  standard: 1,
  hard: -1
};

const escalationTurnGrowth: Record<Difficulty, number> = {
  story: 0.18,
  standard: 0.28,
  hard: 0.42
};

const escalationDailyBase: Record<Difficulty, number> = {
  story: 0.08,
  standard: 0.14,
  hard: 0.22
};

export function initialMobilisationPool(difficulty: Difficulty): number {
  if (difficulty === 'story') return 9000;
  if (difficulty === 'hard') return 17000;
  return 13000;
}

export function getEscalationStage(escalation: number): EscalationStage {
  return [...ESCALATION_STAGES].reverse().find(stage => escalation >= stage.threshold) ?? ESCALATION_STAGES[0];
}

export function getNextEscalationStage(escalation: number): EscalationStage | undefined {
  return ESCALATION_STAGES.find(stage => escalation < stage.threshold);
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
    id: `INT-${state.turn}-${state.intelligenceReports.length + 1}-${report.kind}`,
    turn: state.turn,
    ...report
  };
  return { ...state, intelligenceReports: [entry, ...state.intelligenceReports].slice(0, 40) };
}

function nearestEnemyTerritory(state: GameState, from: string): string | undefined {
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbour of TERRITORIES[current].neighbours) {
      if (visited.has(neighbour)) continue;
      visited.add(neighbour);
      if (state.territories[neighbour]?.controller === 'enemy') return neighbour;
      queue.push(neighbour);
    }
  }
  return undefined;
}

function reinforcementEntry(state: GameState): string | undefined {
  const playerTerritories = SLICE_IDS.filter(id => state.territories[id]?.controller === 'player');
  if (!playerTerritories.length) return SLICE_IDS.find(id => state.territories[id]?.controller === 'enemy');
  const targets = playerTerritories
    .flatMap(playerId => TERRITORIES[playerId].neighbours)
    .filter(id => state.territories[id]?.controller === 'enemy');
  if (targets.length) return [...new Set(targets)].sort((first, second) => TERRITORIES[second].supply - TERRITORIES[first].supply)[0];
  return nearestEnemyTerritory(state, state.portalTerritory);
}

function estimateStrength(personnel: number, confidence: IntelConfidence) {
  const spread = confidence === 'high' ? 0.12 : confidence === 'moderate' ? 0.24 : 0.4;
  const round = (value: number) => Math.max(0, Math.round(value / 50) * 50);
  return {
    min: round(personnel * (1 - spread)),
    max: round(personnel * (1 + spread))
  };
}

function confidenceForStage(stage: number): IntelConfidence {
  if (stage >= 4) return 'high';
  if (stage >= 2) return 'moderate';
  return 'low';
}

function calculateEscalation(state: GameState): number {
  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const unsecured = Object.values(state.territories).filter(territory => territory.occupation === 'unsecured').length;
  const recentCaptures = state.events.filter(event => event.turn >= state.turn - 2 && event.text.startsWith('Captured ')).length;
  const strategicCaptures = Object.values(state.territories).filter(territory => (
    territory.controller === 'player'
    && territory.id !== state.portalTerritory
    && TERRITORIES[territory.id].supply >= 7
  )).length;
  const floor = 3
    + Math.max(0, controlled - 1) * 3.35
    + Math.max(0, state.turn - 1) * escalationTurnGrowth[state.difficulty];
  const dailyPressure = escalationDailyBase[state.difficulty]
    + Object.keys(state.operations).length * 0.38
    + recentCaptures * 1.35
    + strategicCaptures * 0.08
    + unsecured * 0.06;
  return clamp(Math.max(floor, state.escalation + dailyPressure), 0, 100);
}

function scheduleMobilisations(state: GameState): GameState {
  let next = state;
  const existingIds = new Set(next.mobilisations.map(project => project.id));
  for (const template of MOBILISATION_TEMPLATES) {
    if (template.stage > next.escalationStage || existingIds.has(template.id)) continue;
    const scale = difficultyScale[next.difficulty];
    const personnel = Math.min(
      next.mobilisationPool,
      Math.round(template.personnel * scale / 50) * 50
    );
    if (personnel <= 0) continue;
    const ratio = personnel / (template.personnel * scale);
    const armour = Math.max(0, Math.round(template.armour * scale * ratio));
    const arrivalTurn = next.turn + Math.max(1, template.delay + mobilisationDelay[next.difficulty]);
    const project: MobilisationProject = {
      id: template.id,
      name: template.name,
      triggeredStage: template.stage,
      personnel,
      armour,
      readiness: template.readiness,
      source: template.source,
      entryTerritory: reinforcementEntry(next),
      startTurn: next.turn,
      arrivalTurn,
      status: 'mobilising'
    };
    next = {
      ...next,
      mobilisationPool: next.mobilisationPool - personnel,
      mobilisations: [...next.mobilisations, project]
    };
    next = appendEvent(next, `${project.name} mobilisation detected. Expected theatre entry on day ${arrivalTurn}.`, 'warning');
    const range = estimateStrength(personnel, confidenceForStage(template.stage));
    next = addReport(next, {
      kind: 'mobilisation',
      title: `${project.name} forming`,
      detail: `${project.source} is assembling a reinforcement formation for entry around day ${arrivalTurn}.`,
      confidence: confidenceForStage(template.stage),
      estimatedMin: range.min,
      estimatedMax: range.max,
      territoryId: project.entryTerritory
    });
    existingIds.add(project.id);
  }
  return next;
}

function deployMobilisations(state: GameState): GameState {
  let next = state;
  const mobilisations = next.mobilisations.map(project => {
    if (project.status !== 'mobilising' || project.arrivalTurn > next.turn) return project;
    let entry = project.entryTerritory;
    if (!entry || next.territories[entry]?.controller !== 'enemy') entry = reinforcementEntry(next);
    if (!entry) return { ...project, status: 'deployed' as const };
    const formationId = `EF-M-${project.id}-${next.turn}`;
    const formation: EnemyFormation = {
      id: formationId,
      name: project.name,
      location: entry,
      personnel: project.personnel,
      armour: project.armour,
      readiness: project.readiness,
      entrenchment: 8
    };
    next = {
      ...next,
      enemyFormations: { ...next.enemyFormations, [formationId]: formation }
    };
    next = appendEvent(next, `${project.name} entered the theatre at ${TERRITORIES[entry].centre}.`, 'danger');
    return { ...project, status: 'deployed' as const, entryTerritory: entry };
  });
  return { ...next, mobilisations };
}

function playerFront(state: GameState) {
  return SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'player'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'enemy')
  ));
}

function enemyFront(state: GameState) {
  return SLICE_IDS.filter(id => (
    state.territories[id]?.controller === 'enemy'
    && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player')
  ));
}

function nearestEnemyStep(state: GameState, origin: string, target: string): string | undefined {
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

function playerPowerAt(state: GameState, territoryId: string) {
  return Object.values(state.taskGroups)
    .filter(group => group.location === territoryId && group.personnel > 0)
    .reduce((sum, group) => sum + group.personnel + Math.min(group.functionalArmour, group.personnel) * 0.35 + group.morale * 8, 0)
    + state.territories[territoryId].fortification * 90;
}

function enemyPower(formation: EnemyFormation) {
  return formation.personnel + formation.armour * 4 + formation.readiness * 12 + formation.entrenchment * 15;
}

function planEnemyOrders(state: GameState): GameState {
  const enemyFormations = structuredClone(state.enemyFormations);
  const retainedOrders = state.enemyOrders.filter(order => order.status === 'completed' && order.turn >= state.turn - 3).slice(0, 12);
  const planned: EnemyOrder[] = [];
  let next: GameState = { ...state, enemyFormations, enemyOrders: retainedOrders };
  const front = enemyFront(next);
  const orderLimit = next.escalationStage === 1 ? 1 : next.escalationStage <= 3 ? 2 : 3;
  const availableOrderSlots = () => Math.max(0, orderLimit - planned.length);

  const weakFormation = Object.values(enemyFormations)
    .filter(formation => front.includes(formation.location) && (formation.readiness < 28 || formation.personnel < 500))
    .sort((first, second) => first.readiness - second.readiness)[0];
  if (weakFormation && availableOrderSlots()) {
    const destination = TERRITORIES[weakFormation.location].neighbours.find(id => next.territories[id]?.controller === 'enemy' && !front.includes(id));
    if (destination) {
      const origin = weakFormation.location;
      weakFormation.location = destination;
      weakFormation.readiness = clamp(weakFormation.readiness + 5, 0, 100);
      planned.push({
        id: `EO-${next.turn}-WITHDRAW-${weakFormation.id}`,
        turn: next.turn,
        type: 'withdraw',
        formationId: weakFormation.id,
        origin,
        target: destination,
        status: 'completed',
        priority: 95,
        summary: `${weakFormation.name} withdrew from ${TERRITORIES[origin].centre}`
      });
    }
  }

  if (availableOrderSlots()) {
    const entrencher = Object.values(enemyFormations)
      .filter(formation => front.includes(formation.location) && formation.entrenchment < 70)
      .sort((first, second) => second.personnel - first.personnel)[0];
    if (entrencher) {
      entrencher.entrenchment = clamp(entrencher.entrenchment + 8 + next.escalationStage * 2, 0, 100);
      planned.push({
        id: `EO-${next.turn}-ENTRENCH-${entrencher.id}`,
        turn: next.turn,
        type: 'entrench',
        formationId: entrencher.id,
        target: entrencher.location,
        status: 'completed',
        priority: 65,
        summary: `${entrencher.name} is entrenching at ${TERRITORIES[entrencher.location].centre}`
      });
    }
  }

  if (next.escalationStage >= 3 && availableOrderSlots() && front.length) {
    const destination = [...front].sort((first, second) => TERRITORIES[second].supply - TERRITORIES[first].supply)[0];
    const rearFormation = Object.values(enemyFormations)
      .filter(formation => !front.includes(formation.location) && formation.personnel > 700)
      .sort((first, second) => enemyPower(second) - enemyPower(first))[0];
    if (rearFormation) {
      const origin = rearFormation.location;
      const step = nearestEnemyStep(next, origin, destination);
      if (step && step !== origin) {
        rearFormation.location = step;
        rearFormation.readiness = clamp(rearFormation.readiness - 2, 0, 100);
        planned.push({
          id: `EO-${next.turn}-REPOSITION-${rearFormation.id}`,
          turn: next.turn,
          type: 'reposition',
          formationId: rearFormation.id,
          origin,
          target: step,
          status: 'completed',
          priority: 55,
          summary: `${rearFormation.name} repositioned towards ${TERRITORIES[destination].centre}`
        });
      }
    }
  }

  next = {
    ...next,
    enemyFormations,
    enemyOrders: [...planned, ...retainedOrders].slice(0, 24)
  };
  for (const order of planned) {
    if (order.type === 'withdraw' || order.type === 'entrench' || order.type === 'reposition') {
      next = addReport(next, {
        kind: 'order',
        title: order.summary,
        detail: 'Enemy movement is assessed from battlefield and signals indicators.',
        confidence: next.escalationStage >= 4 ? 'high' : 'moderate',
        territoryId: order.target
      });
    }
  }
  return next;
}

export function resolveStrategicResponse(state: GameState): GameState {
  const previousStage = state.escalationStage || getEscalationStage(state.escalation).id;
  const escalation = calculateEscalation(state);
  const stage = getEscalationStage(escalation);
  let next: GameState = {
    ...state,
    escalation,
    escalationStage: stage.id,
    enemyStrategy: normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty)
  };
  if (stage.id > previousStage) {
    next = appendEvent(next, `${stage.label}: ${stage.description}`, stage.id >= 4 ? 'danger' : 'warning');
    next = addReport(next, {
      kind: 'escalation',
      title: `${stage.label} threshold crossed`,
      detail: stage.description,
      confidence: 'high'
    });
  }
  next = scheduleMobilisations(next);
  next = deployMobilisations(next);
  next = planEnemyOrders(next);
  return next;
}

export function buildStrategicState(state: GameState): GameState {
  const stage = getEscalationStage(state.escalation);
  return {
    ...state,
    version: 14,
    escalationStage: stage.id,
    mobilisationPool: typeof state.mobilisationPool === 'number' ? state.mobilisationPool : initialMobilisationPool(state.difficulty),
    mobilisations: Array.isArray(state.mobilisations) ? state.mobilisations : [],
    enemyOrders: Array.isArray(state.enemyOrders) ? state.enemyOrders : [],
    intelligenceReports: Array.isArray(state.intelligenceReports) ? state.intelligenceReports : [],
    enemyStrategy: normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty)
  };
}

export function upgradeStrategicState(value: unknown): GameState {
  const legacy = structuredClone(value) as GameState & { version?: number; enemyStrategy?: GameState['enemyStrategy'] };
  if (!legacy || typeof legacy !== 'object') return legacy;
  const originalVersion = legacy.version;
  if (typeof originalVersion === 'number' && originalVersion < 14) legacy.version = 14;
  if (!legacy.mobilisationPool && legacy.mobilisationPool !== 0) legacy.mobilisationPool = initialMobilisationPool(legacy.difficulty ?? 'standard');
  if (!Array.isArray(legacy.mobilisations)) legacy.mobilisations = [];
  if (!Array.isArray(legacy.enemyOrders)) legacy.enemyOrders = [];
  if (!Array.isArray(legacy.intelligenceReports)) legacy.intelligenceReports = [];
  if (!legacy.escalationStage) legacy.escalationStage = getEscalationStage(legacy.escalation ?? 0).id;
  legacy.enemyStrategy = normaliseEnemyStrategyState(legacy.enemyStrategy, legacy.difficulty ?? 'standard');
  return legacy;
}

export function getPlannedCounterattack(state: GameState) {
  return state.enemyOrders.find(order => order.type === 'counterattack' && order.status === 'planned' && order.executeTurn === state.turn);
}

export function getPendingCounterattacks(state: GameState) {
  return state.enemyOrders.filter(order => order.type === 'counterattack' && order.status === 'planned');
}

export function describeStrategicIntent(state: GameState) {
  const pending = getPendingCounterattacks(state)[0];
  if (pending) return `Counterattack preparing against ${TERRITORIES[pending.target].centre} for day ${pending.executeTurn}.`;
  const reposition = state.enemyOrders.find(order => order.type === 'reposition');
  if (reposition) return `Reinforcing the front around ${TERRITORIES[reposition.target].centre}.`;
  const entrench = state.enemyOrders.find(order => order.type === 'entrench');
  if (entrench) return `Entrenching the current line around ${TERRITORIES[entrench.target].centre}.`;
  return 'Containment and force preservation.';
}

export const __testOnly = {
  calculateEscalation,
  confidenceForStage,
  deployMobilisations,
  planEnemyOrders,
  reinforcementEntry,
  scheduleMobilisations
};
