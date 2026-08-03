export type Controller = 'player' | 'enemy';
export type Terrain = 'open-lowland' | 'mixed-lowland' | 'mixed-upland' | 'mountainous';
export type Difficulty = 'story' | 'standard' | 'hard';
export type EscalationStageId = 1 | 2 | 3 | 4 | 5;
export type EnemyOrderType = 'reinforce' | 'reposition' | 'entrench' | 'counterattack' | 'withdraw';
export type IntelligenceConfidence = 'low' | 'moderate' | 'high';
export type StrategicNodeType = 'capital' | 'city' | 'port' | 'airport' | 'rail-hub' | 'crossing' | 'logistics';
export type StrategicRouteType = 'road' | 'rail' | 'ferry' | 'tunnel' | 'mountain-pass' | 'river-crossing';
export type StrategicRouteStatus = 'open' | 'damaged' | 'blocked' | 'destroyed';
export type SupplyCondition = 'sustained' | 'strained' | 'undersupplied' | 'critical' | 'cut-off';
export type RouteSupplyCondition = 'idle' | 'active' | 'strained' | 'overloaded';
export type InfrastructureIncidentCause = 'resistance' | 'enemy-interdiction' | 'combat';
export type EngineeringAllocation = 25 | 50 | 75 | 100;
export type EngineeringProjectStatus = 'active' | 'completed' | 'cancelled';

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
  routeId?: string;
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
  status: 'ready' | 'moving' | 'attacking' | 'garrison' | 'recovering' | 'engineering';
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
  executeTurn?: number;
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

export interface StrategicNodeDefinition {
  id: string;
  name: string;
  territoryId: string;
  type: StrategicNodeType;
  position: [number, number];
  importance: 1 | 2 | 3;
  supplyCapacity: number;
}

export interface StrategicRouteDefinition {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  fromTerritoryId: string;
  toTerritoryId: string;
  type: StrategicRouteType;
  movementDays: number;
  capacity: number;
  supplyCapacity: number;
  heavyArmour: boolean;
}

export interface StrategicRouteState {
  status: StrategicRouteStatus;
  condition: number;
  capacityModifier: number;
}

export interface SupplyPath {
  sourceTerritoryId: string;
  targetTerritoryId: string;
  routeIds: string[];
}

export interface FormationSupplyAllocation {
  groupId: string;
  demand: number;
  delivered: number;
  ratio: number;
  condition: SupplyCondition;
  path: SupplyPath;
}

export interface TerritorySupplyAllocation {
  territoryId: string;
  demand: number;
  delivered: number;
  ratio: number;
  condition: SupplyCondition;
  routeIds: string[];
}

export interface RouteSupplyFlow {
  routeId: string;
  capacity: number;
  used: number;
  utilisation: number;
  condition: RouteSupplyCondition;
}

export interface LogisticsState {
  turn: number;
  sourceCapacity: number;
  sourceUsed: number;
  totalDemand: number;
  totalDelivered: number;
  networkEfficiency: number;
  routeFlows: Record<string, RouteSupplyFlow>;
  territoryAllocations: Record<string, TerritorySupplyAllocation>;
  formationAllocations: Record<string, FormationSupplyAllocation>;
  bottleneckRouteIds: string[];
}

export interface EngineeringProject {
  id: string;
  routeId: string;
  assignedTaskGroupId: string;
  createdTurn: number;
  startingCondition: number;
  targetCondition: number;
  progress: number;
  allocation: EngineeringAllocation;
  supplySpent: number;
  status: EngineeringProjectStatus;
  returnStatus: 'ready' | 'garrison';
}

export interface InfrastructureIncident {
  id: string;
  turn: number;
  routeId: string;
  cause: InfrastructureIncidentCause;
  severity: number;
  description: string;
}

export interface GameEvent {
  id: number;
  turn: number;
  text: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
}

export interface GameState {
  version: 10;
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
  routeStates: Record<string, StrategicRouteState>;
  logistics: LogisticsState;
  infrastructureIncidents?: InfrastructureIncident[];
  engineeringProjects: EngineeringProject[];
  supply: number;
  woundedPool: number;
  operations: Record<string, Operation>;
  events: GameEvent[];
  status: 'playing' | 'victory' | 'defeat';
}
