const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/PortalArrivalSequence.tsx'), 'utf8');

test('WP3.9C withholds the physical formations until materialisation', () => {
  assert.match(source, /R3_FORMATION_MINIATURE_LAYER_ID = 'r3-wp3-5-formation-miniatures'/);
  assert.ok(source.includes('getLayer?.(R3_FORMATION_MINIATURE_LAYER_ID)?.implementation'));
  assert.match(source, /originalFormationVisibility = layer\.visible/);
  assert.match(source, /layer\.visible = false/);
  assert.match(source, /formationsReleased = true;\s*restoreFormationVisibility\(\);\s*setPhase\('materialising'\)/);
});

test('WP3.9C restores the prior formation-layer preference on every exit path', () => {
  assert.match(source, /controlledFormationLayer\.visible = originalFormationVisibility/);
  assert.match(source, /const finish = \(\) => \{\s*if \(completed\) return;\s*restoreFormationVisibility\(\)/);
  assert.match(source, /return \(\) => \{[\s\S]*restoreFormationVisibility\(\);[\s\S]*delete bridge\(\)\.__r3PortalArrival/);
});

test('WP3.9C conceals the pre-render frame while the physical layer is being withheld', () => {
  assert.match(source, /FORMATION_WITHHOLD_SETTLE_MS = 48/);
  assert.match(source, /phase === 'waiting'[\s\S]*background: 'rgba\(2, 10, 14, 0\.985\)'[\s\S]*opacity: 1/);
});
