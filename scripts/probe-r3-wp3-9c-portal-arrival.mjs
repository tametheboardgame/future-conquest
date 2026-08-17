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
  });
  await page.goto(`${origin}/?terrain=${terrain ? '1' : '0'}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
  return page;
}

async function waitForArrival(page, timeout = 60000) {
  await page.waitForFunction(() => {
    const terrainStatus = document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status');
    const map = window.__r3TerrainMap;
    const miniatures = window.__r3FormationMiniatures;
    const arrival = window.__r3PortalArrival;
    const overlay = document.querySelector('.r3-portal-arrival');
    const overlayRect = overlay?.getBoundingClientRect();
    return (terrainStatus === 'ready' || terrainStatus === 'warning')
      && Boolean(map?.getContainer().isConnected)
      && Boolean(miniatures?.pieces.length)
      && Boolean(arrival?.active)
      && Boolean(overlay && overlayRect && overlayRect.width > 0 && overlayRect.height > 0)
      && getComputedStyle(overlay).display !== 'none'
      && getComputedStyle(overlay).visibility !== 'hidden';
  }, null, { timeout, polling: 'raf' });
}

async function arrivalEvidence(page) {
  return page.evaluate(() => {
    const arrival = window.__r3PortalArrival;
    const map = window.__r3TerrainMap;
    const miniatureEvidence = window.__r3FormationMiniatures;
    const targetEvidence = window.__r3FormationPortalTargets;
    const overlay = document.querySelector('.r3-portal-arrival');
    if (!arrival || !map || !miniatureEvidence?.pieces.length || !overlay) throw new Error('arrival renderer evidence unavailable');
    const expectedPieces = targetEvidence?.pieces ?? miniatureEvidence.pieces;
    const rect = map.getContainer().getBoundingClientRect();
    const expected = expectedPieces.map(piece => {
      const point = map.project([piece.target[0], piece.target[1]]);
      return { id: piece.id, x: rect.left + point.x, y: rect.top + point.y };
    });
    const deltas = arrival.formations.flatMap(actual => {
      const target = expected.find(item => item.id === actual.id);
      return target ? [{ id: actual.id, distance: Math.hypot(actual.x - target.x, actual.y - target.y) }] : [];
    });
    return {
      phase: arrival.phase,
      reducedMotion: arrival.reducedMotion,
      portalTerritory: arrival.portalTerritory ?? null,
      formationCount: arrival.formations.length,
      targetFormationCount: expectedPieces.length,
      rendererFormationCount: miniatureEvidence.pieces.length,
      rendererVisibleCount: miniatureEvidence.pieces.filter(piece => piece.visible).length,
      presentationWithheld: miniatureEvidence.presentationWithheld ?? null,
      domWithheld: document.documentElement.dataset.r3WithholdFormations === 'true',
      terrainStatus: document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') ?? null,
      mapConnected: map.getContainer().isConnected,
      overlayConnected: overlay.isConnected,
      maxAnchorDeltaPx: deltas.length ? deltas.reduce((max, item) => Math.max(max, item.distance), 0) : null,
      deltas
    };
  });
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
  await waitForArrival(page);

  const opening = await arrivalEvidence(page);
  if (opening.reducedMotion) throw new Error('normal-motion probe unexpectedly entered reduced-motion mode');
  if (!['ready', 'warning'].includes(opening.terrainStatus) || !opening.mapConnected || !opening.overlayConnected) throw new Error('portal opened before the terrain renderer and portal DOM were stable');
  if (opening.rendererFormationCount === 0) throw new Error('portal opened before the physical formation renderer produced pieces');
  if (opening.formationCount !== opening.rendererFormationCount) throw new Error(`arrival formation count mismatch (${opening.formationCount}/${opening.rendererFormationCount})`);
  if (!opening.domWithheld) throw new Error('formation withholding was not active during portal opening');
  if (opening.presentationWithheld !== true) throw new Error('physical formation renderer did not report portal withholding during opening');
  if (opening.rendererVisibleCount !== 0) throw new Error(`${opening.rendererVisibleCount} formations were visible before materialisation`);
  if (opening.maxAnchorDeltaPx === null || opening.maxAnchorDeltaPx > 1.25) throw new Error(`arrival anchors diverged from renderer targets by ${opening.maxAnchorDeltaPx ?? 'unknown'}px`);
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/portal-opening.png` });

  await page.waitForFunction(() => {
    const arrival = window.__r3PortalArrival;
    const miniatures = window.__r3FormationMiniatures;
    return arrival?.phase === 'materialising'
      && Boolean(miniatures?.pieces.length)
      && miniatures.pieces.every(piece => piece.visible)
      && miniatures.presentationWithheld === false
      && document.documentElement.dataset.r3WithholdFormations !== 'true';
  }, null, { timeout: 5000 });
  const materialising = await arrivalEvidence(page);
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
  await waitForArrival(page);
  const secondCampaign = await arrivalEvidence(page);
  if (!secondCampaign.domWithheld || secondCampaign.presentationWithheld !== true || secondCampaign.rendererVisibleCount !== 0) {
    throw new Error('second campaign formations were visible before their portal arrival');
  }
  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 6000 });
  await page.close();

  const reducedPage = await newCampaignPage({ reducedMotion: 'reduce' });
  await waitForArrival(reducedPage);
  const reducedStarted = Date.now();
  const reduced = await arrivalEvidence(reducedPage);
  if (!reduced.reducedMotion) throw new Error('reduced-motion probe did not activate reduced arrival path');
  if (reduced.rendererFormationCount === 0 || reduced.rendererVisibleCount !== 0) throw new Error('reduced-motion portal did not begin with hidden physical formations');
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
    schemaVersion: 6,
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
