from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"Expected {count} occurrence(s) in {path}, found {found}: {old[:120]!r}")
    file.write_text(text.replace(old, new, count))


# --- New interdiction mechanics -------------------------------------------------
Path('src/game/interdiction-missions.ts').write_text(r'''import { applyInfrastructureDamage } from './infrastructure-disruption';
import { STRATEGIC_ROUTE_BY_ID, STRATEGIC_ROUTES } from './strategic-network-data';
import { refreshSupplyNetwork } from './supply-network';
import type {
  GameEvent,
  GameState,
  InterdictionIntensity,
  InterdictionMission,
  Operation,
  TaskGroup
} from './types';

export const INTERDICTION_INTENSITIES: InterdictionIntensity[] = [25, 50, 75, 100];

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

function appendEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const event: GameEvent = {
    id: (state.events[0]?.id ?? 0) + 1,
    turn: state.turn,
    text,
    tone
  };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

function validIntensity(value: unknown): value is InterdictionIntensity {
  return value === 25 || value === 50 || value === 75 || value === 100;
}

export function interdictionMissionDemand(mission: Pick<InterdictionMission, 'intensity'>): number {
  return Math.max(5, Math.ceil(mission.intensity / 8));
}

export function normaliseInterdictionMissions(value: unknown): InterdictionMission[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): InterdictionMission[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const mission = candidate as Partial<InterdictionMission>;
    if (
      typeof mission.id !== 'string'
      || typeof mission.routeId !== 'string'
      || typeof mission.assignedTaskGroupId !== 'string'
      || typeof mission.createdTurn !== 'number'
      || typeof mission.progress !== 'number'
      || !validIntensity(mission.intensity)
      || typeof mission.supplySpent !== 'number'
      || typeof mission.casualties !== 'number'
      || typeof mission.damageInflicted !== 'number'
      || (mission.status !== 'active' && mission.status !== 'succeeded' && mission.status !== 'failed' && mission.status !== 'cancelled')
      || (mission.returnStatus !== 'ready' && mission.returnStatus !== 'garrison')
    ) return [];
    return [{
      id: mission.id,
      routeId: mission.routeId,
      assignedTaskGroupId: mission.assignedTaskGroupId,
      createdTurn: Math.max(1, Math.round(mission.createdTurn)),
      progress: clamp(Math.round(mission.progress), 0, 100),
      intensity: mission.intensity,
      supplySpent: Math.max(0, Math.round(mission.supplySpent)),
      casualties: Math.max(0, Math.round(mission.casualties)),
      damageInflicted: Math.max(0, Math.round(mission.damageInflicted)),
      status: mission.status,
      returnStatus: mission.returnStatus
    }];
  }).slice(0, 80);
}

function playerEndpointForRoute(state: GameState, routeId: string): string | null {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return null;
  const from = state.territories[route.fromTerritoryId];
  const to = state.territories[route.toTerritoryId];
  if (from?.controller === 'player' && to?.controller === 'enemy' && from.occupation !== 'unsecured') return route.fromTerritoryId;
  if (to?.controller === 'player' && from?.controller === 'enemy' && to.occupation !== 'unsecured') return route.toTerritoryId;
  return null;
}

function enemyEndpointForRoute(state: GameState, routeId: string): string | null {
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  if (!route) return null;
  if (state.territories[route.fromTerritoryId]?.controller === 'enemy') return route.fromTerritoryId;
  if (state.territories[route.toTerritoryId]?.controller === 'enemy') return route.toTerritoryId;
  return null;
}

export function normaliseInterdictionState(
  value: unknown,
  taskGroups: Record<string, TaskGroup>,
  state: Pick<GameState, 'territories' | 'routeStates'>
): { missions: InterdictionMission[]; taskGroups: Record<string, TaskGroup> } {
  const missions = normaliseInterdictionMissions(value);
  const groups = structuredClone(taskGroups);
  for (const mission of missions) {
    if (mission.status !== 'active') continue;
    const routeState = state.routeStates[mission.routeId];
    const group = groups[mission.assignedTaskGroupId];
    const endpoint = playerEndpointForRoute({ ...state, taskGroups: groups } as GameState, mission.routeId);
    const validGroup = Boolean(group && !group.order && endpoint === group.location && (group.status === 'ready' || group.status === 'garrison' || group.status === 'interdicting'));
    if (!routeState || routeState.condition <= 0 || !validGroup) {
      mission.status = 'cancelled';
      if (group?.status === 'interdicting') group.status = mission.returnStatus;
      continue;
    }
    group.status = 'interdicting';
  }
  return { missions, taskGroups: groups };
}

export function interdictionGroupsForRoute(state: GameState, routeId: string): TaskGroup[] {
  const endpoint = playerEndpointForRoute(state, routeId);
  if (!endpoint) return [];
  const assigned = new Set([
    ...state.engineeringProjects.filter(project => project.status === 'active').map(project => project.assignedTaskGroupId),
    ...state.interdictionMissions.filter(mission => mission.status === 'active').map(mission => mission.assignedTaskGroupId)
  ]);
  return Object.values(state.taskGroups)
    .filter(group => (
      group.personnel > 0
      && group.location === endpoint
      && !group.order
      && !assigned.has(group.id)
      && (group.status === 'ready' || group.status === 'garrison')
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function frontierInterdictionRoutes(state: GameState) {
  const activeRoutes = new Set(state.interdictionMissions.filter(mission => mission.status === 'active').map(mission => mission.routeId));
  return STRATEGIC_ROUTES.filter(route => (
    state.routeStates[route.id]?.condition > 0
    && !activeRoutes.has(route.id)
    && playerEndpointForRoute(state, route.id)
    && enemyEndpointForRoute(state, route.id)
    && interdictionGroupsForRoute(state, route.id).length > 0
  )).sort((a, b) => {
    const aEnemy = enemyEndpointForRoute(state, a.id);
    const bEnemy = enemyEndpointForRoute(state, b.id);
    const aSupply = aEnemy ? state.territories[aEnemy]?.fortification ?? 0 : 0;
    const bSupply = bEnemy ? state.territories[bEnemy]?.fortification ?? 0 : 0;
    return bSupply - aSupply || a.name.localeCompare(b.name);
  });
}

function nextMissionId(state: GameState, routeId: string): string {
  let suffix = 1;
  let id = `INTD-${state.turn}-${routeId}-${suffix}`;
  while (state.interdictionMissions.some(mission => mission.id === id)) {
    suffix += 1;
    id = `INTD-${state.turn}-${routeId}-${suffix}`;
  }
  return id;
}

export function startInterdictionMission(
  state: GameState,
  routeId: string,
  groupId: string,
  intensity: InterdictionIntensity = 50
): GameState {
  if (state.status !== 'playing' || !validIntensity(intensity)) return state;
  const route = STRATEGIC_ROUTE_BY_ID[routeId];
  const routeState = state.routeStates[routeId];
  const group = state.taskGroups[groupId];
  if (!route || !routeState || routeState.condition <= 0 || !group) return state;
  if (state.interdictionMissions.some(mission => mission.status === 'active' && (mission.routeId === routeId || mission.assignedTaskGroupId === groupId))) return state;
  if (!interdictionGroupsForRoute(state, routeId).some(candidate => candidate.id === groupId)) return state;

  const taskGroups = structuredClone(state.taskGroups);
  const returnStatus = group.status === 'garrison' ? 'garrison' : 'ready';
  taskGroups[groupId].status = 'interdicting';
  const mission: InterdictionMission = {
    id: nextMissionId(state, routeId),
    routeId,
    assignedTaskGroupId: groupId,
    createdTurn: state.turn,
    progress: 0,
    intensity,
    supplySpent: 0,
    casualties: 0,
    damageInflicted: 0,
    status: 'active',
    returnStatus
  };
  return refreshSupplyNetwork(appendEvent(
    { ...state, taskGroups, interdictionMissions: [mission, ...state.interdictionMissions].slice(0, 80) },
    `${group.name} began an interdiction mission against ${route.name} at ${intensity}% intensity.`,
    'warning'
  ));
}

export function setInterdictionIntensity(state: GameState, missionId: string, intensity: InterdictionIntensity): GameState {
  if (!validIntensity(intensity)) return state;
  const missions = structuredClone(state.interdictionMissions);
  const mission = missions.find(candidate => candidate.id === missionId && candidate.status === 'active');
  if (!mission || mission.intensity === intensity) return state;
  mission.intensity = intensity;
  const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, interdictionMissions: missions },
    `${route?.name ?? mission.routeId} interdiction intensity changed to ${intensity}%.`,
    'neutral'
  ));
}

export function cancelInterdictionMission(state: GameState, missionId: string): GameState {
  const missions = structuredClone(state.interdictionMissions);
  const mission = missions.find(candidate => candidate.id === missionId && candidate.status === 'active');
  if (!mission) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const group = taskGroups[mission.assignedTaskGroupId];
  if (group?.status === 'interdicting') group.status = mission.returnStatus;
  mission.status = 'cancelled';
  const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
  return refreshSupplyNetwork(appendEvent(
    { ...state, taskGroups, interdictionMissions: missions },
    `Interdiction activity against ${route?.name ?? mission.routeId} was cancelled.`,
    'neutral'
  ));
}

export function resolveInterdictionMissions(state: GameState): GameState {
  if (!state.interdictionMissions.some(mission => mission.status === 'active')) return state;
  const missions = structuredClone(state.interdictionMissions);
  const taskGroups = structuredClone(state.taskGroups);
  let next: GameState = { ...state, interdictionMissions: missions, taskGroups };

  for (const mission of missions.filter(candidate => candidate.status === 'active').sort((a, b) => a.id.localeCompare(b.id))) {
    const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
    const group = taskGroups[mission.assignedTaskGroupId];
    const playerEndpoint = playerEndpointForRoute(next, mission.routeId);
    const enemyEndpoint = enemyEndpointForRoute(next, mission.routeId);
    if (!route || !group || group.status !== 'interdicting' || group.order || group.location !== playerEndpoint || !enemyEndpoint || next.routeStates[mission.routeId]?.condition <= 0) {
      mission.status = 'cancelled';
      if (group?.status === 'interdicting') group.status = mission.returnStatus;
      next = appendEvent(next, `Interdiction mission ${mission.id} was abandoned after the target corridor or assigned formation became unavailable.`, 'warning');
      continue;
    }

    const deliveryRatio = clamp((state.logistics.formationAllocations[group.id]?.ratio ?? 0) / 100, 0, 1);
    const dailyProgress = deliveryRatio >= 0.15 ? Math.max(6, Math.floor((13 + mission.intensity / 3.5) * deliveryRatio)) : 0;
    mission.supplySpent += Math.round(interdictionMissionDemand(mission) * deliveryRatio);
    if (dailyProgress <= 0) {
      if (state.turn % 3 === 0) next = appendEvent(next, `${group.name}'s interdiction mission against ${route.name} is stalled by inadequate logistics.`, 'warning');
      continue;
    }
    mission.progress = clamp(mission.progress + dailyProgress, 0, 100);
    if (mission.progress < 100) continue;

    const defenders = Object.values(next.enemyFormations).filter(formation => formation.location === enemyEndpoint && formation.personnel > 0);
    const defenderPersonnel = defenders.reduce((sum, formation) => sum + formation.personnel, 0);
    const defenderReadiness = defenders.length ? defenders.reduce((sum, formation) => sum + formation.readiness, 0) / defenders.length : 35;
    const protection = Math.min(0.34, defenderPersonnel / 15000 + defenderReadiness / 650 + (next.territories[enemyEndpoint]?.fortification ?? 0) / 350);
    const successChance = clamp(0.38 + mission.intensity / 190 + group.morale / 650 + deliveryRatio * 0.16 - protection, 0.16, 0.9);
    const successRoll = randomFor(next.seed, next.turn, saltFor(mission.id) + 1701);
    const casualtyRoll = randomFor(next.seed, next.turn, saltFor(mission.id) + 2111);
    const succeeded = successRoll < successChance;
    const casualtyRate = succeeded
      ? 0.0015 + casualtyRoll * (0.003 + mission.intensity / 40000)
      : 0.008 + casualtyRoll * (0.014 + mission.intensity / 15000);
    const casualties = Math.min(group.personnel, Math.max(succeeded ? 1 : 8, Math.round(group.personnel * casualtyRate)));
    const wounded = Math.round(casualties * 0.62);
    group.personnel = Math.max(0, group.personnel - casualties);
    group.morale = clamp(group.morale + (succeeded ? -1 : -7), 5, 100);
    group.status = mission.returnStatus;
    mission.casualties += casualties;
    next.woundedPool += wounded;

    if (succeeded) {
      const severity = 8 + Math.floor(mission.intensity / 7) + Math.floor(randomFor(next.seed, next.turn, saltFor(mission.id) + 2609) * 9);
      mission.status = 'succeeded';
      mission.damageInflicted = severity;
      next = applyInfrastructureDamage(next, route.id, severity, 'player-interdiction');
      next.escalation = clamp(next.escalation + 0.45 + mission.intensity / 80, 0, 100);
      next = appendEvent(next, `${group.name} completed a successful interdiction mission against ${route.name}, inflicting ${severity} condition damage at the cost of ${casualties} casualties.`, 'good');
    } else {
      mission.status = 'failed';
      next.escalation = clamp(next.escalation + 0.25 + mission.intensity / 220, 0, 100);
      next = appendEvent(next, `${group.name}'s interdiction mission against ${route.name} failed under enemy security pressure. ${casualties} personnel became casualties.`, 'danger');
    }
  }

  return next;
}

export function resolveOperationCombatDamage(
  state: GameState,
  operation: Operation,
  participants: TaskGroup[],
  defenderPersonnel: number
): GameState {
  const routeCounts = new Map<string, number>();
  for (const group of participants) {
    const routeId = group.order?.routeId;
    if (routeId) routeCounts.set(routeId, (routeCounts.get(routeId) ?? 0) + 1);
  }
  const selected = [...routeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (!selected) return state;
  const route = STRATEGIC_ROUTE_BY_ID[selected[0]];
  if (!route || !state.routeStates[route.id] || state.routeStates[route.id].condition <= 0) return state;

  const engagedPersonnel = participants.reduce((sum, group) => sum + group.personnel, 0) + defenderPersonnel;
  const intensity = clamp(engagedPersonnel / 9000 + operation.days / 12, 0, 1);
  const chance = clamp(0.12 + intensity * 0.34, 0.12, 0.48);
  const roll = randomFor(state.seed, state.turn, saltFor(operation.id) + 3203);
  if (roll >= chance) return state;
  const severity = 3 + Math.floor(intensity * 6) + Math.floor(randomFor(state.seed, state.turn, saltFor(operation.id) + 3911) * 7);
  return applyInfrastructureDamage(state, route.id, severity, 'combat');
}
''')

