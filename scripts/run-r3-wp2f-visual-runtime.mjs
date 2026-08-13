import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP2F_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP2F_ARTIFACTS ?? 'artifacts/r3-wp2f';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
await page.addInitScript(() => {
  localStorage.setItem('future-conquest:intro-seen:v3', 'true');
  localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
});
await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
await page.locator('.startup-game-shell').waitFor({ state: 'visible' });
await page.locator('[data-command-view="map"]').click();
const host = page.locator('.r3-terrain-prototype');
await host.waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready');

const evidence = { profiles: {}, hover: {}, identity: {} };
for (const [button, expected, file] of [['theatre', 'theatre', 'theatre.png'], ['campaign', 'campaign', 'campaign.png'], ['selected', 'local', 'selected-local.png']]) {
  const control = page.getByRole('button', { name: button, exact: true });
  if (button === 'selected' && await control.isDisabled()) {
    await page.locator('.r3-terrain-territory-label').first().click();
  }
  await control.click();
  await page.waitForFunction(lod => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-overlay-lod') === lod, expected);
  await page.waitForTimeout(900);
  evidence.profiles[expected] = await page.evaluate(() => {
    const root = document.querySelector('.r3-terrain-prototype');
    const canvas = document.querySelector('.r3-terrain-prototype-canvas canvas');
    const markers = [...document.querySelectorAll('[data-r3-marker-id]')];
    const formations = markers.filter(marker => marker.dataset.r3MarkerKind === 'formation' || marker.dataset.r3MarkerKind === 'selected-formation');
    const scale = Number.parseFloat(getComputedStyle(root).getPropertyValue('--r3-marker-scale'));
    const canvasRect = canvas?.getBoundingClientRect();

    const formationAlignment = formations.map(marker => {
      const territoryId = marker.dataset.territoryId;
      const territoryLabel = territoryId
        ? document.querySelector(`.r3-terrain-territory-label[data-territory-id="${CSS.escape(territoryId)}"]`)
        : null;
      if (!(territoryLabel instanceof HTMLElement)) {
        return { id: marker.dataset.r3MarkerId, territoryId, distancePx: Number.POSITIVE_INFINITY, inCanvas: false };
      }
      const wasHidden = territoryLabel.hidden;
      territoryLabel.hidden = false;
      const markerRect = marker.getBoundingClientRect();
      const territoryRect = territoryLabel.getBoundingClientRect();
      territoryLabel.hidden = wasHidden;
      const markerX = markerRect.left + markerRect.width / 2;
      const markerY = markerRect.top + markerRect.height / 2;
      const territoryX = territoryRect.left + territoryRect.width / 2;
      const territoryY = territoryRect.top + territoryRect.height / 2;
      const distancePx = Math.hypot(markerX - territoryX, markerY - territoryY);
      const inCanvas = Boolean(canvasRect)
        && markerRect.right >= canvasRect.left
        && markerRect.left <= canvasRect.right
        && markerRect.bottom >= canvasRect.top
        && markerRect.top <= canvasRect.bottom;
      return { id: marker.dataset.r3MarkerId, territoryId, distancePx, inCanvas };
    });

    return {
      lod: root?.getAttribute('data-overlay-lod'),
      scale,
      markerCount: markers.length,
      visibleCount: markers.filter(marker => !marker.hidden).length,
      maximumRenderedScale: scale,
      formationCount: formations.length,
      visibleFormationCount: formations.filter(marker => !marker.hidden).length,
      formationsInCanvas: formationAlignment.filter(item => item.inCanvas).length,
      maxFormationTerritoryDistancePx: Math.max(0, ...formationAlignment.map(item => item.distancePx)),
      formationAlignment
    };
  });
  const profile = evidence.profiles[expected];
  if (profile.maximumRenderedScale > 1.081) throw new Error(`marker clamp exceeded in ${expected}`);
  if (profile.visibleFormationCount !== profile.formationCount) {
    throw new Error(`player formation hidden by declutter in ${expected}: ${profile.visibleFormationCount}/${profile.formationCount}`);
  }
  if (profile.maxFormationTerritoryDistancePx > 36) {
    throw new Error(`formation/territory alignment drifted in ${expected}: ${profile.maxFormationTerritoryDistancePx.toFixed(1)}px`);
  }
  if ((expected === 'theatre' || expected === 'campaign') && profile.formationsInCanvas !== profile.formationCount) {
    throw new Error(`player formation fell outside ${expected} command-map canvas: ${profile.formationsInCanvas}/${profile.formationCount}`);
  }
  await page.screenshot({ path: `${outputDir}/${file}`, fullPage: true });
}

await page.evaluate(() => { window.__wp2fMarkerNodes = new Map([...document.querySelectorAll('[data-r3-marker-id]')].map(node => [node.dataset.r3MarkerId, node])); });
const selectedBefore = await page.locator('.r3-terrain-territory-label.selected').getAttribute('data-territory-id');
const canvas = page.locator('.r3-terrain-prototype-canvas canvas');
const box = await canvas.boundingBox();
if (!box) throw new Error('terrain canvas has no rendered bounds');
let hovered = false;
for (let y = 0.25; y <= 0.75 && !hovered; y += 0.1) {
  for (let x = 0.2; x <= 0.8 && !hovered; x += 0.1) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
    hovered = await canvas.evaluate(node => node.style.cursor === 'pointer');
  }
}
if (!hovered) throw new Error('pointer sweep did not encounter a territory');
evidence.hover.entered = true;
await page.mouse.move(1, 1);
await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype-canvas canvas')?.style.cursor !== 'pointer', undefined, { timeout: 5_000 });
evidence.hover.cleared = await canvas.evaluate(node => node.style.cursor !== 'pointer');
evidence.hover.selectionUnchanged = selectedBefore === await page.locator('.r3-terrain-territory-label.selected').getAttribute('data-territory-id');
evidence.identity = await page.evaluate(() => {
  const prior = window.__wp2fMarkerNodes;
  const current = [...document.querySelectorAll('[data-r3-marker-id]')];
  const unchanged = current.filter(node => prior.get(node.dataset.r3MarkerId) === node).length;
  return { current: current.length, unchanged };
});
if (!evidence.hover.selectionUnchanged || evidence.identity.unchanged !== evidence.identity.current) throw new Error('hover/zoom replaced identity or changed selection');
evidence.territoryFillPolicy = 'ordinary:0;hover:0.075;selected:0.13;targeted:0.16';
fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(evidence, null, 2));
