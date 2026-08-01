import { SLICE_IDS, TERRITORIES } from './data';
import type { Difficulty, EnemyFormation, GameEvent, GameState, TaskGroup, TerritoryState } from './types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomFor = (seed: number, turn: number, salt: number) => {
  let value = (seed + turn * 99991 + salt * 7919) >>> 0;
  value = (value * 1664525 + 1013904223) >>> 0;
  return value / 4294967296;
};

const difficultyRules: Record<Difficulty, { enemy: number; counter: number; recovery: number }> = {
  story: { enemy: 0.78, counter: 0.55, recovery: 1.3 },
  standard: { enemy: 1, counter: 1, recovery: 1 },
  hard: { enemy: 1.25, counter: 1.45, recovery: 0.78 }
};

const terrainDefence: Record<string, number> = {
  'open-lowland': 1,
  'mixed-lowland': 1.08,
  'mixed-upland': 1.2,
  mountainous: 1.42
};

function addEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const next = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone };
  return { ...state, events: [next, ...state.events].slice(0, 80) };
}

export function canIssueOperationalOrder(group: TaskGroup | undefined): boolean {
  return Boolean(group && !group.order && (group.status === 'ready' || group.status === 'garrison'));
}

function suppliedTerritories(state: GameState): Set<string> {
  const supplied = new Set<string>();
  if (state.territories[state.portalTerritory]?.controller !== 'player') return supplied;
  const queue = [state.portalTerritory];
  supplied.add(state.portalTerritory);
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbour of TERRITORIES[current].neighbours) {
      if (!supplied.has(neighbour) && state.territories[neighbour]?.controller === 'player') {
        supplied.add(neighbour);
        queue.push(neighbour);
      }
    }
  }
  return supplied;
}

function refreshSupply(state: GameState): GameState {
  const connected = suppliedTerritories(state);
  const territories = structuredClone(state.territories);
  for (const [id, territory] of Object.entries(territories)) territory.supplied = connected.has(id);
  const personnel = Object.values(state.taskGroups).reduce((sum, group) => sum + group.personnel, 0);
  const capacity = [...connected].reduce((sum, id) => {
    const territory = territories[id];
    const occupationFactor = territory.occupation === 'administered' ? 1 : territory.occupation === 'controlled' ? 0.72 : 0.42;
    return sum + TERRITORIES[id].supply * occupationFactor;
  }, 0);
  const supply = clamp(Math.round((capacity * 1150) / Math.max(1, personnel) * 100), 12, 100);
  return { ...state, territories, supply };
}

function initialTaskGroups(portalTerritory: string): Record<string, TaskGroup> {
  const groups: TaskGroup[] = [
    { id: 'TG-1', name: 'Vanguard Group', personnel: 2600, maxPersonnel: 2600, functionalArmour: 2500, damagedArmour: 250, morale: 86, supply: 100 },
    { id: 'TG-2', name: 'Spearhead Group', personnel: 2400, maxPersonnel: 2400, functionalArmour: 2600, damagedArmour: 250, morale: 84, supply: 100 },
    { id: 'TG-3', name: 'Security Group', personnel: 2500, maxPersonnel: 2500, functionalArmour: 1900, damagedArmour: 250, morale: 82, supply: 100 },
    { id: 'TG-4', name: 'Reserve Group', personnel: 2500, maxPersonnel: 2500, functionalArmour: 2000, damagedArmour: 250, morale: 80, supply: 100 }
  ].map(group => ({ ...group, location: portalTerritory, status: 'ready' as const }));
  return Object.fromEntries(groups.map(group => [group.id, group]));
}

