import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { feature as topoFeature } from 'topojson-client';
import * as turf from '@turf/turf';
import { geoEqualEarth, geoPath } from 'd3-geo';
import atlas from 'world-atlas/countries-10m.json' with { type: 'json' };
import cityData from 'world-cities-json';

const here = path.dirname(fileURLToPath(import.meta.url));
const cataloguePath = path.resolve(process.env.TERRITORY_CATALOGUE || 'data/authored/territories-standard.csv');
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'assets/maps/generated');

const aliases = {
  BA: 'Bosnia and Herz.',
  GB: 'United Kingdom',
  MK: 'Macedonia',
  RU: 'Russia',
  TR: 'Turkey',
  XK: 'Kosovo'
};

const centreFallbacks = {
  'A Coruna': [-8.4115, 43.3623],
  'Cardiff': [-3.1791, 51.4816],
  'Cluj-Napoca': [23.5943, 46.7712],
  'Chisinau': [28.8353, 47.0105],
  'Dusseldorf': [6.7735, 51.2277],
  'Heraklion': [25.1442, 35.3387],
  'Nizhny Novgorod': [44.0059, 56.2965],
  'Nis': [21.8958, 43.3209],
  'Pristina': [21.1655, 42.6629],
  'Rostov-on-Don': [39.7015, 47.2357],
  'Seville': [-5.9845, 37.3891],
  'St Petersburg': [30.3351, 59.9343]
};

const normalise = value => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const rows = parse(fs.readFileSync(cataloguePath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  cast: value => value
});

if (rows.length !== 101) {
  throw new Error(`Expected 101 territories, found ${rows.length}`);
}

const cities = cityData.cities;
const findCentre = row => {
  const fallback = centreFallbacks[row.strategic_centre];
  if (fallback) return fallback;
  const wanted = normalise(row.strategic_centre);
  const exact = cities.find(city => city.iso2 === row.country_code && (
    normalise(city.city_ascii || '') === wanted || normalise(city.city || '') === wanted
  ));
  if (!exact) return null;
  return [Number(exact.lng), Number(exact.lat)];
};

for (const row of rows) row.centre = findCentre(row);
const missingCentres = rows.filter(row => !row.centre);
if (missingCentres.length) {
  throw new Error(`Missing coordinates: ${missingCentres.map(row => `${row.territory_id}=${row.strategic_centre}`).join(', ')}`);
}

const world = topoFeature(atlas, atlas.objects.countries);
const countryByName = new Map(world.features.map(item => [item.properties.name, item]));
const crimeaPoint = turf.point([34.1024, 44.9521]);
const crimeaGeometry = turf.flatten(countryByName.get('Russia')).features.find(part => turf.booleanPointInPolygon(crimeaPoint, part));
if (!crimeaGeometry) throw new Error('Could not isolate Crimea geometry from the source map');
const theatreBounds = [-25, 34, 60, 72];
const turkeyBounds = [25.5, 39.5, 30.2, 42.3];

const groups = Map.groupBy(rows, row => row.country_code);
const generated = [];

function safeIntersect(a, b) {
  try {
    return turf.intersect(turf.featureCollection([a, b]));
  } catch (error) {
    throw new Error(`Geometry intersection failed: ${error.message}`);
  }
}

function polygonOnly(feature) {
  const parts = turf.flatten(feature).features.filter(item => ['Polygon', 'MultiPolygon'].includes(item.geometry?.type));
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return turf.combine(turf.featureCollection(parts)).features[0];
}

function selectTheatreParts(feature, bounds) {
  const [minX, minY, maxX, maxY] = bounds;
  const parts = turf.flatten(feature).features.filter(item => {
    if (!['Polygon', 'MultiPolygon'].includes(item.geometry?.type)) return false;
    const [x, y] = turf.centroid(item).geometry.coordinates;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  });
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : turf.combine(turf.featureCollection(parts)).features[0];
}

