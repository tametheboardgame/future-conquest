import { createHash } from 'node:crypto';

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
const titleManifestUrl = new URL('title-card-info.json', siteRoot);
const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString();
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const noCacheHeaders = {
  'cache-control': 'no-cache, no-store, must-revalidate',
  pragma: 'no-cache'
};

function cacheBustedUrl(url, suffix) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set('deployment_check', suffix);
  return requestUrl;
}

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

async function verifyTitleCard(attempt) {
  const manifestRequestUrl = cacheBustedUrl(titleManifestUrl, `${runId}-${attempt}-manifest`);
  const manifestResponse = await fetch(manifestRequestUrl, { headers: noCacheHeaders });
  if (!manifestResponse.ok) {
    return `title manifest returned HTTP ${manifestResponse.status}`;
  }

  const manifest = await manifestResponse.json();
  const assetPath = typeof manifest.path === 'string' ? manifest.path : '';
  const expectedBytes = Number.isInteger(manifest.bytes) ? manifest.bytes : 0;
  const expectedHash = typeof manifest.sha256 === 'string' ? manifest.sha256 : '';
  if (!assetPath || expectedBytes < 1 || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return 'title manifest is incomplete or malformed';
  }

  const assetUrl = cacheBustedUrl(new URL(assetPath, siteRoot), `${runId}-${attempt}-asset`);
  const assetResponse = await fetch(assetUrl, { headers: noCacheHeaders });
  if (!assetResponse.ok) {
    return `title asset returned HTTP ${assetResponse.status}`;
  }

  const bytes = Buffer.from(await assetResponse.arrayBuffer());
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== expectedBytes || !isWebP(bytes) || actualHash !== expectedHash) {
    return `title asset failed integrity: ${bytes.length} bytes, SHA-256 ${actualHash}`;
  }

  return null;
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const requestUrl = cacheBustedUrl(metadataUrl, `${runId}-${attempt}`);

  try {
    const response = await fetch(requestUrl, { headers: noCacheHeaders });

    if (response.ok) {
      const metadata = await response.json();
      const actualSha = typeof metadata.sha === 'string' ? metadata.sha : '';

      if (actualSha === expectedSha) {
        const titleError = await verifyTitleCard(attempt);
        if (!titleError) {
          console.log(`Verified GitHub Pages deployment at ${pageUrl}: ${actualSha}, including the title-card WebP.`);
          process.exit(0);
        }
        console.log(`Attempt ${attempt}/${attempts}: commit is live but ${titleError}.`);
      } else {
        console.log(`Attempt ${attempt}/${attempts}: live SHA is ${actualSha || 'missing'}; expected ${expectedSha}.`);
      }
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

throw new Error(
  `GitHub Pages did not serve commit ${expectedSha} with a verified title card from ${siteRoot} after ${attempts} attempts.`
);
