const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const app = readFileSync('src/App.tsx', 'utf8');
const panel = readFileSync('src/components/ForceOrganisationPanel.tsx', 'utf8');
const roster = readFileSync('src/components/FormationRoster.tsx', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');
const engine = readFileSync('src/game/engine.ts', 'utf8');
const organisation = readFileSync('src/game/formation-organisation.ts', 'utf8');

test('the campaign interface exposes force organisation and a scalable roster', () => {
  assert.match(app, /ForceOrganisationPanel/);
  assert.match(app, /FormationRoster/);
  assert.match(app, /currentView === 'forces'/);
  assert.match(app, /Formation command/);
  assert.match(roster, /Search formation, province or status/);
});

test('force organisation exposes the intended core actions', () => {
  assert.match(panel, />Split</);
  assert.match(panel, />Transfer</);
  assert.match(panel, />Merge</);
  assert.match(panel, />Rename</);
  assert.match(panel, /Dissolve empty formation/);
});

test('split editor suggests unique numbered names and keeps armour allocation tied to personnel by default', () => {
  assert.match(panel, /suggestSplitFormationName/);
  assert.match(panel, /proportionalSplitArmour/);
  assert.match(panel, /Use proportional armour/);
  assert.match(panel, /Armour allocation follows the personnel split/);
  assert.match(panel, /New formation/);
  assert.match(panel, /remains/);
  assert.match(organisation, /cannot be assigned more functional powered-armour suits than personnel/i);
});

test('formation organisation surfaces explicit commitment and validation reasons', () => {
  assert.match(organisation, /assigned to an engineering project/);
  assert.match(organisation, /assigned to an interdiction mission/);
  assert.match(organisation, /already exists\. Use a unique name/);
  assert.match(panel, /splitFormationValidation/);
  assert.match(panel, /transferFormationValidation/);
  assert.match(panel, /mergeFormationValidation/);
  assert.match(panel, /renameFormationValidation/);
});

test('formation organisation styles load after the command-panel layout rules', () => {
  const layoutIndex = main.indexOf("./command-panel-layout.css");
  const organisationIndex = main.indexOf("./formation-organisation.css");
  assert.ok(layoutIndex >= 0);
  assert.ok(organisationIndex > layoutIndex);
});

test('the engine distinguishes unsecured captures from occupied territory', () => {
  assert.match(engine, /occupationRequirement/);
  assert.match(engine, /occupation = secured \? 'contested' : 'unsecured'/);
  assert.match(engine, /occupation === 'unsecured'/);
  assert.match(readFileSync('src/components/MapView.tsx', 'utf8'), /unsecured-control/);
});
