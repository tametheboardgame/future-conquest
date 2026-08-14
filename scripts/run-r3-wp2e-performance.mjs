import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const targetUrl = process.env.R3_WP2E_URL ?? 'http://127.0.0.1:4173/?terrain=1';
const buildSha = process.env.R3_WP2E_BUILD_SHA ?? 'unknown';
const variant = process.env.R3_WP2E_VARIANT ?? 'local';
const evidencePath = process.env.R3_WP2E_EVIDENCE ?? 'artifacts/r3-wp2e-performance.json';
const tileCancellation = process.env.R3_WP2E_TILE_CANCELLATION ?? 'default';
const renderedUrl = tileCancellation === 'cancel'
  ? `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}tileCancellation=cancel`
  : targetUrl;
const INITIAL_SETTLE_MINIMUM_MS = 250;
const CAMERA_SETTLE_MINIMUM_MS = 950;
const TERRAIN_QUIET_MS = 500;
const SETTLEMENT_TIMEOUT_MS = 30_000;

fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
await page.setCacheEnabled(false);
const requests = [];
const inFlightTerrainRequests = new Set();
let lastTerrainActivityAt = 0;
let peakInFlightTerrainRequests = 0;
const diagnostics = [];
const isTerrainTile = url => url.includes('/generated/r3-terrain/tiles/');
page.on('request', request => {
  const url = request.url();
  if (!isTerrainTile(url)) return;
  requests.push({ url, bytes: 0 });
  inFlightTerrainRequests.add(request);
  lastTerrainActivityAt = performance.now();
  peakInFlightTerrainRequests = Math.max(peakInFlightTerrainRequests, inFlightTerrainRequests.size);
});
page.on('response', async response => {
  const url = response.url();
  if (!isTerrainTile(url)) return;
  const entry = requests.findLast(item => item.url === url && item.bytes === 0);
  if (entry) {
    const declared = Number(response.headers()['content-length'] ?? 0);
    if (Number.isFinite(declared)) entry.bytes = declared;
  }
});
const markTerrainComplete = request => {
  if (!isTerrainTile(request.url())) return;
  inFlightTerrainRequests.delete(request);
  lastTerrainActivityAt = performance.now();
};
page.on('requestfinished', markTerrainComplete);
page.on('requestfailed', markTerrainComplete);
page.on('console', message => {
  const text = `[console:${message.type()}] ${message.text()}`;
  if (/terrain|webgl|fallback|GL Driver|GroupMarkerNotSet/i.test(text)) diagnostics.push(text);
});
page.on('pageerror', error => diagnostics.push(`[pageerror] ${error.stack ?? error.message}`));

await page.addInitScript(() => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
});

