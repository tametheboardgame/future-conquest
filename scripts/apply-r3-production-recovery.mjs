import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
const oldGate = "  const terrainPrototypeRequested = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('terrain') === '1';";
const newGate = "  const terrainMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('terrain') : null;\n  const terrainPrototypeRequested = terrainMode !== '0';";
if (!app.includes(oldGate)) throw new Error('Expected terrain query gate was not found in App.tsx');
app = app.replace(oldGate, newGate);
app = app.replace('Loading experimental terrain renderer…', 'Loading 3D terrain renderer…');
if (app.includes("get('terrain') === '1'")) throw new Error('Legacy terrain=1 production gate remains in App.tsx');
fs.writeFileSync(appPath, app);

const staticTest = String.raw`const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production terrain is default and SVG is an explicit override', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /const terrainMode = typeof window !== 'undefined' \? new URLSearchParams\(window\.location\.search\)\.get\('terrain'\) : null;/);
  assert.match(app, /const terrainPrototypeRequested = terrainMode !== '0';/);
  assert.doesNotMatch(app, /get\('terrain'\) === '1'/);
  assert.doesNotMatch(app, /Loading experimental terrain renderer/);
  assert.match(app, /Loading 3D terrain renderer/);
});

test('permanent browser gate covers clean production URL and forced SVG fallback', () => {
  const probe = fs.readFileSync('scripts/run-r3-production-default-runtime.mjs', 'utf8');
  assert.match(probe, /page\.goto\('http:\/\/127\.0\.0\.1:4173\/'/);
  assert.match(probe, /fallbackPage\.goto\('http:\/\/127\.0\.0\.1:4173\/\?terrain=0'/);
  assert.match(probe, /r3-terrain-task-group-marker/);
  assert.match(probe, /maplibregl-canvas/);
  assert.match(probe, /europe-map/);
});
`;
fs.writeFileSync('tests/r3-production-coherence.test.cjs', staticTest);

const runtimeProbe = String.raw`import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const prepare = async page => {
  page.on('console', message => console.log('[browser ' + message.type() + '] ' + message.text()));
  page.on('pageerror', error => console.log('[pageerror] ' + (error.stack ?? error.message)));
  await page.addInitScript(() => localStorage.setItem('future-conquest:intro-seen:v3', 'true'));
};
const enterCampaignMap = async page => {
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('[data-command-view="map"]').click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible', timeout: 10000 });
};

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await prepare(page);
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
if (new URL(page.url()).searchParams.has('terrain')) throw new Error('Clean production URL unexpectedly gained a terrain query parameter.');
await enterCampaignMap(page);
const ready = page.locator('.r3-terrain-prototype[data-status="ready"]');
const fallback = page.locator('.r3-terrain-fallback-notice');
await Promise.race([
  ready.waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined),
  fallback.waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined)
]);
if (await fallback.isVisible()) throw new Error('Production-default terrain renderer fell back: ' + await fallback.innerText());
if (!(await ready.isVisible())) throw new Error('Production-default terrain renderer did not become ready.');
if (await page.locator('.maplibregl-canvas').count() < 1) throw new Error('Production-default map has no MapLibre canvas.');
const piece = page.locator('.r3-terrain-task-group-marker').first();
await piece.waitFor({ state: 'visible', timeout: 10000 });
const pieceStyle = await piece.evaluate(element => {
  const style = getComputedStyle(element);
  return {
    position: style.position,
    boxShadow: style.boxShadow,
    accent: style.getPropertyValue('--r3-piece-accent').trim(),
    className: element.className
  };
});
if (pieceStyle.position !== 'absolute' || pieceStyle.boxShadow === 'none' || !pieceStyle.accent) {
  throw new Error('WP3 physical formation-piece styling is not active on production-default terrain: ' + JSON.stringify(pieceStyle));
}
console.log('Production-default terrain + WP3 piece verified:', JSON.stringify(pieceStyle));

const fallbackPage = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await prepare(fallbackPage);
await fallbackPage.goto('http://127.0.0.1:4173/?terrain=0', { waitUntil: 'domcontentloaded', timeout: 30000 });
await enterCampaignMap(fallbackPage);
await fallbackPage.locator('.europe-map').first().waitFor({ state: 'visible', timeout: 10000 });
if (await fallbackPage.locator('.maplibregl-canvas').count() !== 0) throw new Error('?terrain=0 did not force the stable SVG map.');
console.log('Explicit SVG fallback verified with ?terrain=0.');

await browser.close();
`;
fs.writeFileSync('scripts/run-r3-production-default-runtime.mjs', runtimeProbe);

const workflow = String.raw`name: R3 production default terrain gate

on:
  pull_request:
    branches:
      - main
    paths:
      - 'src/App.tsx'
      - 'src/components/TerrainMapPrototype*.tsx'
      - 'src/presentation/r3-terrain-*.ts'
      - 'src/presentation/r3-formation-*.ts'
      - 'src/map-label-hierarchy.css'
      - 'src/r3-terrain-prototype.css'
      - 'public/generated/r3-terrain/**'
      - 'scripts/run-r3-production-default-runtime.mjs'
      - 'tests/r3-production-coherence.test.cjs'
      - '.github/workflows/r3-production-default-terrain.yml'

permissions:
  contents: read

jobs:
  production-default-runtime:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout exact PR head
        uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run production-coherence contract
        run: node --test tests/r3-production-coherence.test.cjs
      - name: Build production game
        run: npm run build
      - name: Install Chromium
        run: |
          npm install --no-save --ignore-scripts playwright@1.55.0
          npx playwright install --with-deps chromium
      - name: Start production preview
        run: |
          npm run preview -- --host 127.0.0.1 --port 4173 > /tmp/future-conquest-vite.log 2>&1 &
          echo $! > /tmp/future-conquest-vite.pid
          for i in {1..30}; do
            if curl -fsS http://127.0.0.1:4173/ >/dev/null; then exit 0; fi
            sleep 1
          done
          cat /tmp/future-conquest-vite.log
          exit 1
      - name: Verify production-default 3D and SVG override
        run: node scripts/run-r3-production-default-runtime.mjs
      - name: Print preview log on failure
        if: failure()
        run: cat /tmp/future-conquest-vite.log || true
`;
fs.writeFileSync('.github/workflows/r3-production-default-terrain.yml', workflow);

console.log('Applied R3 production coherence source/test/workflow changes.');
