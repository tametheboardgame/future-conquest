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
  await page.waitForFunction(() => document.querySelector('[data-command-view="map"]')?.getAttribute('aria-current') === 'page');
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  return page;
}

async function waitForArrival(page, timeout = 20000) {
  await page.locator('.r3-portal-arrival').waitFor({ state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(window.__r3PortalArrival?.active), null, { timeout });
}

async function arrivalEvidence(page) {
  return page.evaluate(() => {
    const arrival = window.__r3PortalArrival;
    const map = window.__r3TerrainMap;
    const pieces = window.__r3FormationMiniatures?.pieces ?? [];
    if (!arrival || !map) throw new Error('arrival renderer evidence unavailable');
    const rect = map.getContainer().getBoundingClientRect();
    const expected = pieces.map(piece => {
      const point = map.project([piece.target[0], piece.target[1]]);
      return { id: piece.id, x: rect.left + point.x, y: rect.top + point.y };
    });
    const deltas = arrival.formations.map(actual => {
      const target = expected.find(item => item.id === actual.id);
      if (!target) return { id: actual.id, distance: Number.POSITIVE_INFINITY };
      return { id: actual.id, distance: Math.hypot(actual.x - target.x, actual.y - target.y) };
    });
    return {
      phase: arrival.phase,
      reducedMotion: arrival.reducedMotion,
      portalTerritory: arrival.portalTerritory ?? null,
      formationCount: arrival.formations.length,
      rendererFormationCount: pieces.length,
      rendererVisibility: pieces.map(piece => ({ id: piece.id, visible: piece.visible })),
      visibleFormationCount: pieces.filter(piece => piece.visible).length,
      maxAnchorDeltaPx: deltas.reduce((max, item) => Math.max(max, item.distance), 0),
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
  // Catch the short arrival beat before waiting on the terrain renderer's final
  // ready flag. The portal can legitimately begin while later terrain assets are
  // still completing, so waiting for final readiness first can miss the sequence.
  await waitForArrival(page);
  await page.waitForFunction(() => Boolean(window.__r3TerrainMap) && (window.__r3FormationMiniatures?.pieces.length ?? 0) > 0, null, { timeout: 20000 });
  await page.waitForFunction(() => window.__r3PortalArrival?.phase === 'opening'
    && (window.__r3FormationMiniatures?.pieces.length ?? 0) > 0
    && window.__r3FormationMiniatures.pieces.every(piece => piece.visible === false), null, { timeout: 2000 });

  const opening = await arrivalEvidence(page);
  if (opening.reducedMotion) throw new Error('normal-motion probe unexpectedly entered reduced-motion mode');
  if (opening.formationCount === 0 || opening.formationCount !== opening.rendererFormationCount) throw new Error(`arrival formation count mismatch (${opening.formationCount}/${opening.rendererFormationCount})`);
  if (opening.visibleFormationCount !== 0) throw new Error(`${opening.visibleFormationCount} formations were visible before materialisation`);
  if (opening.maxAnchorDeltaPx > 1.25) throw new Error(`arrival anchors diverged from renderer targets by ${opening.maxAnchorDeltaPx.toFixed(2)}px`);
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/portal-opening.png` });

  await page.waitForFunction(() => window.__r3PortalArrival?.phase === 'materialising', null, { timeout: 4000 });
  await page.waitForFunction(() => (window.__r3FormationMiniatures?.pieces.length ?? 0) > 0
    && window.__r3FormationMiniatures.pieces.every(piece => piece.visible === true), null, { timeout: 2000 });
  const materialising = await arrivalEvidence(page);
  if (materialising.visibleFormationCount !== materialising.rendererFormationCount) throw new Error('formations did not become visible at materialisation');
  if (materialising.maxAnchorDeltaPx > 1.25) throw new Error(`materialisation anchors diverged by ${materialising.maxAnchorDeltaPx.toFixed(2)}px`);
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/formations-materialising.png` });

  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 6000 });
  if (await page.evaluate(() => Boolean(window.__r3PortalArrival))) throw new Error('arrival evidence remained active after sequence completion');
  if (await page.evaluate(() => sessionStorage.getItem('future-conquest:r3-wp39c-arrival-played')) !== 'true') throw new Error('arrival presentation marker was not consumed');

  await assertNoReplayAfterNavigation(page);

  // Loading an established campaign must explicitly bypass the arrival beat.
  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'Manual Save', exact: true }).click();
  await page.getByRole('button', { name: 'Load Manual Save', exact: true }).click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  if (await page.locator('.r3-portal-arrival').count()) throw new Error('arrival replayed after loading an established manual save');

  // An explicit new campaign in the same session must reset presentation state
  // and receive its own single arrival beat.
  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'New campaign', exact: true }).click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  await waitForArrival(page);
  const secondCampaign = await arrivalEvidence(page);
  if (secondCampaign.maxAnchorDeltaPx > 1.25) throw new Error(`second campaign arrival anchors diverged by ${secondCampaign.maxAnchorDeltaPx.toFixed(2)}px`);
  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 6000 });
  await page.close();

  const reducedPage = await newCampaignPage({ reducedMotion: 'reduce' });
  const reducedStarted = Date.now();
  await waitForArrival(reducedPage);
  await reducedPage.waitForFunction(() => Boolean(window.__r3TerrainMap) && (window.__r3FormationMiniatures?.pieces.length ?? 0) > 0, null, { timeout: 20000 });
  const reduced = await arrivalEvidence(reducedPage);
  if (!reduced.reducedMotion) throw new Error('reduced-motion probe did not activate reduced arrival path');
  if (reduced.maxAnchorDeltaPx > 1.25) throw new Error(`reduced-motion anchors diverged by ${reduced.maxAnchorDeltaPx.toFixed(2)}px`);
  await reducedPage.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 2500 });
  const reducedElapsedMs = Date.now() - reducedStarted;
  if (reducedElapsedMs > 2200) throw new Error(`reduced-motion arrival remained active too long (${reducedElapsedMs}ms)`);
  await reducedPage.close();

  const fallbackPage = await newCampaignPage({ terrain: false, reducedMotion: 'reduce' });
  await fallbackPage.locator('.map-panel svg').waitFor({ state: 'visible', timeout: 20000 });
  await fallbackPage.waitForTimeout(500);
  if (await fallbackPage.locator('.r3-portal-arrival').count()) throw new Error('arrival overlay remained mounted on explicit SVG fallback');
  if (await fallbackPage.evaluate(() => Boolean(window.__r3PortalArrival))) throw new Error('arrival renderer evidence remained active on SVG fallback');
  await fallbackPage.locator('.command-map-workspace').screenshot({ path: `${outputDir}/fallback-normal-map.png` });
  await fallbackPage.close();

  const evidence = {
    schemaVersion: 2,
    normal: { opening, materialising },
    secondCampaign,
    reduced: { ...reduced, elapsedMs: reducedElapsedMs },
    fallback: { settledToNormalMap: true }
  };
  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
