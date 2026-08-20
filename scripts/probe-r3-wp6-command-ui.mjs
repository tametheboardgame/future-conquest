import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP6_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP6_ARTIFACTS ?? 'artifacts/r3-wp6';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1900, height: 829 }, reducedMotion: 'reduce' });
const consoleErrors = [];
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => consoleErrors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readShellEvidence() {
  return page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        x: Math.round(box.x * 10) / 10,
        y: Math.round(box.y * 10) / 10,
        right: Math.round(box.right * 10) / 10,
        bottom: Math.round(box.bottom * 10) / 10,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        display: style.display,
        position: style.position,
        overflow: style.overflow
      };
    };

    return {
      viewport: { width: innerWidth, height: innerHeight },
      topbar: rect('.command-topbar'),
      eyebrow: rect('.command-topbar .eyebrow'),
      metrics: rect('.command-metrics'),
      workspace: rect('.command-workspace'),
      navigation: rect('.command-navigation'),
      mapPanel: rect('.map-panel'),
      mapFrame: rect('.europe-map-frame'),
      terrainShell: rect('.r3-terrain-prototype-shell'),
      terrain: rect('.r3-terrain-prototype'),
      mapHeading: rect('.map-heading'),
      mapContext: rect('.map-context-panel'),
      alertGeometry: [...document.querySelectorAll('.operational-alert-strip, .enemy-action-alert, .adviser-alert-strip, .combat-report-alert')].map(node => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          className: node.className,
          position: style.position,
          left: Math.round(box.left * 10) / 10,
          right: Math.round(box.right * 10) / 10,
          top: Math.round(box.top * 10) / 10,
          width: Math.round(box.width * 10) / 10,
          height: Math.round(box.height * 10) / 10,
          maxHeight: style.maxHeight,
          overflow: style.overflow
        };
      })
    };
  });
}

function assertMapFirstShell(evidence) {
  const mapSurface = evidence.terrainShell ?? evidence.mapFrame ?? evidence.terrain;
  assert(evidence.topbar, 'command topbar missing');
  assert(evidence.metrics, 'command metrics missing');
  assert(evidence.navigation, 'command navigation missing');
  assert(evidence.mapPanel, 'map panel missing');
  assert(mapSurface, 'map surface missing');
  assert(evidence.topbar.height <= 54, `topbar still too tall: ${evidence.topbar.height}px`);
  assert(evidence.metrics.height <= 46, `metrics still too tall: ${evidence.metrics.height}px`);
  assert(evidence.navigation.width <= 104, `navigation rail exceeded bounded WP6.6 width: ${evidence.navigation.width}px`);
  assert(evidence.mapPanel.y <= 125, `map starts too low in first viewport: ${evidence.mapPanel.y}px`);
  assert(mapSurface.height >= evidence.mapPanel.height - 4, `map does not fill primary stage: surface ${mapSurface.height}px / panel ${evidence.mapPanel.height}px`);
  if (evidence.terrain) assert(evidence.terrain.height >= evidence.mapPanel.height - 4, `terrain does not fill primary stage: terrain ${evidence.terrain.height}px / panel ${evidence.mapPanel.height}px`);
  assert(evidence.eyebrow?.display === 'none', `runtime programme eyebrow is still visible: ${JSON.stringify(evidence.eyebrow)}`);
  assert(evidence.mapHeading?.position === 'absolute', `map heading is not an over-map HUD: ${JSON.stringify(evidence.mapHeading)}`);
  for (const alert of evidence.alertGeometry) {
    assert(alert.position === 'fixed', `alert still consumes document flow: ${JSON.stringify(alert)}`);
    assert(alert.height <= 120, `collapsed alert is too tall: ${JSON.stringify(alert)}`);
    assert(alert.maxHeight === 'none', `alert still uses hard height clipping: ${JSON.stringify(alert)}`);
    assert(alert.overflow === 'visible', `alert still clips its contents: ${JSON.stringify(alert)}`);
    if (evidence.mapContext) assert(alert.right <= evidence.mapContext.x - 4, `map alert obscures context panel: ${JSON.stringify(alert)}`);
  }
}

async function menuIconEvidence(selector) {
  return page.evaluate(menuSelector => [...document.querySelectorAll(`${menuSelector} button`)].map(button => ({
    label: button.textContent?.trim() ?? '',
    backgroundImage: getComputedStyle(button, '::before').backgroundImage,
    captionDisplay: getComputedStyle(button.querySelector('span') ?? button).display
  })), selector);
}

function assertIconMenu(items, expectedCount, label) {
  assert(items.length >= expectedCount, `${label} menu has too few items: ${items.length}`);
  for (const item of items.slice(0, expectedCount)) {
    assert(/data:image\/svg\+xml/.test(item.backgroundImage), `${label} item has no pictogram: ${JSON.stringify(item)}`);
    assert(item.label.length > 0, `${label} item lost its visible/accessibility label`);
  }
}

