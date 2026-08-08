import { crisisLimitForDifficulty } from '../game/enemy-strategy';
import type { GameState } from '../game/types';
import './strategic-collapse.css';

interface Props {
  state: GameState;
  onContinue: () => void;
  onSurrender: () => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);

export function StrategicCollapseDecision({ state, onContinue, onSurrender }: Props) {
  const crisisDays = state.enemyStrategy.operationalCrisisTurns;
  const crisisLimit = crisisLimitForDifficulty(state.difficulty);
  const personnel = Object.values(state.taskGroups).reduce((sum, group) => sum + group.personnel, 0);
  const formations = Object.values(state.taskGroups).filter(group => group.personnel > 0).length;
  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;
  const starved = state.logistics.starvedFormationIds.length;

  return <div className="strategic-collapse-backdrop" role="presentation">
    <section className="strategic-collapse-dialog" role="alertdialog" aria-modal="true" aria-labelledby="strategic-collapse-title" aria-describedby="strategic-collapse-description">
      <p className="panel-label">STRATEGIC COLLAPSE</p>
      <h2 id="strategic-collapse-title">Command cohesion has crossed the failure threshold</h2>
      <p id="strategic-collapse-description" className="strategic-collapse-lead">
        The campaign has not been automatically destroyed. Formations and controlled territory remain, but the expedition has stayed in operational crisis long enough that senior command recommends ending organised resistance.
      </p>

      <div className="strategic-collapse-metrics" aria-label="Collapse assessment">
        <div><span>Crisis duration</span><strong>{crisisDays} / {crisisLimit} days</strong></div>
        <div><span>Active personnel</span><strong>{formatNumber(personnel)}</strong></div>
        <div><span>Active formations</span><strong>{formations}</strong></div>
        <div><span>Controlled territories</span><strong>{controlled}</strong></div>
        <div><span>Network supply</span><strong>{state.logistics.networkEfficiency}%</strong></div>
        <div><span>Starved formations</span><strong>{starved}</strong></div>
      </div>

      <div className="strategic-collapse-options">
        <article>
          <h3>Continue anyway</h3>
          <p>The campaign remains active with the current losses, pressure and logistics state intact. This crisis episode will not ask again unless you first recover fully, then later collapse again.</p>
        </article>
        <article>
          <h3>Surrender campaign</h3>
          <p>Accept the strategic assessment and end the campaign as a defeat. The normal defeat ending and reload options will follow.</p>
        </article>
      </div>

      <div className="strategic-collapse-actions">
        <button type="button" className="collapse-continue" onClick={onContinue}>CONTINUE ANYWAY</button>
        <button type="button" className="danger-action collapse-surrender" onClick={onSurrender}>SURRENDER CAMPAIGN</button>
      </div>
    </section>
  </div>;
}
