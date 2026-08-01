import { SLICE_IDS, TERRITORIES } from './data';
import type { GameEvent, GameState } from './types';

const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value));
const randomFor = (seed:number,turn:number,salt:number) => {
  let state=(seed+turn*99991+salt*7919)>>>0;
  state=(state*1664525+1013904223)>>>0;
  return state/4294967296;
};

function addEvent(state:GameState,text:string,tone:GameEvent['tone']):GameState {
  const next={id:(state.events[0]?.id??0)+1,turn:state.turn,text,tone};
  return {...state,events:[next,...state.events].slice(0,60)};
}

export function newGame(seed=Math.floor(Math.random()*999999)):GameState {
  const portalTerritory=SLICE_IDS[seed%SLICE_IDS.length];
  const territories=Object.fromEntries(SLICE_IDS.map(id=>[id,{controller:id===portalTerritory?'player':'enemy',occupation:id===portalTerritory?'controlled':'enemy',legitimacy:id===portalTerritory?58:0,resistance:id===portalTerritory?22:0,capturedTurn:id===portalTerritory?1:undefined}])) as GameState['territories'];
  return {
    seed,turn:1,portalTerritory,selectedTerritory:portalTerritory,targetTerritory:null,territories,
    futureTroops:10000,functionalArmour:9000,damagedArmour:1000,escalation:3,supply:100,battle:null,status:'playing',
    events:[{id:1,turn:1,text:`The portal has opened near ${TERRITORIES[portalTerritory].centre}. Ten thousand soldiers made the crossing.`,tone:'warning'}]
  };
}

export function selectTerritory(state:GameState,id:string):GameState {
  if(state.status!=='playing')return state;
  if(state.territories[id].controller==='player')return {...state,selectedTerritory:id,targetTerritory:null};
  if(state.selectedTerritory&&TERRITORIES[state.selectedTerritory].neighbours.includes(id))return {...state,targetTerritory:id};
  return state;
}

export function beginOperation(state:GameState):GameState {
  if(state.battle||!state.selectedTerritory||!state.targetTerritory)return state;
  const committed=Math.min(2500,Math.max(900,Math.floor(state.futureTroops*.28)));
  const target=TERRITORIES[state.targetTerritory],terrain={ 'open-lowland':1,'mixed-lowland':1.08,'mixed-upland':1.2,mountainous:1.42 }[target.terrain];
  const escalationFactor=1+state.escalation/160;
  const enemyPower=(4.4+randomFor(state.seed,state.turn,target.id.charCodeAt(0))*2.2)*terrain*escalationFactor;
  let next={...state,battle:{id:`B-${state.turn}-${target.id}`,origin:state.selectedTerritory,target:target.id,progress:0,days:0,committed,enemyPower},targetTerritory:null};
  return addEvent(next,`Operation launched from ${TERRITORIES[state.selectedTerritory].centre} towards ${target.centre}.`,'neutral');
}

export function endTurn(state:GameState):GameState {
  if(state.status!=='playing')return state;
  let next:GameState={...state,turn:state.turn+1,territories:structuredClone(state.territories),events:[...state.events]};
  for(const [id,t] of Object.entries(next.territories))if(t.controller==='player'){
    const age=next.turn-(t.capturedTurn??next.turn);
    t.legitimacy=clamp(t.legitimacy+(age>5?.8:.35),0,100);
    t.resistance=clamp(t.resistance-(age>5?.65:.25),0,100);
    if(randomFor(next.seed,next.turn,id.charCodeAt(id.length-1))<t.resistance/1800){t.resistance=clamp(t.resistance+5,0,100);next.escalation+=.4;next=addEvent(next,`Resistance disrupted supply in ${TERRITORIES[id].name}.`,'warning');}
    if(age>=7&&t.occupation==='controlled')t.occupation='administered';
    if(t.legitimacy>=68&&t.resistance<=18)t.occupation='administered';
  }
  const controlled=Object.values(next.territories).filter(t=>t.controller==='player').length;
  const capacity=Object.entries(next.territories).filter(([,t])=>t.controller==='player').reduce((sum,[id,t])=>sum+TERRITORIES[id].supply*(t.occupation==='administered'?1:.45),0);
  next.supply=clamp(Math.round(capacity/(next.futureTroops/1000+controlled*.35)*18),20,100);
  next.escalation=clamp(Math.max(3+controlled*2.2,next.escalation-.12),0,100);
  const wear=Math.max(1,Math.round(next.futureTroops*.00035*(next.supply<50?1.8:1)));
  next.functionalArmour=Math.max(0,next.functionalArmour-wear);next.damagedArmour+=wear;
  if(next.battle){
    const b={...next.battle,days:next.battle.days+1};
    const armourFactor=(next.functionalArmour+next.damagedArmour*.72)/Math.max(1,next.futureTroops);
    const attackPower=b.committed/1000*4.6*armourFactor*(.7+next.supply/330)*(0.9+randomFor(next.seed,next.turn,13)*.2);
    const ratio=attackPower/b.enemyPower;
    b.progress+=clamp(Math.round((ratio-1)*34+25),-30,45);
    const casualtyRate=(ratio<.8?.008:ratio>1.3?.0015:.0035)*(0.85+randomFor(next.seed,next.turn,29)*.3);
    const casualties=Math.max(1,Math.round(b.committed*casualtyRate));
    const killed=Math.round(casualties*.22);next.futureTroops=Math.max(0,next.futureTroops-killed);
    const armourDamage=Math.min(next.functionalArmour,Math.round(b.committed*.008*(ratio<1?1.5:1)));next.functionalArmour-=armourDamage;next.damagedArmour+=armourDamage;
    if(b.progress>=100){
      const territory=next.territories[b.target];territory.controller='player';territory.occupation='contested';territory.legitimacy=52;territory.resistance=32;territory.capturedTurn=next.turn;
      next.escalation=clamp(next.escalation+2.4,0,100);next.selectedTerritory=b.target;next.battle=null;
      next=addEvent(next,`${TERRITORIES[b.target].centre} has fallen. Civil administration remains contested.`,'good');
    }else if(b.progress<=-80||b.days>=8){next.battle=null;next=addEvent(next,`The operation towards ${TERRITORIES[b.target].centre} has been abandoned.`,'danger');}
    else{next.battle=b;next=addEvent(next,`Day ${b.days}: operation progress is ${b.progress}%. ${casualties} casualties, ${killed} confirmed killed.`,'neutral');}
  }
  const playerTerritories=Object.values(next.territories).filter(t=>t.controller==='player').length;
  if(playerTerritories===SLICE_IDS.length){next.status='victory';next=addEvent(next,'All fifteen territories are under your control. Vertical-slice victory achieved.','good');}
  if(next.futureTroops<900){next.status='defeat';next=addEvent(next,'The future army has fallen below operational strength.','danger');}
  return next;
}

export function saveGame(state:GameState){localStorage.setItem('future-conquest-slice-v0.1',JSON.stringify(state));}
export function loadGame():GameState|null {const raw=localStorage.getItem('future-conquest-slice-v0.1');return raw?JSON.parse(raw) as GameState:null;}
