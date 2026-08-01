import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(source, find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Could not find ${label}`);
  return source.replace(find, replacement);
}

let organisation = readFileSync('src/game/formation-organisation.ts', 'utf8');
organisation = replaceOnce(
  organisation,
  "export function splitFormation(state: GameState, input: SplitFormationInput): GameState {\n  const source = state.taskGroups[input.sourceId];",
  "export function splitFormation(state: GameState, input: SplitFormationInput): GameState {\n  if (state.status !== 'playing') return state;\n  const source = state.taskGroups[input.sourceId];",
  'split state guard'
);
organisation = replaceOnce(
  organisation,
  "export function mergeFormations(state: GameState, targetId: string, sourceId: string, name?: string): GameState {\n  if (!sameLocationAndAvailable(state, targetId, sourceId)) return state;",
  "export function mergeFormations(state: GameState, targetId: string, sourceId: string, name?: string): GameState {\n  if (state.status !== 'playing' || !sameLocationAndAvailable(state, targetId, sourceId)) return state;",
  'merge state guard'
);
organisation = replaceOnce(
  organisation,
  "export function transferFormationResources(state: GameState, input: TransferFormationInput): GameState {\n  if (!sameLocationAndAvailable(state, input.sourceId, input.targetId)) return state;",
  "export function transferFormationResources(state: GameState, input: TransferFormationInput): GameState {\n  if (state.status !== 'playing' || !sameLocationAndAvailable(state, input.sourceId, input.targetId)) return state;",
  'transfer state guard'
);
organisation = replaceOnce(
  organisation,
  "export function renameFormation(state: GameState, groupId: string, name: string): GameState {\n  const group = state.taskGroups[groupId];",
  "export function renameFormation(state: GameState, groupId: string, name: string): GameState {\n  if (state.status !== 'playing') return state;\n  const group = state.taskGroups[groupId];",
  'rename state guard'
);
organisation = replaceOnce(
  organisation,
  "export function dissolveFormation(state: GameState, groupId: string): GameState {\n  const group = state.taskGroups[groupId];",
  "export function dissolveFormation(state: GameState, groupId: string): GameState {\n  if (state.status !== 'playing') return state;\n  const group = state.taskGroups[groupId];",
  'dissolve state guard'
);
organisation = replaceOnce(
  organisation,
  "  if (group.personnel !== 0 || group.functionalArmour !== 0 || group.damagedArmour !== 0) return state;",
  "  if (group.personnel !== 0 || group.maxPersonnel !== 0 || group.functionalArmour !== 0 || group.damagedArmour !== 0) return state;",
  'dissolve establishment guard'
);
writeFileSync('src/game/formation-organisation.ts', organisation);

let panel = readFileSync('src/components/ForceOrganisationPanel.tsx', 'utf8');
panel = replaceOnce(
  panel,
  "disabled={!available || selectedGroup.personnel !== 0 || selectedGroup.functionalArmour !== 0 || selectedGroup.damagedArmour !== 0 || Object.keys(state.taskGroups).length <= 1}",
  "disabled={!available || selectedGroup.personnel !== 0 || selectedGroup.maxPersonnel !== 0 || selectedGroup.functionalArmour !== 0 || selectedGroup.damagedArmour !== 0 || Object.keys(state.taskGroups).length <= 1}",
  'dissolve button establishment guard'
);
writeFileSync('src/components/ForceOrganisationPanel.tsx', panel);

let engine = readFileSync('src/game/engine.ts', 'utf8');
engine = replaceOnce(
  engine,
  "        territory.occupation = 'contested';\n        territory.legitimacy = Math.max(territory.legitimacy, 34);",
  "        territory.occupation = 'contested';\n        territory.capturedTurn = next.turn;\n        territory.legitimacy = Math.max(territory.legitimacy, 34);",
  'occupation clock reset'
);
writeFileSync('src/game/engine.ts', engine);

let map = readFileSync('src/components/MapView.tsx', 'utf8');
map = replaceOnce(
  map,
  "className={`territory ${territory.controller} ${territory.supplied ? 'supplied' : 'isolated'} ${selected ? 'selected' : ''} ${targeted ? 'targeted' : ''} ${active ? 'active-battle' : ''}`}",
  "className={`territory ${territory.controller} ${territory.supplied ? 'supplied' : 'isolated'} ${territory.occupation === 'unsecured' ? 'unsecured-control' : ''} ${selected ? 'selected' : ''} ${targeted ? 'targeted' : ''} ${active ? 'active-battle' : ''}`}",
  'unsecured map class'
);
writeFileSync('src/components/MapView.tsx', map);

let css = readFileSync('src/formation-organisation.css', 'utf8');
css += `\n.territory.player.unsecured-control {\n  fill: #6a5030;\n  stroke: #ffb45c;\n  stroke-dasharray: 4 3;\n}\n`;
writeFileSync('src/formation-organisation.css', css);

let tests = readFileSync('tests/formation-organisation.test.cjs', 'utf8');
tests = replaceOnce(
  tests,
  "const { beginOperation, endTurn, newGame } = require('../.test-dist/engine.js');",
  "const { beginOperation, endTurn, loadGame, newGame } = require('../.test-dist/engine.js');",
  'formation test engine imports'
);
tests = replaceOnce(
  tests,
  "test('empty formations can be dissolved after resources are reassigned', () => {",
  `test('formations with residual recovery establishment cannot be dissolved', () => {\n  const state = newGame(2);\n  state.taskGroups['TG-1'].personnel = 0;\n  state.taskGroups['TG-1'].functionalArmour = 0;\n  state.taskGroups['TG-1'].damagedArmour = 0;\n  assert.equal(dissolveFormation(state, 'TG-1'), state);\n});\n\ntest('empty formations can be dissolved after resources are reassigned', () => {`,
  'residual establishment regression'
);
tests = replaceOnce(
  tests,
  "  state = endTurn(state);\n  assert.equal(state.territories[target].occupation, 'contested');\n});",
  "  state = endTurn(state);\n  assert.equal(state.territories[target].occupation, 'contested');\n  assert.equal(state.territories[target].capturedTurn, state.turn);\n});",
  'occupation clock assertion'
);
tests += `\n\ntest('version 3 concurrent-operation saves migrate to version 4', () => {\n  const storage = new Map();\n  global.localStorage = {\n    setItem: (key, value) => storage.set(key, value),\n    getItem: key => storage.get(key) ?? null,\n    removeItem: key => storage.delete(key),\n    clear: () => storage.clear()\n  };\n  const prior = newGame(2);\n  prior.version = 3;\n  storage.set('future-conquest-slice-v0.3', JSON.stringify(prior));\n  const loaded = loadGame();\n  assert.ok(loaded);\n  assert.equal(loaded.version, 4);\n  assert.equal(Object.keys(loaded.taskGroups).length, 4);\n});\n`;
writeFileSync('tests/formation-organisation.test.cjs', tests);

let uiTests = readFileSync('tests/formation-organisation-ui.test.cjs', 'utf8');
uiTests = replaceOnce(
  uiTests,
  "  assert.match(engine, /occupation === 'unsecured'/);\n});",
  "  assert.match(engine, /occupation === 'unsecured'/);\n  assert.match(readFileSync('src/components/MapView.tsx', 'utf8'), /unsecured-control/);\n});",
  'unsecured map source regression'
);
writeFileSync('tests/formation-organisation-ui.test.cjs', uiTests);
