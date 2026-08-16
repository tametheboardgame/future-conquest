import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sourceDir = path.resolve('src/assets/r3-wp3-9b2-physical-terrain');
const outputPath = path.resolve('public/generated/r3-terrain/europe-physical-colour-v1.webp');
const expectedBytes = 37032;
const expectedSha256 = '35026f0b6366ae2f2bbcadce369431cc671e6f2097f61cdcede1da27739e7f56';

const parts = fs.readdirSync(sourceDir)
  .filter(name => /^part-\d{2}\.b64$/.test(name))
  .sort();

if (parts.length !== 5) {
  throw new Error(`WP3.9B2 expected 5 terrain asset chunks, found ${parts.length}.`);
}

const base64 = parts.map(name => fs.readFileSync(path.join(sourceDir, name), 'utf8').trim()).join('');
const image = Buffer.from(base64, 'base64');
const sha256 = crypto.createHash('sha256').update(image).digest('hex');

if (image.length !== expectedBytes) {
  throw new Error(`WP3.9B2 terrain texture size mismatch: ${image.length} != ${expectedBytes}.`);
}
if (sha256 !== expectedSha256) {
  throw new Error(`WP3.9B2 terrain texture digest mismatch: ${sha256}.`);
}
if (image.length < 12 || image.subarray(0, 4).toString('ascii') !== 'RIFF' || image.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('WP3.9B2 terrain texture is not a valid WebP container.');
}
const riffBytes = image.readUInt32LE(4) + 8;
if (riffBytes !== image.length) {
  throw new Error(`WP3.9B2 terrain texture RIFF length mismatch: ${riffBytes} != ${image.length}.`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, image);
console.log(`Materialised WP3.9B2 physical terrain texture: ${image.length} bytes (${sha256.slice(0, 12)}…).`);
