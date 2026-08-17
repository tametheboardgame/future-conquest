import { createRequire } from 'node:module';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { newGame } = require('../.test-dist/engine.js');
const { AUTOSAVE_KEY } = require('../.test-dist/persistence.js');
const { getTerritoryResourceState } = require('../.test-dist/territory-resources.js');

const siteRoot = resolve(process.env.WP5_SITE_ROOT ?? 'dist');
const mount = '/future-conquest';
const port = Number(process.env.WP5_PORT ?? 4185);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.geojson', 'application/geo+json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.mp3', 'audio/mpeg'],
  ['.gltf', 'model/gltf+json'],
  ['.bin', 'application/octet-stream']
]);

function buildScenario() {
  const state = newGame(3, 'standard');
  for (const territoryId of Object.keys(state.territories)) getTerritoryResourceState(state, territoryId);
  const friendlyTerritory = state.taskGroups['TG-1']?.location;
  if (friendlyTerritory && state.territories[friendlyTerritory]) {
    state.territories[friendlyTerritory].resistance = 72;
    state.territories[friendlyTerritory].legitimacy = 43;
  }
  const friendlyIds = Object.keys(state.territories).filter(id => state.territories[id].controller === 'player');
  const hubTerritory = friendlyIds.find(id => state.territoryResources?.[id]);
  if (hubTerritory) state.territoryResources[hubTerritory].hubLevel = 2;
  return state;
}

const scenario = buildScenario();

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (!requestUrl.pathname.startsWith(mount)) {
    response.writeHead(404).end('not found');
    return;
  }
  let relative = decodeURIComponent(requestUrl.pathname.slice(mount.length));
  if (!relative || relative === '/') relative = '/index.html';
  const candidate = resolve(siteRoot, `.${normalize(relative)}`);
  if (!candidate.startsWith(siteRoot)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let file = candidate;
  if ((!existsSync(file) || statSync(file).isDirectory()) && !extname(relative)) file = join(siteRoot, 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404).end(`missing ${relative}`);
    return;
  }
  response.writeHead(200, {
    'content-type': contentTypes.get(extname(file)) ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(file).pipe(response);
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(port, '127.0.0.1', resolveListen);
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'no-preference' });
const consoleEvents = [];
page.on('console', message => consoleEvents.push({ type: message.type(), text: message.text() }));
page.on('pageerror', error => consoleEvents.push({ type: 'pageerror', text: String(error) }));

await page.addInitScript(({ key, raw }) => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  localStorage.setItem('future-conquest-global-settings-v1', JSON.stringify({ muted: true, autosaveEnabled: true, assistanceLevel: 'Off' }));
  localStorage.setItem(key, raw);
}, { key: AUTOSAVE_KEY, raw: JSON.stringify(scenario) });

