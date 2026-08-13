import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP2F_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP2F_ARTIFACTS ?? 'artifacts/r3-wp2f';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
await page.addInitScript(() => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
});
await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
await page.locator('[data-command-view="map"]').click();
const host = page.locator('.r3-terrain-prototype');
await host.waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready');

const evidence = { profiles: {}, hover: {}, identity: {} };
for (const [button, expected, file] of [['theatre', 'theatre', 'theatre.png'], ['campaign', 'campaign', 'campaign.png'], ['selected', 'local', 'selected-local.png']]) {
  const control = page.getByRole('button', { name: button, exact: true });
  if (button === 'selected' && await control.isDisabled()) await page.locator('.r3-terrain-territory-label').first().click();
  await control.click();
  await page.waitForFunction(lod => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-overlay-lod') === lod, expected);
  await page.waitForTimeout(900);
  evidence.profiles[expected] = await page.evaluate(() => {
    const root = document.querySelector('.r3-terrain-prototype');
    const canvas = document.querySelector('.r3-terrain-prototype-canvas canvas');
    const map = window.__r3TerrainMap;
    const nodes = window.__r3StrategicNodes ?? [];
    if (!map || !(canvas instanceof HTMLCanvasElement)) throw new Error('terrain diagnostic API unavailable');
    const canvasRect = canvas.getBoundingClientRect();
    const markers = [...document.querySelectorAll('[data-r3-marker-id]')];
    const formations = markers.filter(marker => ['formation', 'selected-formation'].includes(marker.dataset.r3MarkerKind));
    const rect = marker => { const box = marker.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, x: box.left + box.width / 2, y: box.top + box.height / 2 }; };
    const formationRects = formations.map(marker => ({ id: marker.dataset.r3MarkerId, territoryId: marker.dataset.territoryId, ...rect(marker) }));
    const collisions = [];
    for (let i = 0; i < formationRects.length; i += 1) for (let j = i + 1; j < formationRects.length; j += 1) {
      const a = formationRects[i]; const b = formationRects[j];
      if (a.territoryId === b.territoryId && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) collisions.push([a.id, b.id]);
    }
    const clusters = formationRects.reduce((result, item) => {
      (result[item.territoryId] ??= []).push(item);
      return result;
    }, {});
    const formationAlignment = Object.entries(clusters).map(([territoryId, items]) => {
      const position = window.__r3TerritoryCentres?.[territoryId];
      const anchor = position ? map.project(position) : null;
      const centroid = { x: items.reduce((sum, item) => sum + item.x, 0) / items.length, y: items.reduce((sum, item) => sum + item.y, 0) / items.length };
      return { territoryId, count: items.length, centroidDistancePx: anchor ? Math.hypot(centroid.x - canvasRect.left - anchor.x, centroid.y - canvasRect.top - anchor.y) : Number.POSITIVE_INFINITY };
    });
    const nodeDiagnostics = ['NODE-DOVER', 'NODE-CALAIS'].map(id => {
      const node = nodes.find(item => item.id === id);
      const marker = document.querySelector(`[data-node-id="${id}"]`);
      if (!node || !(marker instanceof HTMLElement)) return { id, missing: true };
      const projected = map.project(node.position); const box = rect(marker);
      const domCentre = { x: box.x - canvasRect.left, y: box.y - canvasRect.top };
      return { id, position: node.position, projected: { x: projected.x, y: projected.y }, domCentre, distancePx: Math.hypot(projected.x - domCentre.x, projected.y - domCentre.y), renderedFeatureCount: map.getLayer('campaign-strategic-nodes') ? map.queryRenderedFeatures([projected.x, projected.y], { layers: ['campaign-strategic-nodes'] }).length : 0, terrainElevation: map.queryTerrainElevation?.(node.position) ?? null };
    });
    return {
      lod: root?.getAttribute('data-overlay-lod'), scale: Number.parseFloat(getComputedStyle(root).getPropertyValue('--r3-marker-scale')),
      camera: { zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }, markerCount: markers.length,
      formationCount: formations.length, visibleFormationCount: formations.filter(marker => !marker.hidden).length,
      formationsInCanvas: formationRects.filter(item => item.right >= canvasRect.left && item.left <= canvasRect.right && item.bottom >= canvasRect.top && item.top <= canvasRect.bottom).length,
      collisions, formationAlignment, nodeDiagnostics, duplicateNodeLayerPresent: Boolean(map.getLayer('campaign-strategic-nodes'))
    };
  });
  const profile = evidence.profiles[expected];
  if (profile.scale > 1.081) throw new Error(`marker clamp exceeded in ${expected}`);
  if (profile.visibleFormationCount !== profile.formationCount) throw new Error(`player formation hidden by declutter in ${expected}`);
  if (profile.collisions.length) throw new Error(`formation rectangles intersect in ${expected}: ${JSON.stringify(profile.collisions)}`);
  if (profile.formationAlignment.some(item => item.centroidDistancePx > 2)) throw new Error(`formation centroid drifted in ${expected}`);
  if ((expected === 'theatre' || expected === 'campaign') && profile.formationsInCanvas !== profile.formationCount) throw new Error(`formation outside ${expected} canvas`);
  if (profile.duplicateNodeLayerPresent || profile.nodeDiagnostics.some(node => node.missing || node.distancePx > 2)) throw new Error(`strategic node projection/duplication failed in ${expected}`);
  await page.screenshot({ path: `${outputDir}/${file}`, fullPage: true });
}

await page.evaluate(() => { window.__wp2fMarkerNodes = new Map([...document.querySelectorAll('[data-r3-marker-id]')].map(node => [node.dataset.r3MarkerId, node])); });
const selectedBefore = await page.locator('.r3-terrain-territory-label.selected').getAttribute('data-territory-id');
const canvas = page.locator('.r3-terrain-prototype-canvas canvas');
const box = await canvas.boundingBox();
if (!box) throw new Error('terrain canvas has no rendered bounds');
let hovered = false;
for (let y = 0.25; y <= 0.75 && !hovered; y += 0.1) {
  for (let x = 0.2; x <= 0.8 && !hovered; x += 0.1) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
    hovered = await canvas.evaluate(node => node.style.cursor === 'pointer');
  }
}
if (!hovered) throw new Error('pointer sweep did not encounter a territory');
evidence.hover.entered = true;
await page.mouse.move(1, 1);
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype-canvas canvas')?.style.cursor !== 'pointer', undefined, { timeout: 5_000 });
evidence.hover.cleared = await canvas.evaluate(node => node.style.cursor !== 'pointer');
evidence.hover.selectionUnchanged = selectedBefore === await page.locator('.r3-terrain-territory-label.selected').getAttribute('data-territory-id');
evidence.identity = await page.evaluate(() => {
  const prior = window.__wp2fMarkerNodes;
  const current = [...document.querySelectorAll('[data-r3-marker-id]')];
  const unchanged = current.filter(node => prior.get(node.dataset.r3MarkerId) === node).length;
  return { current: current.length, unchanged };
});
if (!evidence.hover.selectionUnchanged || evidence.identity.unchanged !== evidence.identity.current) throw new Error('hover/zoom replaced identity or changed selection');
evidence.territoryFillPolicy = 'ordinary:0;hover:0.075;selected:0.13;targeted:0.16';
fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(evidence, null, 2));
