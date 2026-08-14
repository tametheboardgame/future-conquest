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

export interface TerrainOperationalLayers {
  territoryNames: boolean;
  friendlyFormations: boolean;
  enemyContacts: boolean;
  operations: boolean;
  citiesHubs: boolean;
  ports: boolean;
  airports: boolean;
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
    r3MarkerOffsetY: String(offset[1]),
    // Keep the geographic source of truth beside the DOM marker. MapLibre owns
    // the screen transform; layout passes may add bounded pixel offsets, but
    // must never turn a previously projected position into the next anchor.
    r3AuthoritativeLongitude: String(position[0]),
    r3AuthoritativeLatitude: String(position[1])
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
  const horizontalPitch = 64;
  const verticalPitch = 44;
  return [
    (column - (columns - 1) / 2) * horizontalPitch,
    (row - (rows - 1) / 2) * verticalPitch
  ];
};

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
  const formationTerritoryIds = new Set(Object.values(state.taskGroups).map(group => group.location));

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
      formationTerritoryIds.has(territoryId) ? [0, -54] : [0, -10]
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
    element.dataset.nodeType = node.type;
    element.dataset.territoryId = node.territoryId;
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
    addMarker(markers, map, element, position, contactMarkerKind(contact.confidence), `enemy:${contact.territoryId}:${contact.confidence}`, [16, -16]);
  }

  for (const threat of getThreatenedTerritories(state)) {
    const position = terrainOperationalTerritoryCentres[threat.territoryId];
    if (!position) continue;
    const element = makeElement(`r3-terrain-threat-marker ${threat.stage}`, threat.summary);
    element.dataset.territoryId = threat.territoryId;
    element.innerHTML = `<strong>!</strong>${threat.stage === 'recent-combat' ? '' : `<span>D${threat.executeTurn}</span>`}`;
    stopMapClick(element, () => callbacks.onSelectTerritory(threat.territoryId));
    addMarker(markers, map, element, position, threat.stage === 'recent-combat' ? 'recent-threat' : 'live-threat', `threat:${threat.territoryId}:${threat.stage}`, [-16, -16]);
  }

  for (const operation of Object.values(state.operations)) {
    const position = terrainOperationalTerritoryCentres[operation.target];
    if (!position) continue;
    const element = makeElement('r3-terrain-operation-marker', `Operation at ${TERRITORIES[operation.target]?.centre ?? operation.target}, ${operation.participantGroupIds.length} participating formations`);
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

export function applyTerrainOperationalMarkerDeclutter(map: Map, markers: readonly Marker[]) {
  applyTerrainOperationalMarkerLayout(map, markers, {
    territoryNames: true,
    friendlyFormations: true,
    enemyContacts: true,
    operations: true,
    citiesHubs: true,
    ports: true,
    airports: false
  });
}

const markerEnabled = (element: HTMLElement, layers: TerrainOperationalLayers) => {
  const kind = element.dataset.r3MarkerKind as TerrainMarkerKind | undefined;
  if (kind === 'territory' || kind === 'selected-territory') return layers.territoryNames;
  if (kind === 'formation' || kind === 'selected-formation') return layers.friendlyFormations;
  if (kind?.startsWith('enemy-')) return layers.enemyContacts;
  if (kind === 'operation' || kind === 'live-threat' || kind === 'recent-threat' || kind === 'portal') return layers.operations;
  if (kind === 'node-major' || kind === 'node-secondary') {
    const type = element.dataset.nodeType;
    if (type === 'port') return layers.ports;
    if (type === 'airport') return layers.airports;
    return layers.citiesHubs;
  }
  return true;
};

type Rect = { left: number; top: number; right: number; bottom: number };
type MarkerBaseRects = ReadonlyMap<Marker, Rect>;
const effectiveMarkerBaseOffset = (element: HTMLElement): [number, number] => {
  const canonicalX = Number(element.dataset.r3MarkerOffsetX ?? 0);
  const canonicalY = Number(element.dataset.r3MarkerOffsetY ?? 0);
  const presentationX = Number(element.dataset.r3PresentationOffsetX);
  const presentationY = Number(element.dataset.r3PresentationOffsetY);
  return [
    Number.isFinite(presentationX) ? presentationX : canonicalX,
    Number.isFinite(presentationY) ? presentationY : canonicalY
  ];
};
const translateRect = (rect: Rect, dx: number, dy: number): Rect => ({
  left: rect.left + dx, right: rect.right + dx, top: rect.top + dy, bottom: rect.bottom + dy
});

// MapLibre 6 updates a marker transform synchronously in Marker#setOffset().
// Always restore descriptor offsets first and measure that real DOM geometry;
// subtracting a recorded prior displacement manufactures an incorrect origin.
const resetAndCaptureMarkerBaseRects = (markers: readonly Marker[]): MarkerBaseRects => {
  for (const marker of markers) {
    const element = marker.getElement();
    // A moving formation legitimately uses an interpolated WGS84 presentation
    // position. Every other marker is stationary, so force MapLibre to project
    // its authoritative coordinate against the *current* camera before reading
    // collision geometry. This also repairs transforms retained across React
    // reconciliation while a camera transition was in flight.
    if (!element.dataset.movementProgress) {
      const longitude = Number(element.dataset.r3AuthoritativeLongitude);
      const latitude = Number(element.dataset.r3AuthoritativeLatitude);
      if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
        marker.setLngLat([longitude, latitude]);
      }
    }
    marker.setOffset(effectiveMarkerBaseOffset(element));
    element.dataset.formationDisplacementX = '0';
    element.dataset.formationDisplacementY = '0';
    element.dataset.contactDisplacementX = '0';
    element.dataset.contactDisplacementY = '0';
    element.dataset.toolbarDisplacementX = '0';
    element.dataset.toolbarDisplacementY = '0';
    element.dataset.placeAvoidanceDisplacementX = '0';
    element.dataset.placeAvoidanceDisplacementY = '0';
  }
  return new globalThis.Map(markers.map(marker => [marker, marker.getElement().getBoundingClientRect()] as const));
};
const overlaps = (a: Rect, b: Rect, gap = 4) => (
  a.right + gap > b.left && a.left - gap < b.right
  && a.bottom + gap > b.top && a.top - gap < b.bottom
);

