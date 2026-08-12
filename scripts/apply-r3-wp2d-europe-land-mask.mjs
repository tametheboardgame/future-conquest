import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  ["import { feature as topojsonFeature } from 'topojson-client';\nimport worldLand from 'world-atlas/land-110m.json';", "import europeLandMask from '../assets/r3-europe-land-mask.json';", 'world land imports'],
  ["const landAtlas = worldLand as unknown as { objects: { land: unknown } };\nconst terrainLandGeoJSON = topojsonFeature(landAtlas, landAtlas.objects.land) as unknown as GeoJSONSourceSpecification['data'];", "const terrainLandGeoJSON = europeLandMask as unknown as GeoJSONSourceSpecification['data'];", 'world land conversion']
];

for (const [before, after, label] of replacements) {
  if (!source.includes(before)) throw new Error(`Europe land-mask renderer anchor missing: ${label}`);
  source = source.replace(before, after);
}

fs.writeFileSync(file, source);
console.log('Renderer now imports only the pre-clipped Europe land mask.');
