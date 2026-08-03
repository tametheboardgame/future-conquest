const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('priority movement and attack controls appear above the detailed command panel', () => {
  const app = read('src/App.tsx');
  assert.match(app, /renderPriorityOrderAction\('panel'\)/);
  assert.match(app, /ATTACK ORDER READY/);
  assert.match(app, /Begin operation/);
  assert.match(app, /Priority operational corridor/);
  assert.match(app, /beginOperation\(current, chosenRouteId/);
  assert.match(app, /issueMove\(current, chosenRouteId/);
});

test('desktop command map also exposes the selected order as a floating action', () => {
  const app = read('src/App.tsx');
  const css = read('src/desktop-command-fit.css');
  assert.match(app, /renderPriorityOrderAction\('map'\)/);
  assert.match(css, /\.priority-order-action\.map\s*\{[\s\S]*position:\s*absolute/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.priority-order-action\.map\s*\{[\s\S]*display:\s*none/);
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
