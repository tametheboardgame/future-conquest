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

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const partFiles = (await readdir(partsDirectory))
  .filter(fileName => /^part-\d+\.txt$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));

if (partFiles.length !== EXPECTED_PARTS) {
  throw new Error(`Expected ${EXPECTED_PARTS} title-card source parts, found ${partFiles.length}.`);
}

const partText = await Promise.all(
  partFiles.map(fileName => readFile(path.join(partsDirectory, fileName), 'utf8'))
);
const encoded = partText.map(content => content.trim()).join('');
const reconstructed = Buffer.from(encoded, 'base64');
const intactPrefixBytes = Buffer.from(
  partText.slice(0, EXPECTED_PARTS - 1).map(content => content.trim()).join(''),
  'base64'
).length;

if (reconstructed.length < EXPECTED_LENGTH) {
  throw new Error(
    `Title card reconstruction is truncated: ${reconstructed.length} bytes; expected ${EXPECTED_LENGTH}.`
  );
}

let bytes = reconstructed;
let recoveryNote = '';

if (bytes.length !== EXPECTED_LENGTH || sha256(bytes) !== EXPECTED_SHA256) {
  const excess = bytes.length - EXPECTED_LENGTH;

  if (excess <= 0) {
    throw new Error(
      `Title card reconstruction failed: ${bytes.length} bytes, SHA-256 ${sha256(bytes)}.`
    );
  }

  let recovered = null;
  let recoveredOffset = -1;

  // Parts 1–6 match the approved source exactly. Part 7 was uploaded with
  // excess bytes, so search only inside that final chunk. A candidate is
  // accepted solely when removing one contiguous excess block reproduces the
  // approved WebP SHA-256 byte-for-byte.
  for (let offset = intactPrefixBytes; offset <= reconstructed.length - excess; offset += 1) {
    const candidate = Buffer.concat([
      reconstructed.subarray(0, offset),
      reconstructed.subarray(offset + excess)
    ]);

    if (sha256(candidate) === EXPECTED_SHA256) {
      recovered = candidate;
      recoveredOffset = offset;
      break;
    }
  }

  if (!recovered) {
    throw new Error(
      `Title card reconstruction failed: ${reconstructed.length} bytes, SHA-256 ${sha256(reconstructed)}; `
      + `no contiguous ${excess}-byte insertion in part 07 reproduces the approved asset.`
    );
  }

  bytes = recovered;
  recoveryNote = ` Recovered by removing ${excess} inserted bytes at decoded offset ${recoveredOffset}.`;
}

if (bytes.length !== EXPECTED_LENGTH || !isWebP(bytes) || sha256(bytes) !== EXPECTED_SHA256) {
  throw new Error(
    `Title card verification failed after recovery: ${bytes.length} bytes, SHA-256 ${sha256(bytes)}.`
  );
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, bytes);

console.log(
  `Built verified title-card-future-conquest.webp (${bytes.length} bytes, SHA-256 ${EXPECTED_SHA256}).${recoveryNote}`
);
