import { useMemo, useState } from 'react';
import { MapView } from './components/MapView';
import { TERRAIN_LABELS, TERRITORIES } from './game/data';
import {
  beginOperation,
  endTurn,
  enemyStrengthAt,
  issueMove,
  loadGame,
  newGame,
  saveGame,
  selectTaskGroup,
  selectTerritory,
  setGarrison
} from './game/engine';
import type { Difficulty, GameState } from './game/types';

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);

export default function App() {
  const [state, setState] = useState<GameState>(() => newGame());
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('standard');
  const selectedGroup = state.taskGroups[state.selectedTaskGroupId];
  const selected = state.selectedTerritory ? TERRITORIES[state.selectedTerritory] : null;
  const target = state.targetTerritory ? TERRITORIES[state.targetTerritory] : null;
  const targetState = target ? state.territories[target.id] : null;
  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const groups = Object.values(state.taskGroups);
  const totalPersonnel = groups.reduce((sum, group) => sum + group.personnel, 0);
  const functionalArmour = groups.reduce((sum, group) => sum + group.functionalArmour, 0);
  const totalArmour = groups.reduce((sum, group) => sum + group.functionalArmour + group.damagedArmour, 0);
  const armourPercent = Math.round(functionalArmour / Math.max(1, totalArmour) * 100);
  const enemyAtTarget = target && targetState?.controller === 'enemy' ? enemyStrengthAt(state, target.id) : null;
  const escalationLabel = state.escalation >= 88 ? 'Strategic crisis' : state.escalation >= 75 ? 'Coalition war' : state.escalation >= 60 ? 'Intervention' : state.escalation >= 40 ? 'Material support' : state.escalation >= 25 ? 'Sanctions' : state.escalation >= 15 ? 'Monitoring' : 'Local response';
  const groupBusy = Boolean(selectedGroup.order || state.battle?.attackerGroupId === selectedGroup.id);
  const canMove = Boolean(target && targetState?.controller === 'player' && !groupBusy && state.status === 'playing');
  const canAttack = Boolean(target && targetState?.controller === 'enemy' && !state.battle && !groupBusy && state.status === 'playing');
  const instruction = useMemo(() => {
    if (state.battle) {
      const attacker = state.taskGroups[state.battle.attackerGroupId];
      return `${attacker.name} is fighting towards ${TERRITORIES[state.battle.target].centre}: ${state.battle.progress}% operational progress.`;
    }
    if (selectedGroup.order?.type === 'move') return `${selectedGroup.name} is moving towards ${TERRITORIES[selectedGroup.order.target].centre}. Resolve the day to advance.`;
    if (target && targetState?.controller === 'player') return `Movement route selected: ${TERRITORIES[selectedGroup.location].centre} → ${target.centre}.`;
    if (target) return `Attack target selected: ${target.centre}. Review the defenders before committing ${selectedGroup.name}.`;
    return 'Select a task group, then choose an adjacent controlled territory to move or an adjacent enemy territory to attack.';
  }, [selectedGroup, state.battle, state.taskGroups, target, targetState]);
  const load = () => {
    const saved = loadGame();
    if (saved) setState(saved);
  };

  return <main className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">PHASE IV / FORMATION COMMAND</p><h1>FUTURE CONQUEST</h1></div>
      <div className="turn-block"><span>DAY</span><strong>{String(state.turn).padStart(3, '0')}</strong><em>{state.difficulty}</em></div>
    </header>

    <section className="metrics">
      <div><span>Active personnel</span><strong>{formatNumber(totalPersonnel)}</strong></div>
      <div><span>Functional armour</span><strong>{armourPercent}%</strong></div>
      <div><span>Network supply</span><strong>{state.supply}%</strong></div>
      <div><span>Wounded</span><strong>{formatNumber(state.woundedPool)}</strong></div>
      <div><span>Territories</span><strong>{controlled} / 15</strong></div>
      <div className="escalation"><span>Global escalation · {escalationLabel}</span><div className="meter"><i style={{ width: `${state.escalation}%` }} /></div><strong>{Math.round(state.escalation)}</strong></div>
    </section>

    <section className="workspace">
      <div className="map-panel">
        <div className="map-heading">
          <p>{instruction}</p>
          <div className="legend"><span className="player-dot" />Controlled <span className="enemy-dot" />Enemy <span className="group-dot" />Task group <span className="formation-dot" />Enemy formation</div>
        </div>
        <MapView state={state} onSelect={id => setState(current => selectTerritory(current, id))} onSelectGroup={id => setState(current => selectTaskGroup(current, id))} />
      </div>

      <aside className="command-panel">
        <section className="task-groups">
          <p className="panel-label">TASK GROUPS</p>
          <div className="task-group-list">
            {groups.map(group => <button key={group.id} className={group.id === selectedGroup.id ? 'active' : ''} onClick={() => setState(current => selectTaskGroup(current, group.id))}>
              <span><strong>{group.name}</strong><small>{TERRITORIES[group.location].centre} · {group.status}</small></span>
              <span className="group-stats"><b>{formatNumber(group.personnel)}</b><small>{group.supply}% supply</small></span>
            </button>)}
          </div>
        </section>

        <section className="selected-group">
          <p className="panel-label">SELECTED FORMATION</p>
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
        </section>

        <section className="territory-card">
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
        </section>

        <section className="operation-card">
          <p className="panel-label">FORMATION ORDERS</p>
          {state.battle ? <>
            <h3>{state.taskGroups[state.battle.attackerGroupId].name} → {TERRITORIES[state.battle.target].centre}</h3>
            <p>{state.battle.progress}% operational progress after {state.battle.days} day{state.battle.days === 1 ? '' : 's'}.</p>
            <div className="forecast"><span>Enemy formations</span><strong>{state.battle.enemyFormationIds.length}</strong></div>
          </> : selectedGroup.order ? <>
            <h3>{selectedGroup.order.type === 'move' ? 'Movement underway' : 'Operation underway'}</h3>
            <p>{selectedGroup.name} is committed to {TERRITORIES[selectedGroup.order.target].centre}. Resolve the next day.</p>
            <div className="forecast"><span>Progress</span><strong>{selectedGroup.order.progress}%</strong></div>
          </> : target && targetState?.controller === 'player' ? <>
            <h3>Move to {target.centre}</h3>
            <p>Movement occupies the formation for at least one day. Upland and mountain routes may require longer.</p>
            <button className="primary" disabled={!canMove} onClick={() => setState(issueMove)}>Issue movement order</button>
          </> : target && enemyAtTarget ? <>
            <h3>{TERRITORIES[selectedGroup.location].centre} → {target.centre}</h3>
            <p>{target.terrain === 'mountainous' ? 'Severe terrain and entrenched defenders favour the enemy.' : 'A persistent enemy command is defending this territory. Losses will carry into later battles.'}</p>
            <div className="forecast"><span>Enemy formations</span><strong>{enemyAtTarget.formations}</strong></div>
            <div className="forecast"><span>Estimated personnel</span><strong>{formatNumber(enemyAtTarget.personnel)}</strong></div>
            <div className="forecast"><span>Enemy armour</span><strong>{formatNumber(enemyAtTarget.armour)}</strong></div>
            <button className="primary danger-action" disabled={!canAttack} onClick={() => setState(beginOperation)}>Begin operation</button>
          </> : <>
            <p>Choose an adjacent territory for movement or attack orders.</p>
            <button className="secondary" disabled={groupBusy || state.status !== 'playing'} onClick={() => setState(setGarrison)}>{selectedGroup.status === 'garrison' ? 'Release from garrison' : 'Assign as garrison'}</button>
          </>}
        </section>

        <section className="controls">
          <button className="end-turn" onClick={() => setState(endTurn)} disabled={state.status !== 'playing'}>Resolve day {state.turn}</button>
          <div><button onClick={() => saveGame(state)}>Save</button><button onClick={load}>Load</button></div>
          <div className="new-campaign"><select value={newDifficulty} onChange={(event: { target: { value: string } }) => setNewDifficulty(event.target.value as Difficulty)}><option value="story">Story</option><option value="standard">Standard</option><option value="hard">Hard</option></select><button onClick={() => setState(newGame(undefined, newDifficulty))}>New campaign</button></div>
        </section>
      </aside>
    </section>

    <section className="event-log">
      <div className="log-heading"><p className="panel-label">COMMAND LOG</p><span>Seed {state.seed}</span></div>
      {state.status !== 'playing' && <div className={`outcome ${state.status}`}><strong>{state.status === 'victory' ? 'REGIONAL VICTORY' : 'CAMPAIGN DEFEAT'}</strong></div>}
      <div className="events">{state.events.map(event => <article key={event.id} className={event.tone}><time>DAY {String(event.turn).padStart(3, '0')}</time><p>{event.text}</p></article>)}</div>
    </section>
  </main>;
}
