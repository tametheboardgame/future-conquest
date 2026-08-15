const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');

const assets=fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts','utf8');
const layer=fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts','utf8');
const build=fs.readFileSync('scripts/build-r3-landmark-miniature-assets-pass3.mjs','utf8');
const nodes=fs.readFileSync('src/game/strategic-network-data.ts','utf8');
const design=fs.readFileSync('docs/roadmap/R3-WP3.8C-LANDMARK-CITIES-PASS-3-DESIGN.md','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('WP3.8C scope is exactly Strasbourg Lyon and Luxembourg on existing strategic nodes',()=>{
  for(const [id,name] of [['N-STRASBOURG','Strasbourg'],['N-LYON','Lyon'],['N-LUXEMBOURG','Luxembourg']]){
    assert.match(nodes,new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(assets,new RegExp(`nodeId: '${id}'`));
  }
  assert.doesNotMatch(layer,/node\.position\s*=/);
});

test('Pass 3 assets use the established authored Campaign and Selected runtime path',()=>{
  for(const [id,file] of [['wp3.8c-strasbourg-selected','strasbourg-selected.gltf'],['wp3.8c-lyon-selected','lyon-selected.gltf'],['wp3.8c-luxembourg-selected','luxembourg-selected.gltf']]){
    assert.match(assets,new RegExp(id.replaceAll('.','\\.')));
    assert.match(assets,new RegExp(file.replaceAll('.','\\.')));
  }
  assert.match(assets,/assetUrl\('wp3-8c'/);
  assert.match(layer,/const authoredAssetLod = lod === 'campaign' \|\| lod === 'selected'/);
  assert.match(layer,/piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);
  assert.match(layer,/const CLEARANCE_METRES = 22/);
});

test('Pass 3 builder emits deterministic self-hosted glTF assets with meaningful detail',()=>{
  cp.execFileSync(process.execPath,['scripts/build-r3-landmark-miniature-assets-pass3.mjs'],{stdio:'pipe'});
  const manifest=JSON.parse(fs.readFileSync('public/miniatures/wp3-8c/manifest.json','utf8'));
  assert.equal(manifest.assets.length,3);
  const minimums={
    'strasbourg-selected':1200,
    'lyon-selected':1000,
    'luxembourg-selected':1200
  };
  for(const evidence of manifest.assets){
    const p=`public/miniatures/wp3-8c/${evidence.name}.gltf`;
    assert.ok(fs.statSync(p).size>30000,`${evidence.name} should be a substantial authored asset`);
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    assert.equal(doc.asset.version,'2.0');
    assert.match(doc.asset.generator,/WP3\.8C authored geometry builder/);
    assert.ok(doc.meshes[0].primitives.length>=8);
    assert.ok(evidence.faces>=minimums[evidence.name],`${evidence.name} face count ${evidence.faces}`);
    assert.equal(evidence.sha256.length,64);
    assert.match(doc.buffers[0].uri,/^data:application\/octet-stream;base64,/);
  }
});

test('Strasbourg builder prioritises cathedral single-spire fidelity over support density',()=>{
  assert.match(build,/function strasbourg/);
  assert.match(build,/sphere\('window'/);
  assert.match(build,/cone\('sandstone',\.27,1\.22/);
  assert.match(build,/function halfTimberedHouse/);
  assert.match(design,/Strasbourg Cathedral/i);
  assert.match(design,/asymmetrical single-spire/i);
  assert.match(design,/Petite France/i);
});

test('Lyon builder encodes Fourviere four-tower basilica with subordinate modern skyline',()=>{
  assert.match(build,/function basilicaTower/);
  assert.match(build,/for\(const x of \[-\.72,\.28\]\)for\(const y of \[-\.34,\.18\]\)basilicaTower/);
  assert.match(build,/box\('glass',\[\.30,\.28,1\.72\]/);
  assert.match(design,/Notre-Dame de Fourvière/i);
  assert.match(design,/four strongly legible corner towers/i);
  assert.match(design,/Part-Dieu/i);
});

test('Luxembourg builder encodes fortifications and a repeated masonry arch bridge',()=>{
  assert.match(build,/function arch/);
  assert.match(build,/box\('fort',\[1\.34,\.52,\.54\]/);
  assert.match(build,/for\(const x of \[-\.54,-\.06,\.42\]\)arch/);
  assert.match(design,/casemate/i);
  assert.match(design,/Adolphe Bridge/i);
  assert.match(design,/masonry arch silhouette/i);
});

test('normal production build includes Pass 3 asset generation',()=>{
  assert.match(pkg.scripts['build:landmark-miniatures'],/build-r3-landmark-miniature-assets-pass3\.mjs/);
});

test('Pass 3 remains presentation-only and preserves accepted fallback architecture',()=>{
  assert.match(layer,/return genericCityCluster\(node\)/);
  assert.match(layer,/loader\.loadAsync\(asset\.selectedUrl\)/);
  assert.match(design,/presentation only/i);
  assert.match(design,/No strategic-node coordinates, territory ownership, routes, movement rules, balance, saves or hidden-information authority are changed/i);
});
