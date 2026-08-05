import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetPath = path.join(repositoryRoot, 'dist', 'generated', 'motion-comic-v2-sprite.webp');

const fileStats = await stat(assetPath);
const spriteBytes = await readFile(assetPath);
const isWebP = spriteBytes.subarray(0, 4).toString('ascii') === 'RIFF'
  && spriteBytes.subarray(8, 12).toString('ascii') === 'WEBP';

if (!isWebP || fileStats.size < 10_000) {
  throw new Error('The production bundle does not contain a valid Motion Comic V2 WebP asset.');
}

console.log(`Verified dist/generated/motion-comic-v2-sprite.webp (${fileStats.size} bytes).`);
