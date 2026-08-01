import geojson from '../assets/vertical-slice-map.json';
import { SLICE_IDS, TERRITORIES } from '../game/data';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onSelect: (id: string) => void;
  onSelectGroup: (id: string) => void;
}

type Position = [number, number];
const WIDTH = 960;
const HEIGHT = 680;
const BOUNDS = { minX: -6.2, maxX: 16.8, minY: 43.1, maxY: 55.9 };
const project = ([x, y]: Position): Position => [(x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX) * WIDTH, (BOUNDS.maxY - y) / (BOUNDS.maxY - BOUNDS.minY) * HEIGHT];
const ringPath = (ring: Position[]) => ring.map((point, index) => `${index ? 'L' : 'M'}${project(point)[0].toFixed(1)},${project(point)[1].toFixed(1)}`).join(' ') + ' Z';
const geometryPath = (geometry: { type: string; coordinates: any }) => geometry.type === 'Polygon'
  ? geometry.coordinates.map(ringPath).join(' ')
  : geometry.coordinates.map((polygon: Position[][]) => polygon.map(ringPath).join(' ')).join(' ');
const features = (geojson as any).features.filter((feature: any) => SLICE_IDS.includes(feature.properties.territory_id));
const anchors = Object.fromEntries(features.map((feature: any) => [feature.properties.territory_id, project(feature.properties.label_anchor as Position)])) as Record<string, Position>;

export function MapView({ state, onSelect, onSelectGroup }: Props) {
  const groupsByTerritory = Object.values(state.taskGroups).reduce<Record<string, typeof state.taskGroups[string][]>>((result, group) => {
    (result[group.location] ??= []).push(group);
    return result;
  }, {});
  const enemyCounts = Object.values(state.enemyFormations).reduce<Record<string, number>>((result, formation) => {
    if (formation.personnel > 0) result[formation.location] = (result[formation.location] ?? 0) + 1;
    return result;
  }, {});

  return <svg className="map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="North-western Europe campaign map">
    <defs>
      <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="softGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect width={WIDTH} height={HEIGHT} className="sea" />
    {features.map((feature: any) => {
      const id = feature.properties.territory_id as string;
      const territory = state.territories[id];
      const selected = state.selectedTerritory === id;
      const targeted = state.targetTerritory === id;
      const active = state.battle?.target === id;
      return <path key={id} d={geometryPath(feature.geometry)} onClick={() => onSelect(id)} className={`territory ${territory.controller} ${territory.supplied ? 'supplied' : 'isolated'} ${selected ? 'selected' : ''} ${targeted ? 'targeted' : ''} ${active ? 'active-battle' : ''}`} />;
    })}
    {features.map((feature: any) => {
      const id = feature.properties.territory_id as string;
      const [x, y] = anchors[id];
      return <g key={`${id}-label`} className="map-label" onClick={() => onSelect(id)}><circle cx={x} cy={y - 8} r="3" /><text x={x} y={y + 8}>{TERRITORIES[id].centre}</text>{!state.territories[id].supplied && state.territories[id].controller === 'player' && <text className="isolated-label" x={x} y={y + 23}>ISOLATED</text>}</g>;
    })}
    {Object.entries(enemyCounts).map(([territoryId, count]) => {
      const [x, y] = anchors[territoryId];
      return <g key={`enemy-${territoryId}`} className="enemy-marker" transform={`translate(${x + 24} ${y - 24})`}><path d="M0 -10 L10 8 L-10 8 Z" /><text x="0" y="4">{count}</text></g>;
    })}
    {Object.entries(groupsByTerritory).flatMap(([territoryId, groups]) => {
      const [x, y] = anchors[territoryId];
      return groups.map((group, index) => {
        const dx = -28 + (index % 2) * 29;
        const dy = 23 + Math.floor(index / 2) * 24;
        const selected = group.id === state.selectedTaskGroupId;
        return <g key={group.id} className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`} transform={`translate(${x + dx} ${y + dy})`} onClick={(event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelectGroup(group.id); }}>
          <rect x="-12" y="-9" width="24" height="18" rx="3" />
          <text x="0" y="4">{group.id.replace('TG-', '')}</text>
        </g>;
      });
    })}
    {state.portalTerritory && (() => {
      const [x, y] = anchors[state.portalTerritory];
      return <g className="portal" filter="url(#glow)"><circle cx={x} cy={y - 8} r="12" /><circle cx={x} cy={y - 8} r="5" /></g>;
    })()}
  </svg>;
}
