import fs from 'node:fs';

function replaceOnce(path, search, replacement) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(search)) throw new Error(`Expected source block not found in ${path}: ${search.slice(0, 120)}`);
  const next = source.replace(search, replacement);
  fs.writeFileSync(path, next);
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

// State model: strategic collapse is a decision episode, not a fourth terminal status.
replaceOnce(
  'src/game/types.ts',
  `export interface OperationalAwarenessState {\n  previousNetworkEfficiency: number;\n  lastAcknowledgedSupplyTurn: number;\n}\n\n`,
  `export interface OperationalAwarenessState {\n  previousNetworkEfficiency: number;\n  lastAcknowledgedSupplyTurn: number;\n}\n\nexport interface StrategicCollapseState {\n  pending: boolean;\n  acknowledgedEpisode: boolean;\n  triggeredTurn?: number;\n  triggerCrisisTurns?: number;\n  lastDecision?: 'continue' | 'surrender';\n  lastDecisionTurn?: number;\n  lastRecoveryTurn?: number;\n}\n\n`
);

replaceOnce(
  'src/game/types.ts',
  `  enemyStrategy: EnemyStrategyState;\n  operationalAwareness: OperationalAwarenessState;`,
  `  enemyStrategy: EnemyStrategyState;\n  strategicCollapse?: StrategicCollapseState;\n  operationalAwareness: OperationalAwarenessState;`
);

// Engine decision semantics.
replaceOnce(
  'src/game/engine.ts',
  `  Operation,\n  TaskGroup,\n  TerritoryState\n} from './types';`,
  `  Operation,\n  StrategicCollapseState,\n  TaskGroup,\n  TerritoryState\n} from './types';`
);

replaceOnce(
  'src/game/engine.ts',
  `function addEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {\n  const next = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone };\n  return { ...state, events: [next, ...state.events].slice(0, 100) };\n}\n\n`,
  `function addEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {\n  const next = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone };\n  return { ...state, events: [next, ...state.events].slice(0, 100) };\n}\n\nexport function createStrategicCollapseState(): StrategicCollapseState {\n  return { pending: false, acknowledgedEpisode: false };\n}\n\nfunction strategicCollapseFor(state: GameState): StrategicCollapseState {\n  return state.strategicCollapse ?? createStrategicCollapseState();\n}\n\nexport function strategicCollapseDecisionPending(state: GameState): boolean {\n  return state.status === 'playing' && strategicCollapseFor(state).pending;\n}\n\nexport function continueCampaignAfterCollapse(state: GameState): GameState {\n  if (!strategicCollapseDecisionPending(state)) return state;\n  const strategicCollapse: StrategicCollapseState = {\n    ...strategicCollapseFor(state),\n    pending: false,\n    acknowledgedEpisode: true,\n    lastDecision: 'continue',\n    lastDecisionTurn: state.turn\n  };\n  return addEvent(\n    { ...state, strategicCollapse },\n    'Command rejected surrender and ordered the expedition to continue despite strategic collapse. Recovery remains possible, but this crisis episode will not prompt again unless conditions fully recover first.',\n    'warning'\n  );\n}\n\nexport function surrenderCampaign(state: GameState): GameState {\n  if (!strategicCollapseDecisionPending(state)) return state;\n  const strategicCollapse: StrategicCollapseState = {\n    ...strategicCollapseFor(state),\n    pending: false,\n    acknowledgedEpisode: true,\n    lastDecision: 'surrender',\n    lastDecisionTurn: state.turn\n  };\n  return addEvent(\n    { ...state, strategicCollapse, status: 'defeat' },\n    'Expeditionary command accepted strategic collapse and ordered surrender. Organised campaign operations have ended.',\n    'danger'\n  );\n}\n\nfunction rearmStrategicCollapseAfterRecovery(state: GameState): GameState {\n  const strategicCollapse = strategicCollapseFor(state);\n  if (state.enemyStrategy.operationalCrisisTurns !== 0 || !strategicCollapse.acknowledgedEpisode || strategicCollapse.pending) {\n    return state.strategicCollapse ? state : { ...state, strategicCollapse };\n  }\n  return {\n    ...state,\n    strategicCollapse: {\n      ...strategicCollapse,\n      acknowledgedEpisode: false,\n      lastRecoveryTurn: state.turn\n    }\n  };\n}\n\nfunction resolveCampaignOutcome(state: GameState): GameState {\n  let next = rearmStrategicCollapseAfterRecovery(state);\n  const controlled = Object.values(next.territories).filter(territory => territory.controller === 'player').length;\n  const unsecured = Object.values(next.territories).filter(territory => territory.occupation === 'unsecured').length;\n  const personnel = Object.values(next.taskGroups).reduce((sum, group) => sum + group.personnel, 0);\n  if (controlled === SLICE_IDS.length && unsecured === 0) {\n    return addEvent({ ...next, status: 'victory' }, 'All fifteen territories are occupied and under future control. Regional victory achieved.', 'good');\n  }\n  if (personnel < 1200) {\n    return addEvent(\n      { ...next, status: 'defeat' },\n      'The expedition has fallen below the minimum force needed to continue organised operations.',\n      'danger'\n    );\n  }\n\n  const collapse = strategicCollapseFor(next);\n  const crisisLimit = crisisLimitForDifficulty(next.difficulty);\n  if (\n    next.enemyStrategy.operationalCrisisTurns >= crisisLimit\n    && !collapse.pending\n    && !collapse.acknowledgedEpisode\n  ) {\n    const strategicCollapse: StrategicCollapseState = {\n      ...collapse,\n      pending: true,\n      triggeredTurn: next.turn,\n      triggerCrisisTurns: next.enemyStrategy.operationalCrisisTurns\n    };\n    next = addEvent(\n      { ...next, strategicCollapse },\n      'Strategic collapse threshold reached. Senior command requires an explicit decision: surrender the campaign or continue operations despite the crisis.',\n      'danger'\n    );\n  }\n  return next;\n}\n\n`
);

