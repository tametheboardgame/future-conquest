export type Controller = 'player' | 'enemy';
export type Terrain = 'open-lowland' | 'mixed-lowland' | 'mixed-upland' | 'mountainous';
export type FormationSide = 'future' | 'modern';
export type FormationStatus = 'ready' | 'engaged' | 'retreating' | 'destroyed';
export type SupplyState = 'full' | 'strained' | 'low' | 'isolated';

export interface TerritoryDefinition {
  id: string;
  name: string;
  centre: string;
  terrain: Terrain;
  supply: number;
  neighbours: string[];
}

export interface TerritoryState {
  controller: Controller;
  occupation: 'enemy' | 'contested' | 'controlled' | 'administered';
  legitimacy: number;
  resistance: number;
  capturedTurn?: number;
}

export interface Formation {
  id: string;
  name: string;
  shortName: string;
  side: FormationSide;
  territoryId: string;
  personnel: number;
  maxPersonnel: number;
  functionalArmour: number;
  damagedArmour: number;
  brokenArmour: number;
  cohesion: number;
  quality: number;
  operations: number;
  status: FormationStatus;
  supply: SupplyState;
  generalPresent?: boolean;
  reinforcement?: boolean;
}

export interface Battle {
  id: string;
  origin: string;
  target: string;
  attackerFormationId: string;
  defenderFormationIds: string[];
  progress: number;
  days: number;
  attackerStartingPersonnel: number;
  defenderStartingPersonnel: number;
}

export interface OperationForecast {
  attackPower: number;
  defencePower: number;
  assessment: 'favourable' | 'contested' | 'dangerous';
  likelyFutureLosses: [number, number];
  defenders: number;
}

export interface GameEvent {
  id: number;
  turn: number;
  text: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
}

export interface GameState {
  version: 2;
  seed: number;
  turn: number;
  portalTerritory: string;
  selectedTerritory: string | null;
  targetTerritory: string | null;
  selectedFormationId: string | null;
  territories: Record<string, TerritoryState>;
  formations: Record<string, Formation>;
  escalation: number;
  supply: number;
  reinforcementStage: number;
  battle: Battle | null;
  events: GameEvent[];
  status: 'playing' | 'victory' | 'defeat';
}
