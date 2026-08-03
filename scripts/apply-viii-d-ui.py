from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1):
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise RuntimeError(f'Pattern not found in {path}: {old[:100]!r}')
    file.write_text(content.replace(old, new, count))


# App integration.
replace('src/App.tsx', "import { LogisticsCommand } from './components/LogisticsCommand';\n", "import { LogisticsCommand } from './components/LogisticsCommand';\nimport { TutorialOverlay } from './components/TutorialOverlay';\n")
replace(
    'src/App.tsx',
    "import { SUPPLY_CONDITION_LABELS } from './game/supply-network';\n",
    "import { SUPPLY_CONDITION_LABELS } from './game/supply-network';\nimport {\n  getEnemyContacts,\n  getSupplyClarity,\n  getThreatenedTerritories,\n  getTutorialStep,\n  markSupplyWarningAcknowledged,\n  progressTutorial,\n  requiresSupplyAcknowledgement,\n  restartTutorial,\n  skipTutorial,\n  TUTORIAL_STEPS\n} from './game/operational-clarity';\n"
)
replace('src/App.tsx', "  const [selectedRouteId, setSelectedRouteId] = useState('');\n", "  const [selectedRouteId, setSelectedRouteId] = useState('');\n  const [showSupplyWarning, setShowSupplyWarning] = useState(false);\n  const [newTutorialEnabled, setNewTutorialEnabled] = useState(true);\n")
replace(
    'src/App.tsx',
    "  const territoryDefinitions = Object.values(TERRITORIES).sort((a, b) => a.centre.localeCompare(b.centre));\n",
    "  const territoryDefinitions = Object.values(TERRITORIES).sort((a, b) => a.centre.localeCompare(b.centre));\n  const enemyContacts = getEnemyContacts(state);\n  const threatenedTerritories = getThreatenedTerritories(state);\n  const supplyClarity = getSupplyClarity(state);\n  const tutorialStep = getTutorialStep(state.tutorial);\n"
)
replace(
    'src/App.tsx',
    "  const enemyPersonnel = enemyFormations.reduce((sum, formation) => sum + formation.personnel, 0);\n  const enemyArmour = enemyFormations.reduce((sum, formation) => sum + formation.armour, 0);",
    "  const enemyPersonnel = enemyContacts.reduce((sum, contact) => sum + Math.round((contact.estimatedMin + contact.estimatedMax) / 2), 0);\n  const enemyArmour = enemyContacts.reduce((sum, contact) => sum + (contact.formationCount ?? 1) * 80, 0);"
)
replace(
    'src/App.tsx',
    """  const startCampaign = () => {
    setState(newGame(undefined, newDifficulty));
    setCurrentView('map');
  };""",
    """  const changeView = (view: CommandView) => {
    setCurrentView(view);
    if (view === 'logistics') setState(current => progressTutorial(current, 'open-logistics'));
    if (view === 'intelligence') setState(current => progressTutorial(current, 'review-intelligence'));
    if (view === 'engineering') setState(current => progressTutorial(current, 'open-engineering'));
  };

  const startCampaign = () => {
    setState(newGame(undefined, newDifficulty, newTutorialEnabled));
    setCurrentView('map');
    setShowSupplyWarning(false);
  };

  const openThreatOnMap = (territoryId: string) => {
    setState(current => selectTerritory(progressTutorial(current, 'review-intelligence'), territoryId));
    setCurrentView('map');
  };

  const resolveDay = () => {
    if (requiresSupplyAcknowledgement(state)) {
      setShowSupplyWarning(true);
      return;
    }
    setState(endTurn);
  };

  const resolveDayAnyway = () => {
    setShowSupplyWarning(false);
    setState(current => endTurn(markSupplyWarningAcknowledged(current)));
  };"""
)
replace('src/App.tsx', '<main className="app-shell command-app-shell">', '<main className={`app-shell command-app-shell ${tutorialStep ? `tutorial-step-${tutorialStep.target}` : \'\'}`}>')
replace('src/App.tsx', '<div><p className="eyebrow">PHASE VIII-C / ENEMY STRATEGY AND CAMPAIGN BALANCE</p><h1>FUTURE CONQUEST</h1></div>', '<div><p className="eyebrow">PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING</p><h1>FUTURE CONQUEST</h1></div>')
replace('src/App.tsx', '<button className="global-resolve" onClick={() => setState(endTurn)} disabled={state.status !== \'playing\'}>Resolve all orders · day {state.turn}</button>', '<button className="global-resolve" onClick={resolveDay} disabled={state.status !== \'playing\'}>Resolve all orders · day {state.turn}</button>')
replace(
    'src/App.tsx',
    "      <div className={`network-supply-metric ${state.supply < 55 ? 'critical' : state.supply < 80 ? 'strained' : ''}`} title={`${state.logistics.totalDelivered} of ${state.logistics.totalDemand} supply points delivered`}><span>Network supply</span><strong>{state.logistics.networkEfficiency}%</strong></div>",
    "      <button type=\"button\" className={`network-supply-metric ${supplyClarity.severity}`} title={`${state.logistics.totalDelivered} of ${state.logistics.totalDemand} supply points delivered. Open logistics diagnostics.`} onClick={() => changeView('logistics')}><span>Network supply · {supplyClarity.trend}</span><strong>{state.logistics.networkEfficiency}%</strong></button>"
)
replace(
    'src/App.tsx',
    """    </section>

    {state.status !== 'playing'""",
    """    </section>

    {supplyClarity.severity !== 'normal' && <section className={`operational-alert-strip ${supplyClarity.severity}`} aria-live="polite">
      <div><small>LOGISTICS {supplyClarity.severity.toUpperCase()}</small><strong>{state.logistics.networkEfficiency}% network efficiency</strong></div>
      <div className="supply-diagnostic-copy"><strong>{supplyClarity.diagnostics[0]?.title ?? 'Supply network is degraded'}</strong><span>{supplyClarity.diagnostics[0]?.detail}</span></div>
      <button type="button" onClick={() => changeView('logistics')}>Open diagnostics</button>
    </section>}

    {threatenedTerritories.length > 0 && <section className="enemy-threat-strip" aria-live="assertive">
      <strong>ENEMY ACTION DETECTED · REINFORCEMENT MAY BE REQUIRED</strong>
      <div className="enemy-threat-list">{threatenedTerritories.map(threat => <button type="button" key={threat.territoryId} className={threat.stage} onClick={() => openThreatOnMap(threat.territoryId)}>
        <span><b>{TERRITORIES[threat.territoryId].centre}</b><small>{threat.formationCount} formation{threat.formationCount === 1 ? '' : 's'} · {threat.stage.replace('-', ' ')}</small></span>
        <strong>{threat.stage === 'under-attack' ? 'NOW' : `DAY ${threat.executeTurn}`}</strong>
      </button>)}</div>
    </section>}

    {state.status !== 'playing'"""
)
replace('src/App.tsx', '        onChange={setCurrentView}', '        onChange={changeView}')
replace('src/App.tsx', '<div className="legend"><span className="player-dot" />Controlled <span className="enemy-dot" />Enemy <span className="group-dot" />Task group <span className="formation-dot" />Enemy formation · Dashed routes show active operations</div>', '<div className="legend"><span className="player-dot" />Controlled <span className="enemy-dot" />Enemy <span className="group-dot" />Task group <span className="formation-dot" />Recon contact · Orange/red borders indicate threatened territory</div>')

