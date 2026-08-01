import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.PROJECT_ROOT || '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const rules = read('data/authored/movement-supply-rules-v0.1.json');
const scenarios = read('data/authored/logistics-simulation-scenarios-v0.2.json');
const territories = read('data/generated/systems/territory-logistics-baseline-v0.1.json');
const landAdjacency = read('data/generated/maps/adjacency-land-v0.3.json');
const routes = read('data/generated/maps/routes-provisional-v0.3.json');
const outputDir = path.join(root, 'data/generated/simulations');
const byId = new Map(territories.map(item => [item.territory_id, item]));
const adjacency = structuredClone(landAdjacency);
for (const route of routes) {
  if (!adjacency[route.from].includes(route.to)) adjacency[route.from].push(route.to);
  if (!adjacency[route.to].includes(route.from)) adjacency[route.to].push(route.from);
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}

function bandFor(percent) {
  return rules.supply.bands.find(band => percent >= band.minimum_percent) || rules.supply.bands.at(-1);
}

function distancesFrom(startId, controlled) {
  const distance = new Map([[startId, 0]]);
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency[current]) {
      if (!controlled.has(next) || distance.has(next)) continue;
      distance.set(next, distance.get(current) + 1);
      queue.push(next);
    }
  }
  return distance;
}

function baseCaptureDays(territory, profile) {
  let days = scenarios.capture_duration.base_days;
  if (['mixed-upland', 'mountainous', 'subarctic'].includes(territory.terrain_class)) days += scenarios.capture_duration.upland_or_extreme_terrain_extra_days;
  if (['high', 'very-high'].includes(territory.urbanisation)) days += scenarios.capture_duration.high_urbanisation_extra_days;
  return Math.ceil(days * profile.resistance_multiplier);
}

function simulate(startId, mode, profile) {
  const controlled = new Map([[startId, 0]]);
  const operations = [];
  const futureDemand = mode.future_personnel / 1000 * rules.supply.formation_demand_per_1000_personnel.future_infantry;
  let reserve = scenarios.portal_reserve_days * futureDemand;
  let armourWear = 0;
  let minimumSupply = 100;
  let lowDays = 0;
  let completionDay = null;
  let temporaryPersonnelPauses = 0;
  let previousBand = rules.supply.bands[0];
  let finalState = null;

  for (let day = 1; day <= scenarios.simulation_days; day += 1) {
    const operationProgress = ({full:1,strained:0.9,low:0.65,critical:0.35,isolated:0.1})[previousBand.id];
    for (const operation of operations) operation.remaining_days -= operationProgress;
    for (const operation of operations.filter(item => item.remaining_days <= 0)) controlled.set(operation.target, day);
    operations.splice(0, operations.length, ...operations.filter(item => item.remaining_days > 0));

    let futureGarrison = 0;
    let modernGarrison = 0;
    for (const [territoryId, capturedDay] of controlled) {
      const base = scenarios.garrison_personnel[byId.get(territoryId).urbanisation];
      const handedOver = profile.handover_delay_days !== null && day - capturedDay >= profile.handover_delay_days ? profile.local_handover_share : 0;
      const loyaltyReserve = handedOver * (1 - profile.loyalty) * scenarios.loyalty_reserve_factor;
      futureGarrison += base * (1 - handedOver + loyaltyReserve);
      modernGarrison += base * handedOver;
    }
    const mobilePersonnel = Math.max(0, mode.future_personnel - futureGarrison);
    const spearheads = Math.min(mode.maximum_spearheads, Math.floor(mobilePersonnel / scenarios.minimum_mobile_group_personnel));
    if (controlled.size < territories.length && spearheads === 0) temporaryPersonnelPauses += 1;

    const targeted = new Set(operations.map(item => item.target));
    const frontier = new Set();
    for (const territoryId of controlled.keys()) for (const neighbour of adjacency[territoryId]) if (!controlled.has(neighbour) && !targeted.has(neighbour)) frontier.add(neighbour);
    const candidates = [...frontier].map(id => byId.get(id)).sort((a, b) => {
      const aScore = a.baseline_supply_capacity * 2 + a.primary_hub_capacity - a.base_entry_operation_points;
      const bScore = b.baseline_supply_capacity * 2 + b.primary_hub_capacity - b.base_entry_operation_points;
      return bScore - aScore || a.territory_id.localeCompare(b.territory_id);
    });
    for (const target of candidates.slice(0, Math.max(0, spearheads - operations.length))) operations.push({target:target.territory_id,remaining_days:baseCaptureDays(target, profile)});

    const distances = distancesFrom(startId, controlled);
    let grossCapacity = 0;
    for (const [territoryId, capturedDay] of controlled) {
      const age = day - capturedDay;
      const activation = Math.min(1, scenarios.initial_capacity_share + (1 - scenarios.initial_capacity_share) * age / scenarios.captured_capacity_activation_days);
      const distance = distances.get(territoryId) ?? 20;
      const distanceEfficiency = Math.max(scenarios.minimum_distance_efficiency, 1 - distance * scenarios.distance_loss_per_edge);
      grossCapacity += byId.get(territoryId).baseline_supply_capacity * activation * distanceEfficiency;
    }
    const usableCapacity = grossCapacity * (1 - profile.civilian_capacity_reserve);
    const modernDemand = modernGarrison / 1000 * rules.supply.formation_demand_per_1000_personnel.modern_infantry;
    const demand = futureDemand + modernDemand;
    const shortage = Math.max(0, demand - usableCapacity);
    const reserveDraw = Math.min(reserve, shortage);
    reserve -= reserveDraw;
    const supplyPercent = demand ? Math.min(100, (usableCapacity + reserveDraw) / demand * 100) : 100;
    const band = bandFor(supplyPercent);
    previousBand = band;
    minimumSupply = Math.min(minimumSupply, supplyPercent);
    if (['low','critical','isolated'].includes(band.id)) lowDays += 1;
    armourWear += scenarios.base_daily_armour_wear_percent * band.armour_wear_multiplier;

    const functioningSupply = band.id !== 'isolated';
    if (controlled.size === territories.length && functioningSupply && completionDay === null) completionDay = day;
    finalState = {territories:controlled.size,supply_band:band.id,supply_percent:supplyPercent,future_garrison:futureGarrison,modern_garrison:modernGarrison,mobile_personnel:mobilePersonnel,reserve};
    if (completionDay !== null) break;
  }

  return {
    start_territory:startId,
    mode:mode.id,
    occupation_profile:profile.id,
    completed:completionDay !== null,
    completion_day:completionDay,
    within_target_range:completionDay !== null && completionDay >= mode.target_turn_range[0] && completionDay <= mode.target_turn_range[1],
    territories_controlled:finalState.territories,
    final_supply_band:finalState.supply_band,
    minimum_supply_percent:Number(minimumSupply.toFixed(1)),
    days_low_or_worse:lowDays,
    temporary_personnel_pause_days:temporaryPersonnelPauses,
    future_garrison_at_end:Math.round(finalState.future_garrison),
    modern_garrison_at_end:Math.round(finalState.modern_garrison),
    mobile_personnel_at_end:Math.round(finalState.mobile_personnel),
    cumulative_armour_wear_percent:Number(armourWear.toFixed(2)),
    reserve_remaining:Number(finalState.reserve.toFixed(1))
  };
}

