const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const mapView = fs.readFileSync('src/components/MapView.tsx', 'utf8');
const css = fs.readFileSync('src/map-readability.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');

const importIndex = path => main.indexOf(`import '${path}';`);

test('WP10 defaults the command map to operational information instead of every network layer', () => {
  const defaults = mapView.match(/const DEFAULT_MAP_LAYERS: MapLayers = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  for (const layer of ['countries', 'territories', 'orderPrompts', 'friendlyUnits', 'enemyUnits', 'operations']) {
    assert.match(defaults, new RegExp(`${layer}: true`), `${layer} should remain on by default`);
  }
  for (const layer of ['routes', 'supply', 'cities', 'ports', 'airports']) {
    assert.match(defaults, new RegExp(`${layer}: false`), `${layer} should be opt-in network detail`);
  }
  assert.match(mapView, /Operational layers default · enable network detail as needed/);
});

test('WP10 boosts screen-space overlays on real laptop widths', () => {
  assert.match(mapView, /max-width: 1180px[\s\S]*?return 1\.35/);
  assert.match(mapView, /max-width: 1450px[\s\S]*?return 1\.15/);
  assert.match(mapView, /max-width: 900px[\s\S]*?return 1\.7/);
  assert.match(mapView, /max-width: 540px[\s\S]*?return 2\.4/);
});

test('WP10 uses explicit theatre, regional, local and tactical detail tiers', () => {
  assert.match(mapView, /detailTier = zoomPercent >= 600 \? 'tactical' : zoomPercent >= 285 \? 'local' : zoomPercent >= 135 \? 'regional' : 'theatre'/);
  assert.match(mapView, /showMarkerDetails = zoomPercent >= 220/);
  assert.match(mapView, /showMarkerStatus = zoomPercent >= 600/);
  assert.match(mapView, /map-detail-\$\{detailTier\}/);
  assert.match(mapView, /future-theatre-labels \$\{zoomPercent >= 220 \? 'faded' : ''\}/);
});

test('WP10 friendly counters expose identity, strength and stable multi-formation spacing', () => {
  assert.match(mapView, /compactStrength\(group\.personnel\)/);
  assert.match(mapView, /className="marker-id"/);
  assert.match(mapView, /className="marker-strength"/);
  assert.match(mapView, /className="marker-status"/);
  assert.match(mapView, /const columns = territoryGroups\.length <= 2 \? Math\.max\(1, territoryGroups\.length\) : 3/);
  assert.match(mapView, /\* 39 \* overlayScale/);
  assert.match(mapView, /Number\(a\.group\.id === state\.selectedTaskGroupId\) - Number\(b\.group\.id === state\.selectedTaskGroupId\)/);
  assert.match(mapView, /role="button"[\s\S]*?aria-label=\{`\$\{group\.name\}/);
});

test('WP10 enemy markers retain uncertainty while showing readable assessed strength', () => {
  assert.match(mapView, /assessedStrengthLabel\(contact\.estimatedMin, contact\.estimatedMax\)/);
  assert.match(mapView, /contactConfidenceLabel/);
  assert.match(mapView, /className="contact-strength"/);
  assert.match(mapView, /className="contact-confidence"/);
  assert.match(mapView, /aria-label=\{`\$\{contact\.label\}.*assessed \$\{contact\.estimatedMin\} to \$\{contact\.estimatedMax\} personnel`\}/s);
  assert.match(mapView, /if \(event\.key === 'Enter' \|\| event\.key === ' '\)/);
  assert.doesNotMatch(mapView, /contact\.personnel/);
});

test('WP10 distinguishes threat and operation markers from generic counters', () => {
  assert.match(mapView, /className="threat-timing"/);
  assert.match(mapView, />OP \{operation\.participantGroupIds\.length\}×<\/text>/);
  assert.match(css, /\.threat-marker\.under-attack circle/);
  assert.match(css, /\.operation-marker rect/);
  assert.match(css, /\.operation-marker text/);
});

test('WP10 map styles load after legacy marker styles while preserving WP9 as the final shell contract', () => {
  const readability = importIndex('./map-readability.css');
  const responsive = importIndex('./responsive-command-fit.css');
  assert.ok(readability > importIndex('./map-label-hierarchy.css'));
  assert.ok(readability > importIndex('./operational-clarity.css'));
  assert.ok(readability > importIndex('./defence.css'));
  assert.ok(readability > importIndex('./combat-reports.css'));
  assert.ok(responsive > readability, 'WP9 responsive shell contract must remain last');
});

test('WP10 CSS gives operational markers stronger hierarchy than optional network detail', () => {
  assert.match(css, /\.task-group-marker\.selected[\s\S]*?drop-shadow/);
  assert.match(css, /\.enemy-contact-marker \.contact-body[\s\S]*?stroke-width: 2\.2px/);
  assert.match(css, /\.territory-centre-label[\s\S]*?font: 700 15px/);
  assert.match(css, /\.strategic-route \{\s*opacity: \.48/);
  assert.match(css, /\.supply-route-flow\.selected-path,[\s\S]*?opacity: 1/);
  assert.match(css, /\.map-detail-local \.future-theatre-labels,[\s\S]*?opacity: \.22/);
});
