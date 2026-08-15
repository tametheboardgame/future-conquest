const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');

const assets=fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts','utf8');
const layer=fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts','utf8');
const build=fs.readFileSync('scripts/build-r3-landmark-miniature-assets-pass5.mjs','utf8');
const nodes=fs.readFileSync('src/game/strategic-network-data.ts','utf8');
const design=fs.readFileSync('docs/roadmap/R3-WP3.8E-LANDMARK-CITIES-PASS-5-DESIGN.md','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('WP3.8E scope is exactly Namur Chur and Innsbruck on existing strategic nodes',()=>{
  for(const [id,name] of [['N-NAMUR','Namur'],['N-CHUR','Chur'],['N-INNSBRUCK','Innsbruck']]){
    assert.match(nodes,new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(assets,new RegExp(`nodeId: '${id}'`));
  }
  assert.doesNotMatch(layer,/node\.position\s*=/);
});

test('Pass 5 completes the current 15-city authored landmark registry',()=>{
  const expected=['N-LONDON','N-PARIS','N-BRUSSELS','N-AMSTERDAM','N-FRANKFURT','N-BERN','N-STRASBOURG','N-LYON','N-LUXEMBOURG','N-DUSSELDORF','N-STUTTGART','N-RENNES','N-NAMUR','N-CHUR','N-INNSBRUCK'];
  for(const id of expected)assert.match(assets,new RegExp(`nodeId: '${id}'`));
  assert.equal((assets.match(/\n  'N-[A-Z-]+': \{/g)??[]).length,15);
});

test('Pass 5 assets use the established authored Campaign and Selected runtime path',()=>{
  for(const [id,file] of [['wp3.8e-namur-selected','namur-selected.gltf'],['wp3.8e-chur-selected','chur-selected.gltf'],['wp3.8e-innsbruck-selected','innsbruck-selected.gltf']]){
    assert.match(assets,new RegExp(id.replaceAll('.','\\.')));
    assert.match(assets,new RegExp(file.replaceAll('.','\\.')));
  }
  assert.match(assets,/assetUrl\('wp3-8e'/);
  assert.match(layer,/const authoredAssetLod = lod === 'campaign' \|\| lod === 'selected'/);
  assert.match(layer,/piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);
  assert.match(layer,/const CLEARANCE_METRES = 22/);
});

test('Pass 5 builder emits deterministic self-hosted glTF assets with meaningful detail',()=>{
  cp.execFileSync(process.execPath,['scripts/build-r3-landmark-miniature-assets-pass5.mjs'],{stdio:'pipe'});
  const manifest=JSON.parse(fs.readFileSync('public/miniatures/wp3-8e/manifest.json','utf8'));
  assert.equal(manifest.assets.length,3);
  const minimums={'namur-selected':1250,'chur-selected':1150,'innsbruck-selected':1200};
  for(const evidence of manifest.assets){
    const p=`public/miniatures/wp3-8e/${evidence.name}.gltf`;
    assert.ok(fs.statSync(p).size>35000,`${evidence.name} should be a substantial authored asset`);
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    assert.equal(doc.asset.version,'2.0');
    assert.match(doc.asset.generator,/WP3\.8E authored geometry builder/);
    assert.ok(doc.meshes[0].primitives.length>=10);
    assert.ok(evidence.faces>=minimums[evidence.name],`${evidence.name} face count ${evidence.faces}`);
    assert.equal(evidence.sha256.length,64);
    assert.match(doc.buffers[0].uri,/^data:application\/octet-stream;base64,/);
  }
});

test('Namur builder encodes broad bastioned Citadel and subordinate domed cathedral',()=>{
  assert.match(build,/function namur/);
  assert.match(build,/prism\('fort'/);
  assert.match(build,/prism\('fort_light'/);
  assert.match(build,/sphere\('dome',\.22/);
  assert.match(build,/prism\('water'/);
  assert.match(design,/Citadel of Namur/i);
  assert.match(design,/bastioned walls and layered defensive terraces/i);
  assert.match(design,/Saint-Aubain Cathedral/i);
});

test('Chur builder encodes elevated Episcopal Court and separate pointed St Martin tower',()=>{
  assert.match(build,/function chur/);
  assert.match(build,/prism\('hill'/);
  assert.match(build,/const tx=-\.52,ty=-\.25/);
  assert.match(build,/const sx=\.72,sy=-\.42/);
  assert.match(build,/cone\('roof',\.18,\.48/);
  assert.match(design,/Cathedral of the Assumption and Episcopal Court/i);
  assert.match(design,/St Martin's Church tower/i);
});

test('Innsbruck builder encodes Bergisel bridged ramp and Golden Roof without fake mountains',()=>{
  assert.match(build,/function innsbruck/);
  assert.match(build,/beam\('concrete'/);
  assert.match(build,/beam\('steel'/);
  assert.match(build,/gableRoof\('gold'/);
  assert.doesNotMatch(build,/mountain/i);
  assert.match(design,/Bergisel Ski Jump/i);
  assert.match(design,/Golden Roof/i);
  assert.match(design,/No fake mountain geometry/i);
});

test('normal production build includes Pass 5 asset generation',()=>{
  assert.match(pkg.scripts['build:landmark-miniatures'],/build-r3-landmark-miniature-assets-pass5\.mjs/);
});

test('Pass 5 preserves presentation-only authority and durable Theatre fallback',()=>{
  assert.match(layer,/return genericCityCluster\(node\)/);
  assert.match(layer,/loader\.loadAsync\(asset\.selectedUrl\)/);
  assert.match(design,/presentation only/i);
  assert.match(design,/Theatre LOD/i);
  assert.match(design,/procedural fallback/i);
  assert.match(design,/R3-WP4 remains blocked/i);
});
