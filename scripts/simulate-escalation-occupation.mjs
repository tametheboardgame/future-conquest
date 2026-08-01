import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.PROJECT_ROOT||'.');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const rules=read('data/authored/escalation-occupation-rules-v0.1.json');
const config=read('data/authored/escalation-occupation-scenarios-v0.1.json');
const territories=read('data/generated/systems/territory-logistics-baseline-v0.1.json');
const land=read('data/generated/maps/adjacency-land-v0.3.json');
const routes=read('data/generated/maps/routes-provisional-v0.3.json');
const byId=new Map(territories.map(t=>[t.territory_id,t]));
const adjacency=structuredClone(land);
for(const route of routes){if(!adjacency[route.from].includes(route.to))adjacency[route.from].push(route.to);if(!adjacency[route.to].includes(route.from))adjacency[route.to].push(route.from);}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percentile=(v,p)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.round((s.length-1)*p)];};
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function frontier(controlled){const out=new Set();for(const id of controlled.keys())for(const n of adjacency[id])if(!controlled.has(n))out.add(n);return[...out];}
function stageFor(value){return[...rules.global_escalation.thresholds].reverse().find(t=>value>=t.value)||{id:'local_response',value:0,enemy_power_multiplier:1,supply_multiplier:1};}
function territoryWeight(t){return 0.75+t.primary_hub_capacity*0.08+({low:0,medium:0.1,high:0.2,'very-high':0.32}[t.urbanisation]||0);}
function occupationState(x,day){const age=day-x.captureDay;if(age<x.policy.administration_delay_days)return'contested';if(x.legitimacy>=58&&x.resistance<=28)return'integrated';if(x.legitimacy>=40&&x.resistance<=45)return'administered';return'controlled';}
function makeOccupation(id,day,policy){return{id,captureDay:day,policy,legitimacy:policy.initial_legitimacy,resistance:policy.initial_resistance,supplyDamage:0,incidents:0,uprisings:0};}
function chooseTarget(controlled){return frontier(controlled).map(id=>byId.get(id)).sort((a,b)=>(b.baseline_supply_capacity+b.primary_hub_capacity)-(a.baseline_supply_capacity+a.primary_hub_capacity)||a.territory_id.localeCompare(b.territory_id))[0];}