function repairPolygon(feature) {
  const repairedParts = [];
  for (const part of turf.flatten(feature).features) {
    if (part.geometry?.type !== 'Polygon') continue;
    try {
      repairedParts.push(...turf.unkinkPolygon(part).features);
    } catch {
      const buffered = turf.buffer(part, 0, { units: 'kilometers' });
      if (buffered) repairedParts.push(...turf.flatten(buffered).features);
    }
  }
  if (!repairedParts.length) return null;
  if (repairedParts.length === 1) return repairedParts[0];
  try {
    return turf.union(turf.featureCollection(repairedParts));
  } catch {
    return turf.combine(turf.featureCollection(repairedParts)).features[0];
  }
}

for (const [countryCode, territories] of groups) {
  const partitionTerritories = countryCode === 'UA'
    ? territories.filter(row => row.territory_id !== 'UA-05')
    : territories;
  const catalogueName = aliases[countryCode] || territories[0].country_name;
  const sourceCountry = countryByName.get(catalogueName);
  if (!sourceCountry) throw new Error(`No Natural Earth country for ${countryCode}: ${catalogueName}`);

  let country = ['RU', 'TR'].includes(countryCode)
    ? polygonOnly(turf.bboxClip(sourceCountry, theatreBounds))
    : selectTheatreParts(sourceCountry, theatreBounds);
  if (!country) throw new Error(`Country removed by theatre clip: ${catalogueName}`);
  if (countryCode === 'RU') {
    country = polygonOnly(turf.buffer(country, 0, { units: 'kilometers' }));
    const nonArcticParts = turf.flatten(country).features.filter(part => (
      turf.centroid(part).geometry.coordinates[1] < 71
      && !turf.booleanPointInPolygon(crimeaPoint, part)
    ));
    country = nonArcticParts.length === 1
      ? nonArcticParts[0]
      : turf.combine(turf.featureCollection(nonArcticParts)).features[0];
  }
  if (countryCode === 'TR') country = polygonOnly(turf.bboxClip(country, turkeyBounds));

  if (partitionTerritories.length === 1) {
    const row = partitionTerritories[0];
    generated.push(turf.feature(country.geometry, {
      territory_id: row.territory_id,
      country_code: row.country_code,
      country_name: row.country_name,
      display_name: row.display_name,
      strategic_centre: row.strategic_centre,
      centre: row.centre,
      boundary_status: 'country-sourced'
    }));
    continue;
  }

  const points = turf.featureCollection(partitionTerritories.map(row => turf.point(row.centre, {
    territory_id: row.territory_id
  })));
  const bounds = turf.bbox(country);
  const paddingX = Math.max((bounds[2] - bounds[0]) * 0.2, 1);
  const paddingY = Math.max((bounds[3] - bounds[1]) * 0.2, 1);
  const cells = turf.voronoi(points, {
    bbox: [bounds[0] - paddingX, bounds[1] - paddingY, bounds[2] + paddingX, bounds[3] + paddingY]
  });

  for (const row of partitionTerritories) {
    const point = turf.point(row.centre);
    const cell = cells.features.find(candidate => candidate && turf.booleanPointInPolygon(point, candidate));
    if (!cell) throw new Error(`No partition cell for ${row.territory_id}`);
    let clipped;
    try {
      clipped = safeIntersect(country, cell);
    } catch (error) {
      throw new Error(`Partition failed for ${row.territory_id} (${country.geometry?.type} x ${cell.geometry?.type}): ${error.message}`);
    }
    if (!clipped) throw new Error(`Empty partition for ${row.territory_id}`);
    generated.push(turf.feature(clipped.geometry, {
      territory_id: row.territory_id,
      country_code: row.country_code,
      country_name: row.country_name,
      display_name: row.display_name,
      strategic_centre: row.strategic_centre,
      centre: row.centre,
      boundary_status: 'provisional-strategic-partition'
    }));
  }

  if (countryCode === 'UA') {
    const row = territories.find(item => item.territory_id === 'UA-05');
    generated.push(turf.feature(crimeaGeometry.geometry, {
      territory_id: row.territory_id,
      country_code: row.country_code,
      country_name: row.country_name,
      display_name: row.display_name,
      strategic_centre: row.strategic_centre,
      centre: row.centre,
      boundary_status: 'stable-disputed-area-geometry'
    }));
  }
}