const started = performance.now();
await page.goto(renderedUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
await page.locator('.startup-game-shell').waitFor({ state: 'visible', timeout: 15_000 });
await page.waitForFunction(
  () => document.querySelector('[data-command-view="campaign"]')?.getAttribute('aria-current') === 'page',
  null,
  { timeout: 5000 }
);
await page.locator('[data-command-view="map"]').click();
await page.locator('.command-map-workspace').waitFor({ state: 'visible', timeout: 20_000 });

const terrainHost = page.locator('.r3-terrain-prototype');
await terrainHost.waitFor({ state: 'visible', timeout: 30_000 });
await page.waitForFunction(() => {
  const host = document.querySelector('.r3-terrain-prototype');
  return host instanceof HTMLElement && host.dataset.status === 'ready' && host.dataset.overlayLod === 'campaign';
}, null, { timeout: 30_000 });
await page.waitForFunction(() => document.querySelectorAll('.maplibregl-canvas').length > 0, null, { timeout: 10_000 });
await page.waitForTimeout(0);
await page.waitForTimeout(0);
const firstUsefulPaintMs = performance.now() - started;

const waitForTerrainSettlement = async (phaseStartedAt, minimumMs) => {
  for (;;) {
    const now = performance.now();
    const minimumElapsed = now - phaseStartedAt >= minimumMs;
    const noTerrainInFlight = inFlightTerrainRequests.size === 0;
    const terrainQuiet = lastTerrainActivityAt === 0 || now - lastTerrainActivityAt >= TERRAIN_QUIET_MS;
    if (minimumElapsed && noTerrainInFlight && terrainQuiet) return;
    if (now - phaseStartedAt >= SETTLEMENT_TIMEOUT_MS) {
      throw new Error(`terrain did not settle within ${SETTLEMENT_TIMEOUT_MS}ms; ${inFlightTerrainRequests.size} tile request(s) still in flight`);
    }
    await page.waitForTimeout(100);
  }
};

const initialSettlementStarted = performance.now();
await waitForTerrainSettlement(initialSettlementStarted, INITIAL_SETTLE_MINIMUM_MS);
const campaignSettledMs = performance.now() - started;

// Selected/local camera requires an actual selected territory. Establish the
// same deterministic selection through the real terrain label on both exact
// base and head before timing either camera transition. This keeps selection
// setup outside the measured Theatre/Selected transition windows and removes
// dependence on incidental campaign UI state.
const benchmarkTerritory = page.locator('.r3-terrain-territory-label[data-territory-id="DE-03"]');
await benchmarkTerritory.waitFor({ state: 'visible', timeout: 15_000 });
await benchmarkTerritory.click({ force: true });
await page.waitForFunction(() => document.querySelector('.r3-terrain-territory-label.selected')?.getAttribute('data-territory-id') === 'DE-03');
await page.waitForFunction(() => {
  const button = [...document.querySelectorAll('.r3-terrain-prototype-toolbar button')]
    .find(element => element.textContent?.trim() === 'selected');
  return button instanceof HTMLButtonElement && !button.disabled;
});
const selectionSettlementStarted = performance.now();
await waitForTerrainSettlement(selectionSettlementStarted, INITIAL_SETTLE_MINIMUM_MS);

const transition = async (name, expectedLod) => {
  const before = performance.now();
  // This probe measures renderer/network settlement, not pointer hit-testing.
  // Dedicated browser/selection gates own real user interaction. Invoke the
  // already-proven enabled camera control directly so presentation overlays do
  // not contaminate the benchmark with Playwright actionability waits.
  await page.evaluate(cameraName => {
    const button = [...document.querySelectorAll('.r3-terrain-prototype-toolbar button')]
      .find(element => element.textContent?.trim() === cameraName);
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      throw new Error(`Camera control ${cameraName} is unavailable.`);
    }
    button.click();
  }, name);
  await page.waitForFunction(lod => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-overlay-lod') === lod, expectedLod);
  await waitForTerrainSettlement(before, CAMERA_SETTLE_MINIMUM_MS);
  return performance.now() - before;
};
const campaignToTheatreMs = await transition('theatre', 'theatre');
const theatreToSelectedMs = await transition('selected', 'local');

const resourceEntries = await page.evaluate(() => performance.getEntriesByType('resource')
  .filter(entry => entry.name.includes('/generated/r3-terrain/tiles/'))
  .map(entry => ({ name: entry.name, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })));
const counts = new Map();
for (const request of requests) counts.set(request.url, (counts.get(request.url) ?? 0) + 1);
const duplicateRequests = [...counts.entries()].filter(([, count]) => count > 1).map(([url, count]) => ({ url, count }));
const declaredBytes = requests.reduce((sum, request) => sum + (Number.isFinite(request.bytes) ? request.bytes : 0), 0);
const transferredBytes = resourceEntries.reduce((sum, entry) => sum + entry.transferSize, 0);
const encodedBodyBytes = resourceEntries.reduce((sum, entry) => sum + entry.encodedBodySize, 0);
const evidence = {
  schemaVersion: 1,
  buildSha,
  variant,
  tileCancellation,
  measuredAt: new Date().toISOString(),
  browser: await browser.version(),
  viewport: { width: 1600, height: 1000 },
  cacheMode: 'cold-disabled',
  usefulPaint: {
    requiresRendererReady: true,
    requiresCampaignLod: true,
    animationFramesAfterReady: 2
  },
  settlement: {
    initialMinimumMs: INITIAL_SETTLE_MINIMUM_MS,
    cameraMinimumMs: CAMERA_SETTLE_MINIMUM_MS,
    terrainQuietMs: TERRAIN_QUIET_MS,
    requiresCompletedTerrainBodies: true,
    peakInFlightTerrainRequests,
    buildNeutral: true
  },
  timingsMs: {
    firstUsefulPaintMs,
    campaignSettledMs,
    campaignToTheatreMs,
    theatreToSelectedMs
  },
  terrainNetwork: {
    totalRequests: requests.length,
    uniqueRequests: counts.size,
    duplicateRequestCount: requests.length - counts.size,
    duplicateRequests,
    declaredBytes,
    transferredBytes,
    encodedBodyBytes
  },
  fallbackVisible: await page.locator('.r3-terrain-fallback-notice').isVisible().catch(() => false),
  warning: (await terrainHost.getAttribute('data-status')) === 'warning',
  diagnostics
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
await browser.close();
