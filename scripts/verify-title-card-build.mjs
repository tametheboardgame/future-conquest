import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distAssetsDirectory = path.join(repositoryRoot, 'dist', 'assets');
const EXPECTED_LENGTH = 62_346;
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

const bytes = await readFile(path.join(distAssetsDirectory, matches[0]));
if (bytes.length !== EXPECTED_LENGTH || !isWebP(bytes)) {
  throw new Error(
    `Emitted title card ${matches[0]} has ${bytes.length} bytes; expected ${EXPECTED_LENGTH}.`
  );
}

console.log(`Verified emitted title card ${matches[0]} (${bytes.length} bytes).`);
