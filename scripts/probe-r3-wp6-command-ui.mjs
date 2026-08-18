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
      mapHeading: rect('.map-heading'),
      mapContext: rect('.map-context-panel'),
      alertGeometry: [...document.querySelectorAll('.operational-alert-strip, .enemy-action-alert, .adviser-alert-strip, .combat-report-alert')].map(node => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          className: node.className,
          position: style.position,
          top: Math.round(box.top * 10) / 10,
          width: Math.round(box.width * 10) / 10,
          height: Math.round(box.height * 10) / 10
        };
      })
    };
  });
}

function assertMapFirstShell(evidence) {
  assert(evidence.topbar, 'command topbar missing');
  assert(evidence.metrics, 'command metrics missing');
  assert(evidence.navigation, 'command navigation missing');
  assert(evidence.mapPanel, 'map panel missing');
  assert(evidence.topbar.height <= 54, `topbar still too tall: ${evidence.topbar.height}px`);
  assert(evidence.metrics.height <= 46, `metrics still too tall: ${evidence.metrics.height}px`);
  assert(evidence.navigation.width <= 74, `navigation rail still too wide: ${evidence.navigation.width}px`);
  assert(evidence.mapPanel.y <= 125, `map starts too low in first viewport: ${evidence.mapPanel.y}px`);
  assert(evidence.eyebrow?.display === 'none', `runtime programme eyebrow is still visible: ${JSON.stringify(evidence.eyebrow)}`);
  assert(evidence.mapHeading?.position === 'absolute', `map heading is not an over-map HUD: ${JSON.stringify(evidence.mapHeading)}`);
  for (const alert of evidence.alertGeometry) {
    assert(alert.position === 'fixed', `alert still consumes document flow: ${JSON.stringify(alert)}`);
    assert(alert.height <= 62, `alert is not compact by default: ${JSON.stringify(alert)}`);
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
    schemaVersion: 1,
    head: process.env.GITHUB_SHA ?? null,
    captures: {},
    shell: {}
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
  await page.waitForFunction(() => {
    const portraits = [...document.querySelectorAll('.formation-roster-portrait img')];
    return portraits.length > 0 && portraits.every(image => image.complete && image.naturalWidth > 0);
  }, null, { timeout: 10000 });
  evidence.formations = await page.evaluate(() => ({
    portraitCount: document.querySelectorAll('.formation-roster-portrait').length,
    canonicalImageCount: document.querySelectorAll('.formation-roster-portrait img').length,
    selectedCardArt: getComputedStyle(document.querySelector('.selected-formation-card') ?? document.body, '::before').backgroundImage
  }));
  assert(evidence.formations.portraitCount > 0, 'formation portrait cards were not rendered');
  await page.screenshot({ path: `${outputDir}/forces-1366x768.png`, fullPage: false });
  evidence.captures.forces = 'forces-1366x768.png';

  await page.locator('[data-command-view="engineering"]').click();
  await page.locator('.infrastructure-view').waitFor({ state: 'visible', timeout: 10000 });
  evidence.infrastructure = await page.evaluate(() => ({
    activeCards: document.querySelectorAll('.infrastructure-active-card').length,
    repairTab: Boolean([...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Repair')),
    upgradeTab: Boolean([...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Upgrade'))
  }));
  await page.screenshot({ path: `${outputDir}/infrastructure-1366x768.png`, fullPage: false });
  evidence.captures.infrastructure = 'infrastructure-1366x768.png';

  const fatalConsoleErrors = consoleErrors.filter(message => !/favicon|Failed to load resource.*404/i.test(message));
  evidence.consoleErrors = fatalConsoleErrors;
  assert(fatalConsoleErrors.length === 0, `browser console errors: ${fatalConsoleErrors.join(' | ')}`);

  fs.writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
