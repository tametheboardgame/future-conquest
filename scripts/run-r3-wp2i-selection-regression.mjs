import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP2I_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP2I_ARTIFACTS ?? 'artifacts/r3-wp2i-selection';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });

await context.addInitScript(() => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  window.__wp2iResizeEvents = [];
  window.__wp2iMapIdentities = new WeakMap();
  window.__wp2iNextMapIdentity = 1;
  window.addEventListener('resize', () => window.__wp2iResizeEvents.push({ width: innerWidth, height: innerHeight, at: performance.now() }));
});

let page;
let campaignAttempts = 0;
for (; campaignAttempts < 90; campaignAttempts += 1) {
  page = await context.newPage();
  page.on('console', message => console.log(`[browser console ${message.type()}] ${message.text()}`));
  page.on('pageerror', error => console.log(`[browser pageerror] ${error.stack ?? error.message}`));
  await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
  const campaignStatus = await page.locator('.campaign-status-card').innerText();
  const seed = Number(campaignStatus.match(/Seed (\d+)/)?.[1]);
  // DE-02 is index 9 in the authoritative SLICE_IDS portal rotation.
  if (Number.isFinite(seed) && seed % 15 === 9) break;
  await page.close();
  page = undefined;
}
if (!page) throw new Error('Could not obtain a natural fresh Day-1 Düsseldorf campaign in 90 attempts.');
await page.evaluate(attempts => { window.__wp2iCampaignAttempts = attempts + 1; }, campaignAttempts);
await page.locator('[data-command-view="map"]').click();
const host = page.locator('.r3-terrain-prototype');
await host.waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready');
await page.getByRole('button', { name: 'campaign', exact: true }).click();
await page.waitForTimeout(1200);

await page.evaluate(() => {
  const map = window.__r3TerrainMap;
  window.__wp2iCameraTrace = [];
  const record = (kind, detail = {}) => window.__wp2iCameraTrace.push({ kind, at: performance.now(), ...detail });
  for (const method of ['easeTo', 'jumpTo', 'fitBounds', 'setCenter', 'setZoom', 'setPadding', 'resize']) {
    const original = map[method].bind(map);
    map[method] = (...args) => {
      record(`call:${method}`, { args, stack: new Error().stack });
      return original(...args);
    };
  }
  for (const eventName of ['zoomstart', 'zoomend', 'movestart', 'moveend', 'resize']) {
    map.on(eventName, event => record(`event:${eventName}`, { originalEventType: event.originalEvent?.type ?? null }));
  }
});

const snapshot = async label => page.evaluate(label => {
  const map = window.__r3TerrainMap;
  const host = document.querySelector('.r3-terrain-prototype');
  const canvas = document.querySelector('.r3-terrain-prototype-canvas canvas');
  if (!map || !(canvas instanceof HTMLCanvasElement)) throw new Error('terrain diagnostic API unavailable');
  const centre = map.getCenter();
  const rect = canvas.getBoundingClientRect();
  const mapRect = host?.getBoundingClientRect();
  return {
    label,
    mapInstanceIdentity: (() => {
      let identity = window.__wp2iMapIdentities.get(map);
      if (!identity) {
        identity = window.__wp2iNextMapIdentity++;
        window.__wp2iMapIdentities.set(map, identity);
      }
      return identity;
    })(),
    center: [centre.lng, centre.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    padding: map.getPadding(),
    terrain: map.getTerrain?.() ?? null,
    lod: host?.getAttribute('data-overlay-lod') ?? null,
    profile: host?.getAttribute('data-terrain-profile') ?? null,
    canvas: { cssWidth: rect.width, cssHeight: rect.height, width: canvas.width, height: canvas.height },
    mapFrame: mapRect ? { x: mapRect.x, y: mapRect.y, width: mapRect.width, height: mapRect.height } : null,
    windowSize: { width: innerWidth, height: innerHeight },
    resizeEvents: [...(window.__wp2iResizeEvents ?? [])]
  };
}, label);

const before = await snapshot('before-target');
await page.evaluate(() => { window.__wp2iOriginalMap = window.__r3TerrainMap; });
await page.locator('.r3-terrain-territory-label[data-territory-id="DE-03"]').click({ force: true });
await page.waitForFunction(() => document.querySelector('.r3-terrain-territory-label.selected')?.getAttribute('data-territory-id') === 'DE-03');
await page.getByText('ATTACK ORDER READY', { exact: true }).waitFor({ state: 'visible' });
await page.waitForTimeout(1400);
const after = await snapshot('after-target');
const diagnostics = await page.evaluate(() => {
  const visible = element => !element.hidden && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none';
  const intersects = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
  const contacts = [...document.querySelectorAll('.r3-terrain-enemy-contact')].filter(visible);
  const placeLabels = [...document.querySelectorAll('.r3-terrain-territory-label, .r3-terrain-node-marker')].filter(visible);
  return {
    sameMapInstance: window.__r3TerrainMap === window.__wp2iOriginalMap,
    selectedTerritory: document.querySelector('.r3-terrain-territory-label.selected')?.getAttribute('data-territory-id') ?? null,
    campaignAttempts: window.__wp2iCampaignAttempts,
    cameraTrace: [...(window.__wp2iCameraTrace ?? [])],
    enemyPlaceIntersections: contacts.flatMap(contact => placeLabels.flatMap(place => intersects(contact.getBoundingClientRect(), place.getBoundingClientRect()) ? [{
      contact: contact.getAttribute('data-r3-marker-id'),
      place: place.getAttribute('data-r3-marker-id')
    }] : []))
  };
});
const evidence = { before, after, diagnostics };
fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
await page.screenshot({ path: `${outputDir}/after-frankfurt-selection.png`, fullPage: true });
console.log('WP2I selection evidence:', JSON.stringify(evidence, null, 2));

const centreDelta = Math.hypot(after.center[0] - before.center[0], after.center[1] - before.center[1]);
if (!diagnostics.sameMapInstance) throw new Error('Selecting Frankfurt remounted the MapLibre instance.');
if (before.mapInstanceIdentity !== after.mapInstanceIdentity) throw new Error('Selecting Frankfurt changed the recorded MapLibre instance identity.');
if (Math.abs(after.zoom - before.zoom) > 0.01 || Math.abs(after.pitch - before.pitch) > 0.1 || Math.abs(after.bearing - before.bearing) > 0.1 || centreDelta > 0.01) {
  throw new Error(`Selecting Frankfurt changed the terrain camera: ${JSON.stringify({ before, after })}`);
}
if (JSON.stringify(before.terrain) !== JSON.stringify(after.terrain)) throw new Error(`Selecting Frankfurt changed physical terrain: ${JSON.stringify({ before: before.terrain, after: after.terrain })}`);
if (diagnostics.enemyPlaceIntersections.length) throw new Error(`Enemy contacts overlap visible place labels: ${JSON.stringify(diagnostics.enemyPlaceIntersections)}`);

await browser.close();
