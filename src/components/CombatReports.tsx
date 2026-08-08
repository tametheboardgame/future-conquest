import { TERRITORIES } from '../game/data';
import { estimateCombatFigure, operationCurrentFriendlyStrength } from '../game/combat-reports';
import { getEnemyContacts } from '../game/operational-clarity';
import type { CombatReport, GameState } from '../game/types';

interface ReportsProps {
  state: GameState;
  onOpenTerritory: (territoryId: string) => void;
}

interface AlertProps {
  report: CombatReport;
  onReview: () => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);
const estimated = (value: number) => `~${formatNumber(estimateCombatFigure(value))}`;

const outcomeLabel: Record<CombatReport['outcome'], string> = {
  victory: 'OBJECTIVE SECURED',
  withdrawal: 'OPERATION WITHDRAWN',
  repelled: 'COUNTERATTACK REPELLED',
  'territory-lost': 'TERRITORY LOST'
};

export function CombatAfterActionAlert({ report, onReview }: AlertProps) {
  return <section className={`combat-report-alert ${report.outcome}`} aria-live="polite" data-wp5-after-action-alert="true">
    <div>
      <small>AFTER-ACTION REPORT · DAY {String(report.turn).padStart(3, '0')}</small>
      <strong>{outcomeLabel[report.outcome]} · {TERRITORIES[report.territoryId].centre}</strong>
      <span>{formatNumber(report.playerStartingPersonnel)} committed → {formatNumber(report.playerEndingPersonnel)} active · {formatNumber(report.playerKilled)} killed · {formatNumber(report.playerWounded)} wounded</span>
    </div>
    <button type="button" onClick={onReview}>Review battle report</button>
  </section>;
}

export function CombatReportsPanel({ state, onOpenTerritory }: ReportsProps) {
  const reports = state.combatReports ?? [];
  const contacts = getEnemyContacts(state);
  const activeOperations = Object.values(state.operations)
    .filter(operation => operation.combat)
    .sort((a, b) => b.days - a.days || a.target.localeCompare(b.target));

  return <section className="view-panel combat-report-panel" data-wp5-combat-reports="true">
    <div className="view-panel-heading"><p className="panel-label">COMBAT REPORTING</p><strong>{reports.length} AAR</strong></div>
    <p className="combat-report-explainer">Killed are permanent losses. Wounded leave active strength and enter the recoverable wounded pool. “Returned” records personnel restored to active formations during a multi-day operation.</p>

    {activeOperations.length > 0 && <div className="active-combat-ledgers">
      <h3>Active combat ledger</h3>
      {activeOperations.map(operation => {
        const ledger = operation.combat!;
        const current = operationCurrentFriendlyStrength(state, operation);
        const contact = contacts.find(item => item.territoryId === operation.target);
        return <article key={operation.id} className="active-combat-card">
          <header><div><small>DAY {operation.days} · ACTIVE</small><strong>{TERRITORIES[operation.target].centre}</strong></div><b>{operation.progress}%</b></header>
          <div className="combat-strength-line"><span>Friendly active</span><strong>{formatNumber(ledger.committedPersonnel)} committed → {formatNumber(current.personnel)} now</strong></div>
          <dl>
            <div><dt>Killed</dt><dd>{formatNumber(ledger.playerKilled)}</dd></div>
            <div><dt>Wounded</dt><dd>{formatNumber(ledger.playerWounded)}</dd></div>
            <div><dt>Armour damaged</dt><dd>{formatNumber(ledger.armourDamaged)}</dd></div>
            <div><dt>Enemy contact</dt><dd>{contact ? `${formatNumber(contact.estimatedMin)}–${formatNumber(contact.estimatedMax)}` : 'Unknown'}</dd></div>
          </dl>
          <button type="button" onClick={() => onOpenTerritory(operation.target)}>Open on map</button>
        </article>;
      })}
    </div>}

    <div className="after-action-reports">
      <h3>After-action reports</h3>
      {reports.length ? reports.slice(0, 12).map(report => <article key={report.id} className={`after-action-card ${report.outcome}`}>
        <header>
          <div><small>DAY {String(report.turn).padStart(3, '0')} · {report.durationDays} day{report.durationDays === 1 ? '' : 's'}</small><strong>{TERRITORIES[report.territoryId].centre}</strong></div>
          <b>{outcomeLabel[report.outcome]}</b>
        </header>
        <p>{report.note}</p>
        <div className="after-action-sides">
          <section>
            <h4>Future forces</h4>
            <div className="combat-strength-line"><span>Active strength</span><strong>{formatNumber(report.playerStartingPersonnel)} → {formatNumber(report.playerEndingPersonnel)}</strong></div>
            <dl>
              <div><dt>Killed</dt><dd>{formatNumber(report.playerKilled)}</dd></div>
              <div><dt>Wounded</dt><dd>{formatNumber(report.playerWounded)}</dd></div>
              <div><dt>Returned to duty</dt><dd>{formatNumber(report.playerReturnedToDuty)}</dd></div>
              {report.playerOtherLosses > 0 && <div><dt>Captured / scattered</dt><dd>{formatNumber(report.playerOtherLosses)}</dd></div>}
              <div><dt>Functional armour</dt><dd>{formatNumber(report.playerStartingFunctionalArmour)} → {formatNumber(report.playerEndingFunctionalArmour)}</dd></div>
              <div><dt>Armour damaged</dt><dd>{formatNumber(report.playerArmourDamaged)}</dd></div>
              {report.playerArmourRepaired > 0 && <div><dt>Armour repaired</dt><dd>{formatNumber(report.playerArmourRepaired)}</dd></div>}
            </dl>
          </section>
          <section className="enemy-aar">
            <h4>Enemy assessment</h4>
            <div className="combat-strength-line"><span>Personnel</span><strong>{estimated(report.enemyStartingPersonnel)} → {estimated(report.enemyEndingPersonnel)}</strong></div>
            <dl>
              <div><dt>Personnel losses</dt><dd>{estimated(report.enemyPersonnelLosses)}</dd></div>
              <div><dt>Armour at contact</dt><dd>{estimated(report.enemyStartingArmour)}</dd></div>
              <div><dt>Armour losses</dt><dd>{estimated(report.enemyArmourLosses)}</dd></div>
            </dl>
            <small>Enemy figures are rounded battlefield assessments, not exact intelligence.</small>
          </section>
        </div>
        {report.participantNames.length > 0 && <footer><span>Committed formations</span><strong>{report.participantNames.join(', ')}</strong></footer>}
        <button type="button" onClick={() => onOpenTerritory(report.territoryId)}>Open territory on map</button>
      </article>) : <p className="empty-state">No concluded battles have generated an after-action report yet.</p>}
    </div>
  </section>;
}
