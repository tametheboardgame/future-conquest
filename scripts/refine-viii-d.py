from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1):
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise RuntimeError(f'Pattern not found in {path}: {old[:120]!r}')
    file.write_text(content.replace(old, new, count))


# Make the guided sequence achievable from the initial one-territory position.
clarity = Path('src/game/operational-clarity.ts')
content = clarity.read_text()
content = content.replace(
    "  stage: 'preparing' | 'imminent' | 'under-attack';",
    "  stage: 'preparing' | 'imminent' | 'under-attack' | 'recent-combat';"
)
old_steps = """  {
    id: 'movement',
    title: 'Issue a movement order',
    instruction: 'On the map, select a controlled adjacent territory marked MOVE and issue a movement order. Resolve the day when ready.',
    target: 'map',
    trigger: 'issue-move'
  },
  {
    id: 'operation',
    title: 'Begin an offensive',
    instruction: 'Select an adjacent enemy territory marked ATTACK, review the corridor and begin or reinforce an operation.',
    target: 'operations',
    trigger: 'begin-operation'
  },
  {
    id: 'occupation',
    title: 'Secure captured ground',
    instruction: 'After capturing territory, select a formation there and assign it to garrison duty.',
    target: 'map',
    trigger: 'set-garrison'
  },
"""
new_steps = """  {
    id: 'operation',
    title: 'Begin the first offensive',
    instruction: 'On the map, select an adjacent enemy territory marked ATTACK, review the corridor and begin an operation.',
    target: 'map',
    trigger: 'begin-operation'
  },
  {
    id: 'occupation',
    title: 'Secure captured ground',
    instruction: 'Resolve campaign days until the territory is captured, then select a formation there and assign it to garrison duty.',
    target: 'map',
    trigger: 'set-garrison'
  },
  {
    id: 'movement',
    title: 'Reinforce the new position',
    instruction: 'Select another ready formation, choose the captured controlled territory marked MOVE and issue a movement order.',
    target: 'map',
    trigger: 'issue-move'
  },
"""
if old_steps not in content:
    raise RuntimeError('tutorial sequence block not found')
content = content.replace(old_steps, new_steps, 1)
old_threats = """export function getThreatenedTerritories(state: GameState): ThreatenedTerritory[] {
  return state.enemyOrders
    .filter(order => order.type === 'counterattack' && order.status !== 'completed' && state.territories[order.target]?.controller === 'player')
    .map(order => {
      const executeTurn = order.executeTurn ?? state.turn;
      const stage: ThreatenedTerritory['stage'] = executeTurn <= state.turn
        ? 'under-attack'
        : executeTurn <= state.turn + 1
          ? 'imminent'
          : 'preparing';
      return {
        territoryId: order.target,
        stage,
        executeTurn,
        formationCount: 1 + (order.supportFormationIds?.length ?? 0),
        summary: order.summary
      };
    })
    .sort((first, second) => first.executeTurn - second.executeTurn);
}
"""
new_threats = """export function getThreatenedTerritories(state: GameState): ThreatenedTerritory[] {
  const stageRank: Record<ThreatenedTerritory['stage'], number> = {
    'under-attack': 0,
    imminent: 1,
    preparing: 2,
    'recent-combat': 3
  };
  const candidates = state.enemyOrders
    .filter(order => order.type === 'counterattack')
    .flatMap(order => {
      const executeTurn = order.executeTurn ?? order.turn;
      const active = order.status !== 'completed' && state.territories[order.target]?.controller === 'player';
      const recent = order.status === 'completed' && state.turn - executeTurn >= 0 && state.turn - executeTurn <= 1;
      if (!active && !recent) return [];
      const stage: ThreatenedTerritory['stage'] = recent
        ? 'recent-combat'
        : executeTurn <= state.turn
          ? 'under-attack'
          : executeTurn <= state.turn + 1
            ? 'imminent'
            : 'preparing';
      return [{
        territoryId: order.target,
        stage,
        executeTurn,
        formationCount: 1 + (order.supportFormationIds?.length ?? 0),
        summary: recent ? `Enemy counterattack resolved at ${TERRITORIES[order.target].centre}` : order.summary
      }];
    })
    .sort((first, second) => stageRank[first.stage] - stageRank[second.stage] || first.executeTurn - second.executeTurn);

  return candidates.filter((candidate, index) => (
    candidates.findIndex(other => other.territoryId === candidate.territoryId) === index
  ));
}
"""
if old_threats not in content:
    raise RuntimeError('threat calculation block not found')
