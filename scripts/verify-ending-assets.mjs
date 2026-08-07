import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated', 'endings', 'v1');
const expected = {
  'victory-01-europe-secured.webp': ['dad254b212e10e39617b446cbe97d9bb67812ff4c2a899562708dcf2fb592f50', 253260],
  'victory-02-occupation.webp': ['6b538fa0428b86aa635a17ca3d5279becdd5ef8baf1d9978bb182f40e1fcf531', 238084],
  'victory-03-archives.webp': ['bd0baa73cc5c25d808ca39cfd2ef7b1ecff533be2776a44edbe78377c0318993', 304360],
  'victory-04-revelation.webp': ['e8ec5a1a851b6014dee446047cb65c9729088df2f53d665c400c52e2816205fa', 254204],
  'victory-05-consequences.webp': ['0d4802c4a4ed13f20653048c3e90d1a39623bfd3b0c02cbbc2418749ddfb249c', 306568],
  'victory-06-the-loop.webp': ['3983b9c179b2f76bc962fc0c7da162e51347ca911c443efac39f5fb2575eab2c', 232550],
  'defeat-campaign-failed.webp': ['bf1b64e6d76b08a20dab1ce0b625eeb210174f38893b0eebb04d4d70a2ba5d2d', 170144]
};

for (const [fileName, [expectedHash, expectedLength]] of Object.entries(expected)) {
  const bytes = await readFile(path.join(outputDirectory, fileName));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== expectedLength) throw new Error(`${fileName} length mismatch: ${bytes.length} != ${expectedLength}.`);
  if (hash !== expectedHash) throw new Error(`${fileName} checksum mismatch.`);
}
console.log(`Verified ${Object.keys(expected).length} campaign ending assets.`);