replaceOnce(
  'src/game/engine.ts',
  `    ...strategicState,\n    operationalAwareness: createOperationalAwarenessState(100),`,
  `    ...strategicState,\n    strategicCollapse: createStrategicCollapseState(),\n    operationalAwareness: createOperationalAwarenessState(100),`
);

replaceOnce(
  'src/game/engine.ts',
  `export function selectTaskGroup(state: GameState, id: string): GameState {\n  if (!state.taskGroups[id]) return state;`,
  `export function selectTaskGroup(state: GameState, id: string): GameState {\n  if (strategicCollapseDecisionPending(state) || !state.taskGroups[id]) return state;`
);

replaceOnce(
  'src/game/engine.ts',
  `export function selectTerritory(state: GameState, id: string): GameState {\n  if (state.status !== 'playing') return state;`,
  `export function selectTerritory(state: GameState, id: string): GameState {\n  if (state.status !== 'playing' || strategicCollapseDecisionPending(state)) return state;`
);

replaceOnce(
  'src/game/engine.ts',
  `export function issueMove(state: GameState, requestedRouteId?: string): GameState {\n  const group = state.taskGroups[state.selectedTaskGroupId];`,
  `export function issueMove(state: GameState, requestedRouteId?: string): GameState {\n  if (strategicCollapseDecisionPending(state)) return state;\n  const group = state.taskGroups[state.selectedTaskGroupId];`
);

replaceOnce(
  'src/game/engine.ts',
  `export function setGarrison(state: GameState): GameState {\n  const group = state.taskGroups[state.selectedTaskGroupId];`,
  `export function setGarrison(state: GameState): GameState {\n  if (strategicCollapseDecisionPending(state)) return state;\n  const group = state.taskGroups[state.selectedTaskGroupId];`
);

replaceOnce(
  'src/game/engine.ts',
  `export function beginOperation(state: GameState, requestedRouteId?: string): GameState {\n  const group = state.taskGroups[state.selectedTaskGroupId];`,
  `export function beginOperation(state: GameState, requestedRouteId?: string): GameState {\n  if (strategicCollapseDecisionPending(state)) return state;\n  const group = state.taskGroups[state.selectedTaskGroupId];`
);

replaceOnce(
  'src/game/engine.ts',
  `export function endTurn(state: GameState): GameState {\n  if (state.status !== 'playing') return state;`,
  `export function endTurn(state: GameState): GameState {\n  if (state.status !== 'playing' || strategicCollapseDecisionPending(state)) return state;`
);

