import { SLICE_IDS, TERRITORIES } from './data';
import type { Formation, GameEvent, GameState, OperationForecast, SupplyState } from './types';

const SAVE_KEY = 'future-conquest-slice-v0.2';
const TERRAIN_DEFENCE = { 'open-lowland':1, 'mixed-lowland':1.08, 'mixed-upland':1.2, mountainous:1.42 } as const;
const FUTURE_GROUPS = [
  ['FC-HQ','Aegis Command','HQ',1000,true],
  ['FC-A','Aquila Task Group','A',1800,false],
  ['FC-B','Bastion Task Group','B',1800,false],
  ['FC-C','Cobalt Task Group','C',1800,false],
  ['FC-D','Drake Task Group','D',1800,false],
  ['FC-E','Echo Task Group','E',1800,false]
] as const;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const saltFor=(value:string)=>[...value].reduce((sum,char,index)=>sum+char.charCodeAt(0)*(index+11),0);
const randomFor=(seed:number,turn:number,salt:number)=>{
  let value=(seed+turn*99991+salt*7919)>>>0;
  value=(value*1664525+1013904223)>>>0;
  value^=value>>>16;
  return (value>>>0)/4294967296;
};
const clone=(state:GameState):GameState=>structuredClone(state);

function addEvent(state:GameState,text:string,tone:GameEvent['tone']):GameState {
  const next={id:(state.events[0]?.id??0)+1,turn:state.turn,text,tone};
  return {...state,events:[next,...state.events].slice(0,80)};
}

const activeFormations=(state:GameState,side?:Formation['side'])=>Object.values(state.formations).filter(formation=>formation.status!=='destroyed'&&formation.personnel>0&&(!side||formation.side===side));
export const futureFormations=(state:GameState)=>activeFormations(state,'future');
export const modernFormations=(state:GameState)=>activeFormations(state,'modern');
export const formationsAt=(state:GameState,territoryId:string,side?:Formation['side'])=>activeFormations(state,side).filter(formation=>formation.territoryId===territoryId);
export const totalFuturePersonnel=(state:GameState)=>futureFormations(state).reduce((sum,formation)=>sum+formation.personnel,0);
export const totalFunctionalArmour=(state:GameState)=>futureFormations(state).reduce((sum,formation)=>sum+formation.functionalArmour,0);

function connectedPlayerTerritories(state:GameState):Set<string>{
  const connected=new Set<string>();
  if(state.territories[state.portalTerritory].controller!=='player')return connected;
  const queue=[state.portalTerritory];
  while(queue.length){
    const id=queue.shift()!;
    if(connected.has(id)||state.territories[id].controller!=='player')continue;
    connected.add(id);
    for(const neighbour of TERRITORIES[id].neighbours)if(!connected.has(neighbour)&&state.territories[neighbour].controller==='player')queue.push(neighbour);
  }
  return connected;
}

function supplyForFormation(state:GameState,formation:Formation,connected=connectedPlayerTerritories(state)):SupplyState{
  if(formation.side==='modern')return 'full';
  if(!connected.has(formation.territoryId))return 'isolated';
  if(state.supply>=72)return 'full';
  if(state.supply>=48)return 'strained';
  return 'low';
}

export function formationPower(state:GameState,formation:Formation,defending=false):number{
  if(formation.status==='destroyed'||formation.personnel<=0)return 0;
  const cohesion=.55+formation.cohesion/220;
  const supply={full:1,strained:.88,low:.72,isolated:.5}[formation.supply];
  if(formation.side==='future'){
    const armour=(formation.functionalArmour+formation.damagedArmour*.58)/Math.max(1,formation.personnel);
    const technology=4.4+clamp(armour,0,1)*1.8;
    return formation.personnel/1000*technology*formation.quality*cohesion*supply*(defending?1.08:1);
  }
  return formation.personnel/1000*1.32*formation.quality*cohesion*(defending?1.12:1);
}