const runs=[];
for(const mode of scenarios.modes) for(const profile of scenarios.occupation_profiles) for(const territory of territories) runs.push(simulate(territory.territory_id,mode,profile));
const summaries=[];
for(const mode of scenarios.modes) for(const profile of scenarios.occupation_profiles){
  const group=runs.filter(run=>run.mode===mode.id&&run.occupation_profile===profile.id);
  const completed=group.filter(run=>run.completed);
  summaries.push({
    mode:mode.id,future_personnel:mode.future_personnel,occupation_profile:profile.id,target_turn_range:mode.target_turn_range,
    starting_territories_tested:group.length,completion_rate_percent:Number((completed.length/group.length*100).toFixed(1)),
    completion_day_median:completed.length?percentile(completed.map(run=>run.completion_day),0.5):null,
    completion_day_p10:completed.length?percentile(completed.map(run=>run.completion_day),0.1):null,
    completion_day_p90:completed.length?percentile(completed.map(run=>run.completion_day),0.9):null,
    within_target_rate_percent:Number((group.filter(run=>run.within_target_range).length/group.length*100).toFixed(1)),
    territories_controlled_median:percentile(group.map(run=>run.territories_controlled),0.5),
    minimum_supply_percent_median:percentile(group.map(run=>run.minimum_supply_percent),0.5),
    days_low_or_worse_median:percentile(group.map(run=>run.days_low_or_worse),0.5),
    personnel_pause_days_median:percentile(group.map(run=>run.temporary_personnel_pause_days),0.5),
    armour_wear_percent_median:percentile(group.map(run=>run.cumulative_armour_wear_percent),0.5)
  });
}

const report={
  version:'0.2',purpose:'Mechanics-review logistics envelope. Not a combat or victory prediction.',run_count:runs.length,summaries,
  findings:[],limitations:[
    'Resistance is represented as time delay rather than resolved combat.',
    'Loyalty is a deterministic reserve burden, not yet an event or defection system.',
    'Civilian demand is a reserved capacity share and does not yet react dynamically to player conduct.',
    'Crossing destruction, enemy interdiction, casualties and escalation are not yet simulated.'
  ]
};
const negotiated=summaries.filter(item=>item.occupation_profile==='negotiated-integration');
if(negotiated.every(item=>item.completion_rate_percent===100)) report.findings.push('All four army sizes remain geographically viable under negotiated local-force integration.');
if(negotiated.some(item=>item.minimum_supply_percent_median<67)) report.findings.push('The revised supply model now creates meaningful Low or worse supply exposure in at least one army setting.');
if(summaries.filter(item=>item.occupation_profile==='future-only'&&['veteran','desperate'].includes(item.mode)).some(item=>item.completion_rate_percent<100)) report.findings.push('Veteran and Desperate modes still require local-force integration to cover the complete map.');
if(negotiated.some(item=>item.within_target_rate_percent<50)) report.findings.push('At least one accepted duration target still requires combat-layer pacing rather than further logistics-only tuning.');
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'logistics-envelope-runs-v0.2.json'),`${JSON.stringify(runs,null,2)}\n`);
fs.writeFileSync(path.join(outputDir,'logistics-envelope-summary-v0.2.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
