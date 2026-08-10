import { useEffect, useState } from 'react';
import { TERRITORIES } from '../game/data';
import {
  assignEngineeringSupport,
  cancelEngineeringProject,
  ENGINEERING_ALLOCATIONS,
  engineeringCivilSupplyRatio,
  engineeringDailyWork,
  engineeringGroupsForRoute,
  engineeringLocalCapability,
  engineeringMovementFactor,
  engineeringOperationalFactor,
  engineeringProjectDemand,
  engineeringProjectEta,
  engineeringSupportDemand,
  repairableEngineeringRoutes,
  setEngineeringAllocation,
  startEngineeringProject,
  startEngineeringUpgrade,
  upgradeableEngineeringRoutes,
  withdrawEngineeringSupport
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
import type { EngineeringAllocation, EngineeringProjectKind, GameState, InterdictionIntensity } from '../game/types';
import type { ResolvedContextualTarget } from '../game/contextual-navigation';

interface Props {
  state: GameState;
  onChange: (state: GameState | ((current: GameState) => GameState)) => void;
  onOpenTerritory: (territoryId: string) => void;
  onClearContext?: () => void;
  context?: ResolvedContextualTarget | null;
}

type InfrastructureTab = 'overview' | 'repair' | 'upgrade' | 'interdict' | 'history';

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);
const dayLabel = (days: number | null) => days === null ? 'Stalled' : `~${days} day${days === 1 ? '' : 's'}`;
const percentage = (value: number) => `${Math.round(value)}%`;

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

function engineeringPreview(
  state: GameState,
  routeId: string,
  groupId: string,
  allocation: EngineeringAllocation,
  kind: EngineeringProjectKind
) {
  const supported = groupId && allocation > 0;
  const previewState = kind === 'upgrade'
    ? startEngineeringUpgrade(state, routeId, supported ? groupId : '', supported ? allocation : 0)
    : startEngineeringProject(state, routeId, supported ? groupId : '', supported ? allocation : 0, 'repair');
  const project = previewState.engineeringProjects.find(candidate => candidate.status === 'active' && candidate.routeId === routeId);
  return project ? {
    project,
    daily: engineeringDailyWork(previewState, project),
    eta: engineeringProjectEta(previewState, project),
    civilSupply: engineeringCivilSupplyRatio(previewState, routeId) * 100,
    localCapability: engineeringLocalCapability(previewState, routeId)
  } : null;
}

