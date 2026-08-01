export type Controller = 'player' | 'enemy';
export type Terrain = 'open-lowland' | 'mixed-lowland' | 'mixed-upland' | 'mountainous';

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

export interface Battle {
  id: string;
  origin: string;
  target: string;
  progress: number;
  days: number;
  committed: number;
  enemyPower: number;
}

export interface GameEvent {
  id: number;
  turn: number;
  text: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
}

export interface GameState {
  seed: number;
  turn: number;
  portalTerritory: string;
  selectedTerritory: string | null;
  targetTerritory: string | null;
  territories: Record<string, TerritoryState>;
  futureTroops: number;
  functionalArmour: number;
  damagedArmour: number;
  escalation: number;
  supply: number;
  battle: Battle | null;
  events: GameEvent[];
  status: 'playing' | 'victory' | 'defeat';
}
