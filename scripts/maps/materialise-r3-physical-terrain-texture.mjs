import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sourceDir = path.resolve('src/assets/r3-wp3-9b3-physical-terrain');
const outputPath = path.resolve('public/generated/r3-terrain/europe-physical-colour-v2.webp');
const expectedBytes = 396994;
const expectedSha256 = 'f6257502818ac444c64fc94897f9fcfecfddd3e5525f00880a06b48e49577af4';

const parts = fs.readdirSync(sourceDir)
  .filter(name => /^part-\d{2}\.b64$/.test(name))
  .sort();

if (parts.length !== 4) {
  throw new Error(`WP3.9B3 expected 4 terrain asset chunks, found ${parts.length}.`);
}

const base64 = parts.map(name => fs.readFileSync(path.join(sourceDir, name), 'utf8').trim()).join('');
const image = Buffer.from(base64, 'base64');
const sha256 = crypto.createHash('sha256').update(image).digest('hex');

if (image.length !== expectedBytes) {
  throw new Error(`WP3.9B3 terrain texture size mismatch: ${image.length} != ${expectedBytes}.`);
}
if (sha256 !== expectedSha256) {
  throw new Error(`WP3.9B3 terrain texture digest mismatch: ${sha256}.`);
}
if (image.length < 12 || image.subarray(0, 4).toString('ascii') !== 'RIFF' || image.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('WP3.9B3 terrain texture is not a valid WebP container.');
}
const riffBytes = image.readUInt32LE(4) + 8;
if (riffBytes !== image.length) {
  throw new Error(`WP3.9B3 terrain texture RIFF length mismatch: ${riffBytes} != ${image.length}.`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, image);
console.log(`Materialised WP3.9B3 high-resolution physical terrain texture: ${image.length} bytes (${sha256.slice(0, 12)}…).`);