clarity.write_text(content.replace(old_threats, new_threats, 1))

# Keep recently completed concentration and reposition moves visible for one campaign day.
map_file = Path('src/components/MapView.tsx')
content = map_file.read_text()
content = content.replace(
    "const enemyMovementOrders = state.enemyOrders.filter(order => order.status !== 'completed' && order.origin && anchors[order.origin] && anchors[order.target] && (order.type === 'counterattack' || order.type === 'concentrate' || order.type === 'reposition'));",
    "const enemyMovementOrders = state.enemyOrders.filter(order => (order.status !== 'completed' || state.turn - order.turn <= 1) && order.origin && anchors[order.origin] && anchors[order.target] && (order.type === 'counterattack' || order.type === 'concentrate' || order.type === 'reposition'));"
)
content = content.replace(
    "${threat?.stage === 'under-attack' ? 'under-attack' : ''}`}",
    "${threat?.stage === 'under-attack' ? 'under-attack' : ''} ${threat?.stage === 'recent-combat' ? 'recent-combat' : ''}`}"
)
map_file.write_text(content)

# Remove exact enemy-strength leaks from player-facing screens and put diagnostics inside Logistics.
app = Path('src/App.tsx')
content = app.read_text()
content = re.sub(
    r"  const enemyFormations = Object\.values\(state\.enemyFormations\).*?  const territoryDefinitions =",
    "  const territoryDefinitions =",
    content,
    count=1,
    flags=re.S
)
content = content.replace(
    "  const enemyContacts = getEnemyContacts(state);\n",
    "  const enemyContacts = getEnemyContacts(state);\n  const confirmedEnemyContacts = enemyContacts.filter(contact => contact.confidence === 'confirmed').length;\n"
)
content = content.replace(
    "  const enemyArmour = enemyContacts.reduce((sum, contact) => sum + (contact.formationCount ?? 1) * 80, 0);\n  const enemyAtTarget = target && targetState?.controller === 'enemy' ? enemyStrengthAt(state, target.id) : null;",
    "  const targetContact = target ? enemyContacts.find(contact => contact.territoryId === target.id) : undefined;"
)
content = content.replace(
    "    </> : target && enemyAtTarget ? <>",
    "    </> : target && targetContact ? <>"
)
content = content.replace(
    "      <div className=\"forecast\"><span>Enemy formations</span><strong>{enemyAtTarget.formations}</strong></div>\n      <div className=\"forecast\"><span>Estimated personnel</span><strong>{formatNumber(enemyAtTarget.personnel)}</strong></div>\n      <div className=\"forecast\"><span>Enemy armour</span><strong>{formatNumber(enemyAtTarget.armour)}</strong></div>",
    "      <div className=\"forecast\"><span>Recon confidence</span><strong>{targetContact.confidence}</strong></div>\n      <div className=\"forecast\"><span>Assessed personnel</span><strong>{formatNumber(targetContact.estimatedMin)}–{formatNumber(targetContact.estimatedMax)}</strong></div>\n      <div className=\"forecast\"><span>Formation identity</span><strong>{targetContact.formationCount ? `${targetContact.formationCount} confirmed` : 'Unconfirmed'}</strong></div>"
)
content = content.replace(
    "                const defenders = enemyStrengthAt(state, operation.target);",
    "                const contact = enemyContacts.find(item => item.territoryId === operation.target);"
)
content = content.replace(
    "                    <div><dt>Enemy formations</dt><dd>{defenders.formations}</dd></div>\n                    <div><dt>Enemy personnel</dt><dd>{formatNumber(defenders.personnel)}</dd></div>",
    "                    <div><dt>Recon confidence</dt><dd>{contact?.confidence ?? 'contact lost'}</dd></div>\n                    <div><dt>Assessed personnel</dt><dd>{contact ? `${formatNumber(contact.estimatedMin)}–${formatNumber(contact.estimatedMax)}` : 'Unknown'}</dd></div>"
)
content = content.replace(
    "            const defenders = territoryState.controller === 'enemy' ? enemyStrengthAt(state, territory.id) : null;",
    "            const contact = territoryState.controller === 'enemy' ? enemyContacts.find(item => item.territoryId === territory.id) : undefined;"
)
content = content.replace(
    "                  <div><dt>Enemy formations</dt><dd>{defenders?.formations ?? 0}</dd></div>\n                  <div><dt>Enemy personnel</dt><dd>{formatNumber(defenders?.personnel ?? 0)}</dd></div>",
    "                  <div><dt>Enemy contact</dt><dd>{contact?.confidence ?? 'No current contact'}</dd></div>\n                  <div><dt>Assessed personnel</dt><dd>{contact ? `${formatNumber(contact.estimatedMin)}–${formatNumber(contact.estimatedMax)}` : 'Unknown'}</dd></div>"
)
content = content.replace(
    "        {currentView === 'logistics' && <LogisticsCommand state={state} onChange={setState} onOpenGroup={openGroupOnMap} onOpenTerritory={openTerritoryOnMap} />}",
    """        {currentView === 'logistics' && <div className="logistics-command-stack">
          <section className={`view-panel supply-diagnostics-panel ${supplyClarity.severity}`}>
            <div className="view-panel-heading"><p className="panel-label">NETWORK DIAGNOSTICS · {supplyClarity.trend.toUpperCase()}</p><strong>{state.logistics.networkEfficiency}%</strong></div>
            {supplyClarity.diagnostics.length ? <div className="supply-diagnostic-list">{supplyClarity.diagnostics.map(item => <article key={item.id} className={item.severity}>
              <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              {item.groupId ? <button type="button" onClick={() => openGroupOnMap(item.groupId!)}>Open formation</button> : item.territoryId ? <button type="button" onClick={() => openTerritoryOnMap(item.territoryId!)}>Open territory</button> : null}
            </article>)}</div> : <p className="empty-state">No active supply faults. The network is meeting current formation and administration demand.</p>}
          </section>
          <LogisticsCommand state={state} onChange={setState} onOpenGroup={openGroupOnMap} onOpenTerritory={openTerritoryOnMap} />
        </div>}"""
)
content = content.replace(
    "      <strong>ENEMY ACTION DETECTED · REINFORCEMENT MAY BE REQUIRED</strong>",
    "      <strong>ENEMY ACTION DETECTED · REVIEW THREATENED AND RECENTLY CONTESTED TERRITORIES</strong>"
)
content = content.replace(
    "        <strong>{threat.stage === 'under-attack' ? 'NOW' : `DAY ${threat.executeTurn}`}</strong>",
    "        <strong>{threat.stage === 'recent-combat' ? 'AFTER ACTION' : threat.stage === 'under-attack' ? 'NOW' : `DAY ${threat.executeTurn}`}</strong>"
)
content = content.replace(
    "              <p className=\"panel-label\">KNOWN ENEMY STRENGTH</p>\n              <div className=\"intelligence-kpis\"><div><span>Formations</span><strong>{enemyFormations.length}</strong></div><div><span>Personnel</span><strong>{formatNumber(enemyPersonnel)}</strong></div><div><span>Armour</span><strong>{formatNumber(enemyArmour)}</strong></div></div>",
    "              <p className=\"panel-label\">ASSESSED ENEMY STRENGTH</p>\n              <div className=\"intelligence-kpis\"><div><span>Territory contacts</span><strong>{enemyContacts.length}</strong></div><div><span>Assessed personnel</span><strong>~{formatNumber(enemyPersonnel)}</strong></div><div><span>Confirmed contacts</span><strong>{confirmedEnemyContacts}</strong></div></div>"
)
app.write_text(content)

