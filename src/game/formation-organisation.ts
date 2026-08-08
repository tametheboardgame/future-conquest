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

export interface ArmourAllocation {
  functionalArmour: number;
  damagedArmour: number;
}

const whole = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const isWholeNonNegative = (value: number) => Number.isFinite(value) && Number.isInteger(value) && value >= 0;
const normaliseName = (value: string) => value.trim().replace(/\s+/g, ' ');

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
  if (group.order) return 'Complete or cancel the current movement or combat order before reorganising this formation.';
  if (group.status === 'moving') return 'A moving formation cannot be reorganised until its movement order has resolved.';
  if (group.status === 'attacking') return 'A formation committed to an operation cannot be reorganised until that operation ends.';
  if (group.status === 'recovering') return 'A recovering formation cannot be reorganised until it completes a supplied recovery day.';
  if (group.status === 'engineering') return 'This formation is assigned to an engineering project. Cancel the project before reorganising it.';
  if (group.status === 'interdicting') return 'This formation is assigned to an interdiction mission. Cancel the mission before reorganising it.';
  if (group.status !== 'ready' && group.status !== 'garrison') return `This formation cannot be reorganised while its status is ${group.status}.`;
  return null;
}

function nextTaskGroupId(state: GameState): string {
  const used = new Set(Object.keys(state.taskGroups));
  let number = 1;
  while (used.has(`TG-${number}`)) number += 1;
  return `TG-${number}`;
}

function baseFormationName(name: string): string {
  return normaliseName(name).replace(/\s+\d+$/, '').trim() || 'Formation';
}

export function suggestSplitFormationName(state: GameState, sourceId: string): string {
  const source = state.taskGroups[sourceId];
  const base = baseFormationName(source?.name ?? 'Formation');
  const baseLower = base.toLocaleLowerCase('en-GB');
  let highest = 1;

  for (const group of Object.values(state.taskGroups)) {
    const candidate = normaliseName(group.name);
    const lower = candidate.toLocaleLowerCase('en-GB');
    if (lower === baseLower) {
      highest = Math.max(highest, 1);
      continue;
    }
    if (!lower.startsWith(`${baseLower} `)) continue;
    const suffix = candidate.slice(base.length + 1);
    if (/^\d+$/.test(suffix)) highest = Math.max(highest, Number(suffix));
  }

  return `${base} ${Math.max(2, highest + 1)}`.slice(0, 48);
}

export function formationNameExists(state: GameState, name: string, excludedIds: string[] = []): boolean {
  const target = normaliseName(name).toLocaleLowerCase('en-GB');
  if (!target) return false;
  const excluded = new Set(excludedIds);
  return Object.values(state.taskGroups).some(group => (
    !excluded.has(group.id) && normaliseName(group.name).toLocaleLowerCase('en-GB') === target
  ));
}

export function proportionalSplitArmour(source: TaskGroup, requestedPersonnel: number): ArmourAllocation {
  const personnel = Math.min(Math.max(0, whole(requestedPersonnel)), source.personnel);
  if (personnel <= 0 || source.personnel <= 0) return { functionalArmour: 0, damagedArmour: 0 };
  const ratio = personnel / source.personnel;
  return {
    functionalArmour: Math.min(personnel, Math.round(source.functionalArmour * ratio)),
    damagedArmour: Math.min(source.damagedArmour, Math.round(source.damagedArmour * ratio))
  };
}

function resolvedSplitName(state: GameState, input: SplitFormationInput): string {
  return normaliseName(input.name) || suggestSplitFormationName(state, input.sourceId);
}

export function splitFormationValidation(state: GameState, input: SplitFormationInput): string | null {
  if (state.status !== 'playing') return 'Formations cannot be reorganised after the campaign has ended.';
  const source = state.taskGroups[input.sourceId];
  const blockReason = reorganisationBlockReason(source);
  if (blockReason) return blockReason;
  if (!source) return 'The source formation no longer exists.';

  if (!isWholeNonNegative(input.personnel) || input.personnel < 1) return 'Personnel must be a whole number of at least 1.';
  if (input.personnel >= source.personnel) return `Leave at least 1 person in ${source.name}, or transfer/merge the whole formation instead.`;
  if (!isWholeNonNegative(input.functionalArmour)) return 'Functional armour must be a whole number of 0 or more.';
  if (!isWholeNonNegative(input.damagedArmour)) return 'Damaged armour must be a whole number of 0 or more.';
  if (input.functionalArmour > source.functionalArmour) return `${source.name} only has ${source.functionalArmour.toLocaleString('en-GB')} functional armour available.`;
  if (input.damagedArmour > source.damagedArmour) return `${source.name} only has ${source.damagedArmour.toLocaleString('en-GB')} damaged armour available.`;
  if (input.functionalArmour > input.personnel) return 'A newly split formation cannot be assigned more functional powered-armour suits than personnel. Extra serviceable suits remain with the parent formation.';

  const name = resolvedSplitName(state, input);
  if (!name) return 'Enter a formation name or leave the field blank to use the next automatic name.';
  if (formationNameExists(state, name)) return `A formation named “${name}” already exists. Use a unique name.`;
  return null;
}