const formationDeltas = (() => {
  const deltas: Array<readonly [number, number]> = [];
  for (let dy = -96; dy <= 96; dy += 1) for (let dx = -96; dx <= 96; dx += 1) {
    if (dx * dx + dy * dy <= 96 * 96) deltas.push([dx, dy]);
  }
  return deltas.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1])
    || b[1] - a[1] || b[0] - a[0]);
})();

const placeLabelRect = (marker: Marker, baseRects: MarkerBaseRects) => {
  const element = marker.getElement();
  return translateRect(baseRects.get(marker) ?? element.getBoundingClientRect(),
    Number(element.dataset.toolbarDisplacementX ?? 0) + Number(element.dataset.placeAvoidanceDisplacementX ?? 0),
    Number(element.dataset.toolbarDisplacementY ?? 0) + Number(element.dataset.placeAvoidanceDisplacementY ?? 0));
};

const placeLabelMarkers = (markers: readonly Marker[]) => markers.filter(marker => {
  const element = marker.getElement();
  return !element.hidden && ['territory', 'selected-territory', 'node-major', 'node-secondary'].includes(element.dataset.r3MarkerKind ?? '');
});

function avoidFormationLabelCollisions(
  markers: readonly Marker[], baseRects: MarkerBaseRects, toolbar: Element | null | undefined, canvasRect: Rect
) {
  const labels = placeLabelMarkers(markers);
  const obstacles = () => labels.map(marker => placeLabelRect(marker, baseRects));
  const hudRect = toolbar instanceof HTMLElement ? toolbar.getBoundingClientRect() : undefined;
  const placedFormationRects: Rect[] = [];
  const clusters = new globalThis.Map<string, Marker[]>();
  for (const marker of markers) {
    const element = marker.getElement();
    if (element.hidden || !['formation', 'selected-formation'].includes(element.dataset.r3MarkerKind ?? '')) continue;
    const territoryId = element.dataset.territoryId;
    if (territoryId) {
      const cluster = clusters.get(territoryId) ?? [];
      cluster.push(marker);
      clusters.set(territoryId, cluster);
    }
  }

  for (const cluster of clusters.values()) {
    const rects = cluster.map(marker => baseRects.get(marker) ?? marker.getElement().getBoundingClientRect());
    const validDelta = ([dx, dy]: readonly [number, number]) => rects.every(rect => {
      const candidate = translateRect(rect, dx, dy);
      return obstacles().every(obstacle => !overlaps(candidate, obstacle, 0))
        && placedFormationRects.every(placed => !overlaps(candidate, placed, 0))
        && (!hudRect || !overlaps(candidate, hudRect, 0))
        && candidate.left >= canvasRect.left && candidate.top >= canvasRect.top
        && candidate.right <= canvasRect.right && candidate.bottom <= canvasRect.bottom;
    });
    let delta = formationDeltas.find(validDelta);

    if (!delta) {
      // Joint fallback: only labels intersecting this cluster's feasible 96px
      // screen-space area may move. Try modest label offsets together with each
      // common formation candidate; labels remain visible, in-canvas, HUD-safe,
      // mutually separated, and anchored to their unchanged WGS84 positions.
      const conflicting = labels.filter(label => {
        const labelRect = placeLabelRect(label, baseRects);
        return formationDeltas.some(([dx, dy]) => rects.some(rect => overlaps(translateRect(rect, dx, dy), labelRect, 0)));
      }).sort((a, b) => (a.getElement().dataset.r3MarkerId ?? '').localeCompare(b.getElement().dataset.r3MarkerId ?? ''));
      const fixedLabels = labels.filter(label => !conflicting.includes(label)).map(label => placeLabelRect(label, baseRects));
      const labelDeltas: Array<readonly [number, number]> = [];
      for (let dy = -48; dy <= 48; dy += 4) for (let dx = -48; dx <= 48; dx += 4) {
        if (dx * dx + dy * dy <= 48 * 48) labelDeltas.push([dx, dy]);
      }
      labelDeltas.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1])
        || b[1] - a[1] || b[0] - a[0]);

      for (const candidateDelta of formationDeltas) {
        const formationRects = rects.map(rect => translateRect(rect, candidateDelta[0], candidateDelta[1]));
        if (formationRects.some(rect => placedFormationRects.some(placed => overlaps(rect, placed, 0)))) continue;
        if (formationRects.some(rect => (hudRect && overlaps(rect, hudRect, 0))
          || rect.left < canvasRect.left || rect.top < canvasRect.top
          || rect.right > canvasRect.right || rect.bottom > canvasRect.bottom)) continue;
        const moved: Array<{ marker: Marker; delta: readonly [number, number]; rect: Rect }> = [];
        const placeLabel = (index: number): boolean => {
          if (index >= conflicting.length) return true;
          const marker = conflicting[index];
          const start = placeLabelRect(marker, baseRects);
          for (const labelDelta of labelDeltas) {
            const [dx, dy] = labelDelta;
            const candidate = translateRect(start, dx, dy);
            const valid = candidate.left >= canvasRect.left && candidate.top >= canvasRect.top
              && candidate.right <= canvasRect.right && candidate.bottom <= canvasRect.bottom
              && (!hudRect || !overlaps(candidate, hudRect, 0))
              && fixedLabels.every(other => !overlaps(candidate, other, 0))
              && moved.every(other => !overlaps(candidate, other.rect, 0))
              && placedFormationRects.every(formation => !overlaps(candidate, formation, 0))
              && formationRects.every(formation => !overlaps(candidate, formation, 0));
            if (!valid) continue;
            moved.push({ marker, delta: labelDelta, rect: candidate });
            if (placeLabel(index + 1)) return true;
            moved.pop();
          }
          return false;
        };
        const success = placeLabel(0);
        if (!success) continue;
        for (const move of moved) {
          const element = move.marker.getElement();
          const toolbarX = Number(element.dataset.toolbarDisplacementX ?? 0);
          const toolbarY = Number(element.dataset.toolbarDisplacementY ?? 0);
          const placeX = Number(element.dataset.placeAvoidanceDisplacementX ?? 0) + move.delta[0];
          const placeY = Number(element.dataset.placeAvoidanceDisplacementY ?? 0) + move.delta[1];
          const [baseX, baseY] = effectiveMarkerBaseOffset(element);
          move.marker.setOffset([baseX + toolbarX + placeX, baseY + toolbarY + placeY]);
          element.dataset.placeAvoidanceDisplacementX = String(placeX);
          element.dataset.placeAvoidanceDisplacementY = String(placeY);
        }
        // Re-evaluate against the final displaced-label rectangles rather than
        // trusting the joint trial's intermediate geometry.
        delta = formationDeltas.find(validDelta);
        if (delta) break;
      }
    }
    delta ??= [0, 0];
    for (const marker of cluster) {
      const element = marker.getElement();
      const [baseX, baseY] = effectiveMarkerBaseOffset(element);
      marker.setOffset([baseX + delta[0], baseY + delta[1]]);
      element.dataset.formationDisplacementX = String(delta[0]);
      element.dataset.formationDisplacementY = String(delta[1]);
      placedFormationRects.push(translateRect(baseRects.get(marker) ?? element.getBoundingClientRect(), delta[0], delta[1]));
    }
  }
}