Path('src/components/InterdictionCommand.tsx').write_text(r'''import { useState } from 'react';
import { TERRITORIES } from '../game/data';
import {
  cancelInterdictionMission,
  frontierInterdictionRoutes,
  INTERDICTION_INTENSITIES,
  interdictionGroupsForRoute,
  interdictionMissionDemand,
  setInterdictionIntensity,
  startInterdictionMission
} from '../game/interdiction-missions';
import { STRATEGIC_ROUTE_BY_ID } from '../game/strategic-network-data';
import type { GameState, InterdictionIntensity } from '../game/types';

interface Props {
  state: GameState;
  onChange: (state: GameState | ((current: GameState) => GameState)) => void;
  onOpenTerritory: (territoryId: string) => void;
}

export function InterdictionCommand({ state, onChange, onOpenTerritory }: Props) {
  const [routeSelection, setRouteSelection] = useState('');
  const [groupSelection, setGroupSelection] = useState('');
  const [intensity, setIntensity] = useState<InterdictionIntensity>(50);

  const activeMissions = state.interdictionMissions.filter(mission => mission.status === 'active');
  const missionHistory = state.interdictionMissions.filter(mission => mission.status !== 'active').slice(0, 8);
  const routes = frontierInterdictionRoutes(state);
  const selectedRouteId = routes.some(route => route.id === routeSelection) ? routeSelection : routes[0]?.id ?? '';
  const selectedRoute = selectedRouteId ? STRATEGIC_ROUTE_BY_ID[selectedRouteId] : undefined;
  const groups = selectedRoute ? interdictionGroupsForRoute(state, selectedRoute.id) : [];
  const selectedGroupId = groups.some(group => group.id === groupSelection) ? groupSelection : groups[0]?.id ?? '';
  const totalDemand = activeMissions.reduce((sum, mission) => sum + interdictionMissionDemand(mission), 0);

  return <section className="command-view interdiction-view">
    <header className="command-view-header"><div><p className="panel-label">INTERDICTION</p><h2>Enemy infrastructure disruption</h2></div><p>Commit a frontier formation to raids and demolition against an enemy corridor. Greater intensity improves effect but increases supply demand, casualties and escalation.</p></header>

    <div className="interdiction-summary-strip">
      <div><span>Eligible corridors</span><strong>{routes.length}</strong></div>
      <div><span>Active missions</span><strong>{activeMissions.length}</strong></div>
      <div><span>Daily demand</span><strong>{totalDemand}</strong></div>
      <div><span>Historic successes</span><strong>{state.interdictionMissions.filter(mission => mission.status === 'succeeded').length}</strong></div>
    </div>

    <div className="interdiction-command-grid">
      <section className="view-panel interdiction-create-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW MISSION</p><strong>{routes.length}</strong></div>
        {selectedRoute ? <>
          <label>Enemy corridor
            <select value={selectedRouteId} onChange={event => { setRouteSelection(event.target.value); setGroupSelection(''); }}>
              {routes.map(route => {
                const enemyTerritory = state.territories[route.fromTerritoryId].controller === 'enemy' ? route.fromTerritoryId : route.toTerritoryId;
                return <option key={route.id} value={route.id}>{route.name} · {TERRITORIES[enemyTerritory].centre}</option>;
              })}
            </select>
          </label>
          <label>Assigned formation
            <select value={selectedGroupId} onChange={event => setGroupSelection(event.target.value)}>
              {groups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre} · {group.status}</option>)}
            </select>
          </label>
          <label>Mission intensity
            <select value={intensity} onChange={event => setIntensity(Number(event.target.value) as InterdictionIntensity)}>
              {INTERDICTION_INTENSITIES.map(value => <option key={value} value={value}>{value}% · demand {interdictionMissionDemand({ intensity: value })}</option>)}
            </select>
          </label>
          <div className="interdiction-route-preview">
            <strong>{selectedRoute.name}</strong>
            <span>{TERRITORIES[selectedRoute.fromTerritoryId].centre} ↔ {TERRITORIES[selectedRoute.toTerritoryId].centre}</span>
            <small>Current condition {Math.round(state.routeStates[selectedRoute.id].condition)}%. The assigned formation cannot move, attack or reorganise until the mission ends.</small>
          </div>
          <button className="primary danger-action" disabled={!selectedGroupId} onClick={() => onChange(current => startInterdictionMission(current, selectedRoute.id, selectedGroupId, intensity))}>Launch interdiction mission</button>
        </> : <div className="view-empty"><h3>No mission available</h3><p>A ready formation must be positioned at the controlled end of an operational frontier corridor.</p></div>}
      </section>

      <section className="view-panel interdiction-active-panel">
        <div className="view-panel-heading"><p className="panel-label">ACTIVE MISSIONS</p><strong>{activeMissions.length}</strong></div>
        {activeMissions.length ? <div className="interdiction-mission-list">{activeMissions.map(mission => {
          const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
          const group = state.taskGroups[mission.assignedTaskGroupId];
          const allocation = state.logistics.formationAllocations[mission.assignedTaskGroupId];
          const enemyTerritory = route ? (state.territories[route.fromTerritoryId].controller === 'enemy' ? route.fromTerritoryId : route.toTerritoryId) : null;
          return <article key={mission.id} className="interdiction-mission-card">
            <header><div><small>{mission.id}</small><h3>{route?.name ?? mission.routeId}</h3></div><b>{mission.progress}%</b></header>
            <div className="interdiction-progress"><i style={{ width: `${mission.progress}%` }} /></div>
            <dl>
              <div><dt>Formation</dt><dd>{group?.name ?? mission.assignedTaskGroupId}</dd></div>
              <div><dt>Enemy endpoint</dt><dd>{enemyTerritory ? TERRITORIES[enemyTerritory].centre : 'Unknown'}</dd></div>
              <div><dt>Supply delivery</dt><dd>{allocation?.ratio ?? 0}%</dd></div>
              <div><dt>Supply spent</dt><dd>{mission.supplySpent}</dd></div>
            </dl>
            <label>Mission intensity
              <select value={mission.intensity} onChange={event => onChange(current => setInterdictionIntensity(current, mission.id, Number(event.target.value) as InterdictionIntensity))}>
                {INTERDICTION_INTENSITIES.map(value => <option key={value} value={value}>{value}% · demand {interdictionMissionDemand({ intensity: value })}</option>)}
              </select>
            </label>
            <div className="interdiction-actions">
              {enemyTerritory && <button onClick={() => onOpenTerritory(enemyTerritory)}>Open target</button>}
              <button className="danger-action" onClick={() => onChange(current => cancelInterdictionMission(current, mission.id))}>Cancel mission</button>
            </div>
          </article>;
        })}</div> : <p className="empty-state">No formation is currently operating behind the enemy frontier.</p>}
      </section>

      <section className="view-panel interdiction-history-panel">
        <div className="view-panel-heading"><p className="panel-label">MISSION HISTORY</p><strong>{missionHistory.length}</strong></div>
        {missionHistory.length ? <div className="interdiction-history-list">{missionHistory.map(mission => {
          const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
          return <article key={mission.id} className={mission.status}><span><strong>{route?.name ?? mission.routeId}</strong><small>Day {String(mission.createdTurn).padStart(3, '0')} · damage {mission.damageInflicted} · casualties {mission.casualties}</small></span><b>{mission.status}</b></article>;
        })}</div> : <p className="empty-state">No interdiction mission has yet reached an outcome.</p>}
      </section>
    </div>
  </section>;
}
''')

