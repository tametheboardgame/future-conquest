import fs from 'node:fs';
import path from 'node:path';
import { geoEqualEarth, geoPath } from 'd3-geo';

const root = path.resolve(process.env.PROJECT_ROOT || '.');
const territories = JSON.parse(fs.readFileSync(path.join(root, 'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson'), 'utf8'));
const hubs = JSON.parse(fs.readFileSync(path.join(root, 'data/generated/transport/transport-hubs-v0.1.geojson'), 'utf8'));
const crossings = JSON.parse(fs.readFileSync(path.join(root, 'data/generated/transport/critical-crossings-v0.1.geojson'), 'utf8'));
const outputDir = path.resolve(process.env.MAP_OUTPUT_DIR || path.join(root, 'assets/maps/generated'));
const width = 2400;
const height = 1800;
const projection = geoEqualEarth().fitExtent([[90, 155], [width - 90, height - 125]], territories);
const renderPath = geoPath(projection);

const territoryPaths = territories.features.map(feature => `<path class="territory" d="${renderPath(feature)}"><title>${feature.properties.territory_id}</title></path>`).join('');
const crossingLines = crossings.features.map(feature => {
  const internal = feature.properties.territory_from === feature.properties.territory_to;
  return `<path class="crossing ${internal ? 'internal' : ''}" d="${renderPath(feature)}"><title>${feature.properties.name} • ${feature.properties.crossing_type} • capacity ${feature.properties.base_capacity}</title></path>`;
}).join('');
const hubMarks = hubs.features.map(feature => {
  const [x, y] = projection(feature.geometry.coordinates);
  const radius = 4 + feature.properties.base_capacity * 1.8;
  return `<g class="hub" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="${radius.toFixed(1)}"/><circle class="hub-core" r="2.4"/><title>${feature.properties.name} • ${feature.properties.roles.join(', ')} • capacity ${feature.properties.base_capacity}</title></g>`;
}).join('');
const labels = territories.features.map(feature => {
  const point = projection(feature.properties.label_anchor);
  return `<text class="territory-label" x="${point[0].toFixed(1)}" y="${(point[1] + 2).toFixed(1)}">${feature.properties.territory_id}</text>`;
}).join('');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
.territory{fill:#243442;stroke:#718292;stroke-width:1.1;vector-effect:non-scaling-stroke}.crossing{fill:none;stroke:#e76f51;stroke-width:5;stroke-linecap:round;vector-effect:non-scaling-stroke}.crossing.internal{stroke:#f4a261}.hub circle{fill:#e9c46a;stroke:#101823;stroke-width:2}.hub .hub-core{fill:#101823;stroke:none}.territory-label{fill:#dbe3e9;font:700 7px Arial,sans-serif;text-anchor:middle}.title{fill:#f3eadb;font:700 40px Georgia,serif}.sub,.legend{fill:#c6ced7;font:17px Arial,sans-serif}
</style>
<rect width="100%" height="100%" fill="#101823"/><text x="90" y="75" class="title">FUTURE CONQUEST • TRANSPORT STRUCTURE</text><text x="90" y="110" class="sub">Campaign-scale hubs and critical crossings • v0.1 • Current availability belongs to World State</text><g>${territoryPaths}${crossingLines}${hubMarks}${labels}</g><g transform="translate(90 1722)" class="legend"><circle cx="10" cy="-5" r="9" fill="#e9c46a"/><text x="30">transport hub (size = capacity band)</text><line x1="330" y1="-5" x2="385" y2="-5" stroke="#e76f51" stroke-width="5"/><text x="400">critical crossing or constrained approach</text></g>
</svg>\n`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'transport-structure-v0.1.svg'), svg);
