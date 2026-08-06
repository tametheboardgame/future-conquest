import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyAssetPath = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v2-sprite.webp');
const page1AssetDirectory = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v3', 'page1');
const viteAssetDirectory = path.join(repositoryRoot, 'dist', 'assets');
const PAGE_1_ASSETS = [
  { fileName: 'panel-01-world-that-remains.webp', length: 16_524 },
  { fileName: 'panel-02-human-cost.webp', length: 16_464 },
  { fileName: 'panel-03-final-command.webp', length: 17_470 },
  { fileName: 'panel-04-anomaly.webp', length: 13_008 },
  { fileName: 'panel-05-hypothesis.webp', length: 35_618 },
  { fileName: 'panel-06-order.webp', length: 17_222 }
];
const PAGE_2_ASSETS = [
  { baseName: 'panel-07-portal', length: 27_900 },
  { baseName: 'panel-08-crossing', length: 18_806 },
  { baseName: 'panel-09-arrival-default', length: 18_078 },
  { baseName: 'panel-10-first-contact', length: 30_680 },
  { baseName: 'panel-11-world-responds', length: 14_460 },
  { baseName: 'panel-12-burden-of-command', length: 23_636 }
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

const viteAssetFiles = await readdir(viteAssetDirectory);
for (const asset of PAGE_2_ASSETS) {
  const matches = viteAssetFiles.filter(fileName =>
    fileName.startsWith(`${asset.baseName}-`) && fileName.endsWith('.webp')
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one production asset for ${asset.baseName}, found ${matches.length}.`);
  }
  const fileName = matches[0];
  const assetPath = path.join(viteAssetDirectory, fileName);
  const assetStats = await stat(assetPath);
  const assetBytes = await readFile(assetPath);
  if (!isWebP(assetBytes) || assetStats.size !== asset.length) {
    throw new Error(`The production bundle does not contain the expected Page 2 artwork: ${fileName}.`);
  }
  console.log(`Verified standalone ${fileName} (${assetStats.size} bytes).`);
}

console.log(`Verified dist/generated/motion-comic-v2-sprite.webp (${legacyStats.size} bytes).`);
console.log(`Verified all ${PAGE_1_ASSETS.length} standalone Page 1 panels.`);
console.log(`Verified all ${PAGE_2_ASSETS.length} standalone Page 2 panels in the Vite production output.`);
