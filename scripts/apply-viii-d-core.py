from pathlib import Path
import re
from textwrap import dedent


def replace(path: str, old: str, new: str, count: int = 1):
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise RuntimeError(f'Pattern not found in {path}: {old[:100]!r}')
    file.write_text(content.replace(old, new, count))


# Version 14 state.
replace(
    'src/game/types.ts',
    "export type InterdictionMissionStatus = 'active' | 'succeeded' | 'failed' | 'cancelled';\n",
    "export type InterdictionMissionStatus = 'active' | 'succeeded' | 'failed' | 'cancelled';\n\nexport interface OperationalAwarenessState {\n  previousNetworkEfficiency: number;\n  lastAcknowledgedSupplyTurn: number;\n}\n\nexport interface TutorialState {\n  enabled: boolean;\n  step: number;\n  completed: boolean;\n  startedTurn: number;\n}\n"
)
replace('src/game/types.ts', '  version: 13;', '  version: 14;')
replace(
    'src/game/types.ts',
    '  enemyStrategy: EnemyStrategyState;\n',
    '  enemyStrategy: EnemyStrategyState;\n  operationalAwareness: OperationalAwarenessState;\n  tutorial: TutorialState;\n'
)

# Upgrade path.
replace(
    'src/game/strategic-response.ts',
    "import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';\n",
    "import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';\nimport { normaliseOperationalAwarenessState, normaliseTutorialState } from './operational-clarity';\n"
)
replace(
    'src/game/strategic-response.ts',
    "  | 'enemyStrategy';\n",
    "  | 'enemyStrategy'\n  | 'operationalAwareness'\n  | 'tutorial';\n"
)
replace(
    'src/game/strategic-response.ts',
    "  enemyStrategy?: GameState['enemyStrategy'];\n};",
    "  enemyStrategy?: GameState['enemyStrategy'];\n  operationalAwareness?: GameState['operationalAwareness'];\n  tutorial?: GameState['tutorial'];\n};"
)
replace('src/game/strategic-response.ts', '    version: 13,\n', '    version: 14,\n')
replace(
    'src/game/strategic-response.ts',
    '    enemyStrategy: normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty),\n',
    "    enemyStrategy: normaliseEnemyStrategyState(state.enemyStrategy, state.difficulty),\n    operationalAwareness: normaliseOperationalAwarenessState(state.operationalAwareness, state.logistics?.networkEfficiency ?? 100),\n    tutorial: normaliseTutorialState(state.tutorial, state.turn),\n"
)

