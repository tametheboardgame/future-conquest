import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.PROJECT_ROOT || '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const profiles = read('data/generated/strategic-geography/territory-terrain-profiles-v0.1.json');
const hubs = read('data/authored/transport-hubs-v0.1.json').hubs;
const crossings = read('data/authored/critical-crossings-v0.1.json').crossings;
const airports = read('data/generated/strategic-geography/strategic-airports-selected-v0.1.geojson').features;
const ports = read('data/generated/strategic-geography/ports-selected-v0.1.geojson').features;
const adjacency = read('data/generated/maps/adjacency-land-v0.3.json');
const routes = read('data/generated/maps/routes-provisional-v0.3.json');
const rules = read('data/authored/movement-supply-rules-v0.1.json');
const outputDir = path.join(root, 'data/generated/systems');
const errors = [];
const warnings = [];
const territoryIds = new Set(profiles.map(item => item.territory_id));

const countByTerritory = (features, territoryId) => features.filter(feature => feature.properties.territory_id === territoryId).length;
const baselines = profiles.map(profile => {
  const territoryHubs = hubs.filter(hub => hub.territory_id === profile.territory_id);
  const primaryHubCapacity = territoryHubs.length ? Math.max(...territoryHubs.map(hub => hub.base_capacity)) : 0;
  const extraHubBonus = Math.min(rules.supply.additional_hub_bonus_cap, Math.max(0, territoryHubs.length - 1));
  const portCount = countByTerritory(ports, profile.territory_id);
  const airportCount = countByTerritory(airports, profile.territory_id);
  const localCapacity = rules.supply.urban_local_capacity[profile.urbanisation];
  const portBonus = Math.min(rules.supply.selected_port_bonus_cap, portCount);
  const airportBonus = Math.min(rules.supply.selected_airport_bonus_cap, airportCount);
  const baselineSupplyCapacity = localCapacity + primaryHubCapacity + extraHubBonus + portBonus + airportBonus;
  return {
    territory_id: profile.territory_id,
    terrain_class: profile.terrain_class,
    base_entry_operation_points: rules.movement.destination_terrain_cost[profile.terrain_class],
    winter_surcharge_when_active: rules.movement.winter_surcharge[profile.winter_severity],
    urbanisation: profile.urbanisation,
    local_supply_capacity: localCapacity,
    transport_hub_count: territoryHubs.length,
    primary_hub_capacity: primaryHubCapacity,
    selected_port_count: portCount,
    selected_airport_count: airportCount,
    baseline_supply_capacity: baselineSupplyCapacity,
    supports_strategic_redeployment: primaryHubCapacity >= rules.movement.strategic_redeployment.minimum_friendly_hub_capacity
  };
});

const crossingEffects = crossings.map(crossing => {
  const rule = rules.crossing_denial[crossing.crossing_type];
  if (!rule) errors.push(`No denial rule for crossing type ${crossing.crossing_type}`);
  const isLandAdjacent = adjacency[crossing.territory_from]?.includes(crossing.territory_to) || crossing.territory_from === crossing.territory_to;
  const isExplicitRoute = routes.some(route => [route.from, route.to].includes(crossing.territory_from) && [route.from, route.to].includes(crossing.territory_to));
  if (!isLandAdjacent && !isExplicitRoute) warnings.push(`${crossing.id} is not yet attached to an existing campaign edge`);
  return {
    crossing_id: crossing.id,
    name: crossing.name,
    territory_from: crossing.territory_from,
    territory_to: crossing.territory_to,
    crossing_type: crossing.crossing_type,
    denied_effect: rule?.effect || 'undefined',
    denied_movement_surcharge: rule?.movement_surcharge ?? null,
    denied_supply_capacity_multiplier: rule?.supply_capacity_multiplier ?? null,
    current_status_source: 'world-state',
    edge_attachment: isLandAdjacent ? 'land-adjacency' : isExplicitRoute ? 'explicit-route' : 'requires-review'
  };
});

for (const hub of hubs) if (!territoryIds.has(hub.territory_id)) errors.push(`${hub.id} references missing territory ${hub.territory_id}`);
if (baselines.length !== 101) errors.push(`Expected 101 territory baselines, found ${baselines.length}`);
const capacities = baselines.map(item => item.baseline_supply_capacity);
const report = {
  version: '0.1',
  valid: errors.length === 0,
  counts: {
    territory_baselines: baselines.length,
    crossing_effects: crossingEffects.length,
    strategic_redeployment_territories: baselines.filter(item => item.supports_strategic_redeployment).length,
    crossings_requiring_edge_review: crossingEffects.filter(item => item.edge_attachment === 'requires-review').length
  },
  supply_capacity_range: { minimum: Math.min(...capacities), maximum: Math.max(...capacities), mean: Number((capacities.reduce((a, b) => a + b, 0) / capacities.length).toFixed(2)) },
  errors,
  warnings,
  balancing_status: 'first-pass-values-require-simulation'
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'territory-logistics-baseline-v0.1.json'), `${JSON.stringify(baselines, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'crossing-denial-effects-v0.1.json'), `${JSON.stringify(crossingEffects, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'movement-supply-validation-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
