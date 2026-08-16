import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sourceDir = path.resolve('src/assets/r3-wp3-9b2-physical-terrain');
const outputPath = path.resolve('public/generated/r3-terrain/europe-physical-colour-v1.webp');
const expectedBytes = 24672;
const expectedSha256 = 'b4eed87ed7b4eb4989f365d4d2b1565038e07d798e6ea602a06ab4466a34e4ef';

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
if (image.subarray(0, 4).toString('ascii') !== 'RIFF' || image.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('WP3.9B2 terrain texture is not a valid WebP container.');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, image);
console.log(`Materialised WP3.9B2 physical terrain texture: ${image.length} bytes (${sha256.slice(0, 12)}…).`);
