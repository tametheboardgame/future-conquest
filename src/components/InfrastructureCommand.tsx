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
import type { EngineeringAllocation, GameState, InterdictionIntensity } from '../game/types';

interface Props {
  state: GameState;
  onChange: (state: GameState | ((current: GameState) => GameState)) => void;
  onOpenTerritory: (territoryId: string) => void;
}

type InfrastructureTab = 'overview' | 'repair' | 'interdict' | 'history';

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);
const dayLabel = (days: number | null) => days === null ? 'Stalled' : `~${days} day${days === 1 ? '' : 's'}`;

function engineeringDailyWork(allocation: EngineeringAllocation, deliveryPercent: number): number {
  const deliveryRatio = Math.max(0, Math.min(1, deliveryPercent / 100));
  if (deliveryRatio < 0.15) return 0;
  return Math.max(1, Math.floor((allocation / 10) * deliveryRatio));
}

function repairEta(condition: number, allocation: EngineeringAllocation, deliveryPercent: number): number | null {
  const work = engineeringDailyWork(allocation, deliveryPercent);
  return work > 0 ? Math.max(1, Math.ceil((100 - condition) / work)) : null;
}

function interdictionDailyProgress(intensity: InterdictionIntensity, deliveryPercent: number): number {
  const deliveryRatio = Math.max(0, Math.min(1, deliveryPercent / 100));
  if (deliveryRatio < 0.15) return 0;
  return Math.max(6, Math.floor((13 + intensity / 3.5) * deliveryRatio));
}

function interdictionEta(progress: number, intensity: InterdictionIntensity, deliveryPercent: number): number | null {
  const daily = interdictionDailyProgress(intensity, deliveryPercent);
  return daily > 0 ? Math.max(1, Math.ceil((100 - progress) / daily)) : null;
}

function intensityLabel(value: InterdictionIntensity): string {
  if (value === 25) return 'Cautious';
  if (value === 50) return 'Routine';
  if (value === 75) return 'Aggressive';
  return 'Maximum';
}

