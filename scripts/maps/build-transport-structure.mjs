import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.PROJECT_ROOT || '.');
const mapPath = path.join(root, 'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson');
const hubsPath = path.join(root, 'data/authored/transport-hubs-v0.1.json');
const crossingsPath = path.join(root, 'data/authored/critical-crossings-v0.1.json');
const outputDir = path.join(root, 'data/generated/transport');

const territories = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const hubData = JSON.parse(fs.readFileSync(hubsPath, 'utf8'));
const crossingData = JSON.parse(fs.readFileSync(crossingsPath, 'utf8'));
const territoryIds = new Set(territories.features.map(feature => feature.properties.territory_id));
const errors = [];
const warnings = [];
const ids = new Set();

function validateId(id, kind) {
  if (!id || ids.has(id)) errors.push(`${kind} has a missing or duplicate id: ${id}`);
  ids.add(id);
}

function validateCoordinate(value, label) {
  if (!Array.isArray(value) || value.length !== 2 || value.some(number => !Number.isFinite(number))) {
    errors.push(`${label} does not contain a valid [longitude, latitude] coordinate`);
    return;
  }
  if (Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) errors.push(`${label} is outside geographic coordinate bounds`);
}

for (const hub of hubData.hubs) {
  validateId(hub.id, 'Hub');
  if (!territoryIds.has(hub.territory_id)) errors.push(`${hub.id} references unknown territory ${hub.territory_id}`);
  validateCoordinate(hub.coordinates, hub.id);
  if (!hub.roles?.length) errors.push(`${hub.id} has no transport roles`);
  if (!Number.isInteger(hub.base_capacity) || hub.base_capacity < 1 || hub.base_capacity > 5) errors.push(`${hub.id} has invalid base_capacity`);
}

for (const crossing of crossingData.crossings) {
  validateId(crossing.id, 'Crossing');
  for (const endpoint of ['territory_from', 'territory_to']) {
    if (!territoryIds.has(crossing[endpoint])) errors.push(`${crossing.id} references unknown territory ${crossing[endpoint]}`);
  }
  validateCoordinate(crossing.coordinates_from, `${crossing.id} from`);
  validateCoordinate(crossing.coordinates_to, `${crossing.id} to`);
  if (!Number.isInteger(crossing.base_capacity) || crossing.base_capacity < 1 || crossing.base_capacity > 5) errors.push(`${crossing.id} has invalid base_capacity`);
  if (crossing.territory_from === crossing.territory_to) warnings.push(`${crossing.id} is an internal strategic crossing`);
}

const hubFeatures = hubData.hubs.map(hub => ({
  type: 'Feature',
  properties: { ...hub, coordinates: undefined, operational_status_source: hubData.operational_status_source },
  geometry: { type: 'Point', coordinates: hub.coordinates }
}));
const crossingFeatures = crossingData.crossings.map(crossing => ({
  type: 'Feature',
  properties: {
    ...crossing,
    coordinates_from: undefined,
    coordinates_to: undefined,
    operational_status_source: crossingData.operational_status_source
  },
  geometry: { type: 'LineString', coordinates: [crossing.coordinates_from, crossing.coordinates_to] }
}));

const report = {
  version: '0.1',
  valid: errors.length === 0,
  counts: {
    territories: territoryIds.size,
    hubs: hubFeatures.length,
    crossings: crossingFeatures.length,
    rail_hubs: hubData.hubs.filter(hub => hub.roles.includes('rail')).length,
    motorway_hubs: hubData.hubs.filter(hub => hub.roles.includes('motorway')).length,
    intermodal_hubs: hubData.hubs.filter(hub => hub.roles.includes('intermodal')).length
  },
  crossing_types: Object.fromEntries([...new Set(crossingData.crossings.map(item => item.crossing_type))].sort().map(type => [type, crossingData.crossings.filter(item => item.crossing_type === type).length])),
  errors,
  warnings,
  design_notes: [
    'Objects represent campaign-scale network structure, not tactical infrastructure detail.',
    'Base capacity is a relative gameplay band from 1 to 5, not a real-world throughput measurement.',
    'Operational status, control, damage and closures belong to the dated World State layer.'
  ]
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'transport-hubs-v0.1.geojson'), `${JSON.stringify({ type: 'FeatureCollection', features: hubFeatures }, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'critical-crossings-v0.1.geojson'), `${JSON.stringify({ type: 'FeatureCollection', features: crossingFeatures }, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'transport-structure-validation-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
