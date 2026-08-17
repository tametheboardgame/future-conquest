import { createRequire } from 'node:module';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { beginOperation, newGame } = require('../.test-dist/engine.js');
const { AUTOSAVE_KEY } = require('../.test-dist/persistence.js');

const siteRoot = resolve(process.env.WP4_SITE_ROOT ?? 'dist');
const mount = '/future-conquest';
const port = Number(process.env.WP4_PORT ?? 4184);
const targetTerritory = 'FR-01';
const groupId = 'TG-1';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.mp3', 'audio/mpeg']
]);

function buildScenario() {
  let state = newGame(2, 'standard');
  for (const defender of Object.values(state.enemyFormations)) {
    if (defender.location !== targetTerritory) continue;
    defender.personnel = 1;
    defender.armour = 0;
    defender.readiness = 15;
    defender.entrenchment = 0;
  }
  state.selectedTaskGroupId = groupId;
  state.selectedTerritory = targetTerritory;
  state.targetTerritory = targetTerritory;
  state = beginOperation(state);
  if (state.taskGroups[groupId]?.order?.type !== 'attack') {
    throw new Error('WP4 browser fixture failed to create an active attack.');
  }
  if (!Object.values(state.operations).some(operation => operation.target === targetTerritory)) {
    throw new Error('WP4 browser fixture has no authoritative active operation.');
  }
  return state;
}

const scenario = buildScenario();
const startTurn = scenario.turn;

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
  await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready', undefined, { timeout: 45_000 });
  await page.locator('.r3-wp4-active-attack').first().waitFor({ state: 'attached', timeout: 15_000 });

  const active = await page.evaluate(() => {
    const overlay = document.querySelector('.r3-wp4-battle-events');
    const attack = overlay?.querySelector('.r3-wp4-active-attack');
    const line = attack?.querySelector('.r3-wp4-attack-direction');
    const chevron = attack?.querySelector('.r3-wp4-attack-chevron');
    const target = attack?.querySelector('.r3-wp4-attack-target');
    return {
      overlayCount: document.querySelectorAll('.r3-wp4-battle-events').length,
      attackCount: overlay?.querySelectorAll('.r3-wp4-active-attack').length ?? 0,
      movementRouteCount: document.querySelectorAll('.r3-wp3-movement-route').length,
      pointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : null,
      lineStroke: line?.getAttribute('stroke') ?? null,
      lineDash: line?.getAttribute('stroke-dasharray') ?? null,
      chevron: Boolean(chevron),
      target: Boolean(target)
    };
  });

  if (active.overlayCount !== 1 || active.attackCount < 1) throw new Error(`Active WP4 overlay missing: ${JSON.stringify(active)}`);
  if (active.pointerEvents !== 'none') throw new Error('WP4 overlay captures pointer input.');
  if (active.lineStroke !== '#ff7a2f' || active.lineDash !== null || !active.chevron || !active.target) {
    throw new Error(`Combat direction did not retain distinct WP4 semantics: ${JSON.stringify(active)}`);
  }
  await page.screenshot({ path: process.env.WP4_ACTIVE_SCREENSHOT ?? 'wp4-active-attack.png', fullPage: true });

  await page.locator('.r3-terrain-layer-control summary').click();
  const operationsToggle = page.getByLabel('Operations, threats and fronts', { exact: true });
  await operationsToggle.uncheck();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.r3-wp4-battle-events')).display === 'none');
  await operationsToggle.check();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.r3-wp4-battle-events')).display !== 'none');

  await page.locator('.global-resolve').click();
  await page.locator('.r3-movement-resolution-lock').waitFor({ state: 'detached', timeout: 7_000 }).catch(() => {});
  await page.waitForFunction(({ turn, territoryId }) => {
    const currentTurn = Number(document.querySelector('.turn-block strong')?.textContent?.trim());
    const recent = document.querySelector('.r3-wp4-recent-victory, .r3-wp4-recent-capture');
    const territory = document.querySelector(`.r3-terrain-territory-label[data-territory-id="${territoryId}"]`);
    return currentTurn === turn + 1 && Boolean(recent) && territory?.classList.contains('player');
  }, { turn: startTurn, territoryId: targetTerritory }, { timeout: 15_000 });

  const recent = await page.evaluate(territoryId => ({
    activeAttackCount: document.querySelectorAll('.r3-wp4-active-attack').length,
    victoryCount: document.querySelectorAll('.r3-wp4-recent-victory, .r3-wp4-recent-capture').length,
    lossCount: document.querySelectorAll('.r3-wp4-recent-territory-lost').length,
    frontShiftCount: document.querySelectorAll('.r3-wp4-front-shift').length,
    targetClass: document.querySelector(`.r3-terrain-territory-label[data-territory-id="${territoryId}"]`)?.getAttribute('class') ?? null,
    turn: Number(document.querySelector('.turn-block strong')?.textContent?.trim())
  }), targetTerritory);

  if (recent.turn !== startTurn + 1) throw new Error(`Expected battle resolution on day ${startTurn + 1}, saw ${recent.turn}.`);
  if (recent.activeAttackCount !== 0) throw new Error(`Active attack cue survived concluded operation: ${JSON.stringify(recent)}`);
  if (recent.victoryCount < 1) throw new Error(`Recent victory/capture acknowledgement missing: ${JSON.stringify(recent)}`);
  if (recent.frontShiftCount < 1) throw new Error(`Recent capture did not emphasise a current adjacent front: ${JSON.stringify(recent)}`);
  if (!recent.targetClass?.includes('player')) throw new Error(`Captured territory did not reveal player control: ${JSON.stringify(recent)}`);

  await page.screenshot({ path: process.env.WP4_RECENT_SCREENSHOT ?? 'wp4-recent-victory.png', fullPage: true });
  evidence = { startTurn, active, recent };
} catch (error) {
  evidence = { probeError: String(error) };
  process.exitCode = 2;
}

console.log(JSON.stringify({ evidence, console: consoleEvents }, null, 2));
await browser.close();
await new Promise(resolveClose => server.close(resolveClose));