Path('src/interdiction.css').write_text(r'''.infrastructure-command-stack {
  display: grid;
  gap: 18px;
}

.interdiction-summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.interdiction-summary-strip > div {
  background: rgba(7, 16, 27, 0.78);
  border: 1px solid rgba(142, 160, 181, 0.22);
  padding: 12px;
  display: grid;
  gap: 4px;
}

.interdiction-summary-strip span,
.interdiction-mission-card dt {
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.interdiction-summary-strip strong {
  font-size: 1.45rem;
}

.interdiction-command-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.85fr) minmax(340px, 1.35fr);
  gap: 14px;
}

.interdiction-history-panel {
  grid-column: 1 / -1;
}

.interdiction-create-panel,
.interdiction-mission-card {
  display: grid;
  gap: 12px;
}

.interdiction-create-panel label,
.interdiction-mission-card label {
  display: grid;
  gap: 6px;
}

.interdiction-route-preview {
  border-left: 3px solid #d38a47;
  background: rgba(211, 138, 71, 0.08);
  padding: 12px;
  display: grid;
  gap: 5px;
}

.interdiction-route-preview span,
.interdiction-route-preview small,
.interdiction-history-list small {
  color: var(--muted);
}

.interdiction-mission-list {
  display: grid;
  gap: 12px;
}

.interdiction-mission-card {
  border: 1px solid rgba(211, 138, 71, 0.32);
  background: rgba(10, 20, 33, 0.72);
  padding: 13px;
}

.interdiction-mission-card header,
.interdiction-actions,
.interdiction-history-list article {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.interdiction-mission-card header small {
  color: var(--muted);
}

.interdiction-mission-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.interdiction-mission-card dl div {
  background: rgba(255, 255, 255, 0.035);
  padding: 8px;
}

.interdiction-mission-card dd {
  margin: 3px 0 0;
}

.interdiction-progress {
  height: 7px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.interdiction-progress i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #b75f38, #e1a259);
}

.interdiction-history-list {
  display: grid;
  gap: 8px;
}

.interdiction-history-list article {
  padding: 10px 12px;
  border-left: 3px solid #758292;
  background: rgba(255, 255, 255, 0.035);
}

.interdiction-history-list article.succeeded { border-left-color: #5eab78; }
.interdiction-history-list article.failed { border-left-color: #c95f5f; }
.interdiction-history-list article.cancelled { border-left-color: #8b929d; }
.interdiction-history-list span { display: grid; gap: 3px; }
.interdiction-history-list b { text-transform: uppercase; font-size: 0.76rem; }

@media (max-width: 1050px) {
  .interdiction-command-grid { grid-template-columns: 1fr; }
  .interdiction-history-panel { grid-column: auto; }
}

@media (max-width: 700px) {
  .interdiction-summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .interdiction-mission-card dl { grid-template-columns: 1fr; }
  .interdiction-actions { align-items: stretch; flex-direction: column; }
}
''')

