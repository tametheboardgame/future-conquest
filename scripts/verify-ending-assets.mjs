import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(repositoryRoot, 'public', 'generated', 'endings', 'v1');
const expected = {
  'victory-01-europe-secured.webp': ['386f23118bdb297b02868ad9601ae003a1bbd1cbe4301f0f7804895209f7b7d3', 139794],
  'victory-02-occupation.webp': ['2e6faf950a37fe6abc23e072f77cbfed4019e4ae09230f5ba565676cd2efbcfc', 131134],
  'victory-03-archives.webp': ['bb8411e4c971aed46ea8c128ff094791077c0b855967332fa84114550eb49357', 175638],
  'victory-04-revelation.webp': ['a1f7d53b338484706d3dc7b6c591392f4472d66396f0ad6b3e8e57f386e0d63a', 143514],
  'victory-05-consequences.webp': ['3934fe184580e11eb1b2372a453cda601a4482691889c49418fe96fb17e82646', 176994],
  'victory-06-the-loop.webp': ['467b67733f0feac5cb73a6a7e43092784798a50593a4c3b548d0ba33e3e87ac0', 130818],
  'defeat-campaign-failed.webp': ['0abc1f23028bc7e39194223e2725fc4bf37b2d275ea13d237e1a76655a68ac01', 90368]
};

for (const [fileName, [expectedHash, expectedLength]] of Object.entries(expected)) {
  const bytes = await readFile(path.join(outputDirectory, fileName));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== expectedLength) throw new Error(`${fileName} length mismatch: ${bytes.length} != ${expectedLength}.`);
  if (hash !== expectedHash) throw new Error(`${fileName} checksum mismatch.`);
}
console.log(`Verified ${Object.keys(expected).length} campaign ending assets.`);