function initialEnemyFormations(seed: number, portalTerritory: string, difficulty: Difficulty): Record<string, EnemyFormation> {
  const enemyMultiplier = difficultyRules[difficulty].enemy;
  let index = 0;
  const formations: EnemyFormation[] = [];
  for (const territoryId of SLICE_IDS) {
    if (territoryId === portalTerritory) continue;
    const definition = TERRITORIES[territoryId];
    const terrain = terrainDefence[definition.terrain];
    const roll = randomFor(seed, 1, 100 + index);
    const personnel = Math.round((720 + definition.supply * 145 + roll * 520) * terrain * enemyMultiplier);
    formations.push({
      id: `EF-${String(index + 1).padStart(2, '0')}`,
      name: `${definition.centre} Defence Command`,
      location: territoryId,
      personnel,
      armour: Math.round((35 + roll * 105 + definition.supply * 10) * enemyMultiplier),
      readiness: Math.round(58 + roll * 26),
      entrenchment: Math.round(20 + terrain * 18)
    });
    index += 1;
  }
  return Object.fromEntries(formations.map(formation => [formation.id, formation]));
}

export function newGame(seed = Math.floor(Math.random() * 999999), difficulty: Difficulty = 'standard'): GameState {
  const portalTerritory = SLICE_IDS[seed % SLICE_IDS.length];
  const territories = Object.fromEntries(SLICE_IDS.map(id => [id, {
    controller: id === portalTerritory ? 'player' : 'enemy',
    occupation: id === portalTerritory ? 'controlled' : 'enemy',
    legitimacy: id === portalTerritory ? 58 : 0,
    resistance: id === portalTerritory ? 22 : 0,
    supplied: id === portalTerritory,
    fortification: id === portalTerritory ? 12 : 0,
    capturedTurn: id === portalTerritory ? 1 : undefined
  }])) as Record<string, TerritoryState>;
  const state: GameState = {
    version: 2,
    seed,
    difficulty,
    turn: 1,
    portalTerritory,
    selectedTerritory: portalTerritory,
    targetTerritory: null,
    selectedTaskGroupId: 'TG-1',
    territories,
    taskGroups: initialTaskGroups(portalTerritory),
    enemyFormations: initialEnemyFormations(seed, portalTerritory, difficulty),
    escalation: difficulty === 'hard' ? 8 : 3,
    supply: 100,
    woundedPool: 0,
    battle: null,
    status: 'playing',
    events: [{ id: 1, turn: 1, text: `The portal has opened near ${TERRITORIES[portalTerritory].centre}. Four task groups crossed with ten thousand soldiers.`, tone: 'warning' }]
  };
  return refreshSupply(state);
}

export function selectTaskGroup(state: GameState, id: string): GameState {
  if (!state.taskGroups[id]) return state;
  return { ...state, selectedTaskGroupId: id, selectedTerritory: state.taskGroups[id].location, targetTerritory: null };
}

export function selectTerritory(state: GameState, id: string): GameState {
  if (state.status !== 'playing') return state;
  const group = state.taskGroups[state.selectedTaskGroupId];
  if (!group) return state;
  if (id === group.location) return { ...state, selectedTerritory: id, targetTerritory: null };
  if (TERRITORIES[group.location].neighbours.includes(id)) return { ...state, selectedTerritory: id, targetTerritory: id };
  return { ...state, selectedTerritory: id, targetTerritory: null };
}

export function issueMove(state: GameState): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (!target || state.battle || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'player') return state;
  if (!TERRITORIES[group.location].neighbours.includes(target)) return state;
  const taskGroups = structuredClone(state.taskGroups);
  taskGroups[group.id].status = 'moving';
  taskGroups[group.id].order = { type: 'move', target, progress: 0, days: 0 };
  return addEvent({ ...state, taskGroups, targetTerritory: null }, `${group.name} ordered to move from ${TERRITORIES[group.location].centre} to ${TERRITORIES[target].centre}.`, 'neutral');
}

export function setGarrison(state: GameState): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  if (!canIssueOperationalOrder(group) || state.battle?.attackerGroupId === group.id) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const next = taskGroups[group.id];
  next.status = next.status === 'garrison' ? 'ready' : 'garrison';
  return addEvent({ ...state, taskGroups }, `${group.name} ${next.status === 'garrison' ? 'assigned to occupation and defensive duties' : 'released from garrison duty'} in ${TERRITORIES[group.location].centre}.`, 'neutral');
}

