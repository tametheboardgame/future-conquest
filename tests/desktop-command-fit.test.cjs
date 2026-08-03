const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('priority movement and attack controls remain above the detailed command panel', () => {
  const app = read('src/App.tsx');
  assert.match(app, /renderPriorityOrderAction\(\)/);
  assert.match(app, /ATTACK ORDER READY/);
  assert.match(app, /Begin operation/);
  assert.match(app, /Priority operational corridor/);
  assert.match(app, /beginOperation\(current, chosenRouteId/);
  assert.match(app, /issueMove\(current, chosenRouteId/);
});

test('desktop map uses a compact confirmation anchored to the selected attack territory', () => {
  const app = read('src/App.tsx');
  const map = read('src/components/MapView.tsx');
  const css = read('src/desktop-command-fit.css');
  assert.match(app, /operationConfirmation=\{canAttack && target/);
  assert.match(app, /Confirm operation\?/);
  assert.match(map, /operationConfirmationAnchor/);
  assert.match(map, /className="map-operation-confirmation"/);
  assert.match(map, /translate\(\$\{operationConfirmationAnchor\[0\]\}/);
  assert.ok(map.indexOf('className="map-operation-confirmation"') > map.indexOf('task-group-marker'), 'confirmation must render above all map selection layers');
  assert.match(css, /\.map-operation-confirmation\s*\{/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.map-operation-confirmation\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(css, /\.priority-order-action\.map/);
});

test('large desktop viewports fit the command shell and use internal panel scrolling', () => {
  const css = read('src/desktop-command-fit.css');
  assert.match(css, /@media \(min-width: 901px\) and \(min-height: 720px\)/);
  assert.match(css, /body\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.command-app-shell\s*\{[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.command-workspace\s*\{[\s\S]*flex:\s*1 1 auto[\s\S]*min-height:\s*0/);
  assert.match(css, /\.map-context-panel\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.command-view\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.europe-map-frame\s*\{[\s\S]*height:\s*auto/);
});

test('desktop fit stylesheet loads after every existing interface stylesheet', () => {
  const main = read('src/main.tsx');
  assert.ok(main.indexOf("./desktop-command-fit.css") > main.indexOf("./strategic-response.css"));
  assert.ok(main.indexOf("./desktop-command-fit.css") > main.indexOf("./command-interface.css"));
});
