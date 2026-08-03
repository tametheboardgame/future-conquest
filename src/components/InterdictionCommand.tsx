import { useState } from 'react';
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
