import { TERRITORIES } from './data';
import { STRATEGIC_ROUTE_BY_ID, STRATEGIC_ROUTES } from './strategic-network-data';
import type { GameState, OperationalAwarenessState, TutorialState } from './types';
import type { AssistanceLevel } from './global-settings';
import { engineeringOperationalPersonnel } from './engineering-projects';

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

export type AdviserWarningCategory = 'undefended-threat' | 'isolation' | 'low-garrison' | 'exhausted-stocks' | 'overloaded-route' | 'engineering-support-loss' | 'suicidal-assault';
export interface AdviserWarning extends SupplyDiagnostic { category: AdviserWarningCategory }

const adviserSeverityRank: Record<SupplyDiagnostic['severity'], number> = { warning: 1, danger: 2, critical: 3 };

const operationFriendlyPower = (state: GameState, participantGroupIds: string[]) => {
  const groups = participantGroupIds.flatMap(id => state.taskGroups[id] ? [state.taskGroups[id]] : []);
  const combined = groups.reduce((sum, group) => {
    const personnel = engineeringOperationalPersonnel(state, group);
    const armour = Math.min(group.functionalArmour, personnel);
    return sum + (personnel / 1000 * 4.1 + armour / 1000 * 1.9)
      * (0.58 + group.morale / 150)
      * (0.55 + group.supply / 190);
  }, 0);
  return combined * Math.max(0.82, 1 - (groups.length - 1) * 0.04);
};

const assistanceThreshold: Record<AssistanceLevel, number> = {
  'Full Guidance': 1,
  Recommended: 2,
  'Critical Only': 3,
  Off: 99
};

