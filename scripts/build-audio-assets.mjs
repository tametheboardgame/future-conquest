import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetPath = path.join(root, 'public', 'audio', 'black-protocol-dawn.mp3');
const EXPECTED_LENGTH = 6_085_073;
const EXPECTED_SHA256 = '80e691ed4c4e99f7e09f7b2cc9641e479acd1bdd0d51c5f504d2b0222257b622';
const ID3_HEADER = Buffer.from('ID3', 'ascii');

const bytes = await readFile(assetPath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (
  bytes.length !== EXPECTED_LENGTH
  || sha256 !== EXPECTED_SHA256
  || !bytes.subarray(0, ID3_HEADER.length).equals(ID3_HEADER)
) {
  throw new Error(`Audio verification failed: ${bytes.length} bytes, SHA-256 ${sha256}.`);
}

console.log(`Verified committed black-protocol-dawn.mp3 (${bytes.length} bytes).`);
