import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(source, find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Could not find ${label}`);
  return source.replace(find, replacement);
}

function replacePattern(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Could not find ${label}`);
  return source.replace(pattern, replacement);
}

let engine = readFileSync('src/game/engine.ts', 'utf8');
engine = replaceOnce(
  engine,
  "import { SLICE_IDS, TERRITORIES } from './data';\n",
  "import { SLICE_IDS, TERRITORIES } from './data';\nimport { occupationRequirement } from './formation-organisation';\n",
  'engine formation organisation import'
);
engine = replaceOnce(
  engine,
  "const SAVE_KEY = 'future-conquest-slice-v0.3';\nconst LEGACY_SAVE_KEY = 'future-conquest-slice-v0.2';",
  "const SAVE_KEY = 'future-conquest-slice-v0.4';\nconst LEGACY_V3_SAVE_KEY = 'future-conquest-slice-v0.3';\nconst LEGACY_V2_SAVE_KEY = 'future-conquest-slice-v0.2';",
  'save keys'
);
engine = replaceOnce(
  engine,
  "  if (state.territories[state.portalTerritory]?.controller !== 'player') return supplied;",
  "  if (state.territories[state.portalTerritory]?.controller !== 'player' || state.territories[state.portalTerritory]?.occupation === 'unsecured') return supplied;",
  'portal supply guard'
);
engine = replaceOnce(
  engine,
  "      if (!supplied.has(neighbour) && state.territories[neighbour]?.controller === 'player') {",
  "      if (!supplied.has(neighbour) && state.territories[neighbour]?.controller === 'player' && state.territories[neighbour]?.occupation !== 'unsecured') {",
  'supply traversal guard'
);
engine = replaceOnce(
  engine,
  "    const occupationFactor = territory.occupation === 'administered' ? 1 : territory.occupation === 'controlled' ? 0.72 : 0.42;",
  "    const occupationFactor = territory.occupation === 'unsecured' ? 0 : territory.occupation === 'administered' ? 1 : territory.occupation === 'controlled' ? 0.72 : 0.42;",
  'occupation supply factor'
);
engine = replaceOnce(
  engine,
  "  const state: GameState = {\n    version: 3,",
  "  const state: GameState = {\n    version: 4,",
  'new game version'
);

const oldVictory = `      const territory = territories[operation.target];
      territory.controller = 'player';
      territory.occupation = 'contested';
      territory.legitimacy = 46;
      territory.resistance = 42;
      territory.fortification = 0;
      territory.capturedTurn = next.turn;
      for (const group of participants) {
        group.location = operation.target;
        group.status = 'ready';
        group.order = undefined;
      }
      next.escalation = clamp(next.escalation + 3.2, 0, 100);
      next.selectedTerritory = operation.target;
      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });
      delete operations[operationId];
      next = addEvent(
        next,
        \`${'${TERRITORIES[operation.target].centre}'} has fallen to ${'${participants.map(group => group.name).join(\' and \')}'}.' Remaining defenders withdrew; occupation is unstable.\`,
        'good'
      );`;
const correctedOldVictory = oldVictory.replace(".' Remaining", ". Remaining");
const newVictory = `      const territory = territories[operation.target];
      const requiredPresence = occupationRequirement(operation.target);
      const secured = remainingPersonnel >= requiredPresence;
      territory.controller = 'player';
      territory.occupation = secured ? 'contested' : 'unsecured';
      territory.legitimacy = secured ? 46 : 18;
      territory.resistance = secured ? 42 : 72;
      territory.fortification = 0;
      territory.supplied = false;
      territory.capturedTurn = next.turn;
      for (const group of participants) {
        group.location = operation.target;
        group.status = 'ready';
        group.order = undefined;
      }
      next.escalation = clamp(next.escalation + 3.2, 0, 100);
      next.selectedTerritory = operation.target;
      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });
      delete operations[operationId];
      next = addEvent(
        next,
        secured
          ? \`${'${TERRITORIES[operation.target].centre}'} has fallen to ${'${participants.map(group => group.name).join(\' and \')}'}.' Remaining defenders withdrew; occupation is unstable.\`
          : \`${'${TERRITORIES[operation.target].centre}'} has been seized by ${'${participants.map(group => group.name).join(\' and \')}'}.' Only ${'${remainingPersonnel}'} personnel remain against an occupation requirement of ${'${requiredPresence}'}; the province is unsecured.\`,
        secured ? 'good' : 'warning'
      );`;
const correctedNewVictory = newVictory.replaceAll(".' Remaining", ". Remaining").replaceAll(".' Only", ". Only");
engine = replaceOnce(engine, correctedOldVictory, correctedNewVictory, 'operation victory occupation block');

const garrisonBlock = `    const garrisonPower = Object.values(taskGroups)
      .filter(group => group.location === id && group.status === 'garrison')
      .reduce((sum, group) => sum + group.personnel / 1000, 0);`;
