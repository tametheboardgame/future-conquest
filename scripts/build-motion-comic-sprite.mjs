import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-parts');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated');
const outputFile = path.join(outputDirectory, 'motion-comic-v2-sprite.webp');

const partNames = (await readdir(partsDirectory))
  .filter(name => /^part-\d+\.txt$/u.test(name))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

if (partNames.length === 0) {
  throw new Error(`No motion-comic sprite parts were found in ${partsDirectory}`);
}

const encodedParts = await Promise.all(
  partNames.map(async name => (await readFile(path.join(partsDirectory, name), 'utf8')).trim())
);
const encodedSprite = encodedParts.join('');

if (encodedSprite.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encodedSprite)) {
  throw new Error('Motion-comic sprite parts do not form valid base64 data.');
}

const sprite = Buffer.from(encodedSprite, 'base64');
const riffTag = sprite.subarray(0, 4).toString('ascii');
const webpTag = sprite.subarray(8, 12).toString('ascii');
const declaredSize = sprite.length >= 8 ? sprite.readUInt32LE(4) + 8 : 0;

if (riffTag !== 'RIFF' || webpTag !== 'WEBP') {
  throw new Error('Reconstructed motion-comic sprite is not a WebP file.');
}

if (declaredSize !== sprite.length) {
  throw new Error(`Motion-comic sprite is incomplete: WebP declares ${declaredSize} bytes but reconstructed ${sprite.length}.`);
}

if (sprite.length < 100_000) {
  throw new Error(`Motion-comic sprite is unexpectedly small (${sprite.length} bytes).`);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, sprite);
console.log(`Built ${path.relative(repositoryRoot, outputFile)} from ${partNames.length} validated parts (${sprite.length} bytes).`);
