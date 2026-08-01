import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.PROJECT_ROOT || '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const rules = read('data/authored/movement-supply-rules-v0.1.json');
const scenarios = read('data/authored/logistics-simulation-scenarios-v0.1.json');
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
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

function supplyBand(percent) {
  return rules.supply.bands.find(band => percent >= band.minimum_percent) || rules.supply.bands.at(-1);
}

function captureDays(territory) {
  let days = scenarios.capture_duration.base_days;
  if (['mixed-upland', 'mountainous', 'subarctic'].includes(territory.terrain_class)) days += scenarios.capture_duration.upland_or_extreme_terrain_extra_days;
  if (['high', 'very-high'].includes(territory.urbanisation)) days += scenarios.capture_duration.high_urbanisation_extra_days;
  return days;
}

function simulate(startId, mode, policy) {
  const controlled = new Map([[startId, 0]]);
  const operations = [];
  let reserve = scenarios.portal_reserve_days * mode.future_personnel / 1000 * rules.supply.formation_demand_per_1000_personnel.future_infantry;
  let armourWear = 0;
  let minimumSupplyPercent = 100;
  let daysLowOrWorse = 0;
  let completionDay = null;
  let stalledForPersonnel = false;
  const supplyHistory = [];

  for (let day = 1; day <= scenarios.simulation_days; day += 1) {
    for (const operation of operations) operation.remaining_days -= 1;
    for (const operation of operations.filter(item => item.remaining_days <= 0)) controlled.set(operation.target, day);
    operations.splice(0, operations.length, ...operations.filter(item => item.remaining_days > 0));
    if (controlled.size === territories.length && completionDay === null) completionDay = day;

    let requiredGarrison = 0;
    for (const [territoryId, capturedDay] of controlled) {
      const territory = byId.get(territoryId);
      let futureShare = 1;
      if (policy.handover_delay_days !== null && day - capturedDay >= policy.handover_delay_days) futureShare -= policy.local_handover_share;
      requiredGarrison += scenarios.garrison_personnel[territory.urbanisation] * futureShare;
    }
    const mobilePersonnel = Math.max(0, mode.future_personnel - requiredGarrison);
    const personnelSpearheads = Math.floor(mobilePersonnel / scenarios.minimum_mobile_group_personnel);
    const spearheadLimit = Math.min(mode.maximum_spearheads, personnelSpearheads);
    stalledForPersonnel ||= controlled.size < territories.length && spearheadLimit === 0;

    const targeted = new Set(operations.map(item => item.target));
    const frontier = new Set();
    for (const territoryId of controlled.keys()) {
      for (const neighbour of adjacency[territoryId]) if (!controlled.has(neighbour) && !targeted.has(neighbour)) frontier.add(neighbour);
    }
    const availableSlots = Math.max(0, spearheadLimit - operations.length);
    const targets = [...frontier]
      .map(id => byId.get(id))
      .sort((a, b) => {
        const aScore = a.baseline_supply_capacity * 2 + a.primary_hub_capacity - a.base_entry_operation_points;
        const bScore = b.baseline_supply_capacity * 2 + b.primary_hub_capacity - b.base_entry_operation_points;
        return bScore - aScore || a.territory_id.localeCompare(b.territory_id);
      })
      .slice(0, availableSlots);
    for (const target of targets) operations.push({ target: target.territory_id, remaining_days: captureDays(target) });

    let capacity = 0;
    for (const [territoryId, capturedDay] of controlled) {
      const age = day - capturedDay;
      const activation = Math.min(1, 0.25 + 0.75 * age / scenarios.captured_capacity_activation_days);
      capacity += byId.get(territoryId).baseline_supply_capacity * activation;
    }
    const demand = mode.future_personnel / 1000 * rules.supply.formation_demand_per_1000_personnel.future_infantry;
    const shortage = Math.max(0, demand - capacity);
    const reserveDraw = Math.min(reserve, shortage);
    reserve -= reserveDraw;
    const supplied = Math.min(demand, capacity + reserveDraw);
    const supplyPercent = demand ? supplied / demand * 100 : 100;
    const band = supplyBand(supplyPercent);
    minimumSupplyPercent = Math.min(minimumSupplyPercent, supplyPercent);
    if (['low', 'critical', 'isolated'].includes(band.id)) daysLowOrWorse += 1;
    armourWear += scenarios.base_daily_armour_wear_percent * band.armour_wear_multiplier;
    supplyHistory.push({ day, territories: controlled.size, supply_percent: Number(supplyPercent.toFixed(1)), band: band.id, reserve_remaining: Number(reserve.toFixed(1)), future_garrison: Math.round(requiredGarrison), mobile_personnel: Math.round(mobilePersonnel) });
    if (completionDay !== null) break;
  }

  const final = supplyHistory.at(-1);
  return {
    start_territory: startId,
    mode: mode.id,
    occupation_policy: policy.id,
    completed: completionDay !== null,
    completion_day: completionDay,
    territories_controlled: final.territories,
    final_supply_band: final.band,
    minimum_supply_percent: Number(minimumSupplyPercent.toFixed(1)),
    days_low_or_worse: daysLowOrWorse,
    future_garrison_at_end: final.future_garrison,
    mobile_personnel_at_end: final.mobile_personnel,
    cumulative_armour_wear_percent: Number(armourWear.toFixed(2)),
    stalled_for_personnel: stalledForPersonnel,
    reserve_remaining: final.reserve_remaining
  };
}

