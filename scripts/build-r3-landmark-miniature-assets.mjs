import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const SOURCE_ROOT = 'src/assets/landmarks/wp3-8a';
const OUTPUT_ROOT = 'public/miniatures/wp3-8a';

// Asset rollout is intentionally staged. London proves the authored-asset path
// end to end before Paris and Brussels are switched away from their procedural
// fallbacks. Source bundles are split into bounded text parts so repository
// writes cannot silently truncate a compressed model payload.
const assets = [
  {
    name: 'london-selected',
    sourceFiles: [
      'london-selected.gltf.gz.b64.part01',
      'london-selected.gltf.gz.b64.part02'
    ]
  }
];

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
const manifest = [];

for (const asset of assets) {
  const encoded = asset.sourceFiles
    .map(file => fs.readFileSync(path.join(SOURCE_ROOT, file), 'utf8'))
    .join('')
    .replace(/\s+/g, '');
  const gltfBytes = gunzipSync(Buffer.from(encoded, 'base64'));
  const document = JSON.parse(gltfBytes.toString('utf8'));
  if (document?.asset?.version !== '2.0') throw new Error(`${asset.name} is not glTF 2.0`);
  if (!Array.isArray(document.meshes) || document.meshes.length < 1) throw new Error(`${asset.name} has no meshes`);
  const outputPath = path.join(OUTPUT_ROOT, `${asset.name}.gltf`);
  fs.writeFileSync(outputPath, gltfBytes);
  const sha256 = createHash('sha256').update(gltfBytes).digest('hex');
  manifest.push({
    name: asset.name,
    path: `/miniatures/wp3-8a/${asset.name}.gltf`,
    bytes: gltfBytes.length,
    sha256,
    meshes: document.meshes.length,
    materials: Array.isArray(document.materials) ? document.materials.length : 0
  });
  console.log(`Built ${outputPath} (${gltfBytes.length} bytes, ${document.meshes.length} meshes, ${sha256.slice(0, 12)}…)`);
}

fs.writeFileSync(
  path.join(OUTPUT_ROOT, 'manifest.json'),
  `${JSON.stringify({ schemaVersion: 1, assets: manifest }, null, 2)}\n`
);
