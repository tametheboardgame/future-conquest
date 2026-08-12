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
const cleanClippedFeature = feature => {
  if (!feature.geometry) return null;
  if (feature.geometry.type === 'Polygon') {
    const coordinates = feature.geometry.coordinates.filter(validRing);
    return coordinates.length ? { ...feature, geometry: { ...feature.geometry, coordinates } } : null;
  }
  if (feature.geometry.type === 'MultiPolygon') {
    const coordinates = feature.geometry.coordinates
      .map(polygon => polygon.filter(validRing))
      .filter(polygon => polygon.length > 0);
    return coordinates.length ? { ...feature, geometry: { ...feature.geometry, coordinates } } : null;
  }
  return null;
};

const clippedFeatures = worldFeatures
  .filter(feature => feature?.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'))
  .map(feature => cleanClippedFeature(bboxClip(feature, R3_EUROPE_LAND_MASK_BOUNDS)))
  .filter(Boolean);

if (!clippedFeatures.length) {
  throw new Error('Europe land-mask clipping produced no polygon features.');
}

const output = {
  type: 'FeatureCollection',
  futureConquest: {
    id: 'r3-europe-land-mask-v1',
    source: 'world-atlas/land-110m',
    purpose: 'presentation-only physical land wash and coastline',
    clipBounds: R3_EUROPE_LAND_MASK_BOUNDS
  },
  features: clippedFeatures
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);
console.log(`Wrote ${clippedFeatures.length} Europe-only land features to ${OUTPUT}.`);
