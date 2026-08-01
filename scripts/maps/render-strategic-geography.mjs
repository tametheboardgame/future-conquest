import fs from 'node:fs';
import path from 'node:path';
import { geoEqualEarth, geoPath } from 'd3-geo';

const inputRoot = path.resolve(process.env.STRATEGIC_INPUT_DIR || 'data/generated/strategic-geography');
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'assets/maps/generated');
const territoryPath = path.resolve(process.env.TERRITORY_MAP || 'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson');
const selectedMode = process.env.STRATEGIC_MODE === 'selected';
const read = filename => JSON.parse(fs.readFileSync(path.join(inputRoot, filename), 'utf8'));

const territories = JSON.parse(fs.readFileSync(territoryPath, 'utf8'));
const centres = read('strategic-centres-v0.1.geojson');
const cities = read(selectedMode ? 'major-cities-selected-v0.1.geojson' : 'major-cities-candidates-v0.1.geojson');
const airports = read(selectedMode ? 'strategic-airports-selected-v0.1.geojson' : 'strategic-airports-candidates-v0.1.geojson');
const ports = read(selectedMode ? 'ports-selected-v0.1.geojson' : 'ports-candidates-v0.1.geojson');
const width = 2400;
const height = 1800;
const projection = geoEqualEarth().fitExtent([[90, 155], [width - 90, height - 125]], territories);
const renderPath = geoPath(projection);
const circles = (collection, className, radius) => collection.features.map(feature => {
  const point = projection(feature.geometry.coordinates);
  return point ? `<circle class="${className}" cx="${point[0].toFixed(1)}" cy="${point[1].toFixed(1)}" r="${radius}"><title>${feature.properties.territory_id}: ${feature.properties.name}</title></circle>` : '';
}).join('');
const labels = centres.features.map(feature => {
  const point = projection(feature.geometry.coordinates);
  return point ? `<g class="centre" transform="translate(${point[0].toFixed(1)} ${point[1].toFixed(1)})"><circle r="12"/><text y="3">${feature.properties.territory_id}</text></g>` : '';
}).join('');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>.land{fill:#263647;stroke:#718093;stroke-width:1.2;vector-effect:non-scaling-stroke}.port{fill:#35c6d0;opacity:.7}.airport{fill:#e7a23b;opacity:.65}.city{fill:#f6eee0;stroke:#101823;stroke-width:1}.centre circle{fill:#101823;stroke:#f6eee0;stroke-width:1}.centre text{fill:#fff;font:700 7px Arial,sans-serif;text-anchor:middle}.title{fill:#f3eadb;font:700 40px Georgia,serif}.sub,.legend{fill:#b9c2cc;font:18px Arial,sans-serif}</style>
<rect width="100%" height="100%" fill="#101823"/>
<text x="90" y="75" class="title">FUTURE CONQUEST • STRATEGIC GEOGRAPHY</text>
<text x="90" y="110" class="sub">${selectedMode ? 'Selected gameplay-critical locations' : 'Candidate evidence layers'} • v0.1</text>
<g>${territories.features.map(feature => `<path class="land" d="${renderPath(feature)}"/>`).join('')}</g>
<g>${circles(ports, 'port', 2.4)}${circles(airports, 'airport', 3.1)}${circles(cities, 'city', 5.5)}${labels}</g>
<g transform="translate(90 1720)" class="legend"><circle class="city" r="6"/><text x="14" y="6">Major city ${selectedMode ? 'selected' : 'candidate'}</text><circle class="airport" cx="220" r="5"/><text x="232" y="6">Strategic airport ${selectedMode ? 'selected' : 'candidate'}</text><circle class="port" cx="520" r="5"/><text x="532" y="6">Port ${selectedMode ? 'selected' : 'candidate'}</text><circle cx="700" r="9" fill="#101823" stroke="#f6eee0"/><text x="714" y="6">Territory strategic centre</text></g>
</svg>\n`;
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, `strategic-geography-${selectedMode ? 'selected' : 'candidates'}-v0.1.svg`), svg);
