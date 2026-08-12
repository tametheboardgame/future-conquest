import { Marker, type Map } from 'maplibre-gl';
import activeGeojson from '../assets/vertical-slice-map.json';
import { TERRITORIES } from '../game/data';
import { getEnemyContacts, getThreatenedTerritories } from '../game/operational-clarity';
import { STRATEGIC_NODES } from '../game/strategic-network-data';
import type { GameState, TaskGroup } from '../game/types';

interface MarkerCallbacks {
  onSelectTerritory: (territoryId: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

interface TerrainFeature {
  properties?: {
    territory_id?: unknown;
    centre?: unknown;
  };
}

const compactStrength = (value: number) => {
  const rounded = Math.max(0, Math.round(value));
  if (rounded >= 10000) return `${Math.round(rounded / 1000)}k`;
  if (rounded >= 1000) return `${(rounded / 1000).toFixed(1).replace('.0', '')}k`;
  return String(rounded);
};

const finitePoint = (value: unknown): readonly [number, number] | undefined => {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [longitude, latitude] = value;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return undefined;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
  return [longitude, latitude] as const;
};

const territoryCentres = Object.fromEntries(
  (activeGeojson as unknown as { features: TerrainFeature[] }).features.flatMap(feature => {
    const territoryId = typeof feature.properties?.territory_id === 'string'
      ? feature.properties.territory_id
      : undefined;
    const centre = finitePoint(feature.properties?.centre);
    return territoryId && centre ? [[territoryId, centre]] : [];
  })
) as Record<string, readonly [number, number]>;

const makeElement = (className: string, label?: string) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  if (label) element.setAttribute('aria-label', label);
  return element;
};

const addMarker = (
  markers: Marker[],
  map: Map,
  element: HTMLElement,
  position: readonly [number, number],
  offset: readonly [number, number] = [0, 0]
) => {
  const marker = new Marker({
    element,
    anchor: 'center',
    offset: [offset[0], offset[1]]
  })
    .setLngLat([position[0], position[1]])
    .addTo(map);
  markers.push(marker);
  return marker;
};

const stopMapClick = (element: HTMLElement, action: () => void) => {
  element.addEventListener('click', event => {
    event.stopPropagation();
    action();
  });
};

const contactConfidenceLabel = (confidence: string) => {
  if (confidence === 'confirmed') return 'CONF';
  if (confidence === 'estimated') return 'EST';
  if (confidence === 'activity') return 'ACT';
  return 'STALE';
};

const nodeSymbol = (type: string) => {
  if (type === 'capital') return '◆';
  if (type === 'port') return 'P';
  if (type === 'airport') return 'A';
  if (type === 'rail-hub') return 'R';
  if (type === 'crossing') return 'X';
  if (type === 'logistics') return 'L';
  return '•';
};

/**
 * Project the mature command-map information hierarchy into screen-space DOM
 * markers above MapLibre terrain. These markers are presentation-only: all
 * positions come from existing territory/network geometry and all enemy detail
 * comes from the player-visible operational-clarity adapters.
 */
export function buildTerrainOperationalMarkers(
  map: Map,
  state: GameState,
  callbacks: MarkerCallbacks
): Marker[] {
  const markers: Marker[] = [];

  for (const [territoryId, position] of Object.entries(territoryCentres)) {
    const territory = state.territories[territoryId];
    const definition = TERRITORIES[territoryId];
    if (!territory || !definition) continue;
    const label = makeElement(
      `r3-terrain-territory-label ${territory.controller} ${state.selectedTerritory === territoryId ? 'selected' : ''}`,
      `${definition.centre}, ${definition.name}`
    );
    label.dataset.territoryId = territoryId;
    label.innerHTML = `<span>${definition.centre}</span><small>${definition.name}</small>`;
    stopMapClick(label, () => callbacks.onSelectTerritory(territoryId));
    addMarker(markers, map, label, position, [0, -10]);
  }

  for (const node of STRATEGIC_NODES) {
    const territory = state.territories[node.territoryId];
    if (!territory || node.importance < 2) continue;
    const element = makeElement(
      `r3-terrain-node-marker ${node.type} importance-${node.importance} ${territory.controller}`,
      `${node.name}, ${node.type}`
    );
    element.dataset.nodeId = node.id;
    element.innerHTML = `<b>${nodeSymbol(node.type)}</b><span>${node.name}</span>`;
    stopMapClick(element, () => callbacks.onSelectTerritory(node.territoryId));
    addMarker(markers, map, element, node.position);
  }

  const groupsByTerritory = Object.values(state.taskGroups).reduce<Record<string, TaskGroup[]>>((groups, group) => {
    (groups[group.location] ??= []).push(group);
    return groups;
  }, {});

  for (const [territoryId, groups] of Object.entries(groupsByTerritory)) {
    const position = territoryCentres[territoryId];
    if (!position) continue;
    const ordered = [...groups].sort((a, b) => a.id.localeCompare(b.id));
    const columns = ordered.length <= 4 ? Math.min(2, ordered.length) : 3;
    ordered.forEach((group, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const dx = (column - (columns - 1) / 2) * 64;
      const dy = 42 + row * 52;
      const selected = group.id === state.selectedTaskGroupId;
      const element = makeElement(
        `r3-terrain-task-group-marker ${selected ? 'selected' : ''} ${group.status}`,
        `${group.name}, ${group.personnel} active personnel, ${group.status}`
      );
      element.dataset.groupId = group.id;
      element.innerHTML = `<strong>TG ${group.id.replace('TG-', '')}</strong><span>${compactStrength(group.personnel)}</span>`;
      stopMapClick(element, () => {
        if (callbacks.onSelectGroup) callbacks.onSelectGroup(group.id);
        else callbacks.onSelectTerritory(group.location);
      });
      addMarker(markers, map, element, position, [dx, dy]);
    });
  }

  for (const contact of getEnemyContacts(state)) {
    const position = territoryCentres[contact.territoryId];
    if (!position) continue;
    const confidence = contactConfidenceLabel(contact.confidence);
    const symbol = contact.confidence === 'confirmed'
      ? String(contact.formationCount ?? 1)
      : contact.confidence === 'estimated'
        ? '~'
        : contact.confidence === 'stale'
          ? 'S'
          : '?';
    const element = makeElement(
      `r3-terrain-enemy-contact ${contact.confidence}`,
      `${contact.label}, ${confidence} confidence, assessed ${contact.estimatedMin} to ${contact.estimatedMax} personnel`
    );
    element.dataset.territoryId = contact.territoryId;
    element.innerHTML = `<strong>${symbol}</strong><span>${confidence}</span>`;
    stopMapClick(element, () => callbacks.onSelectTerritory(contact.territoryId));
    addMarker(markers, map, element, position, [44, -42]);
  }

  for (const threat of getThreatenedTerritories(state)) {
    const position = territoryCentres[threat.territoryId];
    if (!position) continue;
    const element = makeElement(
      `r3-terrain-threat-marker ${threat.stage}`,
      threat.summary
    );
    element.dataset.territoryId = threat.territoryId;
    element.innerHTML = `<strong>!</strong>${threat.stage === 'recent-combat' ? '' : `<span>D${threat.executeTurn}</span>`}`;
    stopMapClick(element, () => callbacks.onSelectTerritory(threat.territoryId));
    addMarker(markers, map, element, position, [0, -58]);
  }

  for (const operation of Object.values(state.operations)) {
    const position = territoryCentres[operation.target];
    if (!position) continue;
    const element = makeElement(
      'r3-terrain-operation-marker',
      `Operation at ${TERRITORIES[operation.target]?.centre ?? operation.target}, ${operation.participantGroupIds.length} participating formations`
    );
    element.dataset.operationId = operation.id;
    element.textContent = `OP ${operation.participantGroupIds.length}×`;
    stopMapClick(element, () => callbacks.onSelectTerritory(operation.target));
    addMarker(markers, map, element, position, [-34, -38]);
  }

  if (state.portalTerritory) {
    const position = territoryCentres[state.portalTerritory];
    if (position) {
      const element = document.createElement('div');
      element.className = 'r3-terrain-portal-marker';
      element.setAttribute('aria-hidden', 'true');
      element.innerHTML = '<i></i><i></i>';
      addMarker(markers, map, element, position, [0, -8]);
    }
  }

  return markers;
}

export function removeTerrainOperationalMarkers(markers: readonly Marker[]) {
  for (const marker of markers) marker.remove();
}