export function enemyStrengthAt(state: GameState, territoryId: string): { formations: number; personnel: number; armour: number; power: number } {
  const formations = Object.values(state.enemyFormations).filter(formation => formation.location === territoryId && formation.personnel > 0);
  const personnel = formations.reduce((sum, formation) => sum + formation.personnel, 0);
  const armour = formations.reduce((sum, formation) => sum + formation.armour, 0);
  const readiness = formations.length ? formations.reduce((sum, formation) => sum + formation.readiness, 0) / formations.length : 40;
  const entrenchment = formations.length ? formations.reduce((sum, formation) => sum + formation.entrenchment, 0) / formations.length : 10;
  const terrain = terrainDefence[TERRITORIES[territoryId].terrain];
  const power = Math.max(1, (personnel / 1000 * 3.4 + armour / 100 * 0.75) * (0.65 + readiness / 170) * (1 + entrenchment / 180) * terrain);
  return { formations: formations.length, personnel, armour, power };
}

export function beginOperation(state: GameState): GameState {
  const group = state.taskGroups[state.selectedTaskGroupId];
  const target = state.targetTerritory;
  if (state.battle || !target || !canIssueOperationalOrder(group) || state.territories[target].controller !== 'enemy') return state;
  if (!TERRITORIES[group.location].neighbours.includes(target)) return state;
  const defenders = Object.values(state.enemyFormations).filter(formation => formation.location === target && formation.personnel > 0);
  const strength = enemyStrengthAt(state, target);
  const taskGroups = structuredClone(state.taskGroups);
  taskGroups[group.id].status = 'attacking';
  taskGroups[group.id].order = { type: 'attack', target, progress: 0, days: 0 };
  const battle = {
    id: `B-${state.turn}-${target}`,
    attackerGroupId: group.id,
    origin: group.location,
    target,
    progress: 0,
    days: 0,
    enemyFormationIds: defenders.map(formation => formation.id),
    enemyPower: strength.power
  };
  return addEvent({ ...state, taskGroups, battle, targetTerritory: null }, `${group.name} launched an operation from ${TERRITORIES[group.location].centre} towards ${TERRITORIES[target].centre}.`, 'warning');
}

function resolveMovement(state: GameState): GameState {
  const taskGroups = structuredClone(state.taskGroups);
  let next = { ...state, taskGroups };
  for (const group of Object.values(taskGroups)) {
    if (group.status !== 'moving' || group.order?.type !== 'move') continue;
    group.order.days += 1;
    const targetTerrain = TERRITORIES[group.order.target].terrain;
    const pace = targetTerrain === 'mountainous' ? 58 : targetTerrain === 'mixed-upland' ? 75 : 100;
    group.order.progress += group.supply < 40 ? Math.round(pace * 0.65) : pace;
    if (group.order.progress >= 100) {
      group.location = group.order.target;
      group.status = 'ready';
      group.order = undefined;
      next = addEvent(next, `${group.name} arrived in ${TERRITORIES[group.location].centre}.`, 'good');
    }
  }
  return next;
}

function distributeEnemyLosses(formations: Record<string, EnemyFormation>, ids: string[], personnelLosses: number, armourLosses: number) {
  const active = ids.map(id => formations[id]).filter((formation): formation is EnemyFormation => Boolean(formation && formation.personnel > 0));
  const totalPersonnel = active.reduce((sum, formation) => sum + formation.personnel, 0);
  const totalArmour = active.reduce((sum, formation) => sum + formation.armour, 0);
  for (const formation of active) {
    const personnelShare = totalPersonnel ? formation.personnel / totalPersonnel : 1 / active.length;
    const armourShare = totalArmour ? formation.armour / totalArmour : 1 / active.length;
    formation.personnel = Math.max(0, formation.personnel - Math.round(personnelLosses * personnelShare));
    formation.armour = Math.max(0, formation.armour - Math.round(armourLosses * armourShare));
    formation.readiness = clamp(formation.readiness - 4, 15, 100);
  }
}

