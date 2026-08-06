import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const legacyOutputDirectory = path.join(repositoryRoot, 'public', 'generated');
const legacyOutputFile = path.join(legacyOutputDirectory, 'motion-comic-v2-sprite.webp');
const panel1PartsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v3', 'panel-01-parts');
const panel1SourceOutput = path.join(repositoryRoot, 'src', 'generated', 'motion-comic-v3', 'panel-01-world-that-remains.webp');
const panel1PublicOutput = path.join(repositoryRoot, 'public', 'generated', 'motion-comic-v3', 'page1', 'panel-01-world-that-remains.webp');
const buildInfoDirectory = path.join(repositoryRoot, 'src', 'generated');
const buildInfoFile = path.join(buildInfoDirectory, 'build-info.ts');
const PANEL_1_LENGTH = 16_524;

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.(?:txt|bin)$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
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
  throw new Error('Panel 1 reconstruction did not produce the intended high-resolution WebP file.');
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
await mkdir(path.dirname(panel1PublicOutput), { recursive: true });
await mkdir(buildInfoDirectory, { recursive: true });
await writeFile(legacyOutputFile, spriteBytes);
await writeFile(panel1SourceOutput, panel1Bytes);
await writeFile(panel1PublicOutput, panel1Bytes);
await writeFile(buildInfoFile, buildInfoSource, 'utf8');

console.log(`Built ${path.relative(repositoryRoot, legacyOutputFile)} from ${legacyPartFiles.length} parts (${spriteBytes.length} bytes).`);
console.log(`Built real Panel 1 artwork at ${path.relative(repositoryRoot, panel1SourceOutput)} (${panel1Bytes.length} bytes).`);
console.log(`Stamped prologue build ${buildNumber} at ${buildSha}.`);