Path('docs/design/phase-08b4c-interdiction-combat-damage.md').write_text(r'''# Phase VIII-B4C — Interdiction Missions and Combat Damage

Version 11 extends infrastructure warfare beyond passive disruption and engineering repair.

## Player interdiction missions

A ready or garrison formation at the controlled end of a frontier corridor can be committed to an interdiction mission.

- Mission intensity can be set to 25%, 50%, 75% or 100%.
- Higher intensity accelerates preparation and increases the chance and severity of success.
- Higher intensity also increases logistics demand, casualty exposure and escalation.
- Assigned formations enter an interdicting status and cannot move, attack or reorganise.
- Missions can stall when delivered logistics falls below the critical threshold.
- Success damages the targeted route and records a player-interdiction infrastructure incident.
- Failure produces casualties and morale loss without damaging the corridor.
- Completed, failed and cancelled missions remain in persistent history.

## Combat-generated infrastructure damage

Every active territorial operation now has a deterministic chance to damage the strategic corridor used by the attacking formations.

The chance and severity scale with:

- total engaged personnel;
- number of days the operation has continued;
- deterministic campaign seed and operation identity.

Combat damage can reduce route capacity or block the corridor during a continuing operation, creating an immediate repair and logistics consequence.

## Persistence

Campaign saves advance to version 11. Version 10 and all earlier supported campaigns migrate with an empty interdiction-mission ledger.

## Interface

The existing Engineering command area now becomes a combined infrastructure workspace containing:

- engineering repair projects;
- frontier route selection;
- assigned formation and mission intensity;
- live mission preparation and supply delivery;
- mission outcomes, route damage and casualty history.

## Scope boundary

Manual supply and logistics priorities remain for Phase VIII-B4D.
''')

