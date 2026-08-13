import { Marker, type Map } from 'maplibre-gl';
import activeGeojson from '../assets/vertical-slice-map.json';
import { TERRITORIES } from '../game/data';
import { getEnemyContacts, getThreatenedTerritories } from '../game/operational-clarity';
import { STRATEGIC_NODES } from '../game/strategic-network-data';
import type { GameState, TaskGroup } from '../game/types';
import {
  terrainMarkerLodForZoom,
  visibleTerrainMarkerIds,
  type TerrainMarkerKind
} from './r3-terrain-marker-declutter';

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

export const terrainOperationalTerritoryCentres = Object.fromEntries(
  (activeGeojson as unknown as { features: TerrainFeature[] }).features.flatMap(feature => {
    const territoryId = typeof feature.properties?.territory_id === 'string'
      ? feature.properties.territory_id
      : undefined;
    const centre = finitePoint(feature.properties?.centre);
    return territoryId && centre ? [[territoryId, centre]] : [];
  })
) as Record<string, readonly [number, number]>;

interface MarkerElementDescriptor {
  tag: 'button' | 'div';
  className: string;
  label?: string;
  ariaHidden?: boolean;
  dataset: Record<string, string>;
  innerHTML: string;
  textContent?: string;
  action?: () => void;
}

interface TerrainMarkerDescriptor {
  id: string;
  kind: TerrainMarkerKind;
  position: readonly [number, number];
  offset: readonly [number, number];
  element: MarkerElementDescriptor;
}

const makeElement = (className: string, label?: string): MarkerElementDescriptor => ({
  tag: 'button', className, label, dataset: {}, innerHTML: ''
});

const materializeElement = (descriptor: MarkerElementDescriptor) => {
  const element = document.createElement(descriptor.tag);
  if (descriptor.tag === 'button') element.setAttribute('type', 'button');
  return updateElement(element, descriptor);
};

const addMarker = (
  markers: TerrainMarkerDescriptor[],
  _map: Map,
  element: MarkerElementDescriptor,
  position: readonly [number, number],
  kind: TerrainMarkerKind,
  markerId: string,
  offset: readonly [number, number] = [0, 0]
) => {
  Object.assign(element.dataset, {
    r3MarkerKind: kind,
    r3MarkerId: markerId,
    r3MarkerOffsetX: String(offset[0]),
    r3MarkerOffsetY: String(offset[1])
  });
  markers.push({ id: markerId, kind, position, offset, element });
};

const stopMapClick = (element: MarkerElementDescriptor, action: () => void) => {
  element.action = action;
};

const updateElement = (element: HTMLElement, descriptor: MarkerElementDescriptor) => {
  element.className = descriptor.className;
  if (descriptor.label) element.setAttribute('aria-label', descriptor.label);
  else element.removeAttribute('aria-label');
  if (descriptor.ariaHidden) element.setAttribute('aria-hidden', 'true');
  else element.removeAttribute('aria-hidden');
  element.innerHTML = descriptor.textContent === undefined ? descriptor.innerHTML : '';
  if (descriptor.textContent !== undefined) element.textContent = descriptor.textContent;
  for (const key of Object.keys(element.dataset)) delete element.dataset[key];
  Object.assign(element.dataset, descriptor.dataset);
  element.onclick = descriptor.action ? event => {
    event.stopPropagation();
    descriptor.action!();
  } : null;
  return element;
};

const contactConfidenceLabel = (confidence: string) => {
  if (confidence === 'confirmed') return 'CONF';
  if (confidence === 'estimated') return 'EST';
  if (confidence === 'activity') return 'ACT';
  return 'STALE';
};

