import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.PROJECT_ROOT||'.');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const combat=read('data/authored/formation-combat-rules-v0.1.json');
const operational=read('data/authored/operational-combat-rules-v0.1.json');
const scenarioData=read('data/authored/operational-combat-scenarios-v0.1.json');
const outputDir=path.join(root,'data/generated/simulations');

function rng(seed){let state=seed>>>0;return()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};}
function randomFactor(random){return 1+(random()*2-1)*combat.casualty_model.combat_variance;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function cloneForce(source){
  const force=structuredClone(source);
  force.active=force.personnel;
  force.initial_personnel=force.personnel;
  force.total_combat_casualties=0;
  force.broken_suit_pool=0;
  force.captured_suits=0;
  force.captured_energy_weapons=0;
  if(force.kind==='future'){
    force.armour={
      fully_armoured:Math.round(force.personnel*(force.armour_mix.fully_armoured||0)),
      damaged_armour:Math.round(force.personnel*(force.armour_mix.damaged_armour||0)),
      unarmoured_energy_rifle:Math.round(force.personnel*(force.armour_mix.unarmoured_energy_rifle||0))
    };
  }
  return force;
}
function normaliseFuture(force){
  const total=force.armour.fully_armoured+force.armour.damaged_armour+force.armour.unarmoured_energy_rifle;
  if(total===force.active)return;
  const difference=force.active-total;
  force.armour.unarmoured_energy_rifle=Math.max(0,force.armour.unarmoured_energy_rifle+difference);
}
function power(force){
  const readiness=Math.max(combat.readiness_floor,force.readiness/100);
  const cohesion=Math.max(combat.cohesion_floor,force.cohesion/100);
  const common=readiness*cohesion*combat.supply_factor[force.supply]*combat.stances[force.stance].power_multiplier;
  if(force.kind==='modern')return force.active/1000*combat.modern_types[force.type].combat_factor*common*combat.support_multiplier[force.support||'none'];
  return Object.entries(force.armour).reduce((sum,[state,count])=>sum+count/1000*combat.future_states[state].combat_factor,0)*common;
}
function heavy(force){return force.kind==='modern'?combat.modern_types[force.type].heavy_weapon_intensity*combat.support_multiplier[force.support||'none']:0.8;}
function protection(force,enemyHeavy){
  if(force.kind==='modern')return combat.modern_types[force.type].casualty_protection;
  const total=Math.max(1,force.active);
  return Object.entries(force.armour).reduce((sum,[state,count])=>{
    const p=combat.future_states[state];
    return sum+count/total*(p.casualty_protection+(p.heavy_weapon_protection-p.casualty_protection)*Math.min(1,enemyHeavy));
  },0);
}
function outcomeFor(ratio){if(ratio>=combat.outcome_ratio.decisive_attacker)return'decisive-attacker';if(ratio>=combat.outcome_ratio.attacker_success)return'attacker-success';if(ratio>=combat.outcome_ratio.stalemate)return'stalemate';if(ratio>=combat.outcome_ratio.defender_success)return'defender-success';return'decisive-defender';}
function removeCasualties(force,count,random){
  const actual=Math.min(force.active,Math.max(0,count));
  force.active-=actual;
  force.total_combat_casualties+=actual;
  if(force.kind==='future'){
    for(let index=0;index<actual;index+=1){
      const total=Math.max(1,force.armour.fully_armoured+force.armour.damaged_armour+force.armour.unarmoured_energy_rifle);
      const roll=random()*total;
      if(roll<force.armour.fully_armoured)force.armour.fully_armoured-=1;
      else if(roll<force.armour.fully_armoured+force.armour.damaged_armour)force.armour.damaged_armour-=1;
      else force.armour.unarmoured_energy_rifle=Math.max(0,force.armour.unarmoured_energy_rifle-1);
    }
  }
  return actual;
}
function damageArmour(force,enemy,random){
  if(force.kind!=='future')return{damaged:0,broken:0};
  const exposure=combat.stances[force.stance].exposure_multiplier;
  const potential=Math.round((force.armour.fully_armoured+force.armour.damaged_armour)*combat.casualty_model.armour_damage_rate*heavy(enemy)*exposure*randomFactor(random));
  const newlyDamaged=Math.min(force.armour.fully_armoured,Math.round(potential*0.7));
  const newlyBroken=Math.min(force.armour.damaged_armour,Math.max(0,potential-newlyDamaged));
  force.armour.fully_armoured-=newlyDamaged;
  force.armour.damaged_armour+=newlyDamaged-newlyBroken;
  force.armour.unarmoured_energy_rifle+=newlyBroken;
  force.broken_suit_pool+=newlyBroken;
  return{damaged:newlyDamaged,broken:newlyBroken};
}
function fieldMaintenance(force){
  if(force.kind!=='future')return 0;
  const supplyMultiplier=force.supply==='full'?1:operational.field_maintenance[`${force.supply}_multiplier`]||0;
  const repair=Math.min(force.armour.damaged_armour,Math.floor(force.armour.damaged_armour*operational.field_maintenance.full_supply_daily_damaged_to_functional*supplyMultiplier));
  force.armour.damaged_armour-=repair;
  force.armour.fully_armoured+=repair;
  return repair;
}
function mergeReinforcement(target,source){
  const reinforcement=cloneForce(source);
  const total=target.active+reinforcement.active;
  target.readiness=(target.readiness*target.active+reinforcement.readiness*reinforcement.active)/total;
  target.cohesion=(target.cohesion*target.active+operational.reinforcement.arrival_cohesion*reinforcement.active)/total;
  target.active=total;
  target.initial_personnel+=reinforcement.initial_personnel;
  if(target.kind==='future'&&reinforcement.kind==='future')for(const state of Object.keys(target.armour))target.armour[state]+=reinforcement.armour[state];
  else if(target.kind!==reinforcement.kind)throw new Error('Mixed-kind operational formations are not supported in v0.1');
}
function routeClass(routes,routed){if(routes<=0)return'encircled';if(routed)return'rout';return'ordered_retreat';}
function aftermath(force,status,holds){
  const medicalKey=holds?'holds_battlefield':status;
  const medical=operational.medical_outcomes[medicalKey];
  const total=force.total_combat_casualties;
  const result={killed:Math.round(total*medical.killed),critical_wounded:Math.round(total*medical.critical),recoverable_wounded:Math.round(total*medical.recoverable),captured:Math.round(total*medical.captured),return_days:{recoverable:operational.medical_return_days.recoverable_wounded,critical:operational.medical_return_days.critical_wounded},recovered_suits:0,captured_suits:0,captured_energy_weapons:0,technology_escalation:0};
  if(force.kind==='future'){
    const salvageKey=holds?'holds_battlefield':status;
    const recovered=Math.round(force.broken_suit_pool*operational.salvage_recovery[salvageKey]);
    const capturedSuits=Math.max(0,force.broken_suit_pool-recovered);
    const weaponsAtRisk=total+force.broken_suit_pool;
    const recoveredWeapons=Math.round(weaponsAtRisk*operational.energy_weapon_recovery[salvageKey]);
    const capturedWeapons=Math.max(0,weaponsAtRisk-recoveredWeapons);
    result.recovered_suits=recovered;
    result.captured_suits=capturedSuits;
    result.captured_energy_weapons=capturedWeapons;
    result.technology_escalation=Number((capturedSuits*operational.technology_capture_escalation_per_suit+capturedWeapons*operational.technology_capture_escalation_per_energy_weapon).toFixed(2));
  }
  return result;
}

function simulate(scenario,index){
  const random=rng((index+1)*65537+scenario.id.length*8191);
  const attacker=cloneForce(scenario.attacker);
  const defender=cloneForce(scenario.defender);
  let progress=operational.progress.initial;
  let day=0;
  let result='unresolved';
  let withdrawnSide=null;
  let routedSide=null;
  const reinforcements=(scenario.reinforcements||[]).map(item=>({...item,committed:false}));
  const daily=[];
  while(day<(scenario.maximum_days||operational.maximum_battle_days)&&result==='unresolved'){
    day+=1;
    for(const item of reinforcements.filter(item=>!item.committed&&item.arrival_day===day)){
      mergeReinforcement(item.side==='attacker'?attacker:defender,item.force);
      item.committed=true;
    }
    const attackerPower=power(attacker)*randomFactor(random);
    const defenderPower=power(defender)*combat.terrain_defence_multiplier[scenario.terrain]*randomFactor(random);
    const ratio=attackerPower/Math.max(0.01,defenderPower);
    const outcome=outcomeFor(ratio);
    const totalPower=attackerPower+defenderPower;
    const attackerRate=combat.casualty_model.base_attacker_loss_rate*(defenderPower/totalPower)*protection(attacker,heavy(defender))*combat.stances[attacker.stance].exposure_multiplier*(outcome==='decisive-defender'?combat.casualty_model.rout_loss_multiplier:1)*randomFactor(random);
    const defenderRate=combat.casualty_model.base_defender_loss_rate*(attackerPower/totalPower)*protection(defender,heavy(attacker))*combat.stances[defender.stance].exposure_multiplier*(outcome==='decisive-attacker'?combat.casualty_model.rout_loss_multiplier:1)*randomFactor(random);
    const attackerCasualties=removeCasualties(attacker,Math.round(attacker.active*attackerRate),random);
    const defenderCasualties=removeCasualties(defender,Math.round(defender.active*defenderRate),random);
    const attackerArmour=damageArmour(attacker,defender,random);
    const defenderArmour=damageArmour(defender,attacker,random);
    attacker.cohesion=clamp(attacker.cohesion+operational.cohesion_delta[outcome].attacker,0,100);
    defender.cohesion=clamp(defender.cohesion+operational.cohesion_delta[outcome].defender,0,100);
    progress+=operational.progress[outcome.replaceAll('-','_')];
    const repairedAttacker=fieldMaintenance(attacker);
    const repairedDefender=fieldMaintenance(defender);
    const attackerThreshold=scenario.attacker_withdraw_cohesion??operational.withdrawal.default_cohesion_threshold;
    const defenderThreshold=scenario.defender_withdraw_cohesion??operational.withdrawal.default_cohesion_threshold;
    const attackerCasualtyShare=attacker.total_combat_casualties/attacker.initial_personnel;
    const defenderCasualtyShare=defender.total_combat_casualties/defender.initial_personnel;
    if(progress>=operational.progress.capture_threshold||defender.active<=0){result='attacker-captures-objective';routedSide=defender.cohesion<15?'defender':null;}
    else if(progress<=operational.progress.repulse_threshold||attacker.active<=0){result='attacker-repulsed';routedSide=attacker.cohesion<15?'attacker':null;}
    else if(attacker.cohesion<attackerThreshold||attackerCasualtyShare>=operational.withdrawal.default_casualty_share_threshold){result='attacker-withdraws';withdrawnSide='attacker';routedSide=attacker.cohesion<15?'attacker':null;}
    else if(defender.cohesion<defenderThreshold||defenderCasualtyShare>=operational.withdrawal.default_casualty_share_threshold){result='defender-withdraws';withdrawnSide='defender';routedSide=defender.cohesion<15?'defender':null;}
    daily.push({day,outcome,power_ratio:Number(ratio.toFixed(2)),progress,attacker_active:attacker.active,defender_active:defender.active,attacker_cohesion:Number(attacker.cohesion.toFixed(1)),defender_cohesion:Number(defender.cohesion.toFixed(1)),attacker_casualties:attackerCasualties,defender_casualties:defenderCasualties,attacker_armour:attackerArmour,defender_armour:defenderArmour,field_repairs:{attacker:repairedAttacker,defender:repairedDefender}});
  }
  if(result==='unresolved')result='operational-stalemate';
  const attackerHolds=['attacker-captures-objective','defender-withdraws'].includes(result);
  const defenderHolds=['attacker-repulsed','attacker-withdraws'].includes(result);
  const applyRetreatLoss=(force,side)=>{
    const isRout=routedSide===side;
    const status=routeClass(force.retreat_routes??1,isRout);
    if((withdrawnSide===side||routedSide===side||(!attackerHolds&&!defenderHolds))&&status!=='ordered_retreat'){
      const routeKey=(force.retreat_routes??1)>=2?'two_or_more_routes':(force.retreat_routes??1)===1?'one_route':'no_route';
      const table=isRout?operational.withdrawal.rout_extra_loss:operational.withdrawal.ordered_retreat_extra_loss;
      removeCasualties(force,Math.round(force.active*table[routeKey]),random);
    }
    return status;
  };
  const attackerStatus=attackerHolds?'holds_battlefield':applyRetreatLoss(attacker,'attacker');
  const defenderStatus=defenderHolds?'holds_battlefield':applyRetreatLoss(defender,'defender');
  return{result,days:day,progress,attacker:{active:attacker.active,cohesion:Number(attacker.cohesion.toFixed(1)),armour:attacker.armour||null,combat_casualties:attacker.total_combat_casualties,status:attackerStatus,aftermath:aftermath(attacker,attackerStatus,attackerHolds)},defender:{active:defender.active,cohesion:Number(defender.cohesion.toFixed(1)),armour:defender.armour||null,combat_casualties:defender.total_combat_casualties,status:defenderStatus,aftermath:aftermath(defender,defenderStatus,defenderHolds)},daily};
}

function percentile(values,p){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.round((sorted.length-1)*p)];}
const reports=[];
for(const scenario of scenarioData.scenarios){
  const runs=Array.from({length:scenarioData.iterations_per_scenario},(_,index)=>simulate(scenario,index));
  const futureRuns=runs.map(run=>run.attacker.armour?run.attacker:run.defender);
  const results=Object.fromEntries(['attacker-captures-objective','defender-withdraws','operational-stalemate','attacker-withdraws','attacker-repulsed'].map(name=>[name,Number((runs.filter(run=>run.result===name).length/runs.length*100).toFixed(1))]));
  reports.push({scenario_id:scenario.id,iterations:runs.length,result_percent:results,duration_days:{p10:percentile(runs.map(run=>run.days),0.1),median:percentile(runs.map(run=>run.days),0.5),p90:percentile(runs.map(run=>run.days),0.9)},attacker_combat_casualties_median:percentile(runs.map(run=>run.attacker.combat_casualties),0.5),defender_combat_casualties_median:percentile(runs.map(run=>run.defender.combat_casualties),0.5),attacker_active_median:percentile(runs.map(run=>run.attacker.active),0.5),defender_active_median:percentile(runs.map(run=>run.defender.active),0.5),future_suit_state_median:{attacker_functional:percentile(runs.map(run=>run.attacker.armour?.fully_armoured||0),0.5),attacker_damaged:percentile(runs.map(run=>run.attacker.armour?.damaged_armour||0),0.5),attacker_unarmoured:percentile(runs.map(run=>run.attacker.armour?.unarmoured_energy_rifle||0),0.5),defender_functional:percentile(runs.map(run=>run.defender.armour?.fully_armoured||0),0.5),defender_damaged:percentile(runs.map(run=>run.defender.armour?.damaged_armour||0),0.5),defender_unarmoured:percentile(runs.map(run=>run.defender.armour?.unarmoured_energy_rifle||0),0.5)},future_aftermath_median:{killed:percentile(futureRuns.map(force=>force.aftermath.killed),0.5),critical_wounded:percentile(futureRuns.map(force=>force.aftermath.critical_wounded),0.5),recoverable_wounded:percentile(futureRuns.map(force=>force.aftermath.recoverable_wounded),0.5),captured:percentile(futureRuns.map(force=>force.aftermath.captured),0.5),recovered_suits:percentile(futureRuns.map(force=>force.aftermath.recovered_suits),0.5),captured_suits:percentile(futureRuns.map(force=>force.aftermath.captured_suits),0.5),captured_energy_weapons:percentile(futureRuns.map(force=>force.aftermath.captured_energy_weapons),0.5)},technology_escalation_median:percentile(runs.map(run=>run.attacker.aftermath.technology_escalation+run.defender.aftermath.technology_escalation),0.5)});
}
const report={version:'0.1',purpose:'Multi-day operational combat validation',run_count:reports.reduce((sum,item)=>sum+item.iterations,0),scenario_reports:reports,validation:{rapid_security_battle_short:reports.find(item=>item.scenario_id==='rapid-security-seizure').duration_days.median<=3,reinforcement_changes_operational_endurance:reports.find(item=>item.scenario_id==='reinforced-mechanised-breakthrough').attacker_active_median>2500,cautious_probe_preserves_force:reports.find(item=>item.scenario_id==='cautious-probe-combined-air').attacker_active_median>2200,degraded_urban_attack_fails:reports.find(item=>item.scenario_id==='degraded-urban-offensive').result_percent['attacker-captures-objective']<10,battlefield_salvage_is_recorded:reports.find(item=>item.scenario_id==='reinforced-mechanised-breakthrough').future_aftermath_median.recovered_suits>0,encirclement_creates_technology_risk:reports.find(item=>item.scenario_id==='encircled-future-defence').technology_escalation_median>0},limitations:['Reinforcements merge into one operational side rather than remaining independently targetable.','Medical return is reported but not advanced through the wider campaign calendar.','Equipment salvage produces recovered pools but repair allocation remains a later player decision.','Modern ammunition, vehicle losses and airbase availability remain abstract support factors.']};
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'operational-combat-summary-v0.1.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