# --- Types ---------------------------------------------------------------------
replace('src/game/types.ts',
"export type InfrastructureIncidentCause = 'resistance' | 'enemy-interdiction' | 'combat';\nexport type EngineeringAllocation = 25 | 50 | 75 | 100;\nexport type EngineeringProjectStatus = 'active' | 'completed' | 'cancelled';\n",
"export type InfrastructureIncidentCause = 'resistance' | 'enemy-interdiction' | 'player-interdiction' | 'combat';\nexport type EngineeringAllocation = 25 | 50 | 75 | 100;\nexport type EngineeringProjectStatus = 'active' | 'completed' | 'cancelled';\nexport type InterdictionIntensity = 25 | 50 | 75 | 100;\nexport type InterdictionMissionStatus = 'active' | 'succeeded' | 'failed' | 'cancelled';\n")
replace('src/game/types.ts',
"  status: 'ready' | 'moving' | 'attacking' | 'garrison' | 'recovering' | 'engineering';\n",
"  status: 'ready' | 'moving' | 'attacking' | 'garrison' | 'recovering' | 'engineering' | 'interdicting';\n")
replace('src/game/types.ts',
"export interface InfrastructureIncident {\n",
"export interface InterdictionMission {\n  id: string;\n  routeId: string;\n  assignedTaskGroupId: string;\n  createdTurn: number;\n  progress: number;\n  intensity: InterdictionIntensity;\n  supplySpent: number;\n  casualties: number;\n  damageInflicted: number;\n  status: InterdictionMissionStatus;\n  returnStatus: 'ready' | 'garrison';\n}\n\nexport interface InfrastructureIncident {\n")
replace('src/game/types.ts', '  version: 10;\n', '  version: 11;\n')
replace('src/game/types.ts',
"  engineeringProjects: EngineeringProject[];\n  supply: number;\n",
"  engineeringProjects: EngineeringProject[];\n  interdictionMissions: InterdictionMission[];\n  supply: number;\n")

# --- Infrastructure incident source --------------------------------------------
replace('src/game/infrastructure-disruption.ts',
"    && (incident.cause === 'resistance' || incident.cause === 'enemy-interdiction' || incident.cause === 'combat')\n",
"    && (incident.cause === 'resistance' || incident.cause === 'enemy-interdiction' || incident.cause === 'player-interdiction' || incident.cause === 'combat')\n")
replace('src/game/infrastructure-disruption.ts',
"  const causeLabel = cause === 'resistance'\n    ? 'Resistance sabotage'\n    : cause === 'enemy-interdiction'\n      ? 'Enemy interdiction'\n      : 'Combat damage';\n",
"  const causeLabel = cause === 'resistance'\n    ? 'Resistance sabotage'\n    : cause === 'enemy-interdiction'\n      ? 'Enemy interdiction'\n      : cause === 'player-interdiction'\n        ? 'Player interdiction'\n        : 'Combat damage';\n")

# --- Logistics demand -----------------------------------------------------------
replace('src/game/supply-network.ts',
"  engineering: 1.32\n};\n",
"  engineering: 1.32,\n  interdicting: 1.38\n};\n")
replace('src/game/supply-network.ts',
"  engineering: 1.16\n};\n",
"  engineering: 1.16,\n  interdicting: 1.22\n};\n")
replace('src/game/supply-network.ts',
"    const engineeringProject = state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === group.id);\n    const engineeringDemand = engineeringProject ? Math.max(3, Math.ceil(engineeringProject.allocation / 8)) : 0;\n    requests.push({\n",
"    const engineeringProject = state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === group.id);\n    const engineeringDemand = engineeringProject ? Math.max(3, Math.ceil(engineeringProject.allocation / 8)) : 0;\n    const interdictionMission = state.interdictionMissions.find(mission => mission.status === 'active' && mission.assignedTaskGroupId === group.id);\n    const interdictionDemand = interdictionMission ? Math.max(5, Math.ceil(interdictionMission.intensity / 8)) : 0;\n    requests.push({\n")
replace('src/game/supply-network.ts',
"      demand: formationSupplyDemand(group) + engineeringDemand,\n",
"      demand: formationSupplyDemand(group) + engineeringDemand + interdictionDemand,\n")

