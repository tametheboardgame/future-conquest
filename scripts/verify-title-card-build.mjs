import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(repositoryRoot, 'dist');
const distAssetsDirectory = path.join(distDirectory, 'assets');
const EXPECTED_LENGTH = 62_346;
const EXPECTED_SHA256 = 'c1407534915011edcf207825429572dfc60c052f046437cc749e9ad2c9502668';
const BASE_NAME = 'title-card-future-conquest';

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const files = await readdir(distAssetsDirectory);
const matches = files.filter(fileName => (
  fileName.startsWith(`${BASE_NAME}-`) && fileName.endsWith('.webp')
));

if (matches.length !== 1) {
  throw new Error(`Expected one emitted ${BASE_NAME} WebP, found ${matches.length}.`);
}

const fileName = matches[0];
const bytes = await readFile(path.join(distAssetsDirectory, fileName));
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_LENGTH || !isWebP(bytes) || sha256 !== EXPECTED_SHA256) {
  throw new Error(
    `Emitted title card ${fileName} has ${bytes.length} bytes and SHA-256 ${sha256}; expected ${EXPECTED_LENGTH} bytes and ${EXPECTED_SHA256}.`
  );
}

const deploymentManifest = {
  path: `assets/${fileName}`,
  bytes: bytes.length,
  sha256
};
await writeFile(
  path.join(distDirectory, 'title-card-info.json'),
  `${JSON.stringify(deploymentManifest, null, 2)}\n`
);

console.log(`Verified emitted title card ${fileName} (${bytes.length} bytes) and wrote title-card-info.json.`);
