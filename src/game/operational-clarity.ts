import { TERRITORIES } from './data';
import { STRATEGIC_ROUTE_BY_ID, STRATEGIC_ROUTES } from './strategic-network-data';
import type { GameState, OperationalAwarenessState, TutorialState } from './types';

export type EnemyContactConfidence = 'confirmed' | 'estimated' | 'activity' | 'stale';
export type OperationalSeverity = 'normal' | 'warning' | 'danger' | 'critical';
export type TutorialTrigger =
  | 'select-formation'
  | 'issue-move'
  | 'begin-operation'
  | 'set-garrison'
  | 'open-logistics'
  | 'review-intelligence'
  | 'open-engineering';

export interface EnemyContact {
  territoryId: string;
  confidence: EnemyContactConfidence;
  formationCount?: number;
  estimatedMin: number;
  estimatedMax: number;
  lastObservedTurn?: number;
  label: string;
}

export interface ThreatenedTerritory {
  territoryId: string;
  stage: 'preparing' | 'imminent' | 'under-attack' | 'recent-combat';
  executeTurn: number;
  formationCount: number;
  summary: string;
}

export interface SupplyDiagnostic {
  id: string;
  severity: Exclude<OperationalSeverity, 'normal'>;
  title: string;
  detail: string;
  territoryId?: string;
  groupId?: string;
  routeId?: string;
}

export interface SupplyClarity {
  severity: OperationalSeverity;
  trend: 'improving' | 'stable' | 'declining';
  delta: number;
  diagnostics: SupplyDiagnostic[];
  acknowledgementRequired: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  target: 'forces' | 'map' | 'operations' | 'logistics' | 'intelligence' | 'engineering';
  trigger: TutorialTrigger;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'formation',
    title: 'Inspect a formation',
    instruction: 'Select any friendly formation and review its personnel, armour, morale and logistics condition.',
    target: 'forces',
    trigger: 'select-formation'
  },
  {
    id: 'operation',
    title: 'Begin the first offensive',
    instruction: 'On the map, select an adjacent enemy territory marked ATTACK, review the corridor and begin an operation.',
    target: 'map',
    trigger: 'begin-operation'
  },
  {
    id: 'occupation',
    title: 'Secure captured ground',
    instruction: 'Resolve campaign days until the territory is captured, then select a formation there and assign it to garrison duty.',
    target: 'map',
    trigger: 'set-garrison'
  },
  {
    id: 'movement',
    title: 'Reinforce the new position',
    instruction: 'Select another ready formation, choose the captured controlled territory marked MOVE and issue a movement order.',
    target: 'map',
    trigger: 'issue-move'
  },
  {
    id: 'logistics',
    title: 'Read the supply network',
    instruction: 'Open Logistics. Review network efficiency, route bottlenecks and which formations are receiving inadequate throughput.',
    target: 'logistics',
    trigger: 'open-logistics'
  },
  {
    id: 'intelligence',
    title: 'Review enemy activity',
    instruction: 'Open Intelligence or select a threat warning. Confirm where enemy activity is forming and which territory may need reinforcement.',
    target: 'intelligence',
    trigger: 'review-intelligence'
  },
  {
    id: 'engineering',
    title: 'Protect the network',
    instruction: 'Open Infrastructure to review route damage, repair projects and interdiction options. The guided campaign then ends.',
    target: 'engineering',
    trigger: 'open-engineering'
  }
];

const severityRank: Record<OperationalSeverity, number> = {
  normal: 0,
  warning: 1,
  danger: 2,
  critical: 3
};

const maxSeverity = (first: OperationalSeverity, second: OperationalSeverity): OperationalSeverity => (
  severityRank[second] > severityRank[first] ? second : first
);

export function createOperationalAwarenessState(networkEfficiency = 100): OperationalAwarenessState {
  return {
    previousNetworkEfficiency: networkEfficiency,
    lastAcknowledgedSupplyTurn: 0
  };
}