function run(startId,mode,strategy,seedIndex){
  const random=rng(mode.future_personnel*17+seedIndex*100019+strategy.id.length*7919+startId.split('').reduce((s,c)=>s+c.charCodeAt(0),0)*101);
  const policy=rules.occupation_policies[strategy.occupation_policy],controlled=new Map([[startId,makeOccupation(startId,0,policy)]]);
  let day=0,escalation=2,peakEscalation=2,highestStage='local_response',futurePersonnel=mode.future_personnel,futureKilled=0,completed=null,defeat=null,resistanceIncidents=0,uprisings=0,lostTerritories=0,foreignReinforcements=0,nuclearRiskDays=0,reliefActions=0,governmentDeals=0,modernRefusals=0,technologyLosses=0,infrastructureDestroyed=0;
  const stageDays={},checkpoints=[];
  while(day<config.simulation_days&&completed===null&&!defeat){
    day+=1;
    let integrated=0,administered=0,occupationDemand=0,availableCapacity=0;
    for(const x of [...controlled.values()]){
      const t=byId.get(x.id),state=occupationState(x,day);if(state==='integrated')integrated+=1;if(state==='administered'||state==='integrated')administered+=1;
      const age=day-x.captureDay,activation=clamp(x.policy.supply_activation_share+(1-x.policy.supply_activation_share)*age/14,0,1);availableCapacity+=t.baseline_supply_capacity*activation*(1-x.supplyDamage);
      occupationDemand+=territoryWeight(t)*(1+x.resistance/150);
      x.legitimacy=clamp(x.legitimacy+x.policy.daily_legitimacy_change,0,100);x.resistance=clamp(x.resistance+x.policy.daily_resistance_change,0,100);
      if(random()<x.resistance/100*rules.resistance.incident_daily_chance_at_100){x.incidents+=1;resistanceIncidents+=1;x.supplyDamage=clamp(x.supplyDamage+rules.resistance.incident_supply_damage,0,0.55);escalation+=rules.resistance.incident_escalation;}
      if(x.resistance>=rules.resistance.uprising_threshold&&x.legitimacy<=rules.resistance.uprising_legitimacy_threshold&&random()<rules.resistance.uprising_daily_chance){x.uprisings+=1;uprisings+=1;escalation+=rules.resistance.suppression_escalation;if(random()<0.28){controlled.delete(x.id);lostTerritories+=1;continue;}x.resistance=clamp(x.resistance-rules.resistance.security_resistance_reduction,0,100);}
    }
    const stage=stageFor(escalation);stageDays[stage.id]=(stageDays[stage.id]||0)+1;highestStage=stage.value>=stageFor(peakEscalation).value?stage.id:highestStage;
    const supplyRatio=clamp(availableCapacity*5.2*stage.supply_multiplier/Math.max(1,futurePersonnel/1000+occupationDemand),0,1);
    if(supplyRatio<0.72){for(const x of controlled.values()){x.legitimacy=clamp(x.legitimacy-rules.civilian_needs.shortage_legitimacy_loss_per_day*(1-supplyRatio),0,100);x.resistance=clamp(x.resistance+rules.civilian_needs.shortage_resistance_gain_per_day*(1-supplyRatio),0,100);}escalation+=controlled.size*rules.civilian_needs.shortage_escalation_per_territory_day*(1-supplyRatio);}
    if(strategy.humanitarian_priority>0.5&&day%12===0&&controlled.size>3){const worst=[...controlled.values()].sort((a,b)=>a.legitimacy-b.legitimacy)[0];worst.legitimacy=clamp(worst.legitimacy+rules.player_responses.humanitarian_relief.legitimacy_gain,0,100);worst.resistance=clamp(worst.resistance-rules.player_responses.humanitarian_relief.resistance_reduction,0,100);escalation-=rules.player_responses.humanitarian_relief.escalation_reduction*strategy.humanitarian_priority;reliefActions+=1;}
    if(strategy.id==='restrained'&&day%20===0&&controlled.size>5){const worst=[...controlled.values()].sort((a,b)=>b.resistance-a.resistance)[0];worst.legitimacy=clamp(worst.legitimacy+rules.player_responses.recognise_local_government.legitimacy_gain,0,100);worst.resistance=clamp(worst.resistance-rules.player_responses.recognise_local_government.resistance_reduction,0,100);escalation-=rules.player_responses.recognise_local_government.escalation_reduction;governmentDeals+=1;}
    const territorialFloor=rules.global_escalation.territorial_control_floor_scale*Math.pow(controlled.size/territories.length,1.45);escalation=Math.max(territorialFloor,escalation-rules.global_escalation.daily_decay*(0.7+strategy.humanitarian_priority));
    const currentStage=stageFor(escalation);
    if(escalation>=rules.global_escalation.us_reinforcement_threshold&&day%rules.global_escalation.us_reinforcement_interval_days===0){foreignReinforcements+=1;}
    if(escalation>=rules.global_escalation.nuclear_risk_threshold){nuclearRiskDays+=1;const risk=clamp(rules.global_escalation.nuclear_base_daily_risk+(escalation-rules.global_escalation.nuclear_risk_threshold)/8*rules.global_escalation.nuclear_max_daily_risk,0,rules.global_escalation.nuclear_max_daily_risk);if(random()<risk){defeat='general-killed-in-strategic-strike';break;}}
    const activeCommandDay=day%mode.command_cycle.cycle_days<mode.command_cycle.active_days;
    if(activeCommandDay){let operations=Math.max(1,Math.round(mode.base_operations*strategy.operation_intensity));while(operations>0&&controlled.size<territories.length){
      const target=chooseTarget(controlled);if(!target)break;
      const coalitionPower=integrated*config.modern_coalition_power_per_integrated_territory*(0.65+strategy.humanitarian_priority*0.35);const futurePower=futurePersonnel/1000*config.future_power_per_1000/Math.max(1,mode.base_operations*8);const resistancePenalty=[...controlled.values()].reduce((s,x)=>s+x.resistance,0)/Math.max(1,controlled.size)/100*0.9;const foreignPower=foreignReinforcements*rules.global_escalation.us_reinforcement_enemy_power;
      const terrain=['mountainous','subarctic'].includes(target.terrain_class)?1.28:target.terrain_class==='mixed-upland'?1.12:1;const enemy=config.base_enemy_power*terrain*currentStage.enemy_power_multiplier*(1+foreignPower+resistancePenalty)*(0.88+random()*0.24);const attack=(futurePower+coalitionPower)*(0.88+random()*0.24)*supplyRatio;
      const success=random()<clamp(0.34+(attack/enemy-1)*0.32,0.08,0.92);const lossShare=success?config.base_future_loss_per_successful_operation:config.base_future_loss_per_failed_operation;const loss=Math.min(futurePersonnel,Math.round(futurePersonnel*lossShare*currentStage.enemy_power_multiplier*(0.8+random()*0.4)));futurePersonnel-=loss;futureKilled+=Math.round(loss*(success?0.22:0.34));
      if(success){controlled.set(target.territory_id,makeOccupation(target.territory_id,day,policy));escalation+=policy.capture_escalation+policy.civilian_harm*rules.global_escalation.civilian_harm_scale*territoryWeight(target);if(random()<strategy.infrastructure_destruction_chance){infrastructureDestroyed+=1;escalation+=rules.global_escalation.critical_infrastructure_destroyed;}if(random()<strategy.future_technology_loss_chance){technologyLosses+=1;escalation+=rules.global_escalation.future_technology_capture;}}
      else{escalation+=0.12+policy.civilian_harm;if(policy.modern_loyalty_modifier<0)modernRefusals+=Math.round((Math.abs(policy.modern_loyalty_modifier)/10)*(1+random()*2));}
      operations-=1;
    }}
    escalation=clamp(escalation,0,100);peakEscalation=Math.max(peakEscalation,escalation);highestStage=stageFor(peakEscalation).id;
    if(controlled.size===territories.length)completed=day;
    if(futurePersonnel<rules.defeat_conditions.future_operational_personnel_floor)defeat='future-force-below-operational-floor';
    if(day%50===0||completed)checkpoints.push({day,territories:controlled.size,integrated,administered,escalation:Number(escalation.toFixed(1)),stage:stageFor(escalation).id,future_personnel:futurePersonnel,resistance_incidents:resistanceIncidents,uprisings});
  }
  const states={contested:0,controlled:0,administered:0,integrated:0};for(const x of controlled.values())states[occupationState(x,day)]+=1;
  return{mode:mode.id,strategy:strategy.id,start_territory:startId,seed_index:seedIndex,completed:completed!==null,completion_day:completed,defeat,territories_controlled:controlled.size,occupation_states:states,peak_escalation:Number(peakEscalation.toFixed(1)),highest_stage:highestStage,days_at_limited_intervention_or_worse:Object.entries(stageDays).filter(([id])=>['limited_intervention','coalition_war','strategic_crisis'].includes(id)).reduce((s,[,v])=>s+v,0),foreign_reinforcement_events:foreignReinforcements,nuclear_risk_days:nuclearRiskDays,resistance_incidents:resistanceIncidents,uprisings,lost_territories:lostTerritories,modern_order_refusals:modernRefusals,future_killed:futureKilled,future_personnel:futurePersonnel,technology_losses:technologyLosses,infrastructure_destroyed:infrastructureDestroyed,relief_actions:reliefActions,government_deals:governmentDeals,checkpoints};
}

