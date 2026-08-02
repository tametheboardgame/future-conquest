const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('map presses remain clicks until a real drag or pinch begins', () => {
  const source = read('src/components/MapView.tsx');
  const pointerDown = source.slice(source.indexOf('const handlePointerDown'), source.indexOf('const handlePointerMove'));
  const firstPointerBranch = pointerDown.slice(0, pointerDown.indexOf('} else if'));
  assert.ok(pointerDown.indexOf('pointers.current.set') >= 0);
  assert.ok(pointerDown.indexOf('pointers.current.set') < pointerDown.indexOf('setPointerCapture'));
  assert.doesNotMatch(firstPointerBranch, /setPointerCapture|setPanning\(true\)/);
  assert.match(source, /const dragDistance = Math\.abs\(deltaX\) \+ Math\.abs\(deltaY\)/);
  assert.match(source, /dragDistance <= 4/);
  assert.match(source, /hasPointerCapture\(event\.pointerId\)/);
});

test('territories and task-group markers retain direct selection handlers', () => {
  const source = read('src/components/MapView.tsx');
  const css = read('src/europe-map.css');
  assert.ok(source.includes('className={`territory '));
  assert.ok(source.includes('onClick={() => selectTerritory(id)}'));
  assert.ok(source.includes('className={`task-group-marker'));
  assert.ok(source.includes('onSelectGroup(group.id)'));
  assert.match(css, /\.europe-map \.territory,[\s\S]*\.europe-map \.task-group-marker[\s\S]*pointer-events: all/);
});
