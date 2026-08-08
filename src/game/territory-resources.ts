import { TERRITORIES } from './data';
import type { GameState } from './types';

export type ResourceRating = 1 | 2 | 3 | 4 | 5;

export interface TerritoryResourceProfile {
  food: ResourceRating;
  industry: ResourceRating;
  energy: ResourceRating;
  transport: ResourceRating;
  medical: ResourceRating;
  militaryStores: ResourceRating;
}

// Strategic abstractions for the current 15-territory playable slice.
// Ratings express relative campaign usefulness rather than literal economic output.
export const TERRITORY_RESOURCES: Record<string, TerritoryResourceProfile> = {
  'GB-04': { food: 4, industry: 5, energy: 3, transport: 5, medical: 5, militaryStores: 4 },
  'FR-01': { food: 5, industry: 2, energy: 3, transport: 3, medical: 3, militaryStores: 2 },
  'FR-02': { food: 4, industry: 4, energy: 3, transport: 5, medical: 5, militaryStores: 4 },
  'FR-03': { food: 4, industry: 4, energy: 3, transport: 4, medical: 3, militaryStores: 3 },
  'FR-05': { food: 4, industry: 4, energy: 4, transport: 3, medical: 4, militaryStores: 3 },
  'BE-01': { food: 3, industry: 4, energy: 3, transport: 5, medical: 5, militaryStores: 3 },
  'BE-02': { food: 3, industry: 4, energy: 3, transport: 3, medical: 3, militaryStores: 2 },
  'NL-01': { food: 4, industry: 4, energy: 4, transport: 5, medical: 4, militaryStores: 3 },
  'LU-01': { food: 2, industry: 3, energy: 3, transport: 4, medical: 3, militaryStores: 1 },
  'DE-02': { food: 3, industry: 5, energy: 5, transport: 5, medical: 4, militaryStores: 4 },
  'DE-03': { food: 4, industry: 5, energy: 4, transport: 5, medical: 4, militaryStores: 4 },
  'DE-05': { food: 3, industry: 5, energy: 4, transport: 4, medical: 4, militaryStores: 4 },
  'CH-01': { food: 3, industry: 4, energy: 5, transport: 4, medical: 5, militaryStores: 2 },
  'CH-02': { food: 2, industry: 2, energy: 4, transport: 2, medical: 3, militaryStores: 1 },
  'AT-01': { food: 3, industry: 3, energy: 4, transport: 3, medical: 3, militaryStores: 2 }
};

const occupationSourceFactor: Record<string, number> = {
  enemy: 0,
  unsecured: 0.24,
  contested: 0.62,
  controlled: 1,
  administered: 1.16
};

export function territorySupplySourceCapacity(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  const definition = TERRITORIES[territoryId];
  if (!territory || !profile || !definition || territory.controller !== 'player') return 0;

  const base = profile.food * 5
    + profile.industry * 2
    + profile.energy * 2
    + profile.transport * 3
    + profile.militaryStores * 2
    + definition.supply * 2;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  const governance = 0.72 + territory.legitimacy * 0.003;
  const resistance = Math.max(0.55, 1 - territory.resistance * 0.0045);
  return Math.max(0, Math.floor(base * occupation * governance * resistance));
}

export function territoryRepairCapability(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  if (!territory || !profile || territory.controller !== 'player') return 0;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  return Math.max(0.35, (0.5 + profile.industry * 0.12 + profile.energy * 0.06) * Math.max(0.45, occupation));
}

export function territoryMedicalCapability(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  if (!territory || !profile || territory.controller !== 'player') return 0;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  return profile.medical * Math.max(0.35, occupation);
}
