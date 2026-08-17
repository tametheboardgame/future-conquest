import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP39C_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP39C_ARTIFACTS ?? 'artifacts/r3-wp3-9c';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function newCampaignPage({ terrain = true, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion });
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
    sessionStorage.removeItem('future-conquest:r3-wp39c-arrival-played');

    const mapIds = new WeakMap();
    let nextMapId = 1;
    const trace = [];
    let lastSignature = '';

    window.__r3ProbeSnapshot = () => {
      const terrainStatus = document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') ?? null;
      const formationStatus = document.querySelector('[data-physical-formations]')?.getAttribute('data-physical-formations') ?? null;
      const map = window.__r3TerrainMap;
      const miniatures = window.__r3FormationMiniatures;
      const targets = window.__r3FormationPortalTargets;
      const arrival = window.__r3PortalArrival;
      const overlay = document.querySelector('.r3-portal-arrival');
      const selectedCommandView = document.querySelector('[data-command-view][aria-current="page"]')?.getAttribute('data-command-view') ?? null;
      const commandView = selectedCommandView ?? (document.querySelector('.command-map-workspace') ? 'map' : null);

      let mapId = null;
      let mapConnected = false;
      let mapRect = null;
      if (map) {
        if (!mapIds.has(map)) mapIds.set(map, nextMapId++);
        mapId = mapIds.get(map);
        try {
          const container = map.getContainer();
          mapConnected = Boolean(container?.isConnected);
          const rect = container?.getBoundingClientRect();
          if (rect) mapRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        } catch {
          mapConnected = false;
        }
      }

      const overlayRect = overlay?.getBoundingClientRect();
      const overlayStyle = overlay ? getComputedStyle(overlay) : null;
      const rendererPieces = miniatures?.pieces ?? [];
      const expectedPieces = targets?.pieces ?? rendererPieces;
      let maxAnchorDeltaPx = null;
      let deltas = [];
      if (arrival && map && mapConnected && mapRect && expectedPieces.length) {
        try {
          const expected = expectedPieces.map(piece => {
            const point = map.project([piece.target[0], piece.target[1]]);
            return { id: piece.id, x: mapRect.left + point.x, y: mapRect.top + point.y };
          });
          deltas = arrival.formations.flatMap(actual => {
            const target = expected.find(item => item.id === actual.id);
            return target ? [{ id: actual.id, distance: Math.hypot(actual.x - target.x, actual.y - target.y) }] : [];
          });
          maxAnchorDeltaPx = deltas.length ? deltas.reduce((max, item) => Math.max(max, item.distance), 0) : null;
        } catch {
          maxAnchorDeltaPx = null;
          deltas = [];
        }
      }

      return {
        t: Math.round(performance.now()),
        terrainStatus,
        formationStatus,
        commandView,
        mapPresent: Boolean(map),
        mapId,
        mapConnected,
        rendererPresent: Boolean(miniatures),
        rendererFormationCount: rendererPieces.length,
        rendererVisibleCount: rendererPieces.filter(piece => piece.visible).length,
        presentationWithheld: miniatures?.presentationWithheld ?? null,
        targetFormationCount: expectedPieces.length,
        arrivalPresent: Boolean(arrival),
        active: Boolean(arrival?.active),
        phase: arrival?.phase ?? null,
        reducedMotion: arrival?.reducedMotion ?? null,
        portalTerritory: arrival?.portalTerritory ?? null,
        formationCount: arrival?.formations.length ?? 0,
        overlayPresent: Boolean(overlay),
        overlayConnected: Boolean(overlay?.isConnected),
        overlayWidth: overlayRect?.width ?? 0,
        overlayHeight: overlayRect?.height ?? 0,
        overlayDisplay: overlayStyle?.display ?? null,
        overlayVisibility: overlayStyle?.visibility ?? null,
        domWithheld: document.documentElement.dataset.r3WithholdFormations === 'true',
        maxAnchorDeltaPx,
        deltas
      };
    };

    window.__r3ProbeTrace = trace;
    window.setInterval(() => {
      const snapshot = window.__r3ProbeSnapshot();
      const signature = JSON.stringify({ ...snapshot, t: 0, deltas: [] });
      if (signature === lastSignature) return;
      lastSignature = signature;
      trace.push(snapshot);
      if (trace.length > 120) trace.splice(0, trace.length - 120);
    }, 20);
  });
  await page.goto(`${origin}/?terrain=${terrain ? '1' : '0'}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
  return page;
}

async function lifecycleDiagnostic(page) {
  return page.evaluate(() => ({
    current: window.__r3ProbeSnapshot?.() ?? null,
    trace: window.__r3ProbeTrace?.slice(-50) ?? []
  }));
}

async function waitForArrival(page, timeout = 60000, requireWithheldOpening = true) {
  try {
    const handle = await page.waitForFunction((requireOpening) => {
      const snapshot = window.__r3ProbeSnapshot?.();
      if (!snapshot) return false;
      const stableTerrain = snapshot.terrainStatus === 'ready' || snapshot.terrainStatus === 'warning';
      const visibleOverlay = snapshot.overlayPresent
        && snapshot.overlayConnected
        && snapshot.overlayWidth > 0
        && snapshot.overlayHeight > 0
        && snapshot.overlayDisplay !== 'none'
        && snapshot.overlayVisibility !== 'hidden';
      const openingCorrect = !requireOpening || (
        snapshot.phase === 'opening'
        && snapshot.domWithheld === true
        && snapshot.presentationWithheld === true
        && snapshot.rendererVisibleCount === 0
      );
      return stableTerrain
        && snapshot.mapConnected
        && snapshot.rendererFormationCount > 0
        && snapshot.active
        && visibleOverlay
        && openingCorrect
        ? snapshot
        : false;
    }, requireWithheldOpening, { timeout, polling: 'raf' });
    return await handle.jsonValue();
  } catch (error) {
    const diagnostic = await lifecycleDiagnostic(page);
    throw new Error(`${error.message}\nR3 WP3.9C lifecycle diagnostic:\n${JSON.stringify(diagnostic, null, 2)}`);
  }
}

async function waitForMaterialising(page, timeout = 5000) {
  try {
    const handle = await page.waitForFunction(() => {
      const snapshot = window.__r3ProbeSnapshot?.();
      if (!snapshot) return false;
      return snapshot.phase === 'materialising'
        && snapshot.rendererFormationCount > 0
        && snapshot.rendererVisibleCount === snapshot.rendererFormationCount
        && snapshot.presentationWithheld === false
        && snapshot.domWithheld === false
        ? snapshot
        : false;
    }, null, { timeout, polling: 'raf' });
    return await handle.jsonValue();
  } catch (error) {
    const diagnostic = await lifecycleDiagnostic(page);
    throw new Error(`${error.message}\nR3 WP3.9C materialisation diagnostic:\n${JSON.stringify(diagnostic, null, 2)}`);
  }
}

async function assertNoReplayAfterNavigation(page) {
  await page.locator('[data-command-view="forces"]').click();
  await page.locator('.forces-view').waitFor({ state: 'visible' });
  await page.locator('[data-command-view="map"]').click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  await page.waitForTimeout(650);
  if (await page.locator('.r3-portal-arrival').count()) throw new Error('arrival replayed after ordinary command-view navigation');
}

try {
  const page = await newCampaignPage();
  const opening = await waitForArrival(page);

  if (opening.reducedMotion) throw new Error('normal-motion probe unexpectedly entered reduced-motion mode');
  if (!['ready', 'warning'].includes(opening.terrainStatus) || !opening.mapConnected || !opening.overlayConnected) throw new Error('portal opened before the terrain renderer and portal DOM were stable');
  if (opening.rendererFormationCount === 0) throw new Error('portal opened before the physical formation renderer produced pieces');
  if (opening.formationCount !== opening.rendererFormationCount) throw new Error(`arrival formation count mismatch (${opening.formationCount}/${opening.rendererFormationCount})`);
  if (!opening.domWithheld) throw new Error('formation withholding was not active during portal opening');
  if (opening.presentationWithheld !== true) throw new Error('physical formation renderer did not report portal withholding during opening');
  if (opening.rendererVisibleCount !== 0) throw new Error(`${opening.rendererVisibleCount} formations were visible before materialisation`);
  if (opening.maxAnchorDeltaPx === null || opening.maxAnchorDeltaPx > 1.25) throw new Error(`arrival anchors diverged from renderer targets by ${opening.maxAnchorDeltaPx ?? 'unknown'}px`);
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/portal-opening.png` });

  const materialising = await waitForMaterialising(page);
  if (materialising.rendererVisibleCount !== materialising.rendererFormationCount) {
    throw new Error(`only ${materialising.rendererVisibleCount}/${materialising.rendererFormationCount} formations were visible at materialisation`);
  }
  if (materialising.maxAnchorDeltaPx === null || materialising.maxAnchorDeltaPx > 1.25) throw new Error(`materialisation anchors diverged by ${materialising.maxAnchorDeltaPx ?? 'unknown'}px`);
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/formations-materialising.png` });

  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 6000 });
  if (await page.evaluate(() => Boolean(window.__r3PortalArrival))) throw new Error('arrival evidence remained active after sequence completion');
  if (await page.evaluate(() => sessionStorage.getItem('future-conquest:r3-wp39c-arrival-played')) !== 'true') throw new Error('arrival presentation marker was not consumed');
  if (await page.evaluate(() => document.documentElement.dataset.r3WithholdFormations === 'true')) throw new Error('formation withholding flag remained set after sequence completion');

  const settledRenderer = await page.evaluate(() => ({
    count: window.__r3FormationMiniatures?.pieces.length ?? 0,
    visible: window.__r3FormationMiniatures?.pieces.filter(piece => piece.visible).length ?? 0,
    withheld: window.__r3FormationMiniatures?.presentationWithheld ?? true
  }));
  if (!settledRenderer.count || settledRenderer.withheld || settledRenderer.visible !== settledRenderer.count) throw new Error('formations did not settle visible after portal completion');

  await assertNoReplayAfterNavigation(page);

  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'Manual Save', exact: true }).click();
  await page.getByRole('button', { name: 'Load Manual Save', exact: true }).click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  if (await page.locator('.r3-portal-arrival').count()) throw new Error('arrival replayed after loading an established manual save');

  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'New campaign', exact: true }).click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  const secondCampaign = await waitForArrival(page);
  if (!secondCampaign.domWithheld || secondCampaign.presentationWithheld !== true || secondCampaign.rendererVisibleCount !== 0) {
    throw new Error('second campaign formations were visible before their portal arrival');
  }
  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 6000 });
  await page.close();

  const reducedPage = await newCampaignPage({ reducedMotion: 'reduce' });
  const reduced = await waitForArrival(reducedPage, 60000, false);
  const reducedStarted = Date.now();
  if (!reduced.reducedMotion) throw new Error('reduced-motion probe did not activate reduced arrival path');
  if (reduced.rendererFormationCount === 0) throw new Error('reduced-motion portal opened without physical formations');
  await reducedPage.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 2500 });
  const reducedElapsedMs = Date.now() - reducedStarted;
  if (reducedElapsedMs > 2200) throw new Error(`reduced-motion arrival remained active too long (${reducedElapsedMs}ms)`);
  if (await reducedPage.evaluate(() => document.documentElement.dataset.r3WithholdFormations === 'true')) throw new Error('reduced-motion path left formations withheld');
  await reducedPage.close();

  const fallbackPage = await newCampaignPage({ terrain: false, reducedMotion: 'reduce' });
  await fallbackPage.locator('.map-panel svg').waitFor({ state: 'visible', timeout: 20000 });
  await fallbackPage.waitForTimeout(500);
  if (await fallbackPage.locator('.r3-portal-arrival').count()) throw new Error('arrival overlay remained mounted on explicit SVG fallback');
  if (await fallbackPage.evaluate(() => Boolean(window.__r3PortalArrival))) throw new Error('arrival renderer evidence remained active on SVG fallback');
  if (await fallbackPage.evaluate(() => document.documentElement.dataset.r3WithholdFormations === 'true')) throw new Error('SVG fallback left formations withheld');
  await fallbackPage.locator('.command-map-workspace').screenshot({ path: `${outputDir}/fallback-normal-map.png` });
  await fallbackPage.close();

  const evidence = {
    schemaVersion: 8,
    normal: { opening, materialising, settledRenderer },
    secondCampaign,
    reduced: { ...reduced, elapsedMs: reducedElapsedMs },
    fallback: { settledToNormalMap: true, formationsWithheld: false }
  };
  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
