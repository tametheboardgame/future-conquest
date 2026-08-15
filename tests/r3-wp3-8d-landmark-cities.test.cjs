const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');

const assets=fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts','utf8');
const layer=fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts','utf8');
const build=fs.readFileSync('scripts/build-r3-landmark-miniature-assets-pass4.mjs','utf8');
const nodes=fs.readFileSync('src/game/strategic-network-data.ts','utf8');
const design=fs.readFileSync('docs/roadmap/R3-WP3.8D-LANDMARK-CITIES-PASS-4-DESIGN.md','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('WP3.8D scope is exactly Dusseldorf Stuttgart and Rennes on existing strategic nodes',()=>{
  for(const [id,name] of [['N-DUSSELDORF','Düsseldorf'],['N-STUTTGART','Stuttgart'],['N-RENNES','Rennes']]){
    assert.match(nodes,new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(assets,new RegExp(`nodeId: '${id}'`));
  }
  assert.doesNotMatch(layer,/node\.position\s*=/);
});

test('Pass 4 assets use the established authored Campaign and Selected runtime path',()=>{
  for(const [id,file] of [['wp3.8d-dusseldorf-selected','dusseldorf-selected.gltf'],['wp3.8d-stuttgart-selected','stuttgart-selected.gltf'],['wp3.8d-rennes-selected','rennes-selected.gltf']]){
    assert.match(assets,new RegExp(id.replaceAll('.','\\.')));
    assert.match(assets,new RegExp(file.replaceAll('.','\\.')));
  }
  assert.match(assets,/assetUrl\('wp3-8d'/);
  assert.match(layer,/const authoredAssetLod = lod === 'campaign' \|\| lod === 'selected'/);
  assert.match(layer,/piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);
  assert.match(layer,/const CLEARANCE_METRES = 22/);
});

test('Pass 4 builder emits deterministic self-hosted glTF assets with meaningful detail',()=>{
  cp.execFileSync(process.execPath,['scripts/build-r3-landmark-miniature-assets-pass4.mjs'],{stdio:'pipe'});
  const manifest=JSON.parse(fs.readFileSync('public/miniatures/wp3-8d/manifest.json','utf8'));
  assert.equal(manifest.assets.length,3);
  const minimums={
    'dusseldorf-selected':1000,
    'stuttgart-selected':1000,
    'rennes-selected':1200
  };
  for(const evidence of manifest.assets){
    const p=`public/miniatures/wp3-8d/${evidence.name}.gltf`;
    assert.ok(fs.statSync(p).size>25000,`${evidence.name} should be a substantial authored asset`);
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    assert.equal(doc.asset.version,'2.0');
    assert.match(doc.asset.generator,/WP3\.8D authored geometry builder/);
    assert.ok(doc.meshes[0].primitives.length>=8);
    assert.ok(evidence.faces>=minimums[evidence.name],`${evidence.name} face count ${evidence.faces}`);
    assert.equal(evidence.sha256.length,64);
    assert.match(doc.buffers[0].uri,/^data:application\/octet-stream;base64,/);
  }
});

test('Dusseldorf builder encodes Rheinturm dominance and angular Media Harbour support',()=>{
  assert.match(build,/function dusseldorf/);
  assert.match(build,/cyl\('glass',\.30,\.25/);
  assert.match(build,/cyl\('concrete',\.115,2\.34/);
  assert.match(build,/const harbour=/);
  assert.match(build,/box\('water'/);
  assert.match(design,/Rheinturm/i);
  assert.match(design,/Media Harbour/i);
});

test('Stuttgart builder encodes a slimmer Fernsehturm and subordinate palace roofline',()=>{
  assert.match(build,/function stuttgart/);
  assert.match(build,/cyl\('concrete',\.095,2\.47/);
  assert.match(build,/cyl\('glass',\.235,\.20/);
  assert.match(build,/box\('limestone',\[1\.28,\.48,\.44\]/);
  assert.match(design,/Fernsehturm Stuttgart/i);
  assert.match(design,/Neues Schloss/i);
  assert.match(design,/must not become interchangeable generic tower icons/i);
});

test('Rennes builder encodes Parliament civic mass and half-timbered old town',()=>{
  assert.match(build,/function rennes/);
  assert.match(build,/box\('stone',\[1\.45,\.58,\.62\]/);
  assert.match(build,/function timberHouse/);
  assert.match(build,/const houses=/);
  assert.match(design,/Parliament of Brittany/i);
  assert.match(design,/half-timbered old town/i);
});

test('normal production build includes Pass 4 asset generation',()=>{
  assert.match(pkg.scripts['build:landmark-miniatures'],/build-r3-landmark-miniature-assets-pass4\.mjs/);
});

test('Pass 4 remains presentation-only and preserves accepted fallback architecture',()=>{
  assert.match(layer,/return genericCityCluster\(node\)/);
  assert.match(layer,/loader\.loadAsync\(asset\.selectedUrl\)/);
  assert.match(design,/presentation only/i);
  assert.match(design,/No strategic-node coordinates, territory ownership, routes, movement rules, balance, saves or hidden-information authority are changed/i);
});
