const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');

// Execute the production geometry at a reduced, equivalent scale so this dense
// four-formation case remains a fast deterministic unit contract.
const start = source.indexOf('type Rect =');
const end = source.indexOf('export function applyTerrainOperationalMarkerLayout', start);
const scaledSource = source.slice(start, end)
  .replaceAll('96', '12')
  .replace('for (let dy = -48; dy <= 48; dy += 4) for (let dx = -48; dx <= 48; dx += 4)',
    'for (let dy = -8; dy <= 8; dy += 1) for (let dx = -8; dx <= 8; dx += 1)')
  .replaceAll('48 * 48', '8 * 8');

class FakeHTMLElement {}

const context = vm.createContext({ Map, HTMLElement: FakeHTMLElement, globalThis: null });
context.globalThis = context;
vm.runInContext(`${stripTypeScriptTypes(scaledSource)}\n`
  + 'globalThis.layout = avoidFormationLabelCollisions; globalThis.toolbarLayout = avoidTerritoryToolbarCollisions; '
  + 'globalThis.contactLayout = avoidEnemyPlaceLabelCollisions; globalThis.capture = resetAndCaptureMarkerBaseRects;', context);

const makeMarker = ({ id, kind, territoryId, rect }) => {
  const base = { ...rect };
  const element = new FakeHTMLElement();
  element.hidden = false;
  element.dataset = {
    r3MarkerId: id,
    r3MarkerKind: kind,
    r3MarkerOffsetX: '0',
    r3MarkerOffsetY: '0',
    ...(territoryId ? { territoryId } : {})
  };
  element.getBoundingClientRect = () => ({ ...element.rect });
  element.rect = { ...base };
  return {
    getElement: () => element,
    getLngLat: () => ({ lng: 6.13, lat: 49.61 }),
    setOffset: ([x, y]) => {
      element.rect = { left: base.left + x, right: base.right + x, top: base.top + y, bottom: base.bottom + y };
    }
  };
};

const intersects = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

test('WP2F deterministic dense four-formation cluster uses the joint visible-label fallback', () => {
  const formations = [
    [48, 48], [54, 48], [48, 54], [54, 54]
  ].map(([left, top], index) => makeMarker({
    id: `formation:${index}`, kind: 'formation', territoryId: 'LU-01',
    rect: { left, top, right: left + 4, bottom: top + 4 }
  }));
  const labels = [
    { id: 'territory:LU-01', rect: { left: 34, top: 34, right: 49, bottom: 72 } },
    { id: 'territory:NL-01', rect: { left: 57, top: 34, right: 72, bottom: 72 } },
    { id: 'territory:BE-01', rect: { left: 49, top: 34, right: 57, bottom: 49 } },
    { id: 'node:LUX', rect: { left: 49, top: 57, right: 57, bottom: 72 } }
  ].map(item => makeMarker({ ...item, kind: item.id.startsWith('node:') ? 'node-major' : 'territory' }));
  const earlierFormation = makeMarker({
    id: 'formation:earlier', kind: 'formation', territoryId: 'BE-01',
    rect: { left: 26, top: 48, right: 30, bottom: 52 }
  });
  // In insertion order this independent cluster settles before LU-01. Its
  // accepted rectangle must constrain the later cluster's label backtracking.
  const markers = [earlierFormation, ...formations, ...labels];
  const anchors = markers.map(marker => marker.getLngLat());
  const baseRects = context.capture(markers);
  const toolbar = new FakeHTMLElement();
  toolbar.getBoundingClientRect = () => ({ left: 0, top: 0, right: 20, bottom: 12 });

  context.layout(markers, baseRects, toolbar, { left: 0, top: 0, right: 100, bottom: 100 });

  const formationRects = formations.map(marker => marker.getElement().rect);
  const labelRects = labels.map(marker => marker.getElement().rect);
  const displacements = formations.map(marker => [
    Number(marker.getElement().dataset.formationDisplacementX),
    Number(marker.getElement().dataset.formationDisplacementY)
  ]);
  assert.ok(labels.some(marker => Math.hypot(
    Number(marker.getElement().dataset.placeAvoidanceDisplacementX),
    Number(marker.getElement().dataset.placeAvoidanceDisplacementY)
  ) > 0), 'the impossible common placement must activate label fallback');
  assert.deepEqual(displacements.slice(1), [displacements[0], displacements[0], displacements[0]], 'cluster uses one common displacement');
  assert.ok(Math.hypot(...displacements[0]) <= 12, 'scaled formation displacement stays within its budget');
  assert.equal(formationRects.some((rect, i) => formationRects.slice(i + 1).some(other => intersects(rect, other))), false);
  assert.equal(formationRects.some(rect => labelRects.some(label => intersects(rect, label))), false);
  assert.equal(labelRects.some(label => intersects(label, earlierFormation.getElement().rect)), false,
    'later label fallback cannot cover an already placed formation');
  assert.equal(labelRects.some((rect, i) => labelRects.slice(i + 1).some(other => intersects(rect, other))), false);
  assert.equal(labelRects.some(rect => intersects(rect, toolbar.getBoundingClientRect())), false);
  assert.ok(labelRects.every(rect => rect.left >= 0 && rect.top >= 0 && rect.right <= 100 && rect.bottom <= 100));
  assert.deepEqual(markers.map(marker => marker.getLngLat()), anchors, 'authoritative geographic anchors are unchanged');
  assert.ok(markers.every(marker => marker.getElement().dataset.r3MarkerId), 'all protected markers remain visible and identifiable');
});

