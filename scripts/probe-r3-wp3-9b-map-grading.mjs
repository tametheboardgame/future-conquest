import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP39B_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP39B_ARTIFACTS ?? 'artifacts/r3-wp3-9b';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });

async function jump(position, zoom, pitch, bearing = 0) {
  await page.evaluate(({ position, zoom, pitch, bearing }) => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    map.jumpTo({ center: position, zoom, pitch, bearing });
  }, { position, zoom, pitch, bearing });
  await page.waitForTimeout(500);
}

async function readPaintEvidence() {
  return page.evaluate(() => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    return {
      grading: window.__r3MapVisualGrading,
      hostGrade: document.querySelector('.r3-terrain-prototype')?.getAttribute('data-visual-grading'),
      sea: map.getPaintProperty('r3-wp2b-sea', 'background-color'),
      land: map.getPaintProperty('r3-wp2b-land-wash', 'fill-color'),
      landOpacity: map.getPaintProperty('r3-wp2b-land-wash', 'fill-opacity'),
      hillshadeShadow: map.getPaintProperty('r3-wp2b-hillshade', 'hillshade-shadow-color'),
      hillshadeHighlight: map.getPaintProperty('r3-wp2b-hillshade', 'hillshade-highlight-color'),
      hillshadeAccent: map.getPaintProperty('r3-wp2b-hillshade', 'hillshade-accent-color'),
      coastline: map.getPaintProperty('r3-wp2b-coastline', 'line-color'),
      front: map.getPaintProperty('campaign-fronts-core', 'line-color'),
      controlFill: map.getPaintProperty('campaign-territories-fill', 'fill-color')
    };
  });
}

function assertPaintEvidence(evidence) {
  if (!evidence.grading?.applied || evidence.grading.profileId !== 'clean-neutral-v1') {
    throw new Error(`grading runtime evidence missing: ${JSON.stringify(evidence.grading)}`);
  }
  if (evidence.hostGrade !== 'clean-neutral-v1') throw new Error(`host grading marker missing: ${evidence.hostGrade}`);
  if (evidence.sea !== '#19313a') throw new Error(`sea grade mismatch: ${evidence.sea}`);
  if (evidence.land !== '#958d77') throw new Error(`land grade mismatch: ${evidence.land}`);
  if (evidence.hillshadeShadow !== '#242321') throw new Error(`hillshade shadow mismatch: ${evidence.hillshadeShadow}`);
  if (evidence.hillshadeHighlight !== '#eee7d8') throw new Error(`hillshade highlight mismatch: ${evidence.hillshadeHighlight}`);
  if (evidence.hillshadeAccent !== '#8a8171') throw new Error(`hillshade accent mismatch: ${evidence.hillshadeAccent}`);
  if (evidence.coastline !== '#c6c9bc') throw new Error(`coastline mismatch: ${evidence.coastline}`);
  if (evidence.front !== '#ffad66') throw new Error(`operational front colour regressed: ${evidence.front}`);
  const control = JSON.stringify(evidence.controlFill);
  if (!control.includes('#2db8a4') || !control.includes('#7c6669')) {
    throw new Error(`friendly/enemy control semantics changed: ${control}`);
  }
}

try {
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  });
  await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  const host = page.locator('.r3-terrain-prototype');
  await host.waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForFunction(() => (
    document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready'
    && window.__r3MapVisualGrading?.applied === true
    && window.__r3MapVisualGrading?.profileId === 'clean-neutral-v1'
    && Boolean(window.__r3TerrainMap)
  ), null, { timeout: 45000 });

  const collapse = page.getByRole('button', { name: 'Collapse command sidebar' });
  if (await collapse.isVisible()) {
    await collapse.click();
    await page.waitForTimeout(250);
  }

  const paint = await readPaintEvidence();
  assertPaintEvidence(paint);

  const evidence = { schemaVersion: 1, paint, captures: {} };

  await jump([6.5, 51.0], 4.35, 43, -5);
  await host.screenshot({ path: `${outputDir}/theatre-western-central.png` });
  evidence.captures.theatre = { center: [6.5, 51.0], zoom: 4.35, pitch: 43, bearing: -5 };

  await jump([2.8, 50.65], 5.35, 51, -9);
  await page.waitForFunction(() => {
    const diagnostics = window.__r3WorldMiniatures;
    if (!diagnostics) return false;
    const required = ['N-LONDON', 'N-PARIS', 'N-BRUSSELS'];
    return required.every(id => diagnostics.objects.find(object => object.id === id)?.presentationModel === 'authored-gltf');
  }, null, { timeout: 25000 });
  await page.waitForTimeout(350);
  await host.screenshot({ path: `${outputDir}/campaign-london-paris-benelux.png` });
  evidence.captures.lowlands = { center: [2.8, 50.65], zoom: 5.35, pitch: 51, bearing: -9 };

  await jump([8.35, 47.15], 5.4, 53, -7);
  await page.waitForTimeout(500);
  await host.screenshot({ path: `${outputDir}/campaign-alps.png` });
  evidence.captures.alpsCampaign = { center: [8.35, 47.15], zoom: 5.4, pitch: 53, bearing: -7 };

  await jump([8.55, 47.05], 7.7, 56, -15);
  await page.waitForTimeout(500);
  await host.screenshot({ path: `${outputDir}/selected-alps.png` });
  evidence.captures.alpsSelected = { center: [8.55, 47.05], zoom: 7.7, pitch: 56, bearing: -15 };

  const formationEvidence = await page.evaluate(() => window.__r3FormationMiniatures);
  if (!formationEvidence?.pieces.some(piece => piece.visible)) throw new Error('friendly physical formation evidence is not visible');
  evidence.visibleFormationCount = formationEvidence.pieces.filter(piece => piece.visible).length;

  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
