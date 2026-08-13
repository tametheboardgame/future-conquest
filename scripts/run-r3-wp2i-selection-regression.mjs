import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP2I_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP2I_ARTIFACTS ?? 'artifacts/r3-wp2i-selection';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
page.on('console', message => console.log(`[browser console ${message.type()}] ${message.text()}`));
page.on('pageerror', error => console.log(`[browser pageerror] ${error.stack ?? error.message}`));

await page.addInitScript(() => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  // App creates the initial GameState synchronously while the module script is
  // running. Override randomness only for that render, then restore the browser
  // implementation before MapLibre workers/terrain initialise.
  const nativeRandom = Math.random;
  Math.random = () => 9.5 / 999999;
  window.addEventListener('DOMContentLoaded', () => { Math.random = nativeRandom; }, { once: true });
});

await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
await page.locator('[data-command-view="map"]').click();
const host = page.locator('.r3-terrain-prototype');
await host.waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready');
await page.getByRole('button', { name: 'campaign', exact: true }).click();
await page.waitForTimeout(1200);

const snapshot = async label => page.evaluate(label => {
  const map = window.__r3TerrainMap;
  const host = document.querySelector('.r3-terrain-prototype');
  const canvas = document.querySelector('.r3-terrain-prototype-canvas canvas');
  if (!map || !(canvas instanceof HTMLCanvasElement)) throw new Error('terrain diagnostic API unavailable');
  const centre = map.getCenter();
  const rect = canvas.getBoundingClientRect();
  return {
    label,
    center: [centre.lng, centre.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    terrain: map.getTerrain?.() ?? null,
    lod: host?.getAttribute('data-overlay-lod') ?? null,
    profile: host?.getAttribute('data-terrain-profile') ?? null,
    canvas: { cssWidth: rect.width, cssHeight: rect.height, width: canvas.width, height: canvas.height }
  };
}, label);

const before = await snapshot('before-target');
await page.evaluate(() => { window.__wp2iOriginalMap = window.__r3TerrainMap; });
await page.locator('.r3-terrain-territory-label[data-territory-id="DE-03"]').click({ force: true });
await page.locator('.r3-terrain-territory-label[data-territory-id="DE-03"].selected').waitFor({ state: 'visible', timeout: 10_000 });
await page.getByText('ATTACK ORDER READY', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
await page.waitForTimeout(1400);
const after = await snapshot('after-target');
const sameMapInstance = await page.evaluate(() => window.__r3TerrainMap === window.__wp2iOriginalMap);
const evidence = { before, after, sameMapInstance };
fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
await page.screenshot({ path: `${outputDir}/after-frankfurt-selection.png`, fullPage: true });
console.log('WP2I selection evidence:', JSON.stringify(evidence, null, 2));

const centreDelta = Math.hypot(after.center[0] - before.center[0], after.center[1] - before.center[1]);
if (!sameMapInstance) throw new Error('Selecting Frankfurt remounted the MapLibre instance.');
if (Math.abs(after.zoom - before.zoom) > 0.01 || Math.abs(after.pitch - before.pitch) > 0.1 || Math.abs(after.bearing - before.bearing) > 0.1 || centreDelta > 0.01) {
  throw new Error(`Selecting Frankfurt changed the terrain camera: ${JSON.stringify({ before, after })}`);
}
if (before.terrain && !after.terrain) throw new Error('Selecting Frankfurt disabled physical terrain.');

await browser.close();
