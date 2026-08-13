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
  window.__wp2iMapIdentities = new WeakMap();
  window.__wp2iNextMapIdentity = 1;
});

await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
await page.locator('[data-command-view="map"]').click();
const host = page.locator('.r3-terrain-prototype');
await host.waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready');
await page.locator('.r3-terrain-portal-marker').waitFor({ state: 'attached' });

// Follow the exact natural Day-1 path without seeding game, browser, or MapLibre randomness.
let campaignAttempts = 1;
while (await page.locator('.r3-terrain-portal-marker').getAttribute('data-territory-id') !== 'DE-02') {
  if (campaignAttempts >= 200) throw new Error('No natural Day-1 Düsseldorf portal after 200 fresh campaigns.');
  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'New campaign', exact: true }).click();
  campaignAttempts += 1;
  await page.locator('[data-command-view="map"]').click();
  await page.locator('.r3-terrain-portal-marker').waitFor({ state: 'attached' });
  await page.waitForTimeout(50);
}
await page.getByRole('button', { name: 'campaign', exact: true }).click();
await page.waitForTimeout(1200);

// Install the recorder on the live instance, rather than changing application code.
await page.evaluate(() => {
  const map = window.__r3TerrainMap;
  if (!map) throw new Error('MapLibre diagnostic API unavailable');
  window.__wp2iOriginalMap = map;
  window.__wp2iMapTrace = [];
  const record = (kind, detail = {}) => window.__wp2iMapTrace.push({
    kind,
    at: performance.now(),
    ...detail
  });
  for (const method of ['easeTo', 'jumpTo', 'fitBounds', 'setCenter', 'setZoom', 'setPadding', 'resize']) {
    const original = map[method];
    if (typeof original !== 'function') continue;
    map[method] = function (...args) {
      record('call', {
        method,
        args,
        stack: new Error().stack?.split('\n').slice(1, 6).join('\n') ?? null
      });
      return original.apply(this, args);
    };
  }
  for (const event of ['movestart', 'moveend', 'zoomstart', 'zoomend']) {
    map.on(event, () => record('event', { event }));
  }
});

const snapshot = async label => page.evaluate(label => {
  const map = window.__r3TerrainMap;
  const host = document.querySelector('.r3-terrain-prototype');
  const container = document.querySelector('.r3-terrain-prototype-canvas');
  const canvas = container?.querySelector('canvas');
  if (!map || !(canvas instanceof HTMLCanvasElement)) throw new Error('terrain diagnostic API unavailable');
  const dimensions = element => {
    if (!(element instanceof Element)) return null;
    const rect = element.getBoundingClientRect();
    return { cssWidth: rect.width, cssHeight: rect.height, clientWidth: element.clientWidth, clientHeight: element.clientHeight };
  };
  const visible = element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return !element.hidden && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  };
  const intersects = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
  const contacts = [...document.querySelectorAll('.r3-terrain-enemy-contact')].filter(visible);
  const places = [...document.querySelectorAll('.r3-terrain-territory-label, .r3-terrain-node-marker')].filter(visible);
  const centre = map.getCenter();
  const mapContainer = map.getContainer();
  let identity = window.__wp2iMapIdentities.get(map);
  if (!identity) {
    identity = window.__wp2iNextMapIdentity++;
    window.__wp2iMapIdentities.set(map, identity);
  }
  return {
    label,
    capturedAt: performance.now(),
    mapInstanceIdentity: identity,
    sameMapInstance: map === window.__wp2iOriginalMap,
    center: [centre.lng, centre.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    padding: map.getPadding(),
    terrain: map.getTerrain?.() ?? null,
    lod: host?.getAttribute('data-overlay-lod') ?? null,
    presentationProfile: host?.getAttribute('data-terrain-profile') ?? null,
    terrainRelief: host?.getAttribute('data-terrain-relief') ?? null,
    canvas: { ...dimensions(canvas), backingWidth: canvas.width, backingHeight: canvas.height },
    mapContainer: dimensions(mapContainer),
    terrainContainer: dimensions(container),
    host: dimensions(host),
    selectedTerritory: document.querySelector('.r3-terrain-territory-label.selected')?.getAttribute('data-territory-id') ?? null,
    attackOrderReady: [...document.querySelectorAll('*')].some(element => element.textContent?.trim() === 'ATTACK ORDER READY' && visible(element)),
    enemyPlaceIntersections: contacts.flatMap(contact => places.flatMap(place => intersects(contact.getBoundingClientRect(), place.getBoundingClientRect()) ? [{
      contact: contact.getAttribute('data-r3-marker-id'),
      place: place.getAttribute('data-r3-marker-id')
    }] : [])),
    trace: [...(window.__wp2iMapTrace ?? [])]
  };
}, label);

const before = await snapshot('before-frankfurt-click');
let transitionError = null;
let after;
try {
  await page.locator('.r3-terrain-territory-label[data-territory-id="DE-03"]').click({ force: true });
  await page.waitForFunction(() => (
    document.querySelector('.r3-terrain-territory-label.selected')?.getAttribute('data-territory-id') === 'DE-03'
    && [...document.querySelectorAll('*')].some(element => element.textContent?.trim() === 'ATTACK ORDER READY')
  ));
} catch (error) {
  transitionError = error instanceof Error ? (error.stack ?? error.message) : String(error);
} finally {
  // This is deliberately the first post-transition action: evidence survives every
  // later assertion, render-settling wait, and diagnostic failure.
  after = await snapshot('immediate-after-frankfurt-selection');
  const evidence = { campaignAttempts, naturalPortal: 'DE-02', target: 'DE-03', transitionError, before, after };
  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await page.screenshot({ path: `${outputDir}/after-frankfurt-selection.png`, fullPage: true });
  console.log('WP2I immediate selection evidence:', JSON.stringify(evidence, null, 2));
}

const centreDelta = Math.hypot(after.center[0] - before.center[0], after.center[1] - before.center[1]);
let regressionError = transitionError && `Frankfurt attack-ready transition failed: ${transitionError}`;
if (!regressionError && before.zoom < 4.8) regressionError = `Campaign unexpectedly entered strategic-flat LOD before selection: ${JSON.stringify(before)}`;
if (!regressionError && (!after.sameMapInstance || before.mapInstanceIdentity !== after.mapInstanceIdentity)) regressionError = 'Selecting Frankfurt remounted MapLibre.';
if (!regressionError && (after.selectedTerritory !== 'DE-03' || !after.attackOrderReady)) regressionError = `Attack-ready selection was not reflected: ${JSON.stringify(after)}`;
if (!regressionError && (Math.abs(after.zoom - before.zoom) > 0.01 || Math.abs(after.pitch - before.pitch) > 0.1 || Math.abs(after.bearing - before.bearing) > 0.1 || centreDelta > 0.01)) {
  regressionError = `Selecting Frankfurt changed the terrain camera: ${JSON.stringify({ before, after })}`;
}
if (!regressionError && JSON.stringify(before.terrain) !== JSON.stringify(after.terrain)) regressionError = `Selecting Frankfurt changed physical terrain: ${JSON.stringify({ before: before.terrain, after: after.terrain })}`;
if (!regressionError && after.enemyPlaceIntersections.length) regressionError = `Enemy contacts overlap visible place labels: ${JSON.stringify(after.enemyPlaceIntersections)}`;

await browser.close();
if (regressionError) throw new Error(`${regressionError} Immediate evidence was persisted.`);