function createFutureFormation(group:typeof FUTURE_GROUPS[number],territoryId:string):Formation{
  const [id,name,shortName,personnel,generalPresent]=group;
  return {id,name,shortName,side:'future',territoryId,personnel,maxPersonnel:personnel,functionalArmour:Math.round(personnel*.9),damagedArmour:Math.round(personnel*.1),brokenArmour:0,cohesion:100,quality:1.05,operations:1,status:'ready',supply:'full',generalPresent};
}

function createModernFormation(id:string,territoryId:string,seed:number,reinforcement=false,stage=0):Formation{
  const territory=TERRITORIES[territoryId];
  const terrainBonus=territory.terrain==='mountainous'?500:territory.terrain==='mixed-upland'?250:0;
  const personnel=reinforcement?3600+stage*500:1500+territory.supply*330+terrainBonus+Math.round(randomFor(seed,1,saltFor(id))*400);
  return {id,name:reinforcement?`Coalition Reinforcement ${stage}`:`${territory.centre} Defence Brigade`,shortName:reinforcement?`R${stage}`:territoryId.split('-')[0],side:'modern',territoryId,personnel,maxPersonnel:personnel,functionalArmour:0,damagedArmour:0,brokenArmour:0,cohesion:82+Math.round(randomFor(seed,2,saltFor(id))*12),quality:.9+randomFor(seed,3,saltFor(id))*.22,operations:1,status:'ready',supply:'full',reinforcement};
}

export function newGame(seed=Math.floor(Math.random()*999999)):GameState{
  const portalTerritory=SLICE_IDS[seed%SLICE_IDS.length];
  const territories=Object.fromEntries(SLICE_IDS.map(id=>[id,{controller:id===portalTerritory?'player':'enemy',occupation:id===portalTerritory?'controlled':'enemy',legitimacy:id===portalTerritory?58:0,resistance:id===portalTerritory?22:0,capturedTurn:id===portalTerritory?1:undefined}])) as GameState['territories'];
  const formations:Record<string,Formation>={};
  for(const group of FUTURE_GROUPS){const formation=createFutureFormation(group,portalTerritory);formations[formation.id]=formation;}
  for(const id of SLICE_IDS)if(id!==portalTerritory){const formation=createModernFormation(`MF-${id}`,id,seed);formations[formation.id]=formation;}
  return {version:2,seed,turn:1,portalTerritory,selectedTerritory:portalTerritory,targetTerritory:null,selectedFormationId:'FC-A',territories,formations,escalation:3,supply:100,reinforcementStage:0,battle:null,status:'playing',events:[{id:1,turn:1,text:`The portal has opened near ${TERRITORIES[portalTerritory].centre}. Six future formations, including the General's command group, made the crossing.`,tone:'warning'}]};
}

export function selectFormation(state:GameState,id:string):GameState{
  const formation=state.formations[id];
  if(state.status!=='playing'||!formation||formation.side!=='future'||formation.status==='destroyed')return state;
  return {...state,selectedFormationId:id,selectedTerritory:formation.territoryId,targetTerritory:null};
}

export function selectTerritory(state:GameState,id:string):GameState{
  if(state.status!=='playing'||!state.territories[id])return state;
  const selected=state.selectedFormationId?state.formations[state.selectedFormationId]:null;
  const isAdjacent=selected&&TERRITORIES[selected.territoryId].neighbours.includes(id);
  if(selected&&isAdjacent)return {...state,selectedTerritory:id,targetTerritory:id};
  if(selected?.territoryId===id)return {...state,selectedTerritory:id,targetTerritory:null};
  const localFuture=formationsAt(state,id,'future')[0];
  return {...state,selectedTerritory:id,targetTerritory:null,selectedFormationId:localFuture?.id??state.selectedFormationId};
}

