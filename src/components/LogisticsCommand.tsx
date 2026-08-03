import { TERRITORIES } from '../game/data';
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
}

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

export function LogisticsCommand({ state, onChange, onOpenGroup, onOpenTerritory }: Props) {
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

  return <section className="command-view logistics-priority-view">
    <header className="command-view-header">
      <div><p className="panel-label">LOGISTICS</p><h2>Supply priority command</h2></div>
      <p>Automatic priorities handle normal operations. Override them only when limited throughput requires a deliberate choice.</p>
    </header>

    <div className="logistics-priority-summary">
      <div><span>Source use</span><strong>{state.logistics.sourceUsed} / {state.logistics.sourceCapacity}</strong></div>
      <div><span>Demand served</span><strong>{state.logistics.totalDelivered} / {state.logistics.totalDemand}</strong></div>
      <div><span>Network efficiency</span><strong>{state.logistics.networkEfficiency}%</strong></div>
      <div className={shortfalls ? 'warning' : ''}><span>Severe shortfalls</span><strong>{shortfalls}</strong></div>
    </div>

    <section className="view-panel logistics-doctrine-panel">
      <div><p className="panel-label">ALLOCATION DOCTRINE</p><h3>Critical → High → Standard → Restricted</h3></div>
      <p>Higher tiers receive available throughput before lower tiers. Requests within the same tier are balanced proportionally. Automatic defaults make attacks Critical; movement, recovery, engineering and interdiction High; normal formations Standard; and stable administered territory Restricted.</p>
    </section>

    <div className="logistics-priority-grid">
      <section className="view-panel formation-priority-panel">
        <div className="view-panel-heading"><p className="panel-label">FORMATION PRIORITIES</p><strong>{groups.length}</strong></div>
        <div className="logistics-priority-list">{groups.map(group => {
          const allocation = state.logistics.formationAllocations[group.id];
          const override = state.logisticsPriorities.formationOverrides[group.id];
          const starved = state.logistics.starvedFormationIds.includes(group.id);
          return <article key={group.id} className={`logistics-priority-card ${allocation?.priority ?? 'standard'} ${starved ? 'starved' : ''}`}>
            <header>
              <button type="button" onClick={() => onOpenGroup(group.id)}><strong>{group.name}</strong><span>{TERRITORIES[group.location].centre} · {group.status}</span></button>
              <b>{allocation?.ratio ?? 0}%</b>
            </header>
            <div className="logistics-throughput-row">
              <span>Requested <strong>{allocation?.demand ?? 0}</strong></span>
              <span>Delivered <strong>{allocation?.delivered ?? 0}</strong></span>
              <span className={`supply-condition ${allocation?.condition ?? 'cut-off'}`}>{SUPPLY_CONDITION_LABELS[allocation?.condition ?? 'cut-off']}</span>
            </div>
            <PrioritySelect
              label="Formation priority"
              value={override ?? 'automatic'}
              effective={allocation?.priority ?? 'standard'}
              onChange={value => onChange(setFormationLogisticsPriority(state, group.id, value))}
            />
            {starved && <p className="priority-starvation-warning">Below 40% of daily demand. Movement, combat, repair and morale may deteriorate.</p>}
          </article>;
        })}</div>
      </section>

      <section className="view-panel administration-priority-panel">
        <div className="view-panel-heading"><p className="panel-label">ADMINISTRATION PRIORITIES</p><strong>{territories.length}</strong></div>
        <p className="panel-copy">These controls govern civil administration and occupation demand. Formation supply in the same territory remains separately prioritised.</p>
        <div className="logistics-priority-list compact">{territories.map(territoryId => {
          const allocation = state.logistics.territoryAllocations[territoryId];
          const override = state.logisticsPriorities.territoryOverrides[territoryId];
          const starved = state.logistics.starvedTerritoryIds.includes(territoryId);
          return <article key={territoryId} className={`logistics-priority-card ${allocation.priority} ${starved ? 'starved' : ''}`}>
            <header>
              <button type="button" onClick={() => onOpenTerritory(territoryId)}><strong>{TERRITORIES[territoryId].name}</strong><span>{state.territories[territoryId].occupation} · resistance {Math.round(state.territories[territoryId].resistance)}</span></button>
              <b>{allocation.administrationDemand ? Math.round(allocation.administrationDelivered / allocation.administrationDemand * 100) : 100}%</b>
            </header>
            <div className="logistics-throughput-row">
              <span>Requested <strong>{allocation.administrationDemand}</strong></span>
              <span>Delivered <strong>{allocation.administrationDelivered}</strong></span>
              <span>{formatNumber(Object.values(state.taskGroups).filter(group => group.location === territoryId).reduce((sum, group) => sum + group.personnel, 0))} personnel</span>
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

      <section className="view-panel logistics-bottleneck-panel">
        <div className="view-panel-heading"><p className="panel-label">NETWORK BOTTLENECKS</p><strong>{bottlenecks.length}</strong></div>
        {bottlenecks.length ? <div className="logistics-bottleneck-list">{bottlenecks.map(route => {
          const flow = state.logistics.routeFlows[route.id];
          return <button type="button" key={route.id} onClick={() => onOpenTerritory(route.toTerritoryId)}>
            <span><strong>{route.name}</strong><small>{flow.used} / {flow.capacity} throughput · {flow.condition}</small></span>
            <b>{Math.round(flow.utilisation)}%</b>
          </button>;
        })}</div> : <p className="empty-state">No strategic corridor is currently operating above 85% of capacity.</p>}
      </section>
    </div>
  </section>;
}
