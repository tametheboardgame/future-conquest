const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const cp=require('node:child_process');
const layer=fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts','utf8');
const assets=fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts','utf8');
const londonBuild=fs.readFileSync('scripts/build-r3-landmark-miniature-assets.mjs','utf8');
const extraBuild=fs.readFileSync('scripts/build-r3-landmark-miniature-assets-extra.mjs','utf8');
const helper=fs.readFileSync('scripts/r3-landmark-extra-builder-lib.mjs','utf8');
const pkg=fs.readFileSync('package.json','utf8');
const nodes=fs.readFileSync('src/game/strategic-network-data.ts','utf8');
const design=fs.readFileSync('docs/roadmap/R3-WP3.8A-LANDMARK-CITIES-PASS-1-DESIGN.md','utf8');

test('WP3.8A preserves strategic-node scope and generic fallback',()=>{for(const [id,name] of [['N-LONDON','London'],['N-PARIS','Paris'],['N-BRUSSELS','Brussels']]){assert.match(nodes,new RegExp(`id: '${id}', name: '${name}'`));assert.match(assets,new RegExp(`nodeId: '${id}'`))}assert.match(layer,/return genericCityCluster\(node\)/);assert.doesNotMatch(layer,/node\.position\s*=/)});

test('all Pass 1 city definitions use authored runtime assets',()=>{for(const [file,id] of [['london-selected.gltf','wp3.8a-v2-london-selected'],['paris-selected.gltf','wp3.8a-v2-paris-selected'],['brussels-selected.gltf','wp3.8a-v2-brussels-selected']]){assert.match(assets,new RegExp(id.replaceAll('.','\\.')));assert.match(assets,new RegExp(`selectedUrl: assetUrl\\('${file.replace('.','\\.')}\\'\\)`))}assert.equal((assets.match(/rollout: 'runtime'/g)||[]).length,3);assert.doesNotMatch(assets,/rollout: 'authoring'/)});

test('deterministic builders emit substantial self-hosted glTF for London Paris and Brussels',()=>{cp.execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build:landmark-miniatures'],{stdio:'pipe'});const manifest=JSON.parse(fs.readFileSync('public/miniatures/wp3-8a/manifest.json','utf8'));for(const [name,minFaces] of [['london-selected',3000],['paris-selected',4500],['brussels-selected',4000]]){const p=`public/miniatures/wp3-8a/${name}.gltf`;assert.ok(fs.statSync(p).size>50000);const d=JSON.parse(fs.readFileSync(p,'utf8'));const evidence=manifest.assets.find(a=>a.name===name);assert.equal(d.asset.version,'2.0');assert.match(d.asset.generator,/authored geometry builder/i);assert.ok(d.meshes[0].primitives.length>=8);assert.match(d.buffers[0].uri,/^data:application\/octet-stream;base64,/);assert.ok(evidence.faces>=minFaces);assert.equal(evidence.sha256.length,64)}});

test('asset generation is local and build-owned',()=>{assert.match(londonBuild,/function london\(/);assert.match(extraBuild,/function paris\(/);assert.match(extraBuild,/function brussels\(/);assert.match(helper,/function rod\(/);assert.match(pkg,/build-r3-landmark-miniature-assets-extra\.mjs/);for(const source of [londonBuild,extraBuild,helper])assert.doesNotMatch(source,/https?:\/\//)});

test('Campaign and Selected views lazy-load authored glTF while Theatre loading and errors retain fallback',()=>{assert.match(layer,/import\('three\/examples\/jsm\/loaders\/GLTFLoader\.js'\)/);assert.match(layer,/loader\.loadAsync\(asset\.selectedUrl\)/);assert.match(layer,/const authoredAssetLod = lod === 'campaign' \|\| lod === 'selected'/);assert.match(layer,/rootVisible && authoredAssetLod && piece\.asset/);assert.match(layer,/piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);assert.match(layer,/piece\.assetRoot\.visible = useAuthoredAsset/)});

test('authored miniatures remain beneath authoritative terrain-grounded roots',()=>{assert.match(layer,/queryTerrainElevation/);assert.match(layer,/MercatorCoordinate\.fromLngLat\(piece\.node\.position, elevation \+ CLEARANCE_METRES\)/);assert.match(layer,/const CLEARANCE_METRES = 22/);assert.match(layer,/worldPieceInViewport/);assert.match(layer,/this\.layers\.citiesHubs/)});

test('design lock retains premium board-game-piece direction',()=>{assert.match(design,/board-game-piece/i);assert.match(design,/authored/i);assert.match(design,/glTF|GLB/i);assert.match(design,/procedural.*fallback/i);assert.match(design,/authoritative `STRATEGIC_NODES` coordinates/i)});
