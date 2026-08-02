import { useMemo, useState } from 'react';
import { CommandNavigation, type CommandView } from './components/CommandNavigation';
import { ForceOrganisationPanel } from './components/ForceOrganisationPanel';
import { FormationRoster } from './components/FormationRoster';
import { MapView } from './components/MapView';
import { TERRAIN_LABELS, TERRITORIES } from './game/data';
import {
  beginOperation,
  canIssueOperationalOrder,
  endTurn,
  enemyStrengthAt,
  getOperationAtTarget,
  getOperationForGroup,
  issueMove,
  loadGame,
  newGame,
  saveGame,
  selectTaskGroup,
  selectTerritory,
  setGarrison
} from './game/engine';
import { occupationRequirement } from './game/formation-organisation';
import { getEscalationStage } from './game/strategic-response';
import { getAdjacentOrderTargets, getOrderTargetInfo } from './game/order-targeting';
import type { Difficulty, GameState, Operation } from './game/types';

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);
const operationTitle = (operation: Operation) => `Operation ${TERRITORIES[operation.target].centre}`;

export default function App() {
  const [state, setState] = useState<GameState>(() => newGame());
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('standard');
  const [currentView, setCurrentView] = useState<CommandView>('map');

  const groups = Object.values(state.taskGroups);
  const operations = Object.values(state.operations).sort((a, b) => a.target.localeCompare(b.target));
  const enemyFormations = Object.values(state.enemyFormations)
    .filter(formation => formation.personnel > 0)
    .sort((a, b) => TERRITORIES[a.location].centre.localeCompare(TERRITORIES[b.location].centre) || a.name.localeCompare(b.name));
  const territoryDefinitions = Object.values(TERRITORIES).sort((a, b) => a.centre.localeCompare(b.centre));
  const selectedGroup = state.taskGroups[state.selectedTaskGroupId] ?? groups[0] ?? null;
  const selectedOperation = selectedGroup ? getOperationForGroup(state, selectedGroup.id) : undefined;
  const selected = state.selectedTerritory ? TERRITORIES[state.selectedTerritory] : null;
  const target = state.targetTerritory ? TERRITORIES[state.targetTerritory] : null;
  const targetState = target ? state.territories[target.id] : null;
  const targetOperation = target ? getOperationAtTarget(state, target.id) : undefined;
  const targetInfo = selectedGroup && target ? getOrderTargetInfo(state, target.id, selectedGroup.id) : null;
  const adjacentTargetNames = selectedGroup
    ? getAdjacentOrderTargets(state, selectedGroup.id).map(id => TERRITORIES[id].centre).join(', ')
    : '';

  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const unsecured = Object.values(state.territories).filter(territory => territory.controller === 'player' && territory.occupation === 'unsecured').length;
  const isolated = Object.values(state.territories).filter(territory => territory.controller === 'player' && !territory.supplied).length;
  const totalPersonnel = groups.reduce((sum, group) => sum + group.personnel, 0);
  const functionalArmour = groups.reduce((sum, group) => sum + group.functionalArmour, 0);
  const totalArmour = groups.reduce((sum, group) => sum + group.functionalArmour + group.damagedArmour, 0);
  const armourPercent = Math.round(functionalArmour / Math.max(1, totalArmour) * 100);
  const enemyPersonnel = enemyFormations.reduce((sum, formation) => sum + formation.personnel, 0);
  const enemyArmour = enemyFormations.reduce((sum, formation) => sum + formation.armour, 0);
  const enemyAtTarget = target && targetState?.controller === 'enemy' ? enemyStrengthAt(state, target.id) : null;
  const escalationStage = getEscalationStage(state.escalation);
  const escalationLabel = escalationStage.label;
  const pendingMobilisations = [...state.mobilisations].filter(project => project.status === 'preparing').sort((a, b) => a.arrivalTurn - b.arrivalTurn);
  const activeEnemyOrders = state.enemyOrders.filter(order => order.status !== 'completed').slice(0, 8);
  const intelligenceReports = state.intelligenceReports.slice(0, 10);
  const canOrderSelected = canIssueOperationalOrder(selectedGroup ?? undefined);
  const canMove = Boolean(selectedGroup && targetInfo?.kind === 'move' && canOrderSelected && state.status === 'playing');
  const canAttack = Boolean(selectedGroup && targetInfo?.kind === 'attack' && canOrderSelected && state.status === 'playing');

  const frontlineTerritories = territoryDefinitions.filter(territory => {
    const territoryState = state.territories[territory.id];
    return territoryState.controller === 'enemy' && territory.neighbours.some(neighbour => state.territories[neighbour]?.controller === 'player');
  });
  const supplyDisruptions = territoryDefinitions.filter(territory => {
    const territoryState = state.territories[territory.id];
    return territoryState.controller === 'player' && !territoryState.supplied;
  });
  const recentAlerts = state.events.filter(event => event.tone === 'warning' || event.tone === 'danger').slice(0, 8);
  const availableGroups = groups.filter(group => canIssueOperationalOrder(group));

  const instruction = useMemo(() => {
    if (!selectedGroup) return 'No operational task groups remain. The expedition has lost combat cohesion.';
    if (selectedOperation) {
      return `${selectedGroup.name} is committed to ${operationTitle(selectedOperation)}: ${selectedOperation.progress}% progress with ${selectedOperation.participantGroupIds.length} participating task group${selectedOperation.participantGroupIds.length === 1 ? '' : 's'}.`;
    }
    if (selectedGroup.order?.type === 'move') return `${selectedGroup.name} is moving towards ${TERRITORIES[selectedGroup.order.target].centre}. Other formations may still receive orders before the day resolves.`;
    if (selectedGroup.status === 'recovering') return `${selectedGroup.name} is recovering and cannot receive orders until the next supplied day resolves.`;
    if (targetInfo?.kind === 'out-of-range' && target) return `${target.centre} is outside ${selectedGroup.name}'s operational reach from ${TERRITORIES[selectedGroup.location].centre}. Available adjacent targets are marked ATTACK or MOVE.`;
    if (targetInfo?.kind === 'move' && target) return `Movement route selected: ${TERRITORIES[selectedGroup.location].centre} → ${target.centre}.`;
    if (targetInfo?.kind === 'attack' && targetOperation && target) return `${target.centre} already has an active operation. Review it and select Join operation to reinforce it.`;
    if (targetInfo?.kind === 'attack' && target) return `Attack target selected: ${target.centre}. Review the defenders and select Begin operation.`;
    return 'Issue independent orders to each task group, then resolve the day. Several movements and operations can run simultaneously.';
  }, [selectedGroup, selectedOperation, target, targetInfo, targetOperation]);

  const load = () => {
    const saved = loadGame();
    if (saved) {
      setState(saved);
      setCurrentView('map');
    }
  };

  const openTerritoryOnMap = (id: string) => {
    setState(current => selectTerritory(current, id));
    setCurrentView('map');
  };

  const openGroupOnMap = (id: string) => {
    setState(current => selectTaskGroup(current, id));
    setCurrentView('map');
  };

  const startCampaign = () => {
    setState(newGame(undefined, newDifficulty));
    setCurrentView('map');
  };

  const renderSelectedGroupPanel = () => <section className="selected-group selected-formation-card">
    <p className="panel-label">SELECTED FORMATION</p>
    {selectedGroup ? <>
      <h2>{selectedGroup.name}</h2>
      <p className="centre">Located at {TERRITORIES[selectedGroup.location].centre}</p>
      <dl>
        <div><dt>Personnel</dt><dd>{formatNumber(selectedGroup.personnel)} / {formatNumber(selectedGroup.maxPersonnel)}</dd></div>
        <div><dt>Functional armour</dt><dd>{formatNumber(selectedGroup.functionalArmour)}</dd></div>
        <div><dt>Damaged armour</dt><dd>{formatNumber(selectedGroup.damagedArmour)}</dd></div>
        <div><dt>Morale</dt><dd>{Math.round(selectedGroup.morale)}%</dd></div>
        <div><dt>Local supply</dt><dd>{Math.round(selectedGroup.supply)}%</dd></div>
        <div><dt>Status</dt><dd>{selectedGroup.status}</dd></div>
      </dl>
    </> : <><h2>No formation available</h2><p className="centre">The expedition can no longer issue operational orders.</p></>}
  </section>;

  const renderTerritoryPanel = () => <section className="territory-card">
    <p className="panel-label">MAP INTELLIGENCE</p>
    <h3>{selected?.name ?? 'No territory selected'}</h3>
    {selected && <>
      <p className="centre">Strategic centre: {selected.centre}</p>
      <dl>
        <div><dt>Terrain</dt><dd>{TERRAIN_LABELS[selected.terrain]}</dd></div>
        <div><dt>Supply value</dt><dd>{selected.supply}</dd></div>
        <div><dt>Control</dt><dd>{state.territories[selected.id].occupation}</dd></div>
        <div><dt>Supply route</dt><dd>{state.territories[selected.id].supplied ? 'connected' : 'isolated'}</dd></div>
        <div><dt>Fortification</dt><dd>{Math.round(state.territories[selected.id].fortification)}</dd></div>
        {state.territories[selected.id].controller === 'player' && <>
          <div><dt>Legitimacy</dt><dd>{Math.round(state.territories[selected.id].legitimacy)}</dd></div>
          <div><dt>Resistance</dt><dd>{Math.round(state.territories[selected.id].resistance)}</dd></div>
        </>}
      </dl>
    </>}
  </section>;

  const renderOrdersPanel = () => <section className="operation-card">
    <p className="panel-label">FORMATION ORDERS</p>
    {!selectedGroup ? <p>No task group is available to receive orders.</p> : selectedOperation ? <>
      <h3>{selectedGroup.name} → {TERRITORIES[selectedOperation.target].centre}</h3>
      <p>This formation is one of {selectedOperation.participantGroupIds.length} task group{selectedOperation.participantGroupIds.length === 1 ? '' : 's'} assigned to the operation.</p>
      <div className="forecast"><span>Operation progress</span><strong>{selectedOperation.progress}%</strong></div>
      <div className="forecast"><span>Days engaged</span><strong>{selectedOperation.days}</strong></div>
      <div className="forecast"><span>Enemy formations</span><strong>{selectedOperation.enemyFormationIds.length}</strong></div>
    </> : selectedGroup.order?.type === 'move' ? <>
      <h3>Movement underway</h3>
      <p>{selectedGroup.name} is moving to {TERRITORIES[selectedGroup.order.target].centre}. Other task groups remain available for separate orders.</p>
      <div className="forecast"><span>Progress</span><strong>{selectedGroup.order.progress}%</strong></div>
    </> : selectedGroup.status === 'recovering' ? <>
      <h3>Formation recovering</h3>
      <p>{selectedGroup.name} cannot move, attack or enter garrison duty until a supplied recovery day resolves.</p>
    </> : target && targetState?.controller === 'player' ? <>
      <h3>Move to {target.centre}</h3>
      {targetInfo?.kind === 'out-of-range' ? <>
        <p>This province is not adjacent to {TERRITORIES[selectedGroup.location].centre}. Move the task group through controlled territory first.</p>
        <div className="forecast"><span>Available now</span><strong>{adjacentTargetNames}</strong></div>
      </> : <p>Movement occupies only this formation. Other task groups can move or attack during the same day.</p>}
      <button className="primary" disabled={!canMove} onClick={() => setState(issueMove)}>{canMove ? 'Issue movement order' : 'Out of operational range'}</button>
    </> : target && enemyAtTarget ? <>
      <h3>{TERRITORIES[selectedGroup.location].centre} → {target.centre}</h3>
      {targetInfo?.kind === 'out-of-range' ? <>
        <p>This enemy province is not adjacent to the selected task group. Select a province marked ATTACK or move closer through controlled territory.</p>
        <div className="forecast"><span>Available now</span><strong>{adjacentTargetNames}</strong></div>
      </> : targetOperation ? <>
        <p>An operation is already underway. Joining commits {selectedGroup.name} as an additional attacking formation.</p>
        <div className="forecast"><span>Current participants</span><strong>{targetOperation.participantGroupIds.length}</strong></div>
        <div className="forecast"><span>Current progress</span><strong>{targetOperation.progress}%</strong></div>
      </> : <p>{target.terrain === 'mountainous' ? 'Severe terrain and entrenched defenders favour the enemy.' : 'A persistent enemy command is defending this territory. Losses will carry into later battles.'}</p>}
      <div className="forecast"><span>Enemy formations</span><strong>{enemyAtTarget.formations}</strong></div>
      <div className="forecast"><span>Estimated personnel</span><strong>{formatNumber(enemyAtTarget.personnel)}</strong></div>
      <div className="forecast"><span>Enemy armour</span><strong>{formatNumber(enemyAtTarget.armour)}</strong></div>
      <button className="primary danger-action" disabled={!canAttack} onClick={() => setState(beginOperation)}>{canAttack ? (targetOperation ? 'Join operation' : 'Begin operation') : 'Out of operational range'}</button>
    </> : <>
      <p>Select one of the provinces marked ATTACK or MOVE on the map. Available from {TERRITORIES[selectedGroup.location].centre}: {adjacentTargetNames}.</p>
      <button className="secondary" disabled={!canOrderSelected || state.status !== 'playing'} onClick={() => setState(setGarrison)}>{selectedGroup.status === 'garrison' ? 'Release from garrison' : 'Assign as garrison'}</button>
    </>}
  </section>;

  return <main className="app-shell command-app-shell">
    <button className="persistence-save-proxy" onClick={() => saveGame(state)} tabIndex={-1} aria-hidden="true">Save</button>

    <header className="topbar command-topbar">
      <div><p className="eyebrow">PHASE VIII-A / STRATEGIC RESPONSE</p><h1>FUTURE CONQUEST</h1></div>
      <div className="topbar-command-actions">
        <button className="global-resolve" onClick={() => setState(endTurn)} disabled={state.status !== 'playing'}>Resolve all orders · day {state.turn}</button>
        <div className="turn-block"><span>DAY</span><strong>{String(state.turn).padStart(3, '0')}</strong><em>{state.difficulty}</em></div>
      </div>
    </header>

    <section className="metrics command-metrics">
      <div><span>Active personnel</span><strong>{formatNumber(totalPersonnel)}</strong></div>
      <div><span>Functional armour</span><strong>{armourPercent}%</strong></div>
      <div><span>Network supply</span><strong>{state.supply}%</strong></div>
      <div><span>Active operations</span><strong>{operations.length}</strong></div>
      <div><span>Territories</span><strong>{controlled} / {territoryDefinitions.length}</strong></div>
      <div className="escalation"><span>Global escalation · Stage {escalationStage.id} · {escalationLabel}</span><div className="meter"><i style={{ width: `${state.escalation}%` }} /></div><strong>{Math.round(state.escalation)}</strong></div>
    </section>

    {state.status !== 'playing' && <div className={`command-outcome ${state.status}`}><strong>{state.status === 'victory' ? 'REGIONAL VICTORY' : 'CAMPAIGN DEFEAT'}</strong><span>Review the campaign log or begin a new campaign.</span></div>}

    <section className="command-workspace">
      <CommandNavigation
        active={currentView}
        onChange={setCurrentView}
        badges={{ forces: groups.length, operations: operations.length, territories: `${controlled}/${territoryDefinitions.length}`, intelligence: frontlineTerritories.length }}
      />

      <div className={`command-stage command-stage-${currentView}`}>
        {currentView === 'map' && <section className="workspace command-map-workspace">
          <div className="map-panel">
            <div className="map-heading">
              <p>{instruction}</p>
              <div className="legend"><span className="player-dot" />Controlled <span className="enemy-dot" />Enemy <span className="group-dot" />Task group <span className="formation-dot" />Enemy formation · Dashed routes show active operations</div>
            </div>
            <MapView state={state} onSelect={id => setState(current => selectTerritory(current, id))} onSelectGroup={id => setState(current => selectTaskGroup(current, id))} />
          </div>

          <aside className="command-panel map-context-panel">
            <section className="quick-command">
              <div className="quick-command-heading"><p className="panel-label">COMMAND MAP</p><span>{availableGroups.length} ready</span></div>
              <label>Active formation
                <select value={selectedGroup?.id ?? ''} onChange={event => setState(current => selectTaskGroup(current, event.target.value))}>
                  {groups.map(group => <option key={group.id} value={group.id}>{group.name} · {TERRITORIES[group.location].centre}</option>)}
                </select>
              </label>
              <div className="quick-links"><button onClick={() => setCurrentView('forces')}>Manage forces</button><button onClick={() => setCurrentView('operations')}>Review operations</button></div>
            </section>
            {renderSelectedGroupPanel()}
            {renderTerritoryPanel()}
            {renderOrdersPanel()}
          </aside>
        </section>}

        {currentView === 'forces' && <section className="command-view forces-view">
          <header className="command-view-header"><div><p className="panel-label">FORCES</p><h2>Formation command</h2></div><p>Search, inspect and reorganise every expeditionary formation without obscuring the campaign map.</p></header>
          <div className="forces-command-grid">
            <FormationRoster state={state} selectedGroup={selectedGroup} onSelect={id => setState(current => selectTaskGroup(current, id))} />
            <div className="command-view-stack">
              {renderSelectedGroupPanel()}
              <ForceOrganisationPanel state={state} selectedGroup={selectedGroup} onChange={setState} />
              {selectedGroup && <section className="view-panel view-action-panel"><p className="panel-label">MAP LOCATION</p><h3>{TERRITORIES[selectedGroup.location].name}</h3><p>Centre the command map on this formation and issue operational orders.</p><button className="primary" onClick={() => openGroupOnMap(selectedGroup.id)}>Open on command map</button></section>}
            </div>
          </div>
        </section>}

        {currentView === 'operations' && <section className="command-view operations-view">
          <header className="command-view-header"><div><p className="panel-label">OPERATIONS</p><h2>Operational command</h2></div><p>Track concurrent offensives, committed formations and the forces still available for new orders.</p></header>
          <div className="operations-command-grid">
            <section className="view-panel operations-board">
              <div className="view-panel-heading"><p className="panel-label">ACTIVE OPERATIONS</p><strong>{operations.length}</strong></div>
              {operations.length ? <div className="operation-command-list">{operations.map(operation => {
                const participantNames = operation.participantGroupIds.map(id => state.taskGroups[id]?.name).filter(Boolean).join(', ');
                const defenders = enemyStrengthAt(state, operation.target);
                return <article key={operation.id} className="operation-command-card">
                  <div className="operation-card-heading"><div><small>DAY {operation.days}</small><h3>{operationTitle(operation)}</h3></div><strong>{operation.progress}%</strong></div>
                  <div className="operation-progress"><i style={{ width: `${Math.max(0, Math.min(100, operation.progress))}%` }} /></div>
                  <dl>
                    <div><dt>Participants</dt><dd>{operation.participantGroupIds.length}</dd></div>
                    <div><dt>Enemy formations</dt><dd>{defenders.formations}</dd></div>
                    <div><dt>Enemy personnel</dt><dd>{formatNumber(defenders.personnel)}</dd></div>
                  </dl>
                  <p>{participantNames || 'No active formations'}</p>
                  <button onClick={() => openTerritoryOnMap(operation.target)}>Open operation on map</button>
                </article>;
              })}</div> : <div className="view-empty"><h3>No active operations</h3><p>Select an adjacent enemy territory on the Command Map to begin an offensive.</p><button className="primary" onClick={() => setCurrentView('map')}>Open command map</button></div>}
            </section>

            <section className="view-panel available-forces-panel">
              <div className="view-panel-heading"><p className="panel-label">AVAILABLE FORMATIONS</p><strong>{availableGroups.length}</strong></div>
              <div className="compact-formation-list">{groups.map(group => <button key={group.id} onClick={() => openGroupOnMap(group.id)} className={canIssueOperationalOrder(group) ? '' : 'unavailable'}>
                <span><strong>{group.name}</strong><small>{TERRITORIES[group.location].centre} · {group.status}</small></span>
                <b>{formatNumber(group.personnel)}</b>
              </button>)}</div>
            </section>

            <section className="view-panel operational-reports">
              <div className="view-panel-heading"><p className="panel-label">RECENT REPORTS</p><strong>{state.events.length}</strong></div>
              <div className="vertical-event-list">{state.events.slice(0, 10).map(event => <article key={event.id} className={event.tone}><time>DAY {String(event.turn).padStart(3, '0')}</time><p>{event.text}</p></article>)}</div>
            </section>
          </div>
        </section>}

        {currentView === 'territories' && <section className="command-view territories-view">
          <header className="command-view-header"><div><p className="panel-label">TERRITORIES</p><h2>Territorial administration</h2></div><p>Review control, occupation, supply and garrison demand across the current operational theatre.</p></header>
          <div className="territory-summary-strip">
            <div><span>Controlled</span><strong>{controlled}</strong></div>
            <div><span>Unsecured</span><strong>{unsecured}</strong></div>
            <div><span>Isolated</span><strong>{isolated}</strong></div>
            <div><span>Enemy-held</span><strong>{territoryDefinitions.length - controlled}</strong></div>
          </div>
          <div className="territory-command-grid">{territoryDefinitions.map(territory => {
            const territoryState = state.territories[territory.id];
            const defenders = territoryState.controller === 'enemy' ? enemyStrengthAt(state, territory.id) : null;
            return <article key={territory.id} className={`territory-command-card ${territoryState.controller} ${territoryState.supplied ? 'supplied' : 'isolated'}`}>
              <div className="territory-command-heading"><div><small>{territory.id}</small><h3>{territory.name}</h3><span>{territory.centre}</span></div><b>{territoryState.occupation}</b></div>
              <dl>
                <div><dt>Terrain</dt><dd>{TERRAIN_LABELS[territory.terrain]}</dd></div>
                <div><dt>Supply value</dt><dd>{territory.supply}</dd></div>
                <div><dt>Supply route</dt><dd>{territoryState.supplied ? 'Connected' : 'Isolated'}</dd></div>
                <div><dt>Fortification</dt><dd>{Math.round(territoryState.fortification)}</dd></div>
                {territoryState.controller === 'player' ? <>
                  <div><dt>Occupation need</dt><dd>{formatNumber(occupationRequirement(territory.id))}</dd></div>
                  <div><dt>Resistance</dt><dd>{Math.round(territoryState.resistance)}</dd></div>
                </> : <>
                  <div><dt>Enemy formations</dt><dd>{defenders?.formations ?? 0}</dd></div>
                  <div><dt>Enemy personnel</dt><dd>{formatNumber(defenders?.personnel ?? 0)}</dd></div>
                </>}
              </dl>
              <button onClick={() => openTerritoryOnMap(territory.id)}>Select on map</button>
            </article>;
          })}</div>
        </section>}

        {currentView === 'intelligence' && <section className="command-view intelligence-view">
          <header className="command-view-header"><div><p className="panel-label">INTELLIGENCE</p><h2>Strategic picture</h2></div><p>Consolidated enemy strength, frontline pressure, escalation and supply warnings.</p></header>
          <div className="intelligence-command-grid">
            <section className="view-panel escalation-panel">
  <p className="panel-label">GLOBAL ESCALATION · STAGE {escalationStage.id}</p>
  <div className="escalation-readout"><strong>{Math.round(state.escalation)}</strong><span>{escalationLabel}</span></div>
  <div className="large-meter"><i style={{ width: `${state.escalation}%` }} /></div>
  <p className="escalation-stage-copy">{escalationStage.description}</p>
  <div className="strategic-response-summary">
    <div><span>Mobilisation reserve</span><strong>{formatNumber(state.mobilisationPool)}</strong></div>
    <div><span>Pending formations</span><strong>{pendingMobilisations.length}</strong></div>
    <div><span>Active enemy plans</span><strong>{activeEnemyOrders.length}</strong></div>
  </div>
  <div className="stage-threshold"><span>Next stage</span><strong>{escalationStage.nextThreshold === null ? 'Maximum escalation' : `${escalationStage.nextThreshold}%`}</strong></div>
</section>
            <section className="view-panel enemy-summary-panel">
              <p className="panel-label">KNOWN ENEMY STRENGTH</p>
              <div className="intelligence-kpis"><div><span>Formations</span><strong>{enemyFormations.length}</strong></div><div><span>Personnel</span><strong>{formatNumber(enemyPersonnel)}</strong></div><div><span>Armour</span><strong>{formatNumber(enemyArmour)}</strong></div></div>
            </section>
<section className="view-panel mobilisation-panel">
  <div className="view-panel-heading"><p className="panel-label">MOBILISATION PIPELINE</p><strong>{pendingMobilisations.length}</strong></div>
  {pendingMobilisations.length ? <div className="mobilisation-list">{pendingMobilisations.map(project => <article key={project.id} className="mobilisation-card">
    <header><strong>{project.name}</strong><b>DAY {String(project.arrivalTurn).padStart(3, '0')}</b></header>
    <p>{project.source} · expected entry at {project.entryTerritory ? TERRITORIES[project.entryTerritory].centre : 'an unconfirmed location'}.</p>
    <dl><div><dt>Personnel</dt><dd>{formatNumber(project.personnel)}</dd></div><div><dt>Armour</dt><dd>{formatNumber(project.armour)}</dd></div><div><dt>Status</dt><dd>{project.status}</dd></div></dl>
  </article>)}</div> : <p className="empty-state">No additional formations are currently preparing to enter the theatre.</p>}
</section>
<section className="view-panel enemy-plan-panel">
  <div className="view-panel-heading"><p className="panel-label">ASSESSED ENEMY INTENT</p><strong>{activeEnemyOrders.length}</strong></div>
  {activeEnemyOrders.length ? <div className="enemy-plan-list">{activeEnemyOrders.map(order => <article key={order.id} className="enemy-plan-card">
    <header><strong>{order.summary}</strong><b className="order-type">{order.type}</b></header>
    <p>{order.origin ? `${TERRITORIES[order.origin].centre} → ` : ''}{TERRITORIES[order.target].centre}{order.executeTurn ? ` · expected day ${String(order.executeTurn).padStart(3, '0')}` : ''} · {order.status}</p>
  </article>)}</div> : <p className="empty-state">No coherent enemy operational plan has been identified this day.</p>}
</section>
<section className="view-panel intelligence-report-panel">
  <div className="view-panel-heading"><p className="panel-label">INTELLIGENCE REPORTS</p><strong>{intelligenceReports.length}</strong></div>
  <div className="intelligence-report-list">{intelligenceReports.map(report => <article key={report.id} className={`intelligence-report-card ${report.confidence}`}>
    <header><strong>{report.title}</strong><b>{report.confidence} confidence</b></header>
    <p>{report.detail}</p>
    {(report.estimatedMin !== undefined || report.territoryId) && <small>{report.estimatedMin !== undefined && report.estimatedMax !== undefined ? `Estimated strength ${formatNumber(report.estimatedMin)}–${formatNumber(report.estimatedMax)}` : ''}{report.territoryId ? `${report.estimatedMin !== undefined ? ' · ' : ''}${TERRITORIES[report.territoryId].centre}` : ''}</small>}
  </article>)}</div>
</section>
            <section className="view-panel frontline-panel">
              <div className="view-panel-heading"><p className="panel-label">FRONTLINE THREATS</p><strong>{frontlineTerritories.length}</strong></div>
              {frontlineTerritories.length ? <div className="intelligence-list">{frontlineTerritories.map(territory => {
                const strength = enemyStrengthAt(state, territory.id);
                return <button key={territory.id} onClick={() => openTerritoryOnMap(territory.id)}><span><strong>{territory.name}</strong><small>{territory.centre} · {TERRAIN_LABELS[territory.terrain]}</small></span><b>{strength.formations} / {formatNumber(strength.personnel)}</b></button>;
              })}</div> : <p className="empty-state">No enemy-held province currently borders controlled territory.</p>}
            </section>
            <section className="view-panel enemy-order-panel">
              <div className="view-panel-heading"><p className="panel-label">ENEMY ORDER OF BATTLE</p><strong>{enemyFormations.length}</strong></div>
              <div className="enemy-formation-table">{enemyFormations.map(formation => <article key={formation.id}>
                <div><strong>{formation.name}</strong><span>{TERRITORIES[formation.location].centre}</span></div>
                <dl><div><dt>Personnel</dt><dd>{formatNumber(formation.personnel)}</dd></div><div><dt>Armour</dt><dd>{formatNumber(formation.armour)}</dd></div><div><dt>Readiness</dt><dd>{Math.round(formation.readiness)}%</dd></div><div><dt>Entrenchment</dt><dd>{Math.round(formation.entrenchment)}%</dd></div></dl>
              </article>)}</div>
            </section>
            <section className="view-panel warning-panel">
              <div className="view-panel-heading"><p className="panel-label">SUPPLY WARNINGS</p><strong>{supplyDisruptions.length}</strong></div>
              {supplyDisruptions.length ? <div className="intelligence-list">{supplyDisruptions.map(territory => <button key={territory.id} onClick={() => openTerritoryOnMap(territory.id)}><span><strong>{territory.name}</strong><small>Controlled but isolated</small></span><b>RECONNECT</b></button>)}</div> : <p className="empty-state">All controlled territories are connected to the supply network.</p>}
            </section>
            <section className="view-panel alert-panel">
              <div className="view-panel-heading"><p className="panel-label">RECENT ALERTS</p><strong>{recentAlerts.length}</strong></div>
              <div className="vertical-event-list">{recentAlerts.length ? recentAlerts.map(event => <article key={event.id} className={event.tone}><time>DAY {String(event.turn).padStart(3, '0')}</time><p>{event.text}</p></article>) : <p className="empty-state">No recent warning or danger reports.</p>}</div>
            </section>
          </div>
        </section>}

        {currentView === 'campaign' && <section className="command-view campaign-view">
          <header className="command-view-header"><div><p className="panel-label">CAMPAIGN</p><h2>Campaign control</h2></div><p>Save, restore or restart the campaign and review the complete command log.</p></header>
          <div className="campaign-command-grid">
            <section className="view-panel campaign-controls-panel">
              <p className="panel-label">CAMPAIGN FILE</p>
              <div className="campaign-status-card"><span>Current campaign</span><strong>Day {String(state.turn).padStart(3, '0')}</strong><small>Seed {state.seed} · {state.difficulty} · {controlled}/{territoryDefinitions.length} territories</small></div>
              <div className="campaign-file-actions"><button onClick={() => saveGame(state)}>Save</button><button onClick={load}>Load</button></div>
              <div className="new-campaign-controls"><label>New campaign difficulty<select value={newDifficulty} onChange={event => setNewDifficulty(event.target.value as Difficulty)}><option value="story">Story</option><option value="standard">Standard</option><option value="hard">Hard</option></select></label><button className="danger-action" onClick={startCampaign}>New campaign</button></div>
            </section>
            <section className="view-panel campaign-overview-panel">
              <p className="panel-label">CAMPAIGN SUMMARY</p>
              <dl>
                <div><dt>Status</dt><dd>{state.status}</dd></div><div><dt>Escalation stage</dt><dd>{escalationStage.id} · {escalationLabel}</dd></div><div><dt>Mobilisation reserve</dt><dd>{formatNumber(state.mobilisationPool)}</dd></div>
                <div><dt>Wounded pool</dt><dd>{formatNumber(state.woundedPool)}</dd></div>
                <div><dt>Active personnel</dt><dd>{formatNumber(totalPersonnel)}</dd></div>
                <div><dt>Enemy personnel known</dt><dd>{formatNumber(enemyPersonnel)}</dd></div>
                <div><dt>Unsecured territories</dt><dd>{unsecured}</dd></div>
                <div><dt>Supply disruptions</dt><dd>{isolated}</dd></div>
              </dl>
            </section>
            <section className="view-panel command-reference-panel">
              <p className="panel-label">COMMAND REFERENCE</p>
              <dl><div><dt>Map pan</dt><dd>Drag / arrow keys</dd></div><div><dt>Map zoom</dt><dd>Wheel / pinch / + −</dd></div><div><dt>Europe view</dt><dd>T or 0</dd></div><div><dt>Campaign view</dt><dd>C</dd></div><div><dt>Selected territory</dt><dd>F</dd></div></dl>
            </section>
          </div>
          <section className="event-log campaign-event-log">
            <div className="log-heading"><p className="panel-label">COMMAND LOG</p><span>{state.events.length} reports · {state.woundedPool} wounded</span></div>
            <div className="events campaign-events">{state.events.map(event => <article key={event.id} className={event.tone}><time>DAY {String(event.turn).padStart(3, '0')}</time><p>{event.text}</p></article>)}</div>
          </section>
        </section>}
      </div>
    </section>
  </main>;
}