const runs = [];
for (const mode of scenarios.modes) for (const policy of scenarios.occupation_policies) for (const territory of territories) runs.push(simulate(territory.territory_id, mode, policy));

const summaries = [];
for (const mode of scenarios.modes) {
  for (const policy of scenarios.occupation_policies) {
    const group = runs.filter(run => run.mode === mode.id && run.occupation_policy === policy.id);
    const completed = group.filter(run => run.completed);
    summaries.push({
      mode: mode.id,
      future_personnel: mode.future_personnel,
      occupation_policy: policy.id,
      starting_territories_tested: group.length,
      completion_rate_percent: Number((completed.length / group.length * 100).toFixed(1)),
      completion_day_median: completed.length ? percentile(completed.map(run => run.completion_day), 0.5) : null,
      completion_day_p10: completed.length ? percentile(completed.map(run => run.completion_day), 0.1) : null,
      completion_day_p90: completed.length ? percentile(completed.map(run => run.completion_day), 0.9) : null,
      territories_controlled_median: percentile(group.map(run => run.territories_controlled), 0.5),
      minimum_supply_percent_median: percentile(group.map(run => run.minimum_supply_percent), 0.5),
      days_low_or_worse_median: percentile(group.map(run => run.days_low_or_worse), 0.5),
      armour_wear_percent_median: percentile(group.map(run => run.cumulative_armour_wear_percent), 0.5),
      personnel_stall_rate_percent: Number((group.filter(run => run.stalled_for_personnel).length / group.length * 100).toFixed(1)),
      slowest_successful_start: completed.length ? completed.sort((a, b) => b.completion_day - a.completion_day)[0].start_territory : null,
      worst_reach_start: [...group].sort((a, b) => a.territories_controlled - b.territories_controlled || b.days_low_or_worse - a.days_low_or_worse)[0].start_territory
    });
  }
}

const report = {
  version: '0.1',
  purpose: 'Movement, supply and garrison stress test. This is not a combat or victory simulation.',
  assumptions: scenarios,
  run_count: runs.length,
  summaries,
  findings: [],
  limitations: [
    'No enemy force strength, combat casualties, diplomacy, escalation or resistance is modelled.',
    'Conquest order uses a deterministic logistics-first heuristic rather than player or AI planning.',
    'Local-force handover assumes availability after a delay and does not yet model loyalty or political cost.',
    'Sea-route shipping availability and crossing damage are not varied in this first pass.'
  ]
};

const integrated = summaries.filter(item => item.occupation_policy === 'integrated-local-forces');
if (integrated.some(item => item.completion_rate_percent < 100)) report.findings.push('At least one force setting cannot consistently cover the full map even with local-force integration.');
if (summaries.filter(item => item.occupation_policy === 'future-only').some(item => item.personnel_stall_rate_percent > 0)) report.findings.push('Future-only occupation creates a finite garrison wall, confirming that allied or client forces are mechanically necessary.');
if (summaries.some(item => item.days_low_or_worse_median > 14)) report.findings.push('At least one setting spends a sustained period in low or worse supply and requires demand or reserve tuning.');
if (summaries.every(item => item.days_low_or_worse_median === 0)) report.findings.push('Supply does not bind in the logistics-first expansion envelope; slower combat, corridor bottlenecks or reduced captured-capacity activation must create the intended pressure.');
if (!report.findings.length) report.findings.push('The first-pass logistics relationships produce no immediate hard failure, but still require combat-layer simulation.');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'logistics-envelope-runs-v0.1.json'), `${JSON.stringify(runs, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'logistics-envelope-summary-v0.1.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