app = Path('src/App.tsx')
content = app.read_text()
pattern = re.compile(r'''            <section className="view-panel enemy-order-panel">.*?            </section>\n            <section className="view-panel logistics-network-panel">''', re.S)
replacement = '''            <section className="view-panel enemy-order-panel">
              <div className="view-panel-heading"><p className="panel-label">RECONNAISSANCE CONTACTS</p><strong>{enemyContacts.length}</strong></div>
              <div className="enemy-formation-table enemy-contact-table">{enemyContacts.map(contact => <article key={contact.territoryId} className={contact.confidence}>
                <div><strong>{contact.label}</strong><span>{TERRITORIES[contact.territoryId].centre}{contact.lastObservedTurn ? ` · observed day ${contact.lastObservedTurn}` : ''}</span></div>
                <dl><div><dt>Confidence</dt><dd>{contact.confidence}</dd></div><div><dt>Estimated personnel</dt><dd>{formatNumber(contact.estimatedMin)}–{formatNumber(contact.estimatedMax)}</dd></div><div><dt>Identity</dt><dd>{contact.formationCount ? `${contact.formationCount} confirmed` : 'Unconfirmed'}</dd></div></dl>
                <button type="button" onClick={() => openThreatOnMap(contact.territoryId)}>Open on map</button>
              </article>)}</div>
            </section>
            <section className="view-panel logistics-network-panel">'''
