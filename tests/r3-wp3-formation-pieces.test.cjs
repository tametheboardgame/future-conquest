const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const main = fs.readFileSync('src/main.tsx', 'utf8');
const css = fs.readFileSync('src/r3-formation-pieces.css', 'utf8');
const map = fs.readFileSync('src/components/MapView.tsx', 'utf8');

test('R3 WP3 formation piece layer loads after the WP2 map hierarchy and before responsive fit', () => {
  const hierarchy = main.indexOf("import './r3-map-hierarchy.css'");
  const pieces = main.indexOf("import './r3-formation-pieces.css'");
  const responsive = main.indexOf("import './responsive-command-fit.css'");
  assert.ok(hierarchy >= 0 && pieces > hierarchy && responsive > pieces);
});

test('R3 WP3 keeps the existing accessible friendly formation interaction geometry', () => {
  assert.match(map, /className={`task-group-marker \$\{selected \? 'selected' : ''\} \$\{group\.status\}`}/);
  assert.match(map, /role="button"/);
  assert.match(map, /tabIndex=\{0\}/);
  assert.match(map, /onSelectGroup\(group\.id\)/);
  assert.match(map, /aria-label={`\$\{group\.name\}, \$\{group\.personnel\} active personnel, \$\{group\.status\}`}/);
});

test('R3 WP3 gives friendly pieces physical depth and a dominant selected state', () => {
  assert.match(css, /\.task-group-marker \{[\s\S]*drop-shadow/);
  assert.match(css, /\.task-group-marker \.marker-body[\s\S]*stroke-width: 2\.2px/);
  assert.match(css, /\.task-group-marker\.selected[\s\S]*drop-shadow/);
  assert.match(css, /\.task-group-marker\.selected \.marker-body[\s\S]*stroke-width: 3px/);
  assert.match(css, /marker-selection-halo/);
});

test('R3 WP3 encodes friendly operational status without changing map data', () => {
  for (const status of ['garrison', 'attacking', 'moving', 'recovering', 'engineering', 'interdicting']) {
    assert.ok(css.includes(`task-group-marker.${status}`), `missing ${status} piece treatment`);
  }
  assert.doesNotMatch(css, /position:\s*(fixed|absolute)/);
});

test('R3 WP3 keeps enemy contacts visually and informationally distinct from friendly pieces', () => {
  assert.match(map, /className={`enemy-contact-marker \$\{contact\.confidence\}`}/);
  assert.match(map, /estimatedMin/);
  assert.match(map, /estimatedMax/);
  assert.doesNotMatch(map, /enemy-contact-marker[\s\S]{0,300}enemyStrengthAt/);
  assert.match(css, /pointed contact[\s\S]*No exact enemy identity is added/i);
  for (const confidence of ['confirmed', 'estimated', 'activity', 'stale']) {
    assert.ok(css.includes(`enemy-contact-marker.${confidence}`), `missing ${confidence} contact treatment`);
  }
});

test('R3 WP3 simplifies piece effects on mobile and preserves reduced-motion handling', () => {
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*task-group-marker[\s\S]*drop-shadow/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*enemy-contact-marker[\s\S]*drop-shadow/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition: none/);
});