replaceOnce(
  'src/game/engine.ts',
  `    logisticsPriorities: structuredClone(state.logisticsPriorities),\n    enemyStrategy: structuredClone(state.enemyStrategy),\n    operationalAwareness: structuredClone(state.operationalAwareness),`,
  `    logisticsPriorities: structuredClone(state.logisticsPriorities),\n    enemyStrategy: structuredClone(state.enemyStrategy),\n    strategicCollapse: structuredClone(state.strategicCollapse ?? createStrategicCollapseState()),\n    operationalAwareness: structuredClone(state.operationalAwareness),`
);

replaceOnce(
  'src/game/engine.ts',
  `  const controlled = Object.values(next.territories).filter(territory => territory.controller === 'player').length;\n  const unsecured = Object.values(next.territories).filter(territory => territory.occupation === 'unsecured').length;\n  const personnel = Object.values(next.taskGroups).reduce((sum, group) => sum + group.personnel, 0);\n  if (controlled === SLICE_IDS.length && unsecured === 0) next = addEvent({ ...next, status: 'victory' }, 'All fifteen territories are occupied and under future control. Regional victory achieved.', 'good');\n  else if (personnel < 1200 || next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty)) next = addEvent(\n    { ...next, status: 'defeat' },\n    next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty)\n      ? 'The expedition has remained in operational crisis too long. Command cohesion can no longer be sustained.'\n      : 'The expedition has fallen below the minimum force needed to continue organised operations.',\n    'danger'\n  );\n  return next;`,
  `  return resolveCampaignOutcome(next);`
);

replaceOnce(
  'src/game/engine.ts',
  `  resolveOccupationAndLogistics,\n  pruneOperations,\n  resolveCounterattack:`,
  `  resolveOccupationAndLogistics,\n  pruneOperations,\n  resolveCampaignOutcome,\n  rearmStrategicCollapseAfterRecovery,\n  resolveCounterattack:`
);

// Command interface: block actions under the decision and surface a dedicated modal.
replaceOnce(
  'src/App.tsx',
  `import { LogisticsCommand } from './components/LogisticsCommand';\nimport { TutorialOverlay } from './components/TutorialOverlay';`,
  `import { LogisticsCommand } from './components/LogisticsCommand';\nimport { StrategicCollapseDecision } from './components/StrategicCollapseDecision';\nimport { TutorialOverlay } from './components/TutorialOverlay';`
);

replaceOnce(
  'src/App.tsx',
  `  beginOperation,\n  canIssueOperationalOrder,\n  endTurn,`,
  `  beginOperation,\n  canIssueOperationalOrder,\n  continueCampaignAfterCollapse,\n  endTurn,`
);

replaceOnce(
  'src/App.tsx',
  `  selectTerritory,\n  setGarrison\n} from './game/engine';`,
  `  selectTerritory,\n  setGarrison,\n  strategicCollapseDecisionPending,\n  surrenderCampaign\n} from './game/engine';`
);

replaceOnce(
  'src/App.tsx',
  `  const intelligenceReports = state.intelligenceReports.slice(0, 10);\n  const canOrderSelected = canIssueOperationalOrder(selectedGroup ?? undefined);`,
  `  const intelligenceReports = state.intelligenceReports.slice(0, 10);\n  const collapseDecisionPending = strategicCollapseDecisionPending(state);\n  const canOrderSelected = !collapseDecisionPending && canIssueOperationalOrder(selectedGroup ?? undefined);`
);

replaceOnce(
  'src/App.tsx',
  `  const resolveDay = () => {\n    if (requiresSupplyAcknowledgement(state)) {`,
  `  const resolveDay = () => {\n    if (collapseDecisionPending) return;\n    if (requiresSupplyAcknowledgement(state)) {`
);

replaceOnce(
  'src/App.tsx',
  `  const resolveDayAnyway = () => {\n    setShowSupplyWarning(false);`,
  `  const resolveDayAnyway = () => {\n    if (collapseDecisionPending) return;\n    setShowSupplyWarning(false);`
);

replaceOnce(
  'src/App.tsx',
  `        <button className="global-resolve" data-tutorial="resolve-day" onClick={resolveDay} disabled={state.status !== 'playing'}>Resolve all orders · day {state.turn}</button>`,
  `        <button className="global-resolve" data-tutorial="resolve-day" onClick={resolveDay} disabled={state.status !== 'playing' || collapseDecisionPending}>Resolve all orders · day {state.turn}</button>`
);

