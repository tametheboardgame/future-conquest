import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP38A_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP38A_ARTIFACTS ?? 'artifacts/r3-wp3-8a';
const london = {
  id: 'N-LONDON', name: 'London', variant: 'london', position: [-0.1276, 51.5072],
  landmarks: ['Elizabeth Tower / Big Ben', 'Palace of Westminster'],
  assetId: 'wp3.8a-v2-london-selected',
  campaignCamera: { zoom: 5.35, pitch: 51, bearing: -9 },
  selectedCamera: { zoom: 8.1, pitch: 50, bearing: -18 }
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

  // The authored landmark must now be visible in the normal Campaign camera,
  // not only after entering the Selected/local zoom band.
  await page.evaluate(({ position, campaignCamera }) => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    map.jumpTo({ center: position, ...campaignCamera });
  }, london);

  await page.waitForFunction(({ id, assetId }) => {
    const diagnostic = window.__r3WorldMiniatures;
    const object = diagnostic?.objects.find(candidate => candidate.id === id);
    return diagnostic?.lod === 'campaign'
      && object?.assetStatus === 'ready'
      && object?.assetId === assetId
      && object?.presentationModel === 'authored-gltf';
  }, { id: london.id, assetId: london.assetId }, { timeout: 20_000 });
  await page.waitForTimeout(400);

  const campaignObserved = await page.evaluate(({ id }) => {
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

  if (!campaignObserved.visible || campaignObserved.lod !== 'campaign') throw new Error('London authored miniature is not visible at Campaign LOD');
  if (campaignObserved.cityVariant !== london.variant) throw new Error(`London variant mismatch: ${campaignObserved.cityVariant}`);
  if (campaignObserved.assetStatus !== 'ready' || campaignObserved.presentationModel !== 'authored-gltf') {
    throw new Error(`London did not swap to authored glTF in Campaign view: ${JSON.stringify(campaignObserved)}`);
  }
  if (campaignObserved.assetId !== london.assetId || campaignObserved.authoredFaceCount < 3000) {
    throw new Error(`London authored asset identity/detail contract failed: ${JSON.stringify(campaignObserved)}`);
  }
  if (campaignObserved.anchorErrorDegrees !== 0) throw new Error('London geographic anchor changed');
  if (!Number.isFinite(campaignObserved.elevation) || campaignObserved.clearance !== 22) throw new Error('London terrain grounding changed');
  if (JSON.stringify(campaignObserved.landmarks) !== JSON.stringify(london.landmarks)) {
    throw new Error(`London landmark metadata mismatch: ${JSON.stringify(campaignObserved.landmarks)}`);
  }

  await host.screenshot({ path: `${outputDir}/london-authored-campaign.png` });

  // Selected/local remains the richer close inspection mode and must keep using
  // the same authored object rather than reverting to the fallback.
  await page.evaluate(({ position, selectedCamera }) => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    map.jumpTo({ center: position, ...selectedCamera });
  }, london);

  await page.waitForFunction(({ id, assetId }) => {
    const diagnostic = window.__r3WorldMiniatures;
    const object = diagnostic?.objects.find(candidate => candidate.id === id);
    return diagnostic?.lod === 'selected'
      && object?.assetStatus === 'ready'
      && object?.assetId === assetId
      && object?.presentationModel === 'authored-gltf';
  }, { id: london.id, assetId: london.assetId }, { timeout: 20_000 });

  const selectedObserved = await page.evaluate(id => {
    const diagnostic = window.__r3WorldMiniatures;
    const object = diagnostic?.objects.find(candidate => candidate.id === id);
    return object ? { ...object, lod: diagnostic?.lod } : null;
  }, london.id);
  if (!selectedObserved || selectedObserved.presentationModel !== 'authored-gltf' || selectedObserved.lod !== 'selected') {
    throw new Error(`London authored model did not persist into Selected view: ${JSON.stringify(selectedObserved)}`);
  }

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

  const evidence = { schemaVersion: 3, campaign: campaignObserved, selected: selectedObserved, migration };
  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
