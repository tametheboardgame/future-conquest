import { useMemo, useState } from 'react';
import { MapView } from './components/MapView';
import { TERRAIN_LABELS, TERRITORIES } from './game/data';
import { beginOperation, endTurn, futureFormations, getOperationForecast, loadGame, moveSelectedFormation, newGame, saveGame, selectFormation, selectTerritory, totalFunctionalArmour, totalFuturePersonnel } from './game/engine';
import type { GameState } from './game/types';

const formatNumber=(value:number)=>new Intl.NumberFormat('en-GB').format(value);
const statusLabel=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);

export default function App(){
  const [state,setState]=useState<GameState>(()=>newGame());
  const selectedTerritory=state.selectedTerritory?TERRITORIES[state.selectedTerritory]:null;
  const target=state.targetTerritory?TERRITORIES[state.targetTerritory]:null;
  const selectedFormation=state.selectedFormationId?state.formations[state.selectedFormationId]:null;
  const formationRoster=futureFormations(state);
  const controlled=Object.values(state.territories).filter(territory=>territory.controller==='player').length;
  const personnel=totalFuturePersonnel(state);
  const armourPercent=Math.round(totalFunctionalArmour(state)/Math.max(1,personnel)*100);
  const forecast=getOperationForecast(state);
  const canMove=Boolean(selectedFormation&&target&&state.territories[target.id].controller==='player'&&selectedFormation.operations>0&&selectedFormation.status==='ready');
  const canAttack=Boolean(forecast&&selectedFormation&&selectedFormation.operations>0&&selectedFormation.status==='ready'&&!state.battle);
  const escalationLabel=state.escalation>=88?'Strategic crisis':state.escalation>=75?'Coalition war':state.escalation>=60?'Intervention':state.escalation>=40?'Material support':state.escalation>=25?'Sanctions':state.escalation>=15?'Monitoring':'Local response';
  const instruction=useMemo(()=>{
    if(state.battle)return `${state.formations[state.battle.attackerFormationId].shortName} operation active: ${state.battle.progress}% progress towards ${TERRITORIES[state.battle.target].centre}.`;
    if(target)return `${target.centre} selected for ${state.territories[target.id].controller==='player'?'movement':'attack'}. Review and issue the order.`;
    return 'Select a future formation, then choose an adjacent territory for movement or attack.';
  },[state.battle,state.formations,state.territories,target]);
  const load=()=>{const saved=loadGame();if(saved)setState(saved);};

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">PHASE III / OPERATIONAL COMMAND</p><h1>FUTURE CONQUEST</h1></div><div className="turn-block"><span>DAY</span><strong>{String(state.turn).padStart(3,'0')}</strong></div></header>
    <section className="metrics">
      <div><span>Future personnel</span><strong>{formatNumber(personnel)}</strong></div>
      <div><span>Functional armour</span><strong>{armourPercent}%</strong></div>
      <div><span>Supply network</span><strong>{state.supply}%</strong></div>
      <div><span>Territories</span><strong>{controlled} / 15</strong></div>
      <div className="escalation"><span>Global escalation · {escalationLabel}</span><div className="meter"><i style={{width:`${state.escalation}%`}}/></div><strong>{Math.round(state.escalation)}</strong></div>
    </section>
    <section className="formation-strip" aria-label="Future formation roster">
      {formationRoster.map(formation=><button key={formation.id} className={`${formation.id===state.selectedFormationId?'active':''} ${formation.generalPresent?'command':''}`} onClick={()=>setState(current=>selectFormation(current,formation.id))}>
        <span>{formation.generalPresent?'GENERAL · ':''}{formation.shortName}</span><strong>{formatNumber(formation.personnel)}</strong><small>{TERRITORIES[formation.territoryId].centre} · {formation.operations?'Ready':'Spent'}</small>
      </button>)}
    </section>
    <section className="workspace">
      <div className="map-panel"><div className="map-heading"><p>{instruction}</p><div className="legend"><span className="player-dot"/>Controlled <span className="enemy-dot"/>Enemy <span className="battle-dot"/>Operation</div></div><MapView state={state} onSelectTerritory={id=>setState(current=>selectTerritory(current,id))} onSelectFormation={id=>setState(current=>selectFormation(current,id))}/></div>
      <aside className="command-panel">
        <section className="formation-detail"><p className="panel-label">SELECTED FORMATION</p>{selectedFormation?<><div className="formation-title"><h2>{selectedFormation.name}</h2>{selectedFormation.generalPresent&&<span>GENERAL</span>}</div><p className="centre">Currently at {TERRITORIES[selectedFormation.territoryId].centre}</p><dl><div><dt>Personnel</dt><dd>{formatNumber(selectedFormation.personnel)} / {formatNumber(selectedFormation.maxPersonnel)}</dd></div><div><dt>Functional armour</dt><dd>{formatNumber(selectedFormation.functionalArmour)}</dd></div><div><dt>Damaged / broken</dt><dd>{formatNumber(selectedFormation.damagedArmour)} / {formatNumber(selectedFormation.brokenArmour)}</dd></div><div><dt>Cohesion</dt><dd>{Math.round(selectedFormation.cohesion)}%</dd></div><div><dt>Supply</dt><dd>{statusLabel(selectedFormation.supply)}</dd></div><div><dt>Orders</dt><dd>{selectedFormation.operations?'Available':'Committed'}</dd></div></dl></>:<p>Select a surviving task group.</p>}</section>
        <section className="territory-detail"><p className="panel-label">TERRITORY INTELLIGENCE</p><h3>{selectedTerritory?.name??'None selected'}</h3>{selectedTerritory&&<><p className="centre">Strategic centre: {selectedTerritory.centre}</p><dl><div><dt>Terrain</dt><dd>{TERRAIN_LABELS[selectedTerritory.terrain]}</dd></div><div><dt>Supply value</dt><dd>{selectedTerritory.supply}</dd></div><div><dt>Control</dt><dd>{state.territories[selectedTerritory.id].occupation}</dd></div><div><dt>Legitimacy</dt><dd>{Math.round(state.territories[selectedTerritory.id].legitimacy)}</dd></div><div><dt>Resistance</dt><dd>{Math.round(state.territories[selectedTerritory.id].resistance)}</dd></div></dl></>}</section>
        <section className="operation-card"><p className="panel-label">ORDER / FORECAST</p>{target&&selectedFormation?<><h3>{TERRITORIES[selectedFormation.territoryId].centre} → {target.centre}</h3>{state.territories[target.id].controller==='player'?<><p>Friendly redeployment. This consumes the formation's order for the day.</p><button className="primary" disabled={!canMove} onClick={()=>setState(moveSelectedFormation)}>Move formation</button></>:forecast?<><div className={`assessment ${forecast.assessment}`}>{forecast.assessment} operation</div><div className="forecast"><span>Known defenders</span><strong>{formatNumber(forecast.defenders)}</strong></div><div className="forecast"><span>Estimated losses</span><strong>{formatNumber(forecast.likelyFutureLosses[0])}–{formatNumber(forecast.likelyFutureLosses[1])}</strong></div><button className="primary" disabled={!canAttack} onClick={()=>setState(beginOperation)}>Begin operation</button></>:<p>Insufficient intelligence for an operation forecast.</p>}</>:state.battle?<p>The current operation resolves when the day advances. Other formations may still redeploy.</p>:<p>Choose an adjacent territory to prepare an order.</p>}</section>
        <section className="controls"><button className="end-turn" onClick={()=>setState(endTurn)} disabled={state.status!=='playing'}>Resolve day {state.turn}</button><div><button onClick={()=>saveGame(state)}>Save</button><button onClick={load}>Load</button><button onClick={()=>setState(newGame())}>New campaign</button></div></section>
      </aside>
    </section>
    <section className="event-log"><div className="log-heading"><p className="panel-label">COMMAND LOG</p><span>Seed {state.seed} · Save v0.2</span></div>{state.status!=='playing'&&<div className={`outcome ${state.status}`}><strong>{state.status==='victory'?'REGIONAL VICTORY':'CAMPAIGN DEFEAT'}</strong></div>}<div className="events">{state.events.map(event=><article key={event.id} className={event.tone}><time>DAY {String(event.turn).padStart(3,'0')}</time><p>{event.text}</p></article>)}</div></section>
  </main>;
}
