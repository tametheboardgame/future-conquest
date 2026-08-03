import { useState } from 'react';
import { TERRITORIES } from '../game/data';
import {
  cancelEngineeringProject,
  ENGINEERING_ALLOCATIONS,
  engineeringGroupsForRoute,
  engineeringProjectDemand,
  repairableEngineeringRoutes,
  setEngineeringAllocation,
  startEngineeringProject
} from '../game/engineering-projects';
import { STRATEGIC_ROUTE_BY_ID } from '../game/strategic-network-data';
import type { EngineeringAllocation, GameState } from '../game/types';

interface Props {
  state: GameState;
  onChange: (state: GameState | ((current: GameState) => GameState)) => void;
  onOpenTerritory: (territoryId: string) => void;
}

export function EngineeringCommand({ state, onChange, onOpenTerritory }: Props) {
  const [routeSelection, setRouteSelection] = useState('');
  const [groupSelection, setGroupSelection] = useState('');
  const [allocation, setAllocation] = useState<EngineeringAllocation>(50);

  const activeProjects = state.engineeringProjects.filter(project => project.status === 'active');
  const projectHistory = state.engineeringProjects.filter(project => project.status !== 'active').slice(0, 8);
  const repairableRoutes = repairableEngineeringRoutes(state);
  const selectedRouteId = repairableRoutes.some(route => route.id === routeSelection)
    ? routeSelection
    : repairableRoutes[0]?.id ?? '';
  const selectedRoute = selectedRouteId ? STRATEGIC_ROUTE_BY_ID[selectedRouteId] : undefined;
  const eligibleGroups = selectedRoute ? engineeringGroupsForRoute(state, selectedRoute.id) : [];
  const selectedGroupId = eligibleGroups.some(group => group.id === groupSelection)
    ? groupSelection
    : eligibleGroups[0]?.id ?? '';
  const damagedRouteCount = Object.values(state.routeStates).filter(route => route.condition < 100).length;
  const allocatedEffort = activeProjects.reduce((sum, project) => sum + project.allocation, 0);
  const dailyDemand = activeProjects.reduce((sum, project) => sum + engineeringProjectDemand(project), 0);

  return <section className="command-view engineering-view">
    <header className="command-view-header"><div><p className="panel-label">ENGINEERING</p><h2>Infrastructure repair command</h2></div><p>Assign formations and logistics effort to damaged strategic corridors. Higher allocation repairs faster but consumes more network throughput.</p></header>

    <div className="engineering-summary-strip">
      <div><span>Damaged corridors</span><strong>{damagedRouteCount}</strong></div>
      <div><span>Active projects</span><strong>{activeProjects.length}</strong></div>
      <div><span>Allocated effort</span><strong>{allocatedEffort}%</strong></div>
      <div><span>Daily repair demand</span><strong>{dailyDemand}</strong></div>
    </div>

    <div className="engineering-command-grid">
      <section className="view-panel engineering-create-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW REPAIR PROJECT</p><strong>{repairableRoutes.length}</strong></div>
        {selectedRoute ? <>
<label>Damaged corridor
  <select value={selectedRouteId} onChange={event => { setRouteSelection(event.target.value); setGroupSelection(''); }}>
    {repairableRoutes.map(route => <option key={route.id} value={route.id}>{route.name} · {Math.round(state.routeStates[route.id].condition)}%</option>)}
  </select>
</label>
<label>Assigned formation
  <select value={selectedGroupId} onChange={event => setGroupSelection(event.target.value)}>
    {eligibleGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre} · {group.status}</option>)}
  </select>
</label>
<label>Engineering allocation
  <select value={allocation} onChange={event => setAllocation(Number(event.target.value) as EngineeringAllocation)}>
    {ENGINEERING_ALLOCATIONS.map(value => <option key={value} value={value}>{value}% · {engineeringProjectDemand({ allocation: value })} daily demand</option>)}
  </select>
</label>
<div className="engineering-route-preview">
  <strong>{selectedRoute.name}</strong>
  <span>{TERRITORIES[selectedRoute.fromTerritoryId].centre} → {TERRITORIES[selectedRoute.toTerritoryId].centre}</span>
  <div className="engineering-progress"><i style={{ width: `${state.routeStates[selectedRoute.id].condition}%` }} /></div>
  <small>Current condition {Math.round(state.routeStates[selectedRoute.id].condition)}%. Assigned formations cannot move or attack while engineering work is active.</small>
</div>
<button className="primary" disabled={!selectedGroupId} onClick={() => onChange(current => startEngineeringProject(current, selectedRoute.id, selectedGroupId, allocation))}>Start repair project</button>
        </> : <div className="view-empty"><h3>No repair project available</h3><p>Every controlled corridor is either fully operational, already assigned or inaccessible to a ready formation.</p></div>}
      </section>

      <section className="view-panel engineering-project-panel">
        <div className="view-panel-heading"><p className="panel-label">ACTIVE PROJECTS</p><strong>{activeProjects.length}</strong></div>
        {activeProjects.length ? <div className="engineering-project-list">{activeProjects.map(project => {
const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
const group = state.taskGroups[project.assignedTaskGroupId];
const routeState = state.routeStates[project.routeId];
const allocation = state.logistics.formationAllocations[project.assignedTaskGroupId];
return <article key={project.id} className="engineering-project-card">
  <header><div><small>{project.id}</small><h3>{route?.name ?? project.routeId}</h3></div><b>{project.progress}%</b></header>
  <div className="engineering-progress"><i style={{ width: `${project.progress}%` }} /></div>
  <dl>
    <div><dt>Assigned formation</dt><dd>{group?.name ?? project.assignedTaskGroupId}</dd></div>
    <div><dt>Route condition</dt><dd>{Math.round(routeState?.condition ?? 0)}%</dd></div>
    <div><dt>Supply delivery</dt><dd>{allocation?.ratio ?? 0}%</dd></div>
    <div><dt>Supply spent</dt><dd>{project.supplySpent}</dd></div>
  </dl>
  <label>Repair allocation
    <select value={project.allocation} onChange={event => onChange(current => setEngineeringAllocation(current, project.id, Number(event.target.value) as EngineeringAllocation))}>
      {ENGINEERING_ALLOCATIONS.map(value => <option key={value} value={value}>{value}% · demand {engineeringProjectDemand({ allocation: value })}</option>)}
    </select>
  </label>
  <div className="engineering-project-actions">
    {route && <button onClick={() => onOpenTerritory(route.fromTerritoryId)}>Open corridor</button>}
    <button className="danger-action" onClick={() => onChange(current => cancelEngineeringProject(current, project.id))}>Cancel project</button>
  </div>
</article>;
        })}</div> : <p className="empty-state">No formation is currently committed to infrastructure repair.</p>}
      </section>

      <section className="view-panel engineering-history-panel">
        <div className="view-panel-heading"><p className="panel-label">PROJECT HISTORY</p><strong>{projectHistory.length}</strong></div>
        {projectHistory.length ? <div className="engineering-history-list">{projectHistory.map(project => {
const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
return <article key={project.id} className={project.status}><span><strong>{route?.name ?? project.routeId}</strong><small>Started day {String(project.createdTurn).padStart(3, '0')} · {project.supplySpent} supply spent</small></span><b>{project.status}</b></article>;
        })}</div> : <p className="empty-state">No engineering projects have yet been completed or cancelled.</p>}
      </section>
    </div>
  </section>;
}