# Styling for recent combat and in-view diagnostic causes.
css = Path('src/operational-clarity.css')
content = css.read_text()
content += """

.enemy-threat-list button.recent-combat { border-color: #c95d68; opacity: .9; }
.territory.recent-combat { stroke: #d84d59 !important; stroke-width: 5px !important; stroke-dasharray: 5 4; }
.threat-marker.recent-combat circle { fill: rgba(180,44,57,.28); stroke: #e46872; }
.logistics-command-stack { display: grid; gap: 12px; }
.supply-diagnostics-panel { border-left: 4px solid rgba(255,255,255,.18); }
.supply-diagnostics-panel.warning { border-left-color: #e8bd5a; }
.supply-diagnostics-panel.danger { border-left-color: #ee7e52; }
.supply-diagnostics-panel.critical { border-left-color: #ff4f59; }
.supply-diagnostic-list { display: grid; gap: 8px; margin-top: 10px; }
.supply-diagnostic-list article { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 10px 12px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.025); }
.supply-diagnostic-list article.warning { border-left: 3px solid #e8bd5a; }
.supply-diagnostic-list article.danger { border-left: 3px solid #ee7e52; }
.supply-diagnostic-list article.critical { border-left: 3px solid #ff4f59; }
.supply-diagnostic-list p { margin: 3px 0 0; color: #b9c8d8; }
@media (max-width: 700px) { .supply-diagnostic-list article { grid-template-columns: 1fr; } }
"""
css.write_text(content)

