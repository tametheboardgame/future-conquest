import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_BYTES = 12_874;
const EXPECTED_SHA256 = 'b74f4e4719de712afcc8f30db043fbd21d9e156cc8a3217db5748ce5ff6cc492';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = path.join(repositoryRoot, 'src', 'assets', 'motion-comic-v2', 'sprite-production.b64');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated');
const outputFile = path.join(outputDirectory, 'motion-comic-v2-sprite.webp');

const encodedSprite = (await readFile(sourceFile, 'utf8')).replace(/\s+/gu, '');
if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(encodedSprite) || encodedSprite.length % 4 !== 0) {
  throw new Error('Motion-comic production sprite is not valid padded base64.');
}

const sprite = Buffer.from(encodedSprite, 'base64');
if (sprite.toString('base64') !== encodedSprite) {
  throw new Error('Motion-comic production sprite did not decode cleanly.');
}

const riffTag = sprite.subarray(0, 4).toString('ascii');
const webpTag = sprite.subarray(8, 12).toString('ascii');
const declaredSize = sprite.length >= 8 ? sprite.readUInt32LE(4) + 8 : 0;
const sha256 = createHash('sha256').update(sprite).digest('hex');

if (riffTag !== 'RIFF' || webpTag !== 'WEBP') {
  throw new Error('Motion-comic production sprite is not a WebP file.');
}
if (declaredSize !== sprite.length) {
  throw new Error(`Motion-comic sprite declares ${declaredSize} bytes but contains ${sprite.length}.`);
}
if (sprite.length !== EXPECTED_BYTES) {
  throw new Error(`Motion-comic sprite contains ${sprite.length} bytes; expected ${EXPECTED_BYTES}.`);
}
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`Motion-comic sprite checksum ${sha256} does not match ${EXPECTED_SHA256}.`);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, sprite);
console.log(`Built ${path.relative(repositoryRoot, outputFile)} (${sprite.length} bytes, SHA-256 ${sha256}).`);