let evidence;
try {
  await page.goto(`http://127.0.0.1:${port}${mount}/?terrain=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click({ timeout: 30_000 });
  await page.locator('.startup-game-shell').waitFor({ state: 'visible', timeout: 30_000 });

  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'Load Autosave', exact: true }).click({ timeout: 30_000 });
  await page.locator('[data-command-view="map"]').click();

  const terrain = page.locator('.r3-terrain-prototype');
  await terrain.waitFor({ state: 'visible', timeout: 45_000 });
  const strategicControl = page.locator('.r3-strategic-information-control');
  await strategicControl.waitFor({ state: 'visible', timeout: 15_000 });

  // The accepted WP4 headless Chromium evidence also reports map/style/tiles as
  // unsettled while campaign GeoJSON sources settle successfully. Territory
  // features are queryable at this camera; route/node features may legitimately
  // be omitted by querySourceFeatures while their display layers are inactive.
  await page.waitForFunction(() => {
    const map = window.__r3TerrainMap;
    if (!map) return false;
    const sourceIds = ['campaign-territories', 'campaign-strategic-routes', 'campaign-strategic-nodes'];
    if (!sourceIds.every(id => map.getSource(id)?.loaded())) return false;
    const territories = map.querySourceFeatures('campaign-territories');
    return territories.some(feature => Object.prototype.hasOwnProperty.call(feature.properties ?? {}, 'friendly_strength'));
  }, undefined, { timeout: 45_000 });

  const snapshot = async () => page.evaluate(() => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('Terrain map handle is unavailable.');
    const territories = map.querySourceFeatures('campaign-territories');
    const routes = map.querySourceFeatures('campaign-strategic-routes');
    const nodes = map.querySourceFeatures('campaign-strategic-nodes');
    const sources = [
      'r3-wp2b-land',
      'r3-wp2b-terrain-dem',
      'r3-wp2b-hillshade-dem',
      'campaign-territories',
      'campaign-fronts',
      'campaign-strategic-routes',
      'campaign-strategic-nodes'
    ];
    const has = (feature, key) => Object.prototype.hasOwnProperty.call(feature.properties ?? {}, key);
    return {
      settlement: {
        mapLoaded: map.loaded(),
        styleLoaded: map.isStyleLoaded(),
        tilesLoaded: map.areTilesLoaded(),
        sourceLoaded: Object.fromEntries(sources.map(id => [id, map.getSource(id)?.loaded() ?? null]))
      },
      territoryCount: territories.length,
      friendlyMetricCount: territories.filter(feature => Number(feature.properties?.friendly_strength) >= 0).length,
      readinessFieldCount: territories.filter(feature => has(feature, 'friendly_readiness')).length,
      qualityFieldCount: territories.filter(feature => has(feature, 'force_quality')).length,
      threatFieldCount: territories.filter(feature => has(feature, 'threat_estimated_max') && has(feature, 'threat_confidence')).length,
      supplyFieldCount: territories.filter(feature => has(feature, 'supply_ratio') && has(feature, 'supply_condition')).length,
      occupationFieldCount: territories.filter(feature => has(feature, 'resistance') && has(feature, 'garrison_personnel')).length,
      energyResourceFieldCount: territories.filter(feature => has(feature, 'resource_energy')).length,
      knownFriendlyStocks: territories.filter(feature => feature.properties?.controller === 'player' && Number(feature.properties?.stock_food) >= 0).length,
      leakedEnemyStocks: territories.filter(feature => feature.properties?.controller === 'enemy' && Number(feature.properties?.stock_food) >= 0).length,
      queriedRouteFeatures: routes.length,
      queriedNodeFeatures: nodes.length,
      routeSourceLoaded: map.getSource('campaign-strategic-routes')?.loaded() ?? false,
      nodeSourceLoaded: map.getSource('campaign-strategic-nodes')?.loaded() ?? false,
      savedPreference: localStorage.getItem('future-conquest:r3-wp5-strategic-overlay')
    };
  });

  const sourceEvidence = await snapshot();
  if (sourceEvidence.territoryCount < 1 || sourceEvidence.friendlyMetricCount < 1) {
    throw new Error(`Strategic friendly metrics were not projected into the production source: ${JSON.stringify(sourceEvidence)}`);
  }
  if (sourceEvidence.readinessFieldCount < 1 || sourceEvidence.qualityFieldCount < 1 || sourceEvidence.threatFieldCount < 1) {
    throw new Error(`Strategic readiness, quality or assessed-threat fields are incomplete: ${JSON.stringify(sourceEvidence)}`);
  }
  if (sourceEvidence.supplyFieldCount < 1 || !sourceEvidence.routeSourceLoaded || !sourceEvidence.nodeSourceLoaded) {
    throw new Error(`Supply/network source state is incomplete: ${JSON.stringify(sourceEvidence)}`);
  }
  if (sourceEvidence.energyResourceFieldCount < 1 || sourceEvidence.occupationFieldCount < 1) {
    throw new Error(`Resource or occupation source fields are incomplete: ${JSON.stringify(sourceEvidence)}`);
  }
  if (sourceEvidence.knownFriendlyStocks < 1 || sourceEvidence.leakedEnemyStocks !== 0) {
    throw new Error(`Stockpile visibility rule failed: ${JSON.stringify(sourceEvidence)}`);
  }

  const strategicView = page.getByLabel('Strategic view');
  const legend = page.locator('.r3-strategic-information-legend strong');
  const selectAndExpectLegend = async (value, expected) => {
    await strategicView.selectOption(value);
    await legend.getByText(expected, { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  };

  await selectAndExpectLegend('control', 'Political control');
  await selectAndExpectLegend('strength', 'Friendly strength');
  await selectAndExpectLegend('readiness', 'Friendly readiness');
  await selectAndExpectLegend('threat', 'Assessed enemy threat');
  await selectAndExpectLegend('supply', 'Supply and network flow');
  await selectAndExpectLegend('routes', 'Route condition');

  await strategicView.selectOption('resources');
  const resourceSelect = page.getByLabel('Resource');
  await resourceSelect.waitFor({ state: 'visible', timeout: 5_000 });
  await resourceSelect.selectOption('energy');
  await legend.getByText('Energy potential', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });

  await strategicView.selectOption('stockpiles');
  await resourceSelect.selectOption('food');
  await legend.getByText('Food stockpiles', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });

  await selectAndExpectLegend('occupation', 'Occupation and garrison pressure');
  await selectAndExpectLegend('quality', 'Force quality');

  const finalEvidence = await snapshot();
  if (!finalEvidence.savedPreference?.includes('quality')) {
    throw new Error(`Presentation preference did not remain in browser storage: ${JSON.stringify(finalEvidence)}`);
  }

  await page.screenshot({ path: process.env.WP5_SCREENSHOT ?? 'wp5-strategic-information.png', fullPage: true });
  evidence = { sourceEvidence, finalEvidence };
} catch (error) {
  evidence = { probeError: String(error) };
  process.exitCode = 2;
}

console.log(JSON.stringify({ evidence, console: consoleEvents }, null, 2));
await browser.close();
await new Promise(resolveClose => server.close(resolveClose));
