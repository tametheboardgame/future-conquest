import { useState } from 'react';
import { TERRITORIES } from '../game/data';
import { getSupplyClarity, type SupplyDiagnostic } from '../game/operational-clarity';
import { STRATEGIC_ROUTE_BY_ID } from '../game/strategic-network-data';
import {
  LOGISTICS_PRIORITY_LABELS,
  LOGISTICS_PRIORITY_OPTIONS,
  SUPPLY_CONDITION_LABELS,
  setFormationLogisticsPriority,
  setTerritoryLogisticsPriority,
  type LogisticsPrioritySelection
} from '../game/supply-network';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onChange: (state: GameState) => void;
  onOpenGroup: (groupId: string) => void;
  onOpenTerritory: (territoryId: string) => void;
  onOpenInfrastructure: () => void;
}

type LogisticsTab = 'overview' | 'formations' | 'administration' | 'diagnostics';

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);

function PrioritySelect({ value, effective, onChange, label }: {
  value: LogisticsPrioritySelection;
  effective: keyof typeof LOGISTICS_PRIORITY_LABELS;
  onChange: (value: LogisticsPrioritySelection) => void;
  label: string;
}) {
  return <label className="logistics-priority-select">
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value as LogisticsPrioritySelection)}>
      <option value="automatic">Automatic · {LOGISTICS_PRIORITY_LABELS[effective]}</option>
      {LOGISTICS_PRIORITY_OPTIONS.map(priority => <option key={priority} value={priority}>{LOGISTICS_PRIORITY_LABELS[priority]}</option>)}
    </select>
  </label>;
}

function diagnosticGuidance(item: SupplyDiagnostic): string {
  if (item.groupId) return 'Check this formation’s carried stock and priority first. If the route is broken or saturated, changing priority alone will not create throughput.';
  if (item.routeId) return 'This is a physical network problem. Review the route in Infrastructure and repair, bypass or protect the corridor.';
  if (item.territoryId) return 'Check whether the territory can reconnect to another controlled supply area and whether its local resources can sustain the forces currently there.';
  return 'The network is using nearly all available source capacity. Reduce low-value demand or deliberately prioritise the formations and territories that matter most.';
}

function DiagnosticAction({ item, onOpenGroup, onOpenTerritory, onOpenInfrastructure, onReviewPriorities }: {
  item: SupplyDiagnostic;
  onOpenGroup: (groupId: string) => void;
  onOpenTerritory: (territoryId: string) => void;
  onOpenInfrastructure: () => void;
  onReviewPriorities: () => void;
}) {
  if (item.groupId) return <button type="button" onClick={() => onOpenGroup(item.groupId!)}>Open formation</button>;
  if (item.routeId) return <button type="button" onClick={onOpenInfrastructure}>Open Infrastructure</button>;
  if (item.territoryId) return <button type="button" onClick={() => onOpenTerritory(item.territoryId!)}>Open territory</button>;
  return <button type="button" onClick={onReviewPriorities}>Review priorities</button>;
}

