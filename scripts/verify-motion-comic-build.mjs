import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyAssetPath = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v2-sprite.webp');
const page1Directory = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v3', 'page1');
const PAGE_1_ASSETS = [
  ['panel-01-world-that-remains.webp', 9116],
  ['panel-02-human-cost.webp', 16464],
  ['panel-03-final-command.webp', 17470],
  ['panel-04-anomaly.webp', 8548],
  ['panel-05-hypothesis.webp', 25840],
  ['panel-06-order.webp', 8994]
];

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

async function verifyWebP(assetPath, expectedSize) {
  const fileStats = await stat(assetPath);
  const bytes = await readFile(assetPath);

  if (!isWebP(bytes) || (expectedSize !== undefined && fileStats.size !== expectedSize)) {
    throw new Error(`The production bundle does not contain a valid asset at ${assetPath}.`);
  }

  return fileStats.size;
}

const legacySize = await verifyWebP(legacyAssetPath);
if (legacySize < 10_000) {
  throw new Error('The production bundle does not contain a valid Motion Comic V2 fallback sprite.');
}
console.log(`Verified dist/generated/motion-comic-v2-sprite.webp (${legacySize} bytes).`);

for (const [fileName, expectedSize] of PAGE_1_ASSETS) {
  const size = await verifyWebP(path.join(page1Directory, fileName), expectedSize);
  console.log(`Verified dist/generated/motion-comic-v3/page1/${fileName} (${size} bytes).`);
}
