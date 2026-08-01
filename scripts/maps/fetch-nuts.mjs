import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const outputRoot = path.resolve(process.env.PASS2_SOURCE_DIR || '.cache/map-sources');
const baseUrl = 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2';
const sources = [
  { file: 'nuts-2024-level2-10m.topojson', url: `${baseUrl}/2024/4326/10M/2.json` },
  { file: 'nuts-2024-level3-10m.topojson', url: `${baseUrl}/2024/4326/10M/3.json` },
  { file: 'nuts-2021-level2-10m.topojson', url: `${baseUrl}/2021/4326/10M/2.json` }
];

await fs.mkdir(outputRoot, { recursive: true });
const manifest = [];
for (const source of sources) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Failed to retrieve ${source.url}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(path.join(outputRoot, source.file), bytes);
  manifest.push({
    file: source.file,
    url: source.url,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    retrieved_at: new Date().toISOString()
  });
}

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