replaceOnce(
  'src/App.tsx',
  `              <p>Doctrine reacts to frontline strength, logistics weakness, portal exposure and campaign momentum. Stabilising those conditions reduces pressure and crisis risk.</p>`,
  `              <p>Doctrine reacts to frontline strength, logistics weakness, vulnerable supply regions and campaign momentum. Stabilising those conditions reduces pressure and crisis risk.</p>`
);

replaceOnce(
  'src/App.tsx',
  `                <div><dt>Status</dt><dd>{state.status}</dd></div><div><dt>Enemy doctrine</dt>`,
  `                <div><dt>Status</dt><dd>{collapseDecisionPending ? 'strategic collapse decision' : state.status}</dd></div><div><dt>Enemy doctrine</dt>`
);

replaceOnce(
  'src/App.tsx',
  `    <TutorialOverlay step={tutorialStep} stepNumber={state.tutorial.step + 1} totalSteps={TUTORIAL_STEPS.length} anchorSelector={tutorialAnchorSelector} onSkip={() => setState(skipTutorial)} />\n\n    {showSupplyWarning &&`,
  `    <TutorialOverlay step={tutorialStep} stepNumber={state.tutorial.step + 1} totalSteps={TUTORIAL_STEPS.length} anchorSelector={tutorialAnchorSelector} onSkip={() => setState(skipTutorial)} />\n\n    {collapseDecisionPending && <StrategicCollapseDecision\n      state={state}\n      onContinue={() => setState(continueCampaignAfterCollapse)}\n      onSurrender={() => setState(surrenderCampaign)}\n    />}\n\n    {showSupplyWarning &&`
);

write('src/components/StrategicCollapseDecision.tsx', `import { crisisLimitForDifficulty } from '../game/enemy-strategy';\nimport type { GameState } from '../game/types';\nimport './strategic-collapse.css';\n\ninterface Props {\n  state: GameState;\n  onContinue: () => void;\n  onSurrender: () => void;\n}\n\nconst formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);\n\nexport function StrategicCollapseDecision({ state, onContinue, onSurrender }: Props) {\n  const crisisDays = state.enemyStrategy.operationalCrisisTurns;\n  const crisisLimit = crisisLimitForDifficulty(state.difficulty);\n  const personnel = Object.values(state.taskGroups).reduce((sum, group) => sum + group.personnel, 0);\n  const formations = Object.values(state.taskGroups).filter(group => group.personnel > 0).length;\n  const controlled = Object.values(state.territories).filter(territory => territory.controller === 'player').length;\n  const starved = state.logistics.starvedFormationIds.length;\n\n  return <div className="strategic-collapse-backdrop" role="presentation">\n    <section className="strategic-collapse-dialog" role="alertdialog" aria-modal="true" aria-labelledby="strategic-collapse-title" aria-describedby="strategic-collapse-description">\n      <p className="panel-label">STRATEGIC COLLAPSE</p>\n      <h2 id="strategic-collapse-title">Command cohesion has crossed the failure threshold</h2>\n      <p id="strategic-collapse-description" className="strategic-collapse-lead">\n        The campaign has not been automatically destroyed. Formations and controlled territory remain, but the expedition has stayed in operational crisis long enough that senior command recommends ending organised resistance.\n      </p>\n\n      <div className="strategic-collapse-metrics" aria-label="Collapse assessment">\n        <div><span>Crisis duration</span><strong>{crisisDays} / {crisisLimit} days</strong></div>\n        <div><span>Active personnel</span><strong>{formatNumber(personnel)}</strong></div>\n        <div><span>Active formations</span><strong>{formations}</strong></div>\n        <div><span>Controlled territories</span><strong>{controlled}</strong></div>\n        <div><span>Network supply</span><strong>{state.logistics.networkEfficiency}%</strong></div>\n        <div><span>Starved formations</span><strong>{starved}</strong></div>\n      </div>\n\n      <div className="strategic-collapse-options">\n        <article>\n          <h3>Continue anyway</h3>\n          <p>The campaign remains active with the current losses, pressure and logistics state intact. This crisis episode will not ask again unless you first recover fully and later collapse again.</p>\n        </article>\n        <article>\n          <h3>Surrender campaign</h3>\n          <p>Accept the strategic assessment and end the campaign as a defeat. The normal campaign-failed ending and reload options will follow.</p>\n        </article>\n      </div>\n\n      <div className="strategic-collapse-actions">\n        <button type="button" className="collapse-continue" onClick={onContinue}>CONTINUE ANYWAY</button>\n        <button type="button" className="danger-action collapse-surrender" onClick={onSurrender}>SURRENDER CAMPAIGN</button>\n      </div>\n    </section>\n  </div>;\n}\n`);

