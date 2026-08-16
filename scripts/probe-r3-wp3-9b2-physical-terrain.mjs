import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP39B2_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP39B2_ARTIFACTS ?? 'artifacts/r3-wp3-9b2';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });

async function jump(center, zoom, pitch, bearing = 0) {
  await page.evaluate(({ center, zoom, pitch, bearing }) => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    map.jumpTo({ center, zoom, pitch, bearing });
  }, { center, zoom, pitch, bearing });
  await page.waitForTimeout(750);
}

async function waitForCities(ids) {
  await page.waitForFunction(required => {
    const diagnostics = window.__r3WorldMiniatures;
    if (!diagnostics) return false;
    return required.every(id => diagnostics.objects.find(object => object.id === id)?.presentationModel === 'authored-gltf');
  }, ids, { timeout: 25000 });
}

function containsControllerColours(expression) {
  const value = JSON.stringify(expression);
  return value.includes('#76f2e1') && value.includes('#ff776f');
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
    && window.__r3MapVisualGrading?.coastlineGeometry?.status === '50m-static'
    && window.__r3PhysicalTerrainColour?.status === 'ready'
    && window.__r3TerrainMap?.isSourceLoaded('r3-wp3-9b2-physical-colour') === true
  ), null, { timeout: 45000 });

  const collapse = page.getByRole('button', { name: 'Collapse command sidebar' });
  if (await collapse.isVisible()) {
    await collapse.click();
    await page.waitForTimeout(250);
  }

  const paint = await page.evaluate(() => {
    const map = window.__r3TerrainMap;
    if (!map) throw new Error('terrain map diagnostic unavailable');
    return {
      physical: window.__r3PhysicalTerrainColour,
      grading: window.__r3MapVisualGrading,
      hostPhysical: document.querySelector('.r3-terrain-prototype')?.getAttribute('data-physical-terrain'),
      sourceLoaded: map.isSourceLoaded('r3-wp3-9b2-physical-colour'),
      layerType: map.getLayer('r3-wp3-9b2-physical-colour')?.type,
      rasterOpacity: map.getPaintProperty('r3-wp3-9b2-physical-colour', 'raster-opacity'),
      rasterSaturation: map.getPaintProperty('r3-wp3-9b2-physical-colour', 'raster-saturation'),
      rasterContrast: map.getPaintProperty('r3-wp3-9b2-physical-colour', 'raster-contrast'),
      hillshadeExaggeration: map.getPaintProperty('r3-wp2b-hillshade', 'hillshade-exaggeration'),
      territoryFillOpacity: map.getPaintProperty('campaign-territories-fill', 'fill-opacity'),
      stateWashOpacity: map.getPaintProperty('campaign-territory-state-wash', 'fill-opacity'),
      administrativeBorderOpacity: map.getPaintProperty('campaign-administrative-borders', 'line-opacity'),
      controlBorderColour: map.getPaintProperty('campaign-control-borders', 'line-color'),
      controlGlowColour: map.getPaintProperty('campaign-control-border-glow', 'line-color'),
      frontColour: map.getPaintProperty('campaign-fronts-core', 'line-color')
    };
  });

  if (paint.physical?.status !== 'ready' || paint.physical?.profileId !== 'physical-colour-v1') throw new Error(`physical terrain evidence missing: ${JSON.stringify(paint.physical)}`);
  if (paint.hostPhysical !== 'physical-colour-v1' || !paint.sourceLoaded || paint.layerType !== 'raster') throw new Error(`physical raster did not settle: ${JSON.stringify(paint)}`);
  if (paint.rasterOpacity !== 0.98 || paint.rasterSaturation !== 0.16 || paint.rasterContrast !== 0.1) throw new Error(`physical raster paint mismatch: ${JSON.stringify(paint)}`);
  if (paint.hillshadeExaggeration !== 0.36) throw new Error(`hillshade mismatch: ${paint.hillshadeExaggeration}`);
  if (paint.territoryFillOpacity !== 0 || paint.stateWashOpacity !== 0 || paint.administrativeBorderOpacity !== 0) throw new Error(`political wash regressed: ${JSON.stringify(paint)}`);
  if (!containsControllerColours(paint.controlBorderColour) || !containsControllerColours(paint.controlGlowColour)) throw new Error(`controller colours regressed: ${JSON.stringify(paint)}`);
  if (paint.frontColour !== '#ffad66') throw new Error(`front colour regressed: ${paint.frontColour}`);

  const evidence = { schemaVersion: 2, paint, captures: {} };

  await jump([6.5, 51.0], 4.35, 43, -5);
  await host.screenshot({ path: `${outputDir}/theatre-western-central.png` });
  evidence.captures.theatre = { center: [6.5, 51.0], zoom: 4.35, pitch: 43, bearing: -5 };

  await jump([2.8, 50.65], 5.35, 51, -9);
  await waitForCities(['N-LONDON', 'N-PARIS', 'N-BRUSSELS', 'N-AMSTERDAM']);
  await host.screenshot({ path: `${outputDir}/campaign-channel-france-benelux.png` });
  evidence.captures.lowlands = { center: [2.8, 50.65], zoom: 5.35, pitch: 51, bearing: -9 };

  await jump([9.5, 50.1], 5.5, 50, -6);
  await waitForCities(['N-FRANKFURT', 'N-STRASBOURG', 'N-STUTTGART']);
  await host.screenshot({ path: `${outputDir}/campaign-central-europe.png` });
  evidence.captures.centralEurope = { center: [9.5, 50.1], zoom: 5.5, pitch: 50, bearing: -6 };

  await jump([8.35, 47.15], 5.4, 53, -7);
  await waitForCities(['N-BERN', 'N-CHUR', 'N-INNSBRUCK']);
  await host.screenshot({ path: `${outputDir}/campaign-alps.png` });
  evidence.captures.alpsCampaign = { center: [8.35, 47.15], zoom: 5.4, pitch: 53, bearing: -7 };

  await jump([8.55, 47.05], 7.7, 56, -15);
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