export function InfrastructureCommand({ state, onChange, onOpenTerritory, onClearContext = () => {}, context }: Props) {
  const [activeTab, setActiveTab] = useState<InfrastructureTab>('overview');
  const [repairRouteSelection, setRepairRouteSelection] = useState('');
  const [repairGroupSelection, setRepairGroupSelection] = useState('');
  const [repairAllocation, setRepairAllocation] = useState<EngineeringAllocation>(25);
  const [upgradeRouteSelection, setUpgradeRouteSelection] = useState('');
  const [upgradeGroupSelection, setUpgradeGroupSelection] = useState('');
  const [upgradeAllocation, setUpgradeAllocation] = useState<EngineeringAllocation>(25);
  const [interdictionRouteSelection, setInterdictionRouteSelection] = useState('');
  const [interdictionGroupSelection, setInterdictionGroupSelection] = useState('');
  const [interdictionIntensity, setInterdictionIntensityState] = useState<InterdictionIntensity>(50);
  const selectTab = (tab: InfrastructureTab) => {
    onClearContext();
    setActiveTab(tab);
  };

  useEffect(() => {
    if (context?.target.kind !== 'route') return;
    const routeId = context.target.id;
    if (repairableEngineeringRoutes(state).some(route => route.id === routeId)) {
      setRepairRouteSelection(routeId);
      setActiveTab('repair');
    } else if (upgradeableEngineeringRoutes(state).some(route => route.id === routeId)) {
      setUpgradeRouteSelection(routeId);
      setActiveTab('upgrade');
    } else {
      setActiveTab('overview');
    }
  }, [context, state]);

  const activeRepairs = state.engineeringProjects.filter(project => project.status === 'active' && project.kind === 'repair');
  const activeUpgrades = state.engineeringProjects.filter(project => project.status === 'active' && project.kind === 'upgrade');
  const activeInterdictions = state.interdictionMissions.filter(mission => mission.status === 'active');
  const repairRoutes = repairableEngineeringRoutes(state);
  const upgradeRoutes = upgradeableEngineeringRoutes(state);
  const interdictionRoutes = frontierInterdictionRoutes(state);
  const damagedRoutes = Object.entries(state.routeStates)
    .filter(([, routeState]) => routeState.condition < 100)
    .flatMap(([routeId]) => STRATEGIC_ROUTE_BY_ID[routeId] ? [STRATEGIC_ROUTE_BY_ID[routeId]] : []);
  const upgradedRoutes = Object.values(state.routeStates).filter(routeState => (routeState.upgradeLevel ?? 0) > 0).length;
  const bottlenecks = state.logistics.bottleneckRouteIds.length;

  const repairRouteId = repairRoutes.some(route => route.id === repairRouteSelection) ? repairRouteSelection : repairRoutes[0]?.id ?? '';
  const repairRoute = repairRouteId ? STRATEGIC_ROUTE_BY_ID[repairRouteId] : undefined;
  const repairGroups = repairRoute ? engineeringGroupsForRoute(state, repairRoute.id) : [];
  const repairGroupId = repairGroups.some(group => group.id === repairGroupSelection) ? repairGroupSelection : '';
  const repairPreview = repairRoute ? engineeringPreview(state, repairRoute.id, repairGroupId, repairGroupId ? repairAllocation : 0, 'repair') : null;
  const repairFlow = repairRoute ? state.logistics.routeFlows[repairRoute.id] : undefined;

  const upgradeRouteId = upgradeRoutes.some(route => route.id === upgradeRouteSelection) ? upgradeRouteSelection : upgradeRoutes[0]?.id ?? '';
  const upgradeRoute = upgradeRouteId ? STRATEGIC_ROUTE_BY_ID[upgradeRouteId] : undefined;
  const upgradeGroups = upgradeRoute ? engineeringGroupsForRoute(state, upgradeRoute.id) : [];
  const upgradeGroupId = upgradeGroups.some(group => group.id === upgradeGroupSelection) ? upgradeGroupSelection : '';
  const upgradePreview = upgradeRoute ? engineeringPreview(state, upgradeRoute.id, upgradeGroupId, upgradeGroupId ? upgradeAllocation : 0, 'upgrade') : null;

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
    { id: 'upgrade', label: 'Upgrade', badge: activeUpgrades.length || upgradeRoutes.length },
    { id: 'interdict', label: 'Interdict', badge: activeInterdictions.length || interdictionRoutes.length },
    { id: 'history', label: 'History', badge: state.engineeringProjects.filter(project => project.status !== 'active').length + state.interdictionMissions.filter(mission => mission.status !== 'active').length }
  ];

  const history = [
    ...state.engineeringProjects.filter(project => project.status !== 'active').map(project => ({
      id: `engineering-${project.id}`,
      kind: project.kind === 'upgrade' ? 'UPGRADE' : 'REPAIR',
      routeId: project.routeId,
      turn: project.createdTurn,
      status: project.status,
      detail: `${project.materialSpent}/${project.materialCost} materials · ${project.progress}% project progress`
    })),
    ...state.interdictionMissions.filter(mission => mission.status !== 'active').map(mission => ({
      id: `interdict-${mission.id}`,
      kind: 'INTERDICTION',
      routeId: mission.routeId,
      turn: mission.createdTurn,
      status: mission.status,
      detail: `${mission.supplySpent} supply spent · ${mission.damageInflicted} damage · ${mission.casualties} casualties`
    }))
  ].sort((first, second) => second.turn - first.turn).slice(0, 20);

  const renderEngineeringProject = (projectId: string) => {
    const project = state.engineeringProjects.find(candidate => candidate.id === projectId);
    if (!project) return null;
    const route = STRATEGIC_ROUTE_BY_ID[project.routeId];
    const group = project.assignedTaskGroupId ? state.taskGroups[project.assignedTaskGroupId] : undefined;
    const routeState = state.routeStates[project.routeId];
    const localCapability = engineeringLocalCapability(state, project.routeId);
    const civilSupply = engineeringCivilSupplyRatio(state, project.routeId) * 100;
    const daily = engineeringDailyWork(state, project);
    const eta = engineeringProjectEta(state, project);
    const supportCandidates = engineeringGroupsForRoute(state, project.routeId, project.id);
    const supportOptions = group && !supportCandidates.some(candidate => candidate.id === group.id)
      ? [group, ...supportCandidates]
      : supportCandidates;
    const operationalPercent = group ? engineeringOperationalFactor(state, group.id) * 100 : 100;
    const movementPercent = group ? engineeringMovementFactor(state, group.id) * 100 : 100;

    return <article key={project.id} className={`infrastructure-active-card ${project.kind}-card`}>
      <header><div><small>{project.id}</small><h3>{route?.name ?? project.routeId}</h3></div><b>{project.progress}%</b></header>
      <div className="infrastructure-progress"><i style={{ width: `${project.progress}%` }} /></div>
      <dl>
        <div><dt>Project</dt><dd>{project.kind === 'upgrade' ? `Corridor upgrade · level ${(routeState?.upgradeLevel ?? 0) + 1}` : 'Civil corridor repair'}</dd></div>
        <div><dt>Local capability</dt><dd>{localCapability.toFixed(1)}</dd></div>
        <div><dt>Civil supply</dt><dd>{percentage(civilSupply)}</dd></div>
        <div><dt>Military support</dt><dd>{group ? `${group.name} · ${project.allocation}%` : 'None'}</dd></div>
        <div><dt>Parent combat availability</dt><dd>{percentage(operationalPercent)}</dd></div>
        <div><dt>Parent movement rate</dt><dd>{percentage(movementPercent)}</dd></div>
        <div><dt>Current work rate</dt><dd>{daily > 0 ? `${daily.toFixed(1)} work/day` : 'Stalled'}</dd></div>
        <div><dt>Materials</dt><dd>{project.materialSpent.toFixed(1)} / {project.materialCost.toFixed(1)}</dd></div>
        <div><dt>ETA</dt><dd>{dayLabel(eta)}</dd></div>
        <div><dt>Daily demand</dt><dd>{engineeringProjectDemand(project) + engineeringSupportDemand(project)}</dd></div>
      </dl>
      {daily <= 0 && <p className="infrastructure-warning">Civil work is stalled because the corridor lacks secure local capability or usable material throughput.</p>}
      <label>Military engineering support
        <select
          value={project.assignedTaskGroupId ?? ''}
          onChange={event => onChange(current => event.target.value
            ? assignEngineeringSupport(current, project.id, event.target.value, project.allocation > 0 ? project.allocation : 25)
            : withdrawEngineeringSupport(current, project.id))}
        >
          <option value="">No military support — civil teams continue</option>
          {supportOptions.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {TERRITORIES[candidate.location].centre}</option>)}
        </select>
      </label>
      {project.assignedTaskGroupId && <label>Support allocation
        <select value={project.allocation} onChange={event => onChange(current => setEngineeringAllocation(current, project.id, Number(event.target.value) as EngineeringAllocation))}>
          {ENGINEERING_ALLOCATIONS.map(value => <option key={value} value={value}>{value}%{value === 0 ? ' · withdraw support' : ` · parent combat ~${Math.round((1 - value / 100 * 0.8) * 100)}%`}</option>)}
        </select>
      </label>}
      <div className="infrastructure-card-actions">
        {route && <button type="button" onClick={() => onOpenTerritory(route.fromTerritoryId)}>Open corridor</button>}
        {project.assignedTaskGroupId && <button type="button" onClick={() => onChange(current => withdrawEngineeringSupport(current, project.id))}>Withdraw support</button>}
        <button type="button" className="danger-action" onClick={() => onChange(current => cancelEngineeringProject(current, project.id))}>Cancel project</button>
      </div>
    </article>;
  };

  return <section className="command-view infrastructure-view" data-wp7-infrastructure="true" data-r2-wp2-infrastructure="true">
    <header className="command-view-header infrastructure-command-header">
      <div><p className="panel-label">INFRASTRUCTURE</p><h2>Strategic infrastructure command</h2></div>
      <p>Controlled regions repair infrastructure through local civil capacity and supplied materials. Military formations may contribute part of their strength to accelerate work without becoming completely immobilised. Interdiction remains a separate military mission.</p>
    </header>

    {context && <aside className={`contextual-navigation-banner ${context.valid ? '' : 'fallback'}`} role="status" data-context-target={context.target.kind === 'route' ? context.target.id : context.target.kind}>
      <strong>{context.valid ? 'Opened from diagnostic' : 'Target unavailable'}</strong><span>{context.message}</span>
    </aside>}

    {context?.target.kind === 'route' && STRATEGIC_ROUTE_BY_ID[context.target.id] && <section className="view-panel contextual-route-focus" aria-label="Selected infrastructure route">
      <p className="panel-label">SELECTED ROUTE</p><h3>{STRATEGIC_ROUTE_BY_ID[context.target.id].name}</h3>
      <p>Status: {state.routeStates[context.target.id]?.status ?? 'unknown'} · condition {Math.round(state.routeStates[context.target.id]?.condition ?? 0)}%</p>
    </section>}

    <div className="infrastructure-summary-strip">
      <div><span>Damaged routes</span><strong>{damagedRoutes.length}</strong></div>
      <div><span>Upgraded routes</span><strong>{upgradedRoutes}</strong></div>
      <div><span>Active civil projects</span><strong>{activeRepairs.length + activeUpgrades.length}</strong></div>
      <div><span>Network bottlenecks</span><strong>{bottlenecks}</strong></div>
    </div>

    <nav className="infrastructure-tabs" aria-label="Infrastructure command modes">
      {tabs.map(tab => <button type="button" key={tab.id} className={activeTab === tab.id ? 'active' : ''} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => selectTab(tab.id)}>
        <span>{tab.label}</span>{tab.badge ? <b>{tab.badge}</b> : null}
      </button>)}
    </nav>

    {activeTab === 'overview' && <div className="infrastructure-tab-panel infrastructure-overview-grid">
      <section className="view-panel infrastructure-choice-card repair-choice" data-tutorial="infrastructure-repair">
        <div className="view-panel-heading"><p className="panel-label">CIVIL REPAIR</p><strong>{repairRoutes.length} available</strong></div>
        <h3>Restore a controlled corridor</h3>
        <p>Secured local authorities, contractors and captured industrial capacity carry routine repairs. A military engineering detachment is optional and only accelerates the project.</p>
        <dl><div><dt>Active now</dt><dd>{activeRepairs.length}</dd></div><div><dt>Military formation required</dt><dd>No</dd></div></dl>
        <button type="button" className="primary" onClick={() => selectTab('repair')}>Open repair command</button>
      </section>

      <section className="view-panel infrastructure-choice-card build-choice">
        <div className="view-panel-heading"><p className="panel-label">CONSTRUCTION</p><strong>{upgradeRoutes.length} available</strong></div>
        <h3>Upgrade a strategic corridor</h3>
        <p>Invest materials and engineering time into a healthy secured route. Completed upgrades permanently increase route capacity and resilience for the campaign.</p>
        <dl><div><dt>Active now</dt><dd>{activeUpgrades.length}</dd></div><div><dt>Maximum level</dt><dd>2</dd></div></dl>
        <button type="button" className="primary" onClick={() => selectTab('upgrade')}>Open upgrade command</button>
      </section>

      <section className="view-panel infrastructure-choice-card interdict-choice" data-tutorial="infrastructure-interdict">
        <div className="view-panel-heading"><p className="panel-label">ENEMY NETWORK</p><strong>{interdictionRoutes.length} available</strong></div>
        <h3>Interdict a frontier corridor</h3>
        <p>Interdiction is still a military mission: the assigned formation is committed while it operates against enemy infrastructure.</p>
        <dl><div><dt>Active now</dt><dd>{activeInterdictions.length}</dd></div><div><dt>Daily cost</dt><dd>{activeInterdictions.reduce((sum, mission) => sum + interdictionMissionDemand(mission), 0)}</dd></div></dl>
        <button type="button" className="primary danger-action" onClick={() => selectTab('interdict')}>Open interdiction command</button>
      </section>

      <section className="view-panel infrastructure-rules-panel" data-tutorial="infrastructure-rules">
        <div className="view-panel-heading"><p className="panel-label">HOW ENGINEERING WORKS</p><strong>R2</strong></div>
        <div className="infrastructure-rule-list">
          <article><b>LOCAL WORKFORCE</b><p>Controlled secured endpoints provide the civil engineering base. Better industrial/repair capability means faster work.</p></article>
          <article><b>MATERIALS</b><p>Projects need real network delivery. Low supply slows work; it does not magically immobilise a combat formation.</p></article>
          <article><b>MILITARY SUPPORT</b><p>Assign 25–100% of one formation as optional engineering support. The parent remains operational with proportional movement and combat penalties.</p></article>
          <article><b>DAMAGE</b><p>Damaged routes lose speed and throughput progressively. Only destroyed or explicitly blocked corridors are impassable.</p></article>
        </div>
      </section>
    </div>}

    {activeTab === 'repair' && <div className="infrastructure-tab-panel infrastructure-work-grid">
      <section className="view-panel infrastructure-order-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW CIVIL REPAIR PROJECT</p><strong>{repairRoutes.length}</strong></div>
        {repairRoute && repairPreview ? <>
          <label>Damaged controlled corridor
            <select value={repairRouteId} onChange={event => { setRepairRouteSelection(event.target.value); setRepairGroupSelection(''); }}>
              {repairRoutes.map(route => <option key={route.id} value={route.id}>{route.name} · {Math.round(state.routeStates[route.id].condition)}%</option>)}
            </select>
          </label>
          <label>Optional military support
            <select value={repairGroupId} onChange={event => setRepairGroupSelection(event.target.value)}>
              <option value="">None — civil workforce only</option>
              {repairGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre} · {formatNumber(group.personnel)} personnel</option>)}
            </select>
          </label>
          {repairGroupId && <label>Engineering support allocation
            <select value={repairAllocation} onChange={event => setRepairAllocation(Number(event.target.value) as EngineeringAllocation)}>
              {ENGINEERING_ALLOCATIONS.filter(value => value > 0).map(value => <option key={value} value={value}>{value}% · parent combat ~{Math.round((1 - value / 100 * 0.8) * 100)}%</option>)}
            </select>
          </label>}
          <div className="infrastructure-forecast repair-forecast" data-wp7-repair-preview="true" data-r2-wp2-project-preview="true">
            <div className="forecast-heading"><strong>Project preview</strong><span>{repairRoute.name}</span></div>
            <div className="forecast-metrics">
              <div><span>Route condition</span><strong>{Math.round(state.routeStates[repairRoute.id].condition)}% → 100%</strong></div>
              <div><span>Local capability</span><strong>{repairPreview.localCapability.toFixed(1)}</strong></div>
              <div><span>Civil supply</span><strong>{percentage(repairPreview.civilSupply)}</strong></div>
              <div><span>Military support</span><strong>{repairGroupId ? `${repairAllocation}%` : 'None'}</strong></div>
              <div><span>Work rate</span><strong>{repairPreview.daily > 0 ? `${repairPreview.daily.toFixed(1)} / day` : 'STALLED'}</strong></div>
              <div><span>Estimated completion</span><strong>{dayLabel(repairPreview.eta)}</strong></div>
              <div><span>Materials required</span><strong>{repairPreview.project.materialCost}</strong></div>
              <div><span>Daily network demand</span><strong>{engineeringProjectDemand(repairPreview.project) + engineeringSupportDemand(repairPreview.project)}</strong></div>
              <div><span>Current route load</span><strong>{repairFlow ? `${Math.round(repairFlow.utilisation)}%` : 'No friendly flow'}</strong></div>
            </div>
            <p>{repairGroupId ? 'The formation remains available to move and fight. Its engineering detachment reduces parent combat and movement effectiveness until support is withdrawn or the project completes.' : 'This project will proceed using local civil capacity alone. Military support can be assigned later if faster completion becomes strategically important.'}</p>
          </div>
          <button type="button" className="primary" disabled={repairPreview.daily <= 0} onClick={() => onChange(current => startEngineeringProject(current, repairRoute.id, repairGroupId, repairGroupId ? repairAllocation : 0, 'repair'))}>
            {repairPreview.daily <= 0 ? 'Local capability or supply unavailable' : 'Start civil repair project'}
          </button>
        </> : <div className="view-empty infrastructure-empty-explained"><h3>No repair project available</h3><p>{damagedRoutes.length === 0 ? 'There are no damaged routes.' : 'Damaged routes exist, but none currently have two controlled secured endpoints with usable local capability.'}</p><small>Secure both sides of a damaged corridor or finish/cancel an existing project on that route.</small></div>}
      </section>
      <section className="view-panel infrastructure-active-panel"><div className="view-panel-heading"><p className="panel-label">ACTIVE REPAIRS</p><strong>{activeRepairs.length}</strong></div>{activeRepairs.length ? <div className="infrastructure-active-list">{activeRepairs.map(project => renderEngineeringProject(project.id))}</div> : <p className="empty-state">No civil repair project is active.</p>}</section>
    </div>}

    {activeTab === 'upgrade' && <div className="infrastructure-tab-panel infrastructure-work-grid">
      <section className="view-panel infrastructure-order-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW CORRIDOR UPGRADE</p><strong>{upgradeRoutes.length}</strong></div>
        {upgradeRoute && upgradePreview ? <>
          <label>Healthy controlled corridor
            <select value={upgradeRouteId} onChange={event => { setUpgradeRouteSelection(event.target.value); setUpgradeGroupSelection(''); }}>
              {upgradeRoutes.map(route => <option key={route.id} value={route.id}>{route.name} · level {state.routeStates[route.id].upgradeLevel ?? 0}/2</option>)}
            </select>
          </label>
          <label>Optional military support
            <select value={upgradeGroupId} onChange={event => setUpgradeGroupSelection(event.target.value)}>
              <option value="">None — civil/industrial workforce only</option>
              {upgradeGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre}</option>)}
            </select>
          </label>
          {upgradeGroupId && <label>Engineering support allocation
            <select value={upgradeAllocation} onChange={event => setUpgradeAllocation(Number(event.target.value) as EngineeringAllocation)}>
              {ENGINEERING_ALLOCATIONS.filter(value => value > 0).map(value => <option key={value} value={value}>{value}% · parent combat ~{Math.round((1 - value / 100 * 0.8) * 100)}%</option>)}
            </select>
          </label>}
          <div className="infrastructure-forecast upgrade-forecast" data-r2-wp2-upgrade-preview="true">
            <div className="forecast-heading"><strong>Construction preview</strong><span>{upgradeRoute.name}</span></div>
            <div className="forecast-metrics">
              <div><span>Current level</span><strong>{state.routeStates[upgradeRoute.id].upgradeLevel ?? 0} / 2</strong></div>
              <div><span>Capacity benefit</span><strong>+15% / level</strong></div>
              <div><span>Movement benefit</span><strong>+8% / level</strong></div>
              <div><span>Local capability</span><strong>{upgradePreview.localCapability.toFixed(1)}</strong></div>
              <div><span>Civil supply</span><strong>{percentage(upgradePreview.civilSupply)}</strong></div>
              <div><span>Work rate</span><strong>{upgradePreview.daily > 0 ? `${upgradePreview.daily.toFixed(1)} / day` : 'STALLED'}</strong></div>
              <div><span>Materials required</span><strong>{upgradePreview.project.materialCost}</strong></div>
              <div><span>Estimated completion</span><strong>{dayLabel(upgradePreview.eta)}</strong></div>
            </div>
            <p>Fresh damage below 75% condition pauses construction until the route is repaired. Completed levels persist and improve both strategic throughput and movement.</p>
          </div>
          <button type="button" className="primary" disabled={upgradePreview.daily <= 0} onClick={() => onChange(current => startEngineeringUpgrade(current, upgradeRoute.id, upgradeGroupId, upgradeGroupId ? upgradeAllocation : 0))}>Start corridor upgrade</button>
        </> : <div className="view-empty infrastructure-empty-explained"><h3>No upgrade project available</h3><p>Upgrades require a secured controlled corridor at 85% condition or better, below the maximum infrastructure level, with no other engineering project already using the route.</p></div>}
      </section>
      <section className="view-panel infrastructure-active-panel"><div className="view-panel-heading"><p className="panel-label">ACTIVE UPGRADES</p><strong>{activeUpgrades.length}</strong></div>{activeUpgrades.length ? <div className="infrastructure-active-list">{activeUpgrades.map(project => renderEngineeringProject(project.id))}</div> : <p className="empty-state">No corridor upgrade is active.</p>}</section>
    </div>}

    {activeTab === 'interdict' && <div className="infrastructure-tab-panel infrastructure-work-grid">
      <section className="view-panel infrastructure-order-panel">
        <div className="view-panel-heading"><p className="panel-label">NEW INTERDICTION ORDER</p><strong>{interdictionRoutes.length}</strong></div>
        {interdictionRoute ? <>
          <label>Enemy frontier corridor<select value={interdictionRouteId} onChange={event => { setInterdictionRouteSelection(event.target.value); setInterdictionGroupSelection(''); }}>{interdictionRoutes.map(route => { const enemyId = state.territories[route.fromTerritoryId].controller === 'enemy' ? route.fromTerritoryId : route.toTerritoryId; return <option key={route.id} value={route.id}>{route.name} · target {TERRITORIES[enemyId].centre}</option>; })}</select></label>
          <label>Assigned formation<select value={interdictionGroupId} onChange={event => setInterdictionGroupSelection(event.target.value)}>{interdictionGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre} · stock {Math.round(group.supply)}%</option>)}</select></label>
          <label>Mission intensity<select value={interdictionIntensity} onChange={event => setInterdictionIntensityState(Number(event.target.value) as InterdictionIntensity)}>{INTERDICTION_INTENSITIES.map(value => <option key={value} value={value}>{value}% · {intensityLabel(value)} · demand {interdictionMissionDemand({ intensity: value })}</option>)}</select></label>
          <div className="infrastructure-forecast interdiction-forecast" data-wp7-interdiction-preview="true"><div className="forecast-heading"><strong>Mission preview</strong><span>{interdictionRoute.name}</span></div><div className="forecast-metrics"><div><span>Formation delivery</span><strong>{Math.round(interdictionDelivery)}%</strong></div><div><span>Estimated duration</span><strong>{dayLabel(interdictionDays)}</strong></div><div><span>Daily network demand</span><strong>{interdictionMissionDemand({ intensity: interdictionIntensity })}</strong></div><div><span>Damage if successful</span><strong>{damageMinimum}–{damageMaximum}%</strong></div><div><span>Escalation if successful</span><strong>+{escalationSuccess.toFixed(1)}</strong></div><div><span>Escalation if failed</span><strong>+{escalationFailure.toFixed(1)}</strong></div></div><p>{interdictionDelivery < 15 ? 'This formation is receiving less than 15% of daily demand, so the mission would currently stall.' : 'Unlike civil engineering support, interdiction is an active military mission and commits the assigned formation until it ends.'}</p></div>
          <button type="button" className="primary danger-action" disabled={!interdictionGroupId || interdictionDays === null} onClick={() => onChange(current => startInterdictionMission(current, interdictionRoute.id, interdictionGroupId, interdictionIntensity))}>{!interdictionGroupId ? 'No eligible formation' : interdictionDays === null ? 'Supply too low to launch effectively' : 'Launch interdiction mission'}</button>
        </> : <div className="view-empty infrastructure-empty-explained"><h3>No interdiction order available</h3><p>No operational route currently has one secured friendly endpoint, one enemy endpoint and an available formation positioned at the friendly end.</p></div>}
      </section>
      <section className="view-panel infrastructure-active-panel">
        <div className="view-panel-heading"><p className="panel-label">ACTIVE INTERDICTIONS</p><strong>{activeInterdictions.length}</strong></div>
        {activeInterdictions.length ? <div className="infrastructure-active-list">{activeInterdictions.map(mission => {
          const route = STRATEGIC_ROUTE_BY_ID[mission.routeId];
          const group = state.taskGroups[mission.assignedTaskGroupId];
          const delivery = state.logistics.formationAllocations[mission.assignedTaskGroupId]?.ratio ?? 0;
          const eta = interdictionEta(mission.progress, mission.intensity, delivery);
          const enemyId = route ? (state.territories[route.fromTerritoryId].controller === 'enemy' ? route.fromTerritoryId : route.toTerritoryId) : null;
          return <article key={mission.id} className="infrastructure-active-card interdiction-card"><header><div><small>{mission.id}</small><h3>{route?.name ?? mission.routeId}</h3></div><b>{mission.progress}%</b></header><div className="infrastructure-progress danger"><i style={{ width: `${mission.progress}%` }} /></div><dl><div><dt>Formation</dt><dd>{group?.name ?? mission.assignedTaskGroupId}</dd></div><div><dt>Enemy endpoint</dt><dd>{enemyId ? TERRITORIES[enemyId].centre : 'Unknown'}</dd></div><div><dt>Supply delivery</dt><dd>{Math.round(delivery)}%</dd></div><div><dt>Intensity</dt><dd>{mission.intensity}% · {intensityLabel(mission.intensity)}</dd></div><div><dt>ETA</dt><dd>{dayLabel(eta)}</dd></div><div><dt>Supply spent</dt><dd>{mission.supplySpent}</dd></div></dl>{delivery < 15 && <p className="infrastructure-warning">Mission progress is stalled because the assigned formation is below 15% logistics delivery.</p>}<label>Mission intensity<select value={mission.intensity} onChange={event => onChange(current => setInterdictionIntensity(current, mission.id, Number(event.target.value) as InterdictionIntensity))}>{INTERDICTION_INTENSITIES.map(value => <option key={value} value={value}>{value}% · {intensityLabel(value)} · demand {interdictionMissionDemand({ intensity: value })}</option>)}</select></label><div className="infrastructure-card-actions">{enemyId && <button type="button" onClick={() => onOpenTerritory(enemyId)}>Open target</button>}<button type="button" className="danger-action" onClick={() => onChange(current => cancelInterdictionMission(current, mission.id))}>Cancel mission</button></div></article>;
        })}</div> : <p className="empty-state">No formation is currently operating against enemy infrastructure.</p>}
      </section>
    </div>}

    {activeTab === 'history' && <div className="infrastructure-tab-panel"><section className="view-panel infrastructure-history-panel"><div className="view-panel-heading"><p className="panel-label">INFRASTRUCTURE ACTION HISTORY</p><strong>{history.length}</strong></div>{history.length ? <div className="infrastructure-history-list">{history.map(item => { const route = STRATEGIC_ROUTE_BY_ID[item.routeId]; return <article key={item.id} className={item.status}><span className="history-kind">{item.kind}</span><div><strong>{route?.name ?? item.routeId}</strong><small>Started day {String(item.turn).padStart(3, '0')} · {item.detail}</small></div><b>{item.status}</b>{route && <button type="button" onClick={() => onOpenTerritory(route.fromTerritoryId)}>Open</button>}</article>; })}</div> : <p className="empty-state">No infrastructure action has yet reached an outcome.</p>}</section></div>}
  </section>;
}
