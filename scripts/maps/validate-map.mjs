import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'assets/maps/generated');
const mapPath = path.join(outputRoot, 'territories-standard-v0.1.geojson');
const collection = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const ids = collection.features.map(feature => feature.properties.territory_id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
const invalid = collection.features
  .filter(feature => !turf.booleanValid(feature))
  .map(feature => feature.properties.territory_id);
const centresOutside = collection.features
  .filter(feature => !turf.booleanPointInPolygon(turf.point(feature.properties.centre), feature, { ignoreBoundary: false }))
  .map(feature => feature.properties.territory_id);

const adjacency = Object.fromEntries(ids.map(id => [id, []]));
for (let leftIndex = 0; leftIndex < collection.features.length; leftIndex += 1) {
  const left = collection.features[leftIndex];
  const leftBox = turf.bbox(left);
  for (let rightIndex = leftIndex + 1; rightIndex < collection.features.length; rightIndex += 1) {
    const right = collection.features[rightIndex];
    const rightBox = turf.bbox(right);
    const boxesOverlap = leftBox[0] <= rightBox[2] && leftBox[2] >= rightBox[0]
      && leftBox[1] <= rightBox[3] && leftBox[3] >= rightBox[1];
    if (!boxesOverlap) continue;
    let intersects = false;
    try {
      intersects = turf.booleanIntersects(left, right);
    } catch {
      intersects = false;
    }
    if (!intersects) continue;
    adjacency[left.properties.territory_id].push(right.properties.territory_id);
    adjacency[right.properties.territory_id].push(left.properties.territory_id);
  }
}

for (const neighbours of Object.values(adjacency)) neighbours.sort();

const explicitConnections = [
  ['IS-01', 'GB-01', 'long-sea'],
  ['IS-01', 'NO-02', 'long-sea'],
  ['GB-04', 'FR-01', 'channel-crossing'],
  ['GB-02', 'GB-06', 'short-sea'],
  ['GB-05', 'IE-02', 'short-sea'],
  ['DK-01', 'NO-01', 'short-sea'],
  ['DK-02', 'SE-01', 'fixed-link'],
  ['SE-02', 'FI-01', 'baltic-sea'],
  ['FI-01', 'EE-01', 'baltic-sea'],
  ['PL-01', 'SE-01', 'baltic-sea'],
  ['IT-03', 'IT-04', 'strait-crossing'],
  ['IT-02', 'IT-05', 'short-sea'],
  ['IT-04', 'MT-01', 'short-sea'],
  ['GR-02', 'GR-03', 'aegean-sea'],
  ['GR-03', 'CY-01', 'long-sea'],
  ['CY-01', 'TR-01', 'short-sea']
];

const combinedAdjacency = structuredClone(adjacency);
for (const [from, to] of explicitConnections) {
  if (!combinedAdjacency[from].includes(to)) combinedAdjacency[from].push(to);
  if (!combinedAdjacency[to].includes(from)) combinedAdjacency[to].push(from);
}

const visited = new Set();
const queue = [ids[0]];
while (queue.length) {
  const current = queue.shift();
  if (visited.has(current)) continue;
  visited.add(current);
  for (const neighbour of combinedAdjacency[current]) if (!visited.has(neighbour)) queue.push(neighbour);
}

const landIsolated = ids.filter(id => adjacency[id].length === 0);
const unreachableAfterRoutes = ids.filter(id => !visited.has(id));
const report = {
  version: '0.1',
  territory_count: collection.features.length,
  unique_id_count: new Set(ids).size,
  duplicates,
  invalid_geometries: invalid,
  centres_outside_territory: centresOutside,
  detected_land_edges: Object.values(adjacency).reduce((sum, neighbours) => sum + neighbours.length, 0) / 2,
  land_isolated_territories: landIsolated,
  explicit_route_count: explicitConnections.length,
  unreachable_after_explicit_routes: unreachableAfterRoutes,
  connected_campaign_graph: unreachableAfterRoutes.length === 0,
  status: duplicates.length === 0 && invalid.length === 0 && centresOutside.length === 0 && unreachableAfterRoutes.length === 0
    ? 'pass-with-provisional-boundaries'
    : 'requires-correction'
};

fs.writeFileSync(path.join(outputRoot, 'adjacency-land-v0.1.json'), `${JSON.stringify(adjacency, null, 2)}\n`);
fs.writeFileSync(path.join(outputRoot, 'routes-provisional-v0.1.json'), `${JSON.stringify(explicitConnections.map(([from, to, type]) => ({ from, to, type })), null, 2)}\n`);
fs.writeFileSync(path.join(outputRoot, 'map-validation-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (report.status === 'requires-correction') process.exitCode = 1;