# Engine integration.
replace(
    'src/game/engine.ts',
    "import { crisisLimitForDifficulty, resolveEnemyStrategy } from './enemy-strategy';\n",
    "import { crisisLimitForDifficulty, resolveEnemyStrategy } from './enemy-strategy';\nimport { createOperationalAwarenessState, createTutorialState, progressTutorial } from './operational-clarity';\n"
)
replace(
    'src/game/engine.ts',
    "const SAVE_KEY = 'future-conquest-slice-v0.13';\nconst LEGACY_V12_SAVE_KEY",
    "const SAVE_KEY = 'future-conquest-slice-v0.14';\nconst LEGACY_V13_SAVE_KEY = 'future-conquest-slice-v0.13';\nconst LEGACY_V12_SAVE_KEY"
)
replace(
    'src/game/engine.ts',
    "export function newGame(seed = Math.floor(Math.random() * 999999), difficulty: Difficulty = 'standard'): GameState {",
    "export function newGame(seed = Math.floor(Math.random() * 999999), difficulty: Difficulty = 'standard', tutorialEnabled = true): GameState {"
)
replace('src/game/engine.ts', '    version: 13,', '    version: 14,')
replace(
    'src/game/engine.ts',
    '    ...strategicState,\n    routeStates: createRouteStates(),',
    '    ...strategicState,\n    operationalAwareness: createOperationalAwarenessState(100),\n    tutorial: createTutorialState(tutorialEnabled, 1),\n    routeStates: createRouteStates(),'
)
replace(
    'src/game/engine.ts',
    '  return { ...state, selectedTaskGroupId: id, selectedTerritory: state.taskGroups[id].location, targetTerritory: null };',
    "  return progressTutorial({ ...state, selectedTaskGroupId: id, selectedTerritory: state.taskGroups[id].location, targetTerritory: null }, 'select-formation');"
)
replace(
    'src/game/engine.ts',
    """  return addEvent(
    { ...state, taskGroups, targetTerritory: null },
    `${group.name} ordered to move from ${TERRITORIES[group.location].centre} to ${TERRITORIES[target].centre} via ${route.name}.`,
    'neutral'
  );""",
    """  return progressTutorial(addEvent(
    { ...state, taskGroups, targetTerritory: null },
    `${group.name} ordered to move from ${TERRITORIES[group.location].centre} to ${TERRITORIES[target].centre} via ${route.name}.`,
    'neutral'
  ), 'issue-move');"""
)
replace(
    'src/game/engine.ts',
    "  return addEvent({ ...state, taskGroups }, `${group.name} ${next.status === 'garrison' ? 'assigned to occupation and defensive duties' : 'released from garrison duty'} in ${TERRITORIES[group.location].centre}.`, 'neutral');",
    "  return progressTutorial(addEvent({ ...state, taskGroups }, `${group.name} ${next.status === 'garrison' ? 'assigned to occupation and defensive duties' : 'released from garrison duty'} in ${TERRITORIES[group.location].centre}.`, 'neutral'), 'set-garrison');"
)
replace(
    'src/game/engine.ts',
    """  return addEvent(
    { ...state, taskGroups, operations, targetTerritory: null },
    `${group.name} ${verb} from ${TERRITORIES[group.location].centre} towards ${TERRITORIES[target].centre} via ${route.name}.`,
    'warning'
  );""",
    """  return progressTutorial(addEvent(
    { ...state, taskGroups, operations, targetTerritory: null },
    `${group.name} ${verb} from ${TERRITORIES[group.location].centre} towards ${TERRITORIES[target].centre} via ${route.name}.`,
    'warning'
  ), 'begin-operation');"""
)
replace(
    'src/game/engine.ts',
    "export function endTurn(state: GameState): GameState {\n  if (state.status !== 'playing') return state;\n  let next: GameState = {",
    "export function endTurn(state: GameState): GameState {\n  if (state.status !== 'playing') return state;\n  const previousNetworkEfficiency = state.logistics.networkEfficiency;\n  let next: GameState = {"
)
replace(
    'src/game/engine.ts',
    '    enemyStrategy: structuredClone(state.enemyStrategy),\n',
    '    enemyStrategy: structuredClone(state.enemyStrategy),\n    operationalAwareness: structuredClone(state.operationalAwareness),\n    tutorial: structuredClone(state.tutorial),\n'
)
replace(
    'src/game/engine.ts',
    '  next = refreshSupply(next);\n  const controlled =',
    '  next = refreshSupply(next);\n  next = { ...next, operationalAwareness: { ...next.operationalAwareness, previousNetworkEfficiency } };\n  const controlled ='
)
replace(
    'src/game/engine.ts',
    "type StrategyField = 'enemyStrategy';\n",
    "type StrategyField = 'enemyStrategy';\ntype AwarenessField = 'operationalAwareness';\ntype TutorialField = 'tutorial';\n"
)
replace(
    'src/game/engine.ts',
    "type LegacyV12GameState = Omit<GameState, 'version' | StrategyField> & { version: 12 };",
    "type LegacyV13GameState = Omit<GameState, 'version' | AwarenessField | TutorialField> & { version: 13 };\ntype LegacyV12GameState = Omit<GameState, 'version' | StrategyField | AwarenessField | TutorialField> & { version: 12 };"
)
engine = Path('src/game/engine.ts')
content = engine.read_text().replace('StrategyField> &', 'StrategyField | AwarenessField | TutorialField> &')
# Correct the v12 alias, which already received the fields explicitly.
content = content.replace('StrategyField | AwarenessField | TutorialField | AwarenessField | TutorialField> & { version: 12 }', 'StrategyField | AwarenessField | TutorialField> & { version: 12 }')
engine.write_text(content)
replace(
    'src/game/engine.ts',
    '      parsed.version === 13\n      && parsed.taskGroups',
    '      parsed.version === 14\n      && parsed.taskGroups'
)
replace(
    'src/game/engine.ts',
    """      && parsed.logisticsPriorities
      && parsed.enemyStrategy
    ) return upgradeStrategicState(parsed as GameState);
  }

  const v12 = localStorage.getItem(LEGACY_V12_SAVE_KEY);""",
    """      && parsed.logisticsPriorities
      && parsed.enemyStrategy
      && parsed.operationalAwareness
      && parsed.tutorial
    ) return upgradeStrategicState(parsed as GameState);
  }

  const v13 = localStorage.getItem(LEGACY_V13_SAVE_KEY);
  if (v13) {
    const parsed = JSON.parse(v13) as Partial<LegacyV13GameState>;
    if (
      parsed.version === 13
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
      && parsed.logistics
      && parsed.infrastructureIncidents
      && parsed.engineeringProjects
      && parsed.interdictionMissions
      && parsed.logisticsPriorities
      && parsed.enemyStrategy
    ) return upgradeStrategicState(parsed as LegacyV13GameState);
  }

  const v12 = localStorage.getItem(LEGACY_V12_SAVE_KEY);"""
)

