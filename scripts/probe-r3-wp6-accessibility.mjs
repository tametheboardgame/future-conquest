import { chromium } from 'playwright';

const origin = process.env.R3_WP6_ORIGIN ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.setItem('future-conquest-tutorial-seen-v1', 'true');
  });

  await page.goto(`${origin}/?terrain=0`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.command-workspace').waitFor({ state: 'visible', timeout: 15000 });

  const primary = await page.evaluate(() => [...document.querySelectorAll('.command-navigation [data-command-view]')].map(node => {
    const box = node.getBoundingClientRect();
    const label = node.querySelector('.command-nav-label');
    return {
      view: node.getAttribute('data-command-view'),
      title: node.getAttribute('title'),
      label: label?.textContent?.trim() ?? '',
      labelDisplay: label ? getComputedStyle(label).display : 'missing',
      width: Math.round(box.width),
      height: Math.round(box.height)
    };
  }));

  assert(primary.length === 8, `expected eight primary command views, found ${primary.length}`);
  for (const item of primary) {
    assert(Boolean(item.title), `primary command ${item.view} has no hover title`);
    assert(Boolean(item.label) && item.labelDisplay !== 'none', `primary command ${item.view} has no visible caption`);
    assert(item.width >= 54 && item.height >= 54, `primary command ${item.view} has a small target: ${item.width}x${item.height}`);
  }

  const forces = page.locator('[data-command-view="forces"]');
  await forces.focus();
  const primaryFocus = await forces.evaluate(node => ({
    outlineStyle: getComputedStyle(node).outlineStyle,
    outlineWidth: getComputedStyle(node).outlineWidth
  }));
  assert(primaryFocus.outlineStyle !== 'none' && parseFloat(primaryFocus.outlineWidth) >= 1, `primary keyboard focus is not visible: ${JSON.stringify(primaryFocus)}`);
  await page.keyboard.press('Enter');
  await page.locator('.forces-view').waitFor({ state: 'visible', timeout: 5000 });
  assert(await forces.getAttribute('aria-current') === 'page', 'keyboard activation did not update primary navigation state');

  const logistics = page.locator('[data-command-view="logistics"]');
  await logistics.focus();
  await page.keyboard.press('Enter');
  await page.locator('.logistics-priority-view').waitFor({ state: 'visible', timeout: 5000 });

  const specialist = await page.evaluate(() => [...document.querySelectorAll('.logistics-tabs button')].map(node => {
    const box = node.getBoundingClientRect();
    const label = node.querySelector('span');
    return {
      label: label?.textContent?.trim() ?? '',
      width: Math.round(box.width),
      height: Math.round(box.height),
      current: node.getAttribute('aria-current')
    };
  }));
  assert(specialist.length === 4, `expected four logistics specialist controls, found ${specialist.length}`);
  for (const item of specialist) {
    assert(Boolean(item.label), 'specialist icon control lost its visible caption');
    assert(item.width >= 68 && item.height >= 54, `specialist control is too small: ${item.label} ${item.width}x${item.height}`);
  }

  const formationsTab = page.locator('.logistics-tabs button').filter({ hasText: 'Formations' }).first();
  await formationsTab.focus();
  const focusEvidence = await formationsTab.evaluate(node => ({
    focused: document.activeElement === node,
    outlineStyle: getComputedStyle(node).outlineStyle,
    outlineWidth: getComputedStyle(node).outlineWidth
  }));
  assert(focusEvidence.focused, 'specialist keyboard focus was not retained');
  assert(focusEvidence.outlineStyle !== 'none' && parseFloat(focusEvidence.outlineWidth) >= 1, `specialist keyboard focus is not visible: ${JSON.stringify(focusEvidence)}`);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('.logistics-tabs button')].some(button => button.getAttribute('aria-current') === 'page' && button.textContent?.includes('Formations')));

  const reducedMotion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  assert(reducedMotion, 'reduced-motion browser preference was not active');

  console.log(JSON.stringify({ primary, primaryFocus, specialist, focusEvidence, reducedMotion }, null, 2));
} finally {
  await browser.close();
}