/** Produces advice only. It deliberately returns data and never calls an order mutator. */
export function getAdviserWarnings(state: GameState, assistance: AssistanceLevel): AdviserWarning[] {
  if (assistance === 'Off') return [];
  const warnings: AdviserWarning[] = [];
  const add = (warning: AdviserWarning) => warnings.push(warning);
  const threats = getThreatenedTerritories(state);
  for (const threat of threats.filter(threat => threat.stage !== 'recent-combat')) {
    const defenders = Object.values(state.taskGroups).filter(group => group.location === threat.territoryId && group.personnel > 0);
    if (!defenders.length) add({ id: `undefended-${threat.territoryId}`, category: 'undefended-threat', severity: threat.stage === 'under-attack' ? 'critical' : 'danger', title: `${TERRITORIES[threat.territoryId].centre} is threatened and undefended`, detail: 'No combat-capable formation is present to defend the threatened territory.', territoryId: threat.territoryId });
  }
  for (const [territoryId, territory] of Object.entries(state.territories)) {
    if (territory.controller !== 'player') continue;
    if (!territory.supplied) add({ id: `isolated-${territoryId}`, category: 'isolation', severity: 'danger', title: `${TERRITORIES[territoryId].centre} is isolated`, detail: 'Local reserves are finite; restore a controlled route when practical.', territoryId });
    const garrison = Object.values(state.taskGroups).filter(group => group.location === territoryId && group.status === 'garrison').reduce((sum, group) => sum + group.personnel, 0);
    if (territory.occupation !== 'enemy' && garrison > 0 && garrison < 800) add({ id: `garrison-${territoryId}`, category: 'low-garrison', severity: 'warning', title: `${TERRITORIES[territoryId].centre} has a low garrison`, detail: `${garrison} personnel are holding the territory.`, territoryId });
  }
  for (const group of Object.values(state.taskGroups)) {
    if (group.supply <= 15) add({ id: `stocks-${group.id}`, category: 'exhausted-stocks', severity: group.supply <= 5 ? 'critical' : 'danger', title: `${group.name} has exhausted stocks`, detail: `Carried stocks are at ${Math.round(group.supply)}%.`, groupId: group.id, territoryId: group.location });
  }
  for (const routeId of state.logistics.bottleneckRouteIds) {
    const route = STRATEGIC_ROUTE_BY_ID[routeId]; const flow = state.logistics.routeFlows[routeId];
    if (route && flow?.condition === 'overloaded') add({ id: `overload-${routeId}`, category: 'overloaded-route', severity: 'danger', title: `${route.name} is overloaded`, detail: `${Math.round(flow.utilisation)}% of route throughput is committed.`, routeId, territoryId: route.toTerritoryId });
  }
  for (const project of state.engineeringProjects.filter(project => project.status === 'active' && project.allocation === 0)) {
    const routeName = STRATEGIC_ROUTE_BY_ID[project.routeId]?.name ?? project.routeId;
    if (project.engineeringSupportLost) add({ id: `engineering-${project.id}`, category: 'engineering-support-loss', severity: 'danger', title: 'Engineering support has been lost', detail: `${routeName} has lost its assigned military support. Civil work continues at local capability.`, routeId: project.routeId });
  }
  for (const operation of Object.values(state.operations)) {
    const friendlyPower = operationFriendlyPower(state, operation.participantGroupIds);
    if (operation.enemyPower > friendlyPower * 1.5) add({ id: `assault-${operation.id}`, category: 'suicidal-assault', severity: operation.enemyPower > friendlyPower * 2.25 ? 'critical' : 'danger', title: `Assault on ${TERRITORIES[operation.target].centre} is suicidal`, detail: 'The planned assault is assessed as severely overmatched. Reconsider the commitment or gather better intelligence before proceeding.', territoryId: operation.target });
  }
  return warnings
    .filter(warning => adviserSeverityRank[warning.severity] >= assistanceThreshold[assistance])
    .sort((first, second) => adviserSeverityRank[second.severity] - adviserSeverityRank[first.severity]
      || first.category.localeCompare(second.category)
      || first.id.localeCompare(second.id));
}

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  why: string;
  completion: string;
  target: 'forces' | 'map' | 'operations' | 'logistics' | 'intelligence' | 'engineering';
  trigger: TutorialTrigger;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'formation',
    title: 'Navigate the theatre, then inspect a formation',
    instruction: 'On the map, Europe shows the whole theatre, Campaign frames controlled territory and nearby threats, and Selected focuses the active territory. Zoom with wheel, pinch or +/−; pan by dragging or using arrow keys. These controls only change framing. Then open Forces and select a friendly formation.',
    why: 'Every movement, attack, garrison and specialist task is assigned to a formation. Its current state determines what it can safely do next.',
    completion: 'The tutorial advances when a friendly formation is selected.',
    target: 'forces',
    trigger: 'select-formation'
  },
  {
    id: 'operation',
    title: 'Begin the first offensive',
    instruction: 'Return to the command map, select an adjacent enemy territory marked ATTACK, review the route and defender estimate, then begin an operation.',
    why: 'Territories are taken through route-connected multi-day operations. Defender estimates are intelligence ranges, not guaranteed exact strength.',
    completion: 'The tutorial advances when an attack operation is successfully launched.',
    target: 'map',
    trigger: 'begin-operation'
  },
  {
    id: 'occupation',
    title: 'Secure captured ground',
    instruction: 'Resolve campaign days until the operation captures its target. Then use the local formation’s Assign as garrison action.',
    why: 'Taking a province and controlling it are different problems. Unsecured ground threatens administration, resistance control and the wider supply network.',
    completion: 'The tutorial advances after a formation in the captured territory enters garrison duty.',
    target: 'map',
    trigger: 'set-garrison'
  },
  {
    id: 'movement',
    title: 'Reinforce the new position',
    instruction: 'Select another ready formation, choose a route-connected controlled territory marked MOVE and issue a movement order.',
    why: 'Formations act independently. Repositioning reserves is how you reinforce threatened ground without cancelling other simultaneous orders.',
    completion: 'The tutorial advances when a valid movement order is issued.',
    target: 'map',
    trigger: 'issue-move'
  },
  {
    id: 'logistics',
    title: 'Read the supply network',
    instruction: 'Open Logistics. A short guided walkthrough will explain distributed sources, route delivery, carried stocks and priority doctrine before you continue.',
    why: 'A strong formation can still become ineffective if the network cannot replenish it. Diagnosing the cause matters more than blindly raising priority.',
    completion: 'Opening Logistics starts its guided walkthrough; no supply setting has to be changed.',
    target: 'logistics',
    trigger: 'open-logistics'
  },
  {
    id: 'intelligence',
    title: 'Review enemy activity',
    instruction: 'Open Intelligence. The walkthrough will cover escalation, reconnaissance confidence, frontline pressure and how those signals should influence orders.',
    why: 'Enemy information is deliberately incomplete. Good decisions depend on recognising the difference between confirmed, estimated, activity and stale contacts.',
    completion: 'Opening Intelligence starts its guided walkthrough; no order is issued automatically.',
    target: 'intelligence',
    trigger: 'review-intelligence'
  },
  {
    id: 'engineering',
    title: 'Understand Infrastructure',
    instruction: 'Open Infrastructure. The final walkthrough will explain friendly-route repair, enemy-route interdiction and the eligibility rules for both.',
    why: 'Strategic routes are physical assets. Damage, bottlenecks and enemy interdiction can change which plans are sustainable even when your formations remain strong.',
    completion: 'Opening Infrastructure starts the final walkthrough. The tutorial completes after that walkthrough, not merely when the page opens.',
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

export function moveTutorial(state: GameState, direction: -1 | 1): GameState {
  if (!state.tutorial.enabled || state.tutorial.completed) return state;
  return {
    ...state,
    tutorial: {
      ...state.tutorial,
      step: Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, state.tutorial.step + direction))
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