# Persistence API.
persistence = Path('src/game/persistence.ts')
content = persistence.read_text()
content = content.replace("export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.13';", "export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.14';")
content = content.replace("export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.13-metadata';", "export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.14-metadata';")
content = content.replace("export const LEGACY_V12_SAVE_KEY", "export const LEGACY_V13_SAVE_KEY = 'future-conquest-slice-v0.13';\nexport const LEGACY_V12_SAVE_KEY", 1)
content = content.replace('saveVersion: 13;', 'saveVersion: 14;')
content = content.replace("'v13' | 'v12'", "'v14' | 'v13' | 'v12'")
content = content.replace("type StrategyField = 'enemyStrategy';", "type StrategyField = 'enemyStrategy';\ntype AwarenessField = 'operationalAwareness';\ntype TutorialField = 'tutorial';")
content = content.replace(
    "type LegacyV12State = Omit<GameState, 'version' | StrategyField> & { version: 12 };",
    "type LegacyV13State = Omit<GameState, 'version' | AwarenessField | TutorialField> & { version: 13 };\ntype LegacyV12State = Omit<GameState, 'version' | StrategyField | AwarenessField | TutorialField> & { version: 12 };"
)
content = content.replace('StrategyField> &', 'StrategyField | AwarenessField | TutorialField> &')
content = content.replace('StrategyField | AwarenessField | TutorialField | AwarenessField | TutorialField> & { version: 12 }', 'StrategyField | AwarenessField | TutorialField> & { version: 12 }')
content = content.replace('function isV13State(value: unknown): value is GameState {', 'function isV14State(value: unknown): value is GameState {')
content = content.replace('    && value.version === 13', '    && value.version === 14', 1)
content = content.replace(
    '    && isRecord(value.enemyStrategy)\n    && Array.isArray(value.infrastructureIncidents)',
    '    && isRecord(value.enemyStrategy)\n    && isRecord(value.operationalAwareness)\n    && isRecord(value.tutorial)\n    && Array.isArray(value.infrastructureIncidents)',
    1
)
v14_guard = """function isV14State(value: unknown): value is GameState {
  return hasCoreCampaignState(value)
    && value.version === 14
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics)
    && isRecord(value.logisticsPriorities)
    && isRecord(value.enemyStrategy)
    && isRecord(value.operationalAwareness)
    && isRecord(value.tutorial)
    && Array.isArray(value.infrastructureIncidents)
    && Array.isArray(value.engineeringProjects)
    && Array.isArray(value.interdictionMissions);
}
"""
if v14_guard not in content:
    raise RuntimeError('v14 persistence guard not found')
content = content.replace(v14_guard, v14_guard + """
function isV13State(value: unknown): value is LegacyV13State {
  return hasCoreCampaignState(value)
    && value.version === 13
    && hasStrategicCollections(value)
    && isRecord(value.routeStates)
    && isRecord(value.logistics)
    && isRecord(value.logisticsPriorities)
    && isRecord(value.enemyStrategy)
    && Array.isArray(value.infrastructureIncidents)
    && Array.isArray(value.engineeringProjects)
    && Array.isArray(value.interdictionMissions);
}
""")
content = content.replace('saveVersion: 13,', 'saveVersion: 14,')
content = content.replace('value.saveVersion === 13', 'value.saveVersion === 14')
content = content.replace("source: 'v13' | 'v12'", "source: 'v14' | 'v13' | 'v12'")
content = content.replace(
    "if (source === 'v13' && isV13State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }",
    "if (source === 'v14' && isV14State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v13' && isV13State(parsed)) {\n      const state = upgradeStrategicState(parsed);\n      return { ok: true, state, metadata: createSaveMetadata(state, null), source };\n    }"
)
content = content.replace("if (current) return inspectRaw(storage, current, 'v13');", "if (current) return inspectRaw(storage, current, 'v14');")
content = content.replace(
    '  const v12 = readRaw(storage, LEGACY_V12_SAVE_KEY);',
    "  const v13 = readRaw(storage, LEGACY_V13_SAVE_KEY);\n  if (typeof v13 !== 'string' && v13 !== null) return v13;\n  if (v13) return inspectRaw(storage, v13, 'v13');\n\n  const v12 = readRaw(storage, LEGACY_V12_SAVE_KEY);",
    1
)
content = content.replace('if (!isV13State(parsed))', 'if (!isV14State(parsed))')
persistence.write_text(content)

