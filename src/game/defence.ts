import { TERRITORIES } from './data';
import { getEnemyContacts, getThreatenedTerritories } from './operational-clarity';
import { chooseOperationalRoute } from './route-movement';
import type { GameState, TaskGroup } from './types';

export type DefensivePosition = 'fortified' | 'holding' | 'exposed' | 'critical';

export interface TerritoryDefenceAssessment {
  territoryId: string;
  frontline: boolean;
  localFormationCount: number;
  localPersonnel: number;
  garrisonFormationCount: number;
  garrisonPersonnel: number;
  mobilePersonnel: number;
  fortification: number;
  supplyReserve: number;
  supplied: boolean;
  prepared: boolean;
  preparedUntilTurn?: number;
  threateningFormationCount: number;
  estimatedThreatPersonnel: number;
  attackProbability: number;
  attackProbabilityLabel: 'LOW' | 'GUARDED' | 'HIGH' | 'CRITICAL';
  defensivePosition: DefensivePosition;
  defensivePositionLabel: 'FORTIFIED' | 'HOLDING' | 'EXPOSED' | 'CRITICAL';
  threatStage?: 'preparing' | 'imminent' | 'under-attack' | 'recent-combat';
  threatExecuteTurn?: number;
  threatSummary?: string;
  reasons: string[];
  preferredEntrenchGroupId?: string;
  reinforcementCandidateId?: string;
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const deployableArmour = (group: TaskGroup) => Math.min(group.functionalArmour, group.personnel);
const formationDefencePower = (group: TaskGroup) => (
  group.personnel / 1000 * 4
  + deployableArmour(group) / 1000 * 1.5
  + (group.status === 'garrison' ? 2.5 : 0)
);

export function recommendedReinforcementForTerritory(state: GameState, territoryId: string): TaskGroup | undefined {
  const territory = state.territories[territoryId];
  if (!territory || territory.controller !== 'player') return undefined;
  const adjacent = new Set(TERRITORIES[territoryId].neighbours);
  return Object.values(state.taskGroups)
    .filter(group => (
      group.personnel > 0
      && group.location !== territoryId
      && adjacent.has(group.location)
      && state.territories[group.location]?.controller === 'player'
      && !group.order
      && (group.status === 'ready' || group.status === 'garrison')
      && Boolean(chooseOperationalRoute(state.routeStates, group.location, territoryId, group))
    ))
    .sort((first, second) => {
      const statusRank = (group: TaskGroup) => group.status === 'ready' ? 0 : 1;
      return statusRank(first) - statusRank(second)
        || formationDefencePower(second) - formationDefencePower(first)
        || second.supply - first.supply
        || first.id.localeCompare(second.id);
    })[0];
}

export function getTerritoryDefenceAssessment(state: GameState, territoryId: string): TerritoryDefenceAssessment | null {
  const territory = state.territories[territoryId];
  const definition = TERRITORIES[territoryId];
  if (!territory || !definition || territory.controller !== 'player') return null;

  const localGroups = Object.values(state.taskGroups).filter(group => (
    group.location === territoryId && group.personnel > 0 && group.status !== 'moving' && group.status !== 'attacking'
  ));
  const garrisonGroups = localGroups.filter(group => group.status === 'garrison');
  const mobileGroups = localGroups.filter(group => group.status !== 'garrison');
  const localPersonnel = localGroups.reduce((sum, group) => sum + group.personnel, 0);
  const garrisonPersonnel = garrisonGroups.reduce((sum, group) => sum + group.personnel, 0);
  const mobilePersonnel = mobileGroups.reduce((sum, group) => sum + group.personnel, 0);
  const supplyReserve = localPersonnel > 0
    ? Math.round(localGroups.reduce((sum, group) => sum + group.supply * group.personnel, 0) / localPersonnel)
    : Math.round(state.logistics.territoryAllocations[territoryId]?.ratio ?? 0);

  const threat = getThreatenedTerritories(state).find(candidate => candidate.territoryId === territoryId);
  const adjacentEnemyTerritories = definition.neighbours.filter(id => state.territories[id]?.controller === 'enemy');
  const adjacentContacts = getEnemyContacts(state).filter(contact => adjacentEnemyTerritories.includes(contact.territoryId));
  const estimatedThreatPersonnel = adjacentContacts.reduce(
    (sum, contact) => sum + Math.round((contact.estimatedMin + contact.estimatedMax) / 2),
    0
  );
  const contactFormationEstimate = adjacentContacts.reduce((sum, contact) => sum + (contact.formationCount ?? 1), 0);
  const threateningFormationCount = threat?.formationCount ?? contactFormationEstimate;
  const frontline = adjacentEnemyTerritories.length > 0;
  const prepared = (territory.defencePreparedUntil ?? 0) >= state.turn;

  const defenderPower = localGroups.reduce((sum, group) => sum + formationDefencePower(group), 0)
    + territory.fortification / 7
    + (prepared ? 3.5 : 0)
    + 1.5;
  const threatPower = estimatedThreatPersonnel > 0
    ? estimatedThreatPersonnel / 1000 * 3.6 + threateningFormationCount * 0.7
    : 0;
  const defensiveRatio = threatPower > 0 ? defenderPower / threatPower : Number.POSITIVE_INFINITY;

  let defensivePosition: DefensivePosition = 'holding';
  if (frontline && localPersonnel === 0) defensivePosition = 'critical';
  else if (threatPower > 0 && defensiveRatio < 0.65) defensivePosition = 'critical';
  else if ((threatPower > 0 && defensiveRatio < 1) || (frontline && garrisonPersonnel === 0)) defensivePosition = 'exposed';
  else if ((threatPower > 0 && defensiveRatio >= 1.45 && supplyReserve >= 60) || (territory.fortification >= 28 && garrisonPersonnel > 0)) defensivePosition = 'fortified';

  let attackProbability: number;
  if (threat?.stage === 'under-attack') attackProbability = 100;
  else if (threat?.stage === 'imminent') attackProbability = 86;
  else if (threat?.stage === 'preparing') attackProbability = 68;
  else if (threat?.stage === 'recent-combat') attackProbability = 38;
  else if (!frontline) attackProbability = 4;
  else {
    attackProbability = 14
      + state.escalation * 0.28
      + state.enemyStrategy.pressure * 0.24
      + (state.enemyStrategy.focusTerritory === territoryId ? 18 : 0)
      + (localPersonnel === 0 ? 24 : 0)
      + (territory.occupation === 'unsecured' ? 12 : 0)
      + (!territory.supplied ? 12 : 0)
      - Math.min(18, territory.fortification * 0.42)
      - (garrisonPersonnel > 0 ? 7 : 0)
      - (prepared ? 8 : 0);
    attackProbability = clamp(Math.round(attackProbability), 5, 78);
  }

  const attackProbabilityLabel: TerritoryDefenceAssessment['attackProbabilityLabel'] = attackProbability >= 85
    ? 'CRITICAL'
    : attackProbability >= 55
      ? 'HIGH'
      : attackProbability >= 25
        ? 'GUARDED'
        : 'LOW';
  const defensivePositionLabel: TerritoryDefenceAssessment['defensivePositionLabel'] = defensivePosition === 'fortified'
    ? 'FORTIFIED'
    : defensivePosition === 'holding'
      ? 'HOLDING'
      : defensivePosition === 'exposed'
        ? 'EXPOSED'
        : 'CRITICAL';

  const reasons: string[] = [];
  if (threat) reasons.push(threat.summary);
  if (frontline && garrisonPersonnel === 0) reasons.push('No formation is assigned to garrison duty on this frontier.');
  if (localPersonnel === 0) reasons.push('No friendly formation is physically present to defend the territory.');
  if (!territory.supplied) reasons.push('The territory is isolated from reliable network supply.');
  else if (supplyReserve < 35) reasons.push('Local formation supply reserves are below 35%.');
  if (frontline && territory.fortification < 10) reasons.push('Prepared field defences are minimal.');
  if (threatPower > defenderPower) reasons.push('Estimated nearby enemy combat power exceeds the current defensive position.');
  if (prepared) reasons.push(`Defensive preparation remains active through day ${territory.defencePreparedUntil}.`);
  if (!reasons.length) reasons.push(frontline ? 'No immediate weakness dominates the current defensive assessment.' : 'No adjacent enemy-controlled territory currently threatens this position.');

  const preferredEntrenchGroupId = [...garrisonGroups]
    .sort((first, second) => second.personnel - first.personnel || second.supply - first.supply)[0]?.id;
  const reinforcementCandidateId = recommendedReinforcementForTerritory(state, territoryId)?.id;

  return {
    territoryId,
    frontline,
    localFormationCount: localGroups.length,
    localPersonnel,
    garrisonFormationCount: garrisonGroups.length,
    garrisonPersonnel,
    mobilePersonnel,
    fortification: Math.round(territory.fortification),
    supplyReserve,
    supplied: territory.supplied,
    prepared,
    preparedUntilTurn: territory.defencePreparedUntil,
    threateningFormationCount,
    estimatedThreatPersonnel,
    attackProbability,
    attackProbabilityLabel,
    defensivePosition,
    defensivePositionLabel,
    threatStage: threat?.stage,
    threatExecuteTurn: threat?.executeTurn,
    threatSummary: threat?.summary,
    reasons,
    preferredEntrenchGroupId,
    reinforcementCandidateId
  };
}
