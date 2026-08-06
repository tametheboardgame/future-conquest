const [pageUrl, expectedSha] = process.argv.slice(2);

if (!pageUrl || !expectedSha) {
  throw new Error('Usage: node scripts/verify-pages-deployment.mjs <page-url> <expected-sha>');
}

const attempts = Number.parseInt(process.env.DEPLOY_VERIFY_ATTEMPTS ?? '30', 10);
const delayMs = Number.parseInt(process.env.DEPLOY_VERIFY_DELAY_MS ?? '10000', 10);

if (!Number.isInteger(attempts) || attempts < 1) {
  throw new Error(`DEPLOY_VERIFY_ATTEMPTS must be a positive integer; received ${process.env.DEPLOY_VERIFY_ATTEMPTS}.`);
}

if (!Number.isInteger(delayMs) || delayMs < 0) {
  throw new Error(`DEPLOY_VERIFY_DELAY_MS must be a non-negative integer; received ${process.env.DEPLOY_VERIFY_DELAY_MS}.`);
}

const siteRoot = pageUrl.endsWith('/') ? pageUrl : `${pageUrl}/`;
const metadataUrl = new URL('build-info.json', siteRoot);
const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString();
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const requestUrl = new URL(metadataUrl);
  requestUrl.searchParams.set('deployment_check', `${runId}-${attempt}`);

  try {
    const response = await fetch(requestUrl, {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate',
        pragma: 'no-cache'
      }
    });

    if (response.ok) {
      const metadata = await response.json();
      const actualSha = typeof metadata.sha === 'string' ? metadata.sha : '';

      if (actualSha === expectedSha) {
        console.log(`Verified GitHub Pages deployment at ${pageUrl}: ${actualSha}`);
        process.exit(0);
      }

      console.log(`Attempt ${attempt}/${attempts}: live SHA is ${actualSha || 'missing'}; expected ${expectedSha}.`);
    } else {
      console.log(`Attempt ${attempt}/${attempts}: ${requestUrl} returned HTTP ${response.status}.`);
    }
  } catch (error) {
    console.log(`Attempt ${attempt}/${attempts}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (attempt < attempts) {
    await sleep(delayMs);
  }
}

throw new Error(`GitHub Pages did not serve commit ${expectedSha} from ${metadataUrl} after ${attempts} attempts.`);