const occupationBlock = `${garrisonBlock}
    const localPresence = Object.values(taskGroups)
      .filter(group => group.location === id && group.status !== 'moving' && group.status !== 'attacking')
      .reduce((sum, group) => sum + group.personnel, 0);
    if (territory.occupation === 'unsecured') {
      const requiredPresence = occupationRequirement(id);
      if (localPresence >= requiredPresence) {
        territory.occupation = 'contested';
        territory.legitimacy = Math.max(territory.legitimacy, 34);
        territory.resistance = Math.min(territory.resistance, 58);
        next = addEvent(next, \`${'${TERRITORIES[id].centre}'} now has ${'${localPresence}'} personnel against an occupation requirement of ${'${requiredPresence}'}; territorial control is being established.\`, 'good');
      } else {
        territory.legitimacy = clamp(territory.legitimacy - 1.2, 0, 100);
        territory.resistance = clamp(territory.resistance + 1.5, 0, 100);
        territory.fortification = 0;
        if ((next.turn - (territory.capturedTurn ?? next.turn)) % 3 === 0) {
          next = addEvent(next, \`${'${TERRITORIES[id].centre}'} remains unsecured: ${'${localPresence}'} personnel present, ${'${requiredPresence}'} required.\`, 'warning');
        }
        continue;
      }
    }`;
engine = replaceOnce(engine, garrisonBlock, occupationBlock, 'occupation presence handling');
engine = replaceOnce(
  engine,
  "  const controlled = Object.values(next.territories).filter(territory => territory.controller === 'player').length;\n  next.escalation = clamp(Math.max(3 + controlled * 2.35, next.escalation - 0.08), 0, 100);",
  "  const controlled = Object.values(next.territories).filter(territory => territory.controller === 'player').length;\n  const unsecured = Object.values(next.territories).filter(territory => territory.occupation === 'unsecured').length;\n  next.escalation = clamp(Math.max(3 + controlled * 2.35, next.escalation - 0.08), 0, 100);",
  'unsecured victory count'
);
engine = replaceOnce(
  engine,
  "  if (controlled === SLICE_IDS.length) next = addEvent({ ...next, status: 'victory' }, 'All fifteen territories are under future control. Regional victory achieved.', 'good');",
  "  if (controlled === SLICE_IDS.length && unsecured === 0) next = addEvent({ ...next, status: 'victory' }, 'All fifteen territories are occupied and under future control. Regional victory achieved.', 'good');",
  'secured victory condition'
);
engine = replaceOnce(
  engine,
  "  return { ...withoutBattle, version: 3, taskGroups, operations };",
  "  return { ...withoutBattle, version: 4, taskGroups, operations };",
  'legacy v2 migration version'
);
engine = replaceOnce(
  engine,
  "export function saveGame(state: GameState) {",
  "type LegacyV3GameState = Omit<GameState, 'version'> & { version: 3 };\n\nexport function saveGame(state: GameState) {",
  'legacy v3 type'
);
const oldLoad = `export function loadGame(): GameState | null {
  const current = localStorage.getItem(SAVE_KEY);
  if (current) {
    const parsed = JSON.parse(current) as Partial<GameState>;
    if (parsed.version === 3 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) return parsed as GameState;
  }
  const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
  if (!legacy) return null;
  const parsed = JSON.parse(legacy) as Partial<LegacyGameState>;
  if (parsed.version !== 2 || !parsed.taskGroups || !parsed.enemyFormations) return null;
  return migrateLegacyGame(parsed as LegacyGameState);
}`;
const newLoad = `export function loadGame(): GameState | null {
  const current = localStorage.getItem(SAVE_KEY);
  if (current) {
    const parsed = JSON.parse(current) as Partial<GameState>;
    if (parsed.version === 4 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) return parsed as GameState;
  }

  const prior = localStorage.getItem(LEGACY_V3_SAVE_KEY);
  if (prior) {
    const parsed = JSON.parse(prior) as Partial<LegacyV3GameState>;
    if (parsed.version === 3 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) {
      return { ...(parsed as LegacyV3GameState), version: 4 };
    }
  }

  const legacy = localStorage.getItem(LEGACY_V2_SAVE_KEY);
  if (!legacy) return null;
  const parsed = JSON.parse(legacy) as Partial<LegacyGameState>;
  if (parsed.version !== 2 || !parsed.taskGroups || !parsed.enemyFormations) return null;
  return migrateLegacyGame(parsed as LegacyGameState);
}`;
engine = replaceOnce(engine, oldLoad, newLoad, 'save migration loader');
writeFileSync('src/game/engine.ts', engine);

let app = readFileSync('src/App.tsx', 'utf8');
app = replaceOnce(
  app,
  "import { MapView } from './components/MapView';\n",
  "import { ForceOrganisationPanel } from './components/ForceOrganisationPanel';\nimport { FormationRoster } from './components/FormationRoster';\nimport { MapView } from './components/MapView';\n",
  'App component imports'
);
app = replaceOnce(app, 'PHASE V / CONCURRENT OPERATIONS', 'PHASE VI / FORCE ORGANISATION', 'phase heading');
app = replacePattern(
  app,
  /        <section className="task-groups">[\s\S]*?\n        <section className="active-operations">/,
  `        <FormationRoster
          state={state}
          selectedGroup={selectedGroup}
          onSelect={id => setState(current => selectTaskGroup(current, id))}
        />

        <section className="active-operations">`,
  'formation roster section'
);
app = replaceOnce(
  app,
  '        <section className="territory-card">',
  '        <ForceOrganisationPanel state={state} selectedGroup={selectedGroup} onChange={setState} />\n\n        <section className="territory-card">',
  'force organisation panel insertion'
);
writeFileSync('src/App.tsx', app);

let tests = readFileSync('tests/engine.test.cjs', 'utf8');
tests = tests.replaceAll('assert.equal(loaded.version, 3);', 'assert.equal(loaded.version, 4);');
writeFileSync('tests/engine.test.cjs', tests);