const contactMarkerKind = (confidence: string): TerrainMarkerKind => {
  if (confidence === 'confirmed') return 'enemy-confirmed';
  if (confidence === 'estimated') return 'enemy-estimated';
  if (confidence === 'activity') return 'enemy-activity';
  return 'enemy-stale';
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
 * Player formations are geographic state, not floating annotations. A lone
 * formation therefore sits exactly on the territory centre. Multiple groups in
 * one territory fan out using the rendered card footprint plus a visible gap.
 */
const formationOffset = (index: number, count: number): readonly [number, number] => {
  if (count <= 1) return [0, 0];
  const columns = count === 3 ? 3 : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  // Offsets are transformed with the marker by MapLibre, so these dimensions
  // follow the existing LOD scale while remaining wider/taller than the card.
  const horizontalPitch = 64;
  const verticalPitch = 44;
  return [
    (column - (columns - 1) / 2) * horizontalPitch,
    (row - (rows - 1) / 2) * verticalPitch
  ];
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
  return buildTerrainOperationalMarkerDescriptors(map, state, callbacks).map(descriptor => new Marker({
    element: materializeElement(descriptor.element),
    anchor: 'center',
    offset: [descriptor.offset[0], descriptor.offset[1]]
  }).setLngLat([descriptor.position[0], descriptor.position[1]]).addTo(map));
}

function buildTerrainOperationalMarkerDescriptors(
  map: Map,
  state: GameState,
  callbacks: MarkerCallbacks
): TerrainMarkerDescriptor[] {
  const markers: TerrainMarkerDescriptor[] = [];

  for (const [territoryId, position] of Object.entries(terrainOperationalTerritoryCentres)) {
    const territory = state.territories[territoryId];
    const definition = TERRITORIES[territoryId];
    if (!territory || !definition) continue;
    const selected = state.selectedTerritory === territoryId;
    const label = makeElement(
      `r3-terrain-territory-label ${territory.controller} ${selected ? 'selected' : ''}`,
      `${definition.centre}, ${definition.name}`
    );
    label.dataset.territoryId = territoryId;
    label.innerHTML = `<span>${definition.centre}</span><small>${definition.name}</small>`;
    stopMapClick(label, () => callbacks.onSelectTerritory(territoryId));
    addMarker(
      markers,
      map,
      label,
      position,
      selected ? 'selected-territory' : 'territory',
      `territory:${territoryId}`,
      [0, -10]
    );
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
    addMarker(
      markers,
      map,
      element,
      node.position,
      node.importance >= 3 ? 'node-major' : 'node-secondary',
      `node:${node.id}`
    );
  }

  const groupsByTerritory = Object.values(state.taskGroups).reduce<Record<string, TaskGroup[]>>((groups, group) => {
    (groups[group.location] ??= []).push(group);
    return groups;
  }, {});

  for (const [territoryId, groups] of Object.entries(groupsByTerritory)) {
    const position = terrainOperationalTerritoryCentres[territoryId];
    if (!position) continue;
    const ordered = [...groups].sort((a, b) => a.id.localeCompare(b.id));
    ordered.forEach((group, index) => {
      const selected = group.id === state.selectedTaskGroupId;
      const element = makeElement(
        `r3-terrain-task-group-marker ${selected ? 'selected' : ''} ${group.status}`,
        `${group.name}, ${group.personnel} active personnel, ${group.status}`
      );
      element.dataset.groupId = group.id;
      element.dataset.territoryId = territoryId;
      element.innerHTML = `<strong>TG ${group.id.replace('TG-', '')}</strong><span>${compactStrength(group.personnel)}</span>`;
      stopMapClick(element, () => {
        if (callbacks.onSelectGroup) callbacks.onSelectGroup(group.id);
        else callbacks.onSelectTerritory(group.location);
      });
      addMarker(
        markers,
        map,
        element,
        position,
        selected ? 'selected-formation' : 'formation',
        `formation:${group.id}`,
        formationOffset(index, ordered.length)
      );
    });
  }

  for (const contact of getEnemyContacts(state)) {
    const position = terrainOperationalTerritoryCentres[contact.territoryId];
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
    addMarker(
      markers,
      map,
      element,
      position,
      contactMarkerKind(contact.confidence),
      `enemy:${contact.territoryId}:${contact.confidence}`,
      [16, -16]
    );
  }

  for (const threat of getThreatenedTerritories(state)) {
    const position = terrainOperationalTerritoryCentres[threat.territoryId];
    if (!position) continue;
    const element = makeElement(
      `r3-terrain-threat-marker ${threat.stage}`,
      threat.summary
    );
    element.dataset.territoryId = threat.territoryId;
    element.innerHTML = `<strong>!</strong>${threat.stage === 'recent-combat' ? '' : `<span>D${threat.executeTurn}</span>`}`;
    stopMapClick(element, () => callbacks.onSelectTerritory(threat.territoryId));
    addMarker(
      markers,
      map,
      element,
      position,
      threat.stage === 'recent-combat' ? 'recent-threat' : 'live-threat',
      `threat:${threat.territoryId}:${threat.stage}`,
      [-16, -16]
    );
  }

  for (const operation of Object.values(state.operations)) {
    const position = terrainOperationalTerritoryCentres[operation.target];
    if (!position) continue;
    const element = makeElement(
      'r3-terrain-operation-marker',
      `Operation at ${TERRITORIES[operation.target]?.centre ?? operation.target}, ${operation.participantGroupIds.length} participating formations`
    );
    element.dataset.operationId = operation.id;
    element.dataset.territoryId = operation.target;
    element.textContent = `OP ${operation.participantGroupIds.length}×`;
    stopMapClick(element, () => callbacks.onSelectTerritory(operation.target));
    addMarker(markers, map, element, position, 'operation', `operation:${operation.id}`, [16, 16]);
  }

  if (state.portalTerritory) {
    const position = terrainOperationalTerritoryCentres[state.portalTerritory];
    if (position) {
      const element: MarkerElementDescriptor = {
        tag: 'div',
        className: 'r3-terrain-portal-marker',
        ariaHidden: true,
        dataset: { territoryId: state.portalTerritory },
        innerHTML: '<i></i><i></i>'
      };
      addMarker(markers, map, element, position, 'portal', `portal:${state.portalTerritory}`, [-16, 16]);
    }
  }

  return markers;
}

/**
 * Resolve dense command-map marker collisions using a stable priority model.
 * The calculation uses projected screen-space coordinates plus the marker's
 * explicit offset, so pitched terrain never changes authoritative geography.
 */
export function applyTerrainOperationalMarkerDeclutter(map: Map, markers: readonly Marker[]) {
  const candidates = markers.flatMap(marker => {
    const element = marker.getElement();
    const id = element.dataset.r3MarkerId;
    const kind = element.dataset.r3MarkerKind as TerrainMarkerKind | undefined;
    if (!id || !kind) return [];
    const projected = map.project(marker.getLngLat());
    const offsetX = Number(element.dataset.r3MarkerOffsetX ?? 0);
    const offsetY = Number(element.dataset.r3MarkerOffsetY ?? 0);
    return [{
      id,
      kind,
      x: projected.x + (Number.isFinite(offsetX) ? offsetX : 0),
      y: projected.y + (Number.isFinite(offsetY) ? offsetY : 0)
    }];
  });

  const mapRect = map.getContainer().getBoundingClientRect();
  const toolbar = map.getContainer().parentElement?.querySelector('.r3-terrain-prototype-toolbar');
  const toolbarRect = toolbar instanceof HTMLElement ? toolbar.getBoundingClientRect() : undefined;
  const reservedRects = toolbarRect ? [{
    left: toolbarRect.left - mapRect.left,
    top: toolbarRect.top - mapRect.top,
    right: toolbarRect.right - mapRect.left,
    bottom: toolbarRect.bottom - mapRect.top
  }] : [];
  const visible = visibleTerrainMarkerIds(
    candidates,
    terrainMarkerLodForZoom(map.getZoom()),
    reservedRects
  );
  for (const marker of markers) {
    const element = marker.getElement();
    const id = element.dataset.r3MarkerId;
    if (!id) continue;
    const hidden = !visible.has(id);
    element.hidden = hidden;
    element.dataset.declutter = hidden ? 'hidden' : 'visible';
  }
}

export function removeTerrainOperationalMarkers(markers: readonly Marker[]) {
  for (const marker of markers) marker.remove();
}

/**
 * Reconcile detached presentation descriptors before allocating MapLibre
 * markers. Existing markers retain their DOM node (and focus); only genuinely
 * new identities enter MapLibre's add/layout path.
 */
export function reconcileTerrainOperationalMarkers(
  map: Map,
  previous: readonly Marker[],
  state: GameState,
  callbacks: MarkerCallbacks
): Marker[] {
  const priorById = new globalThis.Map(previous.flatMap(marker => {
    const id = marker.getElement().dataset.r3MarkerId;
    return id ? [[id, marker] as const] : [];
  }));
  const next = buildTerrainOperationalMarkerDescriptors(map, state, callbacks);
  const reconciled = next.map(descriptor => {
    const prior = priorById.get(descriptor.id);
    if (!prior) return new Marker({
      element: materializeElement(descriptor.element),
      anchor: 'center',
      offset: [descriptor.offset[0], descriptor.offset[1]]
    }).setLngLat([descriptor.position[0], descriptor.position[1]]).addTo(map);

    updateElement(prior.getElement(), descriptor.element);
    prior.setLngLat([descriptor.position[0], descriptor.position[1]]);
    prior.setOffset([descriptor.offset[0], descriptor.offset[1]]);
    priorById.delete(descriptor.id);
    return prior;
  });
  for (const removed of priorById.values()) removed.remove();
  return reconciled;
}
