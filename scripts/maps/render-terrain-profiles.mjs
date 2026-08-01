import fs from 'node:fs';
import path from 'node:path';
import { geoEqualEarth, geoPath } from 'd3-geo';

const territoryPath = path.resolve(process.env.TERRITORY_MAP || 'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson');
const profilePath = path.resolve(process.env.TERRAIN_PROFILES || 'data/generated/strategic-geography/territory-terrain-profiles-v0.1.json');
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'assets/maps/generated');
const territories = JSON.parse(fs.readFileSync(territoryPath, 'utf8'));
const profiles = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const byId = new Map(profiles.map(profile => [profile.territory_id, profile]));
const colours = { 'open-lowland': '#9aae72', 'mixed-lowland': '#718f78', 'mixed-upland': '#957d62', mountainous: '#766678', subarctic: '#7898a6' };
const width = 2400;
const height = 1800;
const projection = geoEqualEarth().fitExtent([[90, 155], [width - 90, height - 125]], territories);
const renderPath = geoPath(projection);
const paths = territories.features.map(feature => {
  const profile = byId.get(feature.properties.territory_id);
  return `<path class="territory" fill="${colours[profile.terrain_class]}" d="${renderPath(feature)}"><title>${feature.properties.territory_id}: ${profile.terrain_class}; movement ${profile.base_movement_cost}; winter ${profile.winter_severity}</title></path>`;
}).join('');
const labels = territories.features.map(feature => {
  const point = projection(feature.properties.label_anchor);
  return `<g class="label" transform="translate(${point[0].toFixed(1)} ${point[1].toFixed(1)})"><circle r="12"/><text y="3">${feature.properties.territory_id}</text></g>`;
}).join('');
const legend = Object.entries(colours).map(([name, colour], index) => `<g transform="translate(${index * 260} 0)"><rect width="22" height="16" fill="${colour}"/><text x="32" y="14">${name}</text></g>`).join('');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>.territory{stroke:#f3eadb;stroke-width:1.5;vector-effect:non-scaling-stroke}.label circle{fill:#101823;stroke:#f3eadb;stroke-width:1}.label text{fill:#fff;font:700 7px Arial,sans-serif;text-anchor:middle}.title{fill:#f3eadb;font:700 40px Georgia,serif}.sub,.legend{fill:#c6ced7;font:17px Arial,sans-serif}</style>
<rect width="100%" height="100%" fill="#101823"/><text x="90" y="75" class="title">FUTURE CONQUEST • TERRAIN PROFILES</text><text x="90" y="110" class="sub">Broad strategic terrain • v0.1 • Used for movement and combat balancing</text><g>${paths}${labels}</g><g transform="translate(90 1720)" class="legend">${legend}</g>
</svg>\n`;
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'territory-terrain-profiles-v0.1.svg'), svg);
