import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.PROJECT_ROOT||'.');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const rules=read('data/authored/modern-formation-rules-v0.1.json');
const config=read('data/authored/modern-formation-scenarios-v0.1.json');
const territories=read('data/generated/systems/territory-logistics-baseline-v0.1.json');
const land=read('data/generated/maps/adjacency-land-v0.3.json');
const routes=read('data/generated/maps/routes-provisional-v0.3.json');
const byId=new Map(territories.map(t=>[t.territory_id,t]));
const adjacency=structuredClone(land);
for(const route of routes){if(!adjacency[route.from].includes(route.to))adjacency[route.from].push(route.to);if(!adjacency[route.to].includes(route.from))adjacency[route.to].push(route.from);}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percentile=(v,p)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.round((s.length-1)*p)];};
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const nation=id=>id.split('-')[0];
const terrainFactor=t=>['mountainous','subarctic'].includes(t.terrain_class)?1.35:t.terrain_class==='mixed-upland'?1.18:1;
const urbanFactor=t=>({low:0.9,medium:1,high:1.15,'very-high':1.3}[t.urbanisation]||1);
function frontier(controlled){const out=new Set();for(const id of controlled.keys())for(const n of adjacency[id])if(!controlled.has(n))out.add(n);return[...out];}
function makeFuture(personnel,start){const out=[];for(let n=1,left=personnel;left>0;n+=1){const size=Math.min(config.future_task_group_size,left);out.push({id:`TG-${n}`,personnel:size,initial:size,location:start,cohesion:90,readiness:90,status:'idle',available_day:0,killed:0});left-=size;}return out;}
function initialLoyalty(model){return clamp(rules.loyalty.initial_base+(model.accepted_government?rules.loyalty.accepted_government_bonus:0)-(model.coercive?rules.loyalty.coercive_occupation_penalty:0)-Math.round(model.civilian_harm*rules.loyalty.civilian_harm_penalty*10),0,100);}
function roleFor(t){if(t.primary_hub_capacity>=4)return'combined-arms';if(['high','very-high'].includes(t.urbanisation))return'mechanised';if(t.urbanisation==='medium')return'infantry';return'security';}
function raiseFormation(t,day,model,index){const role=roleFor(t);const available=rules.available_personnel_by_urbanisation[t.urbanisation]*rules.mobilisable_share_by_urbanisation[t.urbanisation];return{id:`MF-${t.territory_id}-${index}`,nation:nation(t.territory_id),origin:t.territory_id,location:t.territory_id,role,personnel:Math.round(Math.min(rules.formation_personnel,available)),initial:Math.round(Math.min(rules.formation_personnel,available)),cohesion:72,readiness:68,loyalty:initialLoyalty(model),status:'idle',available_day:day,casualties:0,equipment:100,refusals:0,defected:false};}
function supply(controlled,future,modern){let capacity=0;for(const id of controlled.keys())capacity+=byId.get(id).baseline_supply_capacity*config.supply_capacity_per_point;capacity*=1-config.civilian_capacity_reserve;const futureDemand=future.filter(f=>f.personnel>0).reduce((s,f)=>s+f.personnel,0);const modernDemand=modern.filter(f=>!f.defected).reduce((s,f)=>s+f.personnel*rules.roles[f.role].supply_demand,0);return clamp(capacity/Math.max(1,futureDemand+modernDemand),0,1);}
function commandClass(f,target){if(f.nation===nation(target))return'national';if(adjacency[f.location]?.includes(target))return'adjacent';return'expeditionary';}
function orderAccepted(f,target,random){const command=commandClass(f,target);const threshold=command==='expeditionary'?rules.order_thresholds.attack_expeditionary:rules.order_thresholds.attack_adjacent;const score=(f.loyalty*0.55+f.cohesion*0.2+f.readiness*0.15+rules.command_friction[command]*10);return score+random()*10>=threshold;}

