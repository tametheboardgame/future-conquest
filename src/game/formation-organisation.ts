import { TERRITORIES } from './data';
import type { GameEvent, GameState, TaskGroup } from './types';

export type FormationCapabilityKey = 'detachment' | 'company' | 'battalion' | 'task-group' | 'major-formation';

export interface FormationCapability {
  key: FormationCapabilityKey;
  label: string;
  description: string;
  canOccupy: boolean;
}

export interface SplitFormationInput {
  sourceId: string;
  name: string;
  personnel: number;
  functionalArmour: number;
  damagedArmour: number;
}

export interface TransferFormationInput {
  sourceId: string;
  targetId: string;
  personnel: number;
  functionalArmour: number;
  damagedArmour: number;
}

const whole = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

function addEvent(state: GameState, text: string, tone: GameEvent['tone'] = 'neutral'): GameState {
  const event = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

export function formationCapability(personnel: number): FormationCapability {
  if (personnel < 50) return {
    key: 'detachment',
    label: 'Detachment',
    description: 'Suitable for observation or limited local action. Territorial occupation is impossible.',
    canOccupy: false
  };
  if (personnel < 250) return {
    key: 'company',
    label: 'Company-sized force',
    description: 'Can conduct limited combat and security tasks but cannot independently occupy a province.',
    canOccupy: false
  };
  if (personnel < 800) return {
    key: 'battalion',
    label: 'Battalion-sized force',
    description: 'Capable of local combat and limited territorial security in low-demand provinces.',
    canOccupy: true
  };
  if (personnel < 2200) return {
    key: 'task-group',
    label: 'Task group',
    description: 'A balanced operational formation capable of assault and occupation.',
    canOccupy: true
  };
  return {
    key: 'major-formation',
    label: 'Major formation',
    description: 'A concentrated force suited to major assaults and sustained occupation.',
    canOccupy: true
  };
}

export function occupationRequirement(territoryId: string): number {
  const territory = TERRITORIES[territoryId];
  if (!territory) return 1000;
  const terrainDemand = territory.terrain === 'mountainous'
    ? 420
    : territory.terrain === 'mixed-upland'
      ? 240
      : territory.terrain === 'mixed-lowland'
        ? 100
        : 0;
  return 420 + territory.supply * 90 + terrainDemand;
}

export function canReorganiseFormation(group: TaskGroup | undefined): boolean {
  return Boolean(group && !group.order && (group.status === 'ready' || group.status === 'garrison'));
}

export function reorganisationBlockReason(group: TaskGroup | undefined): string | null {
  if (!group) return 'The formation no longer exists.';
  if (group.order) return 'Complete or cancel the current order before reorganising this formation.';
  if (group.status === 'moving') return 'A moving formation cannot be reorganised.';
  if (group.status === 'attacking') return 'A formation committed to an operation cannot be reorganised.';
  if (group.status === 'recovering') return 'A recovering formation cannot be reorganised until it is ready.';
  return null;
}

function nextTaskGroupId(state: GameState): string {
  const used = new Set(Object.keys(state.taskGroups));
  let number = 1;
  while (used.has(`TG-${number}`)) number += 1;
  return `TG-${number}`;
}

function weightedAverage(aValue: number, aWeight: number, bValue: number, bWeight: number): number {
  const total = aWeight + bWeight;
  return total > 0 ? (aValue * aWeight + bValue * bWeight) / total : (aValue + bValue) / 2;
}

function sameLocationAndAvailable(state: GameState, firstId: string, secondId: string): boolean {
  const first = state.taskGroups[firstId];
  const second = state.taskGroups[secondId];
  return Boolean(
    first && second && first.id !== second.id && first.location === second.location &&
    canReorganiseFormation(first) && canReorganiseFormation(second)
  );
}

export function splitFormation(state: GameState, input: SplitFormationInput): GameState {
  if (state.status !== 'playing') return state;
  const source = state.taskGroups[input.sourceId];
  if (!canReorganiseFormation(source)) return state;

  const personnel = whole(input.personnel);
  const functionalArmour = whole(input.functionalArmour);
  const damagedArmour = whole(input.damagedArmour);
  const name = input.name.trim();
  if (!name || personnel < 1 || personnel >= source.personnel) return state;
  if (functionalArmour > source.functionalArmour || damagedArmour > source.damagedArmour) return state;

  const taskGroups = structuredClone(state.taskGroups);
  const parent = taskGroups[source.id];
  const missingCapacity = Math.max(0, parent.maxPersonnel - parent.personnel);
  const allocatedMissingCapacity = Math.floor(missingCapacity * personnel / Math.max(1, parent.personnel));
  const newMaxPersonnel = personnel + allocatedMissingCapacity;
  const newId = nextTaskGroupId(state);

  parent.personnel -= personnel;
  parent.maxPersonnel -= newMaxPersonnel;
  parent.functionalArmour -= functionalArmour;
  parent.damagedArmour -= damagedArmour;
  parent.status = 'ready';

  taskGroups[newId] = {
    id: newId,
    name: name.slice(0, 48),
    location: parent.location,
    personnel,
    maxPersonnel: newMaxPersonnel,
    functionalArmour,
    damagedArmour,
    morale: parent.morale,
    supply: parent.supply,
    status: 'ready'
  };

  return addEvent({
    ...state,
    taskGroups,
    selectedTaskGroupId: newId,
    selectedTerritory: parent.location,
    targetTerritory: null
  }, `${taskGroups[newId].name} formed from ${parent.name} with ${personnel} personnel.`, 'neutral');
}

export function mergeFormations(state: GameState, targetId: string, sourceId: string, name?: string): GameState {
  if (state.status !== 'playing' || !sameLocationAndAvailable(state, targetId, sourceId)) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const target = taskGroups[targetId];
  const source = taskGroups[sourceId];
  const targetPersonnel = target.personnel;
  const sourcePersonnel = source.personnel;

  target.morale = weightedAverage(target.morale, targetPersonnel, source.morale, sourcePersonnel);
  target.supply = weightedAverage(target.supply, targetPersonnel, source.supply, sourcePersonnel);
  target.personnel += source.personnel;
  target.maxPersonnel += source.maxPersonnel;
  target.functionalArmour += source.functionalArmour;
  target.damagedArmour += source.damagedArmour;
  target.status = 'ready';
  if (name?.trim()) target.name = name.trim().slice(0, 48);
  delete taskGroups[sourceId];

  return addEvent({
    ...state,
    taskGroups,
    selectedTaskGroupId: targetId,
    selectedTerritory: target.location,
    targetTerritory: null
  }, `${source.name} merged into ${target.name}.`, 'neutral');
}

export function transferFormationResources(state: GameState, input: TransferFormationInput): GameState {
  if (state.status !== 'playing' || !sameLocationAndAvailable(state, input.sourceId, input.targetId)) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const source = taskGroups[input.sourceId];
  const target = taskGroups[input.targetId];
  const personnel = whole(input.personnel);
  const functionalArmour = whole(input.functionalArmour);
  const damagedArmour = whole(input.damagedArmour);

  if (personnel > source.personnel || functionalArmour > source.functionalArmour || damagedArmour > source.damagedArmour) return state;
  if (personnel + functionalArmour + damagedArmour === 0) return state;

  const sourcePersonnelBefore = source.personnel;
  const sourceMissingCapacity = Math.max(0, source.maxPersonnel - source.personnel);
  const transferredMissingCapacity = personnel > 0
    ? Math.floor(sourceMissingCapacity * personnel / Math.max(1, sourcePersonnelBefore))
    : 0;
  const transferredMaxPersonnel = personnel + transferredMissingCapacity;

  target.morale = weightedAverage(target.morale, target.personnel, source.morale, personnel);
  target.supply = weightedAverage(target.supply, target.personnel, source.supply, personnel);
  source.personnel -= personnel;
  source.maxPersonnel -= transferredMaxPersonnel;
  source.functionalArmour -= functionalArmour;
  source.damagedArmour -= damagedArmour;
  target.personnel += personnel;
  target.maxPersonnel += transferredMaxPersonnel;
  target.functionalArmour += functionalArmour;
  target.damagedArmour += damagedArmour;
  source.status = 'ready';
  target.status = 'ready';

  return addEvent({ ...state, taskGroups }, `${personnel} personnel, ${functionalArmour} functional armour and ${damagedArmour} damaged armour transferred from ${source.name} to ${target.name}.`, 'neutral');
}

export function renameFormation(state: GameState, groupId: string, name: string): GameState {
  if (state.status !== 'playing') return state;
  const group = state.taskGroups[groupId];
  const trimmed = name.trim();
  if (!canReorganiseFormation(group) || !trimmed) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const previous = taskGroups[groupId].name;
  taskGroups[groupId].name = trimmed.slice(0, 48);
  return addEvent({ ...state, taskGroups }, `${previous} redesignated ${taskGroups[groupId].name}.`, 'neutral');
}

export function dissolveFormation(state: GameState, groupId: string): GameState {
  if (state.status !== 'playing') return state;
  const group = state.taskGroups[groupId];
  if (!canReorganiseFormation(group)) return state;
  if (group.personnel !== 0 || group.maxPersonnel !== 0 || group.functionalArmour !== 0 || group.damagedArmour !== 0) return state;
  if (Object.keys(state.taskGroups).length <= 1) return state;

  const taskGroups = structuredClone(state.taskGroups);
  delete taskGroups[groupId];
  const nextId = Object.keys(taskGroups)[0] ?? '';
  return addEvent({
    ...state,
    taskGroups,
    selectedTaskGroupId: nextId,
    selectedTerritory: nextId ? taskGroups[nextId].location : state.selectedTerritory,
    targetTerritory: null
  }, `${group.name} dissolved after all personnel and equipment were reassigned.`, 'neutral');
}

export function formationTotals(state: GameState) {
  return Object.values(state.taskGroups).reduce((totals, group) => ({
    personnel: totals.personnel + group.personnel,
    maxPersonnel: totals.maxPersonnel + group.maxPersonnel,
    functionalArmour: totals.functionalArmour + group.functionalArmour,
    damagedArmour: totals.damagedArmour + group.damagedArmour
  }), { personnel: 0, maxPersonnel: 0, functionalArmour: 0, damagedArmour: 0 });
}
