import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyAssetPath = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v2-sprite.webp');
const panel1AssetPath = path.join(
  repositoryRoot,
  'dist',
  'generated',
  'motion-comic-v3',
  'page1',
  'panel-01-world-that-remains.webp'
);
const PANEL_1_LENGTH = 16_524;

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const legacyStats = await stat(legacyAssetPath);
const legacyBytes = await readFile(legacyAssetPath);
if (!isWebP(legacyBytes) || legacyStats.size < 10_000) {
  throw new Error('The production bundle does not contain a valid Motion Comic V2 fallback WebP asset.');
}

const panel1Stats = await stat(panel1AssetPath);
const panel1Bytes = await readFile(panel1AssetPath);
if (!isWebP(panel1Bytes) || panel1Stats.size !== PANEL_1_LENGTH) {
  throw new Error('The production bundle does not contain the real standalone Panel 1 artwork.');
}

console.log(`Verified dist/generated/motion-comic-v2-sprite.webp (${legacyStats.size} bytes).`);
console.log(`Verified standalone Panel 1 artwork (${panel1Stats.size} bytes).`);