test('toolbar avoidance keeps an edge-of-canvas protected label fully visible', () => {
  const label = makeMarker({
    id: 'territory:edge', kind: 'territory',
    rect: { left: 30, top: 2, right: 40, bottom: 10 }
  });
  const toolbar = new FakeHTMLElement();
  toolbar.getBoundingClientRect = () => ({ left: 20, top: 0, right: 80, bottom: 20 });
  const canvas = { left: 0, top: 0, right: 100, bottom: 100 };
  const anchors = label.getLngLat();

  context.toolbarLayout([label], toolbar, context.capture([label]), canvas);

  const rect = label.getElement().rect;
  assert.ok(rect.left >= canvas.left && rect.top >= canvas.top && rect.right <= canvas.right && rect.bottom <= canvas.bottom);
  assert.equal(intersects(rect, toolbar.getBoundingClientRect()), false);
  assert.notEqual(Number(label.getElement().dataset.toolbarDisplacementY), -14,
    'the shortest upward candidate is rejected because it would leave the canvas');
  assert.deepEqual(label.getLngLat(), anchors, 'toolbar layout does not change the geographic anchor');
});

test('contact avoidance rejects an outward edge-of-canvas displacement', () => {
  const contact = makeMarker({
    id: 'enemy:edge', kind: 'enemy-estimated',
    rect: { left: 90, top: 10, right: 100, bottom: 20 }
  });
  const label = makeMarker({
    id: 'territory:edge', kind: 'territory',
    rect: { left: 82, top: 10, right: 92, bottom: 20 }
  });
  const canvas = { left: 0, top: 0, right: 100, bottom: 100 };
  const anchors = contact.getLngLat();

  context.contactLayout([contact, label], null, context.capture([contact, label]), canvas);

  const rect = contact.getElement().rect;
  assert.ok(rect.left >= canvas.left && rect.top >= canvas.top && rect.right <= canvas.right && rect.bottom <= canvas.bottom);
  assert.equal(intersects(rect, label.getElement().rect), false);
  assert.notEqual(Number(contact.getElement().dataset.contactDisplacementX), 8,
    'the first outward collision-free candidate is rejected');
  assert.ok(Math.hypot(Number(contact.getElement().dataset.contactDisplacementX),
    Number(contact.getElement().dataset.contactDisplacementY)) <= 64);
  assert.deepEqual(contact.getLngLat(), anchors, 'contact layout does not change the geographic anchor');
});

test('later dense-cluster label fallback predicate includes earlier formations', () => {
  assert.match(source, /moved\.every\([\s\S]*placedFormationRects\.every\(formation => !overlaps\(candidate, formation, 0\)\)[\s\S]*formationRects\.every/);
});
