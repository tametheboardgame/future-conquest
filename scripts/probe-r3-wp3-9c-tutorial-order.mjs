import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP39C_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP39C_ARTIFACTS ?? 'artifacts/r3-wp3-9c';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => {
    localStorage.setItem('future-conquest:intro-seen:v3', 'true');
    localStorage.removeItem('future-conquest-tutorial-seen-v1');
    localStorage.removeItem('future-conquest-tutorial-replay-v1');
    sessionStorage.removeItem('future-conquest:r3-wp39c-arrival-played');
  });

  await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('.r3-portal-arrival').waitFor({ state: 'visible', timeout: 60000 });

  const duringArrival = await page.evaluate(() => ({
    portalPresent: Boolean(document.querySelector('.r3-portal-arrival')),
    portalPhase: document.querySelector('.r3-portal-arrival')?.getAttribute('data-phase') ?? null,
    tutorialCount: document.querySelectorAll('.tutorial-guide').length,
    arrivalClass: document.querySelector('.startup-game-shell')?.classList.contains('portal-arrival-active') ?? false,
    formationsWithheld: document.documentElement.dataset.r3WithholdFormations === 'true'
  }));

  if (!duringArrival.portalPresent) throw new Error('portal was not present for a first-time new campaign');
  if (duringArrival.tutorialCount !== 0) throw new Error('guided tutorial mounted before portal arrival completed');
  if (!duringArrival.arrivalClass) throw new Error('portal arrival presentation gate was not active while portal was visible');
  if (!duringArrival.formationsWithheld) throw new Error('formations were not withheld during first-time portal opening');

  await page.screenshot({ path: `${outputDir}/tutorial-order-portal-first.png`, fullPage: true });

  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 15000 });
  await page.locator('.tutorial-guide').waitFor({ state: 'visible', timeout: 10000 });

  const afterArrival = await page.evaluate(() => ({
    portalCount: document.querySelectorAll('.r3-portal-arrival').length,
    tutorialCount: document.querySelectorAll('.tutorial-guide').length,
    arrivalClass: document.querySelector('.startup-game-shell')?.classList.contains('portal-arrival-active') ?? false,
    formationsWithheld: document.documentElement.dataset.r3WithholdFormations === 'true',
    commandMapVisible: Boolean(document.querySelector('.command-map-workspace'))
  }));

  if (afterArrival.portalCount !== 0) throw new Error('portal remained mounted when tutorial began');
  if (afterArrival.tutorialCount !== 1) throw new Error('first-time tutorial did not begin after portal completion');
  if (afterArrival.arrivalClass) throw new Error('portal arrival presentation gate remained active after completion');
  if (afterArrival.formationsWithheld) throw new Error('formations remained withheld when tutorial began');
  if (!afterArrival.commandMapVisible) throw new Error('tutorial began away from the command map');

  await page.screenshot({ path: `${outputDir}/tutorial-order-tutorial-second.png`, fullPage: true });

  await page.getByRole('button', { name: 'Skip tutorial', exact: true }).click();
  await page.locator('.tutorial-guide').waitFor({ state: 'detached', timeout: 5000 });
  await page.locator('[data-command-view="campaign"]').click();
  await page.getByRole('button', { name: 'New campaign', exact: true }).click();
  await page.locator('.command-map-workspace').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('.r3-portal-arrival').waitFor({ state: 'visible', timeout: 60000 });

  const secondCampaign = await page.evaluate(() => ({
    portalPresent: Boolean(document.querySelector('.r3-portal-arrival')),
    tutorialCount: document.querySelectorAll('.tutorial-guide').length,
    formationsWithheld: document.documentElement.dataset.r3WithholdFormations === 'true'
  }));

  if (!secondCampaign.portalPresent) throw new Error('subsequent new campaign did not replay portal arrival');
  if (secondCampaign.tutorialCount !== 0) throw new Error('completed tutorial replayed during subsequent portal arrival');
  if (!secondCampaign.formationsWithheld) throw new Error('subsequent new-campaign formations were visible before materialisation');

  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 15000 });
  await page.waitForTimeout(250);
  if (await page.locator('.tutorial-guide').count()) throw new Error('completed tutorial replayed after subsequent portal completion');

  const evidence = {
    schemaVersion: 1,
    firstCampaign: { duringArrival, afterArrival },
    secondCampaign,
    portalBeforeTutorial: true,
    tutorialReleasedAfterPortal: true,
    subsequentNewCampaignPortalReplay: true,
    completedTutorialSuppressed: true
  };
  fs.writeFileSync(`${outputDir}/tutorial-order-evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
