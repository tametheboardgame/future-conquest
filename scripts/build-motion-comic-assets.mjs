import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated');
const outputFile = path.join(outputDirectory, 'motion-comic-v2-sprite.webp');

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.txt$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

const partFiles = (await readdir(partsDirectory))
  .filter(fileName => /^part-\d+\.txt$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));

if (partFiles.length === 0) {
  throw new Error(`No Motion Comic V2 sprite parts found in ${partsDirectory}`);
}

const encodedSprite = (await Promise.all(
  partFiles.map(fileName => readFile(path.join(partsDirectory, fileName), 'utf8'))
)).map(content => content.trim()).join('');

const spriteBytes = Buffer.from(encodedSprite, 'base64');
const isWebP = spriteBytes.subarray(0, 4).toString('ascii') === 'RIFF'
  && spriteBytes.subarray(8, 12).toString('ascii') === 'WEBP';

if (!isWebP || spriteBytes.length < 10_000) {
  throw new Error('Motion Comic V2 sprite reconstruction did not produce a valid WebP file.');
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, spriteBytes);

console.log(`Built ${path.relative(repositoryRoot, outputFile)} from ${partFiles.length} parts (${spriteBytes.length} bytes).`);