content, count = pattern.subn(replacement, content, count=1)
if count != 1:
    raise RuntimeError('Enemy order-of-battle section not replaced')
app.write_text(content)

replace(
    'src/App.tsx',
    '<div className="new-campaign-controls"><label>New campaign difficulty<select value={newDifficulty} onChange={event => setNewDifficulty(event.target.value as Difficulty)}><option value="story">Story</option><option value="standard">Standard</option><option value="hard">Hard</option></select></label><button className="danger-action" onClick={startCampaign}>New campaign</button></div>',
    '<div className="new-campaign-controls"><label>New campaign difficulty<select value={newDifficulty} onChange={event => setNewDifficulty(event.target.value as Difficulty)}><option value="story">Story</option><option value="standard">Standard</option><option value="hard">Hard</option></select></label><label className="tutorial-toggle"><input type="checkbox" checked={newTutorialEnabled} onChange={event => setNewTutorialEnabled(event.target.checked)} /> Guided tutorial</label><button className="danger-action" onClick={startCampaign}>New campaign</button></div><div className="campaign-file-actions"><button onClick={() => setState(restartTutorial)}>Restart tutorial</button><button onClick={() => setState(skipTutorial)} disabled={!state.tutorial.enabled}>Skip tutorial</button></div>'
)
replace(
    'src/App.tsx',
    """    </section>
  </main>;""",
    """    </section>

    <TutorialOverlay step={tutorialStep} stepNumber={state.tutorial.step + 1} totalSteps={TUTORIAL_STEPS.length} onSkip={() => setState(skipTutorial)} onOpenView={changeView} />

    {showSupplyWarning && <div className="supply-warning-backdrop" role="presentation">
      <section className="supply-warning-dialog" role="dialog" aria-modal="true" aria-label="Critical supply warning">
        <p className="panel-label">END TURN WARNING</p>
        <h2>Correctable logistics failures remain</h2>
        <p>Resolving the day may cause avoidable attrition, retreat pressure or operational crisis. Review the network or explicitly accept the risk.</p>
        <ul>{supplyClarity.diagnostics.slice(0, 5).map(item => <li key={item.id}><strong>{item.title}:</strong> {item.detail}</li>)}</ul>
        <div className="supply-warning-actions"><button type="button" onClick={() => setShowSupplyWarning(false)}>Return to command</button><button type="button" onClick={() => { setShowSupplyWarning(false); changeView('logistics'); }}>Open logistics</button><button type="button" className="danger-action" onClick={resolveDayAnyway}>Resolve anyway</button></div>
      </section>
    </div>}
  </main>;"""
)

# Map integration.
replace('src/components/MapView.tsx', "import { getAdjacentOrderTargets } from '../game/order-targeting';\n", "import { getAdjacentOrderTargets } from '../game/order-targeting';\nimport { getEnemyContacts, getThreatenedTerritories } from '../game/operational-clarity';\n")
map_file = Path('src/components/MapView.tsx')
content = map_file.read_text()
old_enemy_counts = """  const enemyCounts = Object.values(state.enemyFormations).reduce<Record<string, number>>((result, formation) => {
    if (formation.personnel > 0) result[formation.location] = (result[formation.location] ?? 0) + 1;
    return result;
  }, {});
"""
if old_enemy_counts not in content:
    raise RuntimeError('Enemy count block missing')