export function getOperationForecast(state:GameState):OperationForecast|null{
  const attacker=state.selectedFormationId?state.formations[state.selectedFormationId]:null;
  const target=state.targetTerritory;
  if(!attacker||attacker.side!=='future'||!target||state.territories[target].controller!=='enemy'||!TERRITORIES[attacker.territoryId].neighbours.includes(target))return null;
  const defenders=formationsAt(state,target,'modern');
  const attackPower=formationPower(state,attacker);
  const defencePower=defenders.reduce((sum,formation)=>sum+formationPower(state,formation,true),0)*TERRAIN_DEFENCE[TERRITORIES[target].terrain];
  const ratio=attackPower/Math.max(.6,defencePower);
  const assessment=ratio>=1.55?'favourable':ratio>=.92?'contested':'dangerous';
  const baseRate=clamp(.007+.014/Math.max(.5,ratio),.008,.032);
  return {attackPower,defencePower,assessment,likelyFutureLosses:[Math.round(attacker.personnel*baseRate*.7),Math.round(attacker.personnel*baseRate*1.35)],defenders:defenders.reduce((sum,formation)=>sum+formation.personnel,0)};
}

function captureTerritory(state:GameState,territoryId:string):GameState{
  const territory=state.territories[territoryId];
  territory.controller='player';territory.occupation='contested';territory.legitimacy=50;territory.resistance=36;territory.capturedTurn=state.turn;
  state.escalation=clamp(state.escalation+2.8,0,100);
  return state;
}

export function moveSelectedFormation(state:GameState):GameState{
  const formation=state.selectedFormationId?state.formations[state.selectedFormationId]:null;
  const target=state.targetTerritory;
  if(state.status!=='playing'||!formation||formation.side!=='future'||!target||formation.operations<1||formation.status!=='ready'||state.territories[target].controller!=='player'||!TERRITORIES[formation.territoryId].neighbours.includes(target))return state;
  let next=clone(state);const moving=next.formations[formation.id];const origin=moving.territoryId;
  moving.territoryId=target;moving.operations=0;next.selectedTerritory=target;next.targetTerritory=null;
  return addEvent(next,`${moving.name} redeployed from ${TERRITORIES[origin].centre} to ${TERRITORIES[target].centre}.`,'neutral');
}

export function beginOperation(state:GameState):GameState{
  const formation=state.selectedFormationId?state.formations[state.selectedFormationId]:null;
  const target=state.targetTerritory;
  if(state.status!=='playing'||state.battle||!formation||formation.side!=='future'||formation.operations<1||formation.status!=='ready'||!target||state.territories[target].controller!=='enemy'||!TERRITORIES[formation.territoryId].neighbours.includes(target))return state;
  let next=clone(state);const attacker=next.formations[formation.id];const defenders=formationsAt(next,target,'modern');
  attacker.operations=0;
  if(defenders.length===0){
    const origin=attacker.territoryId;attacker.territoryId=target;captureTerritory(next,target);next.selectedTerritory=target;next.targetTerritory=null;
    return addEvent(next,`${attacker.name} occupied undefended ${TERRITORIES[target].centre} from ${TERRITORIES[origin].centre}.`,'good');
  }
  attacker.status='engaged';
  for(const defender of defenders)defender.status='engaged';
  next.battle={id:`B-${next.turn}-${target}`,origin:attacker.territoryId,target,attackerFormationId:attacker.id,defenderFormationIds:defenders.map(item=>item.id),progress:0,days:0,attackerStartingPersonnel:attacker.personnel,defenderStartingPersonnel:defenders.reduce((sum,item)=>sum+item.personnel,0)};
  next.targetTerritory=null;
  return addEvent(next,`${attacker.name} launched an operation from ${TERRITORIES[attacker.territoryId].centre} towards ${TERRITORIES[target].centre}.`,'neutral');
}

function chooseRetreat(state:GameState,from:string,side:'future'|'modern',exclude?:string):string|null{
  const controller=side==='future'?'player':'enemy';
  const candidates=TERRITORIES[from].neighbours.filter(id=>id!==exclude&&state.territories[id].controller===controller);
  if(!candidates.length)return null;
  return candidates.sort((a,b)=>{
    const threatA=TERRITORIES[a].neighbours.filter(id=>state.territories[id].controller!==controller).length;
    const threatB=TERRITORIES[b].neighbours.filter(id=>state.territories[id].controller!==controller).length;
    return threatA-threatB||TERRITORIES[b].supply-TERRITORIES[a].supply||a.localeCompare(b);
  })[0];
}

