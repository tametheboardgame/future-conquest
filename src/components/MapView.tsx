import geojson from '../assets/vertical-slice-map.json';
import { SLICE_IDS, TERRITORIES } from '../game/data';
import type { GameState } from '../game/types';

interface Props { state:GameState; onSelect:(id:string)=>void; }
type Position=[number,number];
const WIDTH=960,HEIGHT=680,BOUNDS={minX:-6.2,maxX:16.8,minY:43.1,maxY:55.9};
const project=([x,y]:Position):Position=>[(x-BOUNDS.minX)/(BOUNDS.maxX-BOUNDS.minX)*WIDTH,(BOUNDS.maxY-y)/(BOUNDS.maxY-BOUNDS.minY)*HEIGHT];
const ringPath=(ring:Position[])=>ring.map((p,i)=>`${i?'L':'M'}${project(p)[0].toFixed(1)},${project(p)[1].toFixed(1)}`).join(' ')+' Z';
const geometryPath=(geometry:{type:string;coordinates:any})=>geometry.type==='Polygon'?geometry.coordinates.map(ringPath).join(' '):geometry.coordinates.map((polygon:Position[][])=>polygon.map(ringPath).join(' ')).join(' ');
const features=(geojson as any).features.filter((f:any)=>SLICE_IDS.includes(f.properties.territory_id));

export function MapView({state,onSelect}:Props){
  return <svg className="map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="North-western Europe campaign map">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width={WIDTH} height={HEIGHT} className="sea" />
    {features.map((feature:any)=>{
      const id=feature.properties.territory_id as string,s=state.territories[id],selected=state.selectedTerritory===id,targeted=state.targetTerritory===id,active=state.battle?.target===id;
      return <path key={id} d={geometryPath(feature.geometry)} onClick={()=>onSelect(id)} className={`territory ${s.controller} ${selected?'selected':''} ${targeted?'targeted':''} ${active?'active-battle':''}`} />;
    })}
    {features.map((feature:any)=>{const id=feature.properties.territory_id as string;const [x,y]=project(feature.properties.label_anchor as Position);return <g key={`${id}-label`} className="map-label" onClick={()=>onSelect(id)}><circle cx={x} cy={y-8} r="3"/><text x={x} y={y+8}>{TERRITORIES[id].centre}</text></g>;})}
    {state.portalTerritory&&(()=>{const f=features.find((x:any)=>x.properties.territory_id===state.portalTerritory);const [x,y]=project(f.properties.label_anchor as Position);return <g className="portal" filter="url(#glow)"><circle cx={x} cy={y-8} r="12"/><circle cx={x} cy={y-8} r="5"/></g>;})()}
  </svg>;
}
