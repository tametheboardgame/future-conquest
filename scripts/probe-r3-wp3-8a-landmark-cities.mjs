import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP38A_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP38A_ARTIFACTS ?? 'artifacts/r3-wp3-8a';
const london = {
  id: 'N-LONDON', name: 'London', variant: 'london', position: [-0.1276, 51.5072],
  landmarks: ['Elizabeth Tower / Big Ben', 'Palace of Westminster'],
  assetId: 'wp3.8a-v2-london-selected',
  camera: { zoom: 8.1, pitch: 50, bearing: -18 }
};

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });

try {
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
  await page.waitForFunction(() =>
    document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready'
    && Boolean(window.__r3WorldMiniatures)
    && Boolean(window.__r3TerrainMap)
  , null, { timeout: 45_000 });

  // Isolate art review using the real Layers controls. General terrain gates
  // separately prove formations/operations/ports in normal play.
  const layerControl = page.locator('details.r3-terrain-layer-control');
  await layerControl.evaluate(element => { element.open = true; });
  for (const label of ['Friendly formations', 'Operations, threats and fronts', 'Ports']) {
    const toggle = layerControl.getByLabel(label, { exact: true });
    if (await toggle.isChecked()) await toggle.uncheck();
  }
  await page.waitForTimeout(200);
  await layerControl.evaluate(element => { element.open = false; });
  await page.addStyleTag({ content: '[data-r3-marker-id] { visibility: hidden !important; }' });

  // Theatre/Campaign must not eagerly fetch the Selected asset. The initial
  // London evidence should still be the procedural fallback.
  const beforeSelected = await page.evaluate(id => {
    const object = window.__r3WorldMiniatures?.objects.find(candidate => candidate.id === id);
    return object ? { assetStatus: object.assetStatus, presentationModel: object.presentationModel } : null;
  }, london.id);
  if (!beforeSelected || beforeSelected.presentationModel !== 'procedural-fallback') {
    throw new Error(`London authored model loaded outside Selected view: ${JSON.stringify(beforeSelected)}`);
  }

  await page.evaluate(({ position, camera }) => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    map.jumpTo({ center: position, ...camera });
  }, london);

  await page.waitForFunction(({ id, assetId }) => {
    const diagnostic = window.__r3WorldMiniatures;
    const object = diagnostic?.objects.find(candidate => candidate.id === id);
    return diagnostic?.lod === 'selected'
      && object?.assetStatus === 'ready'
      && object?.assetId === assetId
      && object?.presentationModel === 'authored-gltf';
  }, { id: london.id, assetId: london.assetId }, { timeout: 20_000 });
  await page.waitForTimeout(400);

  const observed = await page.evaluate(({ id }) => {
    const diagnostic = window.__r3WorldMiniatures;
    const nodes = window.__r3StrategicNodes ?? [];
    if (!diagnostic) throw new Error('world-miniature diagnostic unavailable');
    const object = diagnostic.objects.find(candidate => candidate.id === id);
    const node = nodes.find(candidate => candidate.id === id);
    if (!object || !node) throw new Error(`missing city diagnostic ${id}`);
    return {
      ...object,
      lod: diagnostic.lod,
      anchorErrorDegrees: Math.hypot(object.position[0] - node.position[0], object.position[1] - node.position[1])
    };
  }, london);

  if (!observed.visible || observed.lod !== 'selected') throw new Error(`London authored miniature is not visible at Selected LOD`);
  if (observed.cityVariant !== london.variant) throw new Error(`London variant mismatch: ${observed.cityVariant}`);
  if (observed.assetStatus !== 'ready' || observed.presentationModel !== 'authored-gltf') {
    throw new Error(`London did not swap to authored glTF: ${JSON.stringify(observed)}`);
  }
  if (observed.assetId !== london.assetId || observed.authoredFaceCount < 3000) {
    throw new Error(`London authored asset identity/detail contract failed: ${JSON.stringify(observed)}`);
  }
  if (observed.anchorErrorDegrees !== 0) throw new Error('London geographic anchor changed');
  if (!Number.isFinite(observed.elevation) || observed.clearance !== 22) throw new Error('London terrain grounding changed');
  if (JSON.stringify(observed.landmarks) !== JSON.stringify(london.landmarks)) {
    throw new Error(`London landmark metadata mismatch: ${JSON.stringify(observed.landmarks)}`);
  }

  await host.screenshot({ path: `${outputDir}/london-authored.png` });

  const migration = await page.evaluate(() => {
    const objects = window.__r3WorldMiniatures?.objects ?? [];
    const pick = id => {
      const object = objects.find(candidate => candidate.id === id);
      return object ? {
        id: object.id,
        cityVariant: object.cityVariant,
        assetId: object.assetId,
        assetStatus: object.assetStatus,
        presentationModel: object.presentationModel
      } : null;
    };
    return {
      london: pick('N-LONDON'),
      paris: pick('N-PARIS'),
      brussels: pick('N-BRUSSELS'),
      amsterdam: pick('N-AMSTERDAM')
    };
  });
  if (migration.paris?.assetStatus !== 'authoring' || migration.brussels?.assetStatus !== 'authoring') {
    throw new Error(`staged Pass 1 rollout not explicit: ${JSON.stringify(migration)}`);
  }
  if (migration.amsterdam?.cityVariant !== 'generic') {
    throw new Error(`later-pass generic fallback changed: ${JSON.stringify(migration.amsterdam)}`);
  }

  const evidence = { schemaVersion: 2, beforeSelected, london: observed, migration };
  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
