const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const cp=require('node:child_process');
const layer=fs.readFileSync('src/presentation/r3-world-miniatures-layer.ts','utf8');
const assets=fs.readFileSync('src/presentation/r3-landmark-miniature-assets.ts','utf8');
const build=fs.readFileSync('scripts/build-r3-landmark-miniature-assets.mjs','utf8');
const nodes=fs.readFileSync('src/game/strategic-network-data.ts','utf8');
const design=fs.readFileSync('docs/roadmap/R3-WP3.8A-LANDMARK-CITIES-PASS-1-DESIGN.md','utf8');

test('WP3.8A v2 preserves strategic-node scope and generic fallback',()=>{for(const [id,name] of [['N-LONDON','London'],['N-PARIS','Paris'],['N-BRUSSELS','Brussels']]){assert.match(nodes,new RegExp(`id: '${id}', name: '${name}'`));assert.match(assets,new RegExp(`nodeId: '${id}'`))}assert.match(layer,/return genericCityCluster\(node\)/);assert.doesNotMatch(layer,/node\.position\s*=/)});

test('approved miniature manifest drives the authored runtime path',()=>{assert.match(assets,/wp3\.8a-v2-london-selected/);assert.match(assets,/selectedUrl: assetUrl\('london-selected\.gltf'\)/);assert.match(assets,/rollout: 'runtime'/);assert.match(assets,/wp3\.8a-v2-paris-selected/);assert.match(assets,/rollout: 'authoring'/);assert.match(assets,/wp3\.8a-v2-brussels-selected/)});

test('deterministic authored geometry builder emits a substantial self-hosted glTF',()=>{cp.execFileSync(process.execPath,['scripts/build-r3-landmark-miniature-assets.mjs'],{stdio:'pipe'});const p='public/miniatures/wp3-8a/london-selected.gltf';const m='public/miniatures/wp3-8a/manifest.json';assert.ok(fs.statSync(p).size>50000);const d=JSON.parse(fs.readFileSync(p,'utf8'));const evidence=JSON.parse(fs.readFileSync(m,'utf8')).assets[0];assert.equal(d.asset.version,'2.0');assert.match(d.asset.generator,/authored geometry builder/i);assert.ok(d.meshes[0].primitives.length>=8);assert.ok(d.materials.length>=8);assert.match(d.buffers[0].uri,/^data:application\/octet-stream;base64,/);assert.ok(evidence.faces>=3000);assert.ok(evidence.sha256.length===64)});

test('build is deterministic, local and independent of third-party model hosting',()=>{assert.match(build,/function london\(/);assert.match(build,/Future Conquest WP3\.8A authored geometry builder/);assert.match(build,/createHash\('sha256'\)/);assert.match(build,/public\/miniatures\/wp3-8a/);assert.doesNotMatch(build,/https?:\/\//);assert.doesNotMatch(build,/gunzipSync|\.gz\.b64/)});

test('Campaign and Selected views lazy-load authored glTF while Theatre/loading/error retain fallback',()=>{assert.match(layer,/import\('three\/examples\/jsm\/loaders\/GLTFLoader\.js'\)/);assert.match(layer,/loader\.loadAsync\(asset\.selectedUrl\)/);assert.match(layer,/const authoredAssetLod = lod === 'campaign' \|\| lod === 'selected'/);assert.match(layer,/rootVisible && authoredAssetLod && piece\.asset/);assert.match(layer,/piece\.fallbackRoot\.visible = rootVisible && !useAuthoredAsset/);assert.match(layer,/piece\.assetRoot\.visible = useAuthoredAsset/);assert.match(layer,/retaining procedural fallback/)});

test('authored miniature stays below authoritative terrain-grounded strategic root',()=>{assert.match(layer,/queryTerrainElevation/);assert.match(layer,/MercatorCoordinate\.fromLngLat\(piece\.node\.position, elevation \+ CLEARANCE_METRES\)/);assert.match(layer,/const CLEARANCE_METRES = 22/);assert.match(layer,/worldPieceInViewport/);assert.match(layer,/this\.layers\.citiesHubs/)});

test('runtime evidence distinguishes authored glTF from fallback',()=>{assert.match(layer,/assetStatus: AssetStatus/);assert.match(layer,/presentationModel: PresentationModel/);assert.match(layer,/presentationModel: useAuthoredAsset \? 'authored-gltf' : 'procedural-fallback'/);assert.match(layer,/assetId: piece\.asset\?\.assetId/)});

test('design lock records asset-driven board-game-piece direction',()=>{assert.match(design,/board-game-piece/i);assert.match(design,/authored/i);assert.match(design,/glTF|GLB/i);assert.match(design,/procedural.*fallback/i);assert.match(design,/authoritative `STRATEGIC_NODES` coordinates/i)});