function run(start,mode,seedIndex){
  const random=rng(mode.future_personnel*31+seedIndex*100003+start.split('').reduce((s,c)=>s+c.charCodeAt(0),0)*97);
  const model=rules.political_models[mode.political_model],controlled=new Map([[start,0]]),future=makeFuture(mode.future_personnel,start),modern=[],activationQueue=[{id:start,day:rules.activation_delay_days}];
  let day=0,completed=null,battlesWon=0,battlesLost=0,modernVictories=0,refusals=0,defections=0,modernKilled=0,futureKilled=0,lowestSupply=1;
  while(day<config.simulation_days&&completed===null){
    day+=1;
    for(const activation of activationQueue.filter(a=>a.day===day)){const t=byId.get(activation.id);const count=Math.max(1,Math.ceil(rules.available_personnel_by_urbanisation[t.urbanisation]*rules.mobilisable_share_by_urbanisation[t.urbanisation]/rules.formation_personnel));for(let i=0;i<count;i+=1)modern.push(raiseFormation(t,day,model,i+1));}
    const supplyRatio=supply(controlled,future,modern);lowestSupply=Math.min(lowestSupply,supplyRatio);
    for(const f of modern.filter(x=>!x.defected)){
      if(supplyRatio<0.34&&day%5===0)f.loyalty-=rules.loyalty.unsupplied_daily_loss*(1-supplyRatio);
      if(f.status==='recovering'&&day>=f.available_day){f.status='idle';f.cohesion=clamp(f.cohesion+12,0,85);f.readiness=clamp(f.readiness+10,0,80);}
      if(f.status==='idle'){const cap=f.initial*rules.casualty_replacement.maximum_original_strength_share;f.personnel=Math.min(cap,f.personnel+Math.ceil(f.initial*rules.casualty_replacement.daily_share));f.readiness=clamp(f.readiness+0.4,0,80);}
      if(f.loyalty<rules.loyalty.defection_threshold){f.defected=true;f.status='defected';defections+=1;}
    }
    for(const f of future.filter(x=>x.status==='recovering'&&day>=x.available_day)){f.status='idle';f.cohesion=clamp(f.cohesion+15,0,90);f.readiness=clamp(f.readiness+10,0,90);}
    const targets=day%mode.command_cycle.cycle_days<mode.command_cycle.active_days?frontier(controlled).sort((a,b)=>(byId.get(b).baseline_supply_capacity+byId.get(b).primary_hub_capacity)-(byId.get(a).baseline_supply_capacity+byId.get(a).primary_hub_capacity)):[];
    let operations=Math.min(targets.length,Math.max(1,Math.floor(mode.future_personnel/50000)+1));
    while(operations>0&&targets.length){
      const target=targets.shift(),t=byId.get(target);let attackers=[];let modernPower=0,futurePower=0;
      for(const f of modern.filter(x=>x.status==='idle'&&!x.defected&&x.personnel>=rules.minimum_operational_personnel).sort((a,b)=>b.loyalty-a.loyalty)){
        if(!orderAccepted(f,target,random)){f.refusals+=1;f.loyalty-=rules.loyalty.refusal_loss;refusals+=1;continue;}
        attackers.push(f);modernPower+=f.personnel/1000*rules.roles[f.role].combat_factor*f.equipment/100*f.cohesion/100*f.readiness/100*rules.command_friction[commandClass(f,target)];if(modernPower>=7)break;
      }
      const enemy=config.enemy_base_power*(1+day*config.enemy_growth_per_day/10)*terrainFactor(t)*urbanFactor(t)*(0.85+random()*0.3);
      if(modernPower<enemy*0.9){for(const f of future.filter(x=>x.status==='idle'&&x.personnel>=900).sort((a,b)=>b.personnel-a.personnel)){attackers.push(f);futurePower+=f.personnel/1000*config.future_power_per_1000*f.cohesion/100*f.readiness/100*supplyRatio;if(modernPower+futurePower>=enemy*1.12)break;}}
      if(modernPower+futurePower<enemy*0.82||!attackers.length){operations-=1;continue;}
      const ratio=(modernPower+futurePower)/enemy,win=random()<clamp(0.42+(ratio-1)*0.42,0.12,0.94);
      for(const f of attackers){const isModern=f.id.startsWith('MF-');const lossRate=(isModern?config.modern_daily_loss_share:config.future_daily_loss_share)*config.battle_duration_days*(win?0.75:1.6)*(0.8+random()*0.4);const loss=Math.min(f.personnel,Math.round(f.personnel*lossRate));f.personnel-=loss;f.killed=(f.killed||0)+Math.round(loss*(win?0.24:0.34));f.cohesion=clamp(f.cohesion+(win?4:-18),0,100);f.readiness=clamp(f.readiness-(win?4:10),0,100);f.status='recovering';f.available_day=day+config.battle_duration_days+(win?2:5);if(isModern){modernKilled+=Math.round(loss*(win?0.24:0.34));f.casualties+=loss;f.equipment=clamp(f.equipment-loss/f.initial*100*rules.roles[f.role].equipment_loss_factor,0,100);f.loyalty+=win?rules.loyalty.victory_gain:-rules.loyalty.defeat_loss;if(loss/f.initial>0.08)f.loyalty-=rules.loyalty.heavy_casualty_loss;}else futureKilled+=Math.round(loss*(win?0.24:0.34));}
      if(win){controlled.set(target,day);activationQueue.push({id:target,day:day+rules.activation_delay_days});battlesWon+=1;if(modernPower>futurePower)modernVictories+=1;for(const f of attackers)f.location=target;}else battlesLost+=1;
      operations-=1;
    }
    if(controlled.size===territories.length)completed=day;
    if(day>40&&frontier(controlled).length&&future.every(f=>f.personnel<900)&&modern.filter(f=>!f.defected&&f.personnel>=rules.minimum_operational_personnel).length===0)break;
  }
  return{mode:mode.id,start_territory:start,seed_index:seedIndex,completed:completed!==null,completion_day:completed,within_target_range:completed!==null&&completed>=mode.target_turn_range[0]&&completed<=mode.target_turn_range[1],territories_controlled:controlled.size,battles_won:battlesWon,battles_lost:battlesLost,modern_formations_raised:modern.length,modern_formations_operational:modern.filter(f=>!f.defected&&f.personnel>=rules.minimum_operational_personnel).length,modern_led_victories:modernVictories,order_refusals:refusals,defections,modern_killed:modernKilled,future_killed:futureKilled,lowest_supply_percent:Number((lowestSupply*100).toFixed(1))};
}