function retreatEnemyFormations(state: GameState, target: string, ids: string[]): GameState {
  const enemyFormations = structuredClone(state.enemyFormations);
  const retreatOptions = TERRITORIES[target].neighbours.filter(id => state.territories[id].controller === 'enemy');
  for (const id of ids) {
    const formation = enemyFormations[id];
    if (!formation || formation.personnel <= 0) {
      delete enemyFormations[id];
      continue;
    }
    if (!retreatOptions.length) {
      delete enemyFormations[id];
      continue;
    }
    retreatOptions.sort((a, b) => TERRITORIES[b].supply - TERRITORIES[a].supply);
    formation.location = retreatOptions[0];
    formation.entrenchment = Math.max(5, formation.entrenchment - 14);
    formation.readiness = Math.max(20, formation.readiness - 12);
  }
  return { ...state, enemyFormations };
}

function resolveBattle(state: GameState): GameState {
  if (!state.battle) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const enemyFormations = structuredClone(state.enemyFormations);
  let next: GameState = { ...state, taskGroups, enemyFormations, battle: { ...state.battle } };
  const battle = next.battle!;
  const group = taskGroups[battle.attackerGroupId];
  if (!group) return { ...next, battle: null };
  battle.days += 1;
  if (group.order) group.order.days += 1;

  const defender = enemyStrengthAt(next, battle.target);
  battle.enemyPower = defender.power;
  const attackPower = (group.personnel / 1000 * 4.1 + group.functionalArmour / 1000 * 1.9)
    * (0.58 + group.morale / 150)
    * (0.55 + group.supply / 190)
    * (0.9 + randomFor(next.seed, next.turn, 13) * 0.22);
  const ratio = attackPower / Math.max(1, defender.power);
  battle.progress += clamp(Math.round((ratio - 1) * 31 + 18), -28, 42);
  if (group.order) group.order.progress = battle.progress;

  const casualtyRate = clamp((0.012 / Math.max(0.55, ratio)) * (0.82 + randomFor(next.seed, next.turn, 29) * 0.38), 0.004, 0.035);
  const casualties = Math.max(4, Math.round(group.personnel * casualtyRate));
  const wounded = Math.round(casualties * 0.61);
  const killed = casualties - wounded;
  group.personnel = Math.max(0, group.personnel - casualties);
  group.morale = clamp(group.morale - (ratio < 0.8 ? 6 : 2), 10, 100);
  next.woundedPool += wounded;

  const armourDamage = Math.min(group.functionalArmour, Math.max(2, Math.round(group.functionalArmour * (ratio < 1 ? 0.018 : 0.009))));
  group.functionalArmour -= armourDamage;
  group.damagedArmour += armourDamage;

  const enemyPersonnelLosses = Math.round(group.personnel * clamp(0.009 * ratio, 0.005, 0.04));
  const enemyArmourLosses = Math.round(Math.max(1, group.functionalArmour * 0.004 * ratio));
  distributeEnemyLosses(enemyFormations, battle.enemyFormationIds, enemyPersonnelLosses, enemyArmourLosses);

  const remainingDefenders = battle.enemyFormationIds.reduce((sum, id) => sum + (enemyFormations[id]?.personnel ?? 0), 0);
  if (battle.progress >= 100 || remainingDefenders < 220) {
    const territory = next.territories[battle.target];
    territory.controller = 'player';
    territory.occupation = 'contested';
    territory.legitimacy = 46;
    territory.resistance = 42;
    territory.fortification = 0;
    territory.capturedTurn = next.turn;
    group.location = battle.target;
    group.status = 'ready';
    group.order = undefined;
    next.escalation = clamp(next.escalation + 3.2, 0, 100);
    next.selectedTerritory = battle.target;
    next.battle = null;
    next = retreatEnemyFormations(next, battle.target, battle.enemyFormationIds);
    next = addEvent(next, `${TERRITORIES[battle.target].centre} has fallen to ${group.name}. Remaining defenders withdrew; occupation is unstable.`, 'good');
  } else if (battle.progress <= -70 || battle.days >= 8 || group.personnel < 420) {
    group.location = battle.origin;
    group.status = 'recovering';
    group.order = undefined;
    next.battle = null;
    next = addEvent(next, `${group.name} abandoned the operation towards ${TERRITORIES[battle.target].centre} after ${battle.days} days.`, 'danger');
  } else {
    next = addEvent(next, `Day ${battle.days}: ${group.name} is at ${battle.progress}% towards ${TERRITORIES[battle.target].centre}. ${killed} killed, ${wounded} wounded; defenders lost about ${enemyPersonnelLosses}.`, ratio >= 1 ? 'neutral' : 'warning');
  }
  return next;
}

