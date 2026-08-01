import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.PROJECT_ROOT||'.');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const rules=read('data/authored/formation-combat-rules-v0.1.json');
const scenarios=read('data/authored/combat-balance-scenarios-v0.1.json');
const outputDir=path.join(root,'data/generated/simulations');

function rng(seed){let state=seed>>>0;return()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};}
function variance(random){return 1+(random()*2-1)*rules.casualty_model.combat_variance;}
function readinessFactor(value){return Math.max(rules.readiness_floor,value/100);}
function cohesionFactor(value){return Math.max(rules.cohesion_floor,value/100);}

function futurePower(force){
  const weighted=Object.entries(force.armour_mix).reduce((sum,[state,share])=>sum+rules.future_states[state].combat_factor*share,0);
  return force.personnel/1000*weighted*readinessFactor(force.readiness)*cohesionFactor(force.cohesion)*rules.supply_factor[force.supply]*rules.stances[force.stance].power_multiplier;
}
function modernPower(force){
  return force.personnel/1000*rules.modern_types[force.type].combat_factor*readinessFactor(force.readiness)*cohesionFactor(force.cohesion)*rules.supply_factor[force.supply]*rules.stances[force.stance].power_multiplier*rules.support_multiplier[force.support||'none'];
}
function power(force){return force.kind==='future'?futurePower(force):modernPower(force);}
function protection(force,heavyIntensity){
  if(force.kind==='modern') return rules.modern_types[force.type].casualty_protection;
  return Object.entries(force.armour_mix).reduce((sum,[state,share])=>{
    const profile=rules.future_states[state];
    const factor=profile.casualty_protection+(profile.heavy_weapon_protection-profile.casualty_protection)*Math.min(1,heavyIntensity);
    return sum+factor*share;
  },0);
}
function heavyIntensity(force){return force.kind==='modern'?rules.modern_types[force.type].heavy_weapon_intensity*(rules.support_multiplier[force.support||'none']):0.8;}
function outcomeFor(ratio){if(ratio>=rules.outcome_ratio.decisive_attacker)return'decisive-attacker';if(ratio>=rules.outcome_ratio.attacker_success)return'attacker-success';if(ratio>=rules.outcome_ratio.stalemate)return'stalemate';if(ratio>=rules.outcome_ratio.defender_success)return'defender-success';return'decisive-defender';}

function simulate(scenario,index){
  const random=rng((index+1)*7919+scenario.id.length*104729);
  const terrain=rules.terrain_defence_multiplier[scenario.terrain];
  const attackerPower=power(scenario.attacker)*variance(random);
  const defenderPower=power(scenario.defender)*terrain*variance(random);
  const ratio=attackerPower/defenderPower;
  const outcome=outcomeFor(ratio);
  const total=attackerPower+defenderPower;
  const routAttacker=outcome==='decisive-defender'?rules.casualty_model.rout_loss_multiplier:1;
  const routDefender=outcome==='decisive-attacker'?rules.casualty_model.rout_loss_multiplier:1;
  const attackerLossRate=rules.casualty_model.base_attacker_loss_rate*(defenderPower/total)*protection(scenario.attacker,heavyIntensity(scenario.defender))*rules.stances[scenario.attacker.stance].exposure_multiplier*routAttacker*variance(random);
  const defenderLossRate=rules.casualty_model.base_defender_loss_rate*(attackerPower/total)*protection(scenario.defender,heavyIntensity(scenario.attacker))*rules.stances[scenario.defender.stance].exposure_multiplier*routDefender*variance(random);
  const attackerCasualties=Math.max(0,Math.round(scenario.attacker.personnel*attackerLossRate));
  const defenderCasualties=Math.max(0,Math.round(scenario.defender.personnel*defenderLossRate));
  const armourDamage=force=>{
    if(force.kind!=='future')return{newly_damaged_suits:0,newly_broken_suits:0};
    const armoured=force.personnel*((force.armour_mix.fully_armoured||0)+(force.armour_mix.damaged_armour||0));
    const enemy=force===scenario.attacker?scenario.defender:scenario.attacker;
    const exposure=rules.stances[force.stance].exposure_multiplier;
    const damaged=Math.round(armoured*rules.casualty_model.armour_damage_rate*heavyIntensity(enemy)*exposure*variance(random));
    return{newly_damaged_suits:damaged,newly_broken_suits:Math.round(damaged*rules.casualty_model.damaged_to_broken_share)};
  };
  return{outcome,ratio:Number(ratio.toFixed(3)),attacker_casualties:attackerCasualties,defender_casualties:defenderCasualties,attacker_armour_damage:armourDamage(scenario.attacker),defender_armour_damage:armourDamage(scenario.defender)};
}

function percentile(values,p){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.round((sorted.length-1)*p)];}
const reports=[];
for(const scenario of scenarios.scenarios){
  const runs=Array.from({length:scenarios.iterations_per_scenario},(_,index)=>simulate(scenario,index));
  const outcomes=Object.fromEntries(['decisive-attacker','attacker-success','stalemate','defender-success','decisive-defender'].map(name=>[name,Number((runs.filter(run=>run.outcome===name).length/runs.length*100).toFixed(1))]));
  reports.push({scenario_id:scenario.id,iterations:runs.length,outcome_percent:outcomes,median_power_ratio:percentile(runs.map(run=>run.ratio),0.5),attacker_casualties:{p10:percentile(runs.map(run=>run.attacker_casualties),0.1),median:percentile(runs.map(run=>run.attacker_casualties),0.5),p90:percentile(runs.map(run=>run.attacker_casualties),0.9)},defender_casualties:{p10:percentile(runs.map(run=>run.defender_casualties),0.1),median:percentile(runs.map(run=>run.defender_casualties),0.5),p90:percentile(runs.map(run=>run.defender_casualties),0.9)},future_armour_damage:{attacker_newly_damaged_median:percentile(runs.map(run=>run.attacker_armour_damage.newly_damaged_suits),0.5),attacker_newly_broken_median:percentile(runs.map(run=>run.attacker_armour_damage.newly_broken_suits),0.5),defender_newly_damaged_median:percentile(runs.map(run=>run.defender_armour_damage.newly_damaged_suits),0.5),defender_newly_broken_median:percentile(runs.map(run=>run.defender_armour_damage.newly_broken_suits),0.5)}});
}
const report={version:'0.1',purpose:'First-pass strategic combat balance harness',run_count:reports.reduce((sum,item)=>sum+item.iterations,0),scenario_reports:reports,validation:{future_dominates_security:reports.find(item=>item.scenario_id==='future-v-security').outcome_percent['decisive-attacker']+reports.find(item=>item.scenario_id==='future-v-security').outcome_percent['attacker-success']>=90,combined_arms_can_stop_small_future_force:reports.find(item=>item.scenario_id==='future-v-combined-air').outcome_percent['defender-success']+reports.find(item=>item.scenario_id==='future-v-combined-air').outcome_percent['decisive-defender']>=60,armour_depletion_changes_outcome:reports.find(item=>item.scenario_id==='damaged-future-v-mechanised').median_power_ratio<reports.find(item=>item.scenario_id==='future-v-mechanised').median_power_ratio,modern_allies_not_automatic_winners:reports.find(item=>item.scenario_id==='allied-modern-v-modern').outcome_percent['attacker-success']<50},limitations:['Resolves one abstract engagement rather than a multi-day battle.','Does not yet model intelligence, surprise, general command, retreat routes or reinforcement arrival.','Air and artillery are support multipliers rather than separately targetable formations.','Casualty and armour-damage rates are balancing values, not real-world predictions.']};
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'combat-balance-summary-v0.1.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