content = content.replace(old_enemy_counts, """  const enemyContacts = getEnemyContacts(state);
  const threatenedTerritories = getThreatenedTerritories(state);
  const threatByTerritory = new Map(threatenedTerritories.map(threat => [threat.territoryId, threat]));
  const enemyMovementOrders = state.enemyOrders.filter(order => order.status !== 'completed' && order.origin && anchors[order.origin] && anchors[order.target] && (order.type === 'counterattack' || order.type === 'concentrate' || order.type === 'reposition'));
""", 1)
content = content.replace('<marker id="operationArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>', '<marker id="operationArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker><marker id="enemyMovementArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker>')
content = content.replace('          const active = activeTargets.has(id);\n', '          const active = activeTargets.has(id);\n          const threat = threatByTerritory.get(id);\n', 1)
content = content.replace("${active ? 'active-battle' : ''}`}", "${active ? 'active-battle' : ''} ${threat ? 'threatened' : ''} ${threat?.stage === 'under-attack' ? 'under-attack' : ''}`}", 1)
content = content.replace("className={`strategic-route ${route.type} ${routeState?.status ?? 'open'}`}", "className={`strategic-route ${route.type} ${routeState?.status ?? 'open'} ${state.logistics.bottleneckRouteIds.includes(route.id) || routeState?.status === 'blocked' || routeState?.status === 'destroyed' ? 'supply-critical' : ''}`}")
content = content.replace("className={`supply-route-flow ${flow.condition} ${selectedPath ? 'selected-path' : ''}`}", "className={`supply-route-flow ${flow.condition} ${selectedPath ? 'selected-path' : ''} ${state.logistics.bottleneckRouteIds.includes(route.id) ? 'bottleneck' : ''} ${state.routeStates[route.id]?.status === 'blocked' || state.routeStates[route.id]?.status === 'destroyed' ? 'broken' : ''}`}")
operation_block = """        {layers.operations && Object.values(state.operations).flatMap(operation => operation.participantGroupIds.map((groupId, index) => {
          const group = state.taskGroups[groupId];
          const originId = operation.origins[groupId] ?? group?.location;
          if (!originId || !anchors[originId] || !anchors[operation.target]) return null;
          const [x1, y1] = anchors[originId];
          const [x2, y2] = anchors[operation.target];
          const offset = (index - (operation.participantGroupIds.length - 1) / 2) * 4 * overlayScale;
          return <line key={`${operation.id}-${groupId}`} className="operation-route" x1={x1 + offset} y1={y1 + offset} x2={x2 + offset} y2={y2 + offset} markerEnd="url(#operationArrow)" />;
        }))}
"""
if operation_block not in content:
    raise RuntimeError('Operation route block missing')
content = content.replace(operation_block, operation_block + """
        {layers.enemyUnits && enemyMovementOrders.map(order => {
          const origin = order.origin ? anchors[order.origin] : undefined;
          const target = anchors[order.target];
          if (!origin || !target) return null;
          return <line key={`enemy-move-${order.id}`} className="enemy-concentration-route" x1={origin[0]} y1={origin[1]} x2={target[0]} y2={target[1]}><title>{order.summary}</title></line>;
        })}
""")
enemy_marker_pattern = re.compile(r'''        \{layers\.enemyUnits && Object\.entries\(enemyCounts\)\.map\(\(\[territoryId, count\]\) => \{.*?        \}\)\}\n''', re.S)
enemy_marker_replacement = '''        {layers.enemyUnits && enemyContacts.map(contact => {
          const anchor = anchors[contact.territoryId];
          if (!anchor) return null;
          const [x, y] = anchor;
          const symbol = contact.confidence === 'confirmed' ? String(contact.formationCount ?? 1) : contact.confidence === 'estimated' ? '~' : contact.confidence === 'stale' ? 'S' : '?';
          return <g key={`enemy-${contact.territoryId}`} className={`enemy-contact-marker ${contact.confidence}`} transform={`translate(${x + 24 * overlayScale} ${y - 24 * overlayScale}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); selectTerritory(contact.territoryId); }}>
            <path className="contact-body" d="M0 -12 L12 9 L-12 9 Z" /><text x="0" y="4">{symbol}</text><text className="contact-confidence" x="0" y="18">{contact.confidence.slice(0, 3).toUpperCase()}</text>
            <title>{contact.label} · {TERRITORIES[contact.territoryId].centre} · estimated {contact.estimatedMin}–{contact.estimatedMax} personnel</title>
          </g>;
        })}

        {layers.enemyUnits && threatenedTerritories.map(threat => {
          const anchor = anchors[threat.territoryId];
          if (!anchor) return null;
          const [x, y] = anchor;
          return <g key={`threat-${threat.territoryId}`} className={`threat-marker ${threat.stage}`} transform={`translate(${x} ${y - 42 * overlayScale}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); selectTerritory(threat.territoryId); }}><circle cx="0" cy="0" r="13" /><text x="0" y="3">!</text><title>{threat.summary} · expected day {threat.executeTurn}</title></g>;
        })}
'''
content, count = enemy_marker_pattern.subn(enemy_marker_replacement, content, count=1)
if count != 1:
    raise RuntimeError('Enemy marker block not replaced')
map_file.write_text(content)

replace('src/main.tsx', "import './enemy-strategy.css';\n", "import './enemy-strategy.css';\nimport './operational-clarity.css';\n")
