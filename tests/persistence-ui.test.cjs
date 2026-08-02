const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const main = fs.readFileSync('src/main.tsx', 'utf8');
const controller = fs.readFileSync('src/persistence-feedback.ts', 'utf8');
const css = fs.readFileSync('src/save-load.css', 'utf8');

test('the persistence controller and styles load after the existing interface styles', () => {
  const formationIndex = main.indexOf("import './formation-organisation.css';");
  const saveCssIndex = main.indexOf("import './save-load.css';");
  const controllerIndex = main.indexOf("import './persistence-feedback';");

  assert.ok(formationIndex >= 0);
  assert.ok(saveCssIndex > formationIndex);
  assert.ok(controllerIndex > saveCssIndex);
});

test('manual save and load actions provide visible success and error feedback', () => {
  assert.match(controller, /Game saved/);
  assert.match(controller, /Game loaded/);
  assert.match(controller, /inspectStoredCampaign/);
  assert.match(controller, /stopImmediatePropagation/);
  assert.match(controller, /role/);
  assert.match(controller, /aria-live/);
});

test('resolving a day triggers the existing save control as an autosave', () => {
  assert.match(controller, /Resolve all orders/);
  assert.match(controller, /triggerAutosave/);
  assert.match(controller, /saveButton\.click\(\)/);
  assert.match(controller, /Autosaved/);
});

test('save notifications remain visible above the game and adapt to mobile screens', () => {
  assert.match(css, /position: fixed/);
  assert.match(css, /z-index: 1000/);
  assert.match(css, /\.save-notice\.success/);
  assert.match(css, /\.save-notice\.error/);
  assert.match(css, /@media \(max-width: 720px\)/);
});
