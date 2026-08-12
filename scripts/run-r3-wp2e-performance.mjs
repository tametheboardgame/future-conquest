import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const origin = process.env.R3_WP2E_ORIGIN ?? 'http://127.0.0.1:4173';
const output = process.env.R3_WP2E_EVIDENCE ?? 'artifacts/r3-wp2e-performance.json';
// Do not use GITHUB_SHA here: pull_request workflows set it to GitHub's
// synthetic merge commit unless every caller remembers to override it.
const buildSha = process.env.R3_WP2E_BUILD_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const variant = process.env.R3_WP2E_VARIANT ?? 'local';
const tileCancellation = process.env.R3_WP2E_TILE_CANCELLATION ?? 'default';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const session = await context.newCDPSession(page);
await session.send('Network.enable');
await session.send('Network.setCacheDisabled', { cacheDisabled: true });

const requests = [];
let lastTerrainResponseAt = 0;
page.on('response', response => {
  if (!response.url().includes('/generated/r3-terrain/tiles/')) return;
  requests.push({
    url: response.url(),
    status: response.status(),
    bytes: Number(response.headers()['content-length'] ?? 0)
  });
  lastTerrainResponseAt = performance.now();
});
page.on('requestfailed', request => {
  if (request.url().includes('/generated/r3-terrain/')) {
    throw new Error(`terrain request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`);
  }
});
await page.addInitScript(() => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
});

const started = performance.now();
const query = tileCancellation === 'retain' ? '?terrain=1&tileCancellation=retain' : '?terrain=1';
await page.goto(`${origin}/${query}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
await page.locator('.startup-game-shell').waitFor({ state: 'visible', timeout: 15_000 });
await page.locator('[data-command-view="map"]').click();
await page.locator('.r3-terrain-prototype-canvas canvas').waitFor({ state: 'visible', timeout: 45_000 });
const firstUsefulPaintMs = performance.now() - started;
await page.locator('.r3-terrain-prototype[data-status="ready"], .r3-terrain-prototype[data-status="warning"]').waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-overlay-lod') === 'campaign');
const waitForTerrainSettlement = async (after = 0) => {
  await page.waitForFunction(afterTimestamp => {
    const host = document.querySelector('.r3-terrain-prototype');
    const idleAt = Number(host?.getAttribute('data-map-idle-at') ?? 0);
    return host?.getAttribute('data-map-moving') !== 'true' && idleAt >= afterTimestamp;
  }, after, { timeout: 30_000 });
  while (performance.now() - lastTerrainResponseAt < 500) await page.waitForTimeout(100);
};
await waitForTerrainSettlement();
const campaignSettledMs = performance.now() - started;

const transition = async (name, expectedLod) => {
  const before = performance.now();
  await page.locator('.r3-terrain-prototype-toolbar button', { hasText: name }).click();
  await page.waitForFunction(lod => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-overlay-lod') === lod, expectedLod);
  await waitForTerrainSettlement(before);
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
  timingsMs: { firstUsefulPaintMs, campaignSettledMs, campaignToTheatreMs, theatreToSelectedMs },
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
  warning: await page.locator('.r3-terrain-prototype').getAttribute('data-status') === 'warning'
};
if (evidence.fallbackVisible) throw new Error('terrain fell back during WP2E performance gate');
fs.mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
fs.mkdirSync(output.slice(0, output.lastIndexOf('/')) || '.', { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
await browser.close();