export function normaliseOperationalAwarenessState(
  value: Partial<OperationalAwarenessState> | undefined,
  networkEfficiency: number
): OperationalAwarenessState {
  return {
    previousNetworkEfficiency: typeof value?.previousNetworkEfficiency === 'number' && Number.isFinite(value.previousNetworkEfficiency)
      ? Math.max(0, Math.min(100, Math.round(value.previousNetworkEfficiency)))
      : networkEfficiency,
    lastAcknowledgedSupplyTurn: typeof value?.lastAcknowledgedSupplyTurn === 'number' && Number.isFinite(value.lastAcknowledgedSupplyTurn)
      ? Math.max(0, Math.round(value.lastAcknowledgedSupplyTurn))
      : 0
  };
}

export function createTutorialState(enabled = true, turn = 1): TutorialState {
  return {
    enabled,
    step: 0,
    completed: false,
    startedTurn: turn
  };
}

export function normaliseTutorialState(value: Partial<TutorialState> | undefined, turn: number): TutorialState {
  if (!value) return createTutorialState(false, turn);
  const step = typeof value.step === 'number' && Number.isFinite(value.step)
    ? Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, Math.round(value.step)))
    : 0;
  return {
    enabled: Boolean(value.enabled) && !Boolean(value.completed),
    step,
    completed: Boolean(value.completed),
    startedTurn: typeof value.startedTurn === 'number' && Number.isFinite(value.startedTurn)
      ? Math.max(1, Math.round(value.startedTurn))
      : turn
  };
}

export function getTutorialStep(tutorial: TutorialState): TutorialStep | undefined {
  if (!tutorial.enabled || tutorial.completed) return undefined;
  return TUTORIAL_STEPS[tutorial.step] ?? TUTORIAL_STEPS[0];
}

export function progressTutorial(state: GameState, trigger: TutorialTrigger): GameState {
  const current = getTutorialStep(state.tutorial);
  if (!current || current.trigger !== trigger) return state;
  const nextStep = state.tutorial.step + 1;
  const completed = nextStep >= TUTORIAL_STEPS.length;
  return {
    ...state,
    tutorial: {
      ...state.tutorial,
      enabled: !completed,
      completed,
      step: completed ? TUTORIAL_STEPS.length - 1 : nextStep
    }
  };
}

export function skipTutorial(state: GameState): GameState {
  return { ...state, tutorial: { ...state.tutorial, enabled: false } };
}

export function restartTutorial(state: GameState): GameState {
  return { ...state, tutorial: createTutorialState(true, state.turn) };
}

export function markSupplyWarningAcknowledged(state: GameState): GameState {
  return {
    ...state,
    operationalAwareness: {
      ...state.operationalAwareness,
      lastAcknowledgedSupplyTurn: state.turn
    }
  };
}

function reportForTerritory(state: GameState, territoryId: string) {
  return state.intelligenceReports
    .filter(report => report.territoryId === territoryId)
    .sort((first, second) => second.turn - first.turn)[0];
}

export function getEnemyContacts(state: GameState): EnemyContact[] {
  const activeOrders = state.enemyOrders.filter(order => order.status !== 'completed');
  const byTerritory = new Map<string, typeof state.enemyFormations[string][]>();
  for (const formation of Object.values(state.enemyFormations)) {
    if (formation.personnel <= 0) continue;
    const list = byTerritory.get(formation.location) ?? [];
    list.push(formation);
    byTerritory.set(formation.location, list);
  }

  return [...byTerritory.entries()].map(([territoryId, formations]) => {
    const report = reportForTerritory(state, territoryId);
    const age = report ? Math.max(0, state.turn - report.turn) : undefined;
    const activeOrder = activeOrders.find(order => (
      order.origin === territoryId
      || Boolean(order.formationId && formations.some(formation => formation.id === order.formationId))
    ));
    const frontline = TERRITORIES[territoryId].neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player');
    let confidence: EnemyContactConfidence = 'activity';
    if (report?.confidence === 'high' && age !== undefined && age <= 1) confidence = 'confirmed';
    else if (activeOrder || frontline || (report && age !== undefined && age <= 2)) confidence = 'estimated';
    else if (report && age !== undefined && age <= 5) confidence = 'stale';

    const actualPersonnel = formations.reduce((sum, formation) => sum + formation.personnel, 0);
    const spread = confidence === 'confirmed' ? 0.08 : confidence === 'estimated' ? 0.24 : confidence === 'activity' ? 0.45 : 0.6;
    const estimatedMin = report?.estimatedMin ?? Math.max(100, Math.round(actualPersonnel * (1 - spread) / 100) * 100);
    const estimatedMax = report?.estimatedMax ?? Math.max(estimatedMin, Math.round(actualPersonnel * (1 + spread) / 100) * 100);
    const label = confidence === 'confirmed'
      ? `${formations.length} confirmed formation${formations.length === 1 ? '' : 's'}`
      : confidence === 'estimated'
        ? 'Estimated enemy formation'
        : confidence === 'stale'
          ? 'Stale enemy position'
          : 'Unidentified enemy activity';

    return {
      territoryId,
      confidence,
      formationCount: confidence === 'confirmed' ? formations.length : undefined,
      estimatedMin,
      estimatedMax,
      lastObservedTurn: report?.turn,
      label
    };
  }).sort((first, second) => TERRITORIES[first.territoryId].centre.localeCompare(TERRITORIES[second.territoryId].centre));
}