/** Move protected territory names clear of the HUD without changing geography. */
function avoidTerritoryToolbarCollisions(
  markers: readonly Marker[], toolbar: Element | null | undefined, baseRects: MarkerBaseRects, canvasRect: Rect
) {
  if (!(toolbar instanceof HTMLElement)) return;
  const toolbarRect = toolbar.getBoundingClientRect();
  const gap = 4;
  const maximumDisplacement = 128;
  for (const marker of markers) {
    const element = marker.getElement();
    const kind = element.dataset.r3MarkerKind;
    if (element.hidden || (kind !== 'territory' && kind !== 'selected-territory')) continue;
    const rect = baseRects.get(marker) ?? element.getBoundingClientRect();
    let delta: readonly [number, number] = [0, 0];
    if (overlaps(rect, toolbarRect, 0)) {
      const candidates: Array<readonly [number, number]> = [
        [0, toolbarRect.bottom - rect.top + gap],
        [toolbarRect.right - rect.left + gap, 0],
        [toolbarRect.left - rect.right - gap, 0],
        [0, toolbarRect.top - rect.bottom - gap]
      ];
      candidates.sort((a, b) => Math.hypot(...a) - Math.hypot(...b)
        || a[1] - b[1] || a[0] - b[0]);
      delta = candidates.find(([dx, dy]) => {
        const candidate = translateRect(rect, dx, dy);
        return Math.hypot(dx, dy) <= maximumDisplacement
          && candidate.left >= canvasRect.left && candidate.top >= canvasRect.top
          && candidate.right <= canvasRect.right && candidate.bottom <= canvasRect.bottom;
      }) ?? delta;
    }
    const [baseX, baseY] = effectiveMarkerBaseOffset(element);
    marker.setOffset([baseX + delta[0], baseY + delta[1]]);
    element.dataset.toolbarDisplacementX = String(delta[0]);
    element.dataset.toolbarDisplacementY = String(delta[1]);
  }
}

