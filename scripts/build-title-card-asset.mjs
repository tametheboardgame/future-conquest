import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(
  repositoryRoot,
  'src',
  'assets',
  'motion-comic-v3',
  'title-card-parts'
);
const outputDirectory = path.join(
  repositoryRoot,
  'src',
  'generated',
  'motion-comic-v3'
);
const outputPath = path.join(outputDirectory, 'title-card-future-conquest.webp');

const EXPECTED_PARTS = 7;
const EXPECTED_LENGTH = 62_346;
const EXPECTED_SHA256 = 'c1407534915011edcf207825429572dfc60c052f046437cc749e9ad2c9502668';

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.txt$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const partFiles = (await readdir(partsDirectory))
  .filter(fileName => /^part-\d+\.txt$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));

if (partFiles.length !== EXPECTED_PARTS) {
  throw new Error(`Expected ${EXPECTED_PARTS} title-card source parts, found ${partFiles.length}.`);
}

const encoded = (await Promise.all(
  partFiles.map(fileName => readFile(path.join(partsDirectory, fileName), 'utf8'))
)).map(content => content.trim()).join('');

const bytes = Buffer.from(encoded, 'base64');
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== EXPECTED_LENGTH || !isWebP(bytes) || sha256 !== EXPECTED_SHA256) {
  throw new Error(
    `Title card reconstruction failed: ${bytes.length} bytes, SHA-256 ${sha256}.`
  );
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, bytes);

console.log(
  `Built title-card-future-conquest.webp from ${partFiles.length} verified source parts (${bytes.length} bytes).`
);
