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
    localStorage.removeItem('future-conquest-alert-preferences-v1');
  });

  await page.goto(`${origin}/?terrain=0`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.command-workspace').waitFor({ state: 'visible', timeout: 15000 });

  await page.evaluate(() => {
    const alert = document.createElement('section');
    alert.className = 'operational-alert-strip warning wp6-notification-probe';
    alert.setAttribute('aria-live', 'polite');
    alert.innerHTML = '<div><small>LOGISTICS WARNING</small><strong>Synthetic logistics warning A</strong></div><div class="supply-diagnostic-copy"><strong>Supply route degraded</strong><span>Long diagnostic detail that must never be physically clipped by the alert container.</span></div>';
    document.body.append(alert);
  });

  const alert = page.locator('.wp6-notification-probe');
  const dismiss = alert.locator('.wp6-alert-dismiss');
  await dismiss.waitFor({ state: 'visible', timeout: 5000 });
  await alert.locator('.r4-alert-preference-actions').waitFor({ state: 'visible', timeout: 5000 });

  const initial = await alert.evaluate(node => {
    const style = getComputedStyle(node);
    const actions = node.querySelector('.r4-alert-preference-actions');
    return {
      managed: node.getAttribute('data-wp6-notification-managed'),
      r4Managed: node.getAttribute('data-r4-alert-managed'),
      hidden: node.hidden,
      label: node.querySelector('.wp6-alert-dismiss')?.getAttribute('aria-label'),
      title: node.querySelector('.wp6-alert-dismiss')?.getAttribute('title'),
      maxHeight: style.maxHeight,
      overflow: style.overflow,
      preferenceDisplay: actions ? getComputedStyle(actions).display : null,
      details: node.querySelector('.r4-alert-details')?.textContent,
      suppress: node.querySelector('.r4-alert-suppress')?.textContent,
      mute: node.querySelector('.r4-alert-mute-all')?.textContent
    };
  });
  assert(initial.managed === 'true', `notification was not managed: ${JSON.stringify(initial)}`);
  assert(initial.r4Managed === 'true', `R4 notification manager did not attach: ${JSON.stringify(initial)}`);
  assert(initial.hidden === false, 'new notification started hidden');
  assert(initial.label === 'Dismiss logistics warning', `dismiss control has wrong accessible label: ${initial.label}`);
  assert(initial.title === 'Dismiss until this warning changes', `dismiss control has wrong title: ${initial.title}`);
  assert(initial.maxHeight === 'none', `alert is still physically height-clipped: ${initial.maxHeight}`);
  assert(initial.overflow === 'visible', `alert still clips overflow: ${initial.overflow}`);
  assert(initial.preferenceDisplay === 'flex', `alert preference controls are not persistently visible: ${initial.preferenceDisplay}`);
  assert(initial.details === 'Details', 'explicit Details control is missing');
  assert(initial.suppress?.includes('Don’t show this alert again'), 'per-alert suppression control is missing');
  assert(initial.mute === 'Mute all alerts', 'global mute action is missing from alert');

  const settings = page.locator('.r4-alert-settings');
  await settings.waitFor({ state: 'visible', timeout: 5000 });
  assert((await settings.locator('summary').textContent()) === 'Alerts', 'always-visible Alerts settings control is missing');

  await settings.locator('summary').click();
  const globalMute = settings.getByLabel('Mute all passive alerts');
  await globalMute.check();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === true);
  assert((await settings.locator('summary').textContent()) === 'Alerts off', 'global alert mute did not update the persistent control');
  await globalMute.uncheck();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === false);
  await settings.locator('summary').click();

  await page.getByRole('button', { name: 'Forces', exact: true }).click();
  await page.locator('.forces-view').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === true);
  const offMapDisplay = await alert.evaluate(node => getComputedStyle(node).display);
  assert(offMapDisplay === 'none', `passive alert remained visible away from the Command Map: ${offMapDisplay}`);

  await page.getByRole('button', { name: 'Command map', exact: true }).click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === false);

  const suppressCheckbox = alert.locator('.r4-alert-suppress input');
  await suppressCheckbox.check();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === true);
  const storedPreference = await page.evaluate(() => localStorage.getItem('future-conquest-alert-preferences-v1'));
  assert(storedPreference?.includes('logistics:warning'), `per-alert suppression was not persisted: ${storedPreference}`);

  await settings.locator('summary').click();
  await settings.getByRole('button', { name: 'Show all alerts again' }).click();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === false);
  await settings.locator('summary').click();

  await page.evaluate(() => {
    const terrain = document.createElement('div');
    terrain.className = 'r3-terrain-prototype r4-formation-probe-host';
    terrain.dataset.physicalFormations = 'ready';
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'r3-terrain-task-group-marker r4-formation-probe';
    marker.setAttribute('aria-label', 'Newly mobilised synthetic formation');
    marker.hidden = true;
    marker.innerHTML = '<strong>TG NEW</strong><span>1.0k</span>';
    terrain.append(marker);
    document.body.append(terrain);
  });

  const formation = page.locator('.r4-formation-probe');
  await page.waitForFunction(() => {
    const marker = document.querySelector('.r4-formation-probe');
    return Boolean(marker && !marker.hidden && marker.classList.contains('r4-formation-selector'));
  });
  const formationEvidence = await formation.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      hidden: node.hidden,
      selectable: node.getAttribute('data-r4-formation-selectable'),
      display: style.display,
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height
    };
  });
  assert(formationEvidence.hidden === false, 'new formation remained hidden by map decluttering');
  assert(formationEvidence.selectable === 'true', 'new formation was not registered as selectable');
  assert(formationEvidence.display === 'grid', `new formation selector is not visible: ${formationEvidence.display}`);
  assert(formationEvidence.pointerEvents === 'auto', `new formation selector cannot receive pointer input: ${formationEvidence.pointerEvents}`);
  assert(Number(formationEvidence.opacity) >= 0.9, `new formation selector is effectively invisible: ${formationEvidence.opacity}`);
  assert(formationEvidence.width >= 40 && formationEvidence.height >= 25, `new formation selector hit area is too small: ${formationEvidence.width}x${formationEvidence.height}`);

  await page.evaluate(() => {
    const selected = document.querySelector('.selected-group.selected-formation-card');
    if (!selected) throw new Error('selected formation card unavailable for cut-off probe');
    const syntheticCondition = document.createElement('span');
    syntheticCondition.className = 'supply-condition cut-off r4-cut-off-probe-condition';
    syntheticCondition.textContent = 'Cut off';
    selected.append(syntheticCondition);
  });

  const cutOffBanner = page.locator('.r4-cut-off-map-banner');
  await cutOffBanner.waitFor({ state: 'visible', timeout: 5000 });
  const cutOffEvidence = await cutOffBanner.evaluate(node => ({
    text: node.textContent,
    display: getComputedStyle(node).display,
    buttons: [...node.querySelectorAll('button')].map(button => button.textContent)
  }));
  assert(cutOffEvidence.display === 'grid', 'cut-off warning is not prominently visible on the map');
  assert(cutOffEvidence.text?.includes('CUT OFF'), 'cut-off map warning does not name the condition');
  assert(cutOffEvidence.text?.includes('Less than 15%'), 'cut-off map warning does not explain the threshold');
  assert(cutOffEvidence.buttons.includes('Show supply routes'), 'cut-off warning cannot expose supply routes');
  assert(cutOffEvidence.buttons.includes('Fix in Logistics'), 'cut-off warning cannot open Logistics recovery controls');

  await dismiss.click();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === true);

  await page.evaluate(() => {
    const alert = document.querySelector('.wp6-notification-probe');
    if (alert) {
      const heading = alert.querySelector('strong');
      if (heading) heading.textContent = 'Synthetic logistics warning B';
    }
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

  await alert.locator('.wp6-alert-dismiss').click();
  await page.waitForFunction(() => document.querySelector('.wp6-notification-probe')?.hidden === true);
  await page.evaluate(() => document.querySelector('.wp6-notification-probe')?.remove());
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    const alert = document.createElement('section');
    alert.className = 'operational-alert-strip warning wp6-notification-probe';
    alert.setAttribute('aria-live', 'polite');
    alert.textContent = 'Synthetic logistics warning B';
    document.body.append(alert);
  });

  const recurring = page.locator('.wp6-notification-probe');
  await recurring.locator('.wp6-alert-dismiss').waitFor({ state: 'visible', timeout: 5000 });
  const recurrence = await recurring.evaluate(node => ({
    hidden: node.hidden,
    dismissed: node.getAttribute('data-wp6-dismissed'),
    text: node.textContent
  }));
  assert(recurrence.hidden === false, 'a warning that cleared and later recurred remained permanently dismissed');
  assert(recurrence.dismissed === null, 'a new warning episode inherited the old dismissal marker');

  console.log(JSON.stringify({ initial, formationEvidence, cutOffEvidence, changed, recurrence }, null, 2));
} finally {
  await browser.close();
}
