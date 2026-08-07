import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDir = path.join(root, 'src', 'assets', 'audio', 'black-protocol-dawn-parts');
const outputDir = path.join(root, 'public', 'audio');
const outputPath = path.join(outputDir, 'black-protocol-dawn.webm');
const EXPECTED_LENGTH = 1_676_274;
const EXPECTED_SHA256 = 'f030c8ea0d16b06eda35d245b0e119820e8960d77965d73e4c581672b4888c85';
const WEBM_HEADER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

const parts = (await readdir(partsDir))
  .filter(name => /^part-\d+\.bin$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!parts.length) throw new Error('No Black Protocol Dawn source parts were found.');

const bytes = Buffer.concat(await Promise.all(parts.map(name => readFile(path.join(partsDir, name)))));
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (
  bytes.length !== EXPECTED_LENGTH
  || sha256 !== EXPECTED_SHA256
  || !bytes.subarray(0, WEBM_HEADER.length).equals(WEBM_HEADER)
) {
  throw new Error(`Audio reconstruction failed: ${bytes.length} bytes, SHA-256 ${sha256}.`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, bytes);
console.log(`Built black-protocol-dawn.webm from ${parts.length} verified source parts (${bytes.length} bytes).`);
