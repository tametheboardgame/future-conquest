const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const impl = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

const layerSlice = (id, nextId) => {
  const start = impl.indexOf(`id: '${id}'`);
  const end = nextId ? impl.indexOf(`id: '${nextId}'`, start + 1) : impl.length;
  assert.ok(start >= 0, `missing layer ${id}`);
  assert.ok(end > start, `invalid layer slice ${id}`);
  return impl.slice(start, end);
};

test('R3 terrain keeps ordinary political detail restrained at theatre scale', () => {
  const territoryFill = layerSlice('campaign-territories-fill', 'campaign-territory-state-wash');
  const administrative = layerSlice('campaign-administrative-borders', 'campaign-strategic-routes');
  assert.match(territoryFill, /\['feature-state', 'hover'\], false\], 0\.075/);
  assert.match(territoryFill, /\n\s+0\n/);
  assert.match(administrative, /'line-opacity': \['interpolate', \['linear'\], \['zoom'\], 4, 0\.18, 5\.5, 0\.23, 7, 0\.3, 9, 0\.38\]/);
  assert.match(administrative, /'line-width': \['interpolate', \['linear'\], \['zoom'\], 4, 0\.42, 6, 0\.58, 8, 0\.78\]/);
});

test('R3 terrain lets critical network state beat ordinary route clutter', () => {
  const routes = layerSlice('campaign-strategic-routes', 'campaign-control-borders');
  assert.match(routes, /minzoom: compact \? 5\.6 : 5/);
  assert.match(routes, /'line-opacity': \[\s*'interpolate', \['linear'\], \['zoom'\]/);
  assert.match(routes, /5, \['case'[\s\S]*?selected_supply_path[\s\S]*?0\.92[\s\S]*?bottleneck[\s\S]*?0\.82[\s\S]*?status'\], 'blocked'\], 0\.62[\s\S]*?0\.04/);
  assert.match(routes, /5\.8, \['case'[\s\S]*?0\.12[\s\S]*?7, \['case'[\s\S]*?0\.26[\s\S]*?9, \['case'[\s\S]*?0\.42/);
});

test('R3 terrain keeps fronts visually stronger than ordinary control boundaries', () => {
  const control = layerSlice('campaign-control-borders', 'campaign-fronts-underlay');
  const frontUnderlay = layerSlice('campaign-fronts-underlay', 'campaign-fronts-core');
  const frontCore = layerSlice('campaign-fronts-core', 'campaign-state-outline');
  assert.match(control, /4, 0\.58, 6, 0\.82, 8, 1\.2/);
  assert.match(frontUnderlay, /4, 3\.6, 6, 4\.6, 8, 5\.4, 10, 6\.0/);
  assert.match(frontCore, /'line-opacity': 0\.98/);
  assert.match(frontCore, /4, 1\.65, 6, 2\.15, 8, 2\.7, 10, 3\.0/);
});

test('R3 terrain prioritises active threats over stale combat residue', () => {
  const wash = layerSlice('campaign-territory-state-wash', 'campaign-administrative-borders');
  const outline = layerSlice('campaign-state-outline', 'campaign-strategic-nodes');
  assert.match(wash, /active_combat[\s\S]*0\.2/);
  assert.match(wash, /under-attack[\s\S]*0\.18/);
  assert.match(wash, /recent-combat[\s\S]*0\.055/);
  assert.match(outline, /under-attack[\s\S]*0\.94/);
  assert.match(outline, /recent-combat[\s\S]*0\.42/);
});

test('R3 terrain reveals major strategic nodes before minor nodes in dense regions', () => {
  const nodes = layerSlice('campaign-strategic-nodes');
  assert.match(nodes, /minzoom: compact \? 6 : 5\.4/);
  assert.match(nodes, /filter: \['>=', \['get', 'importance'\], compact \? 2 : 1\]/);
  assert.match(nodes, /5\.4, \['case', \['==', \['get', 'importance'\], 3\], 0\.72, 0\]/);
  assert.match(nodes, /6\.2, \['case', \['>=', \['get', 'importance'\], 2\], 0\.82, 0\.16\]/);
  assert.match(nodes, /7\.2, 0\.88/);
});
