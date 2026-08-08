const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('WP7 replaces stacked engineering/interdiction screens with one infrastructure workspace', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const component = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
  assert.match(app, /<InfrastructureCommand/);
  assert.doesNotMatch(app, /<div className="infrastructure-command-stack">/);
  assert.match(component, /data-wp7-infrastructure="true"/);
  assert.match(component, /type InfrastructureTab = 'overview' \| 'repair' \| 'interdict' \| 'history'/);
});

test('WP7 navigation calls the shared screen Infrastructure while preserving the engineering route id', () => {
  const navigation = fs.readFileSync('src/components/CommandNavigation.tsx', 'utf8');
  assert.match(navigation, /id: 'engineering', code: 'INF', label: 'Infrastructure'/);
  assert.match(navigation, /data-command-view=\{item\.id\}/);
});

test('WP7 repair orders preview effect, logistics rate and ETA before commitment', () => {
  const component = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
  assert.match(component, /data-wp7-repair-preview="true"/);
  assert.match(component, /Route condition/);
  assert.match(component, /Formation delivery/);
  assert.match(component, /Repair rate/);
  assert.match(component, /Estimated completion/);
  assert.match(component, /Daily network demand/);
  assert.match(component, /less than 15% of its daily demand/);
});

test('WP7 interdiction preview exposes cost and strategic risk without revealing hidden defenders', () => {
  const component = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
  assert.match(component, /data-wp7-interdiction-preview="true"/);
  assert.match(component, /Damage if successful/);
  assert.match(component, /Escalation if successful/);
  assert.match(component, /Escalation if failed/);
  assert.match(component, /enemy security and readiness are not revealed by this preview/);
  assert.doesNotMatch(component, /successChance/);
  assert.doesNotMatch(component, /defenderPersonnel/);
});

test('WP7 explains eligibility and formation commitment instead of silently disabling actions', () => {
  const component = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
  assert.match(component, /WHEN ACTIONS ARE AVAILABLE/);
  assert.match(component, /both endpoints must be controlled and secured/);
  assert.match(component, /route must cross the current friendly\/enemy frontier/);
  assert.match(component, /cannot move, attack or reorganise/);
  assert.match(component, /No repair order available/);
  assert.match(component, /No interdiction order available/);
});

test('WP7 keeps active work actionable with ETA, stall warnings and cancellation', () => {
  const component = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');
  assert.match(component, /ACTIVE REPAIRS/);
  assert.match(component, /ACTIVE INTERDICTIONS/);
  assert.match(component, /<dt>ETA<\/dt>/);
  assert.match(component, /Progress is stalled because the assigned formation is below 15% logistics delivery/);
  assert.match(component, /Mission progress is stalled because the assigned formation is below 15% logistics delivery/);
  assert.match(component, /Cancel project/);
  assert.match(component, /Cancel mission/);
});

test('WP7 infrastructure layout has one tabbed command surface and responsive fallbacks', () => {
  const css = fs.readFileSync('src/infrastructure-command.css', 'utf8');
  const main = fs.readFileSync('src/main.tsx', 'utf8');
  assert.match(main, /import '\.\/infrastructure-command\.css';/);
  assert.match(css, /\.infrastructure-tabs/);
  assert.match(css, /\.infrastructure-work-grid/);
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
});
