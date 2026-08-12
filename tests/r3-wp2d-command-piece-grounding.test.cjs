const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');

const ruleContaining = (selector, expectedFragment) => {
  let cursor = 0;
  while (cursor < css.length) {
    const start = css.indexOf(selector, cursor);
    if (start < 0) break;
    const end = css.indexOf('\n}', start);
    assert.ok(end > start, `unterminated selector ${selector}`);
    const candidate = css.slice(start, end + 2);
    if (candidate.includes(expectedFragment)) return candidate;
    cursor = end + 2;
  }
  assert.fail(`missing ${selector} rule containing ${expectedFragment}`);
};

test('WP2D-D gives friendly formations a restrained bevel and contact shadow', () => {
  const formation = ruleContaining('.r3-terrain-task-group-marker {', 'linear-gradient(180deg');
  assert.match(formation, /0 5px 0 -3px rgba\(0, 0, 0, \.72\)/);
  assert.match(formation, /inset 0 1px 0 rgba\(255, 255, 255, \.11\)/);
});

test('WP2D-D keeps selected formations brighter without animation or positional distortion', () => {
  const selected = ruleContaining('.r3-terrain-task-group-marker.selected {', '0 0 0 3px rgba(102, 245, 226, .35)');
  assert.match(selected, /0 10px 18px rgba\(0, 0, 0, \.56\)/);
  assert.doesNotMatch(selected, /transform|animation/);
});

test('WP2D-D grounds enemy contacts live threats and operations consistently', () => {
  const enemy = ruleContaining('.r3-terrain-enemy-contact {', 'linear-gradient(180deg');
  const threat = ruleContaining('.r3-terrain-threat-marker {', 'radial-gradient(circle at 38% 30%');
  const operation = ruleContaining('.r3-terrain-operation-marker {', 'linear-gradient(180deg');
  for (const markerRule of [enemy, threat, operation]) {
    assert.match(markerRule, /box-shadow:/);
    assert.doesNotMatch(markerRule, /animation/);
  }
});