function resolveOccupationAndLogistics(state: GameState): GameState {
  const territories = structuredClone(state.territories);
  const taskGroups = structuredClone(state.taskGroups);
  let next: GameState = { ...state, territories, taskGroups };
  for (const [id, territory] of Object.entries(territories)) {
    if (territory.controller !== 'player') continue;
    const age = next.turn - (territory.capturedTurn ?? next.turn);
    const garrisonPower = Object.values(taskGroups)
      .filter(group => group.location === id && group.status === 'garrison')
      .reduce((sum, group) => sum + group.personnel / 1000, 0);
    territory.legitimacy = clamp(territory.legitimacy + (territory.supplied ? 0.45 : -0.4) + garrisonPower * 0.4, 0, 100);
    territory.resistance = clamp(territory.resistance - (territory.supplied ? 0.32 : -0.8) - garrisonPower * 0.7, 0, 100);
    territory.fortification = clamp(territory.fortification + garrisonPower * 0.55, 0, 45);
    if ((age >= 8 && territory.legitimacy >= 55) || (territory.legitimacy >= 68 && territory.resistance <= 18)) territory.occupation = 'administered';
    else if (age >= 3 && territory.occupation === 'contested') territory.occupation = 'controlled';
    if (randomFor(next.seed, next.turn, id.charCodeAt(id.length - 1)) < territory.resistance / 1300) {
      territory.resistance = clamp(territory.resistance + 5, 0, 100);
      territory.legitimacy = clamp(territory.legitimacy - 2, 0, 100);
      next.escalation = clamp(next.escalation + 0.5, 0, 100);
      next = addEvent(next, `Resistance cells disrupted administration in ${TERRITORIES[id].name}.`, 'warning');
    }
  }

  next = refreshSupply(next);
  for (const group of Object.values(next.taskGroups)) {
    const connected = next.territories[group.location].supplied;
    group.supply = clamp(group.supply + (connected ? Math.max(3, Math.round(next.supply / 14)) : -16), 0, 100);
    group.morale = clamp(group.morale + (connected && group.status !== 'attacking' ? 1 : group.supply < 30 ? -4 : 0), 5, 100);
    if (!connected && group.supply < 20) {
      const attrition = Math.max(2, Math.round(group.personnel * 0.0025));
      group.personnel = Math.max(0, group.personnel - attrition);
      next = addEvent(next, `${group.name} is isolated in ${TERRITORIES[group.location].centre}; ${attrition} personnel lost to attrition and desertion.`, 'danger');
    }
    if (group.status === 'recovering' && connected) group.status = 'ready';
    const repair = connected ? Math.min(group.damagedArmour, Math.max(2, Math.round((next.supply + TERRITORIES[group.location].supply * 8) / 12))) : 0;
    group.damagedArmour -= repair;
    group.functionalArmour += repair;
  }

  const administered = Object.values(next.territories).filter(territory => territory.occupation === 'administered').length;
  const recovery = Math.min(next.woundedPool, Math.round((18 + administered * 7 + next.supply * 0.22) * difficultyRules[next.difficulty].recovery));
  if (recovery > 0) {
    const candidates = Object.values(next.taskGroups).filter(group => next.territories[group.location].supplied && group.personnel < group.maxPersonnel);
    candidates.sort((a, b) => a.personnel / a.maxPersonnel - b.personnel / b.maxPersonnel);
    let remaining = recovery;
    for (const group of candidates) {
      const restored = Math.min(remaining, group.maxPersonnel - group.personnel);
      group.personnel += restored;
      remaining -= restored;
      if (!remaining) break;
    }
    next.woundedPool -= recovery - remaining;
  }
  return next;
}

