import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const page1PartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'page1', 'bundle-parts');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated');
const legacyOutputFile = path.join(outputDirectory, 'motion-comic-v2-sprite.webp');
const page1OutputDirectory = path.join(outputDirectory, 'motion-comic-v3', 'page1');
const buildInfoDirectory = path.join(repositoryRoot, 'src', 'generated');
const buildInfoFile = path.join(buildInfoDirectory, 'build-info.ts');

const PAGE_1_ASSETS = [
  { fileName: 'panel-01-world-that-remains.webp', offset: 0, length: 9116 },
  { fileName: 'panel-02-human-cost.webp', offset: 9116, length: 16464 },
  { fileName: 'panel-03-final-command.webp', offset: 25580, length: 17470 },
  { fileName: 'panel-04-anomaly.webp', offset: 43050, length: 8548 },
  { fileName: 'panel-05-hypothesis.webp', offset: 51598, length: 25840 },
  { fileName: 'panel-06-order.webp', offset: 77438, length: 8994 }
];
const PAGE_1_BUNDLE_LENGTH = 86432;

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.txt$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

async function decodeParts(partsDirectory, label) {
  const partFiles = (await readdir(partsDirectory))
    .filter(fileName => /^part-\d+\.txt$/.test(fileName))
    .sort((left, right) => partNumber(left) - partNumber(right));

  if (partFiles.length === 0) {
    throw new Error(`No ${label} parts found in ${partsDirectory}`);
  }

  const encoded = (await Promise.all(
    partFiles.map(fileName => readFile(path.join(partsDirectory, fileName), 'utf8'))
  )).map(content => content.trim()).join('');

  return { bytes: Buffer.from(encoded, 'base64'), partFiles };
}

const legacyBundle = await decodeParts(legacyPartsDirectory, 'Motion Comic V2 sprite');
if (!isWebP(legacyBundle.bytes) || legacyBundle.bytes.length < 10_000) {
  throw new Error('Motion Comic V2 sprite reconstruction did not produce a valid WebP file.');
}

const page1Bundle = await decodeParts(page1PartsDirectory, 'Motion Comic V3 Page 1 artwork');
if (page1Bundle.bytes.length !== PAGE_1_BUNDLE_LENGTH) {
  throw new Error(
    `Motion Comic V3 Page 1 bundle has ${page1Bundle.bytes.length} bytes; expected ${PAGE_1_BUNDLE_LENGTH}.`
  );
}

await mkdir(outputDirectory, { recursive: true });
await mkdir(page1OutputDirectory, { recursive: true });
await writeFile(legacyOutputFile, legacyBundle.bytes);

for (const asset of PAGE_1_ASSETS) {
  const bytes = page1Bundle.bytes.subarray(asset.offset, asset.offset + asset.length);
  if (bytes.length !== asset.length || !isWebP(bytes)) {
    throw new Error(`Motion Comic V3 asset ${asset.fileName} is not a valid WebP slice.`);
  }
  await writeFile(path.join(page1OutputDirectory, asset.fileName), bytes);
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

await mkdir(buildInfoDirectory, { recursive: true });
await writeFile(buildInfoFile, buildInfoSource, 'utf8');

console.log(`Built ${path.relative(repositoryRoot, legacyOutputFile)} from ${legacyBundle.partFiles.length} parts (${legacyBundle.bytes.length} bytes).`);
console.log(`Built ${PAGE_1_ASSETS.length} Motion Comic V3 Page 1 panels from ${page1Bundle.partFiles.length} parts (${page1Bundle.bytes.length} bytes).`);
console.log(`Stamped prologue build ${buildNumber} at ${buildSha}.`);
