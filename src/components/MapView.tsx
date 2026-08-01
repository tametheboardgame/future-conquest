import geojson from '../assets/vertical-slice-map.json';
import { SLICE_IDS, TERRITORIES } from '../game/data';
import { formationsAt } from '../game/engine';
import type { GameState } from '../game/types';

interface Props { state:GameState; onSelectTerritory:(id:string)=>void; onSelectFormation:(id:string)=>void; }
type Position=[number,number];
const WIDTH=960,HEIGHT=680,BOUNDS={minX:-6.2,maxX:16.8,minY:43.1,maxY:55.9};
const project=([x,y]:Position):Position=>[(x-BOUNDS.minX)/(BOUNDS.maxX-BOUNDS.minX)*WIDTH,(BOUNDS.maxY-y)/(BOUNDS.maxY-BOUNDS.minY)*HEIGHT];
const ringPath=(ring:Position[])=>ring.map((point,index)=>`${index?'L':'M'}${project(point)[0].toFixed(1)},${project(point)[1].toFixed(1)}`).join(' ')+' Z';
const geometryPath=(geometry:{type:string;coordinates:any})=>geometry.type==='Polygon'?geometry.coordinates.map(ringPath).join(' '):geometry.coordinates.map((polygon:Position[][])=>polygon.map(ringPath).join(' ')).join(' ');
const features=(geojson as any).features.filter((feature:any)=>SLICE_IDS.includes(feature.properties.territory_id));
const featureFor=(id:string)=>features.find((feature:any)=>feature.properties.territory_id===id);
const anchorFor=(id:string):Position=>project(featureFor(id).properties.label_anchor as Position);

export function MapView({state,onSelectTerritory,onSelectFormation}:Props){
  const orderOrigin=state.battle?.origin??(state.selectedFormationId?state.formations[state.selectedFormationId]?.territoryId:null);
  const orderTarget=state.battle?.target??state.targetTerritory;
  return <svg className="map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="North-western Europe campaign map">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><marker id="order-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
    <rect width={WIDTH} height={HEIGHT} className="sea" />
    {features.map((feature:any)=>{
      const id=feature.properties.territory_id as string,territory=state.territories[id],selected=state.selectedTerritory===id,targeted=state.targetTerritory===id,active=state.battle?.target===id;
      return <path key={id} d={geometryPath(feature.geometry)} onClick={()=>onSelectTerritory(id)} className={`territory ${territory.controller} ${selected?'selected':''} ${targeted?'targeted':''} ${active?'active-battle':''}`} />;
    })}
    {orderOrigin&&orderTarget&&(()=>{const [x1,y1]=anchorFor(orderOrigin),[x2,y2]=anchorFor(orderTarget);return <line className={`order-route ${state.battle?'combat':''}`} x1={x1} y1={y1-8} x2={x2} y2={y2-8} markerEnd="url(#order-arrow)"/>;})()}
    {features.map((feature:any)=>{const id=feature.properties.territory_id as string;const [x,y]=anchorFor(id);return <g key={`${id}-label`} className="map-label" onClick={()=>onSelectTerritory(id)}><circle cx={x} cy={y-8} r="3"/><text x={x} y={y+11}>{TERRITORIES[id].centre}</text></g>;})}
    {state.portalTerritory&&(()=>{const [x,y]=anchorFor(state.portalTerritory);return <g className="portal" filter="url(#glow)"><circle cx={x} cy={y-8} r="17"/><circle cx={x} cy={y-8} r="6"/></g>;})()}
    {features.map((feature:any)=>{const id=feature.properties.territory_id as string,[x,y]=anchorFor(id);const future=formationsAt(state,id,'future');const modern=formationsAt(state,id,'modern');return <g key={`${id}-formations`}>
      {modern.length>0&&<g className="formation-marker modern" transform={`translate(${x+18} ${y+23})`} onClick={()=>onSelectTerritory(id)}><rect x="-14" y="-10" width="28" height="20" rx="3"/><text y="4">{Math.round(modern.reduce((sum,item)=>sum+item.personnel,0)/100)/10}k</text><title>{modern.length} contemporary formation{modern.length===1?'':'s'}, approximately {modern.reduce((sum,item)=>sum+item.personnel,0).toLocaleString('en-GB')} personnel</title></g>}
      {future.map((formation,index)=>{const offset=(index-(future.length-1)/2)*27;const active=formation.id===state.selectedFormationId;return <g key={formation.id} className={`formation-marker future ${active?'selected':''} ${formation.generalPresent?'command':''}`} transform={`translate(${x+offset} ${y-39})`} onClick={event=>{event.stopPropagation();onSelectFormation(formation.id);}}><circle r="12"/><text y="4">{formation.shortName}</text>{formation.generalPresent&&<path d="M0 -18 L3 -13 L9 -13 L5 -9 L7 -4 L0 -7 L-7 -4 L-5 -9 L-9 -13 L-3 -13 Z"/>}<title>{formation.name}: {formation.personnel.toLocaleString('en-GB')} personnel, {Math.round(formation.cohesion)}% cohesion</title></g>;})}
    </g>;})}
  </svg>;
}