/** Keep intelligence cards legible without moving their authoritative WGS84 position. */
function avoidEnemyPlaceLabelCollisions(
  markers: readonly Marker[], toolbar: Element | null | undefined, baseRects: MarkerBaseRects, canvasRect: Rect
) {
  const placeLabelObstacles = markers.flatMap(marker => {
    const element = marker.getElement();
    const kind = element.dataset.r3MarkerKind;
    if (element.hidden || !['territory', 'selected-territory', 'node-major', 'node-secondary'].includes(kind ?? '')) return [];
    const baseRect = baseRects.get(marker) ?? element.getBoundingClientRect();
    return [translateRect(baseRect,
      Number(element.dataset.toolbarDisplacementX ?? 0) + Number(element.dataset.placeAvoidanceDisplacementX ?? 0),
      Number(element.dataset.toolbarDisplacementY ?? 0) + Number(element.dataset.placeAvoidanceDisplacementY ?? 0))];
  });
  // Declutter protects the contact's base offset from the HUD. Keep that same
  // safe area forbidden during this later collision pass so a label-avoidance
  // displacement cannot move an otherwise visible contact into the toolbar.
  const obstacles: Rect[] = toolbar instanceof HTMLElement
    ? [toolbar.getBoundingClientRect(), ...placeLabelObstacles]
    : placeLabelObstacles;
  const occupied: Rect[] = [];
  const deltas: Array<readonly [number, number]> = [[0, 0]];
  for (let distance = 8; distance <= 64; distance += 8) {
    const diagonal = Math.round(distance / Math.SQRT2);
    deltas.push([distance, 0], [0, distance], [-distance, 0], [0, -distance],
      [diagonal, diagonal], [-diagonal, diagonal], [diagonal, -diagonal], [-diagonal, -diagonal]);
  }
  const enemies = markers.filter(marker => {
    const element = marker.getElement();
    return !element.hidden && element.dataset.r3MarkerKind?.startsWith('enemy-');
  }).sort((a, b) => (a.getElement().dataset.r3MarkerId ?? '').localeCompare(b.getElement().dataset.r3MarkerId ?? ''));
  for (const marker of enemies) {
    const element = marker.getElement();
    const rect = baseRects.get(marker) ?? element.getBoundingClientRect();
    const delta = deltas.find(([dx, dy]) => {
      const candidate = translateRect(rect, dx, dy);
      return candidate.left >= canvasRect.left && candidate.top >= canvasRect.top
        && candidate.right <= canvasRect.right && candidate.bottom <= canvasRect.bottom
        && [...obstacles, ...occupied].every(obstacle => !overlaps(candidate, obstacle, 0));
    }) ?? [0, 0];
    const [baseX, baseY] = effectiveMarkerBaseOffset(element);
    marker.setOffset([baseX + delta[0], baseY + delta[1]]);
    element.dataset.contactDisplacementX = String(delta[0]);
    element.dataset.contactDisplacementY = String(delta[1]);
    occupied.push({ left: rect.left + delta[0], right: rect.right + delta[0], top: rect.top + delta[1], bottom: rect.bottom + delta[1] });
  }
}

