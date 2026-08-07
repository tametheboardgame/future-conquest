import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(repositoryRoot, 'src', 'assets', 'endings', 'v1', 'bundle-parts');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated', 'endings', 'v1');

const BUNDLE_LENGTH = 1_759_170;
const BUNDLE_SHA256 = '3542be73e1e19edadb40b6e0a4edb334db95d3de6a2104db7a8c8cb617475465';
const PART_COUNT = 10;
const ASSETS = [
  { fileName: 'victory-01-europe-secured.webp', offset: 0, length: 253_260, sha256: 'dad254b212e10e39617b446cbe97d9bb67812ff4c2a899562708dcf2fb592f50' },
  { fileName: 'victory-02-occupation.webp', offset: 253_260, length: 238_084, sha256: '6b538fa0428b86aa635a17ca3d5279becdd5ef8baf1d9978bb182f40e1fcf531' },
  { fileName: 'victory-03-archives.webp', offset: 491_344, length: 304_360, sha256: 'bd0baa73cc5c25d808ca39cfd2ef7b1ecff533be2776a44edbe78377c0318993' },
  { fileName: 'victory-04-revelation.webp', offset: 795_704, length: 254_204, sha256: 'e8ec5a1a851b6014dee446047cb65c9729088df2f53d665c400c52e2816205fa' },
  { fileName: 'victory-05-consequences.webp', offset: 1_049_908, length: 306_568, sha256: '0d4802c4a4ed13f20653048c3e90d1a39623bfd3b0c02cbbc2418749ddfb249c' },
  { fileName: 'victory-06-the-loop.webp', offset: 1_356_476, length: 232_550, sha256: '3983b9c179b2f76bc962fc0c7da162e51347ca911c443efac39f5fb2575eab2c' },
  { fileName: 'defeat-campaign-failed.webp', offset: 1_589_026, length: 170_144, sha256: 'bf1b64e6d76b08a20dab1ce0b625eeb210174f38893b0eebb04d4d70a2ba5d2d' }
];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const isWebP = bytes => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
const partNumber = fileName => Number.parseInt(fileName.match(/^part-(\d+)\.txt$/)?.[1] ?? '9999', 10);

const partFiles = (await readdir(partsDirectory))
  .filter(fileName => /^part-\d+\.txt$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));
if (partFiles.length !== PART_COUNT) throw new Error(`Expected ${PART_COUNT} ending bundle parts, found ${partFiles.length}.`);

const encoded = (await Promise.all(partFiles.map(fileName => readFile(path.join(partsDirectory, fileName), 'utf8'))))
  .map(value => value.trim())
  .join('');
const bundle = Buffer.from(encoded, 'base64');
if (bundle.length !== BUNDLE_LENGTH) throw new Error(`Ending artwork bundle has ${bundle.length} bytes; expected ${BUNDLE_LENGTH}.`);
if (sha256(bundle) !== BUNDLE_SHA256) throw new Error('Ending artwork bundle checksum mismatch.');

await mkdir(outputDirectory, { recursive: true });
for (const asset of ASSETS) {
  const bytes = bundle.subarray(asset.offset, asset.offset + asset.length);
  if (bytes.length !== asset.length || !isWebP(bytes)) throw new Error(`${asset.fileName} did not reconstruct as a valid WebP.`);
  if (sha256(bytes) !== asset.sha256) throw new Error(`${asset.fileName} checksum mismatch.`);
  await writeFile(path.join(outputDirectory, asset.fileName), bytes);
}

await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify({ version: 1, width: 1672, height: 941, assets: ASSETS.map(({ fileName, length, sha256 }) => ({ fileName, length, sha256 })) }, null, 2)}\n`, 'utf8');
console.log(`Built ${ASSETS.length} high-resolution campaign ending assets from ${PART_COUNT} encoded source parts.`);
