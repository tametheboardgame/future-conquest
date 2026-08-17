import { chromium } from 'playwright';

const origin = process.env.R3_WP39C_ORIGIN ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
    sessionStorage.removeItem('future-conquest:r3-wp39c-arrival-played');
  });
  await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__r3TerrainMap)
    && (window.__r3FormationMiniatures?.pieces.length ?? 0) > 0, null, { timeout: 45000 });
  if (await page.locator('.r3-portal-arrival').count()) {
    await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 8000 });
  }

  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'New campaign', exact: true }).click();
  await page.locator('.r3-portal-arrival').waitFor({ state: 'visible', timeout: 3000 });
  await page.waitForTimeout(250);

  const diagnostic = await page.evaluate(() => {
    const map = window.__r3TerrainMap;
    const pieces = window.__r3FormationMiniatures?.pieces ?? [];
    const wrapper = map?.style?._layers?.['r3-wp3-5-formation-miniatures'];
    const implementation = wrapper?.implementation;
    const rect = map?.getContainer().getBoundingClientRect();
    const projected = map ? pieces.map(piece => {
      try {
        const point = map.project([piece.target[0], piece.target[1]]);
        return { id: piece.id, target: piece.target, x: point.x, y: point.y, ok: Number.isFinite(point.x) && Number.isFinite(point.y) };
      } catch (error) {
        return { id: piece.id, target: piece.target, error: String(error), ok: false };
      }
    }) : [];
    return {
      portalRootCount: document.querySelectorAll('.r3-portal-arrival').length,
      portalPhase: document.querySelector('.r3-portal-arrival')?.getAttribute('data-phase') ?? null,
      portalEvidence: window.__r3PortalArrival ?? null,
      sessionPlayed: sessionStorage.getItem('future-conquest:r3-wp39c-arrival-played'),
      currentCommandView: document.querySelector('[data-command-view][aria-current="page"]')?.getAttribute('data-command-view') ?? null,
      awaitingOutcome: Boolean(document.querySelector('.command-outcome.victory, .command-outcome.defeat')),
      outcomeClasses: [...document.querySelectorAll('.command-outcome')].map(node => node.className),
      terrainQueryDisabled: new URLSearchParams(location.search).get('terrain') === '0',
      physicalFallback: Boolean(document.querySelector('[data-physical-formations="fallback"]')),
      compactFallback: Boolean(document.querySelector('.r3-terrain-compact-fallback')),
      physicalFormations: document.querySelector('[data-physical-formations]')?.getAttribute('data-physical-formations') ?? null,
      mapRect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
      pieceCount: pieces.length,
      pieces: pieces.map(piece => ({ id: piece.id, target: piece.target, visible: piece.visible })),
      projected,
      formationWrapperFound: Boolean(wrapper),
      implementationFound: Boolean(implementation),
      implementationVisible: implementation?.visible ?? null,
      implementationKeys: implementation ? Object.keys(implementation) : []
    };
  });

  console.log('WP3.9C WAITING DIAGNOSTIC', JSON.stringify(diagnostic, null, 2));
  if (!diagnostic.portalEvidence?.active) {
    throw new Error(`portal did not leave waiting state: ${JSON.stringify(diagnostic)}`);
  }
} finally {
  await browser.close();
}
