export type Controller = 'player' | 'enemy';
export type Terrain = 'open-lowland' | 'mixed-lowland' | 'mixed-upland' | 'mountainous';
export type Difficulty = 'story' | 'standard' | 'hard';

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
  supplied: boolean;
  fortification: number;
  capturedTurn?: number;
}

export interface TaskGroupOrder {
  type: 'move' | 'attack';
  target: string;
  progress: number;
  days: number;
  operationId?: string;
}

export interface TaskGroup {
  id: string;
  name: string;
  location: string;
  personnel: number;
  maxPersonnel: number;
  functionalArmour: number;
  damagedArmour: number;
  morale: number;
  supply: number;
  status: 'ready' | 'moving' | 'attacking' | 'garrison' | 'recovering';
  order?: TaskGroupOrder;
}

export interface EnemyFormation {
  id: string;
  name: string;
  location: string;
  personnel: number;
  armour: number;
  readiness: number;
  entrenchment: number;
}

export interface Operation {
  id: string;
  target: string;
  participantGroupIds: string[];
  origins: Record<string, string>;
  progress: number;
  days: number;
  enemyFormationIds: string[];
  enemyPower: number;
}

export interface GameEvent {
  id: number;
  turn: number;
  text: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
}

export interface GameState {
  version: 3;
  seed: number;
  difficulty: Difficulty;
  turn: number;
  portalTerritory: string;
  selectedTerritory: string | null;
  targetTerritory: string | null;
  selectedTaskGroupId: string;
  territories: Record<string, TerritoryState>;
  taskGroups: Record<string, TaskGroup>;
  enemyFormations: Record<string, EnemyFormation>;
  escalation: number;
  supply: number;
  woundedPool: number;
  operations: Record<string, Operation>;
  events: GameEvent[];
  status: 'playing' | 'victory' | 'defeat';
}