try {
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  });

  await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.command-workspace').waitFor({ state: 'visible', timeout: 45000 });
  await page.locator('.r3-terrain-prototype').waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status') === 'ready', null, { timeout: 45000 });
  await page.waitForTimeout(500);

  const evidence = {
    schemaVersion: 4,
    head: process.env.GITHUB_SHA ?? null,
    captures: {},
    shell: {},
    specialistMenus: {},
    specialistSurfaces: {}
  };

  const largeShell = await readShellEvidence();
  assertMapFirstShell(largeShell);
  evidence.shell.large = largeShell;
  await page.screenshot({ path: `${outputDir}/command-map-1900x829.png`, fullPage: false });
  evidence.captures.map1900 = 'command-map-1900x829.png';

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(300);
  const compactShell = await readShellEvidence();
  assertMapFirstShell(compactShell);
  evidence.shell.compact = compactShell;
  await page.screenshot({ path: `${outputDir}/command-map-1366x768.png`, fullPage: false });
  evidence.captures.map1366 = 'command-map-1366x768.png';

  await page.locator('[data-command-view="forces"]').click();
  await page.locator('.formation-roster').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('.formation-armour-miniature').first().waitFor({ state: 'visible', timeout: 10000 });
  evidence.formations = await page.evaluate(() => {
    const miniature = document.querySelector('.formation-armour-miniature');
    const miniatureBox = miniature?.getBoundingClientRect();
    const selected = document.querySelector('.selected-formation-card');
    return {
      portraitCount: document.querySelectorAll('.formation-roster-portrait').length,
      miniatureCount: document.querySelectorAll('.formation-armour-miniature').length,
      damageMarkCount: document.querySelectorAll('.formation-armour-miniature .armour-damage').length,
      selectedCardArt: getComputedStyle(selected ?? document.body, '::before').backgroundImage,
      firstMiniature: miniature && miniatureBox ? {
        width: Math.round(miniatureBox.width * 10) / 10,
        height: Math.round(miniatureBox.height * 10) / 10
      } : null
    };
  });
  assert(evidence.formations.portraitCount > 0, 'formation portrait cards were not rendered');
  assert(evidence.formations.miniatureCount === evidence.formations.portraitCount, 'formation miniatures do not match portrait cards');
  assert(evidence.formations.firstMiniature?.width > 20 && evidence.formations.firstMiniature?.height > 20, `formation miniature collapsed: ${JSON.stringify(evidence.formations.firstMiniature)}`);
  assert(/data:image\/svg\+xml/.test(evidence.formations.selectedCardArt), 'selected formation inspection is not pictorial');
  await page.screenshot({ path: `${outputDir}/forces-1366x768.png`, fullPage: false });
  evidence.captures.forces = 'forces-1366x768.png';

  await page.locator('[data-command-view="engineering"]').click();
  await page.locator('.infrastructure-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.infrastructure = await page.evaluate(() => ({
    activeCards: document.querySelectorAll('.infrastructure-active-card').length,
    choiceCards: document.querySelectorAll('.infrastructure-choice-card').length,
    repairChoiceArt: getComputedStyle(document.querySelector('.repair-choice') ?? document.body, '::before').backgroundImage,
    buildChoiceArt: getComputedStyle(document.querySelector('.build-choice') ?? document.body, '::before').backgroundImage,
    interdictChoiceArt: getComputedStyle(document.querySelector('.interdict-choice') ?? document.body, '::before').backgroundImage,
    repairTab: Boolean([...document.querySelectorAll('button')].find(button => button.textContent?.trim().startsWith('Repair'))),
    upgradeTab: Boolean([...document.querySelectorAll('button')].find(button => button.textContent?.trim().startsWith('Upgrade')))
  }));
  evidence.specialistMenus.infrastructure = await menuIconEvidence('.infrastructure-tabs');
  assertIconMenu(evidence.specialistMenus.infrastructure, 5, 'Infrastructure');
  assert(evidence.infrastructure.choiceCards >= 3, 'pictorial infrastructure choice cards missing');
  assert(/data:image\/svg\+xml/.test(evidence.infrastructure.repairChoiceArt), 'repair choice art missing');
  assert(/data:image\/svg\+xml/.test(evidence.infrastructure.buildChoiceArt), 'construction choice art missing');
  assert(/data:image\/svg\+xml/.test(evidence.infrastructure.interdictChoiceArt), 'interdiction choice art missing');
  await page.screenshot({ path: `${outputDir}/infrastructure-1366x768.png`, fullPage: false });
  evidence.captures.infrastructure = 'infrastructure-1366x768.png';

  await page.locator('[data-command-view="logistics"]').click();
  await page.locator('.logistics-priority-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.specialistMenus.logistics = await menuIconEvidence('.logistics-tabs');
  assertIconMenu(evidence.specialistMenus.logistics, 4, 'Logistics');
  evidence.specialistSurfaces.logistics = await page.evaluate(() => ({
    healthArt: getComputedStyle(document.querySelector('.logistics-health-panel') ?? document.body, '::before').backgroundImage,
    flowIcons: [...document.querySelectorAll('.logistics-flow-steps article > b')].map(node => getComputedStyle(node).backgroundImage),
    summaryIcons: [...document.querySelectorAll('.logistics-priority-summary > div')].map(node => getComputedStyle(node, '::before').backgroundImage)
  }));
  assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.logistics.healthArt), 'logistics health panel has no pictorial cue');
  assert(evidence.specialistSurfaces.logistics.flowIcons.length >= 3 && evidence.specialistSurfaces.logistics.flowIcons.every(value => /data:image\/svg\+xml/.test(value)), 'supply-flow pictograms missing');
  await page.screenshot({ path: `${outputDir}/logistics-1366x768.png`, fullPage: false });
  evidence.captures.logistics = 'logistics-1366x768.png';

  await page.locator('[data-command-view="operations"]').click();
  await page.locator('.operations-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.specialistSurfaces.operations = await page.evaluate(() => {
    const operation = document.querySelector('.operation-command-card');
    const available = document.querySelector('.available-forces-panel .compact-formation-list button');
    return {
      operationCount: document.querySelectorAll('.operation-command-card').length,
      operationArt: operation ? getComputedStyle(operation, '::before').backgroundImage : null,
      availableFormationArt: available ? getComputedStyle(available, '::before').backgroundImage : null
    };
  });
  if (evidence.specialistSurfaces.operations.operationCount > 0) {
    assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.operations.operationArt), 'operation card pictogram missing');
  }
  assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.operations.availableFormationArt ?? ''), 'available formation pictogram missing');
  await page.screenshot({ path: `${outputDir}/operations-1366x768.png`, fullPage: false });
  evidence.captures.operations = 'operations-1366x768.png';

  await page.locator('[data-command-view="territories"]').click();
  await page.locator('.territories-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.specialistSurfaces.territories = await page.evaluate(() => {
    const card = document.querySelector('.territory-command-card');
    return {
      cardCount: document.querySelectorAll('.territory-command-card').length,
      firstCardArt: card ? getComputedStyle(card, '::before').backgroundImage : null,
      summaryIcons: [...document.querySelectorAll('.territory-summary-strip > div')].map(node => getComputedStyle(node, '::before').backgroundImage)
    };
  });
  assert(evidence.specialistSurfaces.territories.cardCount > 0, 'territory dossier cards missing');
  assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.territories.firstCardArt ?? ''), 'territory dossier pictogram missing');
  await page.screenshot({ path: `${outputDir}/territories-1366x768.png`, fullPage: false });
  evidence.captures.territories = 'territories-1366x768.png';

  await page.locator('[data-command-view="intelligence"]').click();
  await page.locator('.intelligence-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.specialistSurfaces.intelligence = await page.evaluate(() => {
    const panel = document.querySelector('.intelligence-command-grid > .view-panel');
    return {
      panelCount: document.querySelectorAll('.intelligence-command-grid > .view-panel').length,
      firstPanelIcon: panel ? getComputedStyle(panel, '::before').backgroundImage : null
    };
  });
  assert(evidence.specialistSurfaces.intelligence.panelCount > 0, 'intelligence panels missing');
  assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.intelligence.firstPanelIcon ?? ''), 'intelligence category pictogram missing');
  await page.screenshot({ path: `${outputDir}/intelligence-1366x768.png`, fullPage: false });
  evidence.captures.intelligence = 'intelligence-1366x768.png';

  await page.locator('[data-command-view="campaign"]').click();
  await page.locator('.campaign-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.specialistSurfaces.campaign = await page.evaluate(() => {
    const panel = document.querySelector('.campaign-controls-panel');
    const action = document.querySelector('.campaign-file-actions button');
    return {
      controlsArt: panel ? getComputedStyle(panel, '::before').backgroundImage,
      actionIcon: action ? getComputedStyle(action, '::before').backgroundImage : null
    };
  });
  assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.campaign.controlsArt ?? ''), 'campaign control pictogram missing');
  assert(/data:image\/svg\+xml/.test(evidence.specialistSurfaces.campaign.actionIcon ?? ''), 'campaign action pictogram missing');
  await page.screenshot({ path: `${outputDir}/campaign-1366x768.png`, fullPage: false });
  evidence.captures.campaign = 'campaign-1366x768.png';

  const fatalConsoleErrors = consoleErrors.filter(message => !/favicon|Failed to load resource.*404/i.test(message));
  evidence.consoleErrors = fatalConsoleErrors;
  assert(fatalConsoleErrors.length === 0, `browser console errors: ${fatalConsoleErrors.join(' | ')}`);

  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