export function LogisticsCommand({ state, onChange, onOpenGroup, onOpenTerritory, onOpenInfrastructure }: Props) {
  const [activeTab, setActiveTab] = useState<LogisticsTab>('overview');
  const clarity = getSupplyClarity(state);
  const groups = Object.values(state.taskGroups)
    .filter(group => group.personnel > 0)
    .sort((a, b) => {
      const aAllocation = state.logistics.formationAllocations[a.id];
      const bAllocation = state.logistics.formationAllocations[b.id];
      return (aAllocation?.ratio ?? 0) - (bAllocation?.ratio ?? 0) || a.name.localeCompare(b.name);
    });
  const territories = Object.keys(state.territories)
    .filter(id => state.territories[id].controller === 'player' && (state.logistics.territoryAllocations[id]?.administrationDemand ?? 0) > 0)
    .sort((a, b) => TERRITORIES[a].centre.localeCompare(TERRITORIES[b].centre));
  const bottlenecks = state.logistics.bottleneckRouteIds.flatMap(id => STRATEGIC_ROUTE_BY_ID[id] ? [STRATEGIC_ROUTE_BY_ID[id]] : []);
  const shortfalls = state.logistics.starvedFormationIds.length + state.logistics.starvedTerritoryIds.length;
  const localStockAverage = groups.length
    ? Math.round(groups.reduce((sum, group) => sum + group.supply, 0) / groups.length)
    : 0;
  const weakestGroups = groups.slice(0, 3);

  const tabs: Array<{ id: LogisticsTab; label: string; badge?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'formations', label: 'Formations', badge: state.logistics.starvedFormationIds.length },
    { id: 'administration', label: 'Territories', badge: state.logistics.starvedTerritoryIds.length },
    { id: 'diagnostics', label: 'Diagnostics', badge: clarity.diagnostics.length }
  ];

  return <section className="command-view logistics-priority-view" data-wp6-logistics="true">
    <header className="command-view-header logistics-command-header">
      <div><p className="panel-label">LOGISTICS</p><h2>Supply priority command</h2></div>
      <p>See what is available locally, what the network is delivering and why a formation or territory is short before changing priorities.</p>
    </header>

    <div className="logistics-priority-summary">
      <div><span>Source use</span><strong>{state.logistics.sourceUsed} / {state.logistics.sourceCapacity}</strong></div>
      <div><span>Demand served</span><strong>{state.logistics.totalDelivered} / {state.logistics.totalDemand}</strong></div>
      <div className={`network-${clarity.severity}`}><span>Network efficiency · {clarity.trend}</span><strong>{state.logistics.networkEfficiency}%</strong></div>
      <div className={shortfalls ? 'warning' : ''}><span>Severe shortfalls</span><strong>{shortfalls}</strong></div>
    </div>

    <nav className="logistics-tabs" aria-label="Logistics sections">
      {tabs.map(tab => <button
        type="button"
        key={tab.id}
        className={activeTab === tab.id ? 'active' : ''}
        aria-current={activeTab === tab.id ? 'page' : undefined}
        onClick={() => setActiveTab(tab.id)}
      >
        <span>{tab.label}</span>{tab.badge ? <b>{tab.badge}</b> : null}
      </button>)}
    </nav>

    {activeTab === 'overview' && <div className="logistics-tab-panel logistics-overview-tab">
      <section className={`view-panel logistics-health-panel ${clarity.severity}`}>
        <div className="view-panel-heading"><p className="panel-label">CURRENT ASSESSMENT</p><strong>{clarity.severity.toUpperCase()}</strong></div>
        <h3>{clarity.diagnostics.length ? clarity.diagnostics[0].title : 'The current network is meeting operational demand'}</h3>
        <p>{clarity.diagnostics[0]?.detail ?? 'No active supply fault requires command intervention. You can still inspect every allocation and route from the tabs above.'}</p>
        <div className="logistics-health-actions">
          <button type="button" className="primary" onClick={() => setActiveTab('diagnostics')}>Review diagnostics</button>
          {bottlenecks.length > 0 && <button type="button" onClick={onOpenInfrastructure}>Review infrastructure</button>}
        </div>
      </section>

      <section className="view-panel logistics-flow-explainer" data-tutorial="logistics-flow">
        <div className="view-panel-heading"><p className="panel-label">HOW SUPPLY WORKS</p><strong>3 layers</strong></div>
        <div className="logistics-flow-steps">
          <article><b>1</b><div><strong>Territorial sources</strong><p>Controlled territory generates food, industrial, energy and captured-store capacity. The former portal is not a permanent supply source.</p></div></article>
          <article><b>2</b><div><strong>Network delivery</strong><p>Routes move that capacity towards formations and administration. Damaged, blocked or saturated corridors reduce what arrives.</p></div></article>
          <article><b>3</b><div><strong>Carried stocks</strong><p>Formations keep operational reserves. A temporary network break draws those stocks down rather than causing instant collapse.</p></div></article>
        </div>
      </section>

      <section className="view-panel logistics-doctrine-panel" data-tutorial="logistics-doctrine">
        <div><p className="panel-label">ALLOCATION DOCTRINE</p><h3>Critical → High → Standard → Restricted</h3></div>
        <p>Priority decides who receives scarce throughput first. It cannot repair a destroyed route or create source capacity. Automatic defaults make attacks Critical; movement, recovery, engineering and interdiction High; normal formations Standard; and stable administered territory Restricted.</p>
      </section>

      <div className="logistics-overview-grid">
        <section className="view-panel logistics-reserve-panel" data-tutorial="logistics-reserves">
          <div className="view-panel-heading"><p className="panel-label">FORMATION RESERVES</p><strong>{localStockAverage}% avg</strong></div>
          <p className="panel-copy">Carried stock is the buffer between a formation and immediate logistics failure.</p>
          <div className="logistics-overview-list">{weakestGroups.map(group => {
            const allocation = state.logistics.formationAllocations[group.id];
            return <button type="button" key={group.id} onClick={() => onOpenGroup(group.id)}>
              <span><strong>{group.name}</strong><small>{TERRITORIES[group.location].centre} · {SUPPLY_CONDITION_LABELS[allocation?.condition ?? 'cut-off']}</small></span>
              <b>{Math.round(group.supply)}% stock</b>
            </button>;
          })}</div>
          <button type="button" className="text-action" onClick={() => setActiveTab('formations')}>Review all formation allocations</button>
        </section>

        <section className="view-panel logistics-bottleneck-panel overview-bottlenecks">
          <div className="view-panel-heading"><p className="panel-label">ROUTE PRESSURE</p><strong>{bottlenecks.length}</strong></div>
          {bottlenecks.length ? <div className="logistics-bottleneck-list">{bottlenecks.slice(0, 4).map(route => {
            const flow = state.logistics.routeFlows[route.id];
            return <button type="button" key={route.id} onClick={onOpenInfrastructure}>
              <span><strong>{route.name}</strong><small>{flow.used} / {flow.capacity} throughput · {flow.condition}</small></span>
              <b>{Math.round(flow.utilisation)}%</b>
            </button>;
          })}</div> : <p className="empty-state">No strategic corridor is currently operating above 85% of capacity.</p>}
        </section>
      </div>
    </div>}

    {activeTab === 'formations' && <div className="logistics-tab-panel">
      <section className="view-panel formation-priority-panel">
        <div className="view-panel-heading"><p className="panel-label">FORMATION PRIORITIES</p><strong>{groups.length}</strong></div>
        <p className="panel-copy">This tab controls who receives network throughput first. Carried stock is shown separately because a formation can remain operational for a time even when daily delivery is poor.</p>
        <div className="logistics-priority-list">{groups.map(group => {
          const allocation = state.logistics.formationAllocations[group.id];
          const override = state.logisticsPriorities.formationOverrides[group.id];
          const starved = state.logistics.starvedFormationIds.includes(group.id);
          return <article key={group.id} className={`logistics-priority-card ${allocation?.priority ?? 'standard'} ${starved ? 'starved' : ''}`}>
            <header>
              <button type="button" onClick={() => onOpenGroup(group.id)}><strong>{group.name}</strong><span>{TERRITORIES[group.location].centre} · {group.status}</span></button>
              <b>{allocation?.ratio ?? 0}% delivery</b>
            </header>
            <div className="logistics-throughput-row">
              <span>Requested <strong>{allocation?.demand ?? 0}</strong></span>
              <span>Delivered <strong>{allocation?.delivered ?? 0}</strong></span>
              <span>Carried stock <strong>{Math.round(group.supply)}%</strong></span>
              <span className={`supply-condition ${allocation?.condition ?? 'cut-off'}`}>{SUPPLY_CONDITION_LABELS[allocation?.condition ?? 'cut-off']}</span>
            </div>
            <PrioritySelect
              label="Formation priority"
              value={override ?? 'automatic'}
              effective={allocation?.priority ?? 'standard'}
              onChange={value => onChange(setFormationLogisticsPriority(state, group.id, value))}
            />
            {starved && <p className="priority-starvation-warning">Below 40% of daily demand. The formation will draw on carried stocks; prolonged shortage will degrade morale, repair and eventually personnel.</p>}
          </article>;
        })}</div>
      </section>
    </div>}

    {activeTab === 'administration' && <div className="logistics-tab-panel">
      <section className="view-panel administration-priority-panel">
        <div className="view-panel-heading"><p className="panel-label">TERRITORY ADMINISTRATION</p><strong>{territories.length}</strong></div>
        <p className="panel-copy">These controls govern civil administration and occupation demand. Formation supply in the same territory remains separately prioritised.</p>
        <div className="logistics-priority-list">{territories.map(territoryId => {
          const allocation = state.logistics.territoryAllocations[territoryId];
          const override = state.logisticsPriorities.territoryOverrides[territoryId];
          const starved = state.logistics.starvedTerritoryIds.includes(territoryId);
          return <article key={territoryId} className={`logistics-priority-card ${allocation.priority} ${starved ? 'starved' : ''}`}>
            <header>
              <button type="button" onClick={() => onOpenTerritory(territoryId)}><strong>{TERRITORIES[territoryId].name}</strong><span>{state.territories[territoryId].occupation} · resistance {Math.round(state.territories[territoryId].resistance)}</span></button>
              <b>{allocation.administrationDemand ? Math.round(allocation.administrationDelivered / allocation.administrationDemand * 100) : 100}% delivery</b>
            </header>
            <div className="logistics-throughput-row">
              <span>Requested <strong>{allocation.administrationDemand}</strong></span>
              <span>Delivered <strong>{allocation.administrationDelivered}</strong></span>
              <span>{formatNumber(Object.values(state.taskGroups).filter(group => group.location === territoryId).reduce((sum, group) => sum + group.personnel, 0))} personnel present</span>
            </div>
            <PrioritySelect
              label="Administration priority"
              value={override ?? 'automatic'}
              effective={allocation.priority}
              onChange={value => onChange(setTerritoryLogisticsPriority(state, territoryId, value))}
            />
            {starved && <p className="priority-starvation-warning">Administration is below 40% of demand. Legitimacy and resistance control are at risk.</p>}
          </article>;
        })}</div>
      </section>
    </div>}

    {activeTab === 'diagnostics' && <div className="logistics-tab-panel">
      <section className={`view-panel logistics-diagnostics-panel ${clarity.severity}`} data-wp6-diagnostics="true">
        <div className="view-panel-heading"><p className="panel-label">NETWORK DIAGNOSTICS · {clarity.trend.toUpperCase()}</p><strong>{state.logistics.networkEfficiency}%</strong></div>
        <p className="panel-copy">Diagnostics are always available. Each item identifies the symptom, the likely constraint and the command area that can actually address it.</p>
        {clarity.diagnostics.length ? <div className="logistics-diagnostic-list">{clarity.diagnostics.map(item => <article key={item.id} className={item.severity}>
          <div className="diagnostic-copy">
            <header><strong>{item.title}</strong><b>{item.severity}</b></header>
            <p>{item.detail}</p>
            <small><b>What to do:</b> {diagnosticGuidance(item)}</small>
          </div>
          <DiagnosticAction
            item={item}
            onOpenGroup={onOpenGroup}
            onOpenTerritory={onOpenTerritory}
            onOpenInfrastructure={onOpenInfrastructure}
            onReviewPriorities={() => setActiveTab('formations')}
          />
        </article>)}</div> : <div className="logistics-healthy-state">
          <strong>No active supply fault</strong>
          <p>The network is currently meeting formation and administration demand. This does not mean every route is equally valuable; review Formations or Territories if you want to establish deliberate priorities before demand rises.</p>
          <button type="button" onClick={() => setActiveTab('formations')}>Review priorities anyway</button>
        </div>}
      </section>

      <section className="view-panel logistics-bottleneck-panel diagnostics-routes">
        <div className="view-panel-heading"><p className="panel-label">NETWORK BOTTLENECKS</p><strong>{bottlenecks.length}</strong></div>
        {bottlenecks.length ? <div className="logistics-bottleneck-list">{bottlenecks.map(route => {
          const flow = state.logistics.routeFlows[route.id];
          return <button type="button" key={route.id} onClick={onOpenInfrastructure}>
            <span><strong>{route.name}</strong><small>{flow.used} / {flow.capacity} throughput · {flow.condition}</small></span>
            <b>{Math.round(flow.utilisation)}%</b>
          </button>;
        })}</div> : <p className="empty-state">No strategic corridor is currently operating above 85% of capacity.</p>}
      </section>
    </div>}
  </section>;
}