function destroyFormation(formation:Formation){formation.personnel=0;formation.functionalArmour=0;formation.damagedArmour=0;formation.status='destroyed';formation.cohesion=0;formation.operations=0;}

function retreatFormations(state:GameState,ids:string[],from:string,side:'future'|'modern',exclude?:string):boolean{
  const route=chooseRetreat(state,from,side,exclude);
  for(const id of ids){
    const formation=state.formations[id];
    if(!formation||formation.status==='destroyed')continue;
    if(route){formation.territoryId=route;formation.cohesion=clamp(formation.cohesion-16,0,100);formation.status='retreating';formation.operations=0;}
    else destroyFormation(formation);
  }
  return Boolean(route);
}

function applyFutureLosses(formation:Formation,operationalLosses:number,armourDamage:number){
  formation.personnel=Math.max(0,formation.personnel-operationalLosses);
  const functionalLoss=Math.min(formation.functionalArmour,armourDamage);
  formation.functionalArmour-=functionalLoss;formation.damagedArmour+=functionalLoss;
  const broken=Math.min(formation.damagedArmour,Math.round(armourDamage*.18));
  formation.damagedArmour-=broken;formation.brokenArmour+=broken;
  if(formation.personnel===0)destroyFormation(formation);
}

function resolvePlayerBattle(state:GameState):GameState{
  if(!state.battle)return state;
  const battle={...state.battle,days:state.battle.days+1};
  const attacker=state.formations[battle.attackerFormationId];
  const defenders=battle.defenderFormationIds.map(id=>state.formations[id]).filter((item):item is Formation=>Boolean(item&&item.status!=='destroyed'&&item.personnel>0));
  if(!attacker||attacker.status==='destroyed'){state.battle=null;return addEvent(state,'The operation collapsed after its attacking formation was destroyed.','danger');}
  const attackPower=formationPower(state,attacker);
  const defencePower=defenders.reduce((sum,formation)=>sum+formationPower(state,formation,true),0)*TERRAIN_DEFENCE[TERRITORIES[battle.target].terrain];
  const ratio=attackPower/Math.max(.5,defencePower);
  battle.progress+=clamp(Math.round((ratio-.72)*27+10+(randomFor(state.seed,state.turn,saltFor(battle.id))-0.5)*12),-24,44);
  const attackerLossRate=clamp(.006+.012/Math.max(.45,ratio),.006,.031)*(0.88+randomFor(state.seed,state.turn,71)*.24);
  const attackerLosses=Math.max(2,Math.round(attacker.personnel*attackerLossRate));
  const armourDamage=Math.max(3,Math.round(attacker.personnel*clamp(.006+.005/Math.max(.5,ratio),.006,.018)));
  applyFutureLosses(attacker,attackerLosses,armourDamage);attacker.cohesion=clamp(attacker.cohesion-Math.round(clamp(7/Math.max(.6,ratio),3,12)),0,100);
  const defenderLossRate=clamp(.035+ratio*.027,.04,.145)*(0.86+randomFor(state.seed,state.turn,97)*.28);
  let defenderLosses=0;
  for(const defender of defenders){const losses=Math.min(defender.personnel,Math.max(5,Math.round(defender.personnel*defenderLossRate)));defender.personnel-=losses;defenderLosses+=losses;defender.cohesion=clamp(defender.cohesion-Math.round(8+ratio*5),0,100);if(defender.personnel<Math.max(120,defender.maxPersonnel*.12)||defender.cohesion<8)destroyFormation(defender);}
  const remainingDefenders=defenders.filter(item=>item.status!=='destroyed');
  const defenderPersonnel=remainingDefenders.reduce((sum,item)=>sum+item.personnel,0);
  const defendersBroken=defenderPersonnel<battle.defenderStartingPersonnel*.28||remainingDefenders.every(item=>item.cohesion<20);
  if(battle.progress>=100||defenders.length===0||defendersBroken){
    const escaped=retreatFormations(state,remainingDefenders.map(item=>item.id),battle.target,'modern',battle.origin);
    captureTerritory(state,battle.target);attacker.territoryId=battle.target;attacker.status='ready';state.selectedTerritory=battle.target;state.battle=null;
    return addEvent(state,`${TERRITORIES[battle.target].centre} has fallen to ${attacker.name}. ${defenderLosses} defenders were lost${escaped?', with survivors retreating.':', with the remaining garrison cut off.'}`,'good');
  }
  if(battle.progress<=-70||battle.days>=7||attacker.personnel<battle.attackerStartingPersonnel*.3||attacker.cohesion<15){
    attacker.status='ready';attacker.cohesion=clamp(attacker.cohesion-8,0,100);for(const defender of remainingDefenders)defender.status='ready';state.battle=null;
    return addEvent(state,`${attacker.name} abandoned the operation towards ${TERRITORIES[battle.target].centre} after losing ${attackerLosses} personnel this day.`,'danger');
  }
  state.battle=battle;
  return addEvent(state,`Battle for ${TERRITORIES[battle.target].centre}: ${battle.progress}% progress. ${attackerLosses} future personnel and ${defenderLosses} defenders became combat ineffective.`,'neutral');
}