export function getThreatenedTerritories(state: GameState): ThreatenedTerritory[] {
  const stageRank: Record<ThreatenedTerritory['stage'], number> = {
    'under-attack': 0,
    imminent: 1,
    preparing: 2,
    'recent-combat': 3
  };
  const candidates = state.enemyOrders
    .filter(order => order.type === 'counterattack')
    .flatMap(order => {
      const executeTurn = order.executeTurn ?? order.turn;
      const active = order.status !== 'completed' && state.territories[order.target]?.controller === 'player';
      const recent = order.status === 'completed' && state.turn - executeTurn >= 0 && state.turn - executeTurn <= 1;
      if (!active && !recent) return [];
      const stage: ThreatenedTerritory['stage'] = recent
        ? 'recent-combat'
        : executeTurn <= state.turn
          ? 'under-attack'
          : executeTurn <= state.turn + 1
            ? 'imminent'
            : 'preparing';
      return [{
        territoryId: order.target,
        stage,
        executeTurn,
        formationCount: 1 + (order.supportFormationIds?.length ?? 0),
        summary: recent ? `Enemy counterattack resolved at ${TERRITORIES[order.target].centre}` : order.summary
      }];
    })
    .sort((first, second) => stageRank[first.stage] - stageRank[second.stage] || first.executeTurn - second.executeTurn);

  return candidates.filter((candidate, index) => (
    candidates.findIndex(other => other.territoryId === candidate.territoryId) === index
  ));
}