# --- Strategic migration --------------------------------------------------------
replace('src/game/strategic-response.ts',
"import { normaliseEngineeringState } from './engineering-projects';\n",
"import { normaliseEngineeringState } from './engineering-projects';\nimport { normaliseInterdictionState } from './interdiction-missions';\n")
replace('src/game/strategic-response.ts',
"  | 'engineeringProjects';\n",
"  | 'engineeringProjects'\n  | 'interdictionMissions';\n")
replace('src/game/strategic-response.ts',
"  engineeringProjects?: GameState['engineeringProjects'];\n};\n",
"  engineeringProjects?: GameState['engineeringProjects'];\n  interdictionMissions?: GameState['interdictionMissions'];\n};\n")
replace('src/game/strategic-response.ts',
"  const engineering = normaliseEngineeringState(state.engineeringProjects, routedTaskGroups, routeStates);\n  const upgraded = {\n",
"  const engineering = normaliseEngineeringState(state.engineeringProjects, routedTaskGroups, routeStates);\n  const interdiction = normaliseInterdictionState(state.interdictionMissions, engineering.taskGroups, { territories: state.territories, routeStates });\n  const upgraded = {\n")
replace('src/game/strategic-response.ts',
"    version: 10,\n    taskGroups: engineering.taskGroups,\n",
"    version: 11,\n    taskGroups: interdiction.taskGroups,\n")
replace('src/game/strategic-response.ts',
"    engineeringProjects: engineering.projects,\n",
"    engineeringProjects: engineering.projects,\n    interdictionMissions: interdiction.missions,\n")

# --- Engine integration and migration ------------------------------------------
replace('src/game/engine.ts',
"import { resolveEngineeringProjects } from './engineering-projects';\n",
"import { resolveEngineeringProjects } from './engineering-projects';\nimport { resolveInterdictionMissions, resolveOperationCombatDamage } from './interdiction-missions';\n")
replace('src/game/engine.ts',
"const SAVE_KEY = 'future-conquest-slice-v0.10';\nconst LEGACY_V9_SAVE_KEY = 'future-conquest-slice-v0.9';\n",
"const SAVE_KEY = 'future-conquest-slice-v0.11';\nconst LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';\nconst LEGACY_V9_SAVE_KEY = 'future-conquest-slice-v0.9';\n")
replace('src/game/engine.ts', '    version: 10,\n', '    version: 11,\n')
replace('src/game/engine.ts',
"    engineeringProjects: [],\n    supply: 100,\n",
"    engineeringProjects: [],\n    interdictionMissions: [],\n    supply: 100,\n")
replace('src/game/engine.ts',
"    const remainingDefenders = operation.enemyFormationIds.reduce((sum, id) => sum + (enemyFormations[id]?.personnel ?? 0), 0);\n",
"    next = resolveOperationCombatDamage(next, operation, participants, defender.personnel);\n    const remainingDefenders = operation.enemyFormationIds.reduce((sum, id) => sum + (enemyFormations[id]?.personnel ?? 0), 0);\n")
replace('src/game/engine.ts',
"    engineeringProjects: structuredClone(state.engineeringProjects),\n    events: [...state.events]\n",
"    engineeringProjects: structuredClone(state.engineeringProjects),\n    interdictionMissions: structuredClone(state.interdictionMissions),\n    events: [...state.events]\n")
replace('src/game/engine.ts',
"  next = resolveEngineeringProjects(next);\n  next = resolveMovement(next);\n",
"  next = resolveEngineeringProjects(next);\n  next = resolveInterdictionMissions(next);\n  next = resolveMovement(next);\n")
replace('src/game/engine.ts',
"type EngineeringField = 'engineeringProjects';\n\ntype LegacyV9GameState",
"type EngineeringField = 'engineeringProjects';\ntype InterdictionField = 'interdictionMissions';\n\ntype LegacyV10GameState = Omit<GameState, 'version' | InterdictionField> & { version: 10 };\ntype LegacyV9GameState")
for version in ['LegacyV9GameState', 'LegacyV8GameState', 'LegacyV7GameState', 'LegacyV6GameState', 'LegacyV5GameState', 'LegacyV4GameState', 'LegacyV3GameState']:
    path = Path('src/game/engine.ts')
    text = path.read_text()
    pattern = rf"type {version} = Omit<GameState, ([^;]+)> &"
    match = re.search(pattern, text)
    if match and 'InterdictionField' not in match.group(1):
        replacement = f"type {version} = Omit<GameState, {match.group(1)} | InterdictionField> &"
        text = text[:match.start()] + replacement + text[match.end():]
        path.write_text(text)
replace('src/game/engine.ts',
"type LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField> & {\n",
"type LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & {\n")
replace('src/game/engine.ts',
"      parsed.version === 10\n",
"      parsed.version === 11\n")
replace('src/game/engine.ts',
"      && parsed.engineeringProjects\n    ) return upgradeStrategicState(parsed as GameState);\n  }\n\n  const v9 = localStorage.getItem(LEGACY_V9_SAVE_KEY);\n",
"      && parsed.engineeringProjects\n      && parsed.interdictionMissions\n    ) return upgradeStrategicState(parsed as GameState);\n  }\n\n  const v10 = localStorage.getItem(LEGACY_V10_SAVE_KEY);\n  if (v10) {\n    const parsed = JSON.parse(v10) as Partial<LegacyV10GameState>;\n    if (\n      parsed.version === 10\n      && parsed.taskGroups\n      && parsed.enemyFormations\n      && parsed.operations\n      && parsed.mobilisations\n      && parsed.enemyOrders\n      && parsed.intelligenceReports\n      && parsed.routeStates\n      && parsed.logistics\n      && parsed.infrastructureIncidents\n      && parsed.engineeringProjects\n    ) return upgradeStrategicState(parsed as LegacyV10GameState);\n  }\n\n  const v9 = localStorage.getItem(LEGACY_V9_SAVE_KEY);\n")

# --- Persistence module ---------------------------------------------------------
replace('src/game/persistence.ts',
"export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.10';\nexport const SAVE_METADATA_KEY = 'future-conquest-slice-v0.10-metadata';\nexport const LEGACY_V9_SAVE_KEY = 'future-conquest-slice-v0.9';\n",
"export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.11';\nexport const SAVE_METADATA_KEY = 'future-conquest-slice-v0.11-metadata';\nexport const LEGACY_V10_SAVE_KEY = 'future-conquest-slice-v0.10';\nexport const LEGACY_V9_SAVE_KEY = 'future-conquest-slice-v0.9';\n")
replace('src/game/persistence.ts', '  saveVersion: 10;\n', '  saveVersion: 11;\n')
replace('src/game/persistence.ts',
"source: 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'",
"source: 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'")
replace('src/game/persistence.ts',
"type EngineeringField = 'engineeringProjects';\n\ntype LegacyV9State",
"type EngineeringField = 'engineeringProjects';\ntype InterdictionField = 'interdictionMissions';\n\ntype LegacyV10State = Omit<GameState, 'version' | InterdictionField> & { version: 10 };\ntype LegacyV9State")
for version in ['LegacyV9State', 'LegacyV8State', 'LegacyV7State', 'LegacyV6State', 'LegacyV5State', 'LegacyV4State', 'LegacyV3State']:
    path = Path('src/game/persistence.ts')
    text = path.read_text()
    pattern = rf"type {version} = Omit<GameState, ([^;]+)> &"
    match = re.search(pattern, text)
    if match and 'InterdictionField' not in match.group(1):
        replacement = f"type {version} = Omit<GameState, {match.group(1)} | InterdictionField> &"
        text = text[:match.start()] + replacement + text[match.end():]
        path.write_text(text)