function reinforceEnemyFront(state:GameState):GameState{
  const fronts=SLICE_IDS.filter(id=>state.territories[id].controller==='enemy'&&TERRITORIES[id].neighbours.some(neighbour=>state.territories[neighbour].controller==='player'));
  if(!fronts.length)return state;
  const targets=fronts.sort((a,b)=>formationsAt(state,a,'modern').length-formationsAt(state,b,'modern').length||a.localeCompare(b));
  for(const target of targets){
    const sources=TERRITORIES[target].neighbours.filter(id=>state.territories[id].controller==='enemy'&&!TERRITORIES[id].neighbours.some(neighbour=>state.territories[neighbour].controller==='player'));
    const candidate=sources.flatMap(id=>formationsAt(state,id,'modern')).filter(item=>item.operations>0&&item.status==='ready').sort((a,b)=>b.personnel-a.personnel)[0];
    if(candidate){const origin=candidate.territoryId;candidate.territoryId=target;candidate.operations=0;return addEvent(state,`${candidate.name} reinforced the defensive line at ${TERRITORIES[target].centre} from ${TERRITORIES[origin].centre}.`,'warning');}
  }
  return state;
}

function recaptureTerritory(state:GameState,target:string,attackers:Formation[],defenders:Formation[]):GameState{
  const escaped=retreatFormations(state,defenders.map(item=>item.id),target,'future',attackers[0].territoryId);
  const territory=state.territories[target];territory.controller='enemy';territory.occupation='enemy';territory.legitimacy=0;territory.resistance=0;delete territory.capturedTurn;
  for(const attacker of attackers){attacker.territoryId=target;attacker.status='ready';attacker.operations=0;}
  if(state.selectedTerritory===target)state.selectedTerritory=escaped?defenders[0]?.territoryId??target:target;
  return addEvent(state,`${TERRITORIES[target].centre} was retaken by contemporary forces${escaped?'; the future garrison withdrew along an open route.':'; the future garrison was encircled.'}`,'danger');
}