const runs=[];for(const mode of config.modes)for(const strategy of config.strategies)for(const t of territories)for(let seed=0;seed<config.seeds_per_start;seed+=1)runs.push(run(t.territory_id,mode,strategy,seed));
const summaries=[];for(const mode of config.modes)for(const strategy of config.strategies){const g=runs.filter(r=>r.mode===mode.id&&r.strategy===strategy.id),done=g.filter(r=>r.completed);summaries.push({mode:mode.id,strategy:strategy.id,runs:g.length,completion_rate_percent:Number((done.length/g.length*100).toFixed(1)),completion_day_median:done.length?percentile(done.map(r=>r.completion_day),.5):null,territories_controlled_median:percentile(g.map(r=>r.territories_controlled),.5),peak_escalation_median:percentile(g.map(r=>r.peak_escalation),.5),highest_stage_mode:Object.entries(g.reduce((a,r)=>(a[r.highest_stage]=(a[r.highest_stage]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0][0],intervention_days_median:percentile(g.map(r=>r.days_at_limited_intervention_or_worse),.5),foreign_reinforcements_median:percentile(g.map(r=>r.foreign_reinforcement_events),.5),nuclear_risk_run_percent:Number((g.filter(r=>r.nuclear_risk_days>0).length/g.length*100).toFixed(1)),strategic_strike_defeat_percent:Number((g.filter(r=>r.defeat==='general-killed-in-strategic-strike').length/g.length*100).toFixed(1)),resistance_incidents_median:percentile(g.map(r=>r.resistance_incidents),.5),uprisings_median:percentile(g.map(r=>r.uprisings),.5),modern_order_refusals_median:percentile(g.map(r=>r.modern_order_refusals),.5),future_killed_median:percentile(g.map(r=>r.future_killed),.5)});}
const report={version:'0.1',purpose:'Validate local occupation legitimacy and resistance against a separate global escalation and intervention track.',run_count:runs.length,summaries,findings:['Occupation state and global escalation are independent state machines with linked consequences.','Territorial control creates an unavoidable escalation floor, while policy determines how quickly intervention arrives.','Nuclear danger is confined to the strategic-crisis range and threatens the physical general rather than acting as routine attrition.'],limitations:['The World State has not yet supplied real alliances, force deployments, nuclear doctrines or country-specific political thresholds.','Player policies are represented as consistent campaign strategies rather than turn-by-turn choices.','Foreign air, naval and ground intervention is represented through escalating power and supply pressure pending independent World State formations.']};
const persistedRuns=runs.map(({checkpoints,...run})=>run);
const out=path.join(root,'data/generated/simulations');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'escalation-occupation-runs-v0.1.json'),`${JSON.stringify(persistedRuns,null,2)}\n`);fs.writeFileSync(path.join(out,'escalation-occupation-summary-v0.1.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
