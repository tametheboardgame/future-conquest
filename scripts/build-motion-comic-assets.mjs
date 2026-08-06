import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const legacyOutputDirectory = path.join(repositoryRoot, 'public', 'generated');
const legacyOutputFile = path.join(legacyOutputDirectory, 'motion-comic-v2-sprite.webp');
const panel1PartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'panel-01-parts');
const panel4EncodedSource = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'panel-04-fixed.b64');
const panel5PartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'panel-05-parts');
const panel6PartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'panel-06-parts');
const page1BundlePartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'page1', 'bundle-parts');
const page2BundlePartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'page2', 'bundle-parts-q12');
const page1PublicDirectory = path.join(repositoryRoot, 'public', 'generated', 'motion-comic-v3', 'page1');
const motionComicSourceDirectory = path.join(repositoryRoot, 'src', 'generated', 'motion-comic-v3');
const panel1SourceOutput = path.join(motionComicSourceDirectory, 'panel-01-world-that-remains.webp');
const panel1PublicOutput = path.join(page1PublicDirectory, 'panel-01-world-that-remains.webp');
const panel4SourceOutput = path.join(motionComicSourceDirectory, 'panel-04-anomaly.webp');
const panel4PublicOutput = path.join(page1PublicDirectory, 'panel-04-anomaly.webp');
const panel5SourceOutput = path.join(motionComicSourceDirectory, 'panel-05-hypothesis.webp');
const panel5PublicOutput = path.join(page1PublicDirectory, 'panel-05-hypothesis.webp');
const panel6SourceOutput = path.join(motionComicSourceDirectory, 'panel-06-order.webp');
const panel6PublicOutput = path.join(page1PublicDirectory, 'panel-06-order.webp');
const buildInfoDirectory = path.join(repositoryRoot, 'src', 'generated');
const buildInfoFile = path.join(buildInfoDirectory, 'build-info.ts');

const PANEL_1_LENGTH = 16_524;
const PANEL_4_LENGTH = 13_008;
const PANEL_5_LENGTH = 35_618;
const PANEL_6_LENGTH = 17_222;
const PAGE_1_BUNDLE_LENGTH = 81_177;
const PAGE_2_BUNDLE_LENGTH = 133_560;
const PAGE_1_BUNDLED_ASSETS = [
  { fileName: 'panel-02-human-cost.webp', offset: 9_116, length: 16_464 },
  { fileName: 'panel-03-final-command.webp', offset: 25_580, length: 17_470 }
];
const PAGE_2_BUNDLED_ASSETS = [
  { fileName: 'panel-07-portal.webp', offset: 0, length: 27_900 },
  { fileName: 'panel-08-crossing.webp', offset: 27_900, length: 18_806 },
  { fileName: 'panel-09-arrival-default.webp', offset: 46_706, length: 18_078 },
  { fileName: 'panel-10-first-contact.webp', offset: 64_784, length: 30_680 },
  { fileName: 'panel-11-world-responds.webp', offset: 95_464, length: 14_460 },
  { fileName: 'panel-12-burden-of-command.webp', offset: 109_924, length: 23_636 }
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

async function concatenateBinaryParts(directory, expectedCount) {
  const partFiles = (await readdir(directory))
    .filter(fileName => /^part-\d+\.bin$/.test(fileName))
    .sort((left, right) => partNumber(left) - partNumber(right));
  if (partFiles.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} binary parts in ${directory}, found ${partFiles.length}.`);
  }
  return Buffer.concat(await Promise.all(partFiles.map(fileName => readFile(path.join(directory, fileName)))));
}

async function decodeTextBundle(directory, expectedCount, bundleName) {
  const partFiles = (await readdir(directory))
    .filter(fileName => /^part-\d+\.txt$/.test(fileName))
    .sort((left, right) => partNumber(left) - partNumber(right));
  if (partFiles.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${bundleName} encoded parts, found ${partFiles.length}.`);
  }
  const encodedBundle = (await Promise.all(
    partFiles.map(fileName => readFile(path.join(directory, fileName), 'utf8'))
  )).map(content => content.trim()).join('');
  return { partFiles, bytes: Buffer.from(encodedBundle, 'base64') };
}

