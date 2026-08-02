export type Controller = 'player' | 'enemy';
export type Terrain = 'open-lowland' | 'mixed-lowland' | 'mixed-upland' | 'mountainous';
export type Difficulty = 'story' | 'standard' | 'hard';
export type EscalationStageId = 1 | 2 | 3 | 4 | 5;
export type EnemyOrderType = 'reinforce' | 'reposition' | 'entrench' | 'counterattack' | 'withdraw';
export type IntelligenceConfidence = 'low' | 'moderate' | 'high';

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
  occupation: 'enemy' | 'unsecured' | 'contested' | 'controlled' | 'administered';
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

export interface MobilisationProject {
  id: string;
  name: string;
  source: string;
  stage: EscalationStageId;
  personnel: number;
  armour: number;
  readiness: number;
  arrivalTurn: number;
  status: 'preparing' | 'deployed';
  entryTerritory?: string;
}

export interface EnemyOrder {
  id: string;
  turn: number;
  type: EnemyOrderType;
  formationId?: string;
  origin?: string;
  target: string;
  status: 'planned' | 'executing' | 'completed';
  priority: number;
  summary: string;
}

export interface IntelligenceReport {
  id: string;
  turn: number;
  kind: 'mobilisation' | 'order' | 'escalation';
  title: string;
  detail: string;
  confidence: IntelligenceConfidence;
  estimatedMin?: number;
  estimatedMax?: number;
  territoryId?: string;
}

export interface GameEvent {
  id: number;
  turn: number;
  text: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
}

export interface GameState {
  version: 5;
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
  escalationStage: EscalationStageId;
  mobilisationPool: number;
  mobilisations: MobilisationProject[];
  enemyOrders: EnemyOrder[];
  intelligenceReports: IntelligenceReport[];
  supply: number;
  woundedPool: number;
  operations: Record<string, Operation>;
  events: GameEvent[];
  status: 'playing' | 'victory' | 'defeat';
}
