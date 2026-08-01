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
const portFacilities = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'world-port-index-full-europe-2019.geojson'), 'utf8'));
const cities = JSON.parse(fs.readFileSync(cityPath, 'utf8'));
const longestRunwayByAirport = new Map();
const portFacilitiesById = new Map(portFacilities.features.map(feature => [String(feature.properties.INDEX_NO), feature.properties]));
for (const runway of runways) {
  const length = Number(runway.length_ft || 0);
  if (runway.closed !== '1' && length > (longestRunwayByAirport.get(runway.airport_ident) || 0)) longestRunwayByAirport.set(runway.airport_ident, length);
}

function containingTerritory(point, options = {}) {
  const containing = territories.features.find(feature => turf.booleanPointInPolygon(point, feature, { ignoreBoundary: false }));
  if (containing || !options.nearestWithinKm) return containing ?? null;
  const candidates = territories.features.filter(feature => !options.countryCode || feature.properties.country_code === options.countryCode).map(feature => ({ feature, distance: turf.pointToPolygonDistance(point, feature, { units: 'kilometers' }) })).sort((a, b) => a.distance - b.distance);
  return candidates[0]?.distance <= options.nearestWithinKm ? candidates[0].feature : null;
}

function pointFeature(coordinates, properties, options = {}) {
  const point = turf.point(coordinates, properties);
  const territory = containingTerritory(point, options);
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

const portCandidates = ports.features.map(port => {
  const facilities = portFacilitiesById.get(String(port.properties.INDEX_NO)) || {};
  return pointFeature(port.geometry.coordinates, {
  node_id: `PORT-${port.properties.INDEX_NO}`,
  node_type: 'port',
  name: port.properties.PORT_NAME,
  wpi_number: String(port.properties.INDEX_NO),
  harbour_size: facilities.HARBORSIZE?.trim() || null,
  maximum_vessel: facilities.MAX_VESSEL?.trim() || null,
  cargo_wharf: facilities.CARGOWHARF === 'Y',
  rail_connection: facilities.COMM_RAIL === 'Y',
  provisions: facilities.PROVISIONS === 'Y',
  water: facilities.WATER === 'Y',
  fuel_oil: facilities.FUEL_OIL === 'Y',
  gameplay_status: 'candidate',
  source: 'NGA-World-Port-Index'
  }, { nearestWithinKm: 20, countryCode: port.properties.COUNTRY });
}).filter(Boolean);

const centreByTerritory = new Map(strategicCentres.map(feature => [feature.properties.territory_id, feature]));
const groupByTerritory = features => Map.groupBy(features, feature => feature.properties.territory_id);
const selectedCities = [];
for (const [territoryId, candidates] of groupByTerritory(majorCities)) {
  const centre = centreByTerritory.get(territoryId);
  selectedCities.push(...candidates.filter(candidate => turf.distance(candidate, centre, { units: 'kilometers' }) >= 40).sort((a, b) => b.properties.population - a.properties.population).slice(0, 2).map(candidate => turf.feature(candidate.geometry, { ...candidate.properties, gameplay_status: 'selected' })));
}
const airportScore = airport => (airport.properties.longest_open_runway_ft || 0) / 100 + (airport.properties.source_airport_type === 'large_airport' ? 30 : 0) + (airport.properties.scheduled_service ? 15 : 0) - (/under construction/i.test(airport.properties.name) ? 100 : 0);
const selectedAirports = [];
for (const candidates of groupByTerritory(strategicAirports).values()) selectedAirports.push(...candidates.sort((a, b) => airportScore(b) - airportScore(a)).slice(0, 2).map(candidate => turf.feature(candidate.geometry, { ...candidate.properties, gameplay_status: 'selected', strategic_score: Number(airportScore(candidate).toFixed(1)) })));
const portScore = port => ({ L: 40, M: 25, S: 10, V: 4 }[port.properties.harbour_size] || 0) + ({ L: 20, M: 10, S: 5 }[port.properties.maximum_vessel] || 0) + (port.properties.cargo_wharf ? 10 : 0) + (port.properties.rail_connection ? 5 : 0) + (port.properties.provisions ? 2 : 0) + (port.properties.water ? 2 : 0) + (port.properties.fuel_oil ? 2 : 0);
const selectedPorts = [];
for (const candidates of groupByTerritory(portCandidates).values()) selectedPorts.push(...candidates.sort((a, b) => portScore(b) - portScore(a)).slice(0, 2).map(candidate => turf.feature(candidate.geometry, { ...candidate.properties, gameplay_status: 'selected', strategic_score: portScore(candidate) })));

const layers = {
  'strategic-centres-v0.1.geojson': turf.featureCollection(strategicCentres),
  'major-cities-candidates-v0.1.geojson': turf.featureCollection(majorCities),
  'strategic-airports-candidates-v0.1.geojson': turf.featureCollection(strategicAirports),
  'ports-candidates-v0.1.geojson': turf.featureCollection(portCandidates),
  'major-cities-selected-v0.1.geojson': turf.featureCollection(selectedCities),
  'strategic-airports-selected-v0.1.geojson': turf.featureCollection(selectedAirports),
  'ports-selected-v0.1.geojson': turf.featureCollection(selectedPorts)
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
  selected_major_city_count: selectedCities.length,
  selected_strategic_airport_count: selectedAirports.length,
  selected_port_count: selectedPorts.length,
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
