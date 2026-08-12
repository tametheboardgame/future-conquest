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
const worldFeature = topojsonFeature(atlas, atlas.objects.land);
const clipped = bboxClip(worldFeature, R3_EUROPE_LAND_MASK_BOUNDS);

const output = {
  type: 'FeatureCollection',
  futureConquest: {
    id: 'r3-europe-land-mask-v1',
    source: 'world-atlas/land-110m',
    purpose: 'presentation-only physical land wash and coastline',
    clipBounds: R3_EUROPE_LAND_MASK_BOUNDS
  },
  features: [clipped]
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);
console.log(`Wrote Europe-only land mask to ${OUTPUT}.`);
