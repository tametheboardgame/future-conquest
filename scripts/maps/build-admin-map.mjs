import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { feature as topoFeature } from 'topojson-client';
import * as turf from '@turf/turf';
import { geoEqualEarth, geoPath } from 'd3-geo';

const sourceRoot = path.resolve(process.env.PASS2_SOURCE_DIR || '.cache/map-sources');
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'assets/maps/generated');
const cataloguePath = path.resolve(process.env.TERRITORY_CATALOGUE || 'data/authored/territories-standard.csv');
const approvedPath = path.resolve(process.env.APPROVED_MAP || 'data/generated/maps/territories-standard-v0.1.geojson');

const rows = parse(fs.readFileSync(cataloguePath, 'utf8'), { columns: true, skip_empty_lines: true });
for (const row of rows) row.centre = [Number(row.centre_lng), Number(row.centre_lat)];

const approved = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
const approvedById = new Map(approved.features.map(item => [item.properties.territory_id, item]));
for (const row of rows) {
  const approvedFeature = approvedById.get(row.territory_id);
  if (!approvedFeature) throw new Error(`Missing approved geometry for ${row.territory_id}`);
  row.centre = approvedFeature.properties.centre;
}

function readNuts(filename) {
  const topology = JSON.parse(fs.readFileSync(path.join(sourceRoot, filename), 'utf8'));
  return topoFeature(topology, topology.objects.nutsrg).features;
}

const nuts2024L2 = readNuts('nuts-2024-level2-10m.topojson');
const nuts2024L3 = readNuts('nuts-2024-level3-10m.topojson');
const nuts2021L2 = readNuts('nuts-2021-level2-10m.topojson');

const sourceCode = code => code === 'GR' ? 'EL' : code === 'GB' ? 'UK' : code;
const byPrefix = (features, prefix) => features.filter(item => item.properties.id.startsWith(prefix));
const theatre = [-25, 34, 60, 72];
const inTheatre = feature => {
  const [x, y] = turf.centroid(feature).geometry.coordinates;
  return x >= theatre[0] && x <= theatre[2] && y >= theatre[1] && y <= theatre[3];
};

function sourceRegionsFor(countryCode) {
  const prefix = sourceCode(countryCode);
  let sourceYear = 2024;
  let sourceLevel = 3;
  let regions;

  if (countryCode === 'GB') {
    sourceYear = 2021;
    sourceLevel = 2;
    regions = byPrefix(nuts2021L2, prefix);
  } else {
    regions = byPrefix(nuts2024L3, prefix);
    if (!regions.length) {
      sourceLevel = 2;
      regions = byPrefix(nuts2024L2, prefix);
    }
  }

  regions = regions.filter(inTheatre);
  if (countryCode === 'TR') {
    regions = regions.filter(region => {
      const [x, y] = turf.centroid(region).geometry.coordinates;
      return x <= 30.25 && y >= 39.5;
    });
  }

  return { regions, sourceYear, sourceLevel };
}

function dissolve(features) {
  if (features.length === 1) return features[0];
  try {
    return turf.union(turf.featureCollection(features));
  } catch {
    const buffered = features.map(item => turf.buffer(item, 0, { units: 'kilometers' })).filter(Boolean);
    return turf.union(turf.featureCollection(buffered));
  }
}

function repairPolygon(feature) {
  const parts = [];
  for (const polygon of turf.flatten(feature).features) {
    if (polygon.geometry?.type !== 'Polygon') continue;
    try {
      parts.push(...turf.unkinkPolygon(polygon).features);
    } catch {
      const buffered = turf.buffer(polygon, 0, { units: 'kilometers' });
      if (buffered) parts.push(...turf.flatten(buffered).features);
    }
  }
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  try {
    return turf.union(turf.featureCollection(parts));
  } catch {
    return turf.combine(turf.featureCollection(parts)).features[0];
  }
}

const rowGroups = Map.groupBy(rows, row => row.country_code);
const outputFeatures = [];
const mappings = [];
const coverage = [];

for (const [countryCode, countryRows] of rowGroups) {
  const { regions, sourceYear, sourceLevel } = sourceRegionsFor(countryCode);
  if (!regions.length) {
    for (const row of countryRows) {
      const fallback = structuredClone(approvedById.get(row.territory_id));
      fallback.properties.boundary_status = 'pass-1-provisional';
      fallback.properties.admin_source = 'Pass 1 strategic partition';
      outputFeatures.push(fallback);
    }
    coverage.push({ country_code: countryCode, status: 'provisional', source_region_count: 0 });
    continue;
  }

  const assigned = new Map(countryRows.map(row => [row.territory_id, []]));
  for (const region of regions) {
    const centroid = turf.centroid(region);
    const ranked = countryRows
      .map(row => ({ row, distance: turf.distance(centroid, turf.point(row.centre), { units: 'kilometers' }) }))
      .sort((a, b) => a.distance - b.distance);
    const territory = ranked[0].row;
    assigned.get(territory.territory_id).push(region);
    mappings.push({
      territory_id: territory.territory_id,
      source_region_id: region.properties.id,
      source_region_name: region.properties.na,
      source_year: sourceYear,
      source_level: sourceLevel,
      assignment: 'nearest-strategic-centre-draft'
    });
  }

  for (const row of countryRows) {
    const parts = assigned.get(row.territory_id);
    if (!parts.length) {
      const fallback = structuredClone(approvedById.get(row.territory_id));
      fallback.properties.boundary_status = 'pass-1-fallback-no-region';
      fallback.properties.admin_source = `NUTS ${sourceYear} level ${sourceLevel}, no region assigned`;
      outputFeatures.push(fallback);
      continue;
    }
    const dissolved = dissolve(parts);
    outputFeatures.push(turf.feature(dissolved.geometry, {
      ...approvedById.get(row.territory_id).properties,
      boundary_status: 'administrative-comparison-draft',
      admin_source: `NUTS ${sourceYear} level ${sourceLevel}`,
      source_region_count: parts.length
    }));
  }
  coverage.push({
    country_code: countryCode,
    status: 'administrative-comparison',
    source_year: sourceYear,
    source_level: sourceLevel,
    source_region_count: regions.length
  });
}

