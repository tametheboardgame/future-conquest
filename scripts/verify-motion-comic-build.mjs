import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyAssetPath = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v2-sprite.webp');
const page1AssetDirectory = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v3', 'page1');
const PAGE_1_ASSETS = [
  { fileName: 'panel-01-world-that-remains.webp', length: 16_524 },
  { fileName: 'panel-02-human-cost.webp', length: 16_464 },
  { fileName: 'panel-03-final-command.webp', length: 17_470 },
  { fileName: 'panel-04-anomaly.webp', length: 13_008 },
  { fileName: 'panel-05-hypothesis.webp', length: 35_618 },
  { fileName: 'panel-06-order.webp', length: 17_222 }
];

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const legacyStats = await stat(legacyAssetPath);
const legacyBytes = await readFile(legacyAssetPath);
if (!isWebP(legacyBytes) || legacyStats.size < 10_000) {
  throw new Error('The production bundle does not contain a valid Motion Comic V2 fallback WebP asset.');
}

for (const asset of PAGE_1_ASSETS) {
  const assetPath = path.join(page1AssetDirectory, asset.fileName);
  const assetStats = await stat(assetPath);
  const assetBytes = await readFile(assetPath);
  if (!isWebP(assetBytes) || assetStats.size !== asset.length) {
    throw new Error(`The production bundle does not contain the expected Page 1 artwork: ${asset.fileName}.`);
  }
  console.log(`Verified standalone ${asset.fileName} (${assetStats.size} bytes).`);
}

console.log(`Verified dist/generated/motion-comic-v2-sprite.webp (${legacyStats.size} bytes).`);
console.log(`Verified all ${PAGE_1_ASSETS.length} standalone Page 1 panels.`);
