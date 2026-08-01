import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import * as turf from '@turf/turf';

const sourceRoot = path.resolve(process.env.STRATEGIC_SOURCE_DIR || '.cache/map-sources');
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'data/generated/strategic-geography');
const territoryPath = path.resolve(process.env.TERRITORY_MAP || 'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson');
const cityPath = path.resolve(process.env.CITY_SOURCE || 'node_modules/world-cities-json/data/cities.json');

const territories = JSON.parse(fs.readFileSync(territoryPath, 'utf8'));
const airports = parse(fs.readFileSync(path.join(sourceRoot, 'airports.csv'), 'utf8'), { columns: true, skip_empty_lines: true });
const runways = parse(fs.readFileSync(path.join(sourceRoot, 'runways.csv'), 'utf8'), { columns: true, skip_empty_lines: true });
const ports = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'world-port-index-europe.geojson'), 'utf8'));
const cities = JSON.parse(fs.readFileSync(cityPath, 'utf8'));
const longestRunwayByAirport = new Map();
for (const runway of runways) {
  const length = Number(runway.length_ft || 0);
  if (runway.closed !== '1' && length > (longestRunwayByAirport.get(runway.airport_ident) || 0)) longestRunwayByAirport.set(runway.airport_ident, length);
}

function containingTerritory(point) {
  return territories.features.find(feature => turf.booleanPointInPolygon(point, feature, { ignoreBoundary: false })) ?? null;
}

function pointFeature(coordinates, properties) {
  const point = turf.point(coordinates, properties);
  const territory = containingTerritory(point);
  if (!territory) return null;
  point.properties.territory_id = territory.properties.territory_id;
  point.properties.country_code = territory.properties.country_code;
  return point;
}

const strategicCentres = territories.features.map(territory => turf.point(territory.properties.centre, {
  node_id: `CENTRE-${territory.properties.territory_id}`,
  node_type: 'strategic-centre',
  name: territory.properties.strategic_centre,
  territory_id: territory.properties.territory_id,
  country_code: territory.properties.country_code,
  gameplay_status: 'core',
  source: 'approved-territory-catalogue'
}));

const majorCities = cities.filter(city => {
  const population = Number(city.population || 0);
  return population >= 750000 || (city.capital === 'primary' && population >= 200000);
}).map(city => pointFeature([Number(city.lng), Number(city.lat)], {
  node_id: `CITY-${city.id}`,
  node_type: 'major-city',
  name: city.city,
  population: Number(city.population || 0),
  capital: city.capital || null,
  gameplay_status: 'candidate',
  source: 'SimpleMaps-via-world-cities-json'
})).filter(Boolean);

const strategicAirports = airports.filter(airport => airport.type === 'large_airport' || (longestRunwayByAirport.get(airport.ident) || 0) >= 8000).map(airport => pointFeature([
  Number(airport.longitude_deg), Number(airport.latitude_deg)
], {
  node_id: `AIRPORT-${airport.ident}`,
  node_type: 'large-airport',
  name: airport.name,
  ident: airport.ident,
  icao_code: airport.icao_code || null,
  iata_code: airport.iata_code || null,
  scheduled_service: airport.scheduled_service === 'yes',
  source_airport_type: airport.type,
  longest_open_runway_ft: longestRunwayByAirport.get(airport.ident) || null,
  gameplay_status: 'candidate',
  source: 'OurAirports'
})).filter(Boolean);

const portCandidates = ports.features.map(port => pointFeature(port.geometry.coordinates, {
  node_id: `PORT-${port.properties.INDEX_NO}`,
  node_type: 'port',
  name: port.properties.PORT_NAME,
  wpi_number: String(port.properties.INDEX_NO),
  gameplay_status: 'candidate',
  source: 'NGA-World-Port-Index'
})).filter(Boolean);

const layers = {
  'strategic-centres-v0.1.geojson': turf.featureCollection(strategicCentres),
  'major-cities-candidates-v0.1.geojson': turf.featureCollection(majorCities),
  'strategic-airports-candidates-v0.1.geojson': turf.featureCollection(strategicAirports),
  'ports-candidates-v0.1.geojson': turf.featureCollection(portCandidates)
};

fs.mkdirSync(outputRoot, { recursive: true });
for (const [filename, collection] of Object.entries(layers)) fs.writeFileSync(path.join(outputRoot, filename), `${JSON.stringify(collection)}\n`);

const countsByTerritory = {};
for (const territory of territories.features) {
  const id = territory.properties.territory_id;
  countsByTerritory[id] = {
    strategic_centres: 1,
    major_cities: majorCities.filter(item => item.properties.territory_id === id).length,
    strategic_airports: strategicAirports.filter(item => item.properties.territory_id === id).length,
    ports: portCandidates.filter(item => item.properties.territory_id === id).length
  };
}

const report = {
  version: '0.1',
  generated_at: new Date().toISOString(),
  territory_count: territories.features.length,
  strategic_centre_count: strategicCentres.length,
  major_city_candidate_count: majorCities.length,
  strategic_airport_candidate_count: strategicAirports.length,
  port_candidate_count: portCandidates.length,
  territories_without_strategic_airport: Object.entries(countsByTerritory).filter(([, value]) => value.strategic_airports === 0).map(([id]) => id),
  coastal_territories_without_wpi_port: territories.features.filter(feature => feature.properties.coastal).map(feature => feature.properties.territory_id).filter(id => countsByTerritory[id].ports === 0),
  counts_by_territory: countsByTerritory,
  caveats: [
    'Candidate layers are evidence inputs, not the final gameplay-critical selection.',
    'Civil-airport data does not yet identify military airbases.',
    'Port importance requires manual scoring because this WPI service exposes location and name only.',
    'Current control and operational status belong in the dated World State layer.'
  ]
};
fs.writeFileSync(path.join(outputRoot, 'strategic-geography-build-report-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