replace('src/game/persistence.ts',
"type LegacyV2State = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField> & {\n",
"type LegacyV2State = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField | EngineeringField | InterdictionField> & {\n")
replace('src/game/persistence.ts',
"function isV10State(value: unknown): value is GameState {\n  return hasCoreCampaignState(value)\n    && value.version === 10\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics)\n    && Array.isArray(value.infrastructureIncidents)\n    && Array.isArray(value.engineeringProjects);\n}\n\nfunction isV9State",
"function isV11State(value: unknown): value is GameState {\n  return hasCoreCampaignState(value)\n    && value.version === 11\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics)\n    && Array.isArray(value.infrastructureIncidents)\n    && Array.isArray(value.engineeringProjects)\n    && Array.isArray(value.interdictionMissions);\n}\n\nfunction isV10State(value: unknown): value is LegacyV10State {\n  return hasCoreCampaignState(value)\n    && value.version === 10\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics)\n    && Array.isArray(value.infrastructureIncidents)\n    && Array.isArray(value.engineeringProjects);\n}\n\nfunction isV9State")
replace('src/game/persistence.ts', '    saveVersion: 10,\n', '    saveVersion: 11,\n')
replace('src/game/persistence.ts', '    && value.saveVersion === 10\n', '    && value.saveVersion === 11\n')
replace('src/game/persistence.ts',
"function inspectRaw(storage: StorageReader, raw: string, source: 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'): SaveInspection {\n",
"function inspectRaw(storage: StorageReader, raw: string, source: 'v11' | 'v10' | 'v9' | 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'): SaveInspection {\n")
replace('src/game/persistence.ts',
"    if (source === 'v10' && isV10State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v9'",
"    if (source === 'v11' && isV11State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v10' && isV10State(parsed)) {\n      const state = upgradeStrategicState(parsed);\n      return { ok: true, state, metadata: createSaveMetadata(state, null), source };\n    }\n    if (source === 'v9'")
replace('src/game/persistence.ts',
"  if (current) return inspectRaw(storage, current, 'v10');\n\n  const v9 = readRaw(storage, LEGACY_V9_SAVE_KEY);\n",
"  if (current) return inspectRaw(storage, current, 'v11');\n\n  const v10 = readRaw(storage, LEGACY_V10_SAVE_KEY);\n  if (typeof v10 !== 'string' && v10 !== null) return v10;\n  if (v10) return inspectRaw(storage, v10, 'v10');\n\n  const v9 = readRaw(storage, LEGACY_V9_SAVE_KEY);\n")
replace('src/game/persistence.ts',
"    if (!isV10State(parsed)) return { ok: false, code: 'corrupt', message: 'The campaign save could not be verified.' };\n",
"    if (!isV11State(parsed)) return { ok: false, code: 'corrupt', message: 'The campaign save could not be verified.' };\n")

# --- Interface ------------------------------------------------------------------
replace('src/App.tsx',
"import { EngineeringCommand } from './components/EngineeringCommand';\n",
"import { EngineeringCommand } from './components/EngineeringCommand';\nimport { InterdictionCommand } from './components/InterdictionCommand';\n")
replace('src/App.tsx',
"  const selectedEngineeringProject = selectedGroup ? state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === selectedGroup.id) : undefined;\n",
"  const selectedEngineeringProject = selectedGroup ? state.engineeringProjects.find(project => project.status === 'active' && project.assignedTaskGroupId === selectedGroup.id) : undefined;\n  const selectedInterdictionMission = selectedGroup ? state.interdictionMissions.find(mission => mission.status === 'active' && mission.assignedTaskGroupId === selectedGroup.id) : undefined;\n")
replace('src/App.tsx',
"    if (selectedEngineeringProject) return `${selectedGroup.name} is repairing ${STRATEGIC_ROUTE_BY_ID[selectedEngineeringProject.routeId]?.name ?? selectedEngineeringProject.routeId} at ${selectedEngineeringProject.allocation}% allocation.`;\n",
"    if (selectedEngineeringProject) return `${selectedGroup.name} is repairing ${STRATEGIC_ROUTE_BY_ID[selectedEngineeringProject.routeId]?.name ?? selectedEngineeringProject.routeId} at ${selectedEngineeringProject.allocation}% allocation.`;\n    if (selectedInterdictionMission) return `${selectedGroup.name} is preparing an interdiction mission against ${STRATEGIC_ROUTE_BY_ID[selectedInterdictionMission.routeId]?.name ?? selectedInterdictionMission.routeId} at ${selectedInterdictionMission.intensity}% intensity.`;\n")
replace('src/App.tsx',
"  }, [chosenRoute, selectedEngineeringProject, selectedGroup, selectedOperation, target, targetInfo, targetOperation]);\n",
"  }, [chosenRoute, selectedEngineeringProject, selectedGroup, selectedInterdictionMission, selectedOperation, target, targetInfo, targetOperation]);\n")
replace('src/App.tsx', 'PHASE VIII-B4B / ENGINEERING PROJECTS', 'PHASE VIII-B4C / INTERDICTION AND COMBAT DAMAGE')
replace('src/App.tsx',
"badges={{ forces: groups.length, operations: operations.length, territories: `${controlled}/${territoryDefinitions.length}`, engineering: state.engineeringProjects.filter(project => project.status === 'active').length, intelligence: frontlineTerritories.length }}",
"badges={{ forces: groups.length, operations: operations.length, territories: `${controlled}/${territoryDefinitions.length}`, engineering: state.engineeringProjects.filter(project => project.status === 'active').length + state.interdictionMissions.filter(mission => mission.status === 'active').length, intelligence: frontlineTerritories.length }}")
replace('src/App.tsx',
"        {currentView === 'engineering' && <EngineeringCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />}\n",
"        {currentView === 'engineering' && <div className=\"infrastructure-command-stack\">\n          <EngineeringCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n          <InterdictionCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n        </div>}\n")
replace('src/App.tsx',
"                <div><dt>Engineering projects</dt><dd>{state.engineeringProjects.filter(project => project.status === 'active').length}</dd></div>\n",
"                <div><dt>Engineering projects</dt><dd>{state.engineeringProjects.filter(project => project.status === 'active').length}</dd></div>\n                <div><dt>Interdiction missions</dt><dd>{state.interdictionMissions.filter(mission => mission.status === 'active').length}</dd></div>\n")
replace('src/main.tsx',
"import './engineering.css';\n",
"import './engineering.css';\nimport './interdiction.css';\n")

