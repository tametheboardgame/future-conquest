import fs from 'node:fs';

const file = 'src/presentation/r3-terrain-operational-markers.ts';
let source = fs.readFileSync(file, 'utf8');

const before = `  const visible = visibleTerrainMarkerIds(candidates, terrainMarkerLodForZoom(map.getZoom()));`;
const after = `  const mapRect = map.getContainer().getBoundingClientRect();
  const toolbar = map.getContainer().parentElement?.querySelector('.r3-terrain-prototype-toolbar');
  const toolbarRect = toolbar instanceof HTMLElement ? toolbar.getBoundingClientRect() : undefined;
  const reservedRects = toolbarRect ? [{
    left: toolbarRect.left - mapRect.left,
    top: toolbarRect.top - mapRect.top,
    right: toolbarRect.right - mapRect.left,
    bottom: toolbarRect.bottom - mapRect.top
  }] : [];
  const visible = visibleTerrainMarkerIds(
    candidates,
    terrainMarkerLodForZoom(map.getZoom()),
    reservedRects
  );`;

if (!source.includes(before)) throw new Error('WP2D HUD reserved-zone anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Applied deterministic terrain HUD reserved zone.');
