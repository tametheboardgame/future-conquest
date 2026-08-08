export type Controller = 'player' | 'enemy';
export type Terrain = 'open-lowland' | 'mixed-lowland' | 'mixed-upland' | 'mountainous';
export type Difficulty = 'story' | 'standard' | 'hard';
export type EscalationStageId = 1 | 2 | 3 | 4 | 5;
export type EnemyOrderType = 'reinforce' | 'reposition' | 'entrench' | 'counterattack' | 'withdraw' | 'concentrate' | 'interdict';
export type EnemyDoctrine = 'containment' | 'counteroffensive' | 'logistics-war' | 'strategic-emergency';
export type IntelligenceConfidence = 'low' | 'moderate' | 'high';
export type StrategicNodeType = 'capital' | 'city' | 'port' | 'airport' | 'rail-hub' | 'crossing' | 'logistics';
export type StrategicRouteType = 'road' | 'rail' | 'ferry' | 'tunnel' | 'mountain-pass' | 'river-crossing';
export type StrategicRouteStatus = 'open' | 'damaged' | 'blocked' | 'destroyed';
export type SupplyCondition = 'sustained' | 'strained' | 'undersupplied' | 'critical' | 'cut-off';
export type LogisticsPriority = 'critical' | 'high' | 'standard' | 'restricted';
export type RouteSupplyCondition = 'idle' | 'active' | 'strained' | 'overloaded';
export type InfrastructureIncidentCause = 'resistance' | 'enemy-interdiction' | 'player-interdiction' | 'combat';
export type EngineeringAllocation = number;
export type EngineeringProjectKind = 'repair' | 'upgrade';
export type EngineeringProjectStatus = 'active' | 'completed' | 'cancelled';
export type InterdictionIntensity = 25 | 50 | 75 | 100;
export type InterdictionMissionStatus = 'active' | 'succeeded' | 'failed' | 'cancelled';

export interface OperationalAwarenessState {
  previousNetworkEfficiency: number;
  lastAcknowledgedSupplyTurn: number;
}

export interface StrategicCollapseState {
  pending: boolean;
  acknowledgedEpisode: boolean;
  triggeredTurn?: number;
  triggerCrisisTurns?: number;
  lastDecision?: 'continue' | 'surrender';
  lastDecisionTurn?: number;
  lastRecoveryTurn?: number;
}

export interface TutorialState {
  enabled: boolean;
  step: number;
  completed: boolean;
  startedTurn: number;
}

export interface LogisticsPriorityState {
  formationOverrides: Record<string, LogisticsPriority>;
  territoryOverrides: Record<string, LogisticsPriority>;
}

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
  defencePreparedUntil?: number;
  lastEntrenchTurn?: number;
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
  status: 'ready' | 'moving' | 'attacking' | 'garrison' | 'recovering' | 'engineering' | 'interdicting';
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

export interface OperationCombatLedger {
  startedTurn: number;
  committedPersonnel: number;
  committedFunctionalArmour: number;
  playerKilled: number;
  playerWounded: number;
  armourDamaged: number;
  enemyStartingPersonnel: number;
  enemyStartingArmour: number;
  enemyPersonnelLosses: number;
  enemyArmourLosses: number;
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
  combat?: OperationCombatLedger;
}

export interface CombatReport {
  id: string;
  turn: number;
  kind: 'offensive' | 'counterattack';
  outcome: 'victory' | 'withdrawal' | 'repelled' | 'territory-lost';
  territoryId: string;
  startedTurn: number;
  durationDays: number;
  participantNames: string[];
  playerStartingPersonnel: number;
  playerEndingPersonnel: number;
  playerKilled: number;
  playerWounded: number;
  playerReturnedToDuty: number;
  playerOtherLosses: number;
  playerStartingFunctionalArmour: number;
  playerEndingFunctionalArmour: number;
  playerArmourDamaged: number;
  playerArmourRepaired: number;
  enemyStartingPersonnel: number;
  enemyEndingPersonnel: number;
  enemyPersonnelLosses: number;
  enemyStartingArmour: number;
  enemyEndingArmour: number;
  enemyArmourLosses: number;
  note: string;
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
  supportFormationIds?: string[];
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
  kind: 'mobilisation' | 'order' | 'escalation' | 'strategy';
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
  upgradeLevel: number;
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
  priority: LogisticsPriority;
  automaticPriority: boolean;
  path: SupplyPath;
}

export interface TerritorySupplyAllocation {
  territoryId: string;
  demand: number;
  delivered: number;
  ratio: number;
  condition: SupplyCondition;
  administrationDemand: number;
  administrationDelivered: number;
  priority: LogisticsPriority;
  automaticPriority: boolean;
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
  starvedFormationIds: string[];
  starvedTerritoryIds: string[];
}

export interface EngineeringProject {
  id: string;
  routeId: string;
  kind: EngineeringProjectKind;
  assignedTaskGroupId?: string;
  createdTurn: number;
  startingCondition: number;
  targetCondition: number;
  progress: number;
  allocation: EngineeringAllocation;
  supplySpent: number;
  status: EngineeringProjectStatus;
  returnStatus: 'ready' | 'garrison';
  workCompleted: number;
  workRequired: number;
  materialCost: number;
  materialSpent: number;
}

export interface InterdictionMission {
  id: string;
  routeId: string;
  assignedTaskGroupId: string;
  createdTurn: number;
  progress: number;
  intensity: InterdictionIntensity;
  supplySpent: number;
  casualties: number;
  damageInflicted: number;
  status: InterdictionMissionStatus;
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

export interface EnemyStrategyState {
  doctrine: EnemyDoctrine;
  pressure: number;
  momentum: number;
  focusTerritory?: string;
  threatenedRouteIds: string[];
  operationalCrisisTurns: number;
  lastDoctrineChangeTurn: number;
}

export interface GameState {
  version: 14;
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
  enemyStrategy: EnemyStrategyState;
  strategicCollapse?: StrategicCollapseState;
  operationalAwareness: OperationalAwarenessState;
  tutorial: TutorialState;
  routeStates: Record<string, StrategicRouteState>;
  logistics: LogisticsState;
  logisticsPriorities: LogisticsPriorityState;
  infrastructureIncidents?: InfrastructureIncident[];
  engineeringProjects: EngineeringProject[];
  interdictionMissions: InterdictionMission[];
  supply: number;
  woundedPool: number;
  operations: Record<string, Operation>;
  combatReports?: CombatReport[];
  events: GameEvent[];
  status: 'playing' | 'victory' | 'defeat';
}