export function InfrastructureCommand({ state, onChange, onOpenTerritory }: Props) {
  const [activeTab, setActiveTab] = useState<InfrastructureTab>('overview');
  const [repairRouteSelection, setRepairRouteSelection] = useState('');
  const [repairGroupSelection, setRepairGroupSelection] = useState('');
  const [repairAllocation, setRepairAllocation] = useState<EngineeringAllocation>(50);
  const [interdictionRouteSelection, setInterdictionRouteSelection] = useState('');
  const [interdictionGroupSelection, setInterdictionGroupSelection] = useState('');
  const [interdictionIntensity, setInterdictionIntensityState] = useState<InterdictionIntensity>(50);

  const activeRepairs = state.engineeringProjects.filter(project => project.status === 'active');
  const activeInterdictions = state.interdictionMissions.filter(mission => mission.status === 'active');
  const repairRoutes = repairableEngineeringRoutes(state);
  const interdictionRoutes = frontierInterdictionRoutes(state);
  const damagedRoutes = Object.entries(state.routeStates)
    .filter(([, routeState]) => routeState.condition < 100)
    .flatMap(([routeId]) => STRATEGIC_ROUTE_BY_ID[routeId] ? [STRATEGIC_ROUTE_BY_ID[routeId]] : []);
  const bottlenecks = state.logistics.bottleneckRouteIds.length;

  const repairRouteId = repairRoutes.some(route => route.id === repairRouteSelection)
    ? repairRouteSelection
    : repairRoutes[0]?.id ?? '';
  const repairRoute = repairRouteId ? STRATEGIC_ROUTE_BY_ID[repairRouteId] : undefined;
  const repairGroups = repairRoute ? engineeringGroupsForRoute(state, repairRoute.id) : [];
  const repairGroupId = repairGroups.some(group => group.id === repairGroupSelection)
    ? repairGroupSelection
    : repairGroups[0]?.id ?? '';
  const repairGroup = repairGroupId ? state.taskGroups[repairGroupId] : undefined;
  const repairDelivery = repairGroup ? state.logistics.formationAllocations[repairGroup.id]?.ratio ?? 0 : 0;
  const repairCondition = repairRoute ? state.routeStates[repairRoute.id]?.condition ?? 0 : 0;
  const repairDaily = repairRoute && repairGroup ? engineeringDailyWork(repairAllocation, repairDelivery) : 0;
  const repairDays = repairRoute && repairGroup ? repairEta(repairCondition, repairAllocation, repairDelivery) : null;
  const repairFlow = repairRoute ? state.logistics.routeFlows[repairRoute.id] : undefined;

  const interdictionRouteId = interdictionRoutes.some(route => route.id === interdictionRouteSelection)
    ? interdictionRouteSelection
    : interdictionRoutes[0]?.id ?? '';
  const interdictionRoute = interdictionRouteId ? STRATEGIC_ROUTE_BY_ID[interdictionRouteId] : undefined;
  const interdictionGroups = interdictionRoute ? interdictionGroupsForRoute(state, interdictionRoute.id) : [];
  const interdictionGroupId = interdictionGroups.some(group => group.id === interdictionGroupSelection)
    ? interdictionGroupSelection
    : interdictionGroups[0]?.id ?? '';
  const interdictionGroup = interdictionGroupId ? state.taskGroups[interdictionGroupId] : undefined;
  const interdictionDelivery = interdictionGroup ? state.logistics.formationAllocations[interdictionGroup.id]?.ratio ?? 0 : 0;
  const interdictionDays = interdictionRoute && interdictionGroup
    ? interdictionEta(0, interdictionIntensity, interdictionDelivery)
    : null;
  const damageMinimum = 8 + Math.floor(interdictionIntensity / 7);
  const damageMaximum = damageMinimum + 8;
  const escalationSuccess = 0.45 + interdictionIntensity / 80;
  const escalationFailure = 0.25 + interdictionIntensity / 220;

  const tabs: Array<{ id: InfrastructureTab; label: string; badge?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'repair', label: 'Repair', badge: activeRepairs.length || repairRoutes.length },
    { id: 'interdict', label: 'Interdict', badge: activeInterdictions.length || interdictionRoutes.length },
    { id: 'history', label: 'History', badge: state.engineeringProjects.filter(project => project.status !== 'active').length + state.interdictionMissions.filter(mission => mission.status !== 'active').length }
  ];

  const history = [
    ...state.engineeringProjects.filter(project => project.status !== 'active').map(project => ({
      id: `repair-${project.id}`,
      kind: 'REPAIR',
      routeId: project.routeId,
      turn: project.createdTurn,
      status: project.status,
      detail: `${project.supplySpent} supply spent · ${project.progress}% project progress`
    })),
    ...state.interdictionMissions.filter(mission => mission.status !== 'active').map(mission => ({
      id: `interdict-${mission.id}`,
      kind: 'INTERDICTION',
      routeId: mission.routeId,
      turn: mission.createdTurn,
      status: mission.status,
      detail: `${mission.supplySpent} supply spent · ${mission.damageInflicted} damage · ${mission.casualties} casualties`
    }))
  ].sort((first, second) => second.turn - first.turn).slice(0, 16);

  return <section className="command-view infrastructure-view" data-wp7-infrastructure="true">
    <header className="command-view-header infrastructure-command-header">
      <div><p className="panel-label">INFRASTRUCTURE</p><h2>Strategic infrastructure command</h2></div>
      <p>Repair friendly corridors to recover movement and supply capacity, or commit frontier formations to disrupt enemy routes. Both actions tie up a formation until the work ends.</p>
    </header>

    <div className="infrastructure-summary-strip">
      <div><span>Damaged routes</span><strong>{damagedRoutes.length}</strong></div>
      <div><span>Network bottlenecks</span><strong>{bottlenecks}</strong></div>
      <div><span>Active repairs</span><strong>{activeRepairs.length}</strong></div>
      <div><span>Active interdictions</span><strong>{activeInterdictions.length}</strong></div>
    </div>

    <nav className="infrastructure-tabs" aria-label="Infrastructure command modes">
      {tabs.map(tab => <button
        type="button"
        key={tab.id}
        className={activeTab === tab.id ? 'active' : ''}
        aria-current={activeTab === tab.id ? 'page' : undefined}
        onClick={() => setActiveTab(tab.id)}
      ><span>{tab.label}</span>{tab.badge ? <b>{tab.badge}</b> : null}</button>)}
    </nav>

    {activeTab === 'overview' && <div className="infrastructure-tab-panel infrastructure-overview-grid">
      <section className="view-panel infrastructure-choice-card repair-choice" data-tutorial="infrastructure-repair">
        <div className="view-panel-heading"><p className="panel-label">FRIENDLY NETWORK</p><strong>{repairRoutes.length} available</strong></div>
        <h3>Repair a controlled corridor</h3>
        <p>Use a ready or garrison formation at either secured endpoint. Repair restores route condition towards 100%, which recovers movement reliability and logistics capacity.</p>
        <dl>
          <div><dt>Active now</dt><dd>{activeRepairs.length}</dd></div>
          <div><dt>Daily cost</dt><dd>{activeRepairs.reduce((sum, project) => sum + engineeringProjectDemand(project), 0)}</dd></div>
        </dl>
        <button type="button" className="primary" onClick={() => setActiveTab('repair')}>Open repair command</button>
      </section>

      <section className="view-panel infrastructure-choice-card interdict-choice" data-tutorial="infrastructure-interdict">
        <div className="view-panel-heading"><p className="panel-label">ENEMY NETWORK</p><strong>{interdictionRoutes.length} available</strong></div>
        <h3>Interdict a frontier corridor</h3>
        <p>Commit a formation at the friendly end of an enemy frontier route. Higher intensity can inflict more damage faster, but costs more supply, raises escalation and increases casualty exposure.</p>
        <dl>
          <div><dt>Active now</dt><dd>{activeInterdictions.length}</dd></div>
          <div><dt>Daily cost</dt><dd>{activeInterdictions.reduce((sum, mission) => sum + interdictionMissionDemand(mission), 0)}</dd></div>
        </dl>
        <button type="button" className="primary danger-action" onClick={() => setActiveTab('interdict')}>Open interdiction command</button>
      </section>

      <section className="view-panel infrastructure-rules-panel" data-tutorial="infrastructure-rules">
        <div className="view-panel-heading"><p className="panel-label">WHEN ACTIONS ARE AVAILABLE</p><strong>Eligibility</strong></div>
        <div className="infrastructure-rule-list">
          <article><b>REPAIR</b><p>The route must be damaged, both endpoints must be controlled and secured, and a ready/garrison formation must be physically present at an endpoint.</p></article>
          <article><b>INTERDICT</b><p>The route must cross the current friendly/enemy frontier and a ready/garrison formation must be at the friendly endpoint.</p></article>
          <article><b>COMMITMENT</b><p>An assigned formation cannot move, attack or reorganise until the project or mission completes or is cancelled.</p></article>
          <article><b>LOGISTICS</b><p>Below 15% daily delivery, repair and interdiction progress stalls. Increasing allocation does not bypass a broken supply network.</p></article>
        </div>
      </section>

      <section className="view-panel infrastructure-attention-panel">
        <div className="view-panel-heading"><p className="panel-label">CURRENT ATTENTION</p><strong>{damagedRoutes.length + bottlenecks}</strong></div>
        {damagedRoutes.length ? <div className="infrastructure-attention-list">{damagedRoutes.slice(0, 5).map(route => {
          const routeState = state.routeStates[route.id];
          const flow = state.logistics.routeFlows[route.id];
          return <button type="button" key={route.id} onClick={() => onOpenTerritory(route.fromTerritoryId)}>
            <span><strong>{route.name}</strong><small>{TERRITORIES[route.fromTerritoryId].centre} ↔ {TERRITORIES[route.toTerritoryId].centre}</small></span>
            <b>{Math.round(routeState.condition)}% · {flow ? `${Math.round(flow.utilisation)}% load` : routeState.status}</b>
          </button>;
        })}</div> : <p className="empty-state">No route has current condition damage.</p>}
      </section>
    </div>}

    {activeTab === 'repair' && <div className="infrastructure-tab-panel infrastructure-work-grid">
      <section className="view-panel infrastructure-order-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW REPAIR ORDER</p><strong>{repairRoutes.length}</strong></div>
        {repairRoute ? <>
          <label>Damaged controlled corridor
            <select value={repairRouteId} onChange={event => { setRepairRouteSelection(event.target.value); setRepairGroupSelection(''); }}>
              {repairRoutes.map(route => <option key={route.id} value={route.id}>{route.name} · {Math.round(state.routeStates[route.id].condition)}%</option>)}
            </select>
          </label>
          <label>Assigned formation
            <select value={repairGroupId} onChange={event => setRepairGroupSelection(event.target.value)}>
              {repairGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre} · stock {Math.round(group.supply)}%</option>)}
            </select>
          </label>
          <label>Engineering allocation
            <select value={repairAllocation} onChange={event => setRepairAllocation(Number(event.target.value) as EngineeringAllocation)}>
              {ENGINEERING_ALLOCATIONS.map(value => <option key={value} value={value}>{value}% · {engineeringProjectDemand({ allocation: value })} daily demand</option>)}
            </select>
          </label>

          <div className="infrastructure-forecast repair-forecast" data-wp7-repair-preview="true">
            <div className="forecast-heading"><strong>Order preview</strong><span>{repairRoute.name}</span></div>
            <div className="forecast-metrics">
              <div><span>Route condition</span><strong>{Math.round(repairCondition)}% → 100%</strong></div>
              <div><span>Current route load</span><strong>{repairFlow ? `${Math.round(repairFlow.utilisation)}%` : 'No friendly flow'}</strong></div>
              <div><span>Formation delivery</span><strong>{Math.round(repairDelivery)}%</strong></div>
              <div><span>Repair rate</span><strong>{repairDaily ? `+${repairDaily}% / day` : 'STALLED'}</strong></div>
              <div><span>Estimated completion</span><strong>{dayLabel(repairDays)}</strong></div>
              <div><span>Daily network demand</span><strong>{engineeringProjectDemand({ allocation: repairAllocation })}</strong></div>
            </div>
            <p>{repairDelivery < 15 ? 'This formation is receiving less than 15% of its daily demand, so the project would not currently progress. Fix its supply route or priority first.' : 'Estimate uses the formation’s current logistics delivery. If supply changes, the completion date will change with it.'}</p>
          </div>

          <button type="button" className="primary" disabled={!repairGroupId || repairDaily <= 0} onClick={() => onChange(current => startEngineeringProject(current, repairRoute.id, repairGroupId, repairAllocation))}>
            {!repairGroupId ? 'No eligible formation' : repairDaily <= 0 ? 'Supply too low to begin effectively' : 'Start repair project'}
          </button>
        </> : <div className="view-empty infrastructure-empty-explained">
          <h3>No repair order available</h3>
          <p>{damagedRoutes.length === 0 ? 'There are no damaged routes.' : 'Damaged routes exist, but none currently have two controlled secured endpoints and an available formation positioned at an endpoint.'}</p>
          <small>Move a ready formation to a controlled endpoint, secure newly captured territory, or finish/cancel an existing project to make another route eligible.</small>
        </div>}
      </section>

      <section className="view-panel infrastructure-active-panel">
        <div className="view-panel-heading"><p className="panel-label">ACTIVE REPAIRS</p><strong>{activeRepairs.length}</strong></div>
        {activeRepairs.length ? <div className="infrastructure-active-list">{activeRepairs.map(project => {
          const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
          const group = state.taskGroups[project.assignedTaskGroupId];
          const routeState = state.routeStates[project.routeId];
          const delivery = state.logistics.formationAllocations[project.assignedTaskGroupId]?.ratio ?? 0;
          const daily = engineeringDailyWork(project.allocation, delivery);
          const eta = repairEta(routeState?.condition ?? project.startingCondition, project.allocation, delivery);
          return <article key={project.id} className="infrastructure-active-card repair-card">
            <header><div><small>{project.id}</small><h3>{route?.name ?? project.routeId}</h3></div><b>{project.progress}%</b></header>
            <div className="infrastructure-progress"><i style={{ width: `${project.progress}%` }} /></div>
            <dl>
              <div><dt>Formation</dt><dd>{group?.name ?? project.assignedTaskGroupId}</dd></div>
              <div><dt>Route condition</dt><dd>{Math.round(routeState?.condition ?? 0)}%</dd></div>
              <div><dt>Supply delivery</dt><dd>{Math.round(delivery)}%</dd></div>
              <div><dt>Current rate</dt><dd>{daily ? `+${daily}% / day` : 'Stalled'}</dd></div>
              <div><dt>ETA</dt><dd>{dayLabel(eta)}</dd></div>
              <div><dt>Supply spent</dt><dd>{project.supplySpent}</dd></div>
            </dl>
            {delivery < 15 && <p className="infrastructure-warning">Progress is stalled because the assigned formation is below 15% logistics delivery.</p>}
            <label>Repair allocation
              <select value={project.allocation} onChange={event => onChange(current => setEngineeringAllocation(current, project.id, Number(event.target.value) as EngineeringAllocation))}>
                {ENGINEERING_ALLOCATIONS.map(value => <option key={value} value={value}>{value}% · demand {engineeringProjectDemand({ allocation: value })}</option>)}
              </select>
            </label>
            <div className="infrastructure-card-actions">
              {route && <button type="button" onClick={() => onOpenTerritory(route.fromTerritoryId)}>Open corridor</button>}
              <button type="button" className="danger-action" onClick={() => onChange(current => cancelEngineeringProject(current, project.id))}>Cancel project</button>
            </div>
          </article>;
        })}</div> : <p className="empty-state">No formation is committed to infrastructure repair.</p>}
      </section>
    </div>}

    {activeTab === 'interdict' && <div className="infrastructure-tab-panel infrastructure-work-grid">
      <section className="view-panel infrastructure-order-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW INTERDICTION ORDER</p><strong>{interdictionRoutes.length}</strong></div>
        {interdictionRoute ? <>
          <label>Enemy frontier corridor
            <select value={interdictionRouteId} onChange={event => { setInterdictionRouteSelection(event.target.value); setInterdictionGroupSelection(''); }}>
              {interdictionRoutes.map(route => {
                const enemyId = state.territories[route.fromTerritoryId].controller === 'enemy' ? route.fromTerritoryId : route.toTerritoryId;
                return <option key={route.id} value={route.id}>{route.name} · target {TERRITORIES[enemyId].centre}</option>;
              })}
            </select>
          </label>
          <label>Assigned formation
            <select value={interdictionGroupId} onChange={event => setInterdictionGroupSelection(event.target.value)}>
              {interdictionGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre} · stock {Math.round(group.supply)}%</option>)}
            </select>
          </label>
          <label>Mission intensity
            <select value={interdictionIntensity} onChange={event => setInterdictionIntensityState(Number(event.target.value) as InterdictionIntensity)}>
              {INTERDICTION_INTENSITIES.map(value => <option key={value} value={value}>{value}% · {intensityLabel(value)} · demand {interdictionMissionDemand({ intensity: value })}</option>)}
            </select>
          </label>

          <div className="infrastructure-forecast interdiction-forecast" data-wp7-interdiction-preview="true">
            <div className="forecast-heading"><strong>Mission preview</strong><span>{interdictionRoute.name}</span></div>
            <div className="forecast-metrics">
              <div><span>Formation delivery</span><strong>{Math.round(interdictionDelivery)}%</strong></div>
              <div><span>Estimated duration</span><strong>{dayLabel(interdictionDays)}</strong></div>
              <div><span>Daily network demand</span><strong>{interdictionMissionDemand({ intensity: interdictionIntensity })}</strong></div>
              <div><span>Damage if successful</span><strong>{damageMinimum}–{damageMaximum}%</strong></div>
              <div><span>Escalation if successful</span><strong>+{escalationSuccess.toFixed(1)}</strong></div>
              <div><span>Escalation if failed</span><strong>+{escalationFailure.toFixed(1)}</strong></div>
            </div>
            <p>{interdictionDelivery < 15 ? 'This formation is receiving less than 15% of daily demand, so the mission would currently stall.' : 'Success is intentionally uncertain: enemy security and readiness are not revealed by this preview. Failure can cause substantially heavier casualties, and higher intensity increases exposure.'}</p>
          </div>

          <button type="button" className="primary danger-action" disabled={!interdictionGroupId || interdictionDays === null} onClick={() => onChange(current => startInterdictionMission(current, interdictionRoute.id, interdictionGroupId, interdictionIntensity))}>
            {!interdictionGroupId ? 'No eligible formation' : interdictionDays === null ? 'Supply too low to launch effectively' : 'Launch interdiction mission'}
          </button>
        </> : <div className="view-empty infrastructure-empty-explained">
          <h3>No interdiction order available</h3>
          <p>No operational route currently has one secured friendly endpoint, one enemy endpoint and an available formation positioned at the friendly end.</p>
          <small>Interdiction is a frontier action. Move a ready formation onto a controlled frontier corridor or finish/cancel another commitment first.</small>
        </div>}
      </section>

      <section className="view-panel infrastructure-active-panel">
        <div className="view-panel-heading"><p className="panel-label">ACTIVE INTERDICTIONS</p><strong>{activeInterdictions.length}</strong></div>
        {activeInterdictions.length ? <div className="infrastructure-active-list">{activeInterdictions.map(mission => {
          const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
          const group = state.taskGroups[mission.assignedTaskGroupId];
          const delivery = state.logistics.formationAllocations[mission.assignedTaskGroupId]?.ratio ?? 0;
          const eta = interdictionEta(mission.progress, mission.intensity, delivery);
          const enemyId = route ? (state.territories[route.fromTerritoryId].controller === 'enemy' ? route.fromTerritoryId : route.toTerritoryId) : null;
          return <article key={mission.id} className="infrastructure-active-card interdiction-card">
            <header><div><small>{mission.id}</small><h3>{route?.name ?? mission.routeId}</h3></div><b>{mission.progress}%</b></header>
            <div className="infrastructure-progress danger"><i style={{ width: `${mission.progress}%` }} /></div>
            <dl>
              <div><dt>Formation</dt><dd>{group?.name ?? mission.assignedTaskGroupId}</dd></div>
              <div><dt>Enemy endpoint</dt><dd>{enemyId ? TERRITORIES[enemyId].centre : 'Unknown'}</dd></div>
              <div><dt>Supply delivery</dt><dd>{Math.round(delivery)}%</dd></div>
              <div><dt>Intensity</dt><dd>{mission.intensity}% · {intensityLabel(mission.intensity)}</dd></div>
              <div><dt>ETA</dt><dd>{dayLabel(eta)}</dd></div>
              <div><dt>Supply spent</dt><dd>{mission.supplySpent}</dd></div>
            </dl>
            {delivery < 15 && <p className="infrastructure-warning">Mission progress is stalled because the assigned formation is below 15% logistics delivery.</p>}
            <label>Mission intensity
              <select value={mission.intensity} onChange={event => onChange(current => setInterdictionIntensity(current, mission.id, Number(event.target.value) as InterdictionIntensity))}>
                {INTERDICTION_INTENSITIES.map(value => <option key={value} value={value}>{value}% · {intensityLabel(value)} · demand {interdictionMissionDemand({ intensity: value })}</option>)}
              </select>
            </label>
            <div className="infrastructure-card-actions">
              {enemyId && <button type="button" onClick={() => onOpenTerritory(enemyId)}>Open target</button>}
              <button type="button" className="danger-action" onClick={() => onChange(current => cancelInterdictionMission(current, mission.id))}>Cancel mission</button>
            </div>
          </article>;
        })}</div> : <p className="empty-state">No formation is currently operating against enemy infrastructure.</p>}
      </section>
    </div>}

    {activeTab === 'history' && <div className="infrastructure-tab-panel">
      <section className="view-panel infrastructure-history-panel">
        <div className="view-panel-heading"><p className="panel-label">INFRASTRUCTURE ACTION HISTORY</p><strong>{history.length}</strong></div>
        {history.length ? <div className="infrastructure-history-list">{history.map(item => {
          const route = STRATEGIC_ROUTE_BY_ID[item.routeId];
          return <article key={item.id} className={item.status}>
            <span className="history-kind">{item.kind}</span>
            <div><strong>{route?.name ?? item.routeId}</strong><small>Started day {String(item.turn).padStart(3, '0')} · {item.detail}</small></div>
            <b>{item.status}</b>
            {route && <button type="button" onClick={() => onOpenTerritory(route.fromTerritoryId)}>Open</button>}
          </article>;
        })}</div> : <p className="empty-state">No repair or interdiction action has yet reached an outcome.</p>}
      </section>
    </div>}
  </section>;
}