function enemyCounterattack(state:GameState):GameState{
  const candidates: Array<{source:string;target:string;attackers:Formation[];defenders:Formation[];score:number}> = [];
  for(const source of SLICE_IDS.filter(id=>state.territories[id].controller==='enemy')){
    const attackers=formationsAt(state,source,'modern').filter(item=>item.operations>0&&item.status==='ready');
    if(!attackers.length)continue;
    for(const target of TERRITORIES[source].neighbours.filter(id=>state.territories[id].controller==='player')){
      if(state.territories[target].capturedTurn===state.turn)continue;
      const defenders=formationsAt(state,target,'future');
      const attackPower=attackers.reduce((sum,item)=>sum+formationPower(state,item),0);
      const defencePower=defenders.reduce((sum,item)=>sum+formationPower(state,item,true),0)*TERRAIN_DEFENCE[TERRITORIES[target].terrain];
      const score=defenders.length===0?100:attackPower/Math.max(.5,defencePower)*20+(state.territories[target].occupation==='contested'?5:0);
      candidates.push({source,target,attackers,defenders,score});
    }
  }
  const operation=candidates.sort((a,b)=>b.score-a.score||a.target.localeCompare(b.target))[0];
  if(!operation)return state;
  if(operation.defenders.length===0)return recaptureTerritory(state,operation.target,operation.attackers,[]);
  const chance=clamp(.24+state.escalation/180,0,0.72);
  if(operation.score<11||randomFor(state.seed,state.turn,211)>chance)return state;
  const enemyPower=operation.attackers.reduce((sum,item)=>sum+formationPower(state,item),0);
  const futurePower=operation.defenders.reduce((sum,item)=>sum+formationPower(state,item,true),0)*TERRAIN_DEFENCE[TERRITORIES[operation.target].terrain];
  const ratio=enemyPower/Math.max(.5,futurePower);
  let futureLosses=0,modernLosses=0;
  for(const defender of operation.defenders){const losses=Math.max(2,Math.round(defender.personnel*clamp(.004+ratio*.009,.004,.026)));futureLosses+=losses;applyFutureLosses(defender,losses,Math.max(2,Math.round(losses*.8)));defender.cohesion=clamp(defender.cohesion-Math.round(3+ratio*5),0,100);}
  for(const attacker of operation.attackers){const losses=Math.max(8,Math.round(attacker.personnel*clamp(.045+.045/Math.max(.45,ratio),.045,.15)));modernLosses+=losses;attacker.personnel=Math.max(0,attacker.personnel-losses);attacker.cohesion=clamp(attacker.cohesion-Math.round(5+5/Math.max(.5,ratio)),0,100);attacker.operations=0;if(attacker.personnel<150)destroyFormation(attacker);}
  const averageCohesion=operation.defenders.reduce((sum,item)=>sum+item.cohesion,0)/operation.defenders.length;
  const survivingAttackers=operation.attackers.filter(item=>item.status!=='destroyed');
  if(survivingAttackers.length&&ratio>1.22&&averageCohesion<62&&randomFor(state.seed,state.turn,307)<clamp(.32+(ratio-1)*.35,0,0.78))return recaptureTerritory(state,operation.target,survivingAttackers,operation.defenders.filter(item=>item.status!=='destroyed'));
  return addEvent(state,`Counterattack at ${TERRITORIES[operation.target].centre}: ${futureLosses} future personnel and ${modernLosses} attackers became combat ineffective. The territory held.`,'warning');
}

function spawnReinforcements(state:GameState):GameState{
  const targetStage=state.escalation>=48?3:state.escalation>=32?2:state.escalation>=18?1:0;
  const edgeOrder=['GB-04','AT-01','FR-01','NL-01'];
  while(state.reinforcementStage<targetStage){
    const stage=state.reinforcementStage+1;const entry=edgeOrder.find(id=>state.territories[id].controller==='enemy');
    state.reinforcementStage=stage;
    if(!entry){state=addEvent(state,`Coalition reinforcement wave ${stage} could not secure an entry corridor.`,'good');continue;}
    const formation=createModernFormation(`RF-${stage}`,entry,state.seed,true,stage);state.formations[formation.id]=formation;
    state=addEvent(state,`Coalition reinforcement wave ${stage} entered through ${TERRITORIES[entry].centre}: approximately ${formation.personnel.toLocaleString('en-GB')} personnel.`,'danger');
  }
  return state;
}

