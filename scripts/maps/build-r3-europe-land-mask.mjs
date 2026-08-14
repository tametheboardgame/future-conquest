import fs from 'node:fs';
import path from 'node:path';
import { bboxClip } from '@turf/turf';
import { feature as topojsonFeature } from 'topojson-client';
import worldLand from 'world-atlas/land-110m.json' with { type: 'json' };

const OUTPUT = path.resolve('src/assets/r3-europe-land-mask.json');

// This presentation mask deliberately extends a few degrees beyond the
// playable terrain envelope so pitched Campaign/Selected views never reveal
// a clipped land edge at the viewport horizon. It contains no gameplay data.
export const R3_EUROPE_LAND_MASK_BOUNDS = [-30, 28, 55, 76];

const atlas = worldLand;
const worldGeoJSON = topojsonFeature(atlas, atlas.objects.land);
const worldFeatures = worldGeoJSON.type === 'FeatureCollection'
  ? worldGeoJSON.features
  : [worldGeoJSON];

const validRing = ring => Array.isArray(ring) && ring.length >= 4;
const signedArea = ring => ring.reduce((area, coordinate, index) => {
  const previous = ring[(index + ring.length - 1) % ring.length];
  return area + (previous[0] * coordinate[1] - coordinate[0] * previous[1]);
}, 0) / 2;
const rewindPolygon = polygon => polygon.map((ring, index) => {
  const shouldBeCounterClockwise = index === 0;
  const isCounterClockwise = signedArea(ring) > 0;
  return shouldBeCounterClockwise === isCounterClockwise ? ring : [...ring].reverse();
});
const cleanClippedFeature = feature => {
  if (!feature.geometry) return null;
  if (feature.geometry.type === 'Polygon') {
    const coordinates = feature.geometry.coordinates.filter(validRing);
    return coordinates.length ? { ...feature, geometry: { ...feature.geometry, coordinates: rewindPolygon(coordinates) } } : null;
  }
  if (feature.geometry.type === 'MultiPolygon') {
    const coordinates = feature.geometry.coordinates
      .map(polygon => polygon.filter(validRing))
      .filter(polygon => polygon.length > 0);
    return coordinates.length ? { ...feature, geometry: { ...feature.geometry, coordinates: coordinates.map(rewindPolygon) } } : null;
  }
  return null;
};

// MapLibre triangulates each GeoJSON geometry as one render unit. The World
// Atlas source is a single continent-spanning MultiPolygon; keeping that shape
// intact allowed low-zoom fill triangulation to connect distant polygon parts
// into the large Theatre-scale wedges reported during production review. Clip
// first, then emit each polygon as its own RFC 7946-wound feature. This changes
// neither the land union nor coastline, but gives the renderer independent,
// bounded triangulation units.
const clippedFeatures = worldFeatures
  .filter(feature => feature?.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'))
  .map(feature => cleanClippedFeature(bboxClip(feature, R3_EUROPE_LAND_MASK_BOUNDS)))
  .filter(Boolean)
  .flatMap(feature => feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates.map((coordinates, index) => ({
      type: 'Feature',
      id: `land-${index}`,
      properties: {},
      geometry: { type: 'Polygon', coordinates }
    }))
    : [{ ...feature, properties: feature.properties ?? {} }]);

if (!clippedFeatures.length) {
  throw new Error('Europe land-mask clipping produced no polygon features.');
}

const output = {
  type: 'FeatureCollection',
  futureConquest: {
    id: 'r3-europe-land-mask-v2',
    source: 'world-atlas/land-110m',
    purpose: 'presentation-only physical land wash and coastline',
    clipBounds: R3_EUROPE_LAND_MASK_BOUNDS
  },
  features: clippedFeatures
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);
console.log(`Wrote ${clippedFeatures.length} Europe-only land features to ${OUTPUT}.`);
