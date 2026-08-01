import { useMemo, useState } from 'react';
import { MapView } from './components/MapView';
import { TERRAIN_LABELS, TERRITORIES } from './game/data';
import { beginOperation, endTurn, loadGame, newGame, saveGame, selectTerritory } from './game/engine';
import type { GameState } from './game/types';

const formatNumber=(n:number)=>new Intl.NumberFormat('en-GB').format(n);

export default function App(){
  const [state,setState]=useState<GameState>(()=>newGame());
  const selected=state.selectedTerritory?TERRITORIES[state.selectedTerritory]:null;
  const target=state.targetTerritory?TERRITORIES[state.targetTerritory]:null;
  const controlled=Object.values(state.territories).filter(t=>t.controller==='player').length;
  const escalationLabel=state.escalation>=88?'Strategic crisis':state.escalation>=75?'Coalition war':state.escalation>=60?'Intervention':state.escalation>=40?'Material support':state.escalation>=25?'Sanctions':state.escalation>=15?'Monitoring':'Local response';
  const canAttack=Boolean(target&&!state.battle&&state.status==='playing');
  const armourPercent=Math.round(state.functionalArmour/Math.max(1,state.futureTroops)*100);
  const instruction=useMemo(()=>state.battle?`Operation active: ${state.battle.progress}% progress towards ${TERRITORIES[state.battle.target].centre}.`:target?`Target selected: ${target.centre}. Review the forecast and begin the operation.`:'Select a controlled territory, then choose an adjacent enemy territory.',[state.battle,target]);
  const load=()=>{const saved=loadGame();if(saved)setState(saved);};
  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">PHASE III / OPERATIONAL COMMAND</p><h1>FUTURE CONQUEST</h1></div><div className="turn-block"><span>DAY</span><strong>{String(state.turn).padStart(3,'0')}</strong></div></header>
    <section className="metrics">
      <div><span>Future personnel</span><strong>{formatNumber(state.futureTroops)}</strong></div>
      <div><span>Functional armour</span><strong>{armourPercent}%</strong></div>
      <div><span>Supply</span><strong>{state.supply}%</strong></div>
      <div><span>Territories</span><strong>{controlled} / 15</strong></div>
      <div className="escalation"><span>Global escalation · {escalationLabel}</span><div className="meter"><i style={{width:`${state.escalation}%`}}/></div><strong>{Math.round(state.escalation)}</strong></div>
    </section>
    <section className="workspace">
      <div className="map-panel"><div className="map-heading"><p>{instruction}</p><div className="legend"><span className="player-dot"/>Controlled <span className="enemy-dot"/>Enemy <span className="battle-dot"/>Operation</div></div><MapView state={state} onSelect={id=>setState(s=>selectTerritory(s,id))}/></div>
      <aside className="command-panel">
        <section><p className="panel-label">SELECTED TERRITORY</p><h2>{selected?.name??'None selected'}</h2>{selected&&<><p className="centre">Strategic centre: {selected.centre}</p><dl><div><dt>Terrain</dt><dd>{TERRAIN_LABELS[selected.terrain]}</dd></div><div><dt>Supply value</dt><dd>{selected.supply}</dd></div><div><dt>Control</dt><dd>{state.territories[selected.id].occupation}</dd></div><div><dt>Legitimacy</dt><dd>{Math.round(state.territories[selected.id].legitimacy)}</dd></div><div><dt>Resistance</dt><dd>{Math.round(state.territories[selected.id].resistance)}</dd></div></dl></>}</section>
        <section className="operation-card"><p className="panel-label">OPERATION FORECAST</p>{target?<><h3>{selected?.centre} → {target.centre}</h3><p>{target.terrain==='mountainous'?'Severe terrain advantage for defenders.':'Future forces are expected to hold the tactical advantage.'}</p><div className="forecast"><span>Committed</span><strong>{formatNumber(Math.min(2500,Math.max(900,Math.floor(state.futureTroops*.28))))}</strong></div><button className="primary" disabled={!canAttack} onClick={()=>setState(beginOperation)}>Begin operation</button></>:<p>Choose an adjacent enemy territory to generate a forecast.</p>}</section>
        <section className="controls"><button className="end-turn" onClick={()=>setState(endTurn)} disabled={state.status!=='playing'}>Resolve day {state.turn}</button><div><button onClick={()=>saveGame(state)}>Save</button><button onClick={load}>Load</button><button onClick={()=>setState(newGame())}>New campaign</button></div></section>
      </aside>
    </section>
    <section className="event-log"><div className="log-heading"><p className="panel-label">COMMAND LOG</p><span>Seed {state.seed}</span></div>{state.status!=='playing'&&<div className={`outcome ${state.status}`}><strong>{state.status==='victory'?'REGIONAL VICTORY':'CAMPAIGN DEFEAT'}</strong></div>}<div className="events">{state.events.map(e=><article key={e.id} className={e.tone}><time>DAY {String(e.turn).padStart(3,'0')}</time><p>{e.text}</p></article>)}</div></section>
  </main>;
}
