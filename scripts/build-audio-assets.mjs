import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDir = path.join(root, 'src', 'assets', 'audio', 'black-protocol-dawn-parts');
const outputDir = path.join(root, 'public', 'audio');
const outputPath = path.join(outputDir, 'black-protocol-dawn.mp3');
const EXPECTED_LENGTH = 4_223_827;
const EXPECTED_SHA256 = '2a08bcac0fe5ff48847414256dbdaf6cc0076a503f20db35d9c2a9272d97818c';

const parts = (await readdir(partsDir))
  .filter(name => /^part-\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!parts.length) throw new Error('No Black Protocol Dawn source parts were found.');

const encoded = (await Promise.all(parts.map(name => readFile(path.join(partsDir, name), 'utf8'))))
  .map(value => value.trim())
  .join('');
const bytes = Buffer.from(encoded, 'base64');
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== EXPECTED_LENGTH || sha256 !== EXPECTED_SHA256 || bytes.subarray(0, 3).toString('ascii') !== 'ID3') {
  throw new Error(`Audio reconstruction failed: ${bytes.length} bytes, SHA-256 ${sha256}.`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, bytes);
console.log(`Built black-protocol-dawn.mp3 from ${parts.length} verified source parts (${bytes.length} bytes).`);