# --- Existing tests advance current-version assertions -------------------------
for test_file in Path('tests').glob('*.test.cjs'):
    text = test_file.read_text()
    text = re.sub(r"(\.version\s*,\s*)10(\s*\))", r"\g<1>11\2", text)
    text = re.sub(r"(\.saveVersion\s*,\s*)10(\s*\))", r"\g<1>11\2", text)
    text = text.replace('PHASE VIII-B4B \\/ ENGINEERING PROJECTS', 'PHASE VIII-B4C \\/ INTERDICTION AND COMBAT DAMAGE')
    text = text.replace('PHASE VIII-B4B / ENGINEERING PROJECTS', 'PHASE VIII-B4C / INTERDICTION AND COMBAT DAMAGE')
    test_file.write_text(text)

Path('tests/interdiction-viii-b4c.test.cjs').write_text(r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { newGame } = require('../.test-dist/game/engine.js');
const {
  frontierInterdictionRoutes,
  interdictionGroupsForRoute,
  interdictionMissionDemand,
  resolveInterdictionMissions,
  resolveOperationCombatDamage,
  startInterdictionMission
} = require('../.test-dist/game/interdiction-missions.js');
const { upgradeStrategicState } = require('../.test-dist/game/strategic-response.js');

function availableMission(seed = 11) {
  const state = newGame(seed);
  const route = frontierInterdictionRoutes(state)[0];
  assert.ok(route, 'expected a frontier route');
  const group = interdictionGroupsForRoute(state, route.id)[0];
  assert.ok(group, 'expected an eligible formation');
  return { state, route, group };
}

test('new campaigns initialise version 11 interdiction state', () => {
  const state = newGame(21);
  assert.equal(state.version, 11);
  assert.deepEqual(state.interdictionMissions, []);
});

test('starting an interdiction mission commits a frontier formation and increases logistics demand', () => {
  const { state, route, group } = availableMission(31);
  const before = state.logistics.formationAllocations[group.id].demand;
  const next = startInterdictionMission(state, route.id, group.id, 100);
  assert.equal(next.interdictionMissions.length, 1);
  assert.equal(next.interdictionMissions[0].status, 'active');
  assert.equal(next.taskGroups[group.id].status, 'interdicting');
  assert.equal(next.logistics.formationAllocations[group.id].demand, before + interdictionMissionDemand({ intensity: 100 }));
});

test('a supplied interdiction mission reaches a persistent outcome and releases its formation', () => {
  let resolved = null;
  for (let seed = 1; seed <= 120 && !resolved; seed += 1) {
    const { state, route, group } = availableMission(seed);
    let missionState = startInterdictionMission(state, route.id, group.id, 100);
    missionState.interdictionMissions[0].progress = 99;
    missionState.logistics.formationAllocations[group.id].ratio = 100;
    const next = resolveInterdictionMissions(missionState);
    if (next.interdictionMissions[0].status !== 'active') resolved = { before: missionState, next, route, group };
  }
  assert.ok(resolved, 'expected a terminal mission result');
  const mission = resolved.next.interdictionMissions[0];
  assert.ok(mission.status === 'succeeded' || mission.status === 'failed');
  assert.notEqual(resolved.next.taskGroups[resolved.group.id].status, 'interdicting');
  if (mission.status === 'succeeded') {
    assert.ok(resolved.next.routeStates[resolved.route.id].condition < resolved.before.routeStates[resolved.route.id].condition);
    assert.equal(resolved.next.infrastructureIncidents[0].cause, 'player-interdiction');
    assert.ok(mission.damageInflicted > 0);
  } else {
    assert.ok(mission.casualties > 0);
  }
});

test('active territorial combat can generate persistent route damage', () => {
  let damaged = null;
  for (let seed = 1; seed <= 200 && !damaged; seed += 1) {
    const state = newGame(seed);
    const route = frontierInterdictionRoutes(state)[0];
    if (!route) continue;
    const group = Object.values(state.taskGroups)[0];
    group.order = { type: 'attack', target: route.toTerritoryId, progress: 10, days: 1, routeId: route.id, operationId: 'OP-TEST' };
    group.status = 'attacking';
    const operation = { id: 'OP-TEST', target: route.toTerritoryId, participantGroupIds: [group.id], origins: { [group.id]: group.location }, progress: 10, days: 7, enemyFormationIds: [], enemyPower: 10 };
    const next = resolveOperationCombatDamage(state, operation, [group], 12000);
    if (next.routeStates[route.id].condition < state.routeStates[route.id].condition) damaged = { next, route };
  }
  assert.ok(damaged, 'expected deterministic combat damage within the seed range');
  assert.equal(damaged.next.infrastructureIncidents[0].cause, 'combat');
});

test('version 10 campaigns migrate to version 11 with an empty interdiction ledger', () => {
  const current = newGame(51);
  const { interdictionMissions, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 10 });
  assert.equal(migrated.version, 11);
  assert.deepEqual(migrated.interdictionMissions, []);
});

test('the interface exposes the Phase VIII-B4C infrastructure warfare controls', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const component = fs.readFileSync('src/components/InterdictionCommand.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(app, /PHASE VIII-B4C \/ INTERDICTION AND COMBAT DAMAGE/);
  assert.match(app, /<InterdictionCommand/);
  assert.match(component, /Launch interdiction mission/);
  assert.match(component, /Mission intensity/);
  assert.match(main, /interdiction\.css/);
});
''')