# Keep the design record aligned with the achievable tutorial order.
doc = Path('docs/design/phase-08d-operational-clarity-onboarding.md')
content = doc.read_text()
content = content.replace(
    "1. Selecting and inspecting a formation.\n2. Selecting an adjacent destination and issuing movement.\n3. Beginning or reinforcing an operation.\n4. Securing captured territory with a garrison.\n5. Opening Logistics and identifying a supply route or bottleneck.",
    "1. Selecting and inspecting a formation.\n2. Beginning the first operation against an adjacent enemy territory.\n3. Resolving the offensive and securing captured territory with a garrison.\n4. Reinforcing the captured position with a movement order.\n5. Opening Logistics and identifying a supply route or bottleneck."
)
doc.write_text(content)

# Extend focused validation for the corrected tutorial and persistent after-action visibility.
test_path = Path('tests/operational-clarity-viii-d.test.cjs')
content = test_path.read_text()
content = content.replace(
    "  for (const trigger of ['select-formation', 'issue-move', 'begin-operation', 'set-garrison', 'open-logistics', 'review-intelligence', 'open-engineering']) state = progressTutorial(state, trigger);",
    "  assert.deepEqual(TUTORIAL_STEPS.slice(1, 4).map(step => step.id), ['operation', 'occupation', 'movement']);\n  for (const trigger of ['select-formation', 'begin-operation', 'set-garrison', 'issue-move', 'open-logistics', 'review-intelligence', 'open-engineering']) state = progressTutorial(state, trigger);"
)
insert_after = """test('planned counterattacks create visible threatened-territory warnings', () => {
  const state = newGame(403, 'standard', false);
  const target = state.portalTerritory;
  const neighbour = require('../.test-dist/data.js').TERRITORIES[target].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(neighbour);
  const formation = Object.values(state.enemyFormations).find(item => item.location === neighbour);
  assert.ok(formation);
  state.enemyOrders = [{ id: 'EO-VISIBILITY', turn: state.turn, type: 'counterattack', formationId: formation.id, origin: neighbour, target, executeTurn: state.turn + 1, status: 'planned', priority: 100, summary: 'Counterattack preparations detected' }];
  const threats = getThreatenedTerritories(state);
  assert.equal(threats.length, 1);
  assert.equal(threats[0].territoryId, target);
  assert.equal(threats[0].stage, 'imminent');
});
"""
recent_test = """

test('resolved counterattacks remain visible as recent combat for after-action response', () => {
  const state = newGame(407, 'standard', false);
  const target = state.portalTerritory;
  state.enemyOrders = [{ id: 'EO-RECENT', turn: state.turn, type: 'counterattack', origin: require('../.test-dist/data.js').TERRITORIES[target].neighbours[0], target, executeTurn: state.turn, status: 'completed', priority: 100, summary: 'Counterattack resolved' }];
  const threats = getThreatenedTerritories(state);
  assert.equal(threats[0].stage, 'recent-combat');
});
"""
if insert_after not in content:
    raise RuntimeError('planned-counterattack test block not found')
content = content.replace(insert_after, insert_after + recent_test, 1)
content = content.replace(
    "  assert.match(app, /Correctable logistics failures remain/);",
    "  assert.match(app, /Correctable logistics failures remain/);\n  assert.match(app, /supply-diagnostics-panel/);\n  assert.match(app, /ASSESSED ENEMY STRENGTH/);"
)
test_path.write_text(content)
