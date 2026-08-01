import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as turf from '@turf/turf';
const require = createRequire(import.meta.url);
const shapefile = require('shapefile');

const sourceRoot = path.resolve(process.env.TERRAIN_SOURCE_DIR || '.cache/map-sources');
const outputRoot = path.resolve(process.env.MAP_OUTPUT_DIR || 'data/generated/strategic-geography');
const territoryPath = path.resolve(process.env.TERRITORY_MAP || 'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson');
const citiesPath = path.resolve(process.env.CITIES_FILE || path.join(outputRoot, 'major-cities-candidates-v0.1.geojson'));
const overridePath = path.resolve(process.env.TERRAIN_OVERRIDES || 'data/authored/terrain-profile-overrides.json');
const territories = JSON.parse(fs.readFileSync(territoryPath, 'utf8'));
const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
const overrides = fs.existsSync(overridePath) ? JSON.parse(fs.readFileSync(overridePath, 'utf8')) : {};
const physical = await shapefile.read(path.join(sourceRoot, 'natural-earth-geography', 'ne_10m_geography_regions_polys.shp'));
const relevantClasses = new Set(['Range/mtn', 'Plateau', 'Plain', 'Lowland', 'Tundra', 'Desert']);
const regions = physical.features.filter(feature => relevantClasses.has(feature.properties.FEATURECLA));

function overlapPercent(territory, feature) {
  const a = turf.bbox(territory);
  const b = turf.bbox(feature);
  if (a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]) return 0;
  try {
    const intersection = turf.intersect(turf.featureCollection([territory, feature]));
    return intersection ? turf.area(intersection) / turf.area(territory) * 100 : 0;
  } catch {
    return 0;
  }
}

const profiles = territories.features.map(territory => {
  const coverage = { mountain: 0, plateau: 0, plain: 0, lowland: 0, tundra: 0, desert: 0 };
  const physicalRegions = [];
  for (const region of regions) {
    const percent = overlapPercent(territory, region);
    if (percent < 0.25) continue;
    const key = ({ 'Range/mtn': 'mountain', Plateau: 'plateau', Plain: 'plain', Lowland: 'lowland', Tundra: 'tundra', Desert: 'desert' })[region.properties.FEATURECLA];
    coverage[key] += percent;
    physicalRegions.push({ name: region.properties.NAME_EN || region.properties.NAME, class: region.properties.FEATURECLA, coverage_percent: Number(percent.toFixed(1)) });
  }
  const latitude = territory.properties.centre[1];
  const cityPopulation = cities.features.filter(city => city.properties.territory_id === territory.properties.territory_id).reduce((sum, city) => sum + (city.properties.population || 0), 0);
  let terrainClass = 'mixed-lowland';
  if (coverage.tundra >= 20 || latitude >= 66) terrainClass = 'subarctic';
  else if (coverage.mountain >= 45) terrainClass = 'mountainous';
  else if (coverage.mountain >= 8 || coverage.plateau >= 20) terrainClass = 'mixed-upland';
  else if (coverage.plain + coverage.lowland >= 30) terrainClass = 'open-lowland';
  let winterSeverity = 'moderate';
  if (latitude >= 66) winterSeverity = 'extreme';
  else if (latitude >= 59) winterSeverity = 'severe';
  else if (latitude < 44) winterSeverity = 'mild';
  const urbanisation = cityPopulation >= 3000000 ? 'very-high' : cityPopulation >= 1000000 ? 'high' : cityPopulation >= 500000 ? 'medium' : 'low';
  const override = overrides[territory.properties.territory_id] || {};
  const finalTerrainClass = override.terrain_class || terrainClass;
  const movementCost = finalTerrainClass === 'mountainous' ? 1.6 : finalTerrainClass === 'subarctic' ? 1.5 : finalTerrainClass === 'mixed-upland' ? 1.3 : finalTerrainClass === 'open-lowland' ? 0.9 : 1.1;
  return {
    territory_id: territory.properties.territory_id,
    terrain_class: finalTerrainClass,
    winter_severity: override.winter_severity || winterSeverity,
    urbanisation,
    base_movement_cost: movementCost,
    mountain_percent: Number(Math.min(100, coverage.mountain).toFixed(1)),
    plateau_percent: Number(Math.min(100, coverage.plateau).toFixed(1)),
    plain_lowland_percent: Number(Math.min(100, coverage.plain + coverage.lowland).toFixed(1)),
    mapped_city_population: cityPopulation,
    physical_regions: physicalRegions.sort((a, b) => b.coverage_percent - a.coverage_percent),
    review_status: Object.keys(override).length ? 'authored-override' : 'data-derived-draft',
    override_reason: override.reason || null,
    source: 'Natural-Earth-physical-regions-v5.1.1'
  };
});

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'territory-terrain-profiles-v0.1.json'), `${JSON.stringify(profiles, null, 2)}\n`);
const report = {
  version: '0.1',
  territory_count: profiles.length,
  terrain_class_counts: Object.fromEntries([...Map.groupBy(profiles, item => item.terrain_class)].map(([key, values]) => [key, values.length])),
  winter_severity_counts: Object.fromEntries([...Map.groupBy(profiles, item => item.winter_severity)].map(([key, values]) => [key, values.length])),
  profiles_requiring_manual_review: profiles.filter(profile => profile.physical_regions.length === 0 && profile.review_status !== 'authored-override').map(profile => profile.territory_id),
  caveats: [
    'Natural Earth physical regions are cartographic generalisations, not an elevation model.',
    'Movement costs are initial balancing values and not measured travel-time estimates.',
    'Urbanisation currently reflects mapped major-city population rather than continuous settlement density.'
  ]
};
fs.writeFileSync(path.join(outputRoot, 'terrain-profile-build-report-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