export function applyTerrainOperationalMarkerLayout(
  map: Map,
  markers: readonly Marker[],
  layers: TerrainOperationalLayers
) {
  const candidates = markers.flatMap(marker => {
    const element = marker.getElement();
    const id = element.dataset.r3MarkerId;
    const kind = element.dataset.r3MarkerKind as TerrainMarkerKind | undefined;
    if (!id || !kind || !markerEnabled(element, layers)) return [];
    const projected = map.project(marker.getLngLat());
    const [offsetX, offsetY] = effectiveMarkerBaseOffset(element);
    return [{ id, kind, x: projected.x + (Number.isFinite(offsetX) ? offsetX : 0), y: projected.y + (Number.isFinite(offsetY) ? offsetY : 0) }];
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
  const visible = visibleTerrainMarkerIds(candidates, terrainMarkerLodForZoom(map.getZoom()), reservedRects);
  for (const marker of markers) {
    const element = marker.getElement();
    const id = element.dataset.r3MarkerId;
    if (!id) continue;
    const hidden = !markerEnabled(element, layers) || !visible.has(id);
    element.hidden = hidden;
    element.dataset.declutter = hidden ? 'hidden' : 'visible';
  }
  // MapLibre-backed geometry reflects `hidden` synchronously. Apply this
  // pass's visibility first so newly eligible markers are measured at their
  // real size rather than retaining a hidden zero rectangle for one frame.
  const baseRects = resetAndCaptureMarkerBaseRects(markers);
  avoidTerritoryToolbarCollisions(markers, toolbar, baseRects, mapRect);
  avoidFormationLabelCollisions(markers, baseRects, toolbar, mapRect);
  avoidEnemyPlaceLabelCollisions(markers, toolbar, baseRects, mapRect);
}

export function removeTerrainOperationalMarkers(markers: readonly Marker[]) {
  for (const marker of markers) marker.remove();
}

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
