const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');

const assets=fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts','utf8');
const layer=fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts','utf8');
const build=fs.readFileSync('scripts/build-r3-landmark-miniature-assets-pass2.mjs','utf8');
const nodes=fs.readFileSync('src/game/strategic-network-data.ts','utf8');
const design=fs.readFileSync('docs/roadmap/R3-WP3.8B-LANDMARK-CITIES-PASS-2-DESIGN.md','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('WP3.8B scope is exactly Amsterdam Frankfurt and Bern on existing strategic nodes',()=>{
  for(const [id,name] of [['N-AMSTERDAM','Amsterdam'],['N-FRANKFURT','Frankfurt'],['N-BERN','Bern']]){
    assert.match(nodes,new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(assets,new RegExp(`nodeId: '${id}'`));
  }
  assert.doesNotMatch(layer,/node\.position\s*=/);
});

test('Pass 2 assets use the established authored Campaign and Selected runtime path',()=>{
  for(const [id,file] of [['wp3.8b-amsterdam-selected','amsterdam-selected.gltf'],['wp3.8b-frankfurt-selected','frankfurt-selected.gltf'],['wp3.8b-bern-selected','bern-selected.gltf']]){
    assert.match(assets,new RegExp(id.replaceAll('.','\\.')));
    assert.match(assets,new RegExp(file.replaceAll('.','\\.')));
  }
  assert.match(assets,/assetUrl\('wp3-8b'/);
  assert.match(layer,/const authoredAssetLod = lod === 'campaign' \|\| lod === 'selected'/);
  assert.match(layer,/presentationModel: useAuthoredAsset \? 'authored-gltf' : 'procedural-fallback'/);
  assert.match(layer,/const CLEARANCE_METRES = 22/);
});

test('Pass 2 builder emits deterministic self-hosted glTF assets with city-specific detail',()=>{
  cp.execFileSync(process.execPath,['scripts/build-r3-landmark-miniature-assets-pass2.mjs'],{stdio:'pipe'});
  const manifest=JSON.parse(fs.readFileSync('public/miniatures/wp3-8b/manifest.json','utf8'));
  assert.equal(manifest.assets.length,3);
  const minimums={
    'amsterdam-selected':1700,
    'frankfurt-selected':2200,
    'bern-selected':1600
  };
  for(const evidence of manifest.assets){
    const p=`public/miniatures/wp3-8b/${evidence.name}.gltf`;
    assert.ok(fs.statSync(p).size>45000,`${evidence.name} should be a substantial authored asset`);
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    assert.equal(doc.asset.version,'2.0');
    assert.match(doc.asset.generator,/WP3\.8B authored geometry builder/);
    assert.ok(doc.meshes[0].primitives.length>=9);
    assert.ok(evidence.faces>=minimums[evidence.name]);
    assert.equal(evidence.sha256.length,64);
    assert.match(doc.buffers[0].uri,/^data:application\/octet-stream;base64,/);
  }
});

test('Amsterdam builder encodes canal houses and Westerkerk-style vertical landmark',()=>{
  assert.match(build,/function steppedGable/);
  assert.match(build,/const houses=/);
  assert.match(build,/water/);
  assert.match(build,/\.88,\.31,3\.25/);
  assert.match(design,/canal-house gables/i);
  assert.match(design,/Westerkerk-style tower/i);
});

test('Frankfurt builder encodes modern skyline and historic Römer contrast',()=>{
  assert.match(build,/function skyscraper/);
  assert.match(build,/glass_light/);
  assert.match(build,/Main-Tower language/);
  assert.match(build,/timber/);
  assert.match(design,/Römer/i);
  assert.match(design,/modern\/historic contrast/i);
});

test('Bern builder encodes Zytglogge clock and Federal Palace dome',()=>{
  assert.match(build,/Zytglogge/);
  assert.match(build,/clock_dark/);
  assert.match(build,/Federal Palace/);
  assert.match(build,/sphere\('copper'/);
  assert.match(design,/Federal Palace dome/i);
});

test('normal production build includes Pass 2 asset generation',()=>{
  assert.match(pkg.scripts['build:landmark-miniatures'],/build-r3-landmark-miniature-assets-pass2\.mjs/);
});

test('Pass 2 remains presentation-only and keeps the accepted fallback architecture',()=>{
  assert.match(layer,/return genericCityCluster\(node\)/);
  assert.match(layer,/piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);
  assert.match(layer,/loader\.loadAsync\(asset\.selectedUrl\)/);
  assert.match(design,/presentation only/i);
  assert.match(design,/no gameplay, balance, route, territory, save or hidden-information authority changes/i);
});