export function transferFormationValidation(state: GameState, input: TransferFormationInput): string | null {
  if (state.status !== 'playing') return 'Formation resources cannot be transferred after the campaign has ended.';
  const source = state.taskGroups[input.sourceId];
  const target = state.taskGroups[input.targetId];
  if (!source) return 'The source formation no longer exists.';
  if (!target) return 'Choose a valid destination formation.';
  if (source.id === target.id) return 'Choose a different destination formation.';
  const sourceReason = reorganisationBlockReason(source);
  if (sourceReason) return `${source.name}: ${sourceReason}`;
  const targetReason = reorganisationBlockReason(target);
  if (targetReason) return `${target.name}: ${targetReason}`;
  if (source.location !== target.location) return 'Personnel and armour can only be transferred between formations in the same territory.';
  if (!isWholeNonNegative(input.personnel) || !isWholeNonNegative(input.functionalArmour) || !isWholeNonNegative(input.damagedArmour)) {
    return 'Personnel and armour allocations must be whole numbers of 0 or more.';
  }
  if (input.personnel > source.personnel) return `${source.name} only has ${source.personnel.toLocaleString('en-GB')} personnel available.`;
  if (input.functionalArmour > source.functionalArmour) return `${source.name} only has ${source.functionalArmour.toLocaleString('en-GB')} functional armour available.`;
  if (input.damagedArmour > source.damagedArmour) return `${source.name} only has ${source.damagedArmour.toLocaleString('en-GB')} damaged armour available.`;
  if (input.personnel + input.functionalArmour + input.damagedArmour === 0) return 'Allocate at least one person or one armour suit to transfer.';
  return null;
}

export function mergeFormationValidation(state: GameState, targetId: string, sourceId: string, name?: string): string | null {
  if (state.status !== 'playing') return 'Formations cannot be merged after the campaign has ended.';
  const target = state.taskGroups[targetId];
  const source = state.taskGroups[sourceId];
  if (!source) return 'The source formation no longer exists.';
  if (!target) return 'Choose a valid formation to merge into.';
  if (source.id === target.id) return 'A formation cannot be merged into itself.';
  const sourceReason = reorganisationBlockReason(source);
  if (sourceReason) return `${source.name}: ${sourceReason}`;
  const targetReason = reorganisationBlockReason(target);
  if (targetReason) return `${target.name}: ${targetReason}`;
  if (source.location !== target.location) return 'Only formations in the same territory can be merged.';
  const resolvedName = normaliseName(name ?? target.name) || target.name;
  if (formationNameExists(state, resolvedName, [target.id, source.id])) return `A formation named “${resolvedName}” already exists. Use a unique name.`;
  return null;
}

export function renameFormationValidation(state: GameState, groupId: string, name: string): string | null {
  if (state.status !== 'playing') return 'Formations cannot be renamed after the campaign has ended.';
  const group = state.taskGroups[groupId];
  const blockReason = reorganisationBlockReason(group);
  if (blockReason) return blockReason;
  if (!group) return 'The formation no longer exists.';
  const trimmed = normaliseName(name);
  if (!trimmed) return 'Enter a formation name.';
  if (formationNameExists(state, trimmed, [group.id])) return `A formation named “${trimmed}” already exists. Use a unique name.`;
  return null;
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
  if (splitFormationValidation(state, input)) return state;
  const source = state.taskGroups[input.sourceId];
  const personnel = whole(input.personnel);
  const functionalArmour = whole(input.functionalArmour);
  const damagedArmour = whole(input.damagedArmour);
  const name = resolvedSplitName(state, input);

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
  if (mergeFormationValidation(state, targetId, sourceId, name)) return state;
  if (!sameLocationAndAvailable(state, targetId, sourceId)) return state;
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
  if (name?.trim()) target.name = normaliseName(name).slice(0, 48);
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
  if (transferFormationValidation(state, input)) return state;
  if (!sameLocationAndAvailable(state, input.sourceId, input.targetId)) return state;
  const taskGroups = structuredClone(state.taskGroups);
  const source = taskGroups[input.sourceId];
  const target = taskGroups[input.targetId];
  const personnel = whole(input.personnel);
  const functionalArmour = whole(input.functionalArmour);
  const damagedArmour = whole(input.damagedArmour);

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
  if (renameFormationValidation(state, groupId, name)) return state;
  const group = state.taskGroups[groupId];
  const taskGroups = structuredClone(state.taskGroups);
  const previous = taskGroups[groupId].name;
  taskGroups[groupId].name = normaliseName(name).slice(0, 48);
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
