import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(repositoryRoot, 'src', 'assets', 'endings', 'v1', 'bundle-parts');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated', 'endings', 'v1');

const BUNDLE_LENGTH = 988_260;
const BUNDLE_SHA256 = '4be5786ead501ed2dcfc0e6192242e25a24bbd1e55f4f4e4253e3455ce1b541a';
const PART_COUNT = 60;
const ASSETS = [
  { fileName: 'victory-01-europe-secured.webp', offset: 0, length: 139_794, sha256: '386f23118bdb297b02868ad9601ae003a1bbd1cbe4301f0f7804895209f7b7d3' },
  { fileName: 'victory-02-occupation.webp', offset: 139_794, length: 131_134, sha256: '2e6faf950a37fe6abc23e072f77cbfed4019e4ae09230f5ba565676cd2efbcfc' },
  { fileName: 'victory-03-archives.webp', offset: 270_928, length: 175_638, sha256: 'bb8411e4c971aed46ea8c128ff094791077c0b855967332fa84114550eb49357' },
  { fileName: 'victory-04-revelation.webp', offset: 446_566, length: 143_514, sha256: 'a1f7d53b338484706d3dc7b6c591392f4472d66396f0ad6b3e8e57f386e0d63a' },
  { fileName: 'victory-05-consequences.webp', offset: 590_080, length: 176_994, sha256: '3934fe184580e11eb1b2372a453cda601a4482691889c49418fe96fb17e82646' },
  { fileName: 'victory-06-the-loop.webp', offset: 767_074, length: 130_818, sha256: '467b67733f0feac5cb73a6a7e43092784798a50593a4c3b548d0ba33e3e87ac0' },
  { fileName: 'defeat-campaign-failed.webp', offset: 897_892, length: 90_368, sha256: '0abc1f23028bc7e39194223e2725fc4bf37b2d275ea13d237e1a76655a68ac01' }
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
