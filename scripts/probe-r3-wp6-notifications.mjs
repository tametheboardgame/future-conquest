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

  await page.evaluate(() => {
    const alert = document.createElement('section');
    alert.className = 'operational-alert-strip warning wp6-notification-probe';
    alert.setAttribute('aria-live', 'polite');
    alert.textContent = 'Synthetic logistics warning A';
    document.body.append(alert);
  });

  const alert = page.locator('.wp6-notification-probe');
  const dismiss = alert.locator('.wp6-alert-dismiss');
  await dismiss.waitFor({ state: 'visible', timeout: 5000 });

  const initial = await alert.evaluate(node => ({
    managed: node.getAttribute('data-wp6-notification-managed'),
    hidden: node.hidden,
    label: node.querySelector('.wp6-alert-dismiss')?.getAttribute('aria-label'),
    title: node.querySelector('.wp6-alert-dismiss')?.getAttribute('title')
  }));
  assert(initial.managed === 'true', `notification was not managed: ${JSON.stringify(initial)}`);
  assert(initial.hidden === false, 'new notification started hidden');
  assert(initial.label === 'Dismiss logistics warning', `dismiss control has wrong accessible label: ${initial.label}`);
  assert(initial.title === 'Dismiss until this warning changes', `dismiss control has wrong title: ${initial.title}`);

  await dismiss.click();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === true);

  await page.evaluate(() => {
    const alert = document.querySelector('.wp6-notification-probe');
    if (alert) alert.textContent = 'Synthetic logistics warning B';
  });

  await page.waitForFunction(() => {
    const alert = document.querySelector('.wp6-notification-probe');
    return Boolean(alert && !alert.hidden && alert.querySelector('.wp6-alert-dismiss'));
  });

  const changed = await alert.evaluate(node => ({
    hidden: node.hidden,
    dismissed: node.getAttribute('data-wp6-dismissed'),
    text: node.textContent
  }));
  assert(changed.hidden === false, 'changed warning did not reappear');
  assert(changed.dismissed === null, 'changed warning retained dismissed state');
  assert(changed.text?.includes('Synthetic logistics warning B'), 'changed warning content was lost');

  console.log(JSON.stringify({ initial, changed }, null, 2));
} finally {
  await browser.close();
}
