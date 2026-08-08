import type { Dispatch, SetStateAction } from 'react';
import { TERRITORIES } from '../game/data';
import { getTerritoryDefenceAssessment } from '../game/defence';
import {
  entrenchTerritory,
  prepareTerritoryDefence,
  reinforceTerritory,
  setFormationGarrison
} from '../game/engine';
import {
  effectiveTerritoryLogisticsPriority,
  setTerritoryLogisticsPriority
} from '../game/supply-network';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  territoryId: string;
  onChange: Dispatch<SetStateAction<GameState>>;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);

export function DefencePanel({ state, territoryId, onChange }: Props) {
  const assessment = getTerritoryDefenceAssessment(state, territoryId);
  if (!assessment) return null;

  const localGroups = Object.values(state.taskGroups)
    .filter(group => group.location === territoryId && group.personnel > 0)
    .sort((first, second) => first.status.localeCompare(second.status) || second.personnel - first.personnel);
  const entrenchGroup = assessment.preferredEntrenchGroupId
    ? state.taskGroups[assessment.preferredEntrenchGroupId]
    : undefined;
  const reinforcement = assessment.reinforcementCandidateId
    ? state.taskGroups[assessment.reinforcementCandidateId]
    : undefined;
  const territory = state.territories[territoryId];
  const logisticsPriority = effectiveTerritoryLogisticsPriority(state, territoryId);
  const canEntrench = Boolean(
    entrenchGroup
    && entrenchGroup.supply >= 8
    && territory.fortification < 45
    && territory.lastEntrenchTurn !== state.turn
  );
  const canPrepare = localGroups.some(group => !group.order && (group.status === 'ready' || group.status === 'garrison') && group.supply >= 5)
    && (territory.defencePreparedUntil ?? 0) < state.turn + 2;
  const supplyPrioritised = logisticsPriority === 'critical' || logisticsPriority === 'high';

  return <section className={`territory-defence-section ${assessment.defensivePosition}`} data-wp4-defence="true">
    <div className="defence-heading">
      <div>
        <p className="panel-label">DEFENCE</p>
        <h4>{assessment.defensivePositionLabel}</h4>
      </div>
      <span className={`attack-probability ${assessment.attackProbabilityLabel.toLowerCase()}`}>
        {assessment.attackProbability}% attack risk · {assessment.attackProbabilityLabel}
      </span>
    </div>

    <div className="defence-metrics">
      <div><span>Garrison</span><strong>{formatNumber(assessment.garrisonPersonnel)}</strong><small>{assessment.garrisonFormationCount} formation{assessment.garrisonFormationCount === 1 ? '' : 's'}</small></div>
      <div><span>Mobile forces</span><strong>{formatNumber(assessment.mobilePersonnel)}</strong><small>{assessment.localFormationCount} total local</small></div>
      <div><span>Entrenchment</span><strong>{assessment.fortification} / 45</strong><small>{assessment.prepared ? `Prepared to day ${assessment.preparedUntilTurn}` : 'Normal posture'}</small></div>
      <div><span>Supply reserve</span><strong>{assessment.supplyReserve}%</strong><small>{assessment.supplied ? 'Network connected' : 'Isolated'}</small></div>
      <div><span>Enemy threat</span><strong>{assessment.threateningFormationCount || '—'}</strong><small>{assessment.estimatedThreatPersonnel > 0 ? `~${formatNumber(assessment.estimatedThreatPersonnel)} personnel nearby` : 'No assessed assault mass'}</small></div>
      <div><span>Supply priority</span><strong>{logisticsPriority.toUpperCase()}</strong><small>Administration allocation</small></div>
    </div>

    <div className="defence-assessment-copy">
      <strong>Defensive assessment</strong>
      <ul>{assessment.reasons.slice(0, 4).map(reason => <li key={reason}>{reason}</li>)}</ul>
    </div>

    <div className="defence-actions" aria-label={`Defence actions for ${TERRITORIES[territoryId].centre}`}>
      <button
        type="button"
        disabled={!canEntrench}
        onClick={() => entrenchGroup && onChange(current => entrenchTerritory(current, territoryId, entrenchGroup.id))}
        title={!entrenchGroup ? 'Assign a local formation to garrison duty first.' : territory.lastEntrenchTurn === state.turn ? 'Entrenchment work has already been ordered this day.' : undefined}
      >
        Entrench
      </button>
      <button type="button" disabled={!canPrepare} onClick={() => onChange(current => prepareTerritoryDefence(current, territoryId))}>
        {assessment.prepared ? 'Extend defence preparation' : 'Prepare defence'}
      </button>
      <button type="button" disabled={!reinforcement} onClick={() => onChange(current => reinforceTerritory(current, territoryId))}>
        {reinforcement ? `Reinforce · ${reinforcement.name}` : 'No adjacent reinforcement'}
      </button>
      <button type="button" disabled={supplyPrioritised} onClick={() => onChange(current => setTerritoryLogisticsPriority(current, territoryId, 'high'))}>
        {supplyPrioritised ? 'Supply prioritised' : 'Prioritise supply'}
      </button>
    </div>

    <div className="defence-garrison-list">
      <div className="defence-subheading"><strong>Local formations</strong><span>Establish or adjust the garrison directly.</span></div>
      {localGroups.length ? localGroups.map(group => {
        const committed = Boolean(group.order) || !['ready', 'garrison'].includes(group.status);
        return <article key={group.id} className={group.status === 'garrison' ? 'garrisoned' : ''}>
          <div><strong>{group.name}</strong><span>{formatNumber(group.personnel)} personnel · {group.status} · stock {Math.round(group.supply)}%</span></div>
          <button
            type="button"
            disabled={committed}
            onClick={() => onChange(current => setFormationGarrison(current, group.id, group.status !== 'garrison'))}
          >
            {group.status === 'garrison' ? 'Release' : 'Assign garrison'}
          </button>
        </article>;
      }) : <p className="defence-empty">No friendly formation is physically present.</p>}
    </div>
  </section>;
}
