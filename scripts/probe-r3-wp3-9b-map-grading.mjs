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
  await page.waitForTimeout(650);
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
      coastlineOpacity: map.getPaintProperty('r3-wp2b-coastline', 'line-opacity'),
      administrativeBorderOpacity: map.getPaintProperty('campaign-administrative-borders', 'line-opacity'),
      territoryFillOpacity: map.getPaintProperty('campaign-territories-fill', 'fill-opacity'),
      stateWashOpacity: map.getPaintProperty('campaign-territory-state-wash', 'fill-opacity'),
      controlBorder: {
        colour: map.getPaintProperty('campaign-control-borders', 'line-color'),
        opacity: map.getPaintProperty('campaign-control-borders', 'line-opacity'),
        width: map.getPaintProperty('campaign-control-borders', 'line-width')
      },
      controlGlow: map.getLayer('campaign-control-border-glow') ? {
        colour: map.getPaintProperty('campaign-control-border-glow', 'line-color'),
        opacity: map.getPaintProperty('campaign-control-border-glow', 'line-opacity'),
        width: map.getPaintProperty('campaign-control-border-glow', 'line-width'),
        blur: map.getPaintProperty('campaign-control-border-glow', 'line-blur')
      } : null,
      stateOutline: map.getPaintProperty('campaign-state-outline', 'line-color'),
      front: map.getPaintProperty('campaign-fronts-core', 'line-color')
    };
  });
}

function includesControllerColours(expression) {
  const serialised = JSON.stringify(expression);
  return serialised.includes('#76f2e1') && serialised.includes('#ff776f');
}

function assertPaintEvidence(evidence) {
  if (!evidence.grading?.applied || evidence.grading.profileId !== 'clean-border-v2') {
    throw new Error(`grading runtime evidence missing: ${JSON.stringify(evidence.grading)}`);
  }
  if (evidence.hostGrade !== 'clean-border-v2') throw new Error(`host grading marker missing: ${evidence.hostGrade}`);
  if (evidence.sea !== '#19313a') throw new Error(`sea grade mismatch: ${evidence.sea}`);
  if (evidence.land !== '#777a72') throw new Error(`land grade mismatch: ${evidence.land}`);
  if (evidence.landOpacity !== 1) throw new Error(`land must be an opaque surface rather than a translucent wash: ${JSON.stringify(evidence.landOpacity)}`);
  if (evidence.hillshadeShadow !== '#242321') throw new Error(`hillshade shadow mismatch: ${evidence.hillshadeShadow}`);
  if (evidence.hillshadeHighlight !== '#eee7d8') throw new Error(`hillshade highlight mismatch: ${evidence.hillshadeHighlight}`);
  if (evidence.hillshadeAccent !== '#8a8171') throw new Error(`hillshade accent mismatch: ${evidence.hillshadeAccent}`);
  if (evidence.coastline !== '#b9c0b8' || evidence.coastlineOpacity !== 0.13) {
    throw new Error(`coastline treatment mismatch: ${JSON.stringify({ colour: evidence.coastline, opacity: evidence.coastlineOpacity })}`);
  }
  if (evidence.administrativeBorderOpacity !== 0) throw new Error(`generic administrative overlay still visible: ${JSON.stringify(evidence.administrativeBorderOpacity)}`);
  if (evidence.territoryFillOpacity !== 0) throw new Error(`broad controller fill still visible: ${JSON.stringify(evidence.territoryFillOpacity)}`);
  if (evidence.stateWashOpacity !== 0) throw new Error(`broad operational state wash still visible: ${JSON.stringify(evidence.stateWashOpacity)}`);
  if (!includesControllerColours(evidence.controlBorder.colour)) throw new Error(`controller core colours missing: ${JSON.stringify(evidence.controlBorder.colour)}`);
  if (!evidence.controlGlow || !includesControllerColours(evidence.controlGlow.colour)) throw new Error(`controller glow layer missing or miscoloured: ${JSON.stringify(evidence.controlGlow)}`);
  if (evidence.front !== '#ffad66') throw new Error(`operational front colour regressed: ${evidence.front}`);
  const stateOutline = JSON.stringify(evidence.stateOutline);
  if (!stateOutline.includes('#ff7a63') || !stateOutline.includes('#effffc')) {
    throw new Error(`state outline semantics regressed: ${stateOutline}`);
  }
  const ownership = evidence.grading.ownershipTreatment;
  if (!ownership || ownership.territoryFillOpacity !== 0 || ownership.administrativeBorderOpacity !== 0 || ownership.stateWashOpacity !== 0) {
    throw new Error(`runtime ownership evidence does not prove wash removal: ${JSON.stringify(ownership)}`);
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
    && window.__r3MapVisualGrading?.profileId === 'clean-border-v2'
    && Boolean(window.__r3TerrainMap)
  ), null, { timeout: 45000 });

  const collapse = page.getByRole('button', { name: 'Collapse command sidebar' });
  if (await collapse.isVisible()) {
    await collapse.click();
    await page.waitForTimeout(250);
  }

  const paint = await readPaintEvidence();
  assertPaintEvidence(paint);

  const evidence = { schemaVersion: 2, paint, captures: {} };

  await jump([6.5, 51.0], 4.35, 43, -5);
  await host.screenshot({ path: `${outputDir}/theatre-western-central.png` });
  evidence.captures.theatre = { center: [6.5, 51.0], zoom: 4.35, pitch: 43, bearing: -5 };

  // Direct regression view for the product-owner report: Atlantic/Channel
  // shorelines must read as geography, not as stacked translucent polygons.
  await jump([-0.7, 48.45], 5.25, 49, -8);
  await page.waitForTimeout(400);
  await host.screenshot({ path: `${outputDir}/campaign-france-atlantic-channel.png` });
  evidence.captures.atlanticChannel = { center: [-0.7, 48.45], zoom: 5.25, pitch: 49, bearing: -8 };

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