function reinforceEnemy(state: GameState): GameState {
  const enemyFormations = structuredClone(state.enemyFormations);
  const reinforcementBase = 4 + state.escalation * 0.18;
  for (const formation of Object.values(enemyFormations)) {
    if (state.territories[formation.location]?.controller !== 'enemy') continue;
    formation.personnel += Math.round(reinforcementBase * difficultyRules[state.difficulty].enemy);
    formation.readiness = clamp(formation.readiness + 0.4, 15, 100);
    formation.entrenchment = clamp(formation.entrenchment + 0.25, 0, 65);
  }
  let next: GameState = { ...state, enemyFormations };
  if (state.escalation >= 60 && state.turn % (state.difficulty === 'hard' ? 3 : 5) === 0) {
    const enemyTerritories = SLICE_IDS.filter(id => state.territories[id].controller === 'enemy').sort((a, b) => TERRITORIES[b].supply - TERRITORIES[a].supply);
    const location = enemyTerritories[0];
    if (location) {
      const id = `EF-I-${state.turn}`;
      enemyFormations[id] = {
        id,
        name: 'Coalition Intervention Brigade',
        location,
        personnel: Math.round(1450 * difficultyRules[state.difficulty].enemy),
        armour: Math.round(190 * difficultyRules[state.difficulty].enemy),
        readiness: 82,
        entrenchment: 12
      };
      next = addEvent(next, `A coalition intervention brigade deployed to ${TERRITORIES[location].centre}.`, 'danger');
    }
  }
  return next;
}

function resolveCounterattack(state: GameState, forced = false): GameState {
  if (state.turn < 4 || state.battle) return state;
  const chance = (0.055 + state.escalation / 620) * difficultyRules[state.difficulty].counter;
  if (!forced && randomFor(state.seed, state.turn, 907) >= chance) return state;
  const frontier = SLICE_IDS.filter(id => state.territories[id].controller === 'player' && TERRITORIES[id].neighbours.some(neighbour => state.territories[neighbour].controller === 'enemy'));
  if (!frontier.length) return state;
  frontier.sort((a, b) => {
    const defence = (id: string) => Object.values(state.taskGroups).filter(group => group.location === id).reduce((sum, group) => sum + group.personnel + group.functionalArmour * 0.25, 0) + state.territories[id].fortification * 80;
    return defence(a) - defence(b);
  });
  const target = frontier[0];
  const origins = TERRITORIES[target].neighbours.filter(id => state.territories[id].controller === 'enemy');
  const formations = Object.values(state.enemyFormations).filter(formation => origins.includes(formation.location) && formation.personnel > 250);
  if (!formations.length) return state;
  formations.sort((a, b) => (b.personnel + b.armour * 4) - (a.personnel + a.armour * 4));
  const attacker = formations[0];
  const defenders = Object.values(state.taskGroups).filter(group => group.location === target);
  const defenderPower = defenders.reduce((sum, group) => sum + group.personnel / 1000 * 4 + group.functionalArmour / 1000 * 1.5 + (group.status === 'garrison' ? 2.5 : 0), 0) + state.territories[target].fortification / 7 + 1.5;
  const attackerPower = (attacker.personnel / 1000 * 3.6 + attacker.armour / 100 * 0.8) * (0.7 + attacker.readiness / 150) * difficultyRules[state.difficulty].enemy;
  const roll = 0.84 + randomFor(state.seed, state.turn, 919) * 0.34;
  const enemyFormations = structuredClone(state.enemyFormations);
  const taskGroups = structuredClone(state.taskGroups);
  const territories = structuredClone(state.territories);
  let next: GameState = { ...state, enemyFormations, taskGroups, territories };
  if (attackerPower * roll > defenderPower) {
    const retreatOptions = TERRITORIES[target].neighbours
      .filter(id => territories[id].controller === 'player' && territories[id].supplied)
      .sort((a, b) => TERRITORIES[b].supply - TERRITORIES[a].supply);
    const destroyed: string[] = [];
    for (const defender of defenders) {
      const group = taskGroups[defender.id];
      const combatLosses = Math.min(group.personnel, Math.max(20, Math.round(group.personnel * 0.055)));
      group.personnel -= combatLosses;
      next.woundedPool += Math.round(combatLosses * 0.55);
      if (retreatOptions.length) {
        group.location = retreatOptions[0];
        group.morale = clamp(group.morale - 12, 5, 100);
        group.status = 'recovering';
        group.order = undefined;
      } else {
        destroyed.push(group.name);
        delete taskGroups[group.id];
      }
    }
    territories[target] = { controller: 'enemy', occupation: 'enemy', legitimacy: 0, resistance: 0, supplied: false, fortification: 8 };
    enemyFormations[attacker.id].location = target;
    enemyFormations[attacker.id].readiness = clamp(enemyFormations[attacker.id].readiness - 8, 15, 100);
    const survivingIds = Object.keys(taskGroups);
    if (!taskGroups[next.selectedTaskGroupId]) {
      next.selectedTaskGroupId = survivingIds[0] ?? '';
      next.selectedTerritory = survivingIds[0] ? taskGroups[survivingIds[0]].location : target;
      next.targetTerritory = null;
    }
    next.escalation = clamp(next.escalation + 1.8, 0, 100);
    const retreatText = !defenders.length
      ? 'The territory had no task group garrison and fell without an organised retreat.'
      : retreatOptions.length
        ? 'Local task groups withdrew under pressure.'
        : `${destroyed.join(', ')} became encircled and ceased to exist as coherent formations.`;
    next = addEvent(next, `Enemy forces retook ${TERRITORIES[target].centre}. ${retreatText}`, 'danger');
  } else {
    const losses = Math.max(30, Math.round(attacker.personnel * 0.045));
    enemyFormations[attacker.id].personnel = Math.max(0, enemyFormations[attacker.id].personnel - losses);
    for (const defender of defenders) {
      const group = taskGroups[defender.id];
      const defenderLosses = Math.max(4, Math.round(group.personnel * 0.009));
      group.personnel -= defenderLosses;
      next.woundedPool += Math.round(defenderLosses * 0.6);
    }
    next = addEvent(next, `${TERRITORIES[target].centre} repelled an enemy counterattack. The attacking formation lost roughly ${losses} personnel.`, 'good');
  }
  return refreshSupply(next);
}

