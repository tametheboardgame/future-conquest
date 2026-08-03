import { STRATEGIC_ROUTES } from './strategic-network-data';
import type {
  GameEvent,
  GameState,
  InfrastructureIncident,
  InfrastructureIncidentCause,
  StrategicRouteState
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

export function routeStatusForCondition(condition: number): StrategicRouteState['status'] {
  if (condition <= 0) return 'destroyed';
  if (condition < 35) return 'blocked';
  if (condition < 75) return 'damaged';
  return 'open';
}

export function routeCapacityModifierForCondition(condition: number): number {
  if (condition <= 0) return 0;
  return Math.round(clamp(0.2 + condition / 125, 0.2, 1) * 100) / 100;
}

export function normaliseInfrastructureIncidents(value: unknown): InfrastructureIncident[] {
  if (!Array.isArray(value)) return [];
  return value.filter((incident): incident is InfrastructureIncident => Boolean(
    incident
    && typeof incident === 'object'
    && typeof incident.id === 'string'
    && typeof incident.turn === 'number'
    && typeof incident.routeId === 'string'
    && (incident.cause === 'resistance' || incident.cause === 'enemy-interdiction' || incident.cause === 'combat')
    && typeof incident.severity === 'number'
    && typeof incident.description === 'string'
  )).slice(0, 80);
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

export function applyInfrastructureDamage(
  state: GameState,
  routeId: string,
  severity: number,
  cause: InfrastructureIncidentCause
): GameState {
  const route = STRATEGIC_ROUTES.find(candidate => candidate.id === routeId);
  const current = state.routeStates[routeId];
  if (!route || !current || severity <= 0) return state;

  const routeStates = structuredClone(state.routeStates);
  const beforeStatus = routeStates[routeId].status;
  const condition = clamp(Math.round(routeStates[routeId].condition - severity), 0, 100);
  routeStates[routeId].condition = condition;
  routeStates[routeId].status = routeStatusForCondition(condition);
  routeStates[routeId].capacityModifier = routeCapacityModifierForCondition(condition);

  const causeLabel = cause === 'resistance'
    ? 'Resistance sabotage'
    : cause === 'enemy-interdiction'
      ? 'Enemy interdiction'
      : 'Combat damage';
  const description = `${causeLabel} damaged ${route.name}, reducing corridor condition to ${condition}%.`;
  const incident: InfrastructureIncident = {
    id: `INF-${state.turn}-${routeId}-${(state.infrastructureIncidents?.length ?? 0) + 1}`,
    turn: state.turn,
    routeId,
    cause,
    severity: Math.round(severity),
    description
  };
  const incidents = [incident, ...(state.infrastructureIncidents ?? [])].slice(0, 80);
  const statusChange = beforeStatus !== routeStates[routeId].status
    ? ` The corridor is now ${routeStates[routeId].status}.`
    : '';
  return appendEvent({ ...state, routeStates, infrastructureIncidents: incidents }, `${description}${statusChange}`, condition < 35 ? 'danger' : 'warning');
}

export function resolveInfrastructureRecovery(state: GameState): GameState {
  const routeStates = structuredClone(state.routeStates);
  const repaired: string[] = [];

  for (const route of STRATEGIC_ROUTES) {
    const current = routeStates[route.id];
    if (!current || current.condition >= 100) continue;
    const from = state.territories[route.fromTerritoryId];
    const to = state.territories[route.toTerritoryId];
    if (
      !from
      || !to
      || from.controller !== 'player'
      || to.controller !== 'player'
      || from.occupation !== 'administered'
      || to.occupation !== 'administered'
      || !from.supplied
      || !to.supplied
    ) continue;

    const beforeStatus = current.status;
    current.condition = clamp(current.condition + 1, 0, 100);
    current.status = routeStatusForCondition(current.condition);
    current.capacityModifier = routeCapacityModifierForCondition(current.condition);
    if (beforeStatus !== current.status || current.condition === 100) repaired.push(route.name);
  }

  if (!repaired.length) return { ...state, routeStates };
  return appendEvent(
    { ...state, routeStates },
    `Routine maintenance restored ${repaired.slice(0, 3).join(', ')}${repaired.length > 3 ? ` and ${repaired.length - 3} other corridor${repaired.length - 3 === 1 ? '' : 's'}` : ''}.`,
    'good'
  );
}

export function resolveInfrastructureDisruption(state: GameState): GameState {
  const candidates = STRATEGIC_ROUTES.flatMap(route => {
    const from = state.territories[route.fromTerritoryId];
    const to = state.territories[route.toTerritoryId];
    if (!from || !to) return [];
    const playerEndpoints = [from, to].filter(territory => territory.controller === 'player').length;
    if (!playerEndpoints) return [];

    let cause: InfrastructureIncidentCause;
    let risk: number;
    if (playerEndpoints === 2) {
      const resistance = Math.max(from.resistance, to.resistance);
      if (resistance < 35) return [];
      cause = 'resistance';
      risk = resistance / 720;
    } else {
      if (state.escalation < 20) return [];
      cause = 'enemy-interdiction';
      risk = (state.escalation - 15) / 700;
    }

    const protectedRoute = Object.values(state.taskGroups).some(group =>
      group.status === 'garrison'
      && group.personnel >= 500
      && (group.location === route.fromTerritoryId || group.location === route.toTerritoryId)
    );
    if (protectedRoute) risk *= 0.55;
    const roll = randomFor(state.seed, state.turn, saltFor(route.id) + (cause === 'resistance' ? 401 : 809));
    return roll < risk ? [{ route, cause, margin: risk - roll }] : [];
  }).sort((a, b) => b.margin - a.margin || a.route.id.localeCompare(b.route.id));

  const selected = candidates[0];
  if (!selected) return state;
  const severityRoll = randomFor(state.seed, state.turn, saltFor(selected.route.id) + 1301);
  const severity = 8 + Math.floor(severityRoll * 17) + (selected.cause === 'enemy-interdiction' ? Math.floor(state.escalation / 25) : 0);
  return applyInfrastructureDamage(state, selected.route.id, severity, selected.cause);
}
