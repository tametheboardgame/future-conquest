import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'inherit' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await sleep(2500);
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  // Permanent runtime protection: the terrain canvas/HUD remain present and any
  // operation overlay that the deterministic scenario exposes is non-interactive.
  await page.waitForSelector('canvas, .map-view');
  const protectedSurface = await page.locator('canvas, .map-view').count();
  if (!protectedSurface) throw new Error('protected map surface was not rendered');
  const overlays = page.locator('.r3-wp4-battle-events');
  if (await overlays.count()) {
    const pointerEvents = await overlays.first().evaluate(node => getComputedStyle(node).pointerEvents);
    if (pointerEvents !== 'none') throw new Error('battle overlay captures pointer input');
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