export function endTurn(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  let next: GameState = {
    ...state,
    turn: state.turn + 1,
    territories: structuredClone(state.territories),
    taskGroups: structuredClone(state.taskGroups),
    enemyFormations: structuredClone(state.enemyFormations),
    events: [...state.events]
  };
  next = resolveMovement(next);
  next = resolveBattle(next);
  next = resolveOccupationAndLogistics(next);
  next = reinforceEnemy(next);
  next = resolveCounterattack(next);
  next = refreshSupply(next);
  const controlled = Object.values(next.territories).filter(territory => territory.controller === 'player').length;
  next.escalation = clamp(Math.max(3 + controlled * 2.35, next.escalation - 0.08), 0, 100);
  const personnel = Object.values(next.taskGroups).reduce((sum, group) => sum + group.personnel, 0);
  if (controlled === SLICE_IDS.length) next = addEvent({ ...next, status: 'victory' }, 'All fifteen territories are under future control. Regional victory achieved.', 'good');
  else if (personnel < 1200 || next.territories[next.portalTerritory].controller !== 'player') next = addEvent({ ...next, status: 'defeat' }, 'The expedition has lost operational cohesion or access to the portal.', 'danger');
  return next;
}

export function saveGame(state: GameState) {
  localStorage.setItem('future-conquest-slice-v0.2', JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem('future-conquest-slice-v0.2');
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<GameState>;
  return parsed.version === 2 && parsed.taskGroups && parsed.enemyFormations ? parsed as GameState : null;
}

export const __testOnly = {
  refreshSupply,
  resolveCounterattack: (state: GameState) => resolveCounterattack(state, true)
};