write('src/components/strategic-collapse.css', `.strategic-collapse-backdrop {\n  position: fixed;\n  inset: 0;\n  z-index: 2600;\n  display: grid;\n  place-items: center;\n  padding: 24px;\n  background: rgba(3, 7, 12, 0.86);\n  backdrop-filter: blur(5px);\n}\n\n.strategic-collapse-dialog {\n  width: min(760px, 100%);\n  max-height: min(760px, calc(100vh - 40px));\n  overflow: auto;\n  border: 1px solid rgba(255, 91, 91, 0.55);\n  border-top: 4px solid #ff5b5b;\n  border-radius: 10px;\n  padding: clamp(22px, 4vw, 38px);\n  background: linear-gradient(160deg, rgba(19, 24, 32, 0.99), rgba(9, 13, 19, 0.99));\n  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.58);\n}\n\n.strategic-collapse-dialog h2 {\n  margin: 6px 0 12px;\n  font-size: clamp(1.7rem, 4vw, 2.7rem);\n  line-height: 1.05;\n}\n\n.strategic-collapse-lead {\n  margin: 0;\n  max-width: 68ch;\n  color: rgba(235, 241, 248, 0.84);\n  line-height: 1.55;\n}\n\n.strategic-collapse-metrics {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 8px;\n  margin: 24px 0;\n}\n\n.strategic-collapse-metrics div {\n  min-width: 0;\n  padding: 12px;\n  border: 1px solid rgba(255,255,255,0.1);\n  background: rgba(255,255,255,0.035);\n}\n\n.strategic-collapse-metrics span,\n.strategic-collapse-metrics strong {\n  display: block;\n}\n\n.strategic-collapse-metrics span {\n  margin-bottom: 5px;\n  color: rgba(220, 228, 238, 0.62);\n  font-size: 0.72rem;\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n}\n\n.strategic-collapse-options {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 12px;\n}\n\n.strategic-collapse-options article {\n  padding: 16px;\n  border: 1px solid rgba(255,255,255,0.11);\n  background: rgba(255,255,255,0.025);\n}\n\n.strategic-collapse-options h3 {\n  margin: 0 0 7px;\n}\n\n.strategic-collapse-options p {\n  margin: 0;\n  color: rgba(224, 232, 241, 0.73);\n  line-height: 1.45;\n}\n\n.strategic-collapse-actions {\n  display: grid;\n  grid-template-columns: 1.15fr 1fr;\n  gap: 12px;\n  margin-top: 22px;\n}\n\n.strategic-collapse-actions button {\n  min-height: 52px;\n  font-weight: 800;\n  letter-spacing: 0.045em;\n}\n\n.collapse-continue {\n  border: 1px solid rgba(108, 196, 255, 0.6);\n  background: rgba(43, 124, 181, 0.2);\n  color: #f4f9ff;\n}\n\n@media (max-width: 700px) {\n  .strategic-collapse-backdrop { padding: 12px; }\n  .strategic-collapse-dialog { max-height: calc(100vh - 24px); padding: 20px; }\n  .strategic-collapse-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .strategic-collapse-options,\n  .strategic-collapse-actions { grid-template-columns: 1fr; }\n}\n`);