const runs=[];for(const mode of config.modes)for(const t of territories)for(let seed=0;seed<config.seeds_per_start;seed+=1)runs.push(run(t.territory_id,mode,seed));
const summaries=config.modes.map(mode=>{const g=runs.filter(r=>r.mode===mode.id),done=g.filter(r=>r.completed);return{mode:mode.id,runs:g.length,completion_rate_percent:Number((done.length/g.length*100).toFixed(1)),completion_day_median:done.length?percentile(done.map(r=>r.completion_day),.5):null,completion_day_p10:done.length?percentile(done.map(r=>r.completion_day),.1):null,completion_day_p90:done.length?percentile(done.map(r=>r.completion_day),.9):null,within_target_rate_percent:Number((g.filter(r=>r.within_target_range).length/g.length*100).toFixed(1)),territories_controlled_median:percentile(g.map(r=>r.territories_controlled),.5),modern_formations_raised_median:percentile(g.map(r=>r.modern_formations_raised),.5),modern_led_victories_median:percentile(g.map(r=>r.modern_led_victories),.5),order_refusals_median:percentile(g.map(r=>r.order_refusals),.5),defections_median:percentile(g.map(r=>r.defections),.5),modern_killed_median:percentile(g.map(r=>r.modern_killed),.5),future_killed_median:percentile(g.map(r=>r.future_killed),.5),lowest_supply_percent_median:percentile(g.map(r=>r.lowest_supply_percent),.5)};});
const report={version:'0.1',purpose:'Test independent contemporary formations as persistent campaign units across every portal start and army setting.',run_count:runs.length,summaries,findings:["Modern formations are represented as losable units rather than a support multiplier.","Order acceptance depends on loyalty, readiness, cohesion, national proximity and expeditionary command friction.","The Desperate setting is tested under the same political and mobilisation rules as every other army setting."],limitations:["This package uses a reduced battle resolver and will next be folded into the validated multi-day operational resolver.","National force inventories and alliances remain placeholders until the dated World State package.","Occupation legitimacy is represented by policy profiles rather than event-driven civilian politics."]};
const out=path.join(root,'data/generated/simulations');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'modern-formation-runs-v0.1.json'),`${JSON.stringify(runs,null,2)}\n`);fs.writeFileSync(path.join(out,'modern-formation-summary-v0.1.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