function updateOccupation(state:GameState):GameState{
  for(const id of SLICE_IDS){const territory=state.territories[id];if(territory.controller!=='player')continue;
    const age=state.turn-(territory.capturedTurn??state.turn);const garrison=formationsAt(state,id,'future').reduce((sum,item)=>sum+item.personnel,0);
    if(garrison>0){territory.legitimacy=clamp(territory.legitimacy+(age>5?.75:.35),0,100);territory.resistance=clamp(territory.resistance-(age>5?.65:.3),0,100);}else{territory.legitimacy=clamp(territory.legitimacy-.35,0,100);territory.resistance=clamp(territory.resistance+1.1,0,100);}
    if(age>=6&&territory.legitimacy>=56&&territory.resistance<=32)territory.occupation='controlled';
    if(age>=12&&territory.legitimacy>=66&&territory.resistance<=22)territory.occupation='administered';
    if(territory.resistance>=88&&garrison===0){territory.controller='enemy';territory.occupation='enemy';territory.legitimacy=0;territory.resistance=0;delete territory.capturedTurn;const militia=createModernFormation(`UP-${id}-${state.turn}`,id,state.seed);militia.personnel=1200;militia.maxPersonnel=1200;militia.quality=.72;state.formations[militia.id]=militia;state=addEvent(state,`An organised uprising restored hostile control in ${TERRITORIES[id].name}.`,'danger');}
  }
  return state;
}

function updateLogisticsAndWear(state:GameState,applyWear=true):GameState{
  const connected=connectedPlayerTerritories(state);const personnel=totalFuturePersonnel(state);
  const capacity=38+[...connected].reduce((sum,id)=>{const territory=state.territories[id];const occupationFactor=territory.occupation==='administered'?1:territory.occupation==='controlled'?.72:.45;return sum+TERRITORIES[id].supply*occupationFactor;},0);
  state.supply=clamp(Math.round(capacity/Math.max(4,personnel/1000+connected.size*.35)*20-state.escalation*.08),15,100);
  for(const formation of futureFormations(state)){
    formation.supply=supplyForFormation(state,formation,connected);
    if(!applyWear)continue;
    const wearRate={full:.00045,strained:.0008,low:.0013,isolated:.0022}[formation.supply];const wear=Math.max(1,Math.round(formation.personnel*wearRate));
    const functionalLoss=Math.min(formation.functionalArmour,wear);formation.functionalArmour-=functionalLoss;formation.damagedArmour+=functionalLoss;
    const breakage=Math.min(formation.damagedArmour,Math.round(wear*.22));formation.damagedArmour-=breakage;formation.brokenArmour+=breakage;
    formation.cohesion=clamp(formation.cohesion+(formation.supply==='full'?2:formation.supply==='strained'?1:formation.supply==='low'?-1:-5),0,100);
  }
  return state;
}

function checkOutcome(state:GameState):GameState{
  const command=state.formations['FC-HQ'];
  if(!command||command.status==='destroyed'||command.personnel<150){state.status='defeat';return addEvent(state,'The General and command formation have been destroyed or captured. The campaign is over.','danger');}
  if(totalFuturePersonnel(state)<1200){state.status='defeat';return addEvent(state,'The future army has fallen below operational strength.','danger');}
  if(SLICE_IDS.every(id=>state.territories[id].controller==='player')&&!state.battle){state.status='victory';return addEvent(state,'All fifteen territories are under simultaneous control. Regional victory achieved.','good');}
  return state;
}

export function endTurn(state:GameState):GameState{
  if(state.status!=='playing')return state;
  let next=clone(state);next.turn+=1;next.targetTerritory=null;
  for(const formation of activeFormations(next)){if(formation.side==='modern'||formation.status==='ready'||formation.status==='retreating'){formation.operations=1;if(formation.status==='retreating')formation.status='ready';}}
  next=updateOccupation(next);next=updateLogisticsAndWear(next);next=resolvePlayerBattle(next);
  if(next.status==='playing'){next=reinforceEnemyFront(next);next=enemyCounterattack(next);next=spawnReinforcements(next);}
  const controlled=SLICE_IDS.filter(id=>next.territories[id].controller==='player').length;next.escalation=clamp(Math.max(3+controlled*2.35,next.escalation-.08),0,100);
  next=updateLogisticsAndWear(next,false);
  for(const formation of futureFormations(next))if(formation.status==='ready')formation.operations=1;
  return checkOutcome(next);
}

export function saveGame(state:GameState){localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
export function loadGame():GameState|null{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;try{const parsed=JSON.parse(raw) as GameState;return parsed.version===2?parsed:null;}catch{return null;}}
