import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const legacyOutputDirectory = path.join(repositoryRoot, 'public', 'generated');
const legacyOutputFile = path.join(legacyOutputDirectory, 'motion-comic-v2-sprite.webp');
const panel1PartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'panel-01-parts');
const page1BundlePartsDirectory = path.join(
  repositoryRoot,
  'src',
  'assets',
  'motion-comic-v3',
  'page1',
  'bundle-parts'
);
const page1PublicDirectory = path.join(
  repositoryRoot,
  'public',
  'generated',
  'motion-comic-v3',
  'page1'
);
const panel1SourceOutput = path.join(
  repositoryRoot,
  'src',
  'generated',
  'motion-comic-v3',
  'panel-01-world-that-remains.webp'
);
const panel1PublicOutput = path.join(page1PublicDirectory, 'panel-01-world-that-remains.webp');
const buildInfoDirectory = path.join(repositoryRoot, 'src', 'generated');
const buildInfoFile = path.join(buildInfoDirectory, 'build-info.ts');

const PANEL_1_LENGTH = 16_524;
const PAGE_1_BUNDLE_LENGTH = 86_432;
const PAGE_1_ADDITIONAL_ASSETS = [
  { fileName: 'panel-02-human-cost.webp', offset: 9_116, length: 16_464 },
  { fileName: 'panel-03-final-command.webp', offset: 25_580, length: 17_470 },
  { fileName: 'panel-04-anomaly.webp', offset: 43_050, length: 8_548 },
  { fileName: 'panel-05-hypothesis.webp', offset: 51_598, length: 25_840 },
  { fileName: 'panel-06-order.webp', offset: 77_438, length: 8_994 }
];

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.(?:txt|bin)$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function pageBundlePartOrder(fileName) {
  const match = fileName.match(/^part-(\d+)(?:-(\d+))?\.txt$/);
  if (!match) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  return [Number.parseInt(match[1], 10), Number.parseInt(match[2] ?? '0', 10)];
}

function comparePageBundleParts(left, right) {
  const [leftMajor, leftMinor] = pageBundlePartOrder(left);
  const [rightMajor, rightMinor] = pageBundlePartOrder(right);
  return leftMajor - rightMajor || leftMinor - rightMinor;
}

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const legacyPartFiles = (await readdir(legacyPartsDirectory))
  .filter(fileName => /^part-\d+\.txt$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));

if (legacyPartFiles.length === 0) {
  throw new Error(`No Motion Comic V2 sprite parts found in ${legacyPartsDirectory}`);
}

const encodedSprite = (await Promise.all(
  legacyPartFiles.map(fileName => readFile(path.join(legacyPartsDirectory, fileName), 'utf8'))
)).map(content => content.trim()).join('');

const spriteBytes = Buffer.from(encodedSprite, 'base64');
if (!isWebP(spriteBytes) || spriteBytes.length < 10_000) {
  throw new Error('Motion Comic V2 sprite reconstruction did not produce a valid WebP file.');
}

const panel1PartFiles = (await readdir(panel1PartsDirectory))
  .filter(fileName => /^part-\d+\.bin$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));

if (panel1PartFiles.length !== 2) {
  throw new Error(`Expected 2 Panel 1 binary parts, found ${panel1PartFiles.length}.`);
}

const panel1Bundle = Buffer.concat(await Promise.all(
  panel1PartFiles.map(fileName => readFile(path.join(panel1PartsDirectory, fileName)))
));
const panel1Bytes = panel1Bundle.subarray(0, PANEL_1_LENGTH);

if (panel1Bytes.length !== PANEL_1_LENGTH || !isWebP(panel1Bytes)) {
  throw new Error('Panel 1 reconstruction did not produce the intended standalone WebP file.');
}

const page1BundlePartFiles = (await readdir(page1BundlePartsDirectory))
  .filter(fileName => /^part-\d+(?:-\d+)?\.txt$/.test(fileName))
  .sort(comparePageBundleParts);

if (page1BundlePartFiles.length !== 9) {
  throw new Error(`Expected 9 Page 1 bundle parts, found ${page1BundlePartFiles.length}.`);
}

const encodedPage1Bundle = (await Promise.all(
  page1BundlePartFiles.map(fileName => readFile(path.join(page1BundlePartsDirectory, fileName), 'utf8'))
)).map(content => content.trim()).join('');
const page1BundleBytes = Buffer.from(encodedPage1Bundle, 'base64');

if (page1BundleBytes.length !== PAGE_1_BUNDLE_LENGTH) {
  throw new Error(
    `Page 1 artwork bundle has ${page1BundleBytes.length} bytes; expected ${PAGE_1_BUNDLE_LENGTH}.`
  );
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

await mkdir(legacyOutputDirectory, { recursive: true });
await mkdir(path.dirname(panel1SourceOutput), { recursive: true });
await mkdir(page1PublicDirectory, { recursive: true });
await mkdir(buildInfoDirectory, { recursive: true });
await writeFile(legacyOutputFile, spriteBytes);
await writeFile(panel1SourceOutput, panel1Bytes);
await writeFile(panel1PublicOutput, panel1Bytes);

for (const asset of PAGE_1_ADDITIONAL_ASSETS) {
  const bytes = page1BundleBytes.subarray(asset.offset, asset.offset + asset.length);
  if (bytes.length !== asset.length || !isWebP(bytes)) {
    throw new Error(`Page 1 artwork ${asset.fileName} is not a valid WebP slice.`);
  }
  await writeFile(path.join(page1PublicDirectory, asset.fileName), bytes);
}

await writeFile(buildInfoFile, buildInfoSource, 'utf8');

console.log(`Built ${path.relative(repositoryRoot, legacyOutputFile)} from ${legacyPartFiles.length} parts (${spriteBytes.length} bytes).`);
console.log(`Built standalone Panel 1 artwork (${panel1Bytes.length} bytes).`);
console.log(`Built Panels 2–6 from ${page1BundlePartFiles.length} approved artwork parts (${page1BundleBytes.length} bytes).`);
console.log(`Stamped prologue build ${buildNumber} at ${buildSha}.`);
