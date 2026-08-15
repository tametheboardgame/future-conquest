import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP38A_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP38A_ARTIFACTS ?? 'artifacts/r3-wp3-8a';
const cities = [
  {
    id: 'N-LONDON', name: 'London', variant: 'london', position: [-0.1276, 51.5072],
    landmarks: ['Elizabeth Tower / Big Ben', 'Palace of Westminster'],
    camera: { zoom: 8.1, pitch: 50, bearing: -18 }
  },
  {
    id: 'N-PARIS', name: 'Paris', variant: 'paris', position: [2.3522, 48.8566],
    landmarks: ['Eiffel Tower', 'Arc de Triomphe'],
    camera: { zoom: 8.2, pitch: 52, bearing: -24 }
  },
  {
    id: 'N-BRUSSELS', name: 'Brussels', variant: 'brussels', position: [4.3517, 50.8503],
    landmarks: ['Atomium', 'Brussels Town Hall / Grand-Place spire'],
    camera: { zoom: 8.0, pitch: 50, bearing: 24 }
  }
];

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

  // The normal operational overlays are validated by the existing WP2F probe.
  // Suppress only DOM markers in these art-review captures so labels/contacts do
  // not sit over the physical landmark silhouettes. Three.js world pieces and
  // the real terrain remain unchanged.
  await page.addStyleTag({ content: '[data-r3-marker-id] { visibility: hidden !important; }' });

  const evidence = { cities: {}, genericFallback: null };
  for (const city of cities) {
    await page.evaluate(({ position, camera }) => {
      const map = window.__r3TerrainMap;
      if (!map) throw new Error('terrain map diagnostic unavailable');
      map.jumpTo({ center: position, ...camera });
    }, city);
    await page.waitForTimeout(850);

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
    }, city);

    if (!observed.visible) throw new Error(`${city.name} landmark miniature is not visible at Selected LOD`);
    if (observed.lod !== 'selected') throw new Error(`${city.name} did not reach Selected world LOD`);
    if (observed.cityVariant !== city.variant) throw new Error(`${city.name} variant mismatch: ${observed.cityVariant}`);
    if (observed.anchorErrorDegrees !== 0) throw new Error(`${city.name} geographic anchor changed`);
    if (!Number.isFinite(observed.elevation) || observed.clearance !== 22) throw new Error(`${city.name} terrain grounding changed`);
    if (JSON.stringify(observed.landmarks) !== JSON.stringify(city.landmarks)) {
      throw new Error(`${city.name} landmark metadata mismatch: ${JSON.stringify(observed.landmarks)}`);
    }

    evidence.cities[city.id] = observed;
    await host.screenshot({ path: `${outputDir}/${city.variant}.png` });
  }

  evidence.genericFallback = await page.evaluate(() => {
    const object = window.__r3WorldMiniatures?.objects.find(candidate => candidate.id === 'N-AMSTERDAM');
    return object ? { id: object.id, cityVariant: object.cityVariant, landmarks: object.landmarks } : null;
  });
  if (!evidence.genericFallback || evidence.genericFallback.cityVariant !== 'generic') {
    throw new Error(`Later-pass generic city fallback changed: ${JSON.stringify(evidence.genericFallback)}`);
  }

  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
