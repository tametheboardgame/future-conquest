import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'public', 'audio');
const outputPath = path.join(outputDir, 'black-protocol-dawn.mp3');
const SOURCE_URL = 'https://cdn1.suno.ai/2638ae2c-bef1-4aef-9e84-1c77f87d89fa.mp3';
const EXPECTED_LENGTH = 6_085_073;
const EXPECTED_SHA256 = '80e691ed4c4e99f7e09f7b2cc9641e479acd1bdd0d51c5f504d2b0222257b622';
const ID3_HEADER = Buffer.from('ID3', 'ascii');

const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) {
  throw new Error(`Black Protocol Dawn source returned HTTP ${response.status}.`);
}

const bytes = Buffer.from(await response.arrayBuffer());
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (
  bytes.length !== EXPECTED_LENGTH
  || sha256 !== EXPECTED_SHA256
  || !bytes.subarray(0, ID3_HEADER.length).equals(ID3_HEADER)
) {
  throw new Error(`Audio verification failed: ${bytes.length} bytes, SHA-256 ${sha256}.`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, bytes);
console.log(`Built black-protocol-dawn.mp3 from verified source (${bytes.length} bytes).`);
