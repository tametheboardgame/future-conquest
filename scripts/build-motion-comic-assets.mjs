import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated');
const outputFile = path.join(outputDirectory, 'motion-comic-v2-sprite.webp');
const buildInfoDirectory = path.join(repositoryRoot, 'src', 'generated');
const buildInfoFile = path.join(buildInfoDirectory, 'build-info.ts');

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

const buildNumber = process.env.GITHUB_RUN_NUMBER ?? 'local';
const buildSha = (process.env.GITHUB_SHA ?? 'development').slice(0, 7);
const buildTime = new Date().toISOString();
const buildInfoSource = [
  `export const BUILD_NUMBER = ${JSON.stringify(buildNumber)};`,
  `export const BUILD_SHA = ${JSON.stringify(buildSha)};`,
  `export const BUILD_TIME = ${JSON.stringify(buildTime)};`,
  'export const BUILD_LABEL = `Prologue build ${BUILD_NUMBER} · ${BUILD_SHA}`;',
  ''
].join('\n');

await mkdir(outputDirectory, { recursive: true });
await mkdir(buildInfoDirectory, { recursive: true });
await writeFile(outputFile, spriteBytes);
await writeFile(buildInfoFile, buildInfoSource, 'utf8');

console.log(`Built ${path.relative(repositoryRoot, outputFile)} from ${partFiles.length} parts (${spriteBytes.length} bytes).`);
console.log(`Stamped prologue build ${buildNumber} at ${buildSha}.`);
