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
  await page.waitForFunction(() => {
    const host = document.querySelector('.r3-terrain-prototype');
    return host?.getAttribute('data-status') === 'ready' && Boolean(window.__r3TerrainMap?.isStyleLoaded());
  }, undefined, { timeout: 60_000 });

  const strategicControl = page.locator('.r3-strategic-information-control');
  await strategicControl.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__r3TerrainMap?.getLayer('r3-wp5-strategic-territory-overlay')), undefined, { timeout: 15_000 });

  const strategicView = page.getByLabel('Strategic view');
  const snapshot = async () => page.evaluate(() => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('Terrain map handle is unavailable.');
    const territories = map.querySourceFeatures('campaign-territories');
    const routes = map.querySourceFeatures('campaign-strategic-routes');
    return {
      territoryVisibility: map.getLayoutProperty('r3-wp5-strategic-territory-overlay', 'visibility'),
      routeVisibility: map.getLayoutProperty('r3-wp5-strategic-route-overlay', 'visibility'),
      hubVisibility: map.getLayoutProperty('r3-wp5-strategic-hub-overlay', 'visibility'),
      territoryCount: territories.length,
      friendlyMetricCount: territories.filter(feature => Number(feature.properties?.friendly_strength) >= 0).length,
      threatMetricCount: territories.filter(feature => Number(feature.properties?.threat_estimated_max) > 0).length,
      knownFriendlyStocks: territories.filter(feature => feature.properties?.controller === 'player' && Number(feature.properties?.stock_food) >= 0).length,
      leakedEnemyStocks: territories.filter(feature => feature.properties?.controller === 'enemy' && Number(feature.properties?.stock_food) >= 0).length,
      routeFlowFields: routes.filter(feature => Number.isFinite(Number(feature.properties?.flow_utilisation))).length,
      savedPreference: localStorage.getItem('future-conquest:r3-wp5-strategic-overlay')
    };
  });

  await strategicView.selectOption('strength');
  await page.waitForTimeout(200);
  const strength = await snapshot();
  if (strength.territoryVisibility !== 'visible' || strength.friendlyMetricCount < 1) {
    throw new Error(`Friendly strength layer did not expose authoritative friendly metrics: ${JSON.stringify(strength)}`);
  }

  await strategicView.selectOption('threat');
  await page.waitForTimeout(200);
  const threat = await snapshot();
  if (threat.territoryVisibility !== 'visible') throw new Error(`Threat layer is not visible: ${JSON.stringify(threat)}`);

  await strategicView.selectOption('supply');
  await page.waitForTimeout(200);
  const supply = await snapshot();
  if (supply.territoryVisibility !== 'visible' || supply.routeVisibility !== 'visible' || supply.routeFlowFields < 1) {
    throw new Error(`Supply/network layer is incomplete: ${JSON.stringify(supply)}`);
  }

  await strategicView.selectOption('routes');
  await page.waitForTimeout(200);
  const routes = await snapshot();
  if (routes.territoryVisibility !== 'none' || routes.routeVisibility !== 'visible') {
    throw new Error(`Route condition layer did not isolate route presentation: ${JSON.stringify(routes)}`);
  }

  await strategicView.selectOption('resources');
  const resourceSelect = page.getByLabel('Resource');
  await resourceSelect.waitFor({ state: 'visible', timeout: 5_000 });
  await resourceSelect.selectOption('energy');
  await page.waitForTimeout(200);
  const resources = await snapshot();
  if (resources.territoryVisibility !== 'visible' || resources.hubVisibility !== 'visible') {
    throw new Error(`Resource layer did not expose territory potential and hubs: ${JSON.stringify(resources)}`);
  }

  await strategicView.selectOption('stockpiles');
  await resourceSelect.selectOption('food');
  await page.waitForTimeout(200);
  const stockpiles = await snapshot();
  if (stockpiles.knownFriendlyStocks < 1 || stockpiles.leakedEnemyStocks !== 0) {
    throw new Error(`Stockpile visibility rule failed: ${JSON.stringify(stockpiles)}`);
  }

  await strategicView.selectOption('occupation');
  await page.getByText('Occupation and garrison pressure', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForTimeout(200);
  const occupation = await snapshot();
  if (!occupation.savedPreference?.includes('occupation')) {
    throw new Error(`Presentation preference did not remain in browser storage: ${JSON.stringify(occupation)}`);
  }

  await strategicView.selectOption('quality');
  await page.waitForTimeout(200);
  const quality = await snapshot();
  if (quality.territoryVisibility !== 'visible' || quality.friendlyMetricCount < 1) {
    throw new Error(`Force quality layer did not remain linked to friendly state: ${JSON.stringify(quality)}`);
  }

  await page.screenshot({ path: process.env.WP5_SCREENSHOT ?? 'wp5-strategic-information.png', fullPage: true });
  evidence = { strength, threat, supply, routes, resources, stockpiles, occupation, quality };
} catch (error) {
  evidence = { probeError: String(error) };
  process.exitCode = 2;
}

console.log(JSON.stringify({ evidence, console: consoleEvents }, null, 2));
await browser.close();
await new Promise(resolveClose => server.close(resolveClose));