function extractBundledAssets(bundleBytes, assets, bundleName) {
  return assets.map(asset => {
    const bytes = bundleBytes.subarray(asset.offset, asset.offset + asset.length);
    if (bytes.length !== asset.length || !isWebP(bytes)) {
      throw new Error(`${bundleName} artwork ${asset.fileName} is not a valid WebP slice.`);
    }
    return { ...asset, bytes };
  });
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

const panel1Bundle = await concatenateBinaryParts(panel1PartsDirectory, 2);
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
const page1BundleBytes = Buffer.concat(await Promise.all(
  page1BundlePartFiles.map(async fileName => {
    const encodedPart = (await readFile(path.join(page1BundlePartsDirectory, fileName), 'utf8')).trim();
    return Buffer.from(encodedPart, 'base64');
  })
));
if (page1BundleBytes.length !== PAGE_1_BUNDLE_LENGTH) {
  throw new Error(`Page 1 artwork bundle has ${page1BundleBytes.length} bytes; expected ${PAGE_1_BUNDLE_LENGTH}.`);
}
const page1Assets = extractBundledAssets(page1BundleBytes, PAGE_1_BUNDLED_ASSETS, 'Page 1');

const panel4Bytes = Buffer.from((await readFile(panel4EncodedSource, 'utf8')).trim(), 'base64');
if (panel4Bytes.length !== PANEL_4_LENGTH || !isWebP(panel4Bytes)) {
  throw new Error(`Panel 4 reconstruction produced ${panel4Bytes.length} bytes instead of ${PANEL_4_LENGTH}.`);
}

const panel5Bytes = await concatenateBinaryParts(panel5PartsDirectory, 5);
if (panel5Bytes.length !== PANEL_5_LENGTH || !isWebP(panel5Bytes)) {
  throw new Error(`Panel 5 reconstruction produced ${panel5Bytes.length} bytes instead of ${PANEL_5_LENGTH}.`);
}

const panel6Bytes = await concatenateBinaryParts(panel6PartsDirectory, 5);
if (panel6Bytes.length !== PANEL_6_LENGTH || !isWebP(panel6Bytes)) {
  throw new Error(`Panel 6 reconstruction produced ${panel6Bytes.length} bytes instead of ${PANEL_6_LENGTH}.`);
}

const page2Bundle = await decodeTextBundle(page2BundlePartsDirectory, 9, 'Page 2 bundle');
if (page2Bundle.bytes.length !== PAGE_2_BUNDLE_LENGTH) {
  throw new Error(`Page 2 artwork bundle has ${page2Bundle.bytes.length} bytes; expected ${PAGE_2_BUNDLE_LENGTH}.`);
}
const page2Assets = extractBundledAssets(page2Bundle.bytes, PAGE_2_BUNDLED_ASSETS, 'Page 2');

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
await mkdir(motionComicSourceDirectory, { recursive: true });
await mkdir(page1PublicDirectory, { recursive: true });
await mkdir(buildInfoDirectory, { recursive: true });
await writeFile(legacyOutputFile, spriteBytes);
await writeFile(panel1SourceOutput, panel1Bytes);
await writeFile(panel1PublicOutput, panel1Bytes);

for (const asset of page1Assets) {
  await writeFile(path.join(motionComicSourceDirectory, asset.fileName), asset.bytes);
  await writeFile(path.join(page1PublicDirectory, asset.fileName), asset.bytes);
}

await writeFile(panel4SourceOutput, panel4Bytes);
await writeFile(panel4PublicOutput, panel4Bytes);
await writeFile(panel5SourceOutput, panel5Bytes);
await writeFile(panel5PublicOutput, panel5Bytes);
await writeFile(panel6SourceOutput, panel6Bytes);
await writeFile(panel6PublicOutput, panel6Bytes);

for (const asset of page2Assets) {
  await writeFile(path.join(motionComicSourceDirectory, asset.fileName), asset.bytes);
}

await writeFile(buildInfoFile, buildInfoSource, 'utf8');

console.log(`Built ${path.relative(repositoryRoot, legacyOutputFile)} from ${legacyPartFiles.length} parts (${spriteBytes.length} bytes).`);
console.log(`Built standalone Panel 1 artwork (${panel1Bytes.length} bytes).`);
console.log(`Built Panels 2–3 from ${page1BundlePartFiles.length} approved artwork parts (${page1BundleBytes.length} bytes).`);
console.log(`Built corrected standalone Panel 4 artwork (${panel4Bytes.length} bytes).`);
console.log(`Built standalone Panel 5 artwork from 5 binary parts (${panel5Bytes.length} bytes).`);
console.log(`Built standalone Panel 6 artwork from 5 binary parts (${panel6Bytes.length} bytes).`);
console.log(`Built ${page2Assets.length} standalone Page 2 panels from ${page2Bundle.partFiles.length} encoded bundle parts (${page2Bundle.bytes.length} bytes).`);
console.log(`Stamped prologue build ${buildNumber} at ${buildSha}.`);