# Existing current-version/release assertions.
for path in Path('tests').glob('*.test.cjs'):
    content = path.read_text()
    content = content.replace(r'PHASE VIII-C \/ ENEMY STRATEGY AND CAMPAIGN BALANCE', r'PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING')
    content = content.replace('PHASE VIII-C / ENEMY STRATEGY AND CAMPAIGN BALANCE', 'PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING')
    content = re.sub(r"assert\.equal\(([^;\n]*?\.version), 13\);", r"assert.equal(\1, 14);", content)
    content = content.replace('saveVersion: 13,', 'saveVersion: 14,')
    content = content.replace(r'saveVersion:\s*13', r'saveVersion:\s*14')
    path.write_text(content)

persistence_test = Path('tests/persistence.test.cjs')
content = persistence_test.read_text().replace('a current version 13 save', 'a current version 14 save')
content = content.replace("assert.equal(result.source, 'v13');", "assert.equal(result.source, 'v14');", 1)
persistence_test.write_text(content)

Path('tests/operational-clarity-viii-d.test.cjs').write_text(dedent(r'''
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { newGame } = require('../.test-dist/engine.js');
const {
  createOperationalAwarenessState,
  createTutorialState,
  getEnemyContacts,
  getSupplyClarity,
  getThreatenedTerritories,
  progressTutorial,
  requiresSupplyAcknowledgement,
  TUTORIAL_STEPS
} = require('../.test-dist/operational-clarity.js');
const { upgradeStrategicState } = require('../.test-dist/strategic-response.js');

test('new campaigns initialise version 14 awareness and guided tutorial state', () => {
  const state = newGame(401, 'standard', true);
  assert.equal(state.version, 14);
  assert.deepEqual(state.operationalAwareness, createOperationalAwarenessState(100));
  assert.deepEqual(state.tutorial, createTutorialState(true, 1));
  assert.equal(TUTORIAL_STEPS.length, 7);
});

test('enemy contacts expose confidence and estimates rather than universal exact identities', () => {
  const state = newGame(402, 'standard', false);
  const contacts = getEnemyContacts(state);
  assert.ok(contacts.length > 0);
  assert.ok(contacts.some(contact => contact.confidence !== 'confirmed'));
  assert.ok(contacts.every(contact => contact.estimatedMax >= contact.estimatedMin));
  assert.ok(contacts.some(contact => contact.formationCount === undefined));
});

test('planned counterattacks create visible threatened-territory warnings', () => {
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

test('critical logistics state produces actionable diagnostics and end-turn acknowledgement', () => {
  const state = newGame(404, 'standard', false);
  const groupId = Object.keys(state.taskGroups)[0];
  state.logistics.networkEfficiency = 35;
  state.logistics.starvedFormationIds = [groupId];
  state.logistics.formationAllocations[groupId] = { ...state.logistics.formationAllocations[groupId], delivered: 0, ratio: 0, condition: 'cut-off' };
  const clarity = getSupplyClarity(state);
  assert.equal(clarity.severity, 'critical');
  assert.ok(clarity.diagnostics.some(item => item.groupId === groupId));
  assert.equal(requiresSupplyAcknowledgement(state), true);
});

test('tutorial advances only when the requested real action is completed', () => {
  let state = newGame(405, 'standard', true);
  state = progressTutorial(state, 'open-logistics');
  assert.equal(state.tutorial.step, 0);
  for (const trigger of ['select-formation', 'issue-move', 'begin-operation', 'set-garrison', 'open-logistics', 'review-intelligence', 'open-engineering']) state = progressTutorial(state, trigger);
  assert.equal(state.tutorial.completed, true);
  assert.equal(state.tutorial.enabled, false);
});

test('version 13 campaigns migrate to version 14 with tutorial disabled', () => {
  const current = newGame(406, 'standard', false);
  const { operationalAwareness, tutorial, ...legacy } = current;
  const migrated = upgradeStrategicState({ ...legacy, version: 13 });
  assert.equal(migrated.version, 14);
  assert.equal(migrated.tutorial.enabled, false);
  assert.equal(migrated.operationalAwareness.previousNetworkEfficiency, migrated.logistics.networkEfficiency);
});

test('the interface exposes attack visibility, supply acknowledgement and tutorial controls', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(app, /PHASE VIII-D \/ OPERATIONAL CLARITY AND ONBOARDING/);
  assert.match(app, /ENEMY ACTION DETECTED/);
  assert.match(app, /Correctable logistics failures remain/);
  assert.match(app, /TutorialOverlay/);
  assert.match(map, /enemy-contact-marker/);
  assert.match(map, /enemy-concentration-route/);
  assert.match(main, /operational-clarity\.css/);
});
''').strip() + '\n')
