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
  if (button === 'selected' && await control.isDisabled()) {
    await page.locator('.r3-terrain-territory-label').first().click();
  }
  await control.click();
  await page.waitForFunction(lod => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-overlay-lod') === lod, expected);
  await page.waitForTimeout(900);
  evidence.profiles[expected] = await page.evaluate(() => {
    const root = document.querySelector('.r3-terrain-prototype');
    const markers = [...document.querySelectorAll('[data-r3-marker-id]')];
    const scale = Number.parseFloat(getComputedStyle(root).getPropertyValue('--r3-marker-scale'));
    return { lod: root?.getAttribute('data-overlay-lod'), scale, markerCount: markers.length, visibleCount: markers.filter(marker => !marker.hidden).length, maximumRenderedScale: scale };
  });
  if (evidence.profiles[expected].maximumRenderedScale > 1.081) throw new Error(`marker clamp exceeded in ${expected}`);
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
// Move genuinely outside the MapLibre canvas. The previous canvas-edge probe could
// still land on a territory polygon and therefore correctly retain pointer hover.
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