outputFeatures.sort((a, b) => a.properties.territory_id.localeCompare(b.properties.territory_id));
for (let index = 0; index < outputFeatures.length; index += 1) {
  if (!turf.booleanValid(outputFeatures[index])) {
    const properties = outputFeatures[index].properties;
    const repaired = repairPolygon(outputFeatures[index]);
    if (repaired) outputFeatures[index] = turf.feature(repaired.geometry, properties);
  }
  outputFeatures[index] = turf.rewind(outputFeatures[index], { reverse: true, mutate: false });
}

const collection = turf.featureCollection(outputFeatures);
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'territories-standard-admin-comparison-v0.2.geojson'), `${JSON.stringify(collection)}\n`);

const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const mappingHeader = ['territory_id', 'source_region_id', 'source_region_name', 'source_year', 'source_level', 'assignment'];
const mappingCsv = [mappingHeader.join(','), ...mappings
  .sort((a, b) => a.territory_id.localeCompare(b.territory_id) || a.source_region_id.localeCompare(b.source_region_id))
  .map(item => mappingHeader.map(key => csvEscape(item[key])).join(','))]
  .join('\n');
fs.writeFileSync(path.join(outputRoot, 'territory-source-region-mapping-v0.2.csv'), `${mappingCsv}\n`);

const width = 2400;
const height = 1800;
const projection = geoEqualEarth().fitExtent([[90, 160], [width - 90, height - 130]], collection);
const renderPath = geoPath(projection);
const palette = ['#6f88a8', '#8a769f', '#588c82', '#a27a58', '#6d7f56', '#9c6670', '#587a9a', '#897e62'];
const colourFor = code => {
  let hash = 0;
  for (const char of code) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

const paths = outputFeatures.map(item => {
  const provisional = item.properties.boundary_status !== 'administrative-comparison-draft';
  const fill = provisional ? 'url(#provisional)' : colourFor(item.properties.country_code);
  return `<path class="territory" d="${renderPath(item)}" fill="${fill}"><title>${item.properties.territory_id}: ${item.properties.display_name} • ${item.properties.admin_source}</title></path>`;
}).join('\n');

const labels = outputFeatures.map(item => {
  const point = projection(item.properties.centre);
  if (!point) return '';
  return `<g class="label" transform="translate(${point[0].toFixed(1)} ${point[1].toFixed(1)})"><circle r="17"/><text y="4">${item.properties.territory_id}</text></g>`;
}).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><pattern id="provisional" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#584d5d"/><rect width="4" height="12" fill="#a47c88"/></pattern></defs>
<style>.territory{stroke:#f3eadb;stroke-width:2.1;stroke-linejoin:round;vector-effect:non-scaling-stroke}.label circle{fill:#17212e;stroke:#f3eadb;stroke-width:1.4}.label text{fill:#fff;font:700 10px Arial,sans-serif;text-anchor:middle}.title{fill:#f3eadb;font:700 40px Georgia,serif}.sub{fill:#b9c2cc;font:19px Arial,sans-serif}.note{fill:#d8dce2;font:16px Arial,sans-serif}</style>
<rect width="100%" height="100%" fill="#101823"/>
<text x="90" y="75" class="title">FUTURE CONQUEST • MAP PASS 2</text>
<text x="90" y="110" class="sub">Administrative-boundary comparison • Draft 0.2 • Approved 101-territory structure retained</text>
<g>${paths}</g><g>${labels}</g>
<g transform="translate(90 1715)"><rect width="28" height="20" fill="url(#provisional)"/><text x="40" y="16" class="note">Provisional non-NUTS geometry: Belarus, Moldova, Ukraine and Russia</text><text y="43" class="note">NUTS regions are assigned to the nearest approved strategic centre for comparison; manual review and overrides follow.</text></g>
</svg>\n`;
fs.writeFileSync(path.join(outputRoot, 'standard-territories-admin-comparison-v0.2.svg'), svg);

const report = {
  version: '0.2',
  territory_count: collection.features.length,
  administrative_comparison_territories: collection.features.filter(item => item.properties.boundary_status === 'administrative-comparison-draft').length,
  provisional_or_fallback_territories: collection.features.filter(item => item.properties.boundary_status !== 'administrative-comparison-draft').length,
  mapped_source_regions: mappings.length,
  country_coverage: coverage,
  warnings: [
    'Region assignment is automated for comparison and requires manual review.',
    'Belarus, Moldova, Ukraine and Russia retain Pass 1 geometry.',
    'Political claims and actual control remain outside geometry.'
  ]
};
fs.writeFileSync(path.join(outputRoot, 'admin-comparison-build-report-v0.2.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