export function getSupplyClarity(state: GameState): SupplyClarity {
  const diagnostics: SupplyDiagnostic[] = [];
  const playerTerritoryIds = Object.entries(state.territories)
    .filter(([, territory]) => territory.controller === 'player')
    .map(([id]) => id);
  const isolated = playerTerritoryIds.filter(id => !state.territories[id].supplied);
  const starvedGroups = state.logistics.starvedFormationIds.map(id => state.taskGroups[id]).filter(Boolean);
  const relevantRoutes = STRATEGIC_ROUTES.filter(route => (
    state.logistics.routeFlows[route.id]?.used > 0
    || state.territories[route.fromTerritoryId]?.controller === 'player'
    || state.territories[route.toTerritoryId]?.controller === 'player'
  ));
  const brokenRoutes = relevantRoutes.filter(route => {
    const status = state.routeStates[route.id]?.status;
    return status === 'blocked' || status === 'destroyed';
  });
  const recentInterdiction = (state.infrastructureIncidents ?? []).filter(incident => (
    incident.cause === 'enemy-interdiction' && state.turn - incident.turn <= 3
  ));

  for (const group of starvedGroups.slice(0, 4)) {
    const allocation = state.logistics.formationAllocations[group.id];
    diagnostics.push({
      id: `formation-${group.id}`,
      severity: allocation?.condition === 'cut-off' || allocation?.condition === 'critical' ? 'critical' : 'danger',
      title: `${group.name} is ${allocation?.condition ?? 'cut off'}`,
      detail: `${TERRITORIES[group.location].centre}: ${allocation?.delivered ?? 0}/${allocation?.demand ?? 0} daily throughput delivered; carried stock ${Math.round(group.supply)}%.`,
      groupId: group.id,
      territoryId: group.location
    });
  }

  for (const territoryId of isolated.slice(0, 4)) {
    diagnostics.push({
      id: `territory-${territoryId}`,
      severity: 'danger',
      title: `${TERRITORIES[territoryId].centre} is disconnected from the wider network`,
      detail: 'No traversable route currently connects this territory to another controlled supply area. Local sources and carried formation stocks may continue to sustain forces temporarily.',
      territoryId
    });
  }

  for (const route of brokenRoutes.slice(0, 4)) {
    diagnostics.push({
      id: `route-${route.id}`,
      severity: state.routeStates[route.id]?.status === 'destroyed' ? 'critical' : 'danger',
      title: `${route.name} is ${state.routeStates[route.id]?.status}`,
      detail: 'The corridor cannot carry normal movement and supply until repaired or bypassed.',
      routeId: route.id,
      territoryId: route.toTerritoryId
    });
  }

  for (const routeId of state.logistics.bottleneckRouteIds.slice(0, 4)) {
    const route = STRATEGIC_ROUTE_BY_ID[routeId];
    const flow = state.logistics.routeFlows[routeId];
    if (!route || !flow) continue;
    diagnostics.push({
      id: `bottleneck-${routeId}`,
      severity: flow.condition === 'overloaded' ? 'danger' : 'warning',
      title: `${route.name} is a bottleneck`,
      detail: `${flow.used}/${flow.capacity} throughput used (${Math.round(flow.utilisation)}%).`,
      routeId,
      territoryId: route.toTerritoryId
    });
  }

  if (state.logistics.sourceCapacity > 0 && state.logistics.sourceUsed / state.logistics.sourceCapacity >= 0.92) {
    diagnostics.push({
      id: 'source-capacity',
      severity: state.logistics.sourceUsed >= state.logistics.sourceCapacity ? 'danger' : 'warning',
      title: 'Territorial source capacity is nearly exhausted',
      detail: `${state.logistics.sourceUsed}/${state.logistics.sourceCapacity} locally generated source throughput is committed across controlled territory.`
    });
  }

  if (recentInterdiction.length) {
    const latest = recentInterdiction[0];
    const route = STRATEGIC_ROUTE_BY_ID[latest.routeId];
    diagnostics.push({
      id: 'enemy-interdiction',
      severity: latest.severity >= 25 ? 'danger' : 'warning',
      title: 'Enemy interdiction is disrupting the network',
      detail: `${route?.name ?? latest.routeId} was attacked recently and remains degraded.`,
      routeId: latest.routeId,
      territoryId: route?.toTerritoryId
    });
  }

  let severity: OperationalSeverity = 'normal';
  if (state.logistics.networkEfficiency < 80 || diagnostics.some(item => item.severity === 'warning')) severity = maxSeverity(severity, 'warning');
  if (state.logistics.networkEfficiency < 62 || diagnostics.some(item => item.severity === 'danger')) severity = maxSeverity(severity, 'danger');
  if (state.logistics.networkEfficiency < 45 || diagnostics.some(item => item.severity === 'critical') || starvedGroups.length >= 3) severity = 'critical';

  const delta = state.logistics.networkEfficiency - state.operationalAwareness.previousNetworkEfficiency;
  const trend = delta >= 3 ? 'improving' : delta <= -3 ? 'declining' : 'stable';
  const acknowledgementRequired = (severity === 'danger' || severity === 'critical')
    && state.operationalAwareness.lastAcknowledgedSupplyTurn !== state.turn
    && diagnostics.length > 0;

  return { severity, trend, delta, diagnostics, acknowledgementRequired };
}

export function requiresSupplyAcknowledgement(state: GameState): boolean {
  return getSupplyClarity(state).acknowledgementRequired;
}
