import type { GameState } from '../game/types';
import {
  R3_SCENE_VERSION,
  resolveMapDetailTier,
  type MapPresentationFrame,
  type PresentationCamera,
  type PresentationLayer
} from './r3-renderer-foundation';

export interface CameraInput {
  x: number;
  y: number;
  width: number;
  height: number;
  zoomPercent: number;
}

export interface TerritoryPresentationState {
  id: string;
  controller: 'player' | 'enemy';
  occupation: GameState['territories'][string]['occupation'];
  supplied: boolean;
  fortification: number;
  selected: boolean;
  targeted: boolean;
}

export interface RoutePresentationState {
  id: string;
  status: GameState['routeStates'][string]['status'];
  condition: number;
  capacityModifier: number;
  upgradeLevel: number;
  bottleneck: boolean;
  utilisation?: number;
}

export interface FriendlyPiecePresentationState {
  id: string;
  name: string;
  territoryId: string;
  personnel: number;
  functionalArmour: number;
  damagedArmour: number;
  morale: number;
  supply: number;
  status: GameState['taskGroups'][string]['status'];
  selected: boolean;
  order?: {
    type: 'move' | 'attack';
    target: string;
    progress: number;
    days: number;
  };
}

export interface OperationPresentationState {
  id: string;
  targetTerritoryId: string;
  participantCount: number;
  progress: number;
  days: number;
}

export interface OverlayPresentationState {
  selectedTerritoryId?: string;
  selectedFormationId?: string;
  targetTerritoryId?: string;
  bottleneckRouteIds: readonly string[];
  starvedFormationIds: readonly string[];
  starvedTerritoryIds: readonly string[];
}

const cameraFrom = (input: CameraInput): PresentationCamera => ({
  ...input,
  detailTier: resolveMapDetailTier(input.zoomPercent)
});

/**
 * Adapts authoritative simulation state into renderer-safe semantic layers.
 *
 * Deliberately excluded here: `state.enemyFormations`. Enemy pieces/intelligence
 * must enter the presentation model through player-visible assessment helpers,
 * never from exact hidden enemy formation state.
 */
export function buildMapPresentationFrame(state: Readonly<GameState>, cameraInput: CameraInput): MapPresentationFrame {
  const territories: TerritoryPresentationState[] = Object.entries(state.territories).map(([id, territory]) => ({
    id,
    controller: territory.controller,
    occupation: territory.occupation,
    supplied: territory.supplied,
    fortification: territory.fortification,
    selected: state.selectedTerritory === id,
    targeted: state.targetTerritory === id
  }));

  const bottleneckRouteIds = new Set(state.logistics.bottleneckRouteIds);
  const routes: RoutePresentationState[] = Object.entries(state.routeStates).map(([id, route]) => ({
    id,
    status: route.status,
    condition: route.condition,
    capacityModifier: route.capacityModifier,
    upgradeLevel: route.upgradeLevel,
    bottleneck: bottleneckRouteIds.has(id),
    utilisation: state.logistics.routeFlows[id]?.utilisation
  }));

  const pieces: FriendlyPiecePresentationState[] = Object.values(state.taskGroups).map(group => ({
    id: group.id,
    name: group.name,
    territoryId: group.location,
    personnel: group.personnel,
    functionalArmour: group.functionalArmour,
    damagedArmour: group.damagedArmour,
    morale: group.morale,
    supply: group.supply,
    status: group.status,
    selected: state.selectedTaskGroupId === group.id,
    order: group.order ? {
      type: group.order.type,
      target: group.order.target,
      progress: group.order.progress,
      days: group.order.days
    } : undefined
  }));

  const effects: OperationPresentationState[] = Object.values(state.operations).map(operation => ({
    id: operation.id,
    targetTerritoryId: operation.target,
    participantCount: operation.participantGroupIds.length,
    progress: operation.progress,
    days: operation.days
  }));

  const overlays: OverlayPresentationState = {
    selectedTerritoryId: state.selectedTerritory ?? undefined,
    selectedFormationId: state.selectedTaskGroupId || undefined,
    targetTerritoryId: state.targetTerritory ?? undefined,
    bottleneckRouteIds: [...state.logistics.bottleneckRouteIds],
    starvedFormationIds: [...state.logistics.starvedFormationIds],
    starvedTerritoryIds: [...state.logistics.starvedTerritoryIds]
  };

  const layers: readonly PresentationLayer[] = [
    { id: 'terrain', visible: true, payload: null },
    { id: 'political-control', visible: true, payload: territories },
    { id: 'routes', visible: true, payload: routes },
    { id: 'pieces', visible: true, payload: pieces },
    { id: 'effects', visible: effects.length > 0, payload: effects },
    { id: 'overlays', visible: true, payload: overlays }
  ];

  return {
    sceneVersion: R3_SCENE_VERSION,
    camera: cameraFrom(cameraInput),
    layers,
    selectedTerritoryId: state.selectedTerritory ?? undefined,
    selectedFormationId: state.selectedTaskGroupId || undefined
  };
}