for (let index = 0; index < generated.length; index += 1) {
  if (!turf.booleanValid(generated[index])) {
    const properties = generated[index].properties;
    const repaired = repairPolygon(generated[index]);
    if (!repaired) throw new Error(`Could not repair ${properties.territory_id}`);
    generated[index] = turf.feature(repaired.geometry, properties);
  }
  generated[index] = turf.rewind(generated[index], { reverse: true, mutate: false });
}
generated.sort((a, b) => a.properties.territory_id.localeCompare(b.properties.territory_id));
const collection = turf.featureCollection(generated);
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'territories-standard-v0.1.geojson'), `${JSON.stringify(collection)}\n`);

const width = 2400;
const height = 1800;
const projection = geoEqualEarth().fitExtent([[90, 150], [width - 90, height - 120]], collection);
const renderPath = geoPath(projection);

const palette = ['#6f88a8', '#8a769f', '#588c82', '#a27a58', '#6d7f56', '#9c6670', '#587a9a', '#897e62'];
const colourFor = code => {
  let hash = 0;
  for (const char of code) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

const territoryPaths = generated.map(item => {
  const id = item.properties.territory_id;
  const d = renderPath(item);
  return `<path id="${id}" class="territory" d="${d}" fill="${colourFor(item.properties.country_code)}"><title>${id}: ${item.properties.display_name}</title></path>`;
}).join('\n');

const labels = generated.map(item => {
  const projected = projection(item.properties.centre);
  if (!projected) return '';
  const [x, y] = projected;
  return `<g class="label" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="14"/><text y="5">${item.properties.territory_id}</text></g>`;
}).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Future Conquest Standard Campaign territory map, draft 0.1</title>
  <desc id="desc">A first strategic review map showing 101 proposed European territories.</desc>
  <style>
    .territory{stroke:#f2eadc;stroke-width:2.2;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .territory:hover{fill:#c49145;stroke:#fff;stroke-width:4}
    .label circle{fill:#17212e;stroke:#f3e9d2;stroke-width:1.5;opacity:.92}
    .label text{fill:#fff;font:700 11px Arial,sans-serif;text-anchor:middle;pointer-events:none}
    .title{fill:#f3e9d2;font:700 42px Georgia,serif}
    .subtitle{fill:#b9c2cc;font:20px Arial,sans-serif}
    .note{fill:#d8dce2;font:17px Arial,sans-serif}
    .frame{fill:none;stroke:#657181;stroke-width:2}
  </style>
  <rect width="100%" height="100%" fill="#101823"/>
  <rect x="45" y="45" width="2310" height="1710" rx="18" class="frame"/>
  <text x="90" y="88" class="title">FUTURE CONQUEST</text>
  <text x="90" y="120" class="subtitle">Standard Campaign • 101-territory strategic boundary review • Draft 0.1</text>
  <g>${territoryPaths}</g>
  <g>${labels}</g>
  <g transform="translate(90 1710)">
    <text class="note">Country coastlines: Natural Earth 1:10m. Internal strategic boundaries: provisional centre-weighted partitions for review.</text>
    <text y="26" class="note">Territory IDs are permanent candidates; political control will be supplied separately by dated World States.</text>
  </g>
</svg>\n`;

fs.writeFileSync(path.join(outputRoot, 'standard-territories-v0.1.svg'), svg);

const report = {
  version: '0.1',
  territory_count: generated.length,
  country_count: groups.size,
  country_sourced_boundaries: generated.filter(f => f.properties.boundary_status === 'country-sourced').length,
  provisional_internal_boundaries: generated.filter(f => f.properties.boundary_status === 'provisional-strategic-partition').length,
  source: 'Natural Earth countries-10m via world-atlas 2.0.2',
  city_source: 'SimpleMaps-derived city coordinates via world-cities-json 1.0.1',
  warnings: [
    'Internal boundaries are a first visual partition and are not approved administrative boundaries.',
    'The eastern theatre is clipped at 60 degrees east for the browser campaign frame.',
    'Political claims and actual control are intentionally absent from this geometry.'
  ]
};

fs.writeFileSync(path.join(outputRoot, 'map-build-report-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