write('tests/wp3-strategic-collapse.test.cjs', `const test = require('node:test');\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\n\nconst {\n  __testOnly,\n  continueCampaignAfterCollapse,\n  endTurn,\n  newGame,\n  saveGame,\n  loadGame,\n  strategicCollapseDecisionPending,\n  surrenderCampaign\n} = require('../.test-dist/engine.js');\nconst { crisisLimitForDifficulty } = require('../.test-dist/enemy-strategy.js');\n\nfunction atCollapseThreshold(state) {\n  state.enemyStrategy.operationalCrisisTurns = crisisLimitForDifficulty(state.difficulty);\n  return __testOnly.resolveCampaignOutcome(state);\n}\n\nfunction memoryStorage() {\n  const values = new Map();\n  return {\n    getItem: key => values.has(key) ? values.get(key) : null,\n    setItem: (key, value) => values.set(key, String(value)),\n    removeItem: key => values.delete(key),\n    clear: () => values.clear()\n  };\n}\n\ntest('new campaigns begin without a strategic-collapse decision', () => {\n  const state = newGame(931, 'standard', false);\n  assert.equal(state.strategicCollapse.pending, false);\n  assert.equal(strategicCollapseDecisionPending(state), false);\n});\n\ntest('reaching the operational crisis limit opens a decision instead of automatic defeat', () => {\n  const state = atCollapseThreshold(newGame(931, 'standard', false));\n  assert.equal(state.status, 'playing');\n  assert.equal(state.strategicCollapse.pending, true);\n  assert.equal(strategicCollapseDecisionPending(state), true);\n  assert.equal(state.strategicCollapse.triggerCrisisTurns, crisisLimitForDifficulty(state.difficulty));\n});\n\ntest('a pending strategic-collapse decision freezes day resolution', () => {\n  const state = atCollapseThreshold(newGame(932, 'standard', false));\n  const resolved = endTurn(state);\n  assert.equal(resolved, state);\n  assert.equal(resolved.turn, state.turn);\n});\n\ntest('surrender converts the pending collapse into the normal defeat state', () => {\n  const state = atCollapseThreshold(newGame(933, 'standard', false));\n  const surrendered = surrenderCampaign(state);\n  assert.equal(surrendered.status, 'defeat');\n  assert.equal(surrendered.strategicCollapse.pending, false);\n  assert.equal(surrendered.strategicCollapse.lastDecision, 'surrender');\n});\n\ntest('continue anyway keeps the campaign active without repeating the same crisis episode', () => {\n  const state = atCollapseThreshold(newGame(934, 'standard', false));\n  const continued = continueCampaignAfterCollapse(state);\n  assert.equal(continued.status, 'playing');\n  assert.equal(continued.strategicCollapse.pending, false);\n  assert.equal(continued.strategicCollapse.acknowledgedEpisode, true);\n  const evaluatedAgain = __testOnly.resolveCampaignOutcome(continued);\n  assert.equal(evaluatedAgain.strategicCollapse.pending, false);\n});\n\ntest('full crisis recovery re-arms a future strategic-collapse decision', () => {\n  let state = atCollapseThreshold(newGame(935, 'standard', false));\n  state = continueCampaignAfterCollapse(state);\n  state.enemyStrategy.operationalCrisisTurns = 0;\n  state = __testOnly.resolveCampaignOutcome(state);\n  assert.equal(state.strategicCollapse.acknowledgedEpisode, false);\n  state.enemyStrategy.operationalCrisisTurns = crisisLimitForDifficulty(state.difficulty);\n  state = __testOnly.resolveCampaignOutcome(state);\n  assert.equal(state.strategicCollapse.pending, true);\n});\n\ntest('catastrophic force loss remains a hard campaign defeat', () => {\n  const state = newGame(936, 'standard', false);\n  for (const group of Object.values(state.taskGroups)) group.personnel = 250;\n  state.enemyStrategy.operationalCrisisTurns = 0;\n  const resolved = __testOnly.resolveCampaignOutcome(state);\n  assert.equal(resolved.status, 'defeat');\n  assert.equal(strategicCollapseDecisionPending(resolved), false);\n});\n\ntest('pending strategic-collapse choice survives save and load', () => {\n  const originalStorage = global.localStorage;\n  global.localStorage = memoryStorage();\n  try {\n    const state = atCollapseThreshold(newGame(937, 'standard', false));\n    saveGame(state);\n    const loaded = loadGame();\n    assert.ok(loaded);\n    assert.equal(loaded.strategicCollapse.pending, true);\n    assert.equal(loaded.strategicCollapse.triggeredTurn, state.turn);\n  } finally {\n    if (originalStorage === undefined) delete global.localStorage;\n    else global.localStorage = originalStorage;\n  }\n});\n\ntest('the interface presents continue and surrender without promoting collapse to the defeat ending', () => {\n  const app = fs.readFileSync('src/App.tsx', 'utf8');\n  const dialog = fs.readFileSync('src/components/StrategicCollapseDecision.tsx', 'utf8');\n  assert.match(app, /collapseDecisionPending && <StrategicCollapseDecision/);\n  assert.match(dialog, /CONTINUE ANYWAY/);\n  assert.match(dialog, /SURRENDER CAMPAIGN/);\n  assert.match(app, /state\.status !== 'playing' && <div className=\{`command-outcome/);\n});\n`);

console.log('WP3 strategic-collapse implementation applied.');
