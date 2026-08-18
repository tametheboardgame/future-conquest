import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP39A_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP39A_ARTIFACTS ?? 'artifacts/r3-wp3-9a';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function preparePage(terrain) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  });
  await page.goto(`${origin}/?terrain=${terrain ? '1' : '0'}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('[data-command-view="map"]')?.getAttribute('aria-current') === 'page');
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  return page;
}

async function layoutEvidence(page) {
  return page.evaluate(() => {
    const workspace = document.querySelector('.command-map-workspace');
    const map = document.querySelector('.map-panel');
    const panel = document.querySelector('.map-context-panel');
    const terrainCanvas = document.querySelector('.r3-terrain-prototype-canvas canvas');
    const svg = document.querySelector('.map-panel svg');
    const group = document.querySelector('.selected-formation-card h2');
    const territory = document.querySelector('.territory-card h3');
    if (!(workspace instanceof HTMLElement) || !(map instanceof HTMLElement) || !(panel instanceof HTMLElement)) throw new Error('map workspace unavailable');

    const hiddenWhenCollapsed = [
      ...panel.querySelectorAll(':scope > :not(.quick-command)'),
      ...panel.querySelectorAll('.quick-command > :not(.quick-command-heading)'),
      ...panel.querySelectorAll('.quick-command-heading > :not(.map-ux-sidebar-toggle)')
    ];
    const collapsedContentHidden = hiddenWhenCollapsed.every(node => getComputedStyle(node).display === 'none');
    const sidebarToggle = panel.querySelector('[data-map-sidebar-toggle]');
    const sidebarToggleVisible = sidebarToggle instanceof HTMLElement
      && getComputedStyle(sidebarToggle).display !== 'none'
      && sidebarToggle.getBoundingClientRect().width > 0
      && sidebarToggle.getBoundingClientRect().height > 0;

    return {
      collapsed: workspace.classList.contains('wp39a-sidebar-collapsed'),
      mapWidth: map.getBoundingClientRect().width,
      panelWidth: panel.getBoundingClientRect().width,
      panelHidden: panel.getAttribute('aria-hidden'),
      panelInert: panel.inert,
      collapsedContentHidden,
      sidebarToggleVisible,
      sidebarToggleExpanded: sidebarToggle?.getAttribute('aria-expanded') ?? null,
      rendererWidth: terrainCanvas instanceof HTMLElement ? terrainCanvas.getBoundingClientRect().width : svg instanceof SVGElement ? svg.getBoundingClientRect().width : null,
      selectedGroup: group?.textContent?.trim() ?? '',
      selectedTerritory: territory?.textContent?.trim() ?? ''
    };
  });
}

function requireGrowth(before, after, label) {
  if (!after.collapsed) throw new Error(`${label}: sidebar did not enter collapsed state`);
  if (after.panelWidth > 60) throw new Error(`${label}: collapsed sidebar remained too wide (${after.panelWidth})`);
  if (after.mapWidth - before.mapWidth < 220) throw new Error(`${label}: map did not reclaim enough width (${before.mapWidth} -> ${after.mapWidth})`);
  if (!after.collapsedContentHidden) throw new Error(`${label}: collapsed command content remained visible/interactable`);
  if (!after.sidebarToggleVisible || after.sidebarToggleExpanded !== 'false') throw new Error(`${label}: in-header expand control was not operable in collapsed state`);
  if (before.selectedGroup !== after.selectedGroup || before.selectedTerritory !== after.selectedTerritory) throw new Error(`${label}: selection context changed during collapse`);
  if (before.rendererWidth !== null && after.rendererWidth !== null && after.rendererWidth - before.rendererWidth < 180) throw new Error(`${label}: renderer did not resize with reclaimed map width`);
}

try {
  const page = await preparePage(true);
  const mapNav = page.locator('[data-command-view="map"]');
  if (await mapNav.getAttribute('aria-current') !== 'page') throw new Error('BEGIN CAMPAIGN did not land on the Map view');
  if (await page.locator('.campaign-view').count()) throw new Error('Campaign/SYS view remained active after BEGIN CAMPAIGN');

  const terrainHost = page.locator('.r3-terrain-prototype');
  await terrainHost.waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready' && Boolean(window.__r3TerrainMap), null, { timeout: 45000 });

  const toggle = page.getByRole('button', { name: 'Collapse command sidebar' });
  await toggle.waitFor({ state: 'visible' });
  if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error('sidebar toggle did not expose expanded state');
  const before = await layoutEvidence(page);

  await toggle.click();
  await page.waitForFunction(() => document.querySelector('.command-map-workspace')?.classList.contains('wp39a-sidebar-collapsed'));
  await page.waitForTimeout(260);
  const collapsed = await layoutEvidence(page);
  requireGrowth(before, collapsed, 'terrain');
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/terrain-sidebar-collapsed.png` });

  // The session-only preference must survive ordinary command-view navigation.
  await page.locator('[data-command-view="forces"]').click();
  await page.locator('.forces-view').waitFor({ state: 'visible' });
  await page.locator('[data-command-view="map"]').click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.command-map-workspace')?.classList.contains('wp39a-sidebar-collapsed'));
  const returned = await layoutEvidence(page);
  if (returned.selectedGroup !== before.selectedGroup || returned.selectedTerritory !== before.selectedTerritory) throw new Error('selection context changed after leaving and returning to collapsed map');

  const expandToggle = page.getByRole('button', { name: 'Expand command sidebar' });
  await expandToggle.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('.command-map-workspace')?.classList.contains('wp39a-sidebar-collapsed'));
  await page.waitForTimeout(260);
  const expanded = await layoutEvidence(page);
  if (expanded.panelInert || expanded.panelHidden === 'true') throw new Error('expanded sidebar remained inaccessible');
  if (Math.abs(expanded.mapWidth - before.mapWidth) > 8) throw new Error(`expanded layout did not restore original map width (${before.mapWidth} -> ${expanded.mapWidth})`);
  await page.locator('.command-map-workspace').screenshot({ path: `${outputDir}/terrain-sidebar-expanded.png` });

  // Compact layout must retain its existing stacked command-panel model.
  await page.setViewportSize({ width: 850, height: 1000 });
  await page.waitForTimeout(220);
  if (await page.locator('[data-map-sidebar-toggle]').isVisible().catch(() => false)) throw new Error('desktop sidebar toggle remained visible in compact layout');
  const compact = await layoutEvidence(page);
  if (compact.panelInert || compact.panelHidden === 'true' || compact.collapsed) throw new Error('compact layout inherited desktop collapsed-sidebar state');

  await page.close();

  // Explicit SVG/DOM fallback receives the same reclaimed map space without MapLibre.
  const fallbackPage = await preparePage(false);
  await fallbackPage.locator('.map-panel svg').waitFor({ state: 'visible', timeout: 20000 });
  const fallbackBefore = await layoutEvidence(fallbackPage);
  await fallbackPage.getByRole('button', { name: 'Collapse command sidebar' }).click();
  await fallbackPage.waitForFunction(() => document.querySelector('.command-map-workspace')?.classList.contains('wp39a-sidebar-collapsed'));
  await fallbackPage.waitForTimeout(260);
  const fallbackCollapsed = await layoutEvidence(fallbackPage);
  requireGrowth(fallbackBefore, fallbackCollapsed, 'svg fallback');
  await fallbackPage.locator('.command-map-workspace').screenshot({ path: `${outputDir}/svg-fallback-sidebar-collapsed.png` });

  const evidence = {
    schemaVersion: 2,
    defaultView: 'map',
    terrain: { before, collapsed, returned, expanded, compact },
    svgFallback: { before: fallbackBefore, collapsed: fallbackCollapsed }
  };
  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  await fallbackPage.close();
} finally {
  await browser.close();
}
