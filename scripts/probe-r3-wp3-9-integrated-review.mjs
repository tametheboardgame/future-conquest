import fs from 'node:fs';
import { chromium } from 'playwright';

const origin = process.env.R3_WP39_REVIEW_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir = process.env.R3_WP39_REVIEW_ARTIFACTS ?? 'artifacts/r3-wp3-9-integrated';
fs.mkdirSync(outputDir, { recursive: true });

const INTRO_STORAGE_KEY = 'future-conquest:intro-seen:v3';
const TUTORIAL_SEEN_STORAGE_KEY = 'future-conquest-tutorial-seen-v1';
const TUTORIAL_REPLAY_STORAGE_KEY = 'future-conquest-tutorial-replay-v1';
const ARRIVAL_PRESENTATION_KEY = 'future-conquest:r3-wp39c-arrival-played';

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(({ introKey, tutorialSeenKey, tutorialReplayKey, arrivalKey }) => {
    localStorage.setItem(introKey, 'true');
    localStorage.removeItem(tutorialSeenKey);
    localStorage.removeItem(tutorialReplayKey);
    sessionStorage.removeItem(arrivalKey);
  }, {
    introKey: INTRO_STORAGE_KEY,
    tutorialSeenKey: TUTORIAL_SEEN_STORAGE_KEY,
    tutorialReplayKey: TUTORIAL_REPLAY_STORAGE_KEY,
    arrivalKey: ARRIVAL_PRESENTATION_KEY
  });

  await page.goto(`${origin}/?terrain=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'BEGIN CAMPAIGN', exact: true }).click();
  await page.locator('.startup-game-shell').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('.r3-portal-arrival').waitFor({ state: 'visible', timeout: 60000 });

  const duringArrival = await page.evaluate(() => ({
    portalPhase: document.querySelector('.r3-portal-arrival')?.getAttribute('data-phase') ?? null,
    tutorialCount: document.querySelectorAll('.tutorial-guide').length,
    shellArrivalActive: document.querySelector('.startup-game-shell')?.classList.contains('portal-arrival-active') ?? false,
    mapVisible: Boolean(document.querySelector('.command-map-workspace')),
    physicalFormationStatus: document.querySelector('[data-physical-formations]')?.getAttribute('data-physical-formations') ?? null,
    formationsWithheld: document.documentElement.dataset.r3WithholdFormations === 'true'
  }));

  if (!duringArrival.mapVisible) throw new Error('new campaign did not land on the command map before the arrival sequence');
  if (duringArrival.tutorialCount !== 0) throw new Error('guided tutorial appeared before the portal arrival completed');
  if (!duringArrival.shellArrivalActive) throw new Error('game shell did not expose portal-arrival-active while the arrival was visible');
  if (!duringArrival.formationsWithheld) throw new Error('physical formations were not withheld during the opening arrival beat');

  await page.screenshot({ path: `${outputDir}/01-portal-before-tutorial.png`, fullPage: true });

  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 15000 });
  await page.locator('.tutorial-guide').waitFor({ state: 'visible', timeout: 10000 });

  const afterArrival = await page.evaluate(() => ({
    portalCount: document.querySelectorAll('.r3-portal-arrival').length,
    tutorialCount: document.querySelectorAll('.tutorial-guide').length,
    shellArrivalActive: document.querySelector('.startup-game-shell')?.classList.contains('portal-arrival-active') ?? false,
    formationsWithheld: document.documentElement.dataset.r3WithholdFormations === 'true',
    commandView: document.querySelector('[data-command-view][aria-current="page"]')?.getAttribute('data-command-view')
      ?? (document.querySelector('.command-map-workspace') ? 'map' : null)
  }));

  if (afterArrival.portalCount !== 0) throw new Error('portal remained mounted after the arrival sequence completed');
  if (afterArrival.tutorialCount !== 1) throw new Error('first-time guided tutorial did not appear after the portal closed');
  if (afterArrival.shellArrivalActive) throw new Error('portal-arrival-active gate remained set after the arrival completed');
  if (afterArrival.formationsWithheld) throw new Error('physical formations remained withheld after the arrival completed');
  if (afterArrival.commandView !== 'map') throw new Error(`tutorial began on ${afterArrival.commandView ?? 'no'} command view instead of the map`);

  await page.screenshot({ path: `${outputDir}/02-tutorial-after-portal.png`, fullPage: true });

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

  if (!secondCampaign.portalPresent) throw new Error('a subsequent genuinely new campaign did not replay the portal arrival');
  if (secondCampaign.tutorialCount !== 0) throw new Error('completed tutorial replayed during a subsequent new-campaign arrival');
  if (!secondCampaign.formationsWithheld) throw new Error('second campaign formations were visible before materialisation');

  await page.locator('.r3-portal-arrival').waitFor({ state: 'detached', timeout: 15000 });
  await page.waitForTimeout(250);
  if (await page.locator('.tutorial-guide').count()) throw new Error('completed tutorial replayed after the second campaign portal closed');

  const evidence = {
    schemaVersion: 1,
    firstCampaign: { duringArrival, afterArrival },
    secondCampaign,
    assertions: {
      portalBeforeTutorial: true,
      tutorialAfterPortal: true,
      everyNewCampaignGetsArrival: true,
      completedTutorialDoesNotReplay: true
    }
  };
  fs.writeFileSync(`${outputDir}/cross-package-